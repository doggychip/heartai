/**
 * HeartAI ↔ Zhihuiti Bridge (智慧体桥接)
 *
 * Connects HeartAI to zhihuiti's multi-agent orchestration system.
 * zhihuiti runs as a separate process (Python) and communicates via HTTP.
 *
 * Integration layers:
 *   1. Agent registration — zhihuiti agents get HeartAI user accounts
 *   2. Goal submission — HeartAI can delegate complex tasks to zhihuiti
 *   3. Event bridge — HeartAI events can trigger zhihuiti goals
 *   4. Result relay — zhihuiti results post back to HeartAI community/memory
 *
 * Setup:
 *   ZHIHUITI_URL=http://localhost:8377  (zhihuiti serve --port 8377)
 *   ZHIHUITI_ENABLED=true
 */

import { writeMemory } from "./agent-memory";
import { publish, subscribe, type EventType } from "./event-bus";

// ─── Configuration ───────────────────────────────────────────

const ZHIHUITI_URL = process.env.ZHIHUITI_URL || "http://localhost:8377";
const ZHIHUITI_ENABLED = process.env.ZHIHUITI_ENABLED === "true";
const ZHIHUITI_POLL_INTERVAL_MS = 5_000; // poll goal status every 5s
const ZHIHUITI_GOAL_TIMEOUT_MS = 5 * 60_000; // 5 min max per goal

// ─── Types ───────────────────────────────────────────────────

interface ZhihuiTiGoal {
  id: string;
  goal: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  agents_used?: string[];
  waves?: number;
  total_tokens?: number;
  created_at?: string;
}

interface ZhihuiTiAgent {
  id: string;
  name: string;
  role: string;
  realm: string;
  score: number;
  tokens: number;
  model: string;
  gene_id?: string;
}

interface ZhihuiTiStatus {
  agents: number;
  goals_completed: number;
  treasury_balance: number;
  active_goals: number;
}

// ─── HTTP Client ─────────────────────────────────────────────

