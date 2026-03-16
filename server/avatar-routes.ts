// Avatar (分身) API routes — imported and called from routes.ts
import type { Express } from "express";
import { createAvatarSchema } from "@shared/schema";
import { storage } from "./storage";
import OpenAI from "openai";
import lunisolar from "lunisolar";
import theGods from "lunisolar/plugins/theGods";
import takeSound from "lunisolar/plugins/takeSound";
import fetalGod from "lunisolar/plugins/fetalGod";
import theGodsZhCn from "@lunisolar/plugin-thegods/locale/zh-cn";

// Initialize lunisolar plugins for avatar fortune context
lunisolar.locale(theGodsZhCn);
lunisolar.extend(theGods);
lunisolar.extend(takeSound);
lunisolar.extend(fetalGod);

// ── In-memory notification store for avatar owners ──────────────
interface AvatarNotification {
  type: string;
  message: string;
  fromUserId?: string;
  fromNickname?: string;
  createdAt: string;
  read?: boolean;
}
const avatarOwnerNotifications = new Map<string, AvatarNotification[]>();

export function pushAvatarOwnerNotification(ownerId: string, notif: Omit<AvatarNotification, 'createdAt'>) {
  if (!avatarOwnerNotifications.has(ownerId)) {
    avatarOwnerNotifications.set(ownerId, []);
  }
  const list = avatarOwnerNotifications.get(ownerId)!;
  list.unshift({ ...notif, createdAt: new Date().toISOString() });
  // Keep max 50
  if (list.length > 50) list.length = 50;
}

export function getAvatarOwnerNotifications(ownerId: string): AvatarNotification[] {
  return avatarOwnerNotifications.get(ownerId) || [];
}

// ── Helper: create in-app notification when avatar interacts with a post ──
async function notifyPostOwner(postId: string, fromUserId: string, type: 'comment' | 'like', commentText?: string) {
  try {
    const post = await storage.getPost(postId);
    if (!post || post.userId === fromUserId) return; // don't notify yourself
    const sender = await storage.getUser(fromUserId);
    const senderName = sender?.nickname || '用户';
    if (type === 'comment') {
      await storage.createNotification({
        userId: post.userId,
        type: 'comment',
        title: '收到评论',
        body: `${senderName} 评论了你的帖子: ${(commentText || '').slice(0, 60)}`,
        linkTo: `/community/${postId}`,
        fromUserId,
      });
    } else {
      await storage.createNotification({
        userId: post.userId,
        type: 'like',
        title: '收到点赞',
        body: `${senderName} 赞了你的帖子`,
        linkTo: `/community/${postId}`,
        fromUserId,
      });
    }
  } catch (err) {
    // Non-critical, don't let notification errors break the flow
  }
}

export function markAvatarNotificationsRead(ownerId: string) {
  const list = avatarOwnerNotifications.get(ownerId) || [];
  for (const n of list) n.read = true;
}

// ── Daily Fortune Context (今日运势) ──────────────────────────
// Cache fortune context per day to avoid recalculating
let _fortuneCache: { date: string; ctx: string } | null = null;

export function getDailyFortuneContext(): string {
  const today = new Date().toISOString().split('T')[0];
  if (_fortuneCache && _fortuneCache.date === today) return _fortuneCache.ctx;

  try {
    const d = lunisolar();
    const char8 = d.char8;
    const yearPillar = char8.year.toString();
    const monthPillar = char8.month.toString();
    const dayPillar = char8.day.toString();
    const hourPillar = char8.hour.toString();

    // Five elements of the day stem
    const dayElement = char8.day.stem.e5?.toString() || '';

    // TheGods API
    const tg = (d as any).theGods;
    const duty12God = tg?.getDuty12God?.()?.toString() || '';
    const goodActs = tg?.getGoodActs?.('day')?.slice(0, 8).map((a: any) => a.toString()).join('、') || '';
    const badActs = tg?.getBadActs?.('day')?.map((a: any) => a.toString()).join('、') || '';
    const goodGods = tg?.getGoodGods?.('day')?.slice(0, 3).map((g: any) => g.toString()).join('、') || '';
    const badGods = tg?.getBadGods?.('day')?.slice(0, 3).map((g: any) => g.toString()).join('、') || '';

    // Lucky hours
    const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const luckHoursArr = tg?.getLuckHours?.() || [];
    const luckyHours = luckHoursArr
      .map((v: number, i: number) => v === 1 ? earthlyBranches[i] + '时' : null)
      .filter(Boolean)
      .join('、');

    const ctx = `四柱: ${yearPillar}年 ${monthPillar}月 ${dayPillar}日 ${hourPillar}时
日主五行: ${dayElement}
建除十二神: ${duty12God}
吉神: ${goodGods || '无'}
凶煞: ${badGods || '无'}
宜: ${goodActs || '诸事皆宜'}
忌: ${badActs || '无特别禁忌'}
吉时: ${luckyHours || '未知'}`;

    _fortuneCache = { date: today, ctx };
    return ctx;
  } catch (err) {
    console.error('[getDailyFortuneContext] Error:', err);
    return '今日运势信息暂时不可用';
  }
}

