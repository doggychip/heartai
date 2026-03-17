/**
 * Phase 2 Routes: Gamification, Matching, Governance
 */
import type { Express, Request, Response, NextFunction } from "express";
import { pool } from "./db";
import { getAIClient, getFortuneClient, DEFAULT_MODEL, FORTUNE_MODEL } from "./ai-config";
import lunisolar from "lunisolar";

// ─── Helper: get userId from request ────────────────────────
function getUserId(req: Request): string {
  return (req as any).userId;
}

// ─── Wuxing helpers (duplicated locally for module isolation) ─
function getStemElement(stem: string): string {
  const map: Record<string, string> = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
  };
  return map[stem] || '';
}

// Five element relationships
const WX_SHENG: Record<string, string> = { '金': '水', '水': '木', '木': '火', '火': '土', '土': '金' };
const WX_KE: Record<string, string> = { '金': '木', '木': '土', '土': '水', '水': '火', '火': '金' };

// 天乙贵人
const TIANYI: Record<string, string[]> = {
  '甲': ['丑', '未'], '乙': ['子', '申'], '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '戊': ['丑', '未'], '己': ['子', '申'], '庚': ['丑', '未'], '辛': ['寅', '午'],
  '壬': ['卯', '巳'], '癸': ['卯', '巳'],
};

// Zodiac compatibility
const SANHE: Record<string, string[]> = {
  '子': ['辰', '申'], '丑': ['巳', '酉'], '寅': ['午', '戌'], '卯': ['未', '亥'],
  '辰': ['子', '申'], '巳': ['丑', '酉'], '午': ['寅', '戌'], '未': ['卯', '亥'],
  '申': ['子', '辰'], '酉': ['丑', '巳'], '戌': ['寅', '午'], '亥': ['卯', '未'],
};
const LIUHE: Record<string, string> = {
  '子': '丑', '丑': '子', '寅': '亥', '卯': '戌', '辰': '酉', '巳': '申',
  '午': '未', '未': '午', '申': '巳', '酉': '辰', '戌': '卯', '亥': '寅',
};
const XIANGCHONG: Record<string, string> = {
  '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
};

const ZODIAC_BRANCH: Record<string, string> = {
  '鼠': '子', '牛': '丑', '虎': '寅', '兔': '卯', '龙': '辰', '蛇': '巳',
  '马': '午', '羊': '未', '猴': '申', '鸡': '酉', '狗': '戌', '猪': '亥',
};

// ─── AI Avatar IDs ──────────────────────────────────────────
const AVATAR_IDS = [
  { id: "cfd2636b-fcb0-498b-891d-a576fead3139", name: "玄机子" },
  { id: "a35dd36d-163a-407c-b472-f5b2546727ba", name: "星河散人" },
  { id: "8cf95845-88f4-4bd1-bef3-7f6a58294600", name: "观星小助手" },
  { id: "a1a00269-8e33-41c2-a917-f3207fc9e235", name: "云山道人" },
];

// ─── Merit helper (fire-and-forget) ──────────────────────────
export async function awardMerit(userId: string, action: string, amount: number, description: string) {
  try {
    await pool.query(
      `INSERT INTO user_merits (id, user_id, action, merit_amount, description, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()::TEXT)`,
      [userId, action, amount, description]
    );
  } catch (err) {
    console.error("[merit] Award error:", err);
  }
}