async function zhihuiTiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${ZHIHUITI_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`zhihuiti ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Health Check ────────────────────────────────────────────

let _zhihuiTiAvailable = false;

export function isZhihuiTiAvailable(): boolean {
  return _zhihuiTiAvailable;
}

export async function checkZhihuiTiHealth(): Promise<boolean> {
  if (!ZHIHUITI_ENABLED) return false;
  try {
    const data = await zhihuiTiFetch("/api/data");
    _zhihuiTiAvailable = true;
    return true;
  } catch {
    _zhihuiTiAvailable = false;
    return false;
  }
}

// ─── Goal Submission ─────────────────────────────────────────

/**
 * Submit a goal to zhihuiti for multi-agent execution.
 * Returns the goal ID immediately — poll with getGoalStatus().
 */
export async function submitGoal(
  goal: string,
  options: { model?: string; workers?: number; retries?: number } = {}
): Promise<{ goalId: string }> {
  if (!_zhihuiTiAvailable) throw new Error("zhihuiti is not available");

  const body: any = { goal };
  if (options.model) body.model = options.model;
  if (options.workers) body.workers = options.workers;
  if (options.retries !== undefined) body.retries = options.retries;

  const data = await zhihuiTiFetch("/api/goals", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { goalId: data.id || data.goal_id };
}

/**
 * Get status/result of a zhihuiti goal.
 */
export async function getGoalStatus(goalId: string): Promise<ZhihuiTiGoal> {
  return zhihuiTiFetch(`/api/goals/${goalId}`);
}

/**
 * Submit a goal and wait for completion (with polling).
 * Returns the full result when done, or throws on timeout/failure.
 */
export async function executeGoal(
  goal: string,
  options: { model?: string; workers?: number; retries?: number; timeoutMs?: number } = {}
): Promise<ZhihuiTiGoal> {
  const { goalId } = await submitGoal(goal, options);
  const timeout = options.timeoutMs || ZHIHUITI_GOAL_TIMEOUT_MS;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const status = await getGoalStatus(goalId);
    if (status.status === "completed") return status;
    if (status.status === "failed") throw new Error(`zhihuiti goal failed: ${JSON.stringify(status.result)}`);
    await new Promise(r => setTimeout(r, ZHIHUITI_POLL_INTERVAL_MS));
  }

  throw new Error(`zhihuiti goal timed out after ${timeout}ms`);
}

// ─── Agent Listing ───────────────────────────────────────────

/**
 * List all agents in zhihuiti's agent pool.
 */
export async function listAgents(): Promise<ZhihuiTiAgent[]> {
  if (!_zhihuiTiAvailable) return [];
  const data = await zhihuiTiFetch("/api/agents");
  return Array.isArray(data) ? data : data.agents || [];
}

/**
 * Get zhihuiti system status (economy, agent count, etc).
 */
export async function getSystemStatus(): Promise<ZhihuiTiStatus> {
  const data = await zhihuiTiFetch("/api/data");
  return {
    agents: data.agents?.length || 0,
    goals_completed: data.goals_completed || 0,
    treasury_balance: data.economy?.treasury?.balance || 0,
    active_goals: data.active_goals || 0,
  };
}

// ─── Event Bridge ────────────────────────────────────────────

/**
 * Bridge HeartAI events to zhihuiti goals.
 * Maps specific HeartAI events to zhihuiti goal submissions.
 */
const EVENT_GOAL_MAP: Partial<Record<EventType, (data: any) => string | null>> = {
  bazi_analyzed: (data) =>
    `Analyze the bazi reading for user with day master ${data.dayMaster || "unknown"} and provide deeper life insights based on five-element relationships. Birth date: ${data.birthDate || "unknown"}.`,
  mood_alert: (data) =>
    data.severity === "high"
      ? `Research evidence-based coping strategies for someone experiencing ${data.emotion || "distress"}. Provide 3 actionable suggestions with brief explanations.`
      : null, // only trigger on high-severity alerts
};

function setupEventBridge(): void {
  for (const [eventType, goalBuilder] of Object.entries(EVENT_GOAL_MAP)) {
    subscribe(eventType as EventType, "zhihuiti", async (payload) => {
      if (!_zhihuiTiAvailable) return;
      try {
        const goal = goalBuilder(payload.data);
        if (!goal) return; // null = skip this event

        console.log(`[zhihuiti-bridge] Event ${eventType} → submitting goal`);
        const result = await executeGoal(goal, { timeoutMs: 3 * 60_000 });

        // Write result to HeartAI agent memory
        await writeMemory({
          agentKey: "zhihuiti",
          userId: payload.userId,
          category: "bazi_reading",
          summary: `zhihuiti analysis: ${goal.slice(0, 100)}`,
          details: JSON.stringify(result.result),
          importance: 7,
        });

        console.log(`[zhihuiti-bridge] Goal completed for event ${eventType}`);
      } catch (err) {
        console.error(`[zhihuiti-bridge] Event bridge error (${eventType}):`, err);
      }
    });
  }
}

// ─── Result Relay ────────────────────────────────────────────

/**
 * Post a zhihuiti goal result as a community post from the zhihuiti agent.
 * Call this after a goal completes to share findings with the community.
 */
export async function relayResultToWebhook(
  apiKey: string,
  baseUrl: string,
  result: ZhihuiTiGoal
): Promise<void> {
  const content = typeof result.result === "string"
    ? result.result
    : JSON.stringify(result.result, null, 2);

  await fetch(`${baseUrl}/api/webhook/agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      action: "post",
      content: `🔮 智慧体分析报告\n\n${content.slice(0, 2000)}`,
      tags: ["zhihuiti", "analysis"],
    }),
  });
}

// ─── Initialization ──────────────────────────────────────────

export async function initZhihuiTiBridge(): Promise<void> {
  if (!ZHIHUITI_ENABLED) {
    console.log("[zhihuiti-bridge] Disabled (set ZHIHUITI_ENABLED=true to enable)");
    return;
  }

  console.log(`[zhihuiti-bridge] Connecting to ${ZHIHUITI_URL}...`);

  const available = await checkZhihuiTiHealth();
  if (!available) {
    console.warn("[zhihuiti-bridge] zhihuiti not reachable — bridge will retry on first request");
  } else {
    console.log("[zhihuiti-bridge] Connected to zhihuiti");
    try {
      const status = await getSystemStatus();
      console.log(`[zhihuiti-bridge] Agents: ${status.agents}, Goals completed: ${status.goals_completed}, Treasury: ${status.treasury_balance}`);
    } catch {}
  }

  // Wire event bridge
  setupEventBridge();
  console.log("[zhihuiti-bridge] Event bridge initialized");

  // Periodic health check (every 60s)
  setInterval(() => {
    checkZhihuiTiHealth().catch(() => {});
  }, 60_000).unref();
}
