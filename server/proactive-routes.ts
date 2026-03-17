// Proactive AI Companion + Group Chat routes
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { proactiveMessages, groupChatSessions, groupChatMessages } from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { getAIClient, DEFAULT_MODEL } from "./ai-config";
import lunisolar from "lunisolar";

// ── Avatar IDs (from community_avatars) ──────────────────────
const AVATARS = {
  xuanji: { id: 'cfd2636b-fcb0-498b-891d-a576fead3139', name: '玄机子', specialty: '八字/易经' },
  xinghe: { id: 'a35dd36d-163a-407c-b472-f5b2546727ba', name: '星河散人', specialty: '星象/占星' },
  yunshan: { id: 'a1a00269-8e33-41c2-a917-f3207fc9e235', name: '云山道人', specialty: '道家智慧' },
  helper: { id: '8cf95845-88f4-4bd1-bef3-7f6a58294600', name: '观星小助手', specialty: '综合分析' },
  // Phase 3 new masters
  fengshui: { id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e', name: '风水先生·陈半仙', specialty: '风水/堪舆' },
  ziwei: { id: 'c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f', name: '紫微真人', specialty: '紫微斗数' },
  xingyu: { id: 'd3e4f5a6-b7c8-4d9e-0f1a-2b3c4d5e6f7a', name: '星语姐姐', specialty: '星座/塔罗' },
  jiqimao: { id: 'e4f5a6b7-c8d9-4e0f-1a2b-3c4d5e6f7a8b', name: '机器猫', specialty: 'AI数据分析' },
};

// All masters (for group chat: randomly select 4-5 from these, always include helper as final summarizer)
const ALL_MASTERS = [
  AVATARS.xuanji, AVATARS.xinghe, AVATARS.yunshan,
  AVATARS.fengshui, AVATARS.ziwei, AVATARS.xingyu, AVATARS.jiqimao,
];

// Default order for backward compatibility (original 4)
const AVATAR_ORDER = [AVATARS.xuanji, AVATARS.xinghe, AVATARS.yunshan, AVATARS.helper];

// ── Avatar system prompts for group chat ─────────────────────
const AVATAR_SYSTEM_PROMPTS: Record<string, string> = {
  [AVATARS.xuanji.id]: `你是「玄机子」，一位严肃传统的八字/易经大师。说话文绉绉，喜欢引经据典，偶尔用文言文。从不用emoji。分析问题时从八字命理、天干地支、五行生克的角度出发。你经常质疑其他人过于简化的观点，坚持传统命理的严谨性。回复控制在150字以内。`,
  [AVATARS.xinghe.id]: `你是「星河散人」，一位洒脱随性的星象/占星专家。说话简短有力，偶尔冒出诗意金句。分析问题从星象、星座、行星运行的角度出发。你对玄机子的古板有时会不以为然，觉得星象更能揭示宇宙规律。回复控制在120字以内。`,
  [AVATARS.yunshan.id]: `你是「云山道人」，一位幽默风趣的道家智慧大师。喜欢开玩笑、用谐音梗、吐槽，但核心观点来自道家哲学（道法自然、阴阳平衡、无为而治）。你经常调侃玄机子太严肃、星河散人太飘，但本质上尊重他们。回复控制在130字以内。`,
  [AVATARS.helper.id]: `你是「观星小助手」，平台的友好专业助手。你的角色是综合前面三位大师的观点，用通俗易懂的语言帮用户梳理要点，给出实用建议。态度温暖亲切，说话清晰有条理。你会引用前面大师说的具体观点来做总结。回复控制在150字以内。`,
  // Phase 3 new masters
  [AVATARS.fengshui.id]: `你是「风水先生·陈半仙」，一位精通风水堪舆的老派大师。说话半文半白，爱用风水术语如"气场""明堂""龙穴砂水"，特别讲究方位朝向。你有广东口语的感觉，偶尔夹杂粤语词（"系噉嘅"）。你经常不同意星河散人的观点，认为星象太虚，风水才是脚踏实地。回复控制在130字以内。`,
  [AVATARS.ziwei.id]: `你是「紫微真人」，一位高冷学院派紫微斗数大师。精确到时辰分析，数据驱动，认为紫微斗数是最精密的命理系统。你说话严谨、条理清晰，偶尔嫌弃其他大师不够精确——"这个得排盘才能定论"是你的口头禅。你尊重玄机子但觉得八字还是粗了些。回复控制在130字以内。`,
  [AVATARS.xingyu.id]: `你是「星语姐姐」，一位年轻活泼的星座/塔罗达人。说话带emoji✨，语气轻快，用星座和塔罗牌来解读问题。你是年轻用户最喜欢的大师，擅长把深奥的内容讲得有趣好懂。和云山道人经常互怼但关系好，你叫他"老道"，他叫你"小丫头"。回复控制在120字以内。`,
  [AVATARS.jiqimao.id]: `你是「机器猫」，一个AI数据分析师角色。你用数据和概率说话，偶尔吐槽传统玄学不科学，但又不得不承认某些规律确实有道理。喜欢引用研究和统计数据，是群里的"理性反对派"。你说话直接，带点程序员式幽默——"相关性≠因果关系"是你的金句。回复控制在130字以内。`,
};

function getUserId(req: Request): string {
  return (req as any).userId;
}



// Get today's date string in user's timezone
function getTodayStr(tz?: string): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: tz || 'Asia/Shanghai' });
}

