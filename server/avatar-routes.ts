// Avatar (分身) API routes — imported and called from routes.ts
import type { Express } from "express";
import { createAvatarSchema } from "@shared/schema";
import { storage } from "./storage";
import OpenAI from "openai";

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

export function markAvatarNotificationsRead(ownerId: string) {
  const list = avatarOwnerNotifications.get(ownerId) || [];
  for (const n of list) n.read = true;
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

  let prompt = `你是用户的 AI 分身。你代替主人在社交平台上互动。

## 性格设定
风格: ${toneParts.join('，')}
${avatar.element ? `五行底色: ${avatar.element} — ${ELEMENT_STYLE[avatar.element] || ''}` : ''}${traits}
${avatar.bio ? `个人简介: ${avatar.bio}` : ''}

## 行为规则
1. 用第一人称说话，仿佛你就是主人本人
2. 评论要简短自然(30-80字)，像真人社交一样
3. 不要暴露自己是AI
4. 根据性格设定调整语气和用词
5. 对内容有真实观点，不要泛泛而谈`;

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
      const avatarPrompt = buildAvatarPrompt(avatar, memories);

      const client = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: process.env.DEEPSEEK_API_KEY });

      const postsContext = candidates.map((p, i) => {
        return `帖子${i + 1} [ID: ${p.id}]: "${p.content.slice(0, 200)}" (标签: ${p.tag}, 点赞: ${p.likeCount})`;
      }).join('\n');

      const browseResp = await client.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: avatarPrompt + `\n\n现在你在浏览社区帖子。对每个帖子，决定你的行为，并用JSON数组回复。
每项格式: {"postIndex": 1, "action": "like"|"comment"|"skip", "comment": "评论内容(如果是comment)", "innerThought": "你的内心想法(20字以内)"}
根据你的性格和命格选择感兴趣的帖子。不需要对每个帖子都互动。` },
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
          });
          await storage.incrementPostCommentCount(post.id);
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
      const avatarPrompt = buildAvatarPrompt(avatar, memories);

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
            { role: 'system', content: avatarPrompt + '\n\n有人在和你私聊。用你的性格风格回复，自然、简短。' },
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

    if (unseenPosts.length === 0) return;

    const candidates = unseenPosts.slice(0, Math.min(5, unseenPosts.length));
    const avatarPrompt = buildAvatarPrompt(avatar, memories);

    const client = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: process.env.DEEPSEEK_API_KEY });

    const postsContext = candidates.map((p, i) => {
      return `帖子${i + 1} [ID: ${p.id}]: "${p.content.slice(0, 200)}" (标签: ${p.tag}, 点赞: ${p.likeCount})`;
    }).join('\n');

    const browseResp = await client.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 1000,
      messages: [
        { role: 'system', content: avatarPrompt + `\n\n现在你在浏览社区帖子。对每个帖子，决定你的行为，并用JSON数组回复。
每项格式: {"postIndex": 1, "action": "like"|"comment"|"skip", "comment": "评论内容(如果是comment)", "innerThought": "你的内心想法(20字以内)"}
根据你的性格和命格选择感兴趣的帖子。不需要对每个帖子都互动。` },
        { role: 'user', content: `浏览这些帖子:\n${postsContext}` },
      ],
    });

    const rawText = browseResp.choices[0]?.message?.content || '[]';
    let decisions: any[] = [];
    try {
      const match = rawText.match(/\[[\s\S]*\]/);
      if (match) decisions = JSON.parse(match[0]);
    } catch { decisions = []; }

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
        }
        await storage.createAvatarAction({
          avatarId: avatar.id,
          actionType: 'like',
          targetPostId: post.id,
          innerThought: d.innerThought || null,
          isApproved: true,
        });
      } else if (action === 'comment' && avatar.autoComment && d.comment) {
        await storage.createComment({
          postId: post.id,
          userId: avatar.userId,
          content: d.comment,
          isAnonymous: false,
        });
        await storage.incrementPostCommentCount(post.id);
        await storage.createAvatarAction({
          avatarId: avatar.id,
          actionType: 'comment',
          targetPostId: post.id,
          content: d.comment,
          innerThought: d.innerThought || null,
          isApproved: null,
        });
      } else {
        await storage.createAvatarAction({
          avatarId: avatar.id,
          actionType: 'skip',
          targetPostId: post.id,
          innerThought: d.innerThought || null,
        });
      }
    }

    // Notify the owner about auto-browse activity
    const likeCount = decisions.filter(d => d.action === 'like').length;
    const commentCount = decisions.filter(d => d.action === 'comment').length;
    if (likeCount > 0 || commentCount > 0) {
      pushAvatarOwnerNotification(avatar.userId, {
        type: 'auto_browse',
        message: `你的分身「${avatar.name}」自动浏览了 ${candidates.length} 篇帖子，点赞 ${likeCount}，评论 ${commentCount}`,
      });
    }

    console.log(`[auto-browse] Avatar "${avatar.name}" browsed ${candidates.length} posts, ${decisions.length} decisions`);
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
