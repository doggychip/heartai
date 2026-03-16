// Migration: Add AI Avatar (分身) tables
import { db } from "./db";
import { sql } from "drizzle-orm";

export async function migrateAvatar() {
  console.log("[migrate] Adding avatar tables...");

  // Add isFromAvatar column to community_posts if not exists
  await db.execute(sql`
    ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_from_avatar BOOLEAN NOT NULL DEFAULT false
  `);

  // Add isFromAvatar column to post_likes if not exists
  await db.execute(sql`
    ALTER TABLE post_likes ADD COLUMN IF NOT EXISTS is_from_avatar BOOLEAN NOT NULL DEFAULT false
  `);

  // Add isFromAvatar column to post_comments if not exists
  await db.execute(sql`
    ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS is_from_avatar BOOLEAN NOT NULL DEFAULT false
  `);

  // Create avatars table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS avatars (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL UNIQUE,
      name TEXT NOT NULL,
      bio TEXT,
      slider_praise INTEGER NOT NULL DEFAULT 50,
      slider_serious INTEGER NOT NULL DEFAULT 50,
      slider_warm INTEGER NOT NULL DEFAULT 50,
      element TEXT,
      element_traits TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      auto_like BOOLEAN NOT NULL DEFAULT true,
      auto_comment BOOLEAN NOT NULL DEFAULT true,
      auto_browse BOOLEAN NOT NULL DEFAULT true,
      max_actions_per_hour INTEGER NOT NULL DEFAULT 10,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create avatar_memories table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS avatar_memories (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      avatar_id VARCHAR NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT,
      weight INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `);

  // Create avatar_actions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS avatar_actions (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      avatar_id VARCHAR NOT NULL,
      action_type TEXT NOT NULL,
      target_post_id VARCHAR,
      content TEXT,
      inner_thought TEXT,
      is_approved BOOLEAN,
      created_at TEXT NOT NULL
    )
  `);

  // Create avatar_chats table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS avatar_chats (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      avatar_id VARCHAR NOT NULL,
      visitor_id VARCHAR NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Create avatar_chat_messages table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS avatar_chat_messages (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      chat_id VARCHAR NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Add metaphysical tag columns to avatars table (2026-03-16)
  await db.execute(sql`ALTER TABLE avatars ADD COLUMN IF NOT EXISTS zodiac_sign TEXT`);
  await db.execute(sql`ALTER TABLE avatars ADD COLUMN IF NOT EXISTS mbti_type TEXT`);
  await db.execute(sql`ALTER TABLE avatars ADD COLUMN IF NOT EXISTS five_element TEXT`);
  await db.execute(sql`ALTER TABLE avatars ADD COLUMN IF NOT EXISTS spirit_animal TEXT`);
  await db.execute(sql`ALTER TABLE avatars ADD COLUMN IF NOT EXISTS lucky_number INTEGER`);
  await db.execute(sql`ALTER TABLE avatars ADD COLUMN IF NOT EXISTS tarot_card TEXT`);

  console.log("[migrate] Avatar tables created successfully!");
}
