/**
 * HeartAI Event Bus (事件驱动Agent协作引擎)
 * 
 * Lightweight in-process event bus with PostgreSQL persistence.
 * Replaces the need for BullMQ/Redis — uses Node.js EventEmitter for
 * in-process pub/sub and PostgreSQL for durability + audit trail.
 * 
 * Event flow:
 *   1. Agent publishes event → stored in agent_events table
 *   2. Subscribed handlers fire in-process (async, non-blocking)
 *   3. Each handler can write shared memories + trigger follow-up actions
 *   4. Heartbeat scheduler periodically wakes agents to check for pending work
 * 
 * Defined events (from openclaw-agents/README.md):
 *   bazi_analyzed   → stella publishes, prediction subscribes
 *   qiuqian_drawn   → stella publishes, prediction subscribes
 *   fortune_shift   → prediction publishes, stella subscribes
 *   post_created    → main publishes, market subscribes
 *   mood_alert      → main publishes, stella + prediction subscribe
 *   content_flagged → moderation publishes, main subscribes (new)
 */

import { EventEmitter } from "events";
import { storage } from "./storage";
import { writeMemory } from "./agent-memory";

// ─── Types ───────────────────────────────────────────────────

export type EventType = 
  | "bazi_analyzed" 
  | "qiuqian_drawn" 
  | "fortune_shift" 
  | "post_created" 
  | "mood_alert"
  | "content_flagged"
  | "user_joined"
  | "daily_fortune"
  | "memory_written";

export interface AgentEventPayload {
  eventType: EventType;
  publisherAgent: string;
  userId?: string;
  data: Record<string, any>;
}

export type EventHandler = (payload: AgentEventPayload) => Promise<void>;

// ─── Subscription Registry ───────────────────────────────────

const SUBSCRIPTIONS: Record<EventType, Array<{ agentKey: string; handler: EventHandler }>> = {
  bazi_analyzed: [],
  qiuqian_drawn: [],
  fortune_shift: [],
  post_created: [],
  mood_alert: [],
  content_flagged: [],
  user_joined: [],
  daily_fortune: [],
  memory_written: [],
};

// ─── In-process Event Emitter ────────────────────────────────

const emitter = new EventEmitter();
emitter.setMaxListeners(50); // Allow many agent subscriptions

// ─── Core Functions ──────────────────────────────────────────

/**
 * Subscribe an agent to an event type
 */
export function subscribe(eventType: EventType, agentKey: string, handler: EventHandler): void {
  SUBSCRIPTIONS[eventType].push({ agentKey, handler });
  
  // Wire up the EventEmitter
  emitter.on(eventType, async (payload: AgentEventPayload) => {
    try {
      await handler(payload);
    } catch (err) {
      console.error(`[event-bus] Handler error: ${agentKey} on ${eventType}:`, err);
    }
  });

  console.log(`[event-bus] ${agentKey} subscribed to ${eventType}`);
}

/**
 * Publish an event — persists to DB + fires in-process handlers
 */
export async function publish(payload: AgentEventPayload): Promise<string> {
  const subscriberAgents = SUBSCRIPTIONS[payload.eventType]?.map(s => s.agentKey) || [];

  // Persist to agent_events table for audit trail
  const event = await storage.createAgentEvent({
    eventType: payload.eventType,
    publisherAgent: payload.publisherAgent,
    payload: JSON.stringify(payload.data),
    subscriberAgents: JSON.stringify(subscriberAgents),
    status: subscriberAgents.length > 0 ? "processing" : "completed",
    userId: payload.userId || null,
    createdAt: new Date().toISOString(),
    processedAt: null,
    resultSummary: null,
  });

  console.log(`[event-bus] ${payload.publisherAgent} published ${payload.eventType} → ${subscriberAgents.length} subscribers`);

  // Fire handlers asynchronously (non-blocking)
  if (subscriberAgents.length > 0) {
    setImmediate(async () => {
      try {
        emitter.emit(payload.eventType, payload);
        // Mark event as completed after a short delay
        setTimeout(async () => {
          try {
            await storage.updateEventStatus(event.id, "completed", `Delivered to: ${subscriberAgents.join(", ")}`);
          } catch {}
        }, 5000);
      } catch (err) {
        console.error(`[event-bus] Emit error for ${payload.eventType}:`, err);
        await storage.updateEventStatus(event.id, "failed", String(err));
      }
    });
  }

  return event.id;
}

// ─── Heartbeat Scheduler ─────────────────────────────────────
// Periodically wakes agents to perform scheduled tasks

interface HeartbeatConfig {
  agentKey: string;
  intervalMs: number;     // how often to wake
  handler: () => Promise<void>;
}

const heartbeats: Map<string, NodeJS.Timeout> = new Map();