// ─── Badge check helper ──────────────────────────────────────
async function checkAndAwardBadges(userId: string): Promise<Array<{ badgeType: string; badgeName: string; badgeIcon: string }>> {
  const newBadges: Array<{ badgeType: string; badgeName: string; badgeIcon: string }> = [];

  const BADGE_DEFS = [
    { type: 'first_checkin', name: '入门弟子', icon: '🔰', check: async () => { const r = await pool.query(`SELECT COUNT(*) as c FROM user_checkins WHERE user_id=$1`, [userId]); return parseInt(r.rows[0].c) >= 1; } },
    { type: 'streak_7', name: '勤修不辍', icon: '🔥', check: async () => { const r = await pool.query(`SELECT MAX(streak) as m FROM user_checkins WHERE user_id=$1`, [userId]); return parseInt(r.rows[0].m || '0') >= 7; } },
    { type: 'checkin_30', name: '见习道长', icon: '⭐', check: async () => { const r = await pool.query(`SELECT COUNT(*) as c FROM user_checkins WHERE user_id=$1`, [userId]); return parseInt(r.rows[0].c) >= 30; } },
    { type: 'checkin_100', name: '一代宗师', icon: '👑', check: async () => { const r = await pool.query(`SELECT COUNT(*) as c FROM user_checkins WHERE user_id=$1`, [userId]); return parseInt(r.rows[0].c) >= 100; } },
    { type: 'posts_10', name: '社区达人', icon: '📝', check: async () => { const r = await pool.query(`SELECT COUNT(*) as c FROM community_posts WHERE user_id=$1`, [userId]); return parseInt(r.rows[0].c) >= 10; } },
    { type: 'comments_50', name: '知心好友', icon: '💬', check: async () => { const r = await pool.query(`SELECT COUNT(*) as c FROM post_comments WHERE user_id=$1`, [userId]); return parseInt(r.rows[0].c) >= 50; } },
    { type: 'group_chat_5', name: '问道先锋', icon: '🏮', check: async () => { const r = await pool.query(`SELECT COUNT(*) as c FROM group_chat_sessions WHERE user_id=$1`, [userId]); return parseInt(r.rows[0].c) >= 5; } },
  ];

  for (const def of BADGE_DEFS) {
    // Check if already earned
    const existing = await pool.query(`SELECT 1 FROM user_badges WHERE user_id=$1 AND badge_type=$2`, [userId, def.type]);
    if (existing.rows.length > 0) continue;

    const earned = await def.check();
    if (earned) {
      await pool.query(
        `INSERT INTO user_badges (id, user_id, badge_type, badge_name, badge_icon, earned_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()::TEXT) ON CONFLICT DO NOTHING`,
        [userId, def.type, def.name, def.icon]
      );
      newBadges.push({ badgeType: def.type, badgeName: def.name, badgeIcon: def.icon });
    }
  }
  return newBadges;
}

// ─── Get user's element from birthdate ───────────────────────
function getUserElement(birthDate: string | null | undefined, birthHour?: number | null): string | null {
  if (!birthDate) return null;
  try {
    const hour = birthHour ?? 12;
    const d = lunisolar(`${birthDate.replace(/-/g, '/')} ${hour}:00`);
    return getStemElement(d.char8.day.stem.toString());
  } catch {
    return null;
  }
}

function getUserZodiacBranch(birthDate: string | null | undefined): string | null {
  if (!birthDate) return null;
  try {
    const d = lunisolar(birthDate.replace(/-/g, '/'));
    return d.char8.year.branch.toString();
  } catch {
    return null;
  }
}

// ─── Compute wuxing compatibility score ──────────────────────
function computeWuxingScore(el1: string, el2: string): { score: number; type: string; reason: string } {
  if (el1 === el2) {
    return { score: 70, type: '比和型', reason: `同属${el1}命，性格相似，容易产生共鸣` };
  }
  if (WX_SHENG[el1] === el2) {
    return { score: 90, type: '灵魂共振型', reason: `${el1}生${el2}，你的能量滋养对方，关系和谐` };
  }
  if (WX_SHENG[el2] === el1) {
    return { score: 85, type: '互补成长型', reason: `${el2}生${el1}，对方的能量补充你的不足` };
  }
  if (WX_KE[el1] === el2) {
    return { score: 45, type: '欢喜冤家型', reason: `${el1}克${el2}，有摩擦但也有激情和成长` };
  }
  if (WX_KE[el2] === el1) {
    return { score: 50, type: '欢喜冤家型', reason: `${el2}克${el1}，挑战中带来蜕变` };
  }
  return { score: 60, type: '知己良友型', reason: `${el1}与${el2}间接相连，互不干扰` };
}

