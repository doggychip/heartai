/**
 * HeartAI Recommendation Engine (社区推荐引擎)
 * 
 * Powers the market agent's content recommendation capabilities:
 *   1. Trending Posts — hot content based on recency, engagement, velocity
 *   2. Personalized Feed — posts matching user's interests, personality, and history
 *   3. Personality Matching — find users with compatible personality profiles
 *   4. Community Insights — aggregated stats for the market agent dashboard
 * 
 * Uses PostgreSQL for data retrieval + DeepSeek for semantic matching.
 * No external recommendation service needed.
 */

import OpenAI from "openai";
import { pool } from "./db";
import { queryMemories } from "./agent-memory";
import { getAIClient, DEFAULT_MODEL } from "./ai-config";

// ─── Types ───────────────────────────────────────────────────

export interface TrendingPost {
  id: string;
  content: string;
  tag: string;
  authorNickname: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  trendScore: number;       // computed hot-ranking score
}

export interface PersonalizedPost extends TrendingPost {
  relevanceScore: number;   // 0-1 how relevant to this user
  reason: string;           // Chinese explanation of why recommended
}

export interface PersonalityMatch {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  mbtiType: string | null;
  zodiacSign: string | null;
  compatibilityScore: number;
  matchReason: string;
}

export interface CommunityInsights {
  totalPosts: number;
  todayPosts: number;
  totalComments: number;
  topTags: Array<{ tag: string; count: number }>;
  activeHours: Array<{ hour: number; count: number }>;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  weeklyGrowth: number;    // % change in posts vs last week
}

// ─── DeepSeek Client ─────────────────────────────────────────

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (!cachedClient) {
    cachedClient = getAIClient();
  }
  return cachedClient;
}

// ─── 1. Trending Posts ───────────────────────────────────────

