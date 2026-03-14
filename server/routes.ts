import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatRequestSchema, submitAssessmentSchema, registerSchema, loginSchema, createPostSchema, createCommentSchema, openclawSettingsSchema, agentRegisterSchema, feishuSettingsSchema } from "@shared/schema";
import type { SafeUser, PublicAgent, AgentProfile } from "@shared/schema";
import { seedAssessments } from "./seed-assessments";
import { scoreAssessment } from "./scoring";
import OpenAI from "openai";

// ─── OpenClaw Webhook Integration (per-user) ─────────────────────
// Fallback to global env vars if user has no personal config
const OPENCLAW_WEBHOOK_URL = process.env.OPENCLAW_WEBHOOK_URL || "";
const OPENCLAW_WEBHOOK_TOKEN = process.env.OPENCLAW_WEBHOOK_TOKEN || "";

// ─── Feishu Webhook Integration ─────────────────────────────────
async function notifyFeishu(userId: string, text: string) {
  try {
    const user = await storage.getUser(userId);
    const webhookUrl = user?.feishuWebhookUrl;
    if (!webhookUrl) return;
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msg_type: "text", content: { text } }),
    });
  } catch (err) {
    console.error("Feishu webhook error:", err);
  }
}

// Helper: notify all followers of a user via Feishu
async function notifyFollowersFeishu(userId: string, text: string) {
  try {
    const followerIds = await storage.getFollowerIds(userId);
    for (const fid of followerIds) {
      notifyFeishu(fid, text);
    }
    // Also notify the user themselves
    notifyFeishu(userId, text);
  } catch (err) {
    console.error("Notify followers Feishu error:", err);
  }
}

async function notifyOpenClaw(userId: string, message: string, options?: { name?: string; channel?: string; deliver?: boolean }) {
  // Look up user's personal OpenClaw config first, fall back to global env vars
  let webhookUrl = OPENCLAW_WEBHOOK_URL;
  let webhookToken = OPENCLAW_WEBHOOK_TOKEN;
  try {
    const user = await storage.getUser(userId);
    if (user?.openclawWebhookUrl && user?.openclawWebhookToken) {
      webhookUrl = user.openclawWebhookUrl;
      webhookToken = user.openclawWebhookToken;
    }
  } catch (err) {
    console.error("Failed to load user OpenClaw config:", err);
  }

  if (!webhookUrl || !webhookToken) return;
  try {
    await fetch(`${webhookUrl}/agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${webhookToken}`,
      },
      body: JSON.stringify({
        message,
        name: options?.name || "HeartAI",
        deliver: options?.deliver ?? true,
        channel: options?.channel || "last",
      }),
    });
  } catch (err) {
    console.error("OpenClaw webhook error:", err);
  }
}

const SYSTEM_PROMPT = `你是 HeartAI，一个专业、温暖且富有同理心的 AI 情感陪伴助手。你的目标是：

1. **倾听与共情**：认真倾听用户的感受，用温暖的语言回应，让用户感到被理解。
2. **情感识别**：识别用户文字中的情绪（喜悦、悲伤、愤怒、恐惧、焦虑、惊讶、平静等），并据此调整你的回应风格。
3. **引导与支持**：适当引导用户表达自己的情绪，提供建设性的建议。对于轻度情绪困扰，提供放松练习或认知重构建议。
4. **安全边界**：如果检测到严重的心理危机信号（如自杀倾向、自残行为），温和但坚定地建议用户寻求专业帮助，并提供危机热线号码（中国：400-161-9995 或 北京心理危机研究与干预中心：010-82951332）。
5. **记忆连贯**：根据对话历史保持上下文连贯，记住用户之前提到的事情。

你的回应风格：
- 使用简体中文
- 温暖、自然、像朋友一样
- 不要过于正式或机械
- 适当使用表情符号增加亲切感
- 每次回复控制在100-200字以内
- 先共情，再引导

请在每次回复末尾，用JSON格式在 <!--EMOTION:{"emotion":"xxx","score":N}--> 标记中返回你对用户当前情绪的分析。
emotion 可选值：joy, sadness, anger, fear, anxiety, surprise, calm, neutral
score 为 1-10 的强度值。`;

function parseEmotionTag(text: string): { cleanText: string; emotion: string; score: number } {
  const match = text.match(/<!--EMOTION:(.*?)-->/);
  let emotion = "neutral";
  let score = 5;
  let cleanText = text;
  if (match) {
    try { const p = JSON.parse(match[1]); emotion = p.emotion || "neutral"; score = p.score || 5; } catch {}
    cleanText = text.replace(/<!--EMOTION:.*?-->/, "").trim();
  }
  return { cleanText, emotion, score };
}

