// 情绪签到 (Mood Check-in) API routes
import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { moodEntries, users, avatars } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { storage } from "./storage";
import { getAIClient, FAST_MODEL, extractJSON } from "./ai-config";
import { writeMemory } from "./agent-memory";
import lunisolar from "lunisolar";

function getUserId(req: Request): string {
  return (req as any).userId;
}

// 8 core mood emojis with associated scores
const MOOD_SCORES: Record<string, number> = {
  "😊": 8, "😌": 7, "😔": 3, "😤": 4,
  "😰": 2, "😴": 5, "🥰": 9, "😶": 5,
};

const MOOD_LABELS: Record<string, string> = {
  "😊": "开心", "😌": "平静", "😔": "低落", "😤": "烦躁",
  "😰": "焦虑", "😴": "疲惫", "🥰": "幸福", "😶": "无感",
};

function getTimeContext(): "morning" | "evening" {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 5 ? "evening" : "morning";
}

function getStemElement(stem: string): string {
  const map: Record<string, string> = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
  };
  return map[stem] || '';
}

export function registerMoodCheckinRoutes(app: Express, requireAuth: (req: Request, res: Response, next: NextFunction) => void) {

  // POST /api/mood/checkin — mood check-in with AI response
  app.post("/api/mood/checkin", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { mood, note, context: userContext, triggers } = req.body;
      const triggerList: string[] = Array.isArray(triggers) ? triggers : [];

      if (!mood || !MOOD_SCORES[mood]) {
        return res.status(400).json({ error: "请选择有效的情绪" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: "用户不存在" });

      const moodScore = MOOD_SCORES[mood];
      const moodLabel = MOOD_LABELS[mood];
      const timeContext = userContext || getTimeContext();

      // Get last 7 days of mood entries for pattern
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const recentMoods = await db.select().from(moodEntries)
        .where(and(eq(moodEntries.userId, userId), sql`${moodEntries.createdAt} > ${sevenDaysAgo}`))
        .orderBy(desc(moodEntries.createdAt))
        .limit(14);

      // Build 五行 context
      let wuxingContext = "";
      try {
        const todayLsr = lunisolar(new Date());
        const todayDayStem = todayLsr.char8.day.stem.toString();
        const todayDayElement = getStemElement(todayDayStem);
        const todayLunar = `${todayLsr.lunar.getMonthName()}${todayLsr.lunar.getDayName()}`;

        wuxingContext = `今日天干: ${todayDayStem}（${todayDayElement}）\n农历: ${todayLunar}`;

        if (user.birthDate) {
          const birthLsr = lunisolar(user.birthDate);
          const birthDayMaster = birthLsr.char8.day.stem.toString();
          const birthElement = getStemElement(birthDayMaster);
          wuxingContext += `\n用户日主: ${birthDayMaster}（${birthElement}命）`;
        }
      } catch (e) {
        console.error("[mood-checkin] lunisolar error:", e);
      }

      // Build pattern summary
      const recentMoodEmojis = recentMoods.map(m => m.emotionTags).join(" ");

      const prompt = `用户刚刚做了情绪签到。

情绪: ${mood} (${moodLabel})
${triggerList.length > 0 ? `触发因素: ${triggerList.join("、")}` : ''}
${note ? `用户说: "${note}"` : '（用户没有留言）'}
时间: ${timeContext === "evening" ? "晚间" : "白天"}
最近7天情绪记录: ${recentMoodEmojis || "这是第一次签到"}
${wuxingContext ? `命理数据:\n${wuxingContext}` : ''}

请返回JSON（不要markdown代码块）：
{
  "aiResponse": "（50-100字的温暖回应，结合命理和情绪。${timeContext === "evening" ? "晚间语气，更温柔。" : ""}）",
  "wuxingInsight": "（20-40字的五行洞察，比如'水日生人遇火运，焦躁是正常的'）",
  "ritual": "（15-30字的小仪式建议，比如'试试深呼吸三次，想象水流过身体'）"
}`;

      let aiResponse = `${moodLabel}的心情已收到，今天也辛苦了。`;
      let wuxingInsight = "五行流转，万物皆有时。";
      let ritual = "闭上眼睛，深呼吸三次。";

      try {
        const client = getAIClient();
        const response = await client.chat.completions.create({
          model: FAST_MODEL,
          max_tokens: 500,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "你是观星的情绪陪伴助手，精通五行命理。回应要温暖亲密、简洁有力。只返回JSON。" },
            { role: "user", content: prompt },
          ],
        });

        const raw = response.choices[0]?.message?.content?.trim() || '{}';
        const parsed = JSON.parse(extractJSON(raw));
        aiResponse = parsed.aiResponse || aiResponse;
        wuxingInsight = parsed.wuxingInsight || wuxingInsight;
        ritual = parsed.ritual || ritual;
      } catch (e) {
        console.error("[mood-checkin] AI error:", e);
      }

      // Save mood entry (prepend triggers to note if present)
      const savedNote = triggerList.length > 0
        ? `[${triggerList.join(",")}]${note ? " " + note : ""}`
        : note || null;
      const [saved] = await db.insert(moodEntries).values({
        userId,
        moodScore,
        emotionTags: mood,
        note: savedNote,
        aiResponse,
        context: timeContext,
        wuxingInsight,
        ritual,
        createdAt: new Date().toISOString(),
      }).returning();

      res.json({
        id: saved.id,
        aiResponse,
        wuxingInsight,
        ritual,
      });

      // Write to agent shared memory so all agents can reference this mood check-in
      writeMemory({
        agentKey: "mood",
        userId,
        category: "emotion_state",
        summary: `情绪签到: ${moodLabel}(${mood}) 分数${moodScore}/10${triggerList.length > 0 ? ` 触发:${triggerList.join(",")}` : ""}${note ? ` — "${note.slice(0, 40)}"` : ""}。${wuxingInsight}`,
        details: { moodScore, mood, moodLabel, triggers: triggerList, note, wuxingInsight, timeContext },
        importance: moodScore <= 3 ? 8 : moodScore >= 8 ? 6 : 5,
        ttlHours: 24 * 14,
      }).catch(err => console.error("[mood-checkin] memory write error:", err));
    } catch (err) {
      console.error("[mood-checkin] Error:", err);
      res.status(500).json({ error: "签到失败，请稍后再试" });
    }
  });

  // GET /api/mood/history?days=30
  app.get("/api/mood/history", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const days = Math.min(parseInt(req.query.days as string) || 30, 90);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const entries = await db.select().from(moodEntries)
        .where(and(eq(moodEntries.userId, userId), sql`${moodEntries.createdAt} > ${since}`))
        .orderBy(desc(moodEntries.createdAt));

      // Calculate patterns
      let dominantMood = "😶";
      let moodTrend: "improving" | "stable" | "declining" = "stable";

      if (entries.length > 0) {
        // Most frequent mood
        const moodCounts: Record<string, number> = {};
        for (const e of entries) {
          moodCounts[e.emotionTags] = (moodCounts[e.emotionTags] || 0) + 1;
        }
        dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0];

        // Trend: compare average score of last 3 days vs previous 3 days
        if (entries.length >= 4) {
          const recent = entries.slice(0, Math.ceil(entries.length / 2));
          const older = entries.slice(Math.ceil(entries.length / 2));
          const recentAvg = recent.reduce((s, e) => s + e.moodScore, 0) / recent.length;
          const olderAvg = older.reduce((s, e) => s + e.moodScore, 0) / older.length;
          if (recentAvg - olderAvg > 1) moodTrend = "improving";
          else if (olderAvg - recentAvg > 1) moodTrend = "declining";
        }
      }

      // Group by date
      const grouped: Record<string, typeof entries> = {};
      for (const entry of entries) {
        const date = entry.createdAt.substring(0, 10);
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(entry);
      }

      res.json({
        entries: entries.map(e => ({
          id: e.id,
          mood: e.emotionTags,
          moodScore: e.moodScore,
          note: e.note,
          aiResponse: e.aiResponse,
          wuxingInsight: e.wuxingInsight,
          ritual: e.ritual,
          context: e.context,
          createdAt: e.createdAt,
        })),
        grouped,
        patterns: {
          dominantMood,
          moodTrend,
          totalEntries: entries.length,
        },
      });
    } catch (err) {
      console.error("[mood-history] Error:", err);
      res.status(500).json({ error: "获取历史记录失败" });
    }
  });

  // GET /api/mood/streak
  app.get("/api/mood/streak", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      // Get all mood entries ordered by date
      const entries = await db.select({
        createdAt: moodEntries.createdAt,
      }).from(moodEntries)
        .where(eq(moodEntries.userId, userId))
        .orderBy(desc(moodEntries.createdAt));

      if (entries.length === 0) {
        return res.json({ streak: 0, todayCheckedIn: false });
      }

      // Get unique dates
      const uniqueDates = Array.from(new Set(entries.map(e => e.createdAt.substring(0, 10)))).sort().reverse();
      const today = new Date().toISOString().substring(0, 10);
      const todayCheckedIn = uniqueDates[0] === today;

      let streak = todayCheckedIn ? 1 : 0;
      const startIdx = todayCheckedIn ? 1 : 0;

      for (let i = startIdx; i < uniqueDates.length; i++) {
        const expected = new Date(Date.now() - (i + (todayCheckedIn ? 0 : 1)) * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
        if (uniqueDates[i] === expected) {
          streak++;
        } else {
          break;
        }
      }

      res.json({ streak, todayCheckedIn });
    } catch (err) {
      console.error("[mood-streak] Error:", err);
      res.status(500).json({ error: "获取连续签到失败" });
    }
  });
}