export async function getTrendingPosts(limit = 10): Promise<TrendingPost[]> {
  const client = await pool.connect();
  try {
    // Hot ranking formula: score = (likes*2 + comments*3) / (age_hours + 2)^1.5
    // This balances engagement with recency (newer posts get a boost)
    const result = await client.query(`
      SELECT 
        p.id, p.content, p.tag, p.like_count, p.comment_count, p.created_at,
        u.nickname,
        p.is_anonymous,
        (
          (p.like_count * 2 + p.comment_count * 3 + 1)::float / 
          POWER(GREATEST(EXTRACT(EPOCH FROM (NOW() - p.created_at::timestamp)) / 3600.0, 0.1) + 2, 1.5)
        ) AS trend_score
      FROM community_posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.created_at > (NOW() - INTERVAL '7 days')::text
      ORDER BY trend_score DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map(row => ({
      id: row.id,
      content: row.content,
      tag: row.tag,
      authorNickname: row.is_anonymous ? "匿名用户" : (row.nickname || "用户"),
      likeCount: row.like_count,
      commentCount: row.comment_count,
      createdAt: row.created_at,
      trendScore: parseFloat(row.trend_score) || 0,
    }));
  } finally {
    client.release();
  }
}

// ─── 2. Personalized Feed ────────────────────────────────────

export async function getPersonalizedFeed(userId: string, limit = 10): Promise<PersonalizedPost[]> {
  const client = await pool.connect();
  try {
    // Step 1: Get user's profile and interaction history
    const userResult = await client.query(
      `SELECT mbti_type, zodiac_sign, agent_personality FROM users WHERE id = $1`,
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) return [];

    // Step 2: Get user's liked post tags (interest signal)
    const likedTags = await client.query(`
      SELECT p.tag, COUNT(*) as cnt
      FROM post_likes pl
      JOIN community_posts p ON pl.post_id = p.id
      WHERE pl.user_id = $1
      GROUP BY p.tag
      ORDER BY cnt DESC
    `, [userId]);

    const preferredTags = likedTags.rows.map(r => r.tag);

    // Step 3: Get user's memories for deeper personalization
    const memories = await queryMemories({ userId, limit: 5, minImportance: 5 });
    const memoryContext = memories.map(m => m.summary).join("; ");

    // Step 4: Get candidate posts (not already seen/liked by user, not their own)
    const candidates = await client.query(`
      SELECT 
        p.id, p.content, p.tag, p.like_count, p.comment_count, p.created_at, p.is_anonymous,
        u.nickname,
        (p.like_count * 2 + p.comment_count * 3 + 1)::float / 
        POWER(GREATEST(EXTRACT(EPOCH FROM (NOW() - p.created_at::timestamp)) / 3600.0, 0.1) + 2, 1.5) AS trend_score
      FROM community_posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.user_id != $1
        AND p.created_at > (NOW() - INTERVAL '14 days')::text
        AND p.id NOT IN (SELECT post_id FROM post_likes WHERE user_id = $1)
      ORDER BY trend_score DESC
      LIMIT 30
    `, [userId]);

    if (candidates.rows.length === 0) return [];

    // Step 5: Use DeepSeek for semantic relevance scoring
    const deepseekClient = getClient();
    const postSummaries = candidates.rows.map((r, i) => 
      `[${i}] [${r.tag}] ${r.content.slice(0, 100)}`
    ).join("\n");

    const userProfile = [
      user.mbti_type ? `MBTI: ${user.mbti_type}` : "",
      user.zodiac_sign ? `星座: ${user.zodiac_sign}` : "",
      preferredTags.length > 0 ? `偏好标签: ${preferredTags.join(", ")}` : "",
      memoryContext ? `近期记忆: ${memoryContext.slice(0, 200)}` : "",
    ].filter(Boolean).join("; ");

    const response = await deepseekClient.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: 400,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `你是推荐系统。根据用户画像，从候选帖子中选出最匹配的。
返回JSON数组: [{"idx": 编号, "score": 0.0-1.0, "reason": "推荐原因(10字内)"}]
选择 score > 0.4 的条目，按 score 降序。只输出JSON。`,
        },
        {
          role: "user",
          content: `用户画像: ${userProfile || "新用户，无历史数据"}\n\n候选帖子:\n${postSummaries}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // Fallback: return trending
      return candidates.rows.slice(0, limit).map(row => ({
        id: row.id,
        content: row.content,
        tag: row.tag,
        authorNickname: row.is_anonymous ? "匿名用户" : (row.nickname || "用户"),
        likeCount: row.like_count,
        commentCount: row.comment_count,
        createdAt: row.created_at,
        trendScore: parseFloat(row.trend_score) || 0,
        relevanceScore: 0.5,
        reason: "热门内容",
      }));
    }

    const scores: Array<{ idx: number; score: number; reason: string }> = JSON.parse(jsonMatch[0]);

    return scores
      .filter(s => s.idx >= 0 && s.idx < candidates.rows.length)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => {
        const row = candidates.rows[s.idx];
        return {
          id: row.id,
          content: row.content,
          tag: row.tag,
          authorNickname: row.is_anonymous ? "匿名用户" : (row.nickname || "用户"),
          likeCount: row.like_count,
          commentCount: row.comment_count,
          createdAt: row.created_at,
          trendScore: parseFloat(row.trend_score) || 0,
          relevanceScore: s.score,
          reason: s.reason || "推荐内容",
        };
      });
  } catch (err) {
    console.error("[recommendations] Personalized feed error:", err);
    // Fallback to trending
    return (await getTrendingPosts(limit)).map(p => ({ ...p, relevanceScore: 0.5, reason: "热门内容" }));
  } finally {
    client.release();
  }
}

// ─── 3. Personality Matching ─────────────────────────────────

