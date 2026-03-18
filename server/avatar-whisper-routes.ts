// 分身私语 (Avatar Whispers) API routes
import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { avatarWhispers, avatars, moodEntries, users } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { storage } from "./storage";
import { getFortuneClient, FORTUNE_MODEL } from "./ai-config";
import lunisolar from "lunisolar";

function getUserId(req: Request): string {
  return (req as any).userId;
}

function getStemElement(stem: string): string {
  const map: Record<string, string> = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
  };
  return map[stem] || '';
}

const WHISPER_TYPES = ["observation", "reflection", "encouragement", "memory", "insight"] as const;

async function generateWhispers(userId: string, avatarId: string, avatarName: string): Promise<void> {
  try {
    // Check if whispers already exist for today (max 3 per day)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existing = await db.select().from(avatarWhispers)
      .where(and(
        eq(avatarWhispers.userId, userId),
        sql`${avatarWhispers.createdAt} > ${todayStart.toISOString()}`,
      ));

    if (existing.length >= 3) return;

    const user = await storage.getUser(userId);
    if (!user) return;

    // Gather context: recent moods
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentMoods = await db.select().from(moodEntries)
      .where(and(eq(moodEntries.userId, userId), sql`${moodEntries.createdAt} > ${sevenDaysAgo}`))
      .orderBy(desc(moodEntries.createdAt))
      .limit(7);

    const moodSummary = recentMoods.length > 0
      ? recentMoods.map(m => `${m.emotionTags}(${m.note || ''})`).join(', ')
      : '暂无情绪记录';

    // 五行 context
    let wuxingContext = "";
    try {
      const todayLsr = lunisolar(new Date());
      const todayDayStem = todayLsr.char8.day.stem.toString();
      const todayDayElement = getStemElement(todayDayStem);
      wuxingContext = `今日五行: ${todayDayElement}（${todayDayStem}）`;

      if (user.birthDate) {
        const birthLsr = lunisolar(user.birthDate);
        const birthDayMaster = birthLsr.char8.day.stem.toString();
        const birthElement = getStemElement(birthDayMaster);
        wuxingContext += `\n用户: ${birthElement}命（${birthDayMaster}）`;
      }
    } catch (e) { /* skip */ }

    const whisperCount = Math.max(1, 3 - existing.length);
    const usedTypes = existing.map(e => e.whisperType);
    const availableTypes = WHISPER_TYPES.filter(t => !usedTypes.includes(t));

    const prompt = `你是「${avatarName}」——用户的AI分身。你要以分身的身份给主人发${whisperCount}条私语。

用户信息:
- 名字: ${user.nickname || user.username}
- 最近情绪: ${moodSummary}
${wuxingContext ? `- ${wuxingContext}` : ''}

私语类型选择（从以下未使用的类型中选）: ${availableTypes.join(', ')}
- observation: 像"刚看到一个帖子让我想起你说过的话..."
- reflection: 像"你最近一直在问事业运势，是不是在纠结什么？"
- encouragement: 像"今天火气旺，正好适合你去做那件一直犹豫的事"
- memory: 像"还记得上周你提到的那个面试吗？怎么样了？"
- insight: 像"我发现你每逢水旺的日子都特别平静"

返回JSON数组（不要markdown代码块）:
[
  {
    "type": "类型",
    "content": "（20-50字的私语，像微信消息，亲密自然，不要过于正式）"
  }
]

要求: 生成${whisperCount}条，每条不同类型。语气亲密像朋友发微信。可以用命理知识但要自然融入。`;

    const client = getFortuneClient();
    const response = await client.chat.completions.create({
      model: FORTUNE_MODEL,
      max_tokens: 500,
      temperature: 0.9,
      messages: [
        { role: "system", content: `你是用户的AI分身「${avatarName}」，要给主人发亲密的私语消息。像好朋友发微信一样自然。只返回JSON。` },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() || '[]';
    const parsed = JSON.parse(raw.replace(/```json\n?|```/g, ''));
    const whispers = Array.isArray(parsed) ? parsed : [];

    for (const w of whispers.slice(0, whisperCount)) {
      if (w.content && w.type) {
        await db.insert(avatarWhispers).values({
          avatarId,
          userId,
          whisperType: w.type,
          content: w.content,
          aiContext: JSON.stringify({ moodSummary, wuxingContext }),
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.error("[avatar-whisper] Generation error:", err);
  }
}

export function registerAvatarWhisperRoutes(app: Express, requireAuth: (req: Request, res: Response, next: NextFunction) => void) {

  // GET /api/avatar/whispers
  app.get("/api/avatar/whispers", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      // Get user's avatar
      const [avatar] = await db.select().from(avatars)
        .where(eq(avatars.userId, userId)).limit(1);

      if (!avatar) {
        return res.json({ whispers: [], hasAvatar: false });
      }

      // Generate whispers if needed
      await generateWhispers(userId, avatar.id, avatar.name);

      // Fetch recent whispers (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const whispers = await db.select().from(avatarWhispers)
        .where(and(
          eq(avatarWhispers.userId, userId),
          sql`${avatarWhispers.createdAt} > ${sevenDaysAgo}`,
        ))
        .orderBy(desc(avatarWhispers.createdAt))
        .limit(20);

      // Count unread
      const unreadCount = whispers.filter(w => !w.isRead).length;

      res.json({
        whispers: whispers.map(w => ({
          id: w.id,
          type: w.whisperType,
          content: w.content,
          isRead: w.isRead,
          userReply: w.userReply,
          avatarReply: w.avatarReply,
          createdAt: w.createdAt,
        })),
        hasAvatar: true,
        avatarName: avatar.name,
        unreadCount,
      });
    } catch (err) {
      console.error("[avatar-whispers] Error:", err);
      res.status(500).json({ error: "获取私语失败" });
    }
  });

  // POST /api/avatar/whisper/read — mark whispers as read
  app.post("/api/avatar/whisper/read", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await db.update(avatarWhispers)
        .set({ isRead: true })
        .where(and(eq(avatarWhispers.userId, userId), eq(avatarWhispers.isRead, false)));
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "标记已读失败" });
    }
  });

  // POST /api/avatar/whisper/respond — reply to a whisper
  app.post("/api/avatar/whisper/respond", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { whisperId, message } = req.body;

      if (!whisperId || !message) {
        return res.status(400).json({ error: "缺少参数" });
      }

      // Get the whisper
      const [whisper] = await db.select().from(avatarWhispers)
        .where(and(eq(avatarWhispers.id, whisperId), eq(avatarWhispers.userId, userId)))
        .limit(1);

      if (!whisper) {
        return res.status(404).json({ error: "私语不存在" });
      }

      // Get avatar name
      const [avatar] = await db.select().from(avatars)
        .where(eq(avatars.userId, userId)).limit(1);
      const avatarName = avatar?.name || "你的分身";

      // Generate avatar reply
      let avatarReply = "我懂你的意思～";
      try {
        const client = getFortuneClient();
        const response = await client.chat.completions.create({
          model: FORTUNE_MODEL,
          max_tokens: 200,
          temperature: 0.85,
          messages: [
            { role: "system", content: `你是用户的AI分身「${avatarName}」。用户回复了你的私语。像好朋友聊微信一样回复，30-60字，亲密自然。直接回复文字，不要JSON。` },
            { role: "assistant", content: whisper.content },
            { role: "user", content: message },
          ],
        });
        avatarReply = response.choices[0]?.message?.content?.trim() || avatarReply;
      } catch (e) {
        console.error("[avatar-whisper] Reply AI error:", e);
      }

      // Save reply
      await db.update(avatarWhispers)
        .set({ userReply: message, avatarReply, isRead: true })
        .where(eq(avatarWhispers.id, whisperId));

      res.json({ avatarReply });
    } catch (err) {
      console.error("[avatar-whisper-respond] Error:", err);
      res.status(500).json({ error: "回复失败" });
    }
  });
}
