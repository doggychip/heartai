/**
 * Auto-Profile Analyzer (用户画像自动推断)
 *
 * Like TikTok's cold-start algorithm — learns who you are from behavior, not surveys.
 * Scans a user's posts, comments, chat history, and mood data to infer:
 *   - Interests & hobbies
 *   - Speaking style & language preferences
 *   - Personality traits & opinions
 *   - Life facts (career, family, habits)
 *   - Emotional patterns
 *
 * Results are saved as avatar memories with source: "auto_inferred"
 */

import { storage } from "./storage";
import { getAIClient, FAST_MODEL, extractJSON } from "./ai-config";

// ─── Types ───────────────────────────────────────────────────

interface InferredTrait {
  category: "interest" | "style" | "opinion" | "fact" | "preference";
  content: string;
  confidence: number; // 0-1, mapped to weight 1-10
}

interface ProfileAnalysis {
  traits: InferredTrait[];
  summary: string;
  dataPoints: number; // how many signals were analyzed
}

// ─── Data Collection ─────────────────────────────────────────

async function collectUserSignals(userId: string): Promise<{
  posts: string[];
  comments: string[];
  chatMessages: string[];
  moodEntries: string[];
  totalSignals: number;
}> {
  // Collect recent posts (last 50)
  const posts = await storage.getPostsByUser(userId);
  const postTexts = posts.slice(0, 50).map(p => (p as any).content || "").filter(Boolean);

  // Collect recent comments (last 100)
  const comments = await storage.getCommentsByUser(userId);
  const commentTexts = comments.slice(0, 100).map(c => (c as any).content || "").filter(Boolean);

  // Collect chat messages (last 5 conversations, last 20 messages each)
  const conversations = await storage.getConversationsByUser(userId);
  const chatMessages: string[] = [];
  for (const conv of conversations.slice(0, 5)) {
    const messages = await storage.getMessagesByConversation(conv.id);
    const userMsgs = messages
      .filter(m => m.role === "user")
      .slice(0, 20)
      .map(m => m.content)
      .filter(Boolean);
    chatMessages.push(...userMsgs);
  }

  // Collect mood entries (last 30)
  const moods = await storage.getMoodEntriesByUser(userId);
  const moodTexts = moods.slice(0, 30).map(m => {
    const tags = typeof m.emotionTags === "string" ? m.emotionTags : "";
    const note = (m as any).note || "";
    return `mood:${m.moodScore}/10 ${tags} ${note}`.trim();
  }).filter(s => s.length > 10);

  const totalSignals = postTexts.length + commentTexts.length + chatMessages.length + moodTexts.length;

  return { posts: postTexts, comments: commentTexts, chatMessages, moodEntries: moodTexts, totalSignals };
}

// ─── AI Analysis ─────────────────────────────────────────────