// MBTI compatibility matrix (simplified)
const MBTI_COMPAT: Record<string, string[]> = {
  ENFP: ["INFJ", "INTJ", "ENFJ", "ENTJ"],
  ENFJ: ["INFP", "ISFP", "ENFP", "ENTP"],
  INFP: ["ENFJ", "ENTJ", "INFJ", "INTJ"],
  INFJ: ["ENFP", "ENTP", "INFP", "INTJ"],
  ENTP: ["INFJ", "INTJ", "ENFJ", "ENTJ"],
  ENTJ: ["INFP", "INTP", "ENFP", "ENTP"],
  INTP: ["ENTJ", "ESTJ", "ENTP", "INTJ"],
  INTJ: ["ENFP", "ENTP", "INFP", "INFJ"],
  ESFP: ["ISFJ", "ISTJ", "ESFJ", "ESTP"],
  ESFJ: ["ISFP", "ISTP", "ESFP", "ESTJ"],
  ISFP: ["ENFJ", "ESFJ", "ESTJ", "ENTJ"],
  ISFJ: ["ESFP", "ESTP", "ISFP", "ISTJ"],
  ESTP: ["ISFJ", "ISTJ", "ESFJ", "ESTJ"],
  ESTJ: ["ISFP", "ISTP", "INTP", "ESFP"],
  ISTP: ["ESFJ", "ESTJ", "ENFJ", "ENTJ"],
  ISTJ: ["ESFP", "ESTP", "ISFJ", "ISTJ"],
};

// Chinese zodiac compatibility (六合)
const ZODIAC_COMPAT: Record<string, string[]> = {
  "白羊座": ["狮子座", "射手座", "双子座", "水瓶座"],
  "金牛座": ["处女座", "摩羯座", "巨蟹座", "双鱼座"],
  "双子座": ["天秤座", "水瓶座", "白羊座", "狮子座"],
  "巨蟹座": ["天蝎座", "双鱼座", "金牛座", "处女座"],
  "狮子座": ["白羊座", "射手座", "双子座", "天秤座"],
  "处女座": ["金牛座", "摩羯座", "巨蟹座", "天蝎座"],
  "天秤座": ["双子座", "水瓶座", "狮子座", "射手座"],
  "天蝎座": ["巨蟹座", "双鱼座", "处女座", "摩羯座"],
  "射手座": ["白羊座", "狮子座", "天秤座", "水瓶座"],
  "摩羯座": ["金牛座", "处女座", "天蝎座", "双鱼座"],
  "水瓶座": ["双子座", "天秤座", "白羊座", "射手座"],
  "双鱼座": ["巨蟹座", "天蝎座", "金牛座", "摩羯座"],
};

export async function getPersonalityMatches(userId: string, limit = 5): Promise<PersonalityMatch[]> {
  const client = await pool.connect();
  try {
    // Get the user's personality profile
    const userResult = await client.query(
      `SELECT id, mbti_type, zodiac_sign, agent_personality FROM users WHERE id = $1`,
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) return [];

    const userMbti = user.mbti_type?.toUpperCase();
    const userZodiac = user.zodiac_sign;

    // Get all other users with personality data
    const othersResult = await client.query(`
      SELECT id, nickname, avatar_url, mbti_type, zodiac_sign, agent_personality
      FROM users
      WHERE id != $1
        AND (mbti_type IS NOT NULL OR zodiac_sign IS NOT NULL)
      LIMIT 100
    `, [userId]);

    // Score each candidate
    const matches: PersonalityMatch[] = othersResult.rows.map(other => {
      let score = 0;
      const reasons: string[] = [];

      // MBTI compatibility
      if (userMbti && other.mbti_type) {
        const otherMbti = other.mbti_type.toUpperCase();
        const compatList = MBTI_COMPAT[userMbti] || [];
        if (compatList.includes(otherMbti)) {
          score += 0.4;
          reasons.push(`MBTI ${userMbti}×${otherMbti} 高度契合`);
        } else if (userMbti.slice(0, 2) === otherMbti.slice(0, 2)) {
          score += 0.2;
          reasons.push(`相似性格倾向`);
        }
      }

      // Zodiac compatibility
      if (userZodiac && other.zodiac_sign) {
        const compatList = ZODIAC_COMPAT[userZodiac] || [];
        if (compatList.includes(other.zodiac_sign)) {
          score += 0.3;
          reasons.push(`${userZodiac}×${other.zodiac_sign} 星座相合`);
        }
      }

      // Same zodiac = shared understanding
      if (userZodiac && userZodiac === other.zodiac_sign) {
        score += 0.15;
        reasons.push(`同为${userZodiac}`);
      }

      // Five elements compatibility (from agent_personality)
      if (user.agent_personality && other.agent_personality) {
        try {
          const up = JSON.parse(user.agent_personality);
          const op = JSON.parse(other.agent_personality);
          if (up.element && op.element && up.element === op.element) {
            score += 0.15;
            reasons.push(`五行同属${up.element}`);
          }
        } catch {}
      }

      return {
        userId: other.id,
        nickname: other.nickname || "用户",
        avatarUrl: other.avatar_url,
        mbtiType: other.mbti_type,
        zodiacSign: other.zodiac_sign,
        compatibilityScore: Math.min(1, score),
        matchReason: reasons.join("、") || "社区成员",
      };
    });

    return matches
      .filter(m => m.compatibilityScore > 0.1)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, limit);
  } finally {
    client.release();
  }
}

