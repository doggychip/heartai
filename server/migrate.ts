import { pool } from "./db";
import { log } from "./index";

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
        created_at TEXT NOT NULL
      )
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

    await client.query("COMMIT");
    log("Database tables ensured", "db");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to create tables:", err);
    throw err;
  } finally {
    client.release();
  }
}