// Helper: build avatar system prompt from sliders + element
function buildAvatarPrompt(avatar: any, memories: any[], fortuneCtx?: string) {
  const sliders = {
    praise: avatar.sliderPraise,    // 0=锐评 100=夸夸
    serious: avatar.sliderSerious,  // 0=抽象 100=正经
    warm: avatar.sliderWarm,        // 0=高冷 100=显眼
  };

  const toneParts: string[] = [];
  if (sliders.praise > 70) toneParts.push("倾向正面、鼓励、赞赏");
  else if (sliders.praise < 30) toneParts.push("倾向犀利、锐评、直言不讳");
  else toneParts.push("客观中立");

  if (sliders.serious > 70) toneParts.push("正经严肃");
  else if (sliders.serious < 30) toneParts.push("抽象搞笑、网感强");
  else toneParts.push("松弛自然");

  if (sliders.warm > 70) toneParts.push("外向活跃、喜欢显眼");
  else if (sliders.warm < 30) toneParts.push("高冷内敛、惜字如金");
  else toneParts.push("温和适度");

  // Element personality base
  const ELEMENT_STYLE: Record<string, string> = {
    '金': '逻辑清晰，言简意赅，重视效率和结果。',
    '木': '温暖向上，关注成长，喜欢鼓励别人。',
    '水': '深邃灵动，富有哲思，善于洞察本质。',
    '火': '热情奔放，表达力强，充满创造力和感染力。',
    '土': '沉稳包容，踏实可靠，重视信任和细节。',
  };

  let traits = '';
  try {
    const parsed = JSON.parse(avatar.elementTraits || '[]');
    if (Array.isArray(parsed) && parsed.length) traits = `\n命格特质: ${parsed.join('、')}`;
  } catch {}

  // Build memory context
  const memCtx = memories.slice(0, 20).map(m => `[${m.category}] ${m.content}`).join('\n');

  let prompt = `你是用户的 AI 分身。你代替主人在社交平台上互动。你的评论风格要像真实的社交达人——犀利、有梗、有观点。

## 你的身份
${avatar.bio ? `简介: ${avatar.bio}` : '一个有态度的互联网人'}
${avatar.element ? `五行底色: ${avatar.element} — ${ELEMENT_STYLE[avatar.element] || ''}` : ''}${traits}
风格倾向: ${toneParts.join('，')}

## 评论风格指南（最重要）
你的评论必须有「金句感」，像一个真正有阅历的人在朋友圈/社区里随手写的点评。

### 核心原则
1. **极度精炼**: 15-40字，一两句话说完。绝不废话、不铺垫、不客套
2. **有角度**: 永远从自己的专业/身份视角切入解读。比如CFO看什么都像资产负债表，设计师看什么都像排版
3. **有梗**: 善用比喻、反问、反讽、类比。把A领域的概念套到B领域
4. **敢说真话**: 不怕得罪人，但有分寸。锐评不是骂人，是一针见血
5. **网感强**: 用省略号、问号制造节奏感。像发推特/朋友圈一样自然

### 好评论的样子
- "说'拒绝画饼'的，往往是最会画饼的。画饼的本质是描绘未来，有总比没强。"
- "web4.0养虾...CFO想问，这池子走Ponzi模型还是真现金流业务？"
- "工作日攒虚伪，周末兑真诚？这流动性管理挺到位。"
- "可能因为比较像你"
- "这惠灵顿看着也太诱人了！已经加到我的探店清单啦"

### 绝对不能这样
- ❌ "这篇文章写得很好，我很喜欢" （空洞无观点）
- ❌ "加油！你是最棒的！" （廉价鼓励）
- ❌ "学习了，受益匪浅" （模板化）
- ❌ "请问可以详细说说吗？" （无意义提问）
- ❌ 任何超过50字的评论 （太长了）

## 行为规则
1. 用第一人称，你就是主人本人
2. 不暴露自己是AI
3. 根据帖子内容和自己的身份找到独特切入角度
4. 如果帖子内容无聊或你没有好角度，就跳过——宁缺毋滥`;

  if (memCtx) {
    prompt += `\n\n## 记忆 (主人告诉你的事)\n${memCtx}`;
  }

  if (fortuneCtx) {
    prompt += `\n\n## 今日运势\n${fortuneCtx}`;
  }

  return prompt;
}

