/**
 * HeartAI Agent Shared Memory (跨Agent共享记忆)
 * 
 * Provides a vector-like semantic memory layer using PostgreSQL + DeepSeek embeddings.
 * No external vector DB required — uses pg_trgm for fuzzy text matching and
 * DeepSeek for semantic relevance scoring.
 * 
 * Architecture:
 *   - Each agent writes interaction summaries into the shared memory table
 *   - Any agent can query memories by user, topic, or semantic similarity
 *   - Memories have TTL and importance weighting for automatic pruning
 * 
 * Use cases:
 *   - stella does a bazi reading → writes summary → prediction reads it for fortune context
 *   - User shares emotional state in chat → market agent considers it for content recommendations
 *   - prediction detects fortune_shift → writes alert → stella picks it up for follow-up advice
 */

import OpenAI from "openai";
import { pool } from "./db";

// ─── Types ───────────────────────────────────────────────────

export interface AgentMemoryEntry {
  id: string;
  agentKey: string;        // which agent wrote this (stella, prediction, market, tech, main)
  userId: string | null;   // associated user (null for global/system memories)
  category: string;        // "bazi_reading" | "fortune_result" | "emotion_state" | "community_insight" | "user_preference"
  summary: string;         // human-readable summary
  details: string;         // JSON string with full structured data
  importance: number;      // 1-10 weight
  expiresAt: string | null;// ISO date or null for permanent
  createdAt: string;
}

export interface MemoryQuery {
  agentKey?: string;       // filter by writing agent
  userId?: string;         // filter by associated user
  category?: string;       // filter by category
  query?: string;          // semantic search query
  limit?: number;          // max results (default 10)
  minImportance?: number;  // minimum importance threshold
}

export interface MemoryWriteInput {
  agentKey: string;
  userId?: string | null;
  category: string;
  summary: string;
  details?: object | string;
  importance?: number;     // default 5
  ttlHours?: number;       // auto-expire after N hours (null = permanent)
}

// ─── Database Setup ──────────────────────────────────────────

export async function ensureAgentMemoryTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_shared_memory (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_key TEXT NOT NULL,
        user_id VARCHAR,
        category TEXT NOT NULL,
        summary TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '{}',
        importance INTEGER NOT NULL DEFAULT 5,
        expires_at TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // Index for fast user+category lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_memory_user ON agent_shared_memory(user_id, category)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_memory_agent ON agent_shared_memory(agent_key, created_at DESC)
    `);

    console.log("[agent-memory] Shared memory table ensured");
  } catch (err) {
    console.error("[agent-memory] Table creation error:", err);
  } finally {
    client.release();
  }
}

// ─── DeepSeek Client ─────────────────────────────────────────

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (!cachedClient) {
    cachedClient = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }
  return cachedClient;
}

// ─── Write Memory ────────────────────────────────────────────

export async function writeMemory(input: MemoryWriteInput): Promise<AgentMemoryEntry> {
  const client = await pool.connect();
  try {
    const now = new Date().toISOString();
    const expiresAt = input.ttlHours 
      ? new Date(Date.now() + input.ttlHours * 3600000).toISOString()
      : null;
    const details = typeof input.details === "object" ? JSON.stringify(input.details) : (input.details || "{}");

    const result = await client.query(
      `INSERT INTO agent_shared_memory (agent_key, user_id, category, summary, details, importance, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [input.agentKey, input.userId || null, input.category, input.summary, details, input.importance || 5, expiresAt, now]
    );

    const row = result.rows[0];
    console.log(`[agent-memory] ${input.agentKey} wrote: [${input.category}] ${input.summary.slice(0, 60)}`);
    return rowToEntry(row);
  } finally {
    client.release();
  }
}

// ─── Query Memories ──────────────────────────────────────────