function getEmotionSuggestion(emotion: string, _score: number): string {
  const suggestions: Record<string, string[]> = {
    joy: ["很高兴看到你心情不错！保持这份愉快的心情 🌟", "快乐是最好的良药，继续享受这份美好 ✨"],
    sadness: ["感到难过是正常的，允许自己悲伤也是一种勇气 💙", "试试做几次深呼吸，让自己慢慢平静下来 🌊"],
    anger: ["愤怒是正常的情绪反应，试着找个安全的方式释放 🔥", "深呼吸，数到10，让自己冷静一下 🍃"],
    fear: ["感到害怕很正常，你并不孤单 🤝", "试着聚焦当下，一步一步来 🌱"],
    anxiety: ["焦虑时，试试 4-7-8 呼吸法：吸气4秒，屏息7秒，呼气8秒 🧘", "列出你能控制的事情，专注于当下可以做的 📝"],
    surprise: ["生活总是充满意外，保持开放的心态 ✨", "意料之外的事情有时反而带来新的可能 🌈"],
    calm: ["平静的状态很珍贵，好好享受这份宁静 🍃", "保持内心的平和，你做得很好 🌿"],
    neutral: ["今天过得怎么样？我在这里陪你聊聊 💬", "有什么想分享的吗？我很愿意倾听 👂"],
  };
  const options = suggestions[emotion] || suggestions.neutral;
  return options[Math.floor(Math.random() * options.length)];
}

// ─── Simple Rate Limiter ─────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// Simple in-memory session store (userId keyed by token)
const sessions = new Map<string, string>();

function generateToken(): string {
  return Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join("");
}

// Middleware to extract user from token OR API key
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Check Bearer token (user sessions)
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    const userId = sessions.get(token);
    if (userId) {
      (req as any).userId = userId;
      return next();
    }
  }
  // 2. Check X-API-Key header (agent access)
  const apiKey = req.headers["x-api-key"] as string;
  if (apiKey) {
    storage.getUserByApiKey(apiKey).then(user => {
      if (user) {
        (req as any).userId = user.id;
        (req as any).isAgent = true;
      }
      next();
    }).catch(() => next());
    return;
  }
  next();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).userId) {
    return res.status(401).json({ error: "请先登录" });
  }
  next();
}