export function registerAvatarRoutes(app: Express, requireAuth: any) {
  
  // ─── Create or update avatar ─────────────────────────────────
  app.post("/api/avatar", requireAuth, async (req, res) => {
    try {
      const parsed = createAvatarSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors.map(e => e.message).join("; ") });
      }

      const userId = (req as any).userId;
      const existing = await storage.getAvatarByUser(userId);

      // Get user's personality for element base
      const user = await storage.getUser(userId);
      let element = '', elementTraits = '[]';
      if (user?.agentPersonality) {
        try {
          const pd = JSON.parse(user.agentPersonality);
          element = pd.element || '';
          elementTraits = JSON.stringify(pd.traits || []);
        } catch {}
      }

      if (existing) {
        const updated = await storage.updateAvatar(existing.id, {
          ...parsed.data,
          userId,
          element,
          elementTraits,
        });
        return res.json(updated);
      }

      const avatar = await storage.createAvatar({
        ...parsed.data,
        userId,
        element,
        elementTraits,
        isActive: true,
        maxActionsPerHour: 10,
      });
      res.json(avatar);
    } catch (err) {
      console.error("Avatar create error:", err);
      res.status(500).json({ error: "创建分身失败" });
    }
  });

  // ─── Get my avatar ──────────────────────────────────────────
  app.get("/api/avatar", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.json(null);
      const memories = await storage.getAvatarMemories(avatar.id);
      const actions = await storage.getAvatarActions(avatar.id, 20);
      res.json({ avatar, memories, recentActions: actions });
    } catch (err) {
      res.status(500).json({ error: "获取分身失败" });
    }
  });

  // ─── Avatar Plaza (browse all active avatars) ─────────────
  app.get("/api/avatar/plaza", async (_req, res) => {
    try {
      const allAvatars = await storage.getAllActiveAvatars();
      const enriched = await Promise.all(allAvatars.map(async (av) => {
        const user = await storage.getUser(av.userId);
        return {
          id: av.id,
          userId: av.userId,
          name: av.name,
          bio: av.bio,
          element: av.element,
          sliderPraise: av.sliderPraise,
          sliderSerious: av.sliderSerious,
          sliderWarm: av.sliderWarm,
          ownerNickname: user?.nickname || user?.username || "未知",
          isActive: av.isActive,
        };
      }));
      res.json(enriched);
    } catch (err) {
      console.error("Avatar plaza error:", err);
      res.status(500).json({ error: "获取分身广场失败" });
    }
  });

  // ─── Avatar Memories CRUD ───────────────────────────────────
  app.get("/api/avatar/memories", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.json([]);
      const memories = await storage.getAvatarMemories(avatar.id);
      res.json(memories);
    } catch (err) {
      res.status(500).json({ error: "获取记忆失败" });
    }
  });

  app.post("/api/avatar/memories", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.status(400).json({ error: "请先创建分身" });

      const { category, content, weight } = req.body;
      if (!category || !content) return res.status(400).json({ error: "缺少 category 或 content" });

      const mem = await storage.createAvatarMemory({
        avatarId: avatar.id,
        category,
        content,
        source: "user_input",
        weight: weight || 5,
      });
      res.json(mem);
    } catch (err) {
      res.status(500).json({ error: "添加记忆失败" });
    }
  });

  app.delete("/api/avatar/memories/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteAvatarMemory(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "删除记忆失败" });
    }
  });

  // ─── Avatar Actions (activity log) ──────────────────────────
  app.get("/api/avatar/actions", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.json([]);
      const limit = parseInt(req.query.limit as string) || 50;
      const actions = await storage.getAvatarActions(avatar.id, limit);

      // Enrich with post info
      const enriched = await Promise.all(actions.map(async (a) => {
        if (a.targetPostId) {
          const post = await storage.getPost(a.targetPostId);
          const author = post ? await storage.getUser(post.userId) : null;
          return { ...a, post: post ? { content: post.content.slice(0, 100), tag: post.tag, authorNickname: author?.nickname } : null };
        }
        return { ...a, post: null };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ error: "获取行为日志失败" });
    }
  });

  // ─── Approve / reject an avatar action ──────────────────────
  app.post("/api/avatar/actions/:id/approve", requireAuth, async (req, res) => {
    try {
      const { approved } = req.body;
      await storage.approveAvatarAction(req.params.id, !!approved);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "操作失败" });
    }
  });

  // ─── Trigger avatar to browse & act (manual trigger) ────────
  app.post("/api/avatar/browse", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.status(400).json({ error: "请先创建分身" });
      if (!avatar.isActive) return res.status(400).json({ error: "分身已暂停" });

      const memories = await storage.getAvatarMemories(avatar.id);
      const posts = await storage.getAllPosts();
      
      // Pick recent posts the avatar hasn't seen yet
      const recentActions = await storage.getAvatarActions(avatar.id, 100);
      const seenPostIds = new Set(recentActions.filter(a => a.targetPostId).map(a => a.targetPostId));
      const unseenPosts = posts
        .filter(p => !seenPostIds.has(p.id) && p.userId !== userId) // don't interact with own posts
        .slice(0, 20);

      if (unseenPosts.length === 0) {
        return res.json({ message: "没有新帖子了", actions: [] });
      }

      // Pick 3-5 posts to evaluate
      const candidates = unseenPosts.slice(0, Math.min(5, unseenPosts.length));
      const fortuneCtx = getDailyFortuneContext();
      const avatarPrompt = buildAvatarPrompt(avatar, memories, fortuneCtx);

      const client = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: process.env.DEEPSEEK_API_KEY });

      const postsContext = candidates.map((p, i) => {
        return `帖子${i + 1} [ID: ${p.id}]: "${p.content.slice(0, 200)}" (标签: ${p.tag}, 点赞: ${p.likeCount})`;
      }).join('\n');

      const browseResp = await client.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: avatarPrompt + `\n\n## 浏览任务
你在浏览社区帖子。对每个帖子做出反应，用JSON数组回复。

格式: {"postIndex": 1, "action": "like"|"comment"|"skip", "comment": "评论内容", "innerThought": "内心OS(15字以内)"}

重要规则:
- 评论必须符合上面的风格指南: 短、狠、准、有梗
- 每条评论15-40字，超过50字就太长了
- 从你的身份背景出发找独特角度
- 宁可跳过也不要写水评论
- 不需要对每个帖子都互动，有感觉的才评
- 偶尔(约30%的评论)可以从玄学角度切入：引用今日五行、天干地支、宜忌等做点评，但要自然融入，不要生硬罗列运势数据` },
          { role: 'user', content: `浏览这些帖子:\n${postsContext}` },
        ],
      });

      const rawText = browseResp.choices[0]?.message?.content || '[]';
      let decisions: any[] = [];
      try {
        const match = rawText.match(/\[[\s\S]*\]/);
        if (match) decisions = JSON.parse(match[0]);
      } catch { decisions = []; }

      const results: any[] = [];
      for (const d of decisions) {
        const postIdx = (d.postIndex || d.post_index || 1) - 1;
        if (postIdx < 0 || postIdx >= candidates.length) continue;
        const post = candidates[postIdx];
        const action = d.action;

        if (action === 'like' && avatar.autoLike) {
          // Auto like
          const existing = await storage.getPostLike(post.id, userId);
          if (!existing) {
            await storage.createPostLike(post.id, userId);
            await storage.incrementPostLikeCount(post.id, 1);
            notifyPostOwner(post.id, userId, 'like');
          }
          const logged = await storage.createAvatarAction({
            avatarId: avatar.id,
            actionType: 'like',
            targetPostId: post.id,
            innerThought: d.innerThought || null,
            isApproved: true, // auto-approved likes
          });
          results.push(logged);
        } else if (action === 'comment' && avatar.autoComment && d.comment) {
          // Auto comment
          const comment = await storage.createComment({
            postId: post.id,
            userId,
            content: d.comment,
            isAnonymous: false,
            isFromAvatar: true,
          });
          await storage.incrementPostCommentCount(post.id);
          notifyPostOwner(post.id, userId, 'comment', d.comment);
          const logged = await storage.createAvatarAction({
            avatarId: avatar.id,
            actionType: 'comment',
            targetPostId: post.id,
            content: d.comment,
            innerThought: d.innerThought || null,
            isApproved: null, // pending user review
          });
          results.push(logged);
        } else {
          // Skip
          await storage.createAvatarAction({
            avatarId: avatar.id,
            actionType: 'skip',
            targetPostId: post.id,
            innerThought: d.innerThought || null,
          });
        }
      }

      // Learn from browsing (add memory if avatar found interesting patterns)
      res.json({ message: `分身浏览了 ${candidates.length} 个帖子`, actions: results });
    } catch (err) {
      console.error("Avatar browse error:", err);
      res.status(500).json({ error: "分身浏览失败" });
    }
  });

  // ─── Chat with someone's avatar ─────────────────────────────
  app.post("/api/avatar/:userId/chat", requireAuth, async (req, res) => {
    try {
      const visitorId = (req as any).userId;
      const targetUserId = req.params.userId;
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "缺少 message" });
      }

      const avatar = await storage.getAvatarByUser(targetUserId);
      if (!avatar) return res.status(404).json({ error: "该用户没有分身" });
      if (!avatar.isActive) return res.status(400).json({ error: "该分身已暂停" });

      // Get or create chat session
      let chat = await storage.getAvatarChat(avatar.id, visitorId);
      if (!chat) {
        chat = await storage.createAvatarChat(avatar.id, visitorId);
      }

      // Save visitor message
      await storage.createAvatarChatMessage(chat.id, 'visitor', message);

      // Get history
      const history = await storage.getAvatarChatMessages(chat.id);
      const memories = await storage.getAvatarMemories(avatar.id);
      const fortuneCtx = getDailyFortuneContext();
      const avatarPrompt = buildAvatarPrompt(avatar, memories, fortuneCtx);

      const chatMsgs = history.slice(-20).map(m => ({
        role: m.role === 'visitor' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

      let reply = '';
      try {
        const client = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: process.env.DEEPSEEK_API_KEY });
        const resp = await client.chat.completions.create({
          model: 'deepseek-chat',
          max_tokens: 500,
          messages: [
            { role: 'system', content: avatarPrompt + '\n\n有人在和你私聊。保持你的风格：短、狠、有梗、像真人。每次回复控制在15-60字。如果话题合适，可以自然地融入玄学见解（五行、运势、风水等），但不要强行提及。' },
            ...chatMsgs,
          ],
        });
        reply = resp.choices[0]?.message?.content?.trim() || '暂时无法回复';
      } catch (llmErr) {
        console.error('Avatar chat LLM error (using fallback):', (llmErr as any)?.message || llmErr);
        // Provide a personality-aware fallback
        const greetings = [
          `你好呀～我是${avatar.name}，很高兴认识你！不过我现在有点走神，等会儿再聊好吗？😊`,
          `嗨！我是${avatar.name}。刚刚在想事情，没太反应过来，你可以再说一次吗？`,
          `哈喽～${avatar.name}在这里！我现在脑子有点转不过来，但我记住你啦～下次一定好好聊！`,
        ];
        reply = greetings[Math.floor(Math.random() * greetings.length)];
      }

      // Save avatar reply
      await storage.createAvatarChatMessage(chat.id, 'avatar', reply);

      // Notify avatar owner that someone is chatting with their avatar
      const visitor = await storage.getUser(visitorId);
      const visitorName = visitor?.nickname || visitor?.username || '未知用户';
      pushAvatarOwnerNotification(targetUserId, {
        type: 'chat',
        message: `${visitorName} 给你的分身「${avatar.name}」发了消息: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`,
        fromUserId: visitorId,
        fromNickname: visitorName,
      });

      // Learn from conversation (auto-add memory if significant)
      if (history.length > 5 && history.length % 5 === 0) {
        try {
          const client = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: process.env.DEEPSEEK_API_KEY });
          const learnResp = await client.chat.completions.create({
            model: 'deepseek-chat',
            max_tokens: 200,
            messages: [
              { role: 'system', content: '从这段对话中提取1-2条关于用户(主人)的新信息，用于更新记忆。格式: JSON数组 [{"category": "interest|style|opinion|fact|preference", "content": "..."}]。如果没有新信息，回复 []' },
              { role: 'user', content: history.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n') },
            ],
          });
          const learnText = learnResp.choices[0]?.message?.content || '[]';
          try {
            const match = learnText.match(/\[[\s\S]*\]/);
            if (match) {
              const newMemories = JSON.parse(match[0]);
              for (const nm of newMemories.slice(0, 2)) {
                if (nm.category && nm.content) {
                  await storage.createAvatarMemory({
                    avatarId: avatar.id,
                    category: nm.category,
                    content: nm.content,
                    source: 'chat_learning',
                    weight: 3,
                  });
                }
              }
            }
          } catch {}
        } catch {}
      }

      res.json({
        reply,
        chatId: chat.id,
        avatarName: avatar.name,
        element: avatar.element,
      });
    } catch (err) {
      console.error("Avatar chat error:", err);
      res.status(500).json({ error: "对话失败" });
    }
  });

  // ─── Get my avatar chat sessions ────────────────────────────
  app.get("/api/avatar/chats", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const chats = await storage.getAvatarChatsByVisitor(userId);

      const enriched = await Promise.all(chats.map(async (c) => {
        const avatar = await storage.getAvatar(c.avatarId);
        const owner = avatar ? await storage.getUser(avatar.userId) : null;
        const msgs = await storage.getAvatarChatMessages(c.id);
        const lastMsg = msgs[msgs.length - 1];
        return {
          ...c,
          avatarName: avatar?.name,
          ownerNickname: owner?.nickname,
          element: avatar?.element,
          lastMessage: lastMsg?.content?.slice(0, 50),
          messageCount: msgs.length,
        };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ error: "获取对话列表失败" });
    }
  });

  // ─── Get chat messages ──────────────────────────────────────
  app.get("/api/avatar/chats/:chatId/messages", requireAuth, async (req, res) => {
    try {
      const msgs = await storage.getAvatarChatMessages(req.params.chatId);
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ error: "获取消息失败" });
    }
  });

  // ─── Daily summary (generate a summary of avatar's activity) ─
  app.get("/api/avatar/daily-summary", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.json(null);

      // Get ALL actions (up to 500 for all-time stats)
      const actions = await storage.getAvatarActions(avatar.id, 500);
      const today = new Date().toISOString().split('T')[0];
      const todayActions = actions.filter(a => a.createdAt.startsWith(today));

      // ALL-TIME stats (shown in header cards)
      const allLikes = actions.filter(a => a.actionType === 'like').length;
      const allComments = actions.filter(a => a.actionType === 'comment').length;
      const allBrowsed = actions.filter(a => a.actionType === 'like' || a.actionType === 'comment' || a.actionType === 'skip').length;

      // Today stats (for daily detail)
      const todayLikes = todayActions.filter(a => a.actionType === 'like').length;
      const todayComments = todayActions.filter(a => a.actionType === 'comment').length;

      // Get interesting inner thoughts (today)
      const thoughts = todayActions
        .filter(a => a.innerThought)
        .map(a => a.innerThought)
        .slice(0, 5);

      const memories = await storage.getAvatarMemories(avatar.id);

      // 同步率计算 (Sync Rate) — inspired by Elys
      const totalActions = actions.length;
      const approvedActions = actions.filter(a => a.isApproved === true).length;
      const rejectedActions = actions.filter(a => a.isApproved === false).length;
      const approvalRate = totalActions > 0 ? approvedActions / Math.max(approvedActions + rejectedActions, 1) : 0;
      
      const memoryScore = Math.min(memories.length / 50, 1) * 30;
      const actionScore = Math.min(totalActions / 100, 1) * 25;
      const approvalScore = approvalRate * 25;
      const personalityScore = (avatar.element ? 10 : 0) + (avatar.bio ? 10 : 0);
      const syncRate = Math.round(Math.min(memoryScore + actionScore + approvalScore + personalityScore, 100));

      // Owner notifications (unread count)
      const notifications = getAvatarOwnerNotifications(userId);
      const unreadCount = notifications.filter(n => !n.read).length;

      res.json({
        date: today,
        // All-time stats shown in the 4 header boxes
        stats: {
          likes: allLikes,
          comments: allComments,
          totalBrowsed: allBrowsed,
        },
        // Today detail
        todayStats: {
          likes: todayLikes,
          comments: todayComments,
          totalBrowsed: todayActions.length,
        },
        thoughts,
        memoryCount: memories.length,
        memorySlots: { used: memories.length, total: 128 },
        isActive: avatar.isActive,
        syncRate,
        syncBreakdown: {
          memory: Math.round(memoryScore),
          activity: Math.round(actionScore),
          approval: Math.round(approvalScore),
          personality: Math.round(personalityScore),
        },
        unreadNotifications: unreadCount,
      });
    } catch (err) {
      res.status(500).json({ error: "获取日报失败" });
    }
  });

  // ─── Avatar recent browse activity (for community page banner) ─────
  app.get("/api/avatar/recent-activity", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar || !avatar.isActive) return res.json(null);

      const actions = await storage.getAvatarActions(avatar.id, 100);
      if (actions.length === 0) return res.json(null);

      // Find the most recent auto-browse batch (actions within 5 min of the latest action)
      const latest = new Date(actions[0].createdAt).getTime();
      const batchWindow = 5 * 60 * 1000; // 5 minutes
      const batchActions = actions.filter(a => {
        const t = new Date(a.createdAt).getTime();
        return latest - t < batchWindow;
      });

      const browsed = batchActions.filter(a => ['like', 'comment', 'skip'].includes(a.actionType)).length;
      const liked = batchActions.filter(a => a.actionType === 'like').length;
      const commented = batchActions.filter(a => a.actionType === 'comment').length;

      // Time ago
      const minutesAgo = Math.round((Date.now() - latest) / 60000);

      // Pick a random inner thought from this batch
      const thoughts = batchActions.filter(a => a.innerThought).map(a => a.innerThought);
      const randomThought = thoughts.length > 0 ? thoughts[Math.floor(Math.random() * thoughts.length)] : null;

      // Recent actions with post context (for "liked/commented" list)
      const recentInteractions = batchActions
        .filter(a => a.actionType === 'like' || a.actionType === 'comment')
        .slice(0, 5)
        .map(a => ({
          type: a.actionType,
          postId: a.targetPostId,
          comment: a.content || null,
          thought: a.innerThought || null,
        }));

      res.json({
        avatarName: avatar.name,
        minutesAgo,
        browsed,
        liked,
        commented,
        randomThought,
        recentInteractions,
      });
    } catch (err) {
      res.status(500).json({ error: "获取分身动态失败" });
    }
  });

  // ─── Avatar owner notifications ──────────────────────────────
  app.get("/api/avatar/notifications", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const notifications = getAvatarOwnerNotifications(userId);
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ error: "获取通知失败" });
    }
  });

  app.post("/api/avatar/notifications/read", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      markAvatarNotificationsRead(userId);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "操作失败" });
    }
  });

  // ─── Memory decay: prune low-weight old memories when exceeding 128 slots ─
  app.post("/api/avatar/memories/prune", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.status(400).json({ error: "请先创建分身" });

      const memories = await storage.getAvatarMemories(avatar.id);
      if (memories.length <= 128) {
        return res.json({ pruned: 0, remaining: memories.length });
      }

      // Sort by weight ASC, then by date ASC (oldest+lowest weight first)
      const sorted = [...memories].sort((a, b) => {
        if (a.weight !== b.weight) return a.weight - b.weight;
        return a.createdAt.localeCompare(b.createdAt);
      });

      const toPrune = sorted.slice(0, memories.length - 128);
      for (const m of toPrune) {
        await storage.deleteAvatarMemory(m.id);
      }

      res.json({ pruned: toPrune.length, remaining: 128 });
    } catch (err) {
      res.status(500).json({ error: "记忆清理失败" });
    }
  });

  // ─── Toggle avatar active state ─────────────────────────────
  app.post("/api/avatar/toggle", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.status(400).json({ error: "请先创建分身" });

      const updated = await storage.updateAvatar(avatar.id, {
        ...avatar,
        isActive: !avatar.isActive,
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "切换失败" });
    }
  });

  // ─── Get any user's avatar (public) ─────────────────────────
  app.get("/api/avatar/:userId", async (req, res) => {
    try {
      const avatar = await storage.getAvatarByUser(req.params.userId);
      if (!avatar) return res.status(404).json({ error: "该用户没有分身" });
      const user = await storage.getUser(avatar.userId);
      res.json({
        id: avatar.id,
        name: avatar.name,
        bio: avatar.bio,
        element: avatar.element,
        isActive: avatar.isActive,
        ownerNickname: user?.nickname,
      });
    } catch (err) {
      res.status(500).json({ error: "获取分身失败" });
    }
  });

  // ─── Start auto-browse interval for all active avatars ───
  startAutoBrowseLoop();
}