export function registerProactiveRoutes(app: Express, requireAuth: any) {

  // ═══════════════════════════════════════════════════════════════
  // Feature 1: Proactive AI Companion (AI主动陪伴)
  // ═══════════════════════════════════════════════════════════════

  app.get("/api/proactive/daily", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const tz = (req.query.tz as string) || 'Asia/Shanghai';
      const todayStr = getTodayStr(tz);

      // Check cache: already generated today?
      const existing = await db.select().from(proactiveMessages)
        .where(and(
          eq(proactiveMessages.userId, userId),
          sql`${proactiveMessages.createdAt}::text LIKE ${todayStr + '%'}`
        ))
        .orderBy(desc(proactiveMessages.createdAt))
        .limit(1);

      if (existing.length > 0) {
        const msg = existing[0];
        return res.json({
          type: msg.type,
          message: msg.message,
          avatarId: msg.avatarId,
          avatarName: '观星小助手',
          tip: msg.tip,
          createdAt: msg.createdAt,
          isRead: msg.isRead,
          id: msg.id,
        });
      }

      // Get user profile
      const user = await storage.getUser(userId);
      const hasBirthDate = !!user?.birthDate;

      // Get today's Chinese calendar info
      let todayInfo = '';
      let jieqiName = '';
      let tianganDizhi = '';
      try {
        const lsr = lunisolar(new Date(todayStr));
        const lunar = lsr.lunar;
        todayInfo = `农历${lunar.month}月${lunar.day}`;
        tianganDizhi = `${lsr.char8.day.stem}${lsr.char8.day.branch}日`;

        // Check for jieqi (solar term)
        const term = lsr.solarTerm;
        if (term) {
          jieqiName = term.toString();
        }
      } catch (e) {
        // lunisolar error, continue without
      }

      // Determine message type
      let msgType: string;
      let userContext = '';

      if (hasBirthDate && user?.birthDate) {
        try {
          const birthLsr = lunisolar(user.birthDate);
          const dayStem = birthLsr.char8.day.stem.toString();
          const dayBranch = birthLsr.char8.day.branch.toString();
          userContext = `用户日主: ${dayStem}${dayBranch}`;
          if (user.zodiacSign) userContext += `，星座: ${user.zodiacSign}`;
          if (user.mbtiType) userContext += `，MBTI: ${user.mbtiType}`;
        } catch {}
      }

      if (jieqiName) {
        msgType = 'jieqi_blessing';
      } else if (hasBirthDate) {
        msgType = 'energy_tip';
      } else {
        msgType = 'energy_tip';
      }

      // Generate with AI (Gemini via Zeabur AI Hub)
      const client = getAIClient();
      const systemPrompt = `你是「观星小助手」，一位温暖贴心的AI伙伴。你每天早上主动给用户发一条关心消息，像朋友发的早安短信一样自然。

规则：
- 语气温暖亲切，像老朋友聊天，不要太正式
- 融入今天的天干地支和节气信息，但不要生硬
- 如果有用户命理信息，根据五行给出针对性建议
- message字段100字以内，tip字段30字以内
- 返回严格JSON格式，不要markdown代码块`;

      let userPrompt = `今天: ${todayStr} ${todayInfo} ${tianganDizhi}`;
      if (jieqiName) userPrompt += `\n今天是节气「${jieqiName}」`;
      if (userContext) userPrompt += `\n${userContext}`;

      userPrompt += `\n\n请生成一条${msgType === 'jieqi_blessing' ? '节气祝福' : '每日能量提示'}消息。
返回JSON: {"message": "主消息内容", "tip": "一句实用小贴士"}`;

      let message = '新的一天开始了，愿你心怀美好，遇见温暖。';
      let tip = '深呼吸三次，开启元气满满的一天';

      try {
        const response = await client.chat.completions.create({
          model: DEFAULT_MODEL,
          max_tokens: 300,
          temperature: 0.85,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const raw = response.choices[0]?.message?.content?.trim() || "";
        const cleaned = raw.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        try {
          const parsed = JSON.parse(cleaned);
          message = parsed.message || message;
          tip = parsed.tip || tip;
        } catch {
          // If JSON parse fails, use the raw text as message
          if (raw.length > 10 && raw.length < 200) {
            message = raw;
          }
        }
      } catch (aiErr) {
        console.error("Proactive message AI error:", aiErr);
      }

      // Store the message
      const [saved] = await db.insert(proactiveMessages).values({
        userId,
        type: msgType,
        message,
        tip,
        avatarId: AVATARS.helper.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      }).returning();

      // Create notification
      try {
        await storage.createNotification({
          userId,
          type: 'system',
          title: '观星小助手的每日问候',
          body: message.substring(0, 80),
          linkTo: '/',
        });
      } catch {}

      return res.json({
        type: msgType,
        message,
        avatarId: AVATARS.helper.id,
        avatarName: '观星小助手',
        tip,
        createdAt: saved.createdAt,
        isRead: false,
        id: saved.id,
      });
    } catch (err) {
      console.error("Proactive daily error:", err);
      res.status(500).json({ error: "获取每日消息失败" });
    }
  });

  // Mark proactive message as read
  app.post("/api/proactive/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.update(proactiveMessages)
        .set({ isRead: true })
        .where(eq(proactiveMessages.id, id));
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "操作失败" });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // Feature 2: Group Chat (AI群聊「论道」)
  // ═══════════════════════════════════════════════════════════════

  // Create a new group chat session
  app.post("/api/group-chat/create", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { topic, isPublic } = req.body;

      if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        return res.status(400).json({ error: "请输入讨论话题" });
      }

      // Get user context
      const user = await storage.getUser(userId);
      let userContext: any = {};
      if (user?.birthDate) userContext.birthDate = user.birthDate;
      if (user?.zodiacSign) userContext.zodiac = user.zodiacSign;
      if (user?.mbtiType) userContext.mbti = user.mbtiType;

      const [session] = await db.insert(groupChatSessions).values({
        userId,
        topic: topic.trim(),
        userContext: JSON.stringify(userContext),
        isPublic: !!isPublic,
        participantCount: 1,
        messageCount: 0,
        createdAt: new Date().toISOString(),
      }).returning();

      // Store the user's initial message
      await db.insert(groupChatMessages).values({
        sessionId: session.id,
        userId,
        content: topic.trim(),
        messageOrder: 0,
        round: 1,
        createdAt: new Date().toISOString(),
      });

      res.json({
        sessionId: session.id,
        topic: session.topic,
        createdAt: session.createdAt,
      });
    } catch (err) {
      console.error("Group chat create error:", err);
      res.status(500).json({ error: "创建论道会话失败" });
    }
  });

  // Generate AI responses for a session
  app.post("/api/group-chat/:sessionId/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = getUserId(req);

      // Get session — allow access if owner OR public
      const allSessions = await db.select().from(groupChatSessions)
        .where(eq(groupChatSessions.id, sessionId));

      if (allSessions.length === 0) {
        return res.status(404).json({ error: "会话不存在" });
      }
      const session = allSessions[0];
      if (session.userId !== userId && !session.isPublic) {
        return res.status(403).json({ error: "无权访问该会话" });
      }

      // Get all previous messages
      const prevMessages = await db.select().from(groupChatMessages)
        .where(eq(groupChatMessages.sessionId, sessionId))
        .orderBy(asc(groupChatMessages.createdAt));

      // Determine current round
      const maxRound = prevMessages.reduce((max, m) => Math.max(max, m.round || 1), 1);
      const currentRound = maxRound;

      // Build conversation context
      let conversationHistory = `话题: ${session.topic}\n\n`;
      if (session.userContext) {
        try {
          const ctx = JSON.parse(session.userContext);
          if (ctx.birthDate) conversationHistory += `提问者生日: ${ctx.birthDate}\n`;
          if (ctx.zodiac) conversationHistory += `提问者星座: ${ctx.zodiac}\n`;
          if (ctx.mbti) conversationHistory += `提问者MBTI: ${ctx.mbti}\n`;
        } catch {}
      }
      conversationHistory += '\n--- 对话记录 ---\n';
      const allAvatarsList = Object.values(AVATARS);
      for (const msg of prevMessages) {
        if (msg.userId) {
          conversationHistory += `[用户]: ${msg.content}\n`;
        } else if (msg.avatarId) {
          const avatar = allAvatarsList.find(a => a.id === msg.avatarId);
          conversationHistory += `[${avatar?.name || '大师'}]: ${msg.content}\n`;
        }
      }

      // Get today's calendar context
      let todayContext = '';
      try {
        const lsr = lunisolar();
        todayContext = `\n今日: ${lsr.char8.day.stem}${lsr.char8.day.branch}日`;
        const term = lsr.solarTerm;
        if (term) todayContext += ` 节气:${term}`;
      } catch {}

      const client = getAIClient();
      const generatedMessages: any[] = [];
      let runningContext = conversationHistory;

      // Get the max message_order
      const maxOrder = prevMessages.reduce((max, m) => Math.max(max, m.messageOrder || 0), 0);

      // Randomly select 3-4 masters from ALL_MASTERS, then always append helper as summarizer
      const shuffled = [...ALL_MASTERS].sort(() => Math.random() - 0.5);
      const selectedMasters = shuffled.slice(0, Math.min(3 + Math.floor(Math.random() * 2), ALL_MASTERS.length));
      const roundAvatars = [...selectedMasters, AVATARS.helper];

      // Generate responses sequentially for each avatar
      for (let i = 0; i < roundAvatars.length; i++) {
        const avatar = roundAvatars[i];
        const systemPrompt = AVATAR_SYSTEM_PROMPTS[avatar.id] + todayContext;

        try {
          const response = await client.chat.completions.create({
            model: DEFAULT_MODEL,
            max_tokens: 300,
            temperature: 0.85,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: runningContext + `\n\n请以${avatar.name}的身份回应。${i > 0 ? '注意参考和回应之前其他大师的发言。' : '你是第一个发言的。'}` },
            ],
          });

          const content = response.choices[0]?.message?.content?.trim() || `${avatar.name}暂时无法回应。`;

          // Store the message
          const [saved] = await db.insert(groupChatMessages).values({
            sessionId,
            avatarId: avatar.id,
            content,
            messageOrder: maxOrder + i + 1,
            round: currentRound,
            createdAt: new Date().toISOString(),
          }).returning();

          generatedMessages.push({
            id: saved.id,
            avatarId: avatar.id,
            avatarName: avatar.name,
            specialty: avatar.specialty,
            content,
            order: i + 1,
            createdAt: saved.createdAt,
          });

          // Add to running context for next avatar
          runningContext += `\n[${avatar.name}]: ${content}`;
        } catch (aiErr) {
          console.error(`Group chat AI error for ${avatar.name}:`, aiErr);
          // Store fallback message
          const fallback = `（${avatar.name}正在思考中...请稍后再试）`;
          const [saved] = await db.insert(groupChatMessages).values({
            sessionId,
            avatarId: avatar.id,
            content: fallback,
            messageOrder: maxOrder + i + 1,
            round: currentRound,
            createdAt: new Date().toISOString(),
          }).returning();

          generatedMessages.push({
            id: saved.id,
            avatarId: avatar.id,
            avatarName: avatar.name,
            specialty: avatar.specialty,
            content: fallback,
            order: i + 1,
            createdAt: saved.createdAt,
          });
          runningContext += `\n[${avatar.name}]: ${fallback}`;
        }
      }

      // Update message count
      await db.update(groupChatSessions)
        .set({ messageCount: sql`message_count + ${generatedMessages.length}` })
        .where(eq(groupChatSessions.id, sessionId));

      res.json({ messages: generatedMessages, avatars: roundAvatars.map(a => ({ id: a.id, name: a.name, specialty: a.specialty })) });
    } catch (err) {
      console.error("Group chat generate error:", err);
      res.status(500).json({ error: "生成回复失败" });
    }
  });

  // User follow-up reply
  app.post("/api/group-chat/:sessionId/reply", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = getUserId(req);
      const { message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: "请输入消息" });
      }

      // Verify session — allow access if owner OR public
      const allSessions = await db.select().from(groupChatSessions)
        .where(eq(groupChatSessions.id, sessionId));

      if (allSessions.length === 0) {
        return res.status(404).json({ error: "会话不存在" });
      }
      const sessionData = allSessions[0];
      if (sessionData.userId !== userId && !sessionData.isPublic) {
        return res.status(403).json({ error: "无权访问该会话" });
      }

      // Update participant count for public sessions
      if (sessionData.isPublic && sessionData.userId !== userId) {
        await db.update(groupChatSessions)
          .set({ participantCount: sql`participant_count + 1` })
          .where(eq(groupChatSessions.id, sessionId));
      }

      // Get current max values
      const prevMessages = await db.select().from(groupChatMessages)
        .where(eq(groupChatMessages.sessionId, sessionId))
        .orderBy(asc(groupChatMessages.createdAt));

      const maxOrder = prevMessages.reduce((max, m) => Math.max(max, m.messageOrder || 0), 0);
      const maxRound = prevMessages.reduce((max, m) => Math.max(max, m.round || 1), 1);

      // Store user message
      await db.insert(groupChatMessages).values({
        sessionId,
        userId,
        content: message.trim(),
        messageOrder: maxOrder + 1,
        round: maxRound + 1,
        createdAt: new Date().toISOString(),
      });

      res.json({ ok: true, round: maxRound + 1 });
    } catch (err) {
      console.error("Group chat reply error:", err);
      res.status(500).json({ error: "发送消息失败" });
    }
  });

  // List user's group chat sessions
  app.get("/api/group-chat/sessions", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const sessions = await db.select().from(groupChatSessions)
        .where(eq(groupChatSessions.userId, userId))
        .orderBy(desc(groupChatSessions.createdAt))
        .limit(20);

      res.json(sessions);
    } catch (err) {
      res.status(500).json({ error: "获取会话列表失败" });
    }
  });

  // List public group chat sessions
  app.get("/api/group-chat/public", requireAuth, async (req: Request, res: Response) => {
    try {
      const publicSessions = await db.select().from(groupChatSessions)
        .where(eq(groupChatSessions.isPublic, true))
        .orderBy(desc(groupChatSessions.createdAt))
        .limit(20);

      // Enrich with creator info and message count
      const enriched = await Promise.all(publicSessions.map(async (s) => {
        const creator = await storage.getUser(s.userId);
        const msgCount = await db.select({ count: sql<number>`count(*)` })
          .from(groupChatMessages)
          .where(eq(groupChatMessages.sessionId, s.id));
        return {
          ...s,
          creatorNickname: creator?.nickname || '用户',
          messageCount: Number(msgCount[0]?.count || 0),
        };
      }));

      res.json(enriched);
    } catch (err) {
      res.status(500).json({ error: "获取公开论道失败" });
    }
  });

  // Get full chat history for a session
  app.get("/api/group-chat/:sessionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = getUserId(req);

      // Allow access if owner OR public
      const allSessions = await db.select().from(groupChatSessions)
        .where(eq(groupChatSessions.id, sessionId));

      if (allSessions.length === 0) {
        return res.status(404).json({ error: "会话不存在" });
      }
      const sessions = allSessions;
      if (sessions[0].userId !== userId && !sessions[0].isPublic) {
        return res.status(403).json({ error: "无权访问该会话" });
      }

      const msgs = await db.select().from(groupChatMessages)
        .where(eq(groupChatMessages.sessionId, sessionId))
        .orderBy(asc(groupChatMessages.messageOrder), asc(groupChatMessages.createdAt));

      // Enrich avatar messages with names (search ALL avatars)
      const allAvatarList = Object.values(AVATARS);
      const enrichedMessages = msgs.map(m => {
        const avatar = m.avatarId ? allAvatarList.find(a => a.id === m.avatarId) : null;
        return {
          ...m,
          avatarName: avatar?.name || null,
          specialty: avatar?.specialty || null,
          isUser: !!m.userId,
        };
      });

      res.json({
        session: sessions[0],
        messages: enrichedMessages,
      });
    } catch (err) {
      res.status(500).json({ error: "获取会话详情失败" });
    }
  });
}