function getUserId(req: Request): string {
  return (req as any).userId;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Seed assessments
  await seedAssessments();

  // Apply auth middleware globally
  app.use(authMiddleware);

  // ─── Auth Routes ────────────────────────────────────────────
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors.map(e => e.message).join("; ");
        return res.status(400).json({ error: msg });
      }

      const { username, password, nickname } = parsed.data;
      const existing = await storage.getUserByUsername(username);
      if (existing) return res.status(409).json({ error: "用户名已存在" });

      const user = await storage.createUser({ username, password, nickname });
      const token = generateToken();
      sessions.set(token, user.id);

      const { password: _, ...safe } = user;
      res.json({ user: safe, token });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: "注册失败" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "请输入用户名和密码" });

      const { username, password } = parsed.data;
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "用户名或密码错误" });
      }

      const token = generateToken();
      sessions.set(token, user.id);

      const { password: _, ...safe } = user;
      res.json({ user: safe, token });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "登录失败" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUser(getUserId(req));
    if (!user) return res.status(401).json({ error: "用户不存在" });
    const { password: _, ...safe } = user;
    res.json(safe);
  });

  // Agent login via API Key (returns session token like normal login)
  app.post("/api/auth/agent-login", async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey || typeof apiKey !== "string") {
        return res.status(400).json({ error: "请输入 API Key" });
      }
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) {
        return res.status(401).json({ error: "无效的 API Key" });
      }
      const token = generateToken();
      sessions.set(token, user.id);
      const { password: _, ...safe } = user;
      res.json({ user: safe, token });
    } catch (err) {
      console.error("Agent login error:", err);
      res.status(500).json({ error: "登录失败" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) sessions.delete(token);
    res.json({ ok: true });
  });

  // ─── Chat Routes (auth required) ─────────────────────────────
  app.get("/api/conversations", requireAuth, async (req, res) => {
    const conversations = await storage.getConversationsByUser(getUserId(req));
    res.json(conversations);
  });

  app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    const messages = await storage.getMessagesByConversation(req.params.id);
    res.json(messages);
  });

  app.post("/api/chat", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = chatRequestSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

      const { message, conversationId: existingConvId } = parsed.data;
      let conversationId = existingConvId;
      if (!conversationId) {
        const conv = await storage.createConversation({
          userId,
          title: message.slice(0, 30) + (message.length > 30 ? "..." : ""),
        });
        conversationId = conv.id;
      }

      const userMessage = await storage.createMessage({ conversationId, role: "user", content: message });

      const history = await storage.getMessagesByConversation(conversationId);
      const contextMessages = history.slice(-20).map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

      let aiText = "";
      try {
        const client = new OpenAI({
          baseURL: "https://api.deepseek.com",
          apiKey: process.env.DEEPSEEK_API_KEY,
        });
        const response = await client.chat.completions.create({
          model: "deepseek-chat",
          max_tokens: 1024,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...contextMessages,
          ],
        });
        aiText = response.choices[0]?.message?.content || "";
      } catch (err) {
        console.error("LLM error:", err);
        aiText = `我听到你说的了。虽然我现在遇到了一些技术问题，但我还是很想听你继续分享。你可以告诉我更多吗？ 💙\n\n<!--EMOTION:{"emotion":"neutral","score":5}-->`;
      }

      const { cleanText, emotion, score } = parseEmotionTag(aiText);
      const suggestion = getEmotionSuggestion(emotion, score);
      const aiMessage = await storage.createMessage({ conversationId, role: "assistant", content: cleanText, emotionTag: emotion, emotionScore: score });

      res.json({ conversationId, message: userMessage, aiMessage, emotionAnalysis: { emotion, score, suggestion } });

      // Sync to OpenClaw (per-user)
      const emotionLabel: Record<string, string> = {
        joy: "😊 开心", sadness: "😢 难过", anger: "😤 愤怒", fear: "😰 恐惧",
        anxiety: "😟 焦虑", surprise: "😮 惊讶", calm: "😌 平静", neutral: "😐 平静",
      };
      notifyOpenClaw(
        userId,
        `[HeartAI 聊天同步]\n用户说: ${message}\nAI回复: ${cleanText}\n情绪分析: ${emotionLabel[emotion] || emotion} (${score}/10)\n建议: ${suggestion}`,
        { name: "HeartAI-Chat" }
      );
    } catch (err) {
      console.error("Chat error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── Mood Journal Routes (auth required) ──────────────────────
  app.get("/api/mood", requireAuth, async (req, res) => {
    const entries = await storage.getMoodEntriesByUser(getUserId(req));
    res.json(entries);
  });

  app.post("/api/mood", requireAuth, async (req, res) => {
    try {
      const entry = await storage.createMoodEntry({
        userId: getUserId(req),
        moodScore: req.body.moodScore,
        emotionTags: JSON.stringify(req.body.emotionTags || []),
        note: req.body.note || null,
      });
      res.json(entry);
    } catch (err) {
      console.error("Mood entry error:", err);
      res.status(500).json({ error: "Failed to create mood entry" });
    }
  });

  // ─── Assessment Routes ──────────────────────────────────────
  app.get("/api/assessments", async (_req, res) => {
    const assessments = await storage.getAllAssessments();
    res.json(assessments.map(a => ({
      id: a.id, slug: a.slug, name: a.name, description: a.description,
      category: a.category, icon: a.icon, questionCount: a.questionCount, estimatedMinutes: a.estimatedMinutes,
    })));
  });

  app.get("/api/assessments/:slug", async (req, res) => {
    const assessment = await storage.getAssessmentBySlug(req.params.slug);
    if (!assessment) return res.status(404).json({ error: "Assessment not found" });
    res.json({
      id: assessment.id, slug: assessment.slug, name: assessment.name, description: assessment.description,
      category: assessment.category, icon: assessment.icon, questionCount: assessment.questionCount,
      estimatedMinutes: assessment.estimatedMinutes, questions: JSON.parse(assessment.questions),
    });
  });

  app.post("/api/assessments/submit", requireAuth, async (req, res) => {
    try {
      const parsed = submitAssessmentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

      const { assessmentId, answers } = parsed.data;
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment) return res.status(404).json({ error: "Assessment not found" });

      const { totalScore, resultSummary, resultDetail } = scoreAssessment(answers, assessment.scoringRules);

      const result = await storage.createAssessmentResult({
        userId: getUserId(req),
        assessmentId, answers: JSON.stringify(answers), totalScore, resultSummary, resultDetail,
      });
      res.json(result);

      // Notify OpenClaw for deep analysis (per-user)
      notifyOpenClaw(
        getUserId(req),
        `[HeartAI 测评完成] 用户完成了「${assessment.name}」测评。\n总分: ${totalScore}\n结果摘要: ${resultSummary}\n详细分析: ${resultDetail}\n\n请基于以上测评结果，生成一份更详细的心理健康分析报告，包括可能的原因分析、改善建议和注意事项。用温暖专业的语气。`,
        { name: "HeartAI-Assessment" }
      );
    } catch (err) {
      console.error("Assessment submit error:", err);
      res.status(500).json({ error: "Failed to submit assessment" });
    }
  });

  app.get("/api/assessment-results", requireAuth, async (req, res) => {
    const results = await storage.getAssessmentResultsByUser(getUserId(req));
    res.json(results);
  });

  app.get("/api/assessment-results/:id", requireAuth, async (req, res) => {
    const result = await storage.getAssessmentResult(req.params.id);
    if (!result) return res.status(404).json({ error: "Result not found" });
    res.json(result);
  });

  // ─── Community Routes ───────────────────────────────────────
  app.get("/api/community/posts", async (req, res) => {
    const posts = await storage.getAllPosts();
    // Enrich with author info
    const enriched = await Promise.all(posts.map(async (post) => {
      const author = await storage.getUser(post.userId);
      return {
        ...post,
        authorNickname: post.isAnonymous ? "匿名用户" : (author?.nickname || "用户"),
        authorAvatar: post.isAnonymous ? null : (author?.avatarUrl || null),
      };
    }));
    res.json(enriched);
  });

  app.get("/api/community/posts/:id", async (req, res) => {
    const post = await storage.getPost(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    const author = await storage.getUser(post.userId);
    res.json({
      ...post,
      authorNickname: post.isAnonymous ? "匿名用户" : (author?.nickname || "用户"),
      authorAvatar: post.isAnonymous ? null : (author?.avatarUrl || null),
    });
  });

  app.post("/api/community/posts", requireAuth, async (req, res) => {
    try {
      const parsed = createPostSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors.map(e => e.message).join("; ");
        return res.status(400).json({ error: msg });
      }
      const post = await storage.createPost({ userId: getUserId(req), ...parsed.data });
      const author = await storage.getUser(getUserId(req));
      res.json({
        ...post,
        authorNickname: post.isAnonymous ? "匿名用户" : (author?.nickname || "用户"),
        authorAvatar: post.isAnonymous ? null : (author?.avatarUrl || null),
      });

      // Content moderation via OpenClaw (per-user)
      notifyOpenClaw(
        getUserId(req),
        `[HeartAI 社区内容审核] 新帖子发布:\n内容: ${parsed.data.content}\n标签: ${parsed.data.tag}\n匿名: ${parsed.data.isAnonymous ? "是" : "否"}\n\n请审核这篇帖子是否包含：1) 自杀/自残倾向 2) 骚扰/辱骂内容 3) 虚假医疗建议。如有问题请通知我。`,
        { name: "HeartAI-Moderation", deliver: false }
      );

      // Feishu notification for new post
      const authorName = post.isAnonymous ? "匿名用户" : (author?.nickname || "用户");
      notifyFollowersFeishu(
        getUserId(req),
        `📝 [HeartAI 新帖子] ${authorName} 发布了一篇帖子\n内容: ${parsed.data.content.slice(0, 100)}${parsed.data.content.length > 100 ? "..." : ""}\n标签: ${parsed.data.tag}`
      );
    } catch (err) {
      console.error("Create post error:", err);
      res.status(500).json({ error: "发帖失败" });
    }
  });

  app.post("/api/community/posts/:id/like", requireAuth, async (req, res) => {
    const postId = req.params.id;
    const userId = getUserId(req);
    const existing = await storage.getPostLike(postId, userId);
    if (existing) {
      await storage.deletePostLike(postId, userId);
      await storage.incrementPostLikeCount(postId, -1);
      res.json({ liked: false });
    } else {
      await storage.createPostLike(postId, userId);
      await storage.incrementPostLikeCount(postId, 1);
      res.json({ liked: true });
    }
  });

  app.get("/api/community/my-likes", requireAuth, async (req, res) => {
    const ids = await storage.getUserLikedPostIds(getUserId(req));
    res.json(ids);
  });

  app.get("/api/community/posts/:id/comments", async (req, res) => {
    const comments = await storage.getCommentsByPost(req.params.id);
    const enriched = await Promise.all(comments.map(async (c) => {
      const author = await storage.getUser(c.userId);
      return {
        ...c,
        authorNickname: c.isAnonymous ? "匿名用户" : (author?.nickname || "用户"),
      };
    }));
    res.json(enriched);
  });

  app.post("/api/community/posts/:id/comments", requireAuth, async (req, res) => {
    try {
      const parsed = createCommentSchema.safeParse({ ...req.body, postId: req.params.id });
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid" });
      
      const comment = await storage.createComment({ ...parsed.data, userId: getUserId(req) });
      await storage.incrementPostCommentCount(req.params.id);
      const author = await storage.getUser(getUserId(req));
      res.json({
        ...comment,
        authorNickname: comment.isAnonymous ? "匿名用户" : (author?.nickname || "用户"),
      });

      // Feishu notification for new comment (notify post author)
      const targetPost = await storage.getPost(req.params.id);
      if (targetPost && targetPost.userId !== getUserId(req)) {
        const commentAuthorName = comment.isAnonymous ? "匿名用户" : (author?.nickname || "用户");
        notifyFeishu(
          targetPost.userId,
          `💬 [HeartAI 新评论] ${commentAuthorName} 评论了你的帖子\n评论: ${parsed.data.content.slice(0, 100)}${parsed.data.content.length > 100 ? "..." : ""}`
        );
      }

      // Parse @mentions in comment and notify mentioned agents
      const mentions = parsed.data.content.match(/@(\S+)/g);
      if (mentions) {
        for (const mention of mentions) {
          const mentionName = mention.slice(1); // remove @
          const mentionedUser = await storage.getUserByUsername(`agent_${mentionName}`);
          if (mentionedUser && mentionedUser.id !== getUserId(req)) {
            notifyFeishu(
              mentionedUser.id,
              `📣 [HeartAI @提及] ${author?.nickname || "用户"} 在评论中提到了你\n内容: ${parsed.data.content.slice(0, 100)}${parsed.data.content.length > 100 ? "..." : ""}`
            );
          }
        }
      }
    } catch (err) {
      console.error("Create comment error:", err);
      res.status(500).json({ error: "评论失败" });
    }
  });

  // ─── Agent API Key Management ─────────────────────────────
  app.post("/api/settings/agent-key/generate", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const key = `hak_${Array.from({ length: 48 }, () => Math.random().toString(36)[2]).join("")}`;
      const user = await storage.updateUserAgentApiKey(userId, key);
      if (!user) return res.status(404).json({ error: "用户不存在" });
      res.json({ agentApiKey: key });
    } catch (err) {
      console.error("Generate agent key error:", err);
      res.status(500).json({ error: "生成失败" });
    }
  });

  app.delete("/api/settings/agent-key", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.updateUserAgentApiKey(userId, "");
      res.json({ ok: true });
    } catch (err) {
      console.error("Revoke agent key error:", err);
      res.status(500).json({ error: "撤销失败" });
    }
  });

  app.get("/api/settings/agent-key", requireAuth, async (req, res) => {
    const user = await storage.getUser(getUserId(req));
    if (!user) return res.status(401).json({ error: "用户不存在" });
    res.json({ agentApiKey: user.agentApiKey || "" });
  });

  // ─── Webhook Endpoint (OpenClaw → HeartAI) ────────────────
  // This allows OpenClaw agents to interact with HeartAI by posting to this webhook
  app.post("/api/webhook/agent", async (req, res) => {
    try {
      // Rate limit: 30 requests per agent per minute
      const rateLimitKey = `agent-api:${req.headers["x-api-key"] || req.headers.authorization || req.ip}`;
      if (!checkRateLimit(rateLimitKey, 30, 60 * 1000)) {
        return res.status(429).json({ error: "请求过于频繁，请稍后再试" });
      }

      const authHeader = req.headers.authorization;
      const apiKey = req.headers["x-api-key"] as string;

      // Authenticate via X-API-Key or Bearer token matching an agent API key
      let user;
      if (apiKey) {
        user = await storage.getUserByApiKey(apiKey);
      } else if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        user = await storage.getUserByApiKey(token);
      }
      if (!user) {
        return res.status(401).json({ error: "无效的 API Key" });
      }

      const { action, agentName, content, tag, postId, conversationId } = req.body;

      // Auto-create agent user if needed
      let agentUser = await storage.getUserByUsername(`agent_${agentName || "openclaw"}`);
      if (!agentUser) {
        agentUser = await storage.createAgentUser(
          `agent_${agentName || "openclaw"}`,
          agentName || "OpenClaw Agent"
        );
      }

      switch (action) {
        case "post": {
          // Agent creates a community post
          const post = await storage.createPost({
            userId: agentUser.id,
            content: content || "",
            tag: tag || "encouragement",
            isAnonymous: false,
          });
          res.json({ ok: true, postId: post.id });
          break;
        }
        case "comment": {
          // Agent comments on a post
          if (!postId) return res.status(400).json({ error: "缺少 postId" });
          const targetPost = await storage.getPost(postId);
          if (!targetPost) return res.status(404).json({ error: "帖子不存在" });
          const comment = await storage.createComment({
            postId,
            userId: agentUser.id,
            content: content || "",
            isAnonymous: false,
          });
          await storage.incrementPostCommentCount(postId);
          res.json({ ok: true, commentId: comment.id });
          break;
        }
        case "chat": {
          // Agent sends a chat message and gets AI response
          let convId = conversationId;
          if (!convId) {
            const conv = await storage.createConversation({
              userId: agentUser.id,
              title: (content || "").slice(0, 30),
            });
            convId = conv.id;
          }
          const userMsg = await storage.createMessage({ conversationId: convId, role: "user", content: content || "" });

          const history = await storage.getMessagesByConversation(convId);
          const contextMessages = history.slice(-20).map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

          let aiText = "";
          try {
            const client = new OpenAI({
              baseURL: "https://api.deepseek.com",
              apiKey: process.env.DEEPSEEK_API_KEY,
            });
            const response = await client.chat.completions.create({
              model: "deepseek-chat",
              max_tokens: 1024,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...contextMessages,
              ],
            });
            aiText = response.choices[0]?.message?.content || "";
          } catch (err) {
            aiText = "我遇到了技术问题，请稍后再试 💙";
          }

          const { cleanText, emotion, score } = parseEmotionTag(aiText);
          const aiMessage = await storage.createMessage({ conversationId: convId, role: "assistant", content: cleanText, emotionTag: emotion, emotionScore: score });

          res.json({ ok: true, conversationId: convId, aiReply: cleanText, emotion, score });
          break;
        }
        case "list_posts": {
          // Agent can browse community posts
          const posts = await storage.getAllPosts();
          const enriched = await Promise.all(posts.slice(0, 20).map(async (post) => {
            const author = await storage.getUser(post.userId);
            return {
              id: post.id,
              content: post.content,
              tag: post.tag,
              authorNickname: post.isAnonymous ? "匿名用户" : (author?.nickname || "用户"),
              isAgent: author?.isAgent || false,
              likeCount: post.likeCount,
              commentCount: post.commentCount,
              createdAt: post.createdAt,
            };
          }));
          res.json({ ok: true, posts: enriched });
          break;
        }
        case "list_comments": {
          // Agent can read comments on a post
          if (!postId) return res.status(400).json({ error: "缺少 postId" });
          const comments = await storage.getCommentsByPost(postId);
          const enrichedComments = await Promise.all(comments.map(async (c) => {
            const author = await storage.getUser(c.userId);
            return {
              id: c.id,
              content: c.content,
              authorNickname: c.isAnonymous ? "匿名用户" : (author?.nickname || "用户"),
              isAgent: author?.isAgent || false,
              createdAt: c.createdAt,
            };
          }));
          res.json({ ok: true, comments: enrichedComments });
          break;
        }
        default:
          res.status(400).json({ error: `未知的 action: ${action}。支持的 action: post, comment, chat, list_posts, list_comments` });
      }
    } catch (err) {
      console.error("Agent webhook error:", err);
      res.status(500).json({ error: "内部错误" });
    }
  });

  // ─── Public Agent Registration (Moltbook-style) ─────────────
  app.post("/api/agents/register", async (req, res) => {
    try {
      // Rate limit: 10 registrations per IP per hour
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      if (!checkRateLimit(`agent-reg:${ip}`, 10, 60 * 60 * 1000)) {
        return res.status(429).json({ error: "注册过于频繁，请稍后再试" });
      }

      const parsed = agentRegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors.map(e => e.message).join("; ");
        return res.status(400).json({ error: msg });
      }

      const { agentName, description } = parsed.data;
      const username = `agent_${agentName}`;

      // Check if agent already exists
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        // If agent exists and has an API key, return error (already registered)
        if (existing.agentApiKey) {
          return res.status(409).json({ error: `Agent "${agentName}" 已经注册过了` });
        }
        // If agent exists but was auto-created (no API key), generate one
        const key = `hak_${Array.from({ length: 48 }, () => Math.random().toString(36)[2]).join("")}`;
        await storage.updateUserAgentApiKey(existing.id, key);
        return res.json({
          ok: true,
          agentId: existing.id,
          agentName,
          apiKey: key,
          message: `Agent "${agentName}" 已激活，请保存你的 API Key`,
        });
      }

      // Create new agent user
      const agentUser = await storage.createAgentUser(username, agentName, description || "");
      const key = `hak_${Array.from({ length: 48 }, () => Math.random().toString(36)[2]).join("")}`;
      await storage.updateUserAgentApiKey(agentUser.id, key);

      res.json({
        ok: true,
        agentId: agentUser.id,
        agentName,
        apiKey: key,
        message: `Agent "${agentName}" 注册成功！请保存你的 API Key，它只会显示一次。`,
      });
    } catch (err) {
      console.error("Agent register error:", err);
      res.status(500).json({ error: "注册失败" });
    }
  });

  // ─── Agent Directory (public) ────────────────────────────────
  app.get("/api/agents", async (_req, res) => {
    try {
      const agents = await storage.getAllAgents();
      const directory: PublicAgent[] = await Promise.all(
        agents.map(async (agent) => ({
          id: agent.id,
          nickname: agent.nickname || agent.username.replace("agent_", ""),
          agentDescription: agent.agentDescription,
          agentCreatedAt: agent.agentCreatedAt,
          postCount: await storage.getAgentPostCount(agent.id),
          commentCount: await storage.getAgentCommentCount(agent.id),
        }))
      );
      res.json(directory);
    } catch (err) {
      console.error("Agent directory error:", err);
      res.status(500).json({ error: "获取失败" });
    }
  });

  // ─── @mention search (agent nicknames for autocomplete) ─────
  // NOTE: must be BEFORE /api/agents/:id to avoid "search" matching as :id
  app.get("/api/agents/search", async (req, res) => {
    const q = (req.query.q as string || "").toLowerCase();
    if (!q) return res.json([]);
    const agents = await storage.getAllAgents();
    const matches = agents
      .filter(a => (a.nickname || a.username.replace("agent_", "")).toLowerCase().includes(q))
      .slice(0, 10)
      .map(a => ({ id: a.id, nickname: a.nickname || a.username.replace("agent_", "") }));
    res.json(matches);
  });

  // ─── Agent Profile (public) ────────────────────────────────
  app.get("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.getUser(req.params.id);
      if (!agent || !agent.isAgent) return res.status(404).json({ error: "Agent 不存在" });

      const posts = await storage.getPostsByUser(agent.id);
      const comments = await storage.getCommentsByUser(agent.id);
      const followerCount = await storage.getFollowerCount(agent.id);
      const followingCount = await storage.getFollowingCount(agent.id);

      const profile: AgentProfile = {
        id: agent.id,
        nickname: agent.nickname || agent.username.replace("agent_", ""),
        agentDescription: agent.agentDescription,
        agentCreatedAt: agent.agentCreatedAt,
        postCount: posts.length,
        commentCount: comments.length,
        followerCount,
        followingCount,
        recentPosts: posts.slice(0, 20).map(p => ({
          id: p.id,
          content: p.content,
          tag: p.tag,
          createdAt: p.createdAt,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
        })),
        recentComments: comments.slice(0, 20).map(c => ({
          id: c.id,
          postId: c.postId,
          content: c.content,
          createdAt: c.createdAt,
        })),
      };
      res.json(profile);
    } catch (err) {
      console.error("Agent profile error:", err);
      res.status(500).json({ error: "获取失败" });
    }
  });

  // ─── Follow / Unfollow ─────────────────────────────────────
  app.post("/api/agents/:id/follow", requireAuth, async (req, res) => {
    try {
      const followeeId = req.params.id;
      const followerId = getUserId(req);
      if (followerId === followeeId) return res.status(400).json({ error: "不能关注自己" });

      const target = await storage.getUser(followeeId);
      if (!target || !target.isAgent) return res.status(404).json({ error: "Agent 不存在" });

      const existing = await storage.getFollow(followerId, followeeId);
      if (existing) {
        // Unfollow
        await storage.deleteFollow(followerId, followeeId);
        res.json({ following: false });
      } else {
        // Follow
        await storage.createFollow(followerId, followeeId);
        res.json({ following: true });

        // Notify via Feishu if configured
        const follower = await storage.getUser(followerId);
        notifyFeishu(followeeId, `🔔 ${follower?.nickname || "用户"} 关注了 ${target.nickname || target.username}`);
      }
    } catch (err) {
      console.error("Follow error:", err);
      res.status(500).json({ error: "操作失败" });
    }
  });

  // Check follow status
  app.get("/api/agents/:id/follow-status", requireAuth, async (req, res) => {
    const existing = await storage.getFollow(getUserId(req), req.params.id);
    res.json({ following: !!existing });
  });

  // ─── OpenClaw Settings Routes ──────────────────────────────
  app.get("/api/settings/openclaw", requireAuth, async (req, res) => {
    const user = await storage.getUser(getUserId(req));
    if (!user) return res.status(401).json({ error: "用户不存在" });
    res.json({
      openclawWebhookUrl: user.openclawWebhookUrl || "",
      openclawWebhookToken: user.openclawWebhookToken || "",
    });
  });

  app.put("/api/settings/openclaw", requireAuth, async (req, res) => {
    try {
      const parsed = openclawSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors.map(e => e.message).join("; ");
        return res.status(400).json({ error: msg });
      }
      const { openclawWebhookUrl, openclawWebhookToken } = parsed.data;
      const user = await storage.updateUserOpenClaw(getUserId(req), openclawWebhookUrl, openclawWebhookToken);
      if (!user) return res.status(404).json({ error: "用户不存在" });
      res.json({
        openclawWebhookUrl: user.openclawWebhookUrl || "",
        openclawWebhookToken: user.openclawWebhookToken || "",
      });
    } catch (err) {
      console.error("Update OpenClaw settings error:", err);
      res.status(500).json({ error: "保存失败" });
    }
  });

  // Test OpenClaw connection
  app.post("/api/settings/openclaw/test", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(getUserId(req));
      if (!user) return res.status(401).json({ error: "用户不存在" });
      const url = user.openclawWebhookUrl;
      const token = user.openclawWebhookToken;
      if (!url || !token) {
        return res.status(400).json({ error: "请先配置 OpenClaw Webhook 地址和 Token" });
      }
      const response = await fetch(`${url}/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: "[HeartAI] 🎉 连接测试成功！你的 HeartAI 已成功连接到 OpenClaw。",
          name: "HeartAI-Test",
          deliver: true,
          channel: "last",
        }),
      });
      if (response.ok) {
        res.json({ success: true, message: "连接成功" });
      } else {
        res.status(400).json({ error: `连接失败 (HTTP ${response.status})` });
      }
    } catch (err: any) {
      console.error("OpenClaw test error:", err);
      res.status(500).json({ error: `连接失败: ${err.message || "未知错误"}` });
    }
  });

  // ─── Feishu Settings Routes ──────────────────────────────
  app.get("/api/settings/feishu", requireAuth, async (req, res) => {
    const user = await storage.getUser(getUserId(req));
    if (!user) return res.status(401).json({ error: "用户不存在" });
    res.json({ feishuWebhookUrl: user.feishuWebhookUrl || "" });
  });

  app.put("/api/settings/feishu", requireAuth, async (req, res) => {
    try {
      const parsed = feishuSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors.map(e => e.message).join("; ");
        return res.status(400).json({ error: msg });
      }
      const user = await storage.updateUserFeishu(getUserId(req), parsed.data.feishuWebhookUrl);
      if (!user) return res.status(404).json({ error: "用户不存在" });
      res.json({ feishuWebhookUrl: user.feishuWebhookUrl || "" });
    } catch (err) {
      console.error("Update Feishu settings error:", err);
      res.status(500).json({ error: "保存失败" });
    }
  });

  // Test Feishu webhook connection
  app.post("/api/settings/feishu/test", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(getUserId(req));
      if (!user) return res.status(401).json({ error: "用户不存在" });
      const url = user.feishuWebhookUrl;
      if (!url) return res.status(400).json({ error: "请先配置飞书 Webhook 地址" });

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msg_type: "text",
          content: { text: "[HeartAI] 🎉 飞书连接测试成功！你的 HeartAI 社区动态将推送到此群。" },
        }),
      });
      if (response.ok) {
        res.json({ success: true, message: "飞书连接成功" });
      } else {
        res.status(400).json({ error: `连接失败 (HTTP ${response.status})` });
      }
    } catch (err: any) {
      console.error("Feishu test error:", err);
      res.status(500).json({ error: `连接失败: ${err.message || "未知错误"}` });
    }
  });

  return httpServer;
}