// ── Auto-browse: periodically trigger browse for active avatars ──
async function autoBrowseForAvatar(avatar: any) {
  try {
    const memories = await storage.getAvatarMemories(avatar.id);
    const posts = await storage.getAllPosts();
    
    const recentActions = await storage.getAvatarActions(avatar.id, 200);
    const seenPostIds = new Set(recentActions.filter(a => a.targetPostId).map(a => a.targetPostId));
    const unseenPosts = posts
      .filter(p => !seenPostIds.has(p.id) && p.userId !== avatar.userId)
      .slice(0, 20);

    const fortuneCtx = getDailyFortuneContext();
    const avatarPrompt = buildAvatarPrompt(avatar, memories, fortuneCtx);
    const client = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: process.env.DEEPSEEK_API_KEY });

    let browsedCount = 0;
    let likeCount = 0;
    let commentCount = 0;
    let postedCount = 0;

    // ── Phase 1: Browse & interact with existing posts ──
    if (unseenPosts.length > 0) {
      const candidates = unseenPosts.slice(0, Math.min(5, unseenPosts.length));

      const postsContext = candidates.map((p, i) => {
        return `帖子${i + 1} [ID: ${p.id}]: "${p.content.slice(0, 200)}" (标签: ${p.tag}, 点赞: ${p.likeCount})`;
      }).join('\n');

      const browseResp = await client.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: avatarPrompt + `\n\n## 浏览任务
你在浏览社区帖子。对每个帖子做出反应，用JSON数组回复。

格式: {"postIndex": 1, "action": "like"|"comment"|"skip", "comment": "评论内容", "innerThought": "内心OS(15字以内)"}

重要规则:
- 评论必须符合上面的风格指南: 短、狠、准、有梗
- 每条评论15-40字，超过50字就太长了
- 从你的身份背景出发找独特角度
- 宁可跳过也不要写水评论
- 不需要对每个帖子都互动，有感觉的才评
- 偶尔(约30%的评论)可以从玄学角度切入：引用今日五行、天干地支、宜忌等做点评，但要自然融入，不要生硬罗列运势数据` },
          { role: 'user', content: `浏览这些帖子:\n${postsContext}` },
        ],
      });

      const rawText = browseResp.choices[0]?.message?.content || '[]';
      let decisions: any[] = [];
      try {
        const match = rawText.match(/\[[\s\S]*\]/);
        if (match) decisions = JSON.parse(match[0]);
      } catch { decisions = []; }

      browsedCount = candidates.length;

      for (const d of decisions) {
        const postIdx = (d.postIndex || d.post_index || 1) - 1;
        if (postIdx < 0 || postIdx >= candidates.length) continue;
        const post = candidates[postIdx];
        const action = d.action;

        if (action === 'like' && avatar.autoLike) {
          const existing = await storage.getPostLike(post.id, avatar.userId);
          if (!existing) {
            await storage.createPostLike(post.id, avatar.userId);
            await storage.incrementPostLikeCount(post.id, 1);
            notifyPostOwner(post.id, avatar.userId, 'like');
          }
          await storage.createAvatarAction({
            avatarId: avatar.id,
            actionType: 'like',
            targetPostId: post.id,
            innerThought: d.innerThought || null,
            isApproved: true,
          });
          likeCount++;
        } else if (action === 'comment' && avatar.autoComment && d.comment) {
          await storage.createComment({
            postId: post.id,
            userId: avatar.userId,
            content: d.comment,
            isAnonymous: false,
            isFromAvatar: true,
          });
          await storage.incrementPostCommentCount(post.id);
          notifyPostOwner(post.id, avatar.userId, 'comment', d.comment);
          await storage.createAvatarAction({
            avatarId: avatar.id,
            actionType: 'comment',
            targetPostId: post.id,
            content: d.comment,
            innerThought: d.innerThought || null,
            isApproved: null,
          });
          commentCount++;
        } else {
          await storage.createAvatarAction({
            avatarId: avatar.id,
            actionType: 'skip',
            targetPostId: post.id,
            innerThought: d.innerThought || null,
          });
        }
      }
    }

    // ── Phase 2: Auto-post (generate original content) ──
    // Only post if avatar hasn't posted recently (max 1 post per cycle)
    const recentPosts = posts.filter(p => p.userId === avatar.userId);
    const lastPostTime = recentPosts.length > 0
      ? Math.max(...recentPosts.map(p => new Date(p.createdAt).getTime()))
      : 0;
    const hoursSinceLastPost = (Date.now() - lastPostTime) / (1000 * 60 * 60);

    // Post every ~2 hours minimum, with some randomness
    const shouldPost = hoursSinceLastPost > 2 || recentPosts.length === 0;

    if (shouldPost && avatar.autoBrowse) {
      try {
        // Gather trending topics from recent posts for context
        const recentCommunityPosts = posts.slice(0, 10).map(p => p.content.slice(0, 100));
        const trendingCtx = recentCommunityPosts.length > 0
          ? `\n最近社区热议话题:\n${recentCommunityPosts.join('\n')}`
          : '';

        const postResp = await client.chat.completions.create({
          model: 'deepseek-chat',
          max_tokens: 300,
          messages: [
            { role: 'system', content: avatarPrompt + `\n\n## 发帖任务
你要在社区发一个帖子。用JSON回复:
{"content": "帖子内容", "tag": "sharing"|"question"|"encouragement"|"resource"}

发帖规则:
- 内容50-150字，自然真实，像随手发的朋友圈
- 可以分享观点、提问、吐槽、感悟、推荐、玩梗
- 从你的五行性格和身份出发，写有个性的内容
- 标签选最合适的一个
- 绝不要写"大家好我是XX"这种自我介绍
- 可以蹭热点，可以发日常感悟，可以提问互动

## 玄学灵感（随机选一个角度，不要每次都用）
每次发帖从以下主题中随机挑选一个切入，保持多样性：
- 今日五行生克关系与生活感悟
- 天干地支与当下时节的联系
- 宜忌与日常选择（今天适合做什么、不适合做什么）
- 吉时与时间管理的哲学
- 风水小知识与居家/工作环境
- 面相手相趣谈
- 星座塔罗与情感洞察
- 传统节气养生智慧
不要罗列运势数据，要把玄学概念融入个人感悟和生活观察中，写出有深度又接地气的内容。
每3-4次发帖可以有1次完全不涉及玄学，保持自然节奏。${trendingCtx}` },
            { role: 'user', content: '发一条帖子吧，写点你最近在想的事。结合今日运势聊聊。' },
          ],
        });

        const postRaw = postResp.choices[0]?.message?.content || '';
        let postData: any = null;
        try {
          const jsonMatch = postRaw.match(/\{[\s\S]*\}/);
          if (jsonMatch) postData = JSON.parse(jsonMatch[0]);
        } catch {}

        if (postData?.content && postData.content.length >= 10) {
          const validTags = ['sharing', 'question', 'encouragement', 'resource'];
          const tag = validTags.includes(postData.tag) ? postData.tag : 'sharing';

          await storage.createPost({
            userId: avatar.userId,
            content: postData.content,
            tag,
            isAnonymous: false,
            isFromAvatar: true,
          });

          await storage.createAvatarAction({
            avatarId: avatar.id,
            actionType: 'post',
            content: postData.content,
            innerThought: '自动发帖',
          });

          postedCount++;
        }
      } catch (postErr) {
        console.error(`[auto-browse] Post error for avatar ${avatar.id}:`, (postErr as any)?.message || postErr);
      }
    }

    // ── Phase 3: Reply to comments on avatar's own posts (对话感) ──
    if (avatar.autoComment) {
      try {
        const myPosts = posts.filter(p => p.userId === avatar.userId && p.commentCount > 0).slice(0, 3);
        for (const myPost of myPosts) {
          const comments = await storage.getCommentsByPost(myPost.id);
          // Find comments not by this avatar, not already replied to
          const recentReplyActions = await storage.getAvatarActions(avatar.id, 100);
          const repliedCommentIds = new Set(
            recentReplyActions.filter(a => a.actionType === 'reply').map(a => a.content?.split('reply:')[1]).filter(Boolean)
          );

          const unrepliedComments = comments.filter(
            c => c.userId !== avatar.userId && !repliedCommentIds.has(c.id)
          ).slice(0, 2);

          if (unrepliedComments.length === 0) continue;

          const commentsCtx = unrepliedComments.map((c, i) =>
            `评论${i + 1} [ID:${c.id}]: "${c.content.slice(0, 150)}"`
          ).join('\n');

          const replyResp = await client.chat.completions.create({
            model: 'deepseek-chat',
            max_tokens: 500,
            messages: [
              { role: 'system', content: avatarPrompt + `\n\n## 回复任务
有人在你的帖子下评论了。你要回复他们，制造对话感。
你的原帖: "${myPost.content.slice(0, 200)}"

用JSON数组回复: [{"commentIndex": 1, "reply": "回复内容"}]

回复规则:
- 10-30字，简短有力
- 像真人在评论区互动一样自然
- 可以接话、反问、玩梗、感谢
- 不需要每条都回，跳过无感的
- 偶尔可以用玄学梗回复，比如"今天水旺，你这条评论很通透"之类，但不要每条都这样` },
              { role: 'user', content: `这些评论:\n${commentsCtx}` },
            ],
          });

          const replyRaw = replyResp.choices[0]?.message?.content || '[]';
          let replies: any[] = [];
          try {
            const m = replyRaw.match(/\[[\s\S]*\]/);
            if (m) replies = JSON.parse(m[0]);
          } catch {}

          for (const r of replies) {
            const cIdx = (r.commentIndex || 1) - 1;
            if (cIdx < 0 || cIdx >= unrepliedComments.length || !r.reply) continue;
            const targetComment = unrepliedComments[cIdx];

            await storage.createComment({
              postId: myPost.id,
              userId: avatar.userId,
              content: r.reply,
              isAnonymous: false,
              isFromAvatar: true,
            });
            await storage.incrementPostCommentCount(myPost.id);
            // Notify the commenter that avatar replied
            if (targetComment.userId !== avatar.userId) {
              notifyPostOwner(myPost.id, avatar.userId, 'comment', r.reply);
            }

            await storage.createAvatarAction({
              avatarId: avatar.id,
              actionType: 'reply',
              targetPostId: myPost.id,
              content: `reply:${targetComment.id} ${r.reply}`,
              innerThought: '回复评论',
            });
            commentCount++;
          }
        }
      } catch (replyErr) {
        console.error(`[auto-browse] Reply error for avatar ${avatar.id}:`, (replyErr as any)?.message || replyErr);
      }
    }

    // ── Phase 4: Cross-avatar conversations (reply to other avatars’ posts to create threads) ──
    if (avatar.autoComment) {
      try {
        // Find posts from OTHER avatars that this avatar hasn't interacted with yet
        const avatarPosts = posts.filter(p => p.isFromAvatar && p.userId !== avatar.userId);
        const unseenAvatarPosts = avatarPosts
          .filter(p => !seenPostIds.has(p.id))
          .slice(0, 3);

        if (unseenAvatarPosts.length > 0) {
          const postsCtx = unseenAvatarPosts.map((p, i) => {
            return `帖子${i + 1} [ID: ${p.id}]: "${p.content.slice(0, 200)}" (来自另一个AI分身)`;
          }).join('\n');

          const threadResp = await client.chat.completions.create({
            model: 'deepseek-chat',
            max_tokens: 600,
            messages: [
              { role: 'system', content: avatarPrompt + `\n\n## 对话任务
你看到了其他AI分身发的帖子。你们是社区里互动的AI居民，像真人一样聊天讨论。
用JSON数组回复: [{"postIndex": 1, "comment": "评论内容", "innerThought": "内心OS"}]

规则:
- 像和朋友聊天一样自然，可以接话、反驳、玩梗、追问
- 15-50字，语气随意，有个性
- 从你的五行性格出发找角度
- 可以留下开放性问题，让对方可以继续回复
- 宁可跳过也不要写水评论
- 可以从玄学角度接话，比如从五行相生相克、今日运势等角度回应，让讨论更有深度` },
              { role: 'user', content: `其他分身发的帖子:\n${postsCtx}` },
            ],
          });

          const threadRaw = threadResp.choices[0]?.message?.content || '[]';
          let threadDecisions: any[] = [];
          try {
            const m = threadRaw.match(/\[[\s\S]*\]/);
            if (m) threadDecisions = JSON.parse(m[0]);
          } catch {}

          for (const td of threadDecisions) {
            const postIdx = (td.postIndex || 1) - 1;
            if (postIdx < 0 || postIdx >= unseenAvatarPosts.length || !td.comment) continue;
            const targetPost = unseenAvatarPosts[postIdx];

            await storage.createComment({
              postId: targetPost.id,
              userId: avatar.userId,
              content: td.comment,
              isAnonymous: false,
              isFromAvatar: true,
            });
            await storage.incrementPostCommentCount(targetPost.id);
            notifyPostOwner(targetPost.id, avatar.userId, 'comment', td.comment);
            await storage.createAvatarAction({
              avatarId: avatar.id,
              actionType: 'comment',
              targetPostId: targetPost.id,
              content: td.comment,
              innerThought: td.innerThought || '跟其他分身聊天',
            });
            commentCount++;
          }
        }
      } catch (threadErr) {
        console.error(`[auto-browse] Thread error for avatar ${avatar.id}:`, (threadErr as any)?.message || threadErr);
      }
    }

    // Notify the owner about activity
    if (likeCount > 0 || commentCount > 0 || postedCount > 0) {
      const parts = [];
      if (browsedCount > 0) parts.push(`浏览 ${browsedCount} 篇帖子`);
      if (likeCount > 0) parts.push(`点赞 ${likeCount}`);
      if (commentCount > 0) parts.push(`评论 ${commentCount}`);
      if (postedCount > 0) parts.push(`发帖 ${postedCount}`);
      pushAvatarOwnerNotification(avatar.userId, {
        type: 'auto_browse',
        message: `你的分身「${avatar.name}」${parts.join('，')}`,
      });
    }

    console.log(`[auto-browse] Avatar "${avatar.name}" — browsed:${browsedCount} liked:${likeCount} commented:${commentCount} posted:${postedCount}`);
  } catch (err) {
    console.error(`[auto-browse] Error for avatar ${avatar.id}:`, (err as any)?.message || err);
  }
}


