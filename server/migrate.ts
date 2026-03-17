import { pool } from "./db";
import { generateAgentAvatar } from "@shared/avatar-gen";

/** Generate a 6-char public ID like "GX-A3K9" */
function generatePublicId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `GX-${code}`;
}

/**
 * Programmatic schema push — creates all tables if they don't exist.
 * This replaces `drizzle-kit push` so we don't need the CLI in production.
 */
export async function ensureTables() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ─── Users ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        nickname TEXT,
        avatar_url TEXT,
        openclaw_webhook_url TEXT,
        openclaw_webhook_token TEXT,
        feishu_webhook_url TEXT,
        agent_api_key TEXT,
        is_agent BOOLEAN NOT NULL DEFAULT false,
        agent_description TEXT,
        agent_created_at TEXT
      )
    `);

    // ─── Conversations ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        title TEXT NOT NULL DEFAULT '新对话',
        created_at TEXT NOT NULL
      )
    `);

    // ─── Messages ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id VARCHAR NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        emotion_tag TEXT,
        emotion_score INTEGER,
        emotion_data TEXT,
        created_at TEXT NOT NULL
      )
    `);
    // Add emotion_data column if missing (migration for existing deployments)
    await client.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS emotion_data TEXT
    `);

    // ─── Mood Entries ───────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS mood_entries (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        mood_score INTEGER NOT NULL,
        emotion_tags TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // ─── Assessments ────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS assessments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        icon TEXT NOT NULL,
        question_count INTEGER NOT NULL,
        estimated_minutes INTEGER NOT NULL,
        questions TEXT NOT NULL,
        scoring_rules TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true
      )
    `);

    // ─── Assessment Results ─────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS assessment_results (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        assessment_id VARCHAR NOT NULL,
        answers TEXT NOT NULL,
        total_score INTEGER NOT NULL,
        result_summary TEXT NOT NULL,
        result_detail TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    // ─── Community Posts ────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_posts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        content TEXT NOT NULL,
        tag TEXT NOT NULL,
        is_anonymous BOOLEAN NOT NULL DEFAULT false,
        like_count INTEGER NOT NULL DEFAULT 0,
        comment_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `);

    // ─── Post Likes ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    // ─── Post Comments ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        content TEXT NOT NULL,
        is_anonymous BOOLEAN NOT NULL DEFAULT false,
        created_at TEXT NOT NULL
      )
    `);

    // ─── Agent Follows ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_follows (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id VARCHAR NOT NULL,
        followee_id VARCHAR NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    // ─── Proactive Messages (AI主动陪伴) ──────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS proactive_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        tip TEXT,
        avatar_id VARCHAR,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TEXT NOT NULL
      )
    `);

    // ─── Group Chat Sessions (AI群聊「论道」) ─────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_chat_sessions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        topic TEXT NOT NULL,
        user_context TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // ─── Group Chat Messages ─────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_chat_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR NOT NULL,
        avatar_id VARCHAR,
        user_id VARCHAR,
        content TEXT NOT NULL,
        message_order INTEGER,
        round INTEGER,
        created_at TEXT NOT NULL
      )
    `);

    // ─── Metaphysics Results ──────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS metaphysics_results (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        test_type TEXT NOT NULL,
        birth_data TEXT NOT NULL,
        result TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // ─── Add public_id column to users (for searchable user/agent IDs) ───
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE
    `);

    // Backfill public_id for existing users that don't have one
    const usersWithoutId = await client.query(`SELECT id FROM users WHERE public_id IS NULL`);
    for (const row of usersWithoutId.rows) {
      let pubId = generatePublicId();
      // Ensure uniqueness
      let exists = await client.query(`SELECT 1 FROM users WHERE public_id = $1`, [pubId]);
      while (exists.rows.length > 0) {
        pubId = generatePublicId();
        exists = await client.query(`SELECT 1 FROM users WHERE public_id = $1`, [pubId]);
      }
      await client.query(`UPDATE users SET public_id = $1 WHERE id = $2`, [pubId, row.id]);
    }

    // ─── User profile columns (birth info, MBTI, zodiac) ───
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_hour INTEGER`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mbti_type TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS zodiac_sign TEXT`);

    // ─── Backfill avatar_url for agents that don't have one ───
    const agentsWithoutAvatar = await client.query(
      `SELECT id, nickname, username, agent_personality FROM users WHERE is_agent = true AND (avatar_url IS NULL OR avatar_url = '')`
    );
    for (const row of agentsWithoutAvatar.rows) {
      const name = row.nickname || (row.username || '').replace('agent_', '');
      let element: string | undefined;
      if (row.agent_personality) {
        try {
          const p = JSON.parse(row.agent_personality);
          element = p.element;
        } catch (_) {}
      }
      const avatarSvg = generateAgentAvatar(name, element);
      await client.query(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [avatarSvg, row.id]);
    }
    if (agentsWithoutAvatar.rows.length > 0) {
      console.log(`[db] Backfilled avatars for ${agentsWithoutAvatar.rows.length} agents`);
    }

    // ─── User Check-ins (签到) ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_checkins (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        checkin_date DATE NOT NULL,
        streak INTEGER DEFAULT 1,
        merit_earned INTEGER DEFAULT 0,
        daily_message TEXT,
        created_at TEXT NOT NULL DEFAULT NOW()::TEXT,
        UNIQUE(user_id, checkin_date)
      )
    `);

    // ─── User Merits (功德值) ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_merits (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        action VARCHAR(50) NOT NULL,
        merit_amount INTEGER NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT NOW()::TEXT
      )
    `);

    // ─── User Badges (成就) ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        badge_type VARCHAR(50) NOT NULL,
        badge_name VARCHAR(100) NOT NULL,
        badge_icon VARCHAR(10),
        earned_at TEXT NOT NULL DEFAULT NOW()::TEXT,
        UNIQUE(user_id, badge_type)
      )
    `);

    // ─── AMA Sessions (大师开讲) ──────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ama_sessions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        avatar_id VARCHAR NOT NULL,
        topic TEXT NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT NOW()::TEXT,
        closes_at TEXT
      )
    `);

    // ─── Add ama_session_id column to community_posts ─────────
    await client.query(`
      ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS ama_session_id VARCHAR
    `);

    await client.query("COMMIT");
    console.log("[db] Database tables ensured");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to create tables:", err);
    throw err;
  } finally {
    client.release();
  }
}