async function analyzeWithAI(signals: {
  posts: string[];
  comments: string[];
  chatMessages: string[];
  moodEntries: string[];
}): Promise<ProfileAnalysis> {
  const client = getAIClient();

  // Build a compact signal digest (keep under 3000 chars to be cost-efficient)
  const digest: string[] = [];

  if (signals.posts.length > 0) {
    digest.push("【发帖内容】");
    digest.push(...signals.posts.slice(0, 15).map(p => `- ${p.slice(0, 150)}`));
  }
  if (signals.comments.length > 0) {
    digest.push("【评论内容】");
    digest.push(...signals.comments.slice(0, 20).map(c => `- ${c.slice(0, 100)}`));
  }
  if (signals.chatMessages.length > 0) {
    digest.push("【聊天消息】");
    digest.push(...signals.chatMessages.slice(0, 15).map(m => `- ${m.slice(0, 120)}`));
  }
  if (signals.moodEntries.length > 0) {
    digest.push("【情绪记录】");
    digest.push(...signals.moodEntries.slice(0, 10).map(m => `- ${m.slice(0, 80)}`));
  }

  const signalText = digest.join("\n").slice(0, 4000);
  const totalSignals = signals.posts.length + signals.comments.length +
    signals.chatMessages.length + signals.moodEntries.length;

  const response = await client.chat.completions.create({
    model: FAST_MODEL,
    max_tokens: 800,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `你是用户画像分析专家。从用户的行为数据中推断其性格特征、兴趣爱好、说话风格、生活习惯。
像抖音/TikTok的推荐算法一样，从行为中学习用户是谁。
只返回JSON，不要解释。`
      },
      {
        role: "user",
        content: `分析以下用户行为数据，推断用户画像。

${signalText}

返回JSON:
{
  "traits": [
    {"category": "interest", "content": "具体兴趣（如：投资股票、打网球）", "confidence": 0.9},
    {"category": "style", "content": "说话风格特征（如：广东话混英语、犀利幽默）", "confidence": 0.8},
    {"category": "fact", "content": "生活事实（如：有女儿、会计师）", "confidence": 0.85},
    {"category": "preference", "content": "偏好习惯（如：晚睡、爱喝可乐）", "confidence": 0.7},
    {"category": "opinion", "content": "价值观/态度（如：保守温和、反内卷）", "confidence": 0.6}
  ],
  "summary": "一句话总结这个用户是什么样的人（30字以内）"
}

要求：
- 每个category至少推断1-2条，总共8-15条
- confidence要基于证据强度：多次出现=高，仅一次提及=低
- content要具体，不要泛泛的标签
- 用中文，保留用户原文中的语言习惯（广东话/英语等）
- 只推断有证据支撑的特征，不要猜测`
      }
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim() || "{}";
  const parsed = JSON.parse(extractJSON(raw));

  return {
    traits: Array.isArray(parsed.traits) ? parsed.traits : [],
    summary: parsed.summary || "用户画像分析完成",
    dataPoints: totalSignals,
  };
}

// ─── Memory Population ──────────────────────────────────────

/**
 * Analyze a user's behavior and auto-populate their avatar memories.
 * Skips traits that are already stored (by content similarity).
 * Returns the number of new memories created.
 */
export async function autoProfileUser(userId: string): Promise<{
  newMemories: number;
  totalTraits: number;
  summary: string;
  dataPoints: number;
}> {
  // 1. Get user's avatar
  const avatar = await storage.getAvatarByUser(userId);
  if (!avatar) {
    return { newMemories: 0, totalTraits: 0, summary: "用户没有分身", dataPoints: 0 };
  }

  // 2. Collect behavioral signals
  const signals = await collectUserSignals(userId);
  if (signals.totalSignals < 3) {
    return { newMemories: 0, totalTraits: 0, summary: "行为数据不足，需要更多互动", dataPoints: signals.totalSignals };
  }

  // 3. AI analysis
  const analysis = await analyzeWithAI(signals);
  if (analysis.traits.length === 0) {
    return { newMemories: 0, totalTraits: 0, summary: "未能推断出特征", dataPoints: signals.totalSignals };
  }

  // 4. Get existing memories to avoid duplicates
  const existingMemories = await storage.getAvatarMemories(avatar.id);
  const existingContents = new Set(existingMemories.map(m => m.content.toLowerCase()));

  // 5. Save new traits as avatar memories
  let newMemories = 0;
  for (const trait of analysis.traits) {
    // Skip if similar content already exists
    const lower = trait.content.toLowerCase();
    if (existingContents.has(lower)) continue;

    // Check for fuzzy match (if >60% of words overlap, skip)
    const traitWords = lower.split(/\s+/);
    const isDuplicate = Array.from(existingContents).some(existing => {
      const existingWords = existing.split(/\s+/);
      const overlap = traitWords.filter(w => existingWords.includes(w)).length;
      return overlap / Math.max(traitWords.length, 1) > 0.6;
    });
    if (isDuplicate) continue;

    // Map confidence (0-1) to weight (1-10)
    const weight = Math.max(1, Math.min(10, Math.round((trait.confidence || 0.5) * 10)));

    await storage.createAvatarMemory({
      avatarId: avatar.id,
      category: trait.category,
      content: trait.content,
      source: "auto_inferred",
      weight,
    });

    existingContents.add(lower);
    newMemories++;
  }

  return {
    newMemories,
    totalTraits: analysis.traits.length,
    summary: analysis.summary,
    dataPoints: signals.totalSignals,
  };
}
