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
  type Avatar, type InsertAvatar,
  type AvatarMemory, type InsertAvatarMemory,
  type AvatarAction, type InsertAvatarAction,
  type AvatarChat, type AvatarChatMessage,
  type Notification,
  type AgentTeamMember, type AgentDispatchRecord, type AgentEvent,
  type DeveloperApp, type InsertDeveloperApp, type WebhookLog,
  type MetaphysicsResult,
  users, conversations, messages, moodEntries, assessments, assessmentResults,
  communityPosts, postLikes, postComments, agentFollows,
  avatars, avatarMemories, avatarActions, avatarChats, avatarChatMessages,
  notifications,
  agentTeam, agentDispatchLog, agentEvents,
  developerApps, webhookLogs,
  metaphysicsResults,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByApiKey(apiKey: string): Promise<User | undefined>;
  getUserByPublicId(publicId: string): Promise<User | undefined>;
  searchUsersByName(query: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  createAgentUser(username: string, nickname: string, description?: string): Promise<User>;
  updateUser(userId: string, data: Partial<User>): Promise<User | undefined>;
  updateUserPassword(userId: string, newPassword: string): Promise<void>;
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
  createPost(post: InsertCommunityPost & { isFromAvatar?: boolean }): Promise<CommunityPost>;
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

  // Avatars
  getAvatar(id: string): Promise<Avatar | undefined>;
  getAvatarByUser(userId: string): Promise<Avatar | undefined>;
  createAvatar(data: InsertAvatar): Promise<Avatar>;
  updateAvatar(id: string, data: Partial<InsertAvatar>): Promise<Avatar | undefined>;

  // Avatar Memories
  getAvatarMemories(avatarId: string): Promise<AvatarMemory[]>;
  createAvatarMemory(data: InsertAvatarMemory): Promise<AvatarMemory>;
  deleteAvatarMemory(id: string): Promise<void>;

  // Avatar Actions
  getAvatarActions(avatarId: string, limit?: number): Promise<AvatarAction[]>;
  createAvatarAction(data: InsertAvatarAction): Promise<AvatarAction>;
  approveAvatarAction(id: string, approved: boolean): Promise<void>;

  // Avatar Chats
  getAvatarChat(avatarId: string, visitorId: string): Promise<AvatarChat | undefined>;
  createAvatarChat(avatarId: string, visitorId: string): Promise<AvatarChat>;
  getAvatarChatMessages(chatId: string): Promise<AvatarChatMessage[]>;
  createAvatarChatMessage(chatId: string, role: string, content: string): Promise<AvatarChatMessage>;
  getAvatarChatsByVisitor(visitorId: string): Promise<AvatarChat[]>;

  // All avatars (for plaza)
  getAllActiveAvatars(): Promise<Avatar[]>;

  // Notifications
  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(data: { userId: string; type: string; title: string; body: string; linkTo?: string; fromUserId?: string }): Promise<Notification>;
  markNotificationsRead(userId: string): Promise<void>;

  // Agent Team
  getAgentTeamMembers(): Promise<AgentTeamMember[]>;
  getAgentTeamMember(agentKey: string): Promise<AgentTeamMember | undefined>;
  upsertAgentTeamMember(data: Omit<AgentTeamMember, 'id'>): Promise<AgentTeamMember>;
  updateAgentTeamStats(agentKey: string, tokensUsed: number, latencyMs: number): Promise<void>;

  // Agent Dispatch Log
  createDispatchLog(data: Omit<AgentDispatchRecord, 'id'>): Promise<AgentDispatchRecord>;
  getRecentDispatches(limit?: number): Promise<AgentDispatchRecord[]>;

  // Agent Events
  createAgentEvent(data: Omit<AgentEvent, 'id'>): Promise<AgentEvent>;
  getRecentEvents(limit?: number): Promise<AgentEvent[]>;
  updateEventStatus(id: string, status: string, resultSummary?: string): Promise<void>;

  // Developer Apps (Phase 4)
  getDeveloperApp(id: string): Promise<DeveloperApp | undefined>;
  getDeveloperAppByApiKey(apiKey: string): Promise<DeveloperApp | undefined>;
  getDeveloperAppsByUser(userId: string): Promise<DeveloperApp[]>;
  createDeveloperApp(data: InsertDeveloperApp): Promise<DeveloperApp>;
  updateDeveloperApp(id: string, data: Partial<DeveloperApp>): Promise<DeveloperApp | undefined>;
  deleteDeveloperApp(id: string): Promise<void>;
  incrementAppUsage(appId: string, tokensUsed: number): Promise<void>;

  // Webhook Logs (Phase 4)
  createWebhookLog(data: Omit<WebhookLog, 'id'>): Promise<WebhookLog>;
  getWebhookLogsByApp(appId: string, limit?: number): Promise<WebhookLog[]>;
  getWebhookLogStats(appId: string): Promise<{ totalCalls: number; todayCalls: number; avgLatency: number }>;

  // Metaphysics Results
  getMetaphysicsResult(userId: string, testType: string): Promise<MetaphysicsResult | undefined>;
  saveMetaphysicsResult(userId: string, testType: string, birthData: string, result: string): Promise<MetaphysicsResult>;
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

  async getUserByPublicId(publicId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.publicId, publicId)).limit(1);
    return user;
  }

  async searchUsersByName(query: string): Promise<User[]> {
    const results = await db.select().from(users)
      .where(sql`(LOWER(nickname) LIKE LOWER(${'%' + query + '%'}) OR LOWER(username) LIKE LOWER(${'%' + query + '%'}))`)
      .limit(20);
    return results;
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User | undefined> {
    const updates: any = {};
    if (data.publicId !== undefined) updates.publicId = data.publicId;
    if (data.nickname !== undefined) updates.nickname = data.nickname;
    if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
    if (Object.keys(updates).length === 0) return this.getUser(userId);
    const [user] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
    return user;
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    await db.update(users).set({ password: newPassword }).where(eq(users.id, userId));
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

  async createPost(post: InsertCommunityPost & { isFromAvatar?: boolean }): Promise<CommunityPost> {
    const [p] = await db.insert(communityPosts).values({
      userId: post.userId,
      content: post.content,
      tag: post.tag,
      isAnonymous: post.isAnonymous ?? false,
      isFromAvatar: post.isFromAvatar ?? false,
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

  // ─── Avatars ─────────────────────────────────────────────────

  async getAvatar(id: string): Promise<Avatar | undefined> {
    const [a] = await db.select().from(avatars).where(eq(avatars.id, id)).limit(1);
    return a;
  }

  async getAvatarByUser(userId: string): Promise<Avatar | undefined> {
    const [a] = await db.select().from(avatars).where(eq(avatars.userId, userId)).limit(1);
    return a;
  }

  async createAvatar(data: InsertAvatar): Promise<Avatar> {
    const now = new Date().toISOString();
    const [a] = await db.insert(avatars).values({
      ...data,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return a;
  }

  async updateAvatar(id: string, data: Partial<InsertAvatar>): Promise<Avatar | undefined> {
    const [a] = await db.update(avatars)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(avatars.id, id))
      .returning();
    return a;
  }

  // ─── Avatar Memories ────────────────────────────────────────

  async getAvatarMemories(avatarId: string): Promise<AvatarMemory[]> {
    return db.select().from(avatarMemories)
      .where(eq(avatarMemories.avatarId, avatarId))
      .orderBy(desc(avatarMemories.weight), desc(avatarMemories.createdAt));
  }

  async createAvatarMemory(data: InsertAvatarMemory): Promise<AvatarMemory> {
    const [m] = await db.insert(avatarMemories).values({
      ...data,
      createdAt: new Date().toISOString(),
    }).returning();
    return m;
  }

  async deleteAvatarMemory(id: string): Promise<void> {
    await db.delete(avatarMemories).where(eq(avatarMemories.id, id));
  }

  // ─── Avatar Actions ─────────────────────────────────────────

  async getAvatarActions(avatarId: string, limit = 50): Promise<AvatarAction[]> {
    return db.select().from(avatarActions)
      .where(eq(avatarActions.avatarId, avatarId))
      .orderBy(desc(avatarActions.createdAt))
      .limit(limit);
  }

  async createAvatarAction(data: InsertAvatarAction): Promise<AvatarAction> {
    const [a] = await db.insert(avatarActions).values({
      ...data,
      createdAt: new Date().toISOString(),
    }).returning();
    return a;
  }

  async approveAvatarAction(id: string, approved: boolean): Promise<void> {
    await db.update(avatarActions)
      .set({ isApproved: approved })
      .where(eq(avatarActions.id, id));
  }

  // ─── Avatar Chats ───────────────────────────────────────────

  async getAvatarChat(avatarId: string, visitorId: string): Promise<AvatarChat | undefined> {
    const [c] = await db.select().from(avatarChats)
      .where(and(eq(avatarChats.avatarId, avatarId), eq(avatarChats.visitorId, visitorId)))
      .limit(1);
    return c;
  }

  async createAvatarChat(avatarId: string, visitorId: string): Promise<AvatarChat> {
    const [c] = await db.insert(avatarChats).values({
      avatarId,
      visitorId,
      createdAt: new Date().toISOString(),
    }).returning();
    return c;
  }

  async getAvatarChatMessages(chatId: string): Promise<AvatarChatMessage[]> {
    return db.select().from(avatarChatMessages)
      .where(eq(avatarChatMessages.chatId, chatId))
      .orderBy(asc(avatarChatMessages.createdAt));
  }

  async createAvatarChatMessage(chatId: string, role: string, content: string): Promise<AvatarChatMessage> {
    const [m] = await db.insert(avatarChatMessages).values({
      chatId,
      role,
      content,
      createdAt: new Date().toISOString(),
    }).returning();
    return m;
  }

  async getAvatarChatsByVisitor(visitorId: string): Promise<AvatarChat[]> {
    return db.select().from(avatarChats)
      .where(eq(avatarChats.visitorId, visitorId))
      .orderBy(desc(avatarChats.createdAt));
  }

  // ─── All Active Avatars (Plaza) ──────────────────────────────

  async getAllActiveAvatars(): Promise<Avatar[]> {
    return db.select().from(avatars)
      .where(eq(avatars.isActive, true))
      .orderBy(desc(avatars.updatedAt));
  }

  // ─── Notifications ───────────────────────────────────────────

  async getNotifications(userId: string, limit = 50): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result?.count ?? 0;
  }

  async createNotification(data: { userId: string; type: string; title: string; body: string; linkTo?: string; fromUserId?: string }): Promise<Notification> {
    const [n] = await db.insert(notifications).values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      linkTo: data.linkTo || null,
      fromUserId: data.fromUserId || null,
      isRead: false,
      createdAt: new Date().toISOString(),
    }).returning();
    return n;
  }

  async markNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  // ─── Agent Team ──────────────────────────────────────────────

  async getAgentTeamMembers(): Promise<AgentTeamMember[]> {
    return db.select().from(agentTeam).orderBy(asc(agentTeam.agentKey));
  }

  async getAgentTeamMember(agentKey: string): Promise<AgentTeamMember | undefined> {
    const [member] = await db.select().from(agentTeam).where(eq(agentTeam.agentKey, agentKey)).limit(1);
    return member;
  }

  async upsertAgentTeamMember(data: Omit<AgentTeamMember, 'id'>): Promise<AgentTeamMember> {
    const existing = await this.getAgentTeamMember(data.agentKey);
    if (existing) {
      const [updated] = await db.update(agentTeam).set(data).where(eq(agentTeam.agentKey, data.agentKey)).returning();
      return updated;
    }
    const [created] = await db.insert(agentTeam).values(data as any).returning();
    return created;
  }

  async updateAgentTeamStats(agentKey: string, tokensUsed: number, latencyMs: number): Promise<void> {
    await db.execute(sql`
      UPDATE agent_team SET
        total_calls = total_calls + 1,
        total_tokens = total_tokens + ${tokensUsed},
        avg_latency_ms = CASE WHEN total_calls = 0 THEN ${latencyMs} ELSE (avg_latency_ms * total_calls + ${latencyMs}) / (total_calls + 1) END,
        last_active_at = ${new Date().toISOString()}
      WHERE agent_key = ${agentKey}
    `);
  }

  // ─── Agent Dispatch Log ──────────────────────────────────────

  async createDispatchLog(data: Omit<AgentDispatchRecord, 'id'>): Promise<AgentDispatchRecord> {
    const [record] = await db.insert(agentDispatchLog).values(data as any).returning();
    return record;
  }

  async getRecentDispatches(limit = 50): Promise<AgentDispatchRecord[]> {
    return db.select().from(agentDispatchLog)
      .orderBy(desc(agentDispatchLog.createdAt))
      .limit(limit);
  }

  // ─── Agent Events ────────────────────────────────────────────

  async createAgentEvent(data: Omit<AgentEvent, 'id'>): Promise<AgentEvent> {
    const [event] = await db.insert(agentEvents).values(data as any).returning();
    return event;
  }

  async getRecentEvents(limit = 50): Promise<AgentEvent[]> {
    return db.select().from(agentEvents)
      .orderBy(desc(agentEvents.createdAt))
      .limit(limit);
  }

  async updateEventStatus(id: string, status: string, resultSummary?: string): Promise<void> {
    await db.update(agentEvents).set({
      status,
      resultSummary: resultSummary || null,
      processedAt: new Date().toISOString(),
    }).where(eq(agentEvents.id, id));
  }

  // ═══════════════════════════════════════════════════════════════
  // Phase 4: Developer Apps + Webhook Logs
  // ═══════════════════════════════════════════════════════════════

  async getDeveloperApp(id: string): Promise<DeveloperApp | undefined> {
    const [app] = await db.select().from(developerApps).where(eq(developerApps.id, id)).limit(1);
    return app;
  }

  async getDeveloperAppByApiKey(apiKey: string): Promise<DeveloperApp | undefined> {
    const [app] = await db.select().from(developerApps).where(eq(developerApps.apiKey, apiKey)).limit(1);
    return app;
  }

  async getDeveloperAppsByUser(userId: string): Promise<DeveloperApp[]> {
    return db.select().from(developerApps)
      .where(eq(developerApps.userId, userId))
      .orderBy(desc(developerApps.createdAt));
  }

  async createDeveloperApp(data: InsertDeveloperApp): Promise<DeveloperApp> {
    const [app] = await db.insert(developerApps).values({
      ...data,
      totalCalls: 0,
      totalTokens: 0,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    } as any).returning();
    return app;
  }

  async updateDeveloperApp(id: string, data: Partial<DeveloperApp>): Promise<DeveloperApp | undefined> {
    const [updated] = await db.update(developerApps).set(data).where(eq(developerApps.id, id)).returning();
    return updated;
  }

  async deleteDeveloperApp(id: string): Promise<void> {
    await db.delete(developerApps).where(eq(developerApps.id, id));
  }

  async incrementAppUsage(appId: string, tokensUsed: number): Promise<void> {
    await db.execute(sql`
      UPDATE developer_apps SET
        total_calls = total_calls + 1,
        total_tokens = total_tokens + ${tokensUsed},
        last_used_at = ${new Date().toISOString()}
      WHERE id = ${appId}
    `);
  }

  async createWebhookLog(data: Omit<WebhookLog, 'id'>): Promise<WebhookLog> {
    const [log] = await db.insert(webhookLogs).values(data as any).returning();
    return log;
  }

  async getWebhookLogsByApp(appId: string, limit = 50): Promise<WebhookLog[]> {
    return db.select().from(webhookLogs)
      .where(eq(webhookLogs.appId, appId))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit);
  }

  async getWebhookLogStats(appId: string): Promise<{ totalCalls: number; todayCalls: number; avgLatency: number }> {
    const allLogs = await db.select().from(webhookLogs)
      .where(eq(webhookLogs.appId, appId));

    const today = new Date().toISOString().split("T")[0];
    const todayLogs = allLogs.filter(l => l.createdAt.startsWith(today));
    const avgLatency = allLogs.length > 0
      ? Math.round(allLogs.reduce((sum, l) => sum + l.latencyMs, 0) / allLogs.length)
      : 0;

    return {
      totalCalls: allLogs.length,
      todayCalls: todayLogs.length,
      avgLatency,
    };
  }

  // ─── Metaphysics Results ────────────────────────────────────

  async getMetaphysicsResult(userId: string, testType: string): Promise<MetaphysicsResult | undefined> {
    const [row] = await db.select().from(metaphysicsResults)
      .where(and(eq(metaphysicsResults.userId, userId), eq(metaphysicsResults.testType, testType)))
      .orderBy(desc(metaphysicsResults.createdAt))
      .limit(1);
    return row;
  }

  async saveMetaphysicsResult(userId: string, testType: string, birthData: string, result: string): Promise<MetaphysicsResult> {
    const now = new Date().toISOString();
    const [row] = await db.insert(metaphysicsResults).values({
      userId,
      testType,
      birthData,
      result,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return row;
  }
}

export const storage = new DatabaseStorage();