export function registerHeartbeat(config: HeartbeatConfig): void {
  // Clear existing heartbeat for this agent
  const existing = heartbeats.get(config.agentKey);
  if (existing) clearInterval(existing);

  const timer = setInterval(async () => {
    try {
      console.log(`[heartbeat] Waking ${config.agentKey}`);
      await config.handler();
    } catch (err) {
      console.error(`[heartbeat] ${config.agentKey} error:`, err);
    }
  }, config.intervalMs);

  heartbeats.set(config.agentKey, timer);
  console.log(`[heartbeat] Registered ${config.agentKey} every ${Math.round(config.intervalMs / 60000)}min`);
}

export function stopHeartbeat(agentKey: string): void {
  const timer = heartbeats.get(agentKey);
  if (timer) {
    clearInterval(timer);
    heartbeats.delete(agentKey);
    console.log(`[heartbeat] Stopped ${agentKey}`);
  }
}

export function stopAllHeartbeats(): void {
  heartbeats.forEach((timer, key) => {
    clearInterval(timer);
  });
  heartbeats.clear();
}

// ─── Built-in Event Handlers ─────────────────────────────────
// These wire up the cross-agent collaboration defined in openclaw-agents/

export function initializeDefaultSubscriptions(): void {
  // ── prediction listens for bazi analysis completions ──
  subscribe("bazi_analyzed", "prediction", async (payload) => {
    // When stella completes a bazi reading, store it as shared memory
    // so prediction can reference it for fortune calculations
    if (payload.userId) {
      await writeMemory({
        agentKey: "stella",
        userId: payload.userId,
        category: "bazi_reading",
        summary: `八字分析完成: ${payload.data.dayMaster || ""} ${payload.data.fullBazi || ""}`,
        details: payload.data,
        importance: 8,
        ttlHours: 24 * 30, // Keep for 30 days
      });
    }
  });

  // ── prediction listens for qiuqian draws ──
  subscribe("qiuqian_drawn", "prediction", async (payload) => {
    if (payload.userId) {
      await writeMemory({
        agentKey: "stella",
        userId: payload.userId,
        category: "qiuqian_result",
        summary: `求签结果: 第${payload.data.signNumber || "?"}签 - ${payload.data.verdict || ""}`,
        details: payload.data,
        importance: 5,
        ttlHours: 24 * 7,
      });
    }
  });

  // ── stella listens for fortune shifts ──
  subscribe("fortune_shift", "stella", async (payload) => {
    if (payload.userId) {
      await writeMemory({
        agentKey: "prediction",
        userId: payload.userId,
        category: "fortune_shift",
        summary: `运势变化: ${payload.data.dimension || "综合"} ${payload.data.direction || "变化"} (${payload.data.score || ""})`,
        details: payload.data,
        importance: 7,
        ttlHours: 24 * 3,
      });
    }
  });

  // ── market listens for new posts ──
  subscribe("post_created", "market", async (payload) => {
    // Track community activity for trend analysis
    await writeMemory({
      agentKey: "main",
      userId: payload.userId || null,
      category: "community_post",
      summary: `新帖子: [${payload.data.tag || "sharing"}] ${(payload.data.content || "").slice(0, 80)}`,
      details: { postId: payload.data.postId, tag: payload.data.tag },
      importance: 3,
      ttlHours: 24 * 7,
    });
  });

  // ── stella + prediction listen for mood alerts ──
  subscribe("mood_alert", "stella", async (payload) => {
    if (payload.userId) {
      await writeMemory({
        agentKey: "main",
        userId: payload.userId,
        category: "mood_alert",
        summary: `情绪预警: ${payload.data.riskLevel || "unknown"} - ${payload.data.insight || ""}`,
        details: payload.data,
        importance: 9,
        ttlHours: 24 * 7,
      });
    }
  });

  subscribe("mood_alert", "prediction", async (payload) => {
    // prediction adjusts fortune advice tone based on mood
    console.log(`[event-bus] prediction received mood_alert for user ${payload.userId}: ${payload.data.riskLevel}`);
  });

  // ── main listens for content moderation flags ──
  subscribe("content_flagged", "main", async (payload) => {
    console.log(`[event-bus] Content flagged: ${payload.data.action} - ${payload.data.explanation}`);
    // Could trigger admin notification, auto-hide post, etc.
  });

  console.log("[event-bus] Default agent subscriptions initialized");
}

// ─── Stats ───────────────────────────────────────────────────

export function getSubscriptionStats(): Record<string, string[]> {
  const stats: Record<string, string[]> = {};
  for (const [eventType, subs] of Object.entries(SUBSCRIPTIONS)) {
    if (subs.length > 0) {
      stats[eventType] = subs.map(s => s.agentKey);
    }
  }
  return stats;
}