// ─── 4. Community Insights ───────────────────────────────────

export async function getCommunityInsights(): Promise<CommunityInsights> {
  const client = await pool.connect();
  try {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];

    // Total posts
    const totalResult = await client.query(`SELECT COUNT(*) as cnt FROM community_posts`);
    const totalPosts = parseInt(totalResult.rows[0].cnt);

    // Today's posts
    const todayResult = await client.query(
      `SELECT COUNT(*) as cnt FROM community_posts WHERE created_at >= $1`,
      [today]
    );
    const todayPosts = parseInt(todayResult.rows[0].cnt);

    // Total comments
    const commentsResult = await client.query(`SELECT COUNT(*) as cnt FROM post_comments`);
    const totalComments = parseInt(commentsResult.rows[0].cnt);

    // Top tags
    const tagsResult = await client.query(`
      SELECT tag, COUNT(*) as cnt FROM community_posts
      WHERE created_at >= $1
      GROUP BY tag ORDER BY cnt DESC LIMIT 5
    `, [weekAgo]);
    const topTags = tagsResult.rows.map(r => ({ tag: r.tag, count: parseInt(r.cnt) }));

    // Active hours (simplified — extract hour from ISO string)
    const hoursResult = await client.query(`
      SELECT EXTRACT(HOUR FROM created_at::timestamp) AS hr, COUNT(*) as cnt
      FROM community_posts
      WHERE created_at >= $1
      GROUP BY hr ORDER BY hr
    `, [weekAgo]);
    const activeHours = hoursResult.rows.map(r => ({ hour: parseInt(r.hr), count: parseInt(r.cnt) }));

    // Weekly growth
    const thisWeekResult = await client.query(
      `SELECT COUNT(*) as cnt FROM community_posts WHERE created_at >= $1`,
      [weekAgo]
    );
    const lastWeekResult = await client.query(
      `SELECT COUNT(*) as cnt FROM community_posts WHERE created_at >= $1 AND created_at < $2`,
      [twoWeeksAgo, weekAgo]
    );
    const thisWeek = parseInt(thisWeekResult.rows[0].cnt);
    const lastWeek = parseInt(lastWeekResult.rows[0].cnt);
    const weeklyGrowth = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

    return {
      totalPosts,
      todayPosts,
      totalComments,
      topTags,
      activeHours,
      sentimentBreakdown: { positive: 60, neutral: 30, negative: 10 }, // Placeholder — could be computed from emotion data
      weeklyGrowth,
    };
  } finally {
    client.release();
  }
}