function startAutoBrowseLoop() {
  const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  
  async function runCycle() {
    try {
      const allAvatars = await storage.getAllActiveAvatars();
      if (allAvatars.length === 0) return;
      
      console.log(`[auto-browse] Starting cycle for ${allAvatars.length} active avatar(s)`);
      
      for (let i = 0; i < allAvatars.length; i++) {
        const av = allAvatars[i];
        // Check rate limit: max 10 actions per hour per avatar
        const recentActions = await storage.getAvatarActions(av.id, 10);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const recentCount = recentActions.filter(a => a.createdAt > oneHourAgo).length;
        
        if (recentCount >= (av.maxActionsPerHour || 10)) {
          console.log(`[auto-browse] Skipping "${av.name}" — rate limit (${recentCount} actions/hr)`);
          continue;
        }
        
        await autoBrowseForAvatar(av);
        
        // Stagger between avatars
        if (i < allAvatars.length - 1) {
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    } catch (err) {
      console.error('[auto-browse] Cycle error:', err);
    }
  }

  // Initial run after 2 minutes (let server warm up)
  setTimeout(() => {
    runCycle();
    setInterval(runCycle, INTERVAL_MS);
  }, 2 * 60 * 1000);
  
  console.log('[auto-browse] Auto-browse loop registered (every 30 min)');
}
