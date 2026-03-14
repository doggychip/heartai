import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ──────────────────────────────────────────────────
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  nickname: text("nickname"),
  avatarUrl: text("avatar_url"),
  openclawWebhookUrl: text("openclaw_webhook_url"),
  openclawWebhookToken: text("openclaw_webhook_token"),
  agentApiKey: text("agent_api_key"),
  isAgent: boolean("is_agent").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  nickname: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Safe user type without password (also hide agentApiKey from normal responses)
export type SafeUser = Omit<User, "password">;

// OpenClaw settings schema
export const openclawSettingsSchema = z.object({
  openclawWebhookUrl: z.string().url("请输入有效的 URL").or(z.literal("")),
  openclawWebhookToken: z.string(),
});
export type OpenClawSettings = z.infer<typeof openclawSettingsSchema>;

// ─── Conversations ──────────────────────────────────────────
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull().default("新对话"),
  createdAt: text("created_at").notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  userId: true,
  title: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// ─── Messages ───────────────────────────────────────────────
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  emotionTag: text("emotion_tag"),
  emotionScore: integer("emotion_score"),
  createdAt: text("created_at").notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  role: true,
  content: true,
  emotionTag: true,
  emotionScore: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ─── Mood Journal Entries ───────────────────────────────────
export const moodEntries = pgTable("mood_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  moodScore: integer("mood_score").notNull(),
  emotionTags: text("emotion_tags").notNull(),
  note: text("note"),
  createdAt: text("created_at").notNull(),
});

export const insertMoodEntrySchema = createInsertSchema(moodEntries).pick({
  userId: true,
  moodScore: true,
  emotionTags: true,
  note: true,
});

export type InsertMoodEntry = z.infer<typeof insertMoodEntrySchema>;
export type MoodEntry = typeof moodEntries.$inferSelect;

// ─── Assessments (test definitions) ─────────────────────────
export const assessments = pgTable("assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "professional" | "personality" | "fun"
  icon: text("icon").notNull(),
  questionCount: integer("question_count").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  questions: text("questions").notNull(),       // JSON string
  scoringRules: text("scoring_rules").notNull(), // JSON string
  isActive: boolean("is_active").notNull().default(true),
});

export type Assessment = typeof assessments.$inferSelect;

// ─── Assessment Results ─────────────────────────────────────
export const assessmentResults = pgTable("assessment_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  assessmentId: varchar("assessment_id").notNull(),
  answers: text("answers").notNull(), // JSON string
  totalScore: integer("total_score").notNull(),
  resultSummary: text("result_summary").notNull(),
  resultDetail: text("result_detail").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertAssessmentResultSchema = createInsertSchema(assessmentResults).pick({
  userId: true,
  assessmentId: true,
  answers: true,
  totalScore: true,
  resultSummary: true,
  resultDetail: true,
});

export type InsertAssessmentResult = z.infer<typeof insertAssessmentResultSchema>;
export type AssessmentResult = typeof assessmentResults.$inferSelect;

// ─── Community Posts ────────────────────────────────────────
export const communityPosts = pgTable("community_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  tag: text("tag").notNull(), // "sharing" | "question" | "encouragement" | "resource"
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const insertCommunityPostSchema = createInsertSchema(communityPosts).pick({
  userId: true,
  content: true,
  tag: true,
  isAnonymous: true,
});

export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type CommunityPost = typeof communityPosts.$inferSelect;

// ─── Post Likes ─────────────────────────────────────────────
export const postLikes = pgTable("post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export type PostLike = typeof postLikes.$inferSelect;

// ─── Post Comments ──────────────────────────────────────────
export const postComments = pgTable("post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const insertPostCommentSchema = createInsertSchema(postComments).pick({
  postId: true,
  userId: true,
  content: true,
  isAnonymous: true,
});

export type InsertPostComment = z.infer<typeof insertPostCommentSchema>;
export type PostComment = typeof postComments.$inferSelect;

// ─── API Request/Response Types ─────────────────────────────
export const chatRequestSchema = z.object({
  conversationId: z.string().nullable().optional(),
  message: z.string().min(1),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export interface ChatResponse {
  conversationId: string;
  message: Message;
  aiMessage: Message;
  emotionAnalysis: {
    emotion: string;
    score: number;
    suggestion: string;
  };
}

export const submitAssessmentSchema = z.object({
  assessmentId: z.string(),
  answers: z.array(z.number()),
});
export type SubmitAssessment = z.infer<typeof submitAssessmentSchema>;

// ─── Auth Schemas ───────────────────────────────────────────
export const registerSchema = z.object({
  username: z.string().min(2, "用户名至少2个字符").max(20, "用户名最多20个字符"),
  password: z.string().min(6, "密码至少6个字符"),
  nickname: z.string().min(1, "请输入昵称").max(20, "昵称最多20个字符"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ─── Community Schemas ──────────────────────────────────────
export const createPostSchema = z.object({
  content: z.string().min(1, "请输入内容").max(2000, "内容最多2000字"),
  tag: z.enum(["sharing", "question", "encouragement", "resource"]),
  isAnonymous: z.boolean().default(false),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  postId: z.string(),
  content: z.string().min(1, "请输入评论").max(500, "评论最多500字"),
  isAnonymous: z.boolean().default(false),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
