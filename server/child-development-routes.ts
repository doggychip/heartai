// Child Development Tracker routes — integrated with zhihuiti agent system
import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import {
  children, childGoals, childSchedule, childMilestones, childDailyLog,
  learningStories, sparkScores, weeklyReflections, milestoneLibrary, childInsights,
} from "@shared/schema";
import { eq, and, desc, sql, asc } from "drizzle-orm";
import { getFortuneClient, FORTUNE_MODEL, FAST_MODEL } from "./ai-config";

function getUserId(req: Request): string {
  return (req as any).userId;
}

function now(): string {
  return new Date().toISOString();
}

export function registerChildDevelopmentRoutes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
) {

  // Seed milestone library if empty
  seedMilestoneLibrary().catch(err => console.error("Milestone seed error:", err));

  // ─── Children CRUD ───────────────────────────────────────────

  app.get("/api/children", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const rows = await db.select().from(children).where(eq(children.userId, userId)).orderBy(asc(children.name));
    res.json(rows);
  });

  app.post("/api/children", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const { name, birthDate, avatarColor, notes } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }
    const [child] = await db.insert(children).values({
      userId, name: name.trim(), birthDate: birthDate || null,
      avatarColor: avatarColor || "#8b5cf6", notes: notes || null, createdAt: now(),
    }).returning();
    res.json(child);
  });

  app.patch("/api/children/:childId", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const { childId } = req.params;
    const existing = await db.select().from(children).where(and(eq(children.id, childId), eq(children.userId, userId))).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Child not found" });
    const { name, birthDate, avatarColor, notes } = req.body;
    const [updated] = await db.update(children).set({
      ...(name !== undefined && { name: name.trim() }),
      ...(birthDate !== undefined && { birthDate }),
      ...(avatarColor !== undefined && { avatarColor }),
      ...(notes !== undefined && { notes }),
    }).where(eq(children.id, childId)).returning();
    res.json(updated);
  });

  app.delete("/api/children/:childId", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const { childId } = req.params;
    await db.delete(children).where(and(eq(children.id, childId), eq(children.userId, userId)));
    res.json({ ok: true });
  });

  // ─── Goals ───────────────────────────────────────────────────

  app.get("/api/children/:childId/goals", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const rows = await db.select().from(childGoals)
      .where(and(eq(childGoals.childId, req.params.childId), eq(childGoals.userId, userId)))
      .orderBy(desc(childGoals.createdAt));
    res.json(rows);
  });

  app.post("/api/children/:childId/goals", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const { category, title, description, targetDate } = req.body;
    if (!category || !title) return res.status(400).json({ error: "Category and title required" });
    const [goal] = await db.insert(childGoals).values({
      childId: req.params.childId, userId, category, title: title.trim(),
      description: description || null, targetDate: targetDate || null,
      status: "active", progress: 0, createdAt: now(), updatedAt: now(),
    }).returning();
    res.json(goal);
  });

  app.patch("/api/children/:childId/goals/:goalId", requireAuth, async (req, res) => {
    const { goalId } = req.params;
    const { status, progress, title, description, targetDate } = req.body;
    const [updated] = await db.update(childGoals).set({
      ...(status !== undefined && { status }),
      ...(progress !== undefined && { progress }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(targetDate !== undefined && { targetDate }),
      updatedAt: now(),
    }).where(eq(childGoals.id, goalId)).returning();
    res.json(updated);
  });

  app.delete("/api/children/:childId/goals/:goalId", requireAuth, async (req, res) => {
    await db.delete(childGoals).where(eq(childGoals.id, req.params.goalId));
    res.json({ ok: true });
  });

  // ─── Schedule ────────────────────────────────────────────────

  app.get("/api/children/:childId/schedule", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const rows = await db.select().from(childSchedule)
      .where(and(eq(childSchedule.childId, req.params.childId), eq(childSchedule.userId, userId)));
    res.json(rows);
  });

  app.post("/api/children/:childId/schedule", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const { dayOfWeek, startTime, endTime, activity, category, color } = req.body;
    const [entry] = await db.insert(childSchedule).values({
      childId: req.params.childId, userId, dayOfWeek, startTime, endTime,
      activity, category: category || null, color: color || null, createdAt: now(),
    }).returning();
    res.json(entry);
  });

  app.delete("/api/children/:childId/schedule/:entryId", requireAuth, async (req, res) => {
    await db.delete(childSchedule).where(eq(childSchedule.id, req.params.entryId));
    res.json({ ok: true });
  });

  // ─── Milestones ──────────────────────────────────────────────

  app.get("/api/children/:childId/milestones", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const rows = await db.select().from(childMilestones)
      .where(and(eq(childMilestones.childId, req.params.childId), eq(childMilestones.userId, userId)))
      .orderBy(desc(childMilestones.achievedDate));
    res.json(rows);
  });

  app.post("/api/children/:childId/milestones", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const { title, description, category, achievedDate } = req.body;
    if (!title) return res.status(400).json({ error: "Title required" });
    const [ms] = await db.insert(childMilestones).values({
      childId: req.params.childId, userId, title: title.trim(),
      description: description || null, category: category || null,
      achievedDate: achievedDate || null, createdAt: now(),
    }).returning();
    res.json(ms);
  });

  app.delete("/api/children/:childId/milestones/:msId", requireAuth, async (req, res) => {
    await db.delete(childMilestones).where(eq(childMilestones.id, req.params.msId));
    res.json({ ok: true });
  });

  // ─── Daily Log ───────────────────────────────────────────────

  app.get("/api/children/:childId/daily-log", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const rows = await db.select().from(childDailyLog)
      .where(and(eq(childDailyLog.childId, req.params.childId), eq(childDailyLog.userId, userId)))
      .orderBy(desc(childDailyLog.date));
    res.json(rows.map(r => ({ ...r, highlights: r.highlights ? JSON.parse(r.highlights) : null })));
  });

  app.post("/api/children/:childId/daily-log", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const { date, mood, sleepHours, notes, highlights } = req.body;
    if (!date) return res.status(400).json({ error: "Date required" });
    const [entry] = await db.insert(childDailyLog).values({
      childId: req.params.childId, userId, date, mood: mood || null,
      sleepHours: sleepHours || null, notes: notes || null,
      highlights: highlights ? JSON.stringify(highlights) : null, createdAt: now(),
    }).returning();
    res.json({ ...entry, highlights: entry.highlights ? JSON.parse(entry.highlights) : null });
  });

  // ─── Learning Stories ────────────────────────────────────────

  app.get("/api/children/:childId/stories", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const rows = await db.select().from(learningStories)
      .where(and(eq(learningStories.childId, req.params.childId), eq(learningStories.userId, userId)))
      .orderBy(desc(learningStories.date));
    res.json(rows.map(r => ({ ...r, domains: r.domains ? JSON.parse(r.domains) : [] })));
  });

  app.post("/api/children/:childId/stories", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const { title, narrative, domains, photoUrl, date } = req.body;
    if (!title || !narrative) return res.status(400).json({ error: "Title and narrative required" });
    const [story] = await db.insert(learningStories).values({
      childId: req.params.childId, userId, title: title.trim(), narrative: narrative.trim(),
      domains: domains ? JSON.stringify(domains) : null, photoUrl: photoUrl || null,
      date: date || new Date().toISOString().split("T")[0], createdAt: now(),
    }).returning();
    res.json({ ...story, domains: story.domains ? JSON.parse(story.domains) : [] });
  });

  app.delete("/api/children/:childId/stories/:storyId", requireAuth, async (req, res) => {
    await db.delete(learningStories).where(eq(learningStories.id, req.params.storyId));
    res.json({ ok: true });
  });

  // ─── Spark Scores ────────────────────────────────────────────

  app.get("/api/children/:childId/spark-scores", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const rows = await db.select().from(sparkScores)
      .where(and(eq(sparkScores.childId, req.params.childId), eq(sparkScores.userId, userId)))
      .orderBy(desc(sparkScores.date)).limit(12);
    res.json(rows);
  });

  app.post("/api/children/:childId/spark-scores", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const { date, cognitive, language, socialEmotional, physical, creative, independence, notes } = req.body;
    const [score] = await db.insert(sparkScores).values({
      childId: req.params.childId, userId,
      date: date || new Date().toISOString().split("T")[0],
      cognitive: cognitive || 0, language: language || 0,
      socialEmotional: socialEmotional || 0, physical: physical || 0,
      creative: creative || 0, independence: independence || 0,
      notes: notes || null, createdAt: now(),
    }).returning();
    res.json(score);
  });

  // ─── Weekly Reflections ──────────────────────────────────────

  app.get("/api/children/:childId/reflections", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const rows = await db.select().from(weeklyReflections)
      .where(and(eq(weeklyReflections.childId, req.params.childId), eq(weeklyReflections.userId, userId)))
      .orderBy(desc(weeklyReflections.weekStart)).limit(12);
    res.json(rows);
  });

  app.post("/api/children/:childId/reflections", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const { weekStart, proudestMoment, biggestChallenge, focusNextWeek, parentNotes } = req.body;
    if (!weekStart) return res.status(400).json({ error: "weekStart required" });
    const [ref] = await db.insert(weeklyReflections).values({
      childId: req.params.childId, userId, weekStart,
      proudestMoment: proudestMoment || null, biggestChallenge: biggestChallenge || null,
      focusNextWeek: focusNextWeek || null, parentNotes: parentNotes || null, createdAt: now(),
    }).returning();
    res.json(ref);
  });

  // ─── Milestone Library (read-only reference) ─────────────────

  app.get("/api/milestone-library", requireAuth, async (_req, res) => {
    const rows = await db.select().from(milestoneLibrary).orderBy(asc(milestoneLibrary.ageMin), asc(milestoneLibrary.domain));
    res.json(rows);
  });

  // ─── Sibling Comparison ──────────────────────────────────────

  app.get("/api/children/compare", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const allChildren = await db.select().from(children).where(eq(children.userId, userId)).orderBy(asc(children.name));
    if (allChildren.length < 2) return res.json({ children: allChildren, comparisons: [] });

    const comparisons = await Promise.all(allChildren.map(async (child) => {
      const [latestSpark] = await db.select().from(sparkScores)
        .where(eq(sparkScores.childId, child.id)).orderBy(desc(sparkScores.date)).limit(1);

      const [storyResult] = await db.select({ count: sql<number>`count(*)` })
        .from(learningStories).where(eq(learningStories.childId, child.id));

      const [msResult] = await db.select({ count: sql<number>`count(*)` })
        .from(childMilestones).where(eq(childMilestones.childId, child.id));

      const goalRows = await db.select().from(childGoals).where(eq(childGoals.childId, child.id));

      return {
        child,
        sparkScore: latestSpark || null,
        storyCount: Number(storyResult?.count || 0),
        milestoneCount: Number(msResult?.count || 0),
        activeGoals: goalRows.filter(g => g.status === "active").length,
        completedGoals: goalRows.filter(g => g.status === "completed").length,
      };
    }));

    res.json({ children: allChildren, comparisons });
  });

  // ─── AI Insights ─────────────────────────────────────────────

  app.get("/api/children/:childId/insights", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const rows = await db.select().from(childInsights)
      .where(and(eq(childInsights.childId, req.params.childId), eq(childInsights.userId, userId)))
      .orderBy(desc(childInsights.createdAt)).limit(20);
    res.json(rows.map(r => ({ ...r, content: JSON.parse(r.content) })));
  });

  app.post("/api/children/:childId/insights/generate", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const { childId } = req.params;

    // Gather child data
    const [child] = await db.select().from(children).where(and(eq(children.id, childId), eq(children.userId, userId)));
    if (!child) return res.status(404).json({ error: "Child not found" });

    const latestScores = await db.select().from(sparkScores)
      .where(eq(sparkScores.childId, childId)).orderBy(desc(sparkScores.date)).limit(2);
    const recentStories = await db.select().from(learningStories)
      .where(eq(learningStories.childId, childId)).orderBy(desc(learningStories.date)).limit(5);
    const recentLogs = await db.select().from(childDailyLog)
      .where(eq(childDailyLog.childId, childId)).orderBy(desc(childDailyLog.date)).limit(7);
    const goals = await db.select().from(childGoals)
      .where(and(eq(childGoals.childId, childId), eq(childGoals.status, "active")));
    const milestones = await db.select().from(childMilestones)
      .where(eq(childMilestones.childId, childId)).orderBy(desc(childMilestones.achievedDate)).limit(5);
    const reflections = await db.select().from(weeklyReflections)
      .where(eq(weeklyReflections.childId, childId)).orderBy(desc(weeklyReflections.weekStart)).limit(2);

    // Calculate age
    let ageContext = "";
    if (child.birthDate) {
      const birth = new Date(child.birthDate);
      const now = new Date();
      const years = now.getFullYear() - birth.getFullYear();
      const months = now.getMonth() - birth.getMonth();
      const ay = months < 0 ? years - 1 : years;
      const am = months < 0 ? months + 12 : months;
      ageContext = `Age: ${ay} years ${am} months`;
    }

    // Build context for AI
    const sparkContext = latestScores.length > 0
      ? `Spark scores (latest): Cognitive=${latestScores[0].cognitive}, Language=${latestScores[0].language}, Social-Emotional=${latestScores[0].socialEmotional}, Physical=${latestScores[0].physical}, Creative=${latestScores[0].creative}, Independence=${latestScores[0].independence}`
      : "No spark scores recorded yet";

    const storyContext = recentStories.length > 0
      ? `Recent stories: ${recentStories.map(s => `"${s.title}" (domains: ${s.domains || "none"})`).join("; ")}`
      : "No stories yet";

    const logContext = recentLogs.length > 0
      ? `Recent daily logs: ${recentLogs.map(l => `${l.date}: mood=${l.mood || "?"}, sleep=${l.sleepHours || "?"}h`).join("; ")}`
      : "No daily logs";

    const goalContext = goals.length > 0
      ? `Active goals: ${goals.map(g => `${g.title} (${g.category}, ${g.progress}%)`).join("; ")}`
      : "No active goals";

    const reflectionContext = reflections.length > 0
      ? `Latest reflection: Proudest=${reflections[0].proudestMoment || "?"}, Challenge=${reflections[0].biggestChallenge || "?"}, Focus=${reflections[0].focusNextWeek || "?"}`
      : "No reflections yet";

    try {
      const aiClient = getFortuneClient();
      const completion = await aiClient.chat.completions.create({
        model: FAST_MODEL,
        messages: [
          {
            role: "system",
            content: `You are 育儿顾问 (Parenting Advisor), a warm, knowledgeable child development specialist. You work within the 观星 (GuanXing) community platform.

Your job is to analyze a child's development data and generate 3 actionable insights. Each insight should be one of these types:
- activity_suggestion: A specific activity to try this week based on their development profile
- strength_analysis: Celebrate what's going well and why it matters
- growth_opportunity: Gently identify an area to nurture, with concrete steps

Be warm, specific, and practical. Never compare children negatively. Frame everything as growth, not deficit.

Respond ONLY with valid JSON array of 3 objects:
[{"type": "activity_suggestion"|"strength_analysis"|"growth_opportunity", "title": "short title", "body": "2-3 sentence explanation", "domain": "cognitive|language|social-emotional|physical|creative|independence", "suggestions": ["action 1", "action 2"]}]`
          },
          {
            role: "user",
            content: `Child: ${child.name}
${ageContext}
${sparkContext}
${storyContext}
${logContext}
${goalContext}
${reflectionContext}
Recent milestones: ${milestones.map(m => m.title).join(", ") || "none"}

Generate 3 personalized development insights for this child.`
          }
        ],
      });

      const responseText = completion.choices[0]?.message?.content || "[]";
      let insights: any[];
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        insights = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        insights = [{ type: "activity_suggestion", title: "Keep observing", body: "Continue documenting your child's journey. The more data we have, the better the insights!", domain: "cognitive", suggestions: ["Write a learning story this week"] }];
      }

      // Save insights to DB
      const savedInsights = [];
      for (const insight of insights.slice(0, 3)) {
        const [saved] = await db.insert(childInsights).values({
          childId, userId, insightType: insight.type || "activity_suggestion",
          content: JSON.stringify(insight), createdAt: now(),
        }).returning();
        savedInsights.push({ ...saved, content: insight });
      }

      res.json(savedInsights);
    } catch (err: any) {
      console.error("AI insight generation failed:", err.message);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  app.patch("/api/children/insights/:insightId/read", requireAuth, async (req, res) => {
    await db.update(childInsights).set({ isRead: true }).where(eq(childInsights.id, req.params.insightId));
    res.json({ ok: true });
  });

  // ─── Agent Bridge: Read child data (for zhihuiti agents) ────

  app.get("/api/agent/children/:childId/summary", async (req, res) => {
    const apiKey = req.headers["x-api-key"] as string;
    if (!apiKey) return res.status(401).json({ error: "API key required" });

    // Verify agent
    const [agent] = await db.select().from(
      (await import("@shared/schema")).users
    ).where(eq((await import("@shared/schema")).users.agentApiKey, apiKey));
    if (!agent || !agent.isAgent) return res.status(403).json({ error: "Invalid agent" });

    const { childId } = req.params;
    const [child] = await db.select().from(children).where(eq(children.id, childId));
    if (!child) return res.status(404).json({ error: "Child not found" });

    const [latestSpark] = await db.select().from(sparkScores)
      .where(eq(sparkScores.childId, childId)).orderBy(desc(sparkScores.date)).limit(1);

    const recentStories = await db.select().from(learningStories)
      .where(eq(learningStories.childId, childId)).orderBy(desc(learningStories.date)).limit(3);

    const activeGoals = await db.select().from(childGoals)
      .where(and(eq(childGoals.childId, childId), eq(childGoals.status, "active")));

    const recentMilestones = await db.select().from(childMilestones)
      .where(eq(childMilestones.childId, childId)).orderBy(desc(childMilestones.achievedDate)).limit(5);

    res.json({
      ok: true,
      child: { name: child.name, birthDate: child.birthDate, avatarColor: child.avatarColor },
      sparkScore: latestSpark || null,
      recentStories: recentStories.map(s => ({
        title: s.title, date: s.date,
        domains: s.domains ? JSON.parse(s.domains) : [],
      })),
      activeGoals: activeGoals.map(g => ({ title: g.title, category: g.category, progress: g.progress })),
      recentMilestones: recentMilestones.map(m => ({ title: m.title, category: m.category, achievedDate: m.achievedDate })),
    });
  });
}

