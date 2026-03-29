/**
 * Smart Engine (智能引擎) — Three autonomous systems inspired by 梅丹青教授's AI Harness framework
 *
 * 1. Sleep Tokens (睡后Token) — Autonomous content generation while users sleep
 * 2. Knowledge Graph (隐性知识显性化) — Structure all interactions into connected insights
 * 3. Personalized Feed (定制化可以规模化) — Recommend posts based on user profile
 */

import { storage } from "./storage";
import { db } from "./db";
import { communityPosts, moodEntries } from "@shared/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { getAIClient, FAST_MODEL, extractJSON } from "./ai-config";
import { writeMemory, queryMemories } from "./agent-memory";
import { pool } from "./db";

// ═══════════════════════════════════════════════════════════════
// 1. Sleep Tokens — Autonomous value creation
// ═══════════════════════════════════════════════════════════════

/**
 * Auto-generate a daily community discussion topic based on today's almanac/节气.
 * Runs once per day as the HeartAI Bot.
 */
export async function generateDailyTopic(botUserId: string): Promise<{ postId: string; content: string } | null> {
  const today = new Date().toISOString().slice(0, 10);

  // Check if already posted today
  const existing = await db.select().from(communityPosts)
    .where(and(
      eq(communityPosts.userId, botUserId),
      sql`${communityPosts.createdAt}::text LIKE ${today + '%'}`,
      eq(communityPosts.isFromAvatar, true),
    ))
    .limit(1);

  if (existing.length > 0) return null;

  const client = getAIClient();
  const response = await client.chat.completions.create({
    model: FAST_MODEL,
    max_tokens: 300,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "你是观星社区的话题策划师。每天根据日期、节气、时事生成一个有趣的社区讨论话题。话题要能引发用户分享和互动，不要太严肃。只返回JSON。"
      },
      {
        role: "user",
        content: `今天是 ${today}。生成一个社区讨论话题。

返回JSON:
{
  "content": "话题内容（100-200字，要有趣、有代入感，引发用户分享自己的经历或看法）",
  "tag": "question 或 sharing"
}`
      }
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim() || "{}";
  const parsed = JSON.parse(extractJSON(raw));
  if (!parsed.content) return null;

  const post = await storage.createPost({
    userId: botUserId,
    content: parsed.content,
    tag: parsed.tag || "question",
    isAnonymous: false,
    isFromAvatar: true,
  });

  console.log(`[sleep-tokens] Daily topic posted: "${parsed.content.slice(0, 50)}..."`);
  return { postId: post.id, content: parsed.content };
}

/**
 * Send personalized morning fortune insight to users who have bazi data.
 * Writes to agent memory so it shows up in proactive messages.
 */
export async function generateMorningInsights(): Promise<number> {
  let count = 0;

  try {
    // Get users with birth dates (they have bazi data)
    const usersWithBazi = await pool.query(
      `SELECT id, nickname, birth_date, agent_personality FROM users
       WHERE birth_date IS NOT NULL AND is_agent = false
       LIMIT 50`
    );

    const today = new Date().toISOString().slice(0, 10);

    for (const user of usersWithBazi.rows) {
      try {
        // Skip if already sent today
        const existing = await queryMemories({
          userId: user.id,
          category: "fortune_result",
          limit: 1,
        });
        if (existing.length > 0 && existing[0].created_at?.startsWith(today)) continue;

        let element = "";
        try {
          const p = JSON.parse(user.agent_personality || "{}");
          element = p.element || "";
        } catch {}

        if (!element) continue;

        await writeMemory({
          agentKey: "prediction",
          userId: user.id,
          category: "fortune_result",
          summary: `${today} ${user.nickname || "用户"}(${element}命) 今日五行提醒已生成`,
          details: JSON.stringify({ date: today, element, type: "morning_insight" }),
          importance: 5,
        });

        count++;
      } catch (err) {
        console.error(`[sleep-tokens] Morning insight error for ${user.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[sleep-tokens] Morning insights batch error:", err);
  }

  if (count > 0) console.log(`[sleep-tokens] Morning insights: ${count} users`);
  return count;
}

// ═══════════════════════════════════════════════════════════════
// 2. Knowledge Graph — Turn tacit knowledge into structured insights
// ═══════════════════════════════════════════════════════════════

interface KnowledgeNode {
  type: "interest" | "person" | "event" | "emotion" | "insight";
  label: string;
  connections: string[]; // labels of connected nodes
  strength: number; // 1-10
}

/**
 * Build a personal knowledge graph from all user interactions.
 * Extracts entities, relationships, and patterns, stores as agent memory.
 */
export async function buildKnowledgeGraph(userId: string): Promise<{
  nodes: number;
  newInsights: number;
}> {
  // Collect all signals
  const posts = await storage.getPostsByUser(userId);
  const comments = await storage.getCommentsByUser(userId);
  const convs = await storage.getConversationsByUser(userId);

  const chatMessages: string[] = [];
  for (const conv of convs.slice(0, 10)) {
    const msgs = await storage.getMessagesByConversation(conv.id);
    chatMessages.push(...msgs.filter(m => m.role === "user").map(m => m.content).filter(Boolean));
  }

  const moods = await storage.getMoodEntriesByUser(userId);

  const totalSignals = posts.length + comments.length + chatMessages.length + moods.length;
  if (totalSignals < 5) return { nodes: 0, newInsights: 0 };

  // Build digest
  const digest: string[] = [];
  posts.slice(0, 20).forEach(p => digest.push(`[发帖] ${(p as any).content?.slice(0, 100) || ""}`));
  comments.slice(0, 30).forEach(c => digest.push(`[评论] ${(c as any).content?.slice(0, 80) || ""}`));
  chatMessages.slice(0, 20).forEach(m => digest.push(`[聊天] ${m.slice(0, 80)}`));
  moods.slice(0, 10).forEach(m => {
    const note = (m as any).note || "";
    if (note.length > 5) digest.push(`[情绪${m.moodScore}/10] ${note.slice(0, 60)}`);
  });

  const client = getAIClient();
  const response = await client.chat.completions.create({
    model: FAST_MODEL,
    max_tokens: 600,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `你是知识图谱构建专家。从用户的所有互动中提取关键实体和洞察，构建个人知识图谱。
重点关注：人物关系、反复出现的主题、情绪模式、隐性偏好。只返回JSON。`
      },
      {
        role: "user",
        content: `分析以下用户互动数据，提取知识图谱节点：

${digest.join("\n").slice(0, 3500)}

返回JSON:
{
  "insights": [
    "用户经常在深夜活跃，可能有晚睡习惯",
    "反复提到女儿，家庭是核心价值观",
    "股票和游戏话题交替出现，可能用游戏缓解投资压力"
  ],
  "patterns": [
    {"theme": "投资焦虑", "frequency": "高", "context": "提到股票时经常自嘲"},
    {"theme": "亲子关系", "frequency": "高", "context": "女儿是快乐源泉"}
  ],
  "connections": [
    {"from": "股票投资", "to": "Pokémon游戏", "relation": "压力释放"},
    {"from": "女儿", "to": "网球", "relation": "亲子活动"}
  ]
}

要求：
- insights 3-5条，要深入，不是表面观察
- patterns 2-4个反复出现的主题
- connections 2-4个实体间的关系
- 只提取有证据支撑的内容`
      }
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim() || "{}";
  const parsed = JSON.parse(extractJSON(raw));

  // Store insights as high-importance agent memories
  let newInsights = 0;
  const insights: string[] = parsed.insights || [];
  const patterns: any[] = parsed.patterns || [];
  const connections: any[] = parsed.connections || [];

  // Store deep insights
  for (const insight of insights.slice(0, 5)) {
    try {
      await writeMemory({
        agentKey: "main",
        userId,
        category: "user_preference",
        summary: `[知识图谱] ${insight}`,
        details: JSON.stringify({ source: "knowledge_graph", date: new Date().toISOString().slice(0, 10) }),
        importance: 7,
      });
      newInsights++;
    } catch {}
  }

  // Store behavioral patterns
  for (const pattern of patterns.slice(0, 4)) {
    try {
      await writeMemory({
        agentKey: "main",
        userId,
        category: "user_preference",
        summary: `[行为模式] ${pattern.theme}: ${pattern.context || ""}`,
        details: JSON.stringify({ frequency: pattern.frequency, source: "knowledge_graph" }),
        importance: 8,
      });
      newInsights++;
    } catch {}
  }

  // Store relationship connections
  for (const conn of connections.slice(0, 4)) {
    try {
      await writeMemory({
        agentKey: "main",
        userId,
        category: "user_preference",
        summary: `[关联发现] ${conn.from} ↔ ${conn.to}: ${conn.relation || ""}`,
        details: JSON.stringify({ source: "knowledge_graph" }),
        importance: 6,
      });
      newInsights++;
    } catch {}
  }

  const totalNodes = insights.length + patterns.length + connections.length;
  if (newInsights > 0) {
    console.log(`[knowledge-graph] User ${userId}: ${totalNodes} nodes, ${newInsights} new insights stored`);
  }

  return { nodes: totalNodes, newInsights };
}

// ═══════════════════════════════════════════════════════════════
// 3. Personalized Feed — Customization at Scale
// ═══════════════════════════════════════════════════════════════

interface ScoredPost {
  postId: string;
  score: number;
  reasons: string[];
}

/**
 * Score and rank community posts for a specific user based on their profile.
 * Returns post IDs sorted by relevance score.
 */
export async function getPersonalizedFeed(userId: string, limit = 30): Promise<ScoredPost[]> {
  // 1. Get user profile data
  const avatar = await storage.getAvatarByUser(userId);
  const memories = avatar ? await storage.getAvatarMemories(avatar.id) : [];
  const user = await storage.getUser(userId);

  // Extract user interests and traits
  const userInterests: string[] = [];
  const userStyles: string[] = [];
  let userElement = "";

  for (const m of memories) {
    if (m.category === "interest") userInterests.push(m.content.toLowerCase());
    if (m.category === "style") userStyles.push(m.content.toLowerCase());
  }

  try {
    const p = JSON.parse(user?.agentPersonality || "{}");
    userElement = p.element || "";
  } catch {}

  // 2. Get recent posts
  const posts = await storage.getAllPosts();

  // 3. Score each post
  const scored: ScoredPost[] = [];

  for (const post of posts) {
    let score = 50; // base score
    const reasons: string[] = [];
    const content = ((post as any).content || "").toLowerCase();

    // Interest match: boost posts that mention user's interests
    for (const interest of userInterests) {
      const keywords = interest.split(/[，、,\s]+/).filter(k => k.length >= 2);
      for (const kw of keywords) {
        if (content.includes(kw)) {
          score += 15;
          reasons.push(`兴趣匹配: ${kw}`);
          break; // one match per interest
        }
      }
    }

    // Element affinity: boost posts from users with compatible elements
    if (userElement && !(post as any).isAnonymous) {
      try {
        const postAuthor = await storage.getUser((post as any).userId);
        if (postAuthor?.agentPersonality) {
          const authorP = JSON.parse(postAuthor.agentPersonality);
          const authorElement = authorP.element || "";
          if (authorElement && isElementCompatible(userElement, authorElement)) {
            score += 10;
            reasons.push(`五行相生: ${userElement}↔${authorElement}`);
          }
        }
      } catch {}
    }

    // Recency boost: newer posts score higher
    const ageHours = (Date.now() - new Date((post as any).createdAt).getTime()) / 3600000;
    if (ageHours < 6) { score += 20; reasons.push("新发布"); }
    else if (ageHours < 24) { score += 10; reasons.push("今天"); }
    else if (ageHours > 168) { score -= 10; } // older than a week

    // Engagement boost: popular posts get a small bump
    const likes = (post as any).likeCount || 0;
    const comments = (post as any).commentCount || 0;
    if (likes + comments > 10) { score += 8; reasons.push("热门"); }
    else if (likes + comments > 5) { score += 4; }

    // Don't show user's own posts at the top
    if ((post as any).userId === userId) { score -= 20; }

    scored.push({ postId: post.id, score, reasons });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

/**
 * Five-element compatibility check (五行相生).
 * 木生火, 火生土, 土生金, 金生水, 水生木
 */
function isElementCompatible(a: string, b: string): boolean {
  const shengMap: Record<string, string> = {
    "木": "火", "火": "土", "土": "金", "金": "水", "水": "木",
  };
  return shengMap[a] === b || shengMap[b] === a || a === b;
}

// ═══════════════════════════════════════════════════════════════
// Autonomous Scheduler — Run all three systems
// ═══════════════════════════════════════════════════════════════

export async function runSleepTokenCycle(botUserId: string): Promise<void> {
  console.log("[sleep-tokens] Starting autonomous cycle...");

  // 1. Generate daily community topic
  try {
    await generateDailyTopic(botUserId);
  } catch (err) {
    console.error("[sleep-tokens] Daily topic error:", err);
  }

  // 2. Morning insights for users with bazi
  try {
    await generateMorningInsights();
  } catch (err) {
    console.error("[sleep-tokens] Morning insights error:", err);
  }

  // 3. Build knowledge graphs (one user per cycle to spread cost)
  try {
    const avatars = await storage.getAllActiveAvatars();
    if (avatars.length > 0) {
      // Pick a random user each cycle
      const idx = Math.floor(Math.random() * avatars.length);
      const av = avatars[idx];
      await buildKnowledgeGraph(av.userId);
    }
  } catch (err) {
    console.error("[sleep-tokens] Knowledge graph error:", err);
  }

  console.log("[sleep-tokens] Cycle complete");
}