// ─── AMA auto-scheduling ────────────────────────────────────
async function ensureWeeklyAMA() {
  try {
    const active = await pool.query(`SELECT id FROM ama_sessions WHERE status='active' LIMIT 1`);
    if (active.rows.length > 0) return; // Already have one

    // Determine which avatar to use (rotate)
    const lastAma = await pool.query(`SELECT avatar_id FROM ama_sessions ORDER BY created_at DESC LIMIT 1`);
    let avatarIdx = 0;
    if (lastAma.rows.length > 0) {
      const lastIdx = AVATAR_IDS.findIndex(a => a.id === lastAma.rows[0].avatar_id);
      avatarIdx = (lastIdx + 1) % AVATAR_IDS.length;
    }
    const avatar = AVATAR_IDS[avatarIdx];

    // Generate topic based on current solar term/season
    let topic = `${avatar.name}开讲：命理与生活的智慧`;
    try {
      const d = lunisolar();
      const solarTerm = d.solarTerm?.toString() || '';
      const month = new Date().getMonth() + 1;
      const season = month <= 3 ? '春' : month <= 6 ? '夏' : month <= 9 ? '秋' : '冬';
      const seasonTopics: Record<string, string[]> = {
        '春': ['如何在春季把握事业转折点', '春生之气与个人成长', '新年运势规划指南'],
        '夏': ['夏日心火旺盛如何调节情绪', '事业高峰期的运势把握', '人际关系的五行平衡'],
        '秋': ['秋收时节的人生复盘', '如何利用金气提升决断力', '感情运势的秋季转折'],
        '冬': ['冬藏之道与来年规划', '年末运势总结与展望', '如何在低谷期蓄积能量'],
      };
      const topics = seasonTopics[season] || seasonTopics['春'];
      const picked = topics[Math.floor(Math.random() * topics.length)];
      topic = `${avatar.name}开讲${solarTerm ? `·${solarTerm}` : ''}：${picked}`;
    } catch {}

    await pool.query(
      `INSERT INTO ama_sessions (id, avatar_id, topic, description, status, created_at, closes_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'active', NOW()::TEXT, (NOW() + INTERVAL '7 days')::TEXT)`,
      [avatar.id, topic, `本期由${avatar.name}主持，欢迎提问！`]
    );
    console.log(`[ama] Created weekly AMA: ${topic}`);
  } catch (err) {
    console.error("[ama] ensureWeeklyAMA error:", err);
  }
}

// ─── Friendliness check ──────────────────────────────────────
async function checkFriendliness(content: string): Promise<string | null> {
  try {
    const client = getFortuneClient();
    const resp = await client.chat.completions.create({
      model: FORTUNE_MODEL,
      max_tokens: 100,
      messages: [
        {
          role: "system",
          content: `你是社区管理助手。判断以下内容是否适合一个温暖友善的命理社区。回复JSON: {"ok": true/false, "suggestion": "建议文字(如果不ok)"}。只有明显攻击性、侮辱性、或非常消极的内容才判为不ok，普通的讨论和不同意见是ok的。`
        },
        { role: "user", content }
      ],
    });
    const raw = resp.choices[0]?.message?.content?.trim() || '{"ok":true}';
    const cleaned = raw.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    const result = JSON.parse(cleaned);
    if (!result.ok && result.suggestion) {
      return result.suggestion;
    }
    return null;
  } catch {
    return null; // On error, don't block
  }
}