// ─── Milestone Library Seed ─────────────────────────────────

async function seedMilestoneLibrary() {
  const existing = await db.select({ count: sql<number>`count(*)` }).from(milestoneLibrary);
  if (Number(existing[0]?.count || 0) > 0) return;

  console.log("Seeding milestone library...");
  const entries = [
    // 2-3 years
    { ageMin: 2, ageMax: 3, domain: "cognitive", title: "分类形状和颜色", desc: "能按形状或颜色分组物品" },
    { ageMin: 2, ageMax: 3, domain: "cognitive", title: "完成3-4片拼图", desc: "独立拼好简单拼图" },
    { ageMin: 2, ageMax: 3, domain: "language", title: "说2-3个词的句子", desc: "组合词语表达想法" },
    { ageMin: 2, ageMax: 3, domain: "language", title: "命名熟悉的物品", desc: "能识别和命名日常物品" },
    { ageMin: 2, ageMax: 3, domain: "social-emotional", title: "公开表达喜爱", desc: "拥抱、亲吻或关心他人" },
    { ageMin: 2, ageMax: 3, domain: "social-emotional", title: "在帮助下轮流", desc: "开始理解分享的概念" },
    { ageMin: 2, ageMax: 3, domain: "physical", title: "跑步和攀爬", desc: "自信地移动，爬游乐设施" },
    { ageMin: 2, ageMax: 3, domain: "creative", title: "用蜡笔涂鸦", desc: "有目的地在纸上画痕迹" },
    { ageMin: 2, ageMax: 3, domain: "independence", title: "用勺子自己吃饭", desc: "能独立使用餐具进食" },
    // 3-4 years
    { ageMin: 3, ageMax: 4, domain: "cognitive", title: "数到10", desc: "能准确数到10个物品" },
    { ageMin: 3, ageMax: 4, domain: "cognitive", title: "玩创意假装游戏", desc: "用玩偶、积木等创造想象场景" },
    { ageMin: 3, ageMax: 4, domain: "language", title: "说完整句子", desc: "经常使用4-5个词的句子" },
    { ageMin: 3, ageMax: 4, domain: "language", title: "讲简单的故事", desc: "能叙述一天中发生的事" },
    { ageMin: 3, ageMax: 4, domain: "social-emotional", title: "与他人合作玩耍", desc: "参与有共同目标的小组游戏" },
    { ageMin: 3, ageMax: 4, domain: "social-emotional", title: "关心哭泣的朋友", desc: "同理心和关爱的萌芽" },
    { ageMin: 3, ageMax: 4, domain: "physical", title: "骑三轮车", desc: "协调双腿踩踏板" },
    { ageMin: 3, ageMax: 4, domain: "creative", title: "画有目的的圆和线", desc: "有意识地画出可辨识的形状" },
    { ageMin: 3, ageMax: 4, domain: "independence", title: "独立上厕所", desc: "在最少帮助下完成如厕" },
    // 4-5 years
    { ageMin: 4, ageMax: 5, domain: "cognitive", title: "理解时间概念", desc: "掌握'昨天'、'今天'、'明天'" },
    { ageMin: 4, ageMax: 5, domain: "cognitive", title: "问'为什么'和'怎么'的问题", desc: "对事物运作方式表现出深度好奇" },
    { ageMin: 4, ageMax: 5, domain: "language", title: "认识一些字母和声音", desc: "识别字母和它们的发音" },
    { ageMin: 4, ageMax: 5, domain: "language", title: "能被陌生人理解", desc: "说话清晰，家人以外的人也能听懂" },
    { ageMin: 4, ageMax: 5, domain: "social-emotional", title: "协商解决冲突", desc: "不需要大人帮忙就能说'我先你后'" },
    { ageMin: 4, ageMax: 5, domain: "physical", title: "单脚跳", desc: "保持平衡并连续跳几次" },
    { ageMin: 4, ageMax: 5, domain: "physical", title: "使用剪刀", desc: "用儿童剪刀沿线剪切" },
    { ageMin: 4, ageMax: 5, domain: "creative", title: "画有2-4个身体部位的人", desc: "可辨识的人物画" },
    { ageMin: 4, ageMax: 5, domain: "independence", title: "独立穿脱衣服", desc: "管理纽扣和拉链基本没问题" },
    // 5-6 years
    { ageMin: 5, ageMax: 6, domain: "cognitive", title: "写自己的名字", desc: "能从记忆中写出名字" },
    { ageMin: 5, ageMax: 6, domain: "cognitive", title: "理解基本加法", desc: "能用物品或手指做小数加法" },
    { ageMin: 5, ageMax: 6, domain: "language", title: "认识押韵的词", desc: "识别和创造押韵" },
    { ageMin: 5, ageMax: 6, domain: "language", title: "按顺序复述故事", desc: "记住并排列故事事件" },
    { ageMin: 5, ageMax: 6, domain: "social-emotional", title: "理解'公平'和'不公平'", desc: "发展正义感" },
    { ageMin: 5, ageMax: 6, domain: "physical", title: "骑有辅助轮的自行车", desc: "踩踏、转向、保持平衡" },
    { ageMin: 5, ageMax: 6, domain: "creative", title: "画可辨识的场景", desc: "创造讲述故事的图画" },
    { ageMin: 5, ageMax: 6, domain: "independence", title: "准备简单零食", desc: "做三明治、倒麦片和牛奶" },
    // 6-7 years
    { ageMin: 6, ageMax: 7, domain: "cognitive", title: "独立阅读简单书籍", desc: "解码词语并理解简单故事" },
    { ageMin: 6, ageMax: 7, domain: "cognitive", title: "看整点时钟", desc: "读模拟时钟的整点" },
    { ageMin: 6, ageMax: 7, domain: "language", title: "写简单句子", desc: "用正确拼写组成原创句子" },
    { ageMin: 6, ageMax: 7, domain: "social-emotional", title: "不发脾气地处理挫折", desc: "大多数时候用语言而不是哭闹" },
    { ageMin: 6, ageMax: 7, domain: "physical", title: "骑无辅助轮自行车", desc: "独立平衡和骑行" },
    { ageMin: 6, ageMax: 7, domain: "creative", title: "创造详细的艺术作品", desc: "画作展现透视、细节和规划" },
    { ageMin: 6, ageMax: 7, domain: "independence", title: "系鞋带", desc: "能独立系和解鞋带" },
    // 7-8 years
    { ageMin: 7, ageMax: 8, domain: "cognitive", title: "阅读章节书", desc: "能在多次阅读中持续阅读" },
    { ageMin: 7, ageMax: 8, domain: "cognitive", title: "理解乘法概念", desc: "掌握重复加法和分组" },
    { ageMin: 7, ageMax: 8, domain: "language", title: "写段落", desc: "组织多句段落" },
    { ageMin: 7, ageMax: 8, domain: "social-emotional", title: "发展亲密友谊", desc: "维持更深、更有选择性的友谊" },
    { ageMin: 7, ageMax: 8, domain: "physical", title: "参加团队运动", desc: "理解规则并担任位置" },
    { ageMin: 7, ageMax: 8, domain: "creative", title: "写原创故事", desc: "创作有角色、情节和场景的小说" },
    { ageMin: 7, ageMax: 8, domain: "independence", title: "独立完成作业", desc: "不需要持续监督就能完成任务" },
    // 8-10 years
    { ageMin: 8, ageMax: 10, domain: "cognitive", title: "抽象思维", desc: "理解比喻、假设和'如果怎样'" },
    { ageMin: 8, ageMax: 10, domain: "cognitive", title: "独立研究主题", desc: "能找到和评估信息" },
    { ageMin: 8, ageMax: 10, domain: "language", title: "写多段文章", desc: "将思想组织成结构化的书面作品" },
    { ageMin: 8, ageMax: 10, domain: "social-emotional", title: "应对同伴压力", desc: "尽管群体影响仍做独立选择" },
    { ageMin: 8, ageMax: 10, domain: "social-emotional", title: "独立管理情绪", desc: "大多数时候不需要成人干预就能自我调节" },
    { ageMin: 8, ageMax: 10, domain: "physical", title: "在体育项目中表现出色", desc: "在运动、舞蹈或武术中展示技能发展" },
    { ageMin: 8, ageMax: 10, domain: "creative", title: "创造复杂的原创作品", desc: "详细的艺术、作曲、发明或故事" },
    { ageMin: 8, ageMax: 10, domain: "independence", title: "管理自己的日程", desc: "跟踪活动、作业和承诺" },
    { ageMin: 8, ageMax: 10, domain: "independence", title: "照顾宠物或植物", desc: "对另一个生命体持续负责" },
  ];

  for (const m of entries) {
    await db.insert(milestoneLibrary).values({
      ageMin: m.ageMin, ageMax: m.ageMax, domain: m.domain,
      title: m.title, description: m.desc,
    });
  }
  console.log(`Seeded ${entries.length} milestone library entries`);
}
