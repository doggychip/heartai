// Child Development Tracker API routes
import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { children, childGoals, childSchedule, childMilestones, childDailyLog } from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";

function getUserId(req: Request): string {
  return (req as any).userId;
}

export function registerChildTrackerRoutes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void
) {
  // ─── Children CRUD ──────────────────────────────────────────

  // GET /api/children — list all children for the user
  app.get("/api/children", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const result = await db.select().from(children)
        .where(eq(children.userId, userId))
        .orderBy(asc(children.name));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/children — add a child
  app.post("/api/children", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { name, birthDate, avatarColor, notes } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Name is required" });
      }
      const [child] = await db.insert(children).values({
        userId,
        name: name.trim(),
        birthDate: birthDate || null,
        avatarColor: avatarColor || "#8b5cf6",
        notes: notes || null,
      }).returning();
      res.json(child);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/children/:id — update a child
  app.patch("/api/children/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { name, birthDate, avatarColor, notes } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name.trim();
      if (birthDate !== undefined) updates.birthDate = birthDate;
      if (avatarColor !== undefined) updates.avatarColor = avatarColor;
      if (notes !== undefined) updates.notes = notes;

      const [updated] = await db.update(children).set(updates)
        .where(and(eq(children.id, id), eq(children.userId, userId)))
        .returning();
      if (!updated) return res.status(404).json({ error: "Child not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/children/:id
  app.delete("/api/children/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      // Delete related data first
      await db.delete(childGoals).where(and(eq(childGoals.childId, id), eq(childGoals.userId, userId)));
      await db.delete(childSchedule).where(and(eq(childSchedule.childId, id), eq(childSchedule.userId, userId)));
      await db.delete(childMilestones).where(and(eq(childMilestones.childId, id), eq(childMilestones.userId, userId)));
      await db.delete(childDailyLog).where(and(eq(childDailyLog.childId, id), eq(childDailyLog.userId, userId)));
      const [deleted] = await db.delete(children)
        .where(and(eq(children.id, id), eq(children.userId, userId)))
        .returning();
      if (!deleted) return res.status(404).json({ error: "Child not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Goals CRUD ─────────────────────────────────────────────

  // GET /api/children/:childId/goals
  app.get("/api/children/:childId/goals", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { childId } = req.params;
      const result = await db.select().from(childGoals)
        .where(and(eq(childGoals.childId, childId), eq(childGoals.userId, userId)))
        .orderBy(desc(childGoals.createdAt));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/children/:childId/goals
  app.post("/api/children/:childId/goals", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { childId } = req.params;
      const { category, title, description, targetDate } = req.body;
      if (!title || !category) {
        return res.status(400).json({ error: "Title and category are required" });
      }
      const [goal] = await db.insert(childGoals).values({
        childId,
        userId,
        category,
        title: title.trim(),
        description: description || null,
        targetDate: targetDate || null,
      }).returning();
      res.json(goal);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/children/:childId/goals/:goalId
  app.patch("/api/children/:childId/goals/:goalId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { goalId } = req.params;
      const { title, description, targetDate, status, progress, category } = req.body;
      const updates: any = { updatedAt: new Date() };
      if (title !== undefined) updates.title = title.trim();
      if (description !== undefined) updates.description = description;
      if (targetDate !== undefined) updates.targetDate = targetDate;
      if (status !== undefined) updates.status = status;
      if (progress !== undefined) updates.progress = Math.max(0, Math.min(100, progress));
      if (category !== undefined) updates.category = category;

      const [updated] = await db.update(childGoals).set(updates)
        .where(and(eq(childGoals.id, goalId), eq(childGoals.userId, userId)))
        .returning();
      if (!updated) return res.status(404).json({ error: "Goal not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/children/:childId/goals/:goalId
  app.delete("/api/children/:childId/goals/:goalId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { goalId } = req.params;
      await db.delete(childGoals).where(and(eq(childGoals.id, goalId), eq(childGoals.userId, userId)));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Schedule CRUD ──────────────────────────────────────────

  // GET /api/children/:childId/schedule
  app.get("/api/children/:childId/schedule", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { childId } = req.params;
      const result = await db.select().from(childSchedule)
        .where(and(eq(childSchedule.childId, childId), eq(childSchedule.userId, userId)))
        .orderBy(asc(childSchedule.dayOfWeek), asc(childSchedule.startTime));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/children/:childId/schedule
  app.post("/api/children/:childId/schedule", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { childId } = req.params;
      const { dayOfWeek, startTime, endTime, activity, category, color } = req.body;
      if (dayOfWeek === undefined || !startTime || !endTime || !activity) {
        return res.status(400).json({ error: "dayOfWeek, startTime, endTime, and activity are required" });
      }
      const [entry] = await db.insert(childSchedule).values({
        childId,
        userId,
        dayOfWeek,
        startTime,
        endTime,
        activity: activity.trim(),
        category: category || null,
        color: color || null,
      }).returning();
      res.json(entry);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/children/:childId/schedule/:entryId
  app.patch("/api/children/:childId/schedule/:entryId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { entryId } = req.params;
      const { dayOfWeek, startTime, endTime, activity, category, color } = req.body;
      const updates: any = {};
      if (dayOfWeek !== undefined) updates.dayOfWeek = dayOfWeek;
      if (startTime !== undefined) updates.startTime = startTime;
      if (endTime !== undefined) updates.endTime = endTime;
      if (activity !== undefined) updates.activity = activity.trim();
      if (category !== undefined) updates.category = category;
      if (color !== undefined) updates.color = color;

      const [updated] = await db.update(childSchedule).set(updates)
        .where(and(eq(childSchedule.id, entryId), eq(childSchedule.userId, userId)))
        .returning();
      if (!updated) return res.status(404).json({ error: "Schedule entry not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/children/:childId/schedule/:entryId
  app.delete("/api/children/:childId/schedule/:entryId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { entryId } = req.params;
      await db.delete(childSchedule).where(and(eq(childSchedule.id, entryId), eq(childSchedule.userId, userId)));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Milestones CRUD ────────────────────────────────────────

  // GET /api/children/:childId/milestones
  app.get("/api/children/:childId/milestones", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { childId } = req.params;
      const result = await db.select().from(childMilestones)
        .where(and(eq(childMilestones.childId, childId), eq(childMilestones.userId, userId)))
        .orderBy(desc(childMilestones.achievedDate));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/children/:childId/milestones
  app.post("/api/children/:childId/milestones", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { childId } = req.params;
      const { title, description, category, achievedDate } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }
      const [milestone] = await db.insert(childMilestones).values({
        childId,
        userId,
        title: title.trim(),
        description: description || null,
        category: category || null,
        achievedDate: achievedDate || new Date().toISOString().split("T")[0],
      }).returning();
      res.json(milestone);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/children/:childId/milestones/:milestoneId
  app.delete("/api/children/:childId/milestones/:milestoneId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { milestoneId } = req.params;
      await db.delete(childMilestones).where(and(eq(childMilestones.id, milestoneId), eq(childMilestones.userId, userId)));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Daily Log CRUD ─────────────────────────────────────────

  // GET /api/children/:childId/daily-log
  app.get("/api/children/:childId/daily-log", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { childId } = req.params;
      const result = await db.select().from(childDailyLog)
        .where(and(eq(childDailyLog.childId, childId), eq(childDailyLog.userId, userId)))
        .orderBy(desc(childDailyLog.date))
        .limit(30);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/children/:childId/daily-log
  app.post("/api/children/:childId/daily-log", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { childId } = req.params;
      const { date, mood, sleepHours, notes, highlights } = req.body;
      if (!date) {
        return res.status(400).json({ error: "Date is required" });
      }
      const [entry] = await db.insert(childDailyLog).values({
        childId,
        userId,
        date,
        mood: mood || null,
        sleepHours: sleepHours || null,
        notes: notes || null,
        highlights: highlights || null,
      }).returning();
      res.json(entry);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/children/:childId/daily-log/:logId
  app.patch("/api/children/:childId/daily-log/:logId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { logId } = req.params;
      const { mood, sleepHours, notes, highlights } = req.body;
      const updates: any = {};
      if (mood !== undefined) updates.mood = mood;
      if (sleepHours !== undefined) updates.sleepHours = sleepHours;
      if (notes !== undefined) updates.notes = notes;
      if (highlights !== undefined) updates.highlights = highlights;

      const [updated] = await db.update(childDailyLog).set(updates)
        .where(and(eq(childDailyLog.id, logId), eq(childDailyLog.userId, userId)))
        .returning();
      if (!updated) return res.status(404).json({ error: "Log entry not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