// ═══════════════════════════════════════════════════════════════
// Register Phase 2 routes
// ═══════════════════════════════════════════════════════════════
export function registerPhase2Routes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void
) {

  // ─── Feature 4a: Check-in (签到) ─────────────────────────────
  app.post("/api/checkin", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const today = new Date().toISOString().split('T')[0];

      // Check if already checked in
      const existing = await pool.query(
        `SELECT * FROM user_checkins WHERE user_id=$1 AND checkin_date=$2`, [userId, today]
      );
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        const totalMerit = await pool.query(`SELECT COALESCE(SUM(merit_amount), 0) as total FROM user_merits WHERE user_id=$1`, [userId]);
        return res.json({
          checkin: {
            date: row.checkin_date,
            streak: row.streak,
            meritEarned: row.merit_earned,
            dailyMessage: row.daily_message,
            totalMerit: parseInt(totalMerit.rows[0].total),
          },
          isNew: false,
        });
      }

      // Calculate streak
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const lastCheckin = await pool.query(
        `SELECT streak FROM user_checkins WHERE user_id=$1 AND checkin_date=$2`, [userId, yesterday]
      );
      const streak = lastCheckin.rows.length > 0 ? parseInt(lastCheckin.rows[0].streak) + 1 : 1;

      // Merit: base 10 + streak bonus (max 20 extra)
      const meritEarned = 10 + Math.min(streak * 2, 20);

      // Generate daily message using lunisolar
      let dailyMessage = '今日宜静心修炼，积累功德';
      try {
        const d = lunisolar();
        const dayStem = d.char8.day.stem.toString();
        const dayBranch = d.char8.day.branch.toString();
        const dayEl = getStemElement(dayStem);
        const tg = (d as any).theGods;
        const goodActs = tg?.getGoodActs?.('day')?.slice(0, 3).map((a: any) => a.toString()).join('、') || '诸事皆宜';
        dailyMessage = `今日${dayStem}${dayBranch}${dayEl}日，宜${goodActs}`;
      } catch {}

      // Insert checkin
      await pool.query(
        `INSERT INTO user_checkins (id, user_id, checkin_date, streak, merit_earned, daily_message, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()::TEXT)`,
        [userId, today, streak, meritEarned, dailyMessage]
      );

      // Award merit
      await awardMerit(userId, 'checkin', meritEarned, `每日签到 (连续${streak}天)`);

      const totalMerit = await pool.query(`SELECT COALESCE(SUM(merit_amount), 0) as total FROM user_merits WHERE user_id=$1`, [userId]);

      // Check badges (fire-and-forget but return new ones)
      const newBadges = await checkAndAwardBadges(userId);

      res.json({
        checkin: {
          date: today,
          streak,
          meritEarned,
          dailyMessage,
          totalMerit: parseInt(totalMerit.rows[0].total),
        },
        isNew: true,
        newBadges,
      });
    } catch (err) {
      console.error("Checkin error:", err);
      res.status(500).json({ error: "签到失败" });
    }
  });

  // ─── Feature 4a: Merit Summary ────────────────────────────────
  app.get("/api/merits/summary", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      const totalMerit = await pool.query(`SELECT COALESCE(SUM(merit_amount), 0) as total FROM user_merits WHERE user_id=$1`, [userId]);
      const totalCheckins = await pool.query(`SELECT COUNT(*) as c FROM user_checkins WHERE user_id=$1`, [userId]);

      // Current streak
      let currentStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      const todayCheckin = await pool.query(`SELECT streak FROM user_checkins WHERE user_id=$1 AND checkin_date=$2`, [userId, today]);
      if (todayCheckin.rows.length > 0) {
        currentStreak = parseInt(todayCheckin.rows[0].streak);
      } else {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const ydayCheckin = await pool.query(`SELECT streak FROM user_checkins WHERE user_id=$1 AND checkin_date=$2`, [userId, yesterday]);
        if (ydayCheckin.rows.length > 0) {
          currentStreak = parseInt(ydayCheckin.rows[0].streak);
        }
      }

      // Rank
      const rank = await pool.query(
        `SELECT COUNT(*) + 1 as rank FROM (
          SELECT user_id, SUM(merit_amount) as total FROM user_merits GROUP BY user_id
          HAVING SUM(merit_amount) > (SELECT COALESCE(SUM(merit_amount), 0) FROM user_merits WHERE user_id=$1)
        ) sub`,
        [userId]
      );

      // Recent history
      const history = await pool.query(
        `SELECT action, merit_amount, description, created_at FROM user_merits WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`,
        [userId]
      );

      res.json({
        totalMerit: parseInt(totalMerit.rows[0].total),
        currentStreak,
        totalCheckins: parseInt(totalCheckins.rows[0].c),
        rank: parseInt(rank.rows[0].rank),
        recentHistory: history.rows.map(r => ({
          action: r.action,
          meritAmount: r.merit_amount,
          description: r.description,
          createdAt: r.created_at,
        })),
      });
    } catch (err) {
      console.error("Merit summary error:", err);
      res.status(500).json({ error: "获取功德信息失败" });
    }
  });

  // ─── Feature 4a: Leaderboard (public) ─────────────────────────
  app.get("/api/merits/leaderboard", async (_req: Request, res: Response) => {
    try {
      const leaders = await pool.query(`
        SELECT m.user_id, u.nickname, COALESCE(SUM(m.merit_amount), 0) as total_merit,
          (SELECT MAX(c.streak) FROM user_checkins c WHERE c.user_id = m.user_id) as max_streak,
          (SELECT b.badge_icon || ' ' || b.badge_name FROM user_badges b WHERE b.user_id = m.user_id ORDER BY b.earned_at DESC LIMIT 1) as top_badge
        FROM user_merits m
        JOIN users u ON u.id = m.user_id
        GROUP BY m.user_id, u.nickname
        ORDER BY total_merit DESC
        LIMIT 20
      `);

      res.json({
        leaders: leaders.rows.map((r, i) => ({
          rank: i + 1,
          userId: r.user_id,
          nickname: r.nickname || '修行者',
          totalMerit: parseInt(r.total_merit),
          streak: parseInt(r.max_streak || '0'),
          topBadge: r.top_badge || null,
        })),
      });
    } catch (err) {
      console.error("Leaderboard error:", err);
      res.status(500).json({ error: "排行榜加载失败" });
    }
  });

  // ─── Feature 4a: Badges ───────────────────────────────────────
  app.get("/api/badges", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      // Check and award any new badges first
      await checkAndAwardBadges(userId);

      const badges = await pool.query(
        `SELECT badge_type, badge_name, badge_icon, earned_at FROM user_badges WHERE user_id=$1 ORDER BY earned_at`,
        [userId]
      );

      res.json({
        badges: badges.rows.map(r => ({
          badgeType: r.badge_type,
          badgeName: r.badge_name,
          badgeIcon: r.badge_icon,
          earnedAt: r.earned_at,
        })),
      });
    } catch (err) {
      console.error("Badges error:", err);
      res.status(500).json({ error: "获取成就失败" });
    }
  });

  // ─── Feature 3a: Destiny Matching ─────────────────────────────
  app.get("/api/matching/destiny", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      // Get current user's profile
      const meResult = await pool.query(`SELECT birth_date, birth_hour, zodiac_sign, mbti_type, nickname FROM users WHERE id=$1`, [userId]);
      const me = meResult.rows[0];
      if (!me?.birth_date) {
        return res.json({ matches: [], needsProfile: true });
      }

      const myElement = getUserElement(me.birth_date, me.birth_hour);
      const myBranch = getUserZodiacBranch(me.birth_date);
      if (!myElement) {
        return res.json({ matches: [], needsProfile: true });
      }

      // Get other users with birthdates
      const others = await pool.query(
        `SELECT id, nickname, birth_date, birth_hour, zodiac_sign, mbti_type FROM users
         WHERE birth_date IS NOT NULL AND id != $1 AND is_agent = false LIMIT 100`,
        [userId]
      );

      const matches = others.rows.map(other => {
        const theirElement = getUserElement(other.birth_date, other.birth_hour);
        const theirBranch = getUserZodiacBranch(other.birth_date);
        if (!theirElement) return null;

        // Wuxing score
        const wx = computeWuxingScore(myElement, theirElement);
        let score = wx.score;

        // Zodiac compatibility bonus/penalty
        if (myBranch && theirBranch) {
          if (SANHE[myBranch]?.includes(theirBranch)) score = Math.min(100, score + 10);
          if (LIUHE[myBranch] === theirBranch) score = Math.min(100, score + 8);
          if (XIANGCHONG[myBranch] === theirBranch) score = Math.max(20, score - 10);
        }

        return {
          userId: other.id,
          nickname: other.nickname || '修行者',
          zodiac: other.zodiac_sign || null,
          mbti: other.mbti_type || null,
          wuxing: theirElement,
          score,
          type: wx.type,
          reason: wx.reason,
        };
      }).filter(Boolean).sort((a: any, b: any) => b.score - a.score).slice(0, 10);

      res.json({ matches });
    } catch (err) {
      console.error("Destiny matching error:", err);
      res.status(500).json({ error: "缘分配对失败" });
    }
  });

  // ─── Feature 3b: Today's Noble (贵人) ─────────────────────────
  app.get("/api/matching/today-noble", requireAuth, async (req: Request, res: Response) => {
    try {
      const d = lunisolar();
      const todayStem = d.char8.day.stem.toString();
      const todayBranch = d.char8.day.branch.toString();
      const todayElement = getStemElement(todayStem);

      // 贵人 branches from TIANYI table
      const nobleBranches = TIANYI[todayStem] || [];
      // Map branches to elements
      const branchToElement: Record<string, string> = {
        '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
        '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
      };
      const nobleElements = [...new Set(nobleBranches.map(b => branchToElement[b]).filter(Boolean))];

      // Find users whose dominant element matches
      const allUsers = await pool.query(
        `SELECT id, nickname, birth_date, birth_hour, zodiac_sign FROM users
         WHERE birth_date IS NOT NULL AND is_agent = false LIMIT 200`
      );

      const nobles = allUsers.rows
        .map(u => {
          const el = getUserElement(u.birth_date, u.birth_hour);
          if (!el || !nobleElements.includes(el)) return null;
          return {
            userId: u.id,
            nickname: u.nickname || '修行者',
            zodiac: u.zodiac_sign || null,
            wuxing: el,
            reason: `今日${todayStem}${todayBranch}(${todayElement})日，${nobleBranches.join('、')}为贵人方位，${el}命之人是今日贵人`,
          };
        })
        .filter(Boolean)
        .slice(0, 3);

      res.json({
        todayStem,
        todayBranch,
        todayElement,
        nobles,
      });
    } catch (err) {
      console.error("Today noble error:", err);
      res.status(500).json({ error: "获取今日贵人失败" });
    }
  });

  // ─── Feature 5a: AMA Active Session ───────────────────────────
  app.get("/api/ama/active", async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT s.*, u.nickname as avatar_name FROM ama_sessions s
         LEFT JOIN users u ON u.id = s.avatar_id
         WHERE s.status='active' ORDER BY s.created_at DESC LIMIT 1`
      );
      if (result.rows.length === 0) {
        return res.json({ session: null });
      }
      const s = result.rows[0];

      // Get question count
      const qCount = await pool.query(
        `SELECT COUNT(*) as c FROM community_posts WHERE ama_session_id=$1`, [s.id]
      );

      res.json({
        session: {
          id: s.id,
          avatarId: s.avatar_id,
          avatarName: s.avatar_name || '大师',
          topic: s.topic,
          description: s.description,
          status: s.status,
          questionCount: parseInt(qCount.rows[0].c),
          createdAt: s.created_at,
          closesAt: s.closes_at,
        },
      });
    } catch (err) {
      console.error("AMA active error:", err);
      res.status(500).json({ error: "获取 AMA 失败" });
    }
  });

  // ─── Feature 5a: AMA Ask Question ────────────────────────────
  app.post("/api/ama/ask", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { question } = req.body;
      if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({ error: "请输入问题" });
      }

      // Get active AMA
      const active = await pool.query(
        `SELECT s.*, u.nickname as avatar_name FROM ama_sessions s
         LEFT JOIN users u ON u.id = s.avatar_id
         WHERE s.status='active' ORDER BY s.created_at DESC LIMIT 1`
      );
      if (active.rows.length === 0) {
        return res.status(400).json({ error: "当前没有进行中的 AMA" });
      }
      const session = active.rows[0];

      // Create post tagged to AMA
      const post = await pool.query(
        `INSERT INTO community_posts (id, user_id, content, tag, is_anonymous, ama_session_id, like_count, comment_count, created_at)
         VALUES (gen_random_uuid(), $1, $2, 'question', false, $3, 0, 0, NOW()::TEXT)
         RETURNING *`,
        [userId, question.trim(), session.id]
      );
      const postId = post.rows[0].id;

      // Generate AI avatar response (async but we wait for it to return with the post)
      const avatarName = session.avatar_name || '大师';
      try {
        const client = getFortuneClient();
        const resp = await client.chat.completions.create({
          model: FORTUNE_MODEL,
          max_tokens: 800,
          messages: [
            {
              role: "system",
              content: `你是${avatarName}，正在主持一期 AMA「${session.topic}」。你是一位深谙命理玄学的大师，对于用户的提问要给出深入、详细、有洞察力的回答。回答应该有300-500字，引经据典，结合命理智慧和实际建议。语气温和但权威。只返回回答内容，不要markdown或JSON。`
            },
            { role: "user", content: question.trim() }
          ],
        });
        const answer = resp.choices[0]?.message?.content?.trim();
        if (answer) {
          await pool.query(
            `INSERT INTO post_comments (id, post_id, user_id, content, is_anonymous, is_from_avatar, created_at)
             VALUES (gen_random_uuid(), $1, $2, $3, false, true, NOW()::TEXT)`,
            [postId, session.avatar_id, answer]
          );
          await pool.query(`UPDATE community_posts SET comment_count = comment_count + 1 WHERE id=$1`, [postId]);
        }
      } catch (aiErr) {
        console.error("[ama] AI answer error:", aiErr);
      }

      // Award merit for asking
      awardMerit(userId, 'ama_ask', 5, 'AMA 提问').catch(() => {});

      res.json({ postId, sessionId: session.id });
    } catch (err) {
      console.error("AMA ask error:", err);
      res.status(500).json({ error: "提问失败" });
    }
  });

  // ─── Feature 5a: AMA History ──────────────────────────────────
  app.get("/api/ama/history", async (_req: Request, res: Response) => {
    try {
      const sessions = await pool.query(
        `SELECT s.*, u.nickname as avatar_name FROM ama_sessions s
         LEFT JOIN users u ON u.id = s.avatar_id
         ORDER BY s.created_at DESC LIMIT 20`
      );

      const result = await Promise.all(sessions.rows.map(async s => {
        const qCount = await pool.query(
          `SELECT COUNT(*) as c FROM community_posts WHERE ama_session_id=$1`, [s.id]
        );
        return {
          id: s.id,
          avatarId: s.avatar_id,
          avatarName: s.avatar_name || '大师',
          topic: s.topic,
          description: s.description,
          status: s.status,
          questionCount: parseInt(qCount.rows[0].c),
          createdAt: s.created_at,
          closesAt: s.closes_at,
        };
      }));

      res.json({ sessions: result });
    } catch (err) {
      console.error("AMA history error:", err);
      res.status(500).json({ error: "获取 AMA 历史失败" });
    }
  });

  // ─── Feature 5b: Friendliness Check Endpoint ─────────────────
  // This is used by the frontend after posting to show a soft hint
  app.post("/api/community/friendliness-check", requireAuth, async (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      if (!content) return res.json({ hint: null });
      const hint = await checkFriendliness(content);
      res.json({ hint });
    } catch {
      res.json({ hint: null });
    }
  });

  // ─── Feature 5c: Community Guidelines ─────────────────────────
  app.get("/api/community/guidelines", (_req: Request, res: Response) => {
    res.json({
      guidelines: [
        { icon: '💝', title: '真诚分享', description: '分享真实感受和经历，用心交流' },
        { icon: '🤝', title: '友好互动', description: '尊重每位社区成员，以善意对待他人' },
        { icon: '✨', title: '正向引导', description: '传递积极正面的能量，互相鼓励' },
        { icon: '🎭', title: '娱乐为主', description: '命理仅供参考，不替代专业建议' },
      ],
    });
  });

  // ─── Bootstrap: ensure weekly AMA on registration ─────────────
  ensureWeeklyAMA().catch(() => {});
}
