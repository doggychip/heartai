/**
 * Soul Match Routes (灵魂匹配 API)
 *
 * Endpoints for the composite personality matching engine:
 *   POST /api/soul-match/profile  — Save quiz results
 *   GET  /api/soul-match/profile  — Get own soul profile
 *   GET  /api/soul-match/matches  — Get matches (real + AI)
 */
import type { Express, Request, Response, NextFunction } from "express";
import { pool } from "./db";
import { writeMemory } from "./agent-memory";
import {
  ARCHETYPES,
  AI_FRIENDS,
  determineArchetype,
  computeMatchScore,
  generateMatchReasons,
  computeTraitBars,
  DIMS,
} from "./soul-matching";
import type { SoulMatchResult } from "@shared/schema";

function getUserId(req: Request): string {
  return (req as any).userId;
}

export function registerSoulMatchRoutes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
) {
  // ─── Save / Update Soul Profile ─────────────────────────────
  app.post("/api/soul-match/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { scores, interests, displayName } = req.body;

      if (!scores || typeof scores !== "object") {
        return res.status(400).json({ error: "请完成人格测试" });
      }

      // Validate all 9 dimensions exist
      for (const dim of DIMS) {
        if (typeof scores[dim] !== "number") {
          scores[dim] = 0;
        }
      }

      const archetype = determineArchetype(scores);
      const now = new Date().toISOString();

      // Get user's nickname as fallback display name
      let finalDisplayName = displayName;
      if (!finalDisplayName) {
        const userResult = await pool.query(
          `SELECT nickname, username FROM users WHERE id = $1`, [userId]
        );
        finalDisplayName = userResult.rows[0]?.nickname || userResult.rows[0]?.username || "灵魂旅者";
      }

      // UPSERT
      await pool.query(`
        INSERT INTO soul_profiles (user_id, scores, archetype, archetype_name, archetype_emoji, interests, display_name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
        ON CONFLICT (user_id) DO UPDATE SET
          scores = EXCLUDED.scores,
          archetype = EXCLUDED.archetype,
          archetype_name = EXCLUDED.archetype_name,
          archetype_emoji = EXCLUDED.archetype_emoji,
          interests = EXCLUDED.interests,
          display_name = EXCLUDED.display_name,
          updated_at = EXCLUDED.updated_at
      `, [
        userId,
        JSON.stringify(scores),
        archetype.id,
        archetype.name,
        archetype.emoji,
        interests || [],
        finalDisplayName,
        now,
      ]);

      const traitBars = computeTraitBars(scores);

      res.json({
        profile: {
          scores,
          archetype: archetype.id,
          archetypeName: archetype.name,
          archetypeEmoji: archetype.emoji,
          archetypeColor: archetype.color,
          archetypeDescription: archetype.description,
          traitBars,
          interests: interests || [],
          displayName: finalDisplayName,
        },
      });

      // Write soul archetype to agent memory for chat context
      writeMemory({
        agentKey: "soul-match",
        userId,
        category: "soul_archetype",
        summary: `灵魂原型: ${archetype.name}(${archetype.emoji}) — ${archetype.description.slice(0, 60)}`,
        details: { archetypeId: archetype.id, archetypeName: archetype.name, archetypeEmoji: archetype.emoji, scores },
        importance: 7,
        ttlHours: 24 * 90,
      }).catch(err => console.error("[soul-match] memory write error:", err));
    } catch (err) {
      console.error("Soul match profile save error:", err);
      res.status(500).json({ error: "保存灵魂档案失败" });
    }
  });

  // ─── Get Own Soul Profile ───────────────────────────────────
  app.get("/api/soul-match/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const result = await pool.query(
        `SELECT * FROM soul_profiles WHERE user_id = $1`, [userId]
      );
      const row = result.rows[0];
      if (!row) {
        return res.json({ profile: null });
      }

      const scores = typeof row.scores === "string" ? JSON.parse(row.scores) : row.scores;
      const arch = ARCHETYPES.find(a => a.id === row.archetype) || ARCHETYPES[0];
      const traitBars = computeTraitBars(scores);

      res.json({
        profile: {
          scores,
          archetype: row.archetype,
          archetypeName: row.archetype_name,
          archetypeEmoji: row.archetype_emoji,
          archetypeColor: arch.color,
          archetypeDescription: arch.description,
          traitBars,
          interests: row.interests || [],
          displayName: row.display_name,
        },
      });
    } catch (err) {
      console.error("Soul match profile get error:", err);
      res.status(500).json({ error: "获取灵魂档案失败" });
    }
  });

  // ─── Get Matches ────────────────────────────────────────────
  app.get("/api/soul-match/matches", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      // Load own profile
      const myResult = await pool.query(
        `SELECT scores, interests FROM soul_profiles WHERE user_id = $1`, [userId]
      );
      const myRow = myResult.rows[0];
      if (!myRow) {
        return res.status(400).json({ error: "请先完成灵魂测试" });
      }

      const myScores = typeof myRow.scores === "string" ? JSON.parse(myRow.scores) : myRow.scores;
      const myInterests: string[] = myRow.interests || [];
      const me = { scores: myScores, interests: myInterests };

      // Load all other soul profiles (join with users for nickname/avatar)
      const othersResult = await pool.query(`
        SELECT sp.user_id, sp.scores, sp.archetype, sp.archetype_name, sp.archetype_emoji,
               sp.interests, sp.display_name, u.nickname, u.avatar_url
        FROM soul_profiles sp
        JOIN users u ON u.id = sp.user_id
        WHERE sp.user_id != $1
        LIMIT 200
      `, [userId]);

      // Score real users
      const realMatches: SoulMatchResult[] = othersResult.rows.map(row => {
        const otherScores = typeof row.scores === "string" ? JSON.parse(row.scores) : row.scores;
        const otherInterests: string[] = row.interests || [];
        const other = { scores: otherScores, interests: otherInterests };
        const arch = ARCHETYPES.find(a => a.id === row.archetype) || ARCHETYPES[0];

        return {
          userId: row.user_id,
          nickname: row.display_name || row.nickname || "灵魂旅者",
          avatarUrl: row.avatar_url,
          archetype: row.archetype,
          archetypeName: row.archetype_name,
          archetypeEmoji: row.archetype_emoji,
          archetypeColor: arch.color,
          matchScore: computeMatchScore(me, other),
          matchReasons: generateMatchReasons(myScores, otherScores, myInterests, otherInterests),
          interests: otherInterests,
          isAi: false,
        };
      })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 20);

      // Score AI friends
      const aiMatches: SoulMatchResult[] = AI_FRIENDS.map(f => {
        const other = { scores: f.scores, interests: f.interests };
        const arch = ARCHETYPES.find(a => a.name === f.archetype);
        return {
          userId: f.id,
          nickname: f.name,
          avatarUrl: null,
          archetype: arch?.id || "dreamer",
          archetypeName: f.archetype,
          archetypeEmoji: f.emoji,
          archetypeColor: arch?.color || "#7C5CFC",
          matchScore: computeMatchScore(me, other),
          matchReasons: generateMatchReasons(myScores, f.scores, myInterests, f.interests),
          interests: f.interests,
          bio: f.bio,
          isAi: true,
        };
      }).sort((a, b) => b.matchScore - a.matchScore);

      // User count for display
      const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM soul_profiles`);
      const totalProfiles = parseInt(countResult.rows[0].cnt) || 0;

      res.json({ realMatches, aiMatches, totalProfiles });
    } catch (err) {
      console.error("Soul match matches error:", err);
      res.status(500).json({ error: "获取匹配结果失败" });
    }
  });

  // ─── Profile Count (public, for welcome screen) ─────────────
  app.get("/api/soul-match/count", async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`SELECT COUNT(*) as cnt FROM soul_profiles`);
      res.json({ count: parseInt(result.rows[0].cnt) || 0 });
    } catch {
      res.json({ count: 0 });
    }
  });
}
