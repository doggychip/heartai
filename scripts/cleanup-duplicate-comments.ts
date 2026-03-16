/**
 * One-time cleanup script: Remove duplicate comments from community posts.
 *
 * Rules:
 * 1. If the same user commented multiple times on the same post, keep the earliest and delete the rest.
 * 2. For remaining comments on a post, if multiple comments across different users are very similar
 *    in wording (>60% keyword overlap), keep only the first one.
 *
 * Run: npx tsx scripts/cleanup-duplicate-comments.ts
 * Requires DATABASE_URL environment variable.
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, asc, sql } from "drizzle-orm";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

function computeKeywordOverlap(text1: string, text2: string): number {
  const extractKeywords = (text: string) => {
    const cleaned = text.replace(/[的了是在有和与或但也都不这那就要会很把被让给对从到说\s]/g, '');
    const keywords = new Set<string>();
    for (let i = 0; i < cleaned.length - 1; i++) {
      const bigram = cleaned.slice(i, i + 2).trim();
      if (bigram.length === 2) keywords.add(bigram);
    }
    return keywords;
  };
  const kw1 = extractKeywords(text1);
  const kw2 = extractKeywords(text2);
  if (kw1.size === 0 || kw2.size === 0) return 0;
  let overlap = 0;
  for (const k of kw1) {
    if (kw2.has(k)) overlap++;
  }
  return overlap / Math.min(kw1.size, kw2.size);
}

async function main() {
  console.log("🔍 Fetching all comments...");
  const allComments = await db.select().from(schema.postComments).orderBy(asc(schema.postComments.createdAt));
  console.log(`   Found ${allComments.length} total comments.`);

  // Group comments by postId
  const byPost = new Map<string, typeof allComments>();
  for (const c of allComments) {
    if (!byPost.has(c.postId)) byPost.set(c.postId, []);
    byPost.get(c.postId)!.push(c);
  }

  const toDelete: string[] = [];

  // Step 1: Remove duplicate comments from the same user on the same post
  for (const [postId, comments] of byPost) {
    const byUser = new Map<string, typeof comments>();
    for (const c of comments) {
      if (!byUser.has(c.userId)) byUser.set(c.userId, []);
      byUser.get(c.userId)!.push(c);
    }

    for (const [userId, userComments] of byUser) {
      if (userComments.length > 1) {
        // Keep the earliest, delete the rest
        const sorted = userComments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        for (let i = 1; i < sorted.length; i++) {
          toDelete.push(sorted[i].id);
        }
        console.log(`   Post ${postId.slice(0, 8)}...: User ${userId.slice(0, 8)}... has ${userComments.length} comments, marking ${userComments.length - 1} for deletion`);
      }
    }
  }

  console.log(`\n📋 Step 1: ${toDelete.length} duplicate (same user, same post) comments to delete.`);

  // Step 2: Check for similar wording across different users on the same post
  const similarToDelete: string[] = [];
  for (const [postId, comments] of byPost) {
    // Filter out already-marked comments
    const remaining = comments.filter(c => !toDelete.includes(c.id));
    if (remaining.length < 2) continue;

    // Check pairwise similarity, keep the earliest, mark later similar ones
    const kept = new Set<string>();
    for (const c of remaining) {
      let isDuplicate = false;
      for (const keptId of kept) {
        const keptComment = remaining.find(r => r.id === keptId)!;
        if (computeKeywordOverlap(c.content, keptComment.content) > 0.6) {
          isDuplicate = true;
          similarToDelete.push(c.id);
          console.log(`   Post ${postId.slice(0, 8)}...: Similar comments — keeping "${keptComment.content.slice(0, 30)}..." deleting "${c.content.slice(0, 30)}..."`);
          break;
        }
      }
      if (!isDuplicate) {
        kept.add(c.id);
      }
    }
  }

  console.log(`📋 Step 2: ${similarToDelete.length} similar-wording comments to delete.`);

  const allToDelete = [...toDelete, ...similarToDelete];
  console.log(`\n🗑️  Total comments to delete: ${allToDelete.length}`);

  if (allToDelete.length === 0) {
    console.log("✅ No duplicates found. Database is clean!");
    await pool.end();
    return;
  }

  // Delete in batches
  const BATCH_SIZE = 50;
  let deleted = 0;
  for (let i = 0; i < allToDelete.length; i += BATCH_SIZE) {
    const batch = allToDelete.slice(i, i + BATCH_SIZE);
    for (const id of batch) {
      await db.delete(schema.postComments).where(eq(schema.postComments.id, id));
      deleted++;
    }
    console.log(`   Deleted ${deleted}/${allToDelete.length}...`);
  }

  // Update comment counts on affected posts
  console.log("\n🔄 Updating comment counts on affected posts...");
  const affectedPostIds = new Set(allComments.filter(c => allToDelete.includes(c.id)).map(c => c.postId));
  for (const postId of affectedPostIds) {
    const remaining = await db.select().from(schema.postComments).where(eq(schema.postComments.postId, postId));
    await db.update(schema.communityPosts)
      .set({ commentCount: remaining.length })
      .where(eq(schema.communityPosts.id, postId));
    console.log(`   Post ${postId.slice(0, 8)}...: count updated to ${remaining.length}`);
  }

  console.log(`\n✅ Done! Deleted ${allToDelete.length} duplicate/similar comments.`);
  await pool.end();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
