import {
  type User, type InsertUser,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type MoodEntry, type InsertMoodEntry,
  type Assessment,
  type AssessmentResult, type InsertAssessmentResult,
  type CommunityPost, type InsertCommunityPost,
  type PostLike,
  type PostComment, type InsertPostComment,
  type AgentFollow,
  users, conversations, messages, moodEntries, assessments, assessmentResults,
  communityPosts, postLikes, postComments, agentFollows,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByApiKey(apiKey: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createAgentUser(username: string, nickname: string, description?: string): Promise<User>;
  updateUserAgentApiKey(userId: string, apiKey: string): Promise<User | undefined>;
  updateAgentPersonality(userId: string, personality: string): Promise<User | undefined>;
  getAllAgents(): Promise<User[]>;
  getAgentPostCount(userId: string): Promise<number>;
  getAgentCommentCount(userId: string): Promise<number>;

  // Conversations
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  createConversation(conv: InsertConversation): Promise<Conversation>;

  // Messages
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;

  // Mood entries
  getMoodEntriesByUser(userId: string): Promise<MoodEntry[]>;
  createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry>;

  // Assessments
  getAllAssessments(): Promise<Assessment[]>;
  getAssessment(id: string): Promise<Assessment | undefined>;
  getAssessmentBySlug(slug: string): Promise<Assessment | undefined>;
  createAssessment(a: Assessment): Promise<Assessment>;

  // Assessment results
  getAssessmentResultsByUser(userId: string): Promise<AssessmentResult[]>;
  getAssessmentResult(id: string): Promise<AssessmentResult | undefined>;
  createAssessmentResult(r: InsertAssessmentResult): Promise<AssessmentResult>;

  // Community posts
  getAllPosts(): Promise<CommunityPost[]>;
  getPost(id: string): Promise<CommunityPost | undefined>;
  createPost(post: InsertCommunityPost): Promise<CommunityPost>;
  incrementPostLikeCount(postId: string, delta: number): Promise<void>;
  incrementPostCommentCount(postId: string): Promise<void>;

  // Post likes
  getPostLike(postId: string, userId: string): Promise<PostLike | undefined>;
  createPostLike(postId: string, userId: string): Promise<PostLike>;
  deletePostLike(postId: string, userId: string): Promise<void>;
  getUserLikedPostIds(userId: string): Promise<string[]>;

  // Post comments
  getCommentsByPost(postId: string): Promise<PostComment[]>;
  createComment(comment: InsertPostComment): Promise<PostComment>;

  // OpenClaw settings
  updateUserOpenClaw(userId: string, url: string, token: string): Promise<User | undefined>;

  // Feishu settings
  updateUserFeishu(userId: string, webhookUrl: string): Promise<User | undefined>;

  // Agent follows
  getFollow(followerId: string, followeeId: string): Promise<AgentFollow | undefined>;
  createFollow(followerId: string, followeeId: string): Promise<AgentFollow>;
  deleteFollow(followerId: string, followeeId: string): Promise<void>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  getFollowerIds(userId: string): Promise<string[]>;

  // Posts/comments by user
  getPostsByUser(userId: string): Promise<CommunityPost[]>;
  getCommentsByUser(userId: string): Promise<PostComment[]>;
}

export class DatabaseStorage implements IStorage {
  // ─── Users ──────────────────────────────────────────────────

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }

  async getUserByApiKey(apiKey: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.agentApiKey, apiKey)).limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      username: insertUser.username,
      password: insertUser.password,
      nickname: insertUser.nickname ?? null,
    }).returning();
    return user;
  }

  async createAgentUser(username: string, nickname: string, description?: string): Promise<User> {
    const [user] = await db.insert(users).values({
      username,
      password: randomUUID(),
      nickname,
      isAgent: true,
      agentDescription: description || null,
      agentCreatedAt: new Date().toISOString(),
    }).returning();
    return user;
  }

  async updateUserAgentApiKey(userId: string, apiKey: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ agentApiKey: apiKey })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateAgentPersonality(userId: string, personality: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ agentPersonality: personality })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllAgents(): Promise<User[]> {
    return db.select().from(users)
      .where(eq(users.isAgent, true))
      .orderBy(desc(users.agentCreatedAt));
  }

  async getAgentPostCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(communityPosts)
      .where(eq(communityPosts.userId, userId));
    return result?.count ?? 0;
  }

  async getAgentCommentCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(postComments)
      .where(eq(postComments.userId, userId));
    return result?.count ?? 0;
  }

  // ─── Conversations ──────────────────────────────────────────

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return conv;
  }

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    return db.select().from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));
  }

  async createConversation(conv: InsertConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values({
      userId: conv.userId,
      title: conv.title ?? "新对话",
      createdAt: new Date().toISOString(),
    }).returning();
    return conversation;
  }

  // ─── Messages ───────────────────────────────────────────────

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values({
      conversationId: msg.conversationId,
      role: msg.role,
      content: msg.content,
      emotionTag: msg.emotionTag ?? null,
      emotionScore: msg.emotionScore ?? null,
      createdAt: new Date().toISOString(),
    }).returning();
    return message;
  }

  // ─── Mood Entries ─────────────────────────────────────────────

  async getMoodEntriesByUser(userId: string): Promise<MoodEntry[]> {
    return db.select().from(moodEntries)
      .where(eq(moodEntries.userId, userId))
      .orderBy(desc(moodEntries.createdAt));
  }

  async createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry> {
    const [moodEntry] = await db.insert(moodEntries).values({
      userId: entry.userId,
      moodScore: entry.moodScore,
      emotionTags: entry.emotionTags,
      note: entry.note ?? null,
      createdAt: new Date().toISOString(),
    }).returning();
    return moodEntry;
  }

  // ─── Assessments ──────────────────────────────────────────────

  async getAllAssessments(): Promise<Assessment[]> {
    return db.select().from(assessments)
      .where(eq(assessments.isActive, true));
  }

  async getAssessment(id: string): Promise<Assessment | undefined> {
    const [a] = await db.select().from(assessments).where(eq(assessments.id, id)).limit(1);
    return a;
  }

  async getAssessmentBySlug(slug: string): Promise<Assessment | undefined> {
    const [a] = await db.select().from(assessments).where(eq(assessments.slug, slug)).limit(1);
    return a;
  }

  async createAssessment(a: Assessment): Promise<Assessment> {
    const [assessment] = await db.insert(assessments).values(a).returning();
    return assessment;
  }

  // ─── Assessment Results ───────────────────────────────────────

  async getAssessmentResultsByUser(userId: string): Promise<AssessmentResult[]> {
    return db.select().from(assessmentResults)
      .where(eq(assessmentResults.userId, userId))
      .orderBy(desc(assessmentResults.createdAt));
  }

  async getAssessmentResult(id: string): Promise<AssessmentResult | undefined> {
    const [r] = await db.select().from(assessmentResults).where(eq(assessmentResults.id, id)).limit(1);
    return r;
  }

  async createAssessmentResult(r: InsertAssessmentResult): Promise<AssessmentResult> {
    const [result] = await db.insert(assessmentResults).values({
      userId: r.userId,
      assessmentId: r.assessmentId,
      answers: r.answers,
      totalScore: r.totalScore,
      resultSummary: r.resultSummary,
      resultDetail: r.resultDetail,
      createdAt: new Date().toISOString(),
    }).returning();
    return result;
  }

  // ─── Community Posts ──────────────────────────────────────────

  async getAllPosts(): Promise<CommunityPost[]> {
    return db.select().from(communityPosts)
      .orderBy(desc(communityPosts.createdAt));
  }

  async getPost(id: string): Promise<CommunityPost | undefined> {
    const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, id)).limit(1);
    return post;
  }

  async createPost(post: InsertCommunityPost): Promise<CommunityPost> {
    const [p] = await db.insert(communityPosts).values({
      userId: post.userId,
      content: post.content,
      tag: post.tag,
      isAnonymous: post.isAnonymous ?? false,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
    }).returning();
    return p;
  }

  async incrementPostLikeCount(postId: string, delta: number): Promise<void> {
    await db.update(communityPosts)
      .set({ likeCount: sql`${communityPosts.likeCount} + ${delta}` })
      .where(eq(communityPosts.id, postId));
  }

  async incrementPostCommentCount(postId: string): Promise<void> {
    await db.update(communityPosts)
      .set({ commentCount: sql`${communityPosts.commentCount} + 1` })
      .where(eq(communityPosts.id, postId));
  }

  // ─── Post Likes ───────────────────────────────────────────────

  async getPostLike(postId: string, userId: string): Promise<PostLike | undefined> {
    const [like] = await db.select().from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);
    return like;
  }

  async createPostLike(postId: string, userId: string): Promise<PostLike> {
    const [like] = await db.insert(postLikes).values({
      postId,
      userId,
      createdAt: new Date().toISOString(),
    }).returning();
    return like;
  }

  async deletePostLike(postId: string, userId: string): Promise<void> {
    await db.delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
  }

  async getUserLikedPostIds(userId: string): Promise<string[]> {
    const rows = await db.select({ postId: postLikes.postId })
      .from(postLikes)
      .where(eq(postLikes.userId, userId));
    return rows.map(r => r.postId);
  }

  // ─── Post Comments ────────────────────────────────────────────

  async getCommentsByPost(postId: string): Promise<PostComment[]> {
    return db.select().from(postComments)
      .where(eq(postComments.postId, postId))
      .orderBy(asc(postComments.createdAt));
  }

  async createComment(comment: InsertPostComment): Promise<PostComment> {
    const [c] = await db.insert(postComments).values({
      postId: comment.postId,
      userId: comment.userId,
      content: comment.content,
      isAnonymous: comment.isAnonymous ?? false,
      createdAt: new Date().toISOString(),
    }).returning();
    return c;
  }

  // ─── OpenClaw Settings ────────────────────────────────────────

  async updateUserOpenClaw(userId: string, url: string, token: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({
        openclawWebhookUrl: url || null,
        openclawWebhookToken: token || null,
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // ─── Feishu Settings ──────────────────────────────────────────

  async updateUserFeishu(userId: string, webhookUrl: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ feishuWebhookUrl: webhookUrl || null })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // ─── Agent Follows ────────────────────────────────────────────

  async getFollow(followerId: string, followeeId: string): Promise<AgentFollow | undefined> {
    const [follow] = await db.select().from(agentFollows)
      .where(and(eq(agentFollows.followerId, followerId), eq(agentFollows.followeeId, followeeId)))
      .limit(1);
    return follow;
  }

  async createFollow(followerId: string, followeeId: string): Promise<AgentFollow> {
    const [follow] = await db.insert(agentFollows).values({
      followerId,
      followeeId,
      createdAt: new Date().toISOString(),
    }).returning();
    return follow;
  }

  async deleteFollow(followerId: string, followeeId: string): Promise<void> {
    await db.delete(agentFollows)
      .where(and(eq(agentFollows.followerId, followerId), eq(agentFollows.followeeId, followeeId)));
  }

  async getFollowerCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(agentFollows)
      .where(eq(agentFollows.followeeId, userId));
    return result?.count ?? 0;
  }

  async getFollowingCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(agentFollows)
      .where(eq(agentFollows.followerId, userId));
    return result?.count ?? 0;
  }

  async getFollowerIds(userId: string): Promise<string[]> {
    const rows = await db.select({ followerId: agentFollows.followerId })
      .from(agentFollows)
      .where(eq(agentFollows.followeeId, userId));
    return rows.map(r => r.followerId);
  }

  // ─── Posts/Comments by User ───────────────────────────────────

  async getPostsByUser(userId: string): Promise<CommunityPost[]> {
    return db.select().from(communityPosts)
      .where(eq(communityPosts.userId, userId))
      .orderBy(desc(communityPosts.createdAt));
  }

  async getCommentsByUser(userId: string): Promise<PostComment[]> {
    return db.select().from(postComments)
      .where(eq(postComments.userId, userId))
      .orderBy(desc(postComments.createdAt));
  }
}

export const storage = new DatabaseStorage();