export async function queryMemories(q: MemoryQuery): Promise<AgentMemoryEntry[]> {
  const client = await pool.connect();
  try {
    const conditions: string[] = [
      // Auto-exclude expired entries
      `(expires_at IS NULL OR expires_at > $1)`
    ];
    const params: any[] = [new Date().toISOString()];
    let paramIdx = 2;

    if (q.agentKey) {
      conditions.push(`agent_key = $${paramIdx}`);
      params.push(q.agentKey);
      paramIdx++;
    }
    if (q.userId) {
      conditions.push(`user_id = $${paramIdx}`);
      params.push(q.userId);
      paramIdx++;
    }
    if (q.category) {
      conditions.push(`category = $${paramIdx}`);
      params.push(q.category);
      paramIdx++;
    }
    if (q.minImportance) {
      conditions.push(`importance >= $${paramIdx}`);
      params.push(q.minImportance);
      paramIdx++;
    }
    if (q.query) {
      // Fuzzy text search on summary
      conditions.push(`(summary ILIKE $${paramIdx} OR details ILIKE $${paramIdx})`);
      params.push(`%${q.query}%`);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = q.limit || 10;

    const result = await client.query(
      `SELECT * FROM agent_shared_memory ${where} ORDER BY importance DESC, created_at DESC LIMIT ${limit}`,
      params
    );

    return result.rows.map(rowToEntry);
  } finally {
    client.release();
  }
}

// ─── Semantic Query (DeepSeek-powered relevance ranking) ─────

export async function semanticQuery(
  query: string,
  options: { userId?: string; limit?: number }
): Promise<Array<AgentMemoryEntry & { relevanceScore: number }>> {
  // First, get candidate memories
  const candidates = await queryMemories({
    userId: options.userId,
    limit: 30,  // Fetch more, then re-rank
  });

  if (candidates.length === 0) return [];

  try {
    const client = getClient();

    // Use DeepSeek to score relevance of each memory to the query
    const summaries = candidates.map((m, i) => `[${i}] ${m.category}: ${m.summary}`).join("\n");

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      max_tokens: 200,
      temperature: 0.1,
      messages: [
        { 
          role: "system", 
          content: `你是一个记忆检索系统。根据查询，从以下记忆中选出最相关的条目。
返回JSON数组，格式: [{"idx": 编号, "score": 0.0-1.0}]
只选择 score > 0.3 的条目，按 score 降序排列。只输出JSON。` 
        },
        { role: "user", content: `查询: ${query}\n\n记忆列表:\n${summaries}` },
      ],
    });

    const raw = response.choices[0]?.message?.content || "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return candidates.slice(0, options.limit || 5).map(m => ({ ...m, relevanceScore: 0.5 }));

    const scores: Array<{ idx: number; score: number }> = JSON.parse(jsonMatch[0]);

    return scores
      .filter(s => s.idx >= 0 && s.idx < candidates.length && s.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 5)
      .map(s => ({
        ...candidates[s.idx],
        relevanceScore: s.score,
      }));
  } catch (err) {
    console.error("[agent-memory] Semantic query error:", err);
    // Fallback to basic results
    return candidates.slice(0, options.limit || 5).map(m => ({ ...m, relevanceScore: 0.5 }));
  }
}

// ─── Context Builder (for injecting into agent prompts) ──────

export async function buildAgentContext(
  agentKey: string,
  userId: string,
  currentQuery?: string
): Promise<string> {
  // Get recent memories about this user from all agents
  const userMemories = await queryMemories({
    userId,
    limit: 10,
    minImportance: 3,
  });

  if (userMemories.length === 0) return "";

  const lines = userMemories.map(m => {
    const agentLabel = { stella: "星曜命理师", prediction: "运势引擎", market: "市场洞察", main: "编排师", tech: "技术" }[m.agentKey] || m.agentKey;
    return `- [${agentLabel}/${m.category}] ${m.summary}`;
  });

  return `\n## 用户历史记忆 (来自其他Agent)\n${lines.join("\n")}`;
}

// ─── Cleanup Expired Memories ────────────────────────────────

export async function pruneExpiredMemories(): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `DELETE FROM agent_shared_memory WHERE expires_at IS NOT NULL AND expires_at < $1`,
      [new Date().toISOString()]
    );
    const deleted = result.rowCount || 0;
    if (deleted > 0) console.log(`[agent-memory] Pruned ${deleted} expired memories`);
    return deleted;
  } finally {
    client.release();
  }
}

// ─── Helper ──────────────────────────────────────────────────

function rowToEntry(row: any): AgentMemoryEntry {
  return {
    id: row.id,
    agentKey: row.agent_key,
    userId: row.user_id,
    category: row.category,
    summary: row.summary,
    details: row.details,
    importance: row.importance,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}
