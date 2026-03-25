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

    // ─── Friendships ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        friend_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        compatibility_score INTEGER,
        created_at TEXT NOT NULL DEFAULT NOW()::TEXT
      )
    `);

    // ─── Direct Messages ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TEXT NOT NULL DEFAULT NOW()::TEXT
      )
    `);

    // ─── Add is_public to group_chat_sessions ─────────────────────
    await client.query(`
      ALTER TABLE group_chat_sessions ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false
    `);
    await client.query(`
      ALTER TABLE group_chat_sessions ADD COLUMN IF NOT EXISTS participant_count INTEGER NOT NULL DEFAULT 1
    `);
    await client.query(`
      ALTER TABLE group_chat_sessions ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0
    `);

    // ─── Ensure community_avatars table exists ──────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_avatars (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        specialty TEXT,
        personality TEXT,
        avatar_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT NOT NULL DEFAULT NOW()::TEXT
      )
    `);

    // ─── Seed new AI masters into community_avatars (Phase 3) ───
    try {
      const newMasters = [
        { id: 'cfd2636b-fcb0-498b-891d-a576fead3139', name: '玄机子', specialty: '八字/易经', personality: '严肃传统八字易经大师' },
        { id: 'a35dd36d-163a-407c-b472-f5b2546727ba', name: '星河散人', specialty: '星象/占星', personality: '洒脱随性星象占星专家' },
        { id: 'a1a00269-8e33-41c2-a917-f3207fc9e235', name: '云山道人', specialty: '道家智慧', personality: '幽默风趣道家智慧大师' },
        { id: '8cf95845-88f4-4bd1-bef3-7f6a58294600', name: '观星小助手', specialty: '综合分析', personality: '友好专业综合助手' },
        { id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e', name: '风水先生·陈半仙', specialty: '风水/堪舆', personality: '半文半白广东风味风水大师' },
        { id: 'c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f', name: '紫微真人', specialty: '紫微斗数', personality: '高冷学院派紫微斗数大师' },
        { id: 'd3e4f5a6-b7c8-4d9e-0f1a-2b3c4d5e6f7a', name: '星语姐姐', specialty: '星座/塔罗', personality: '年轻活泼星座塔罗达人' },
        { id: 'e4f5a6b7-c8d9-4e0f-1a2b-3c4d5e6f7a8b', name: '机器猫', specialty: 'AI数据分析', personality: '理性数据驱动分析师' },
      ];

      for (const master of newMasters) {
        await client.query(
          `INSERT INTO community_avatars (id, name, specialty, personality, created_at)
           VALUES ($1, $2, $3, $4, NOW()::TEXT)
           ON CONFLICT (id) DO NOTHING`,
          [master.id, master.name, master.specialty, master.personality]
        );
      }
      console.log(`[db] Seeded ${newMasters.length} AI masters`);
    } catch (seedErr) {
      console.warn('[db] Warning: Could not seed community_avatars:', seedErr);
      // Non-fatal — avatars are hardcoded in proactive-routes.ts
    }

    // ─── Daily Letters (观星日报) ──────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_letters (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        letter_date DATE NOT NULL,
        greeting TEXT NOT NULL,
        sections JSONB NOT NULL,
        signoff TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        UNIQUE(user_id, letter_date)
      )
    `);

    // ─── Avatar Whispers (分身私语) ──────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS avatar_whispers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        avatar_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        whisper_type TEXT NOT NULL,
        content TEXT NOT NULL,
        ai_context TEXT,
        is_read BOOLEAN NOT NULL DEFAULT false,
        user_reply TEXT,
        avatar_reply TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // ─── Mood Entries: add emotional companion columns ──────────
    await client.query(`ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS ai_response TEXT`);
    await client.query(`ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS context TEXT`);
    await client.query(`ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS wuxing_insight TEXT`);
    await client.query(`ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS ritual TEXT`);

    // ─── Daily Letters: add whisper + followUp columns ──────────
    await client.query(`ALTER TABLE daily_letters ADD COLUMN IF NOT EXISTS whisper TEXT`);
    await client.query(`ALTER TABLE daily_letters ADD COLUMN IF NOT EXISTS follow_up TEXT`);

    // ─── Soul Profiles (灵魂匹配) ──────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS soul_profiles (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL UNIQUE,
        scores JSONB NOT NULL,
        archetype TEXT NOT NULL,
        archetype_name TEXT NOT NULL,
        archetype_emoji TEXT,
        interests TEXT[] DEFAULT '{}',
        display_name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // ─── Fortune History (运势历史) ───────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS fortune_history (
        user_id VARCHAR NOT NULL,
        date TEXT NOT NULL,
        total_score INT NOT NULL,
        PRIMARY KEY (user_id, date)
      )
    `);

    // ─── Shared Results (公开分享链接) ──────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS shared_results (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        result_type TEXT NOT NULL,
        result_data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        view_count INT NOT NULL DEFAULT 0
      )
    `);

    // ─── Add dingding_webhook_url column to users ───
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS dingding_webhook_url TEXT
    `);

    // ─── Performance Indexes ─────────────────────────────────────
    // These use IF NOT EXISTS to be idempotent
    const indexes = [
      // Core lookups
      `CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`,
      // Mood entries — queried by user + date range
      `CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at ON mood_entries(created_at)`,
      // Community — posts feed + user lookups
      `CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id)`,
      `CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id)`,
      `CREATE INDEX IF NOT EXISTS idx_post_likes_user_post ON post_likes(user_id, post_id)`,
      // Agent follows
      `CREATE INDEX IF NOT EXISTS idx_agent_follows_follower ON agent_follows(follower_id)`,
      `CREATE INDEX IF NOT EXISTS idx_agent_follows_followee ON agent_follows(followee_id)`,
      // Proactive messages
      `CREATE INDEX IF NOT EXISTS idx_proactive_messages_user_id ON proactive_messages(user_id)`,
      // Group chat
      `CREATE INDEX IF NOT EXISTS idx_group_chat_sessions_user_id ON group_chat_sessions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_group_chat_messages_session_id ON group_chat_messages(session_id)`,
      // Assessment results
      `CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON assessment_results(user_id)`,
      // User agent API key lookup
      `CREATE INDEX IF NOT EXISTS idx_users_agent_api_key ON users(agent_api_key) WHERE agent_api_key IS NOT NULL`,
      // Fortune history
      `CREATE INDEX IF NOT EXISTS idx_fortune_history_user_date ON fortune_history(user_id, date)`,
      // Daily letters
      `CREATE INDEX IF NOT EXISTS idx_daily_letters_user_date ON daily_letters(user_id, letter_date)`,
      // Avatar whispers
      `CREATE INDEX IF NOT EXISTS idx_avatar_whispers_user_id ON avatar_whispers(user_id)`,
      // Shared results
      `CREATE INDEX IF NOT EXISTS idx_shared_results_user_id ON shared_results(user_id)`,
      // Notifications
      `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id) WHERE user_id IS NOT NULL`,
    ];

    for (const idx of indexes) {
      try {
        await client.query(idx);
      } catch (indexErr) {
        // Non-fatal — table may not exist yet on first run
        console.warn(`[db] Index warning: ${(indexErr as any)?.message?.slice(0, 80)}`);
      }
    }
    console.log(`[db] ${indexes.length} performance indexes ensured`);

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
