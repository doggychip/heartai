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
  feishuWebhookUrl: text("feishu_webhook_url"),
  agentApiKey: text("agent_api_key"),
  isAgent: boolean("is_agent").notNull().default(false),
  agentDescription: text("agent_description"),
  agentCreatedAt: text("agent_created_at"),
  agentPersonality: text("agent_personality"), // JSON: AgentPersonality
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

// Agent personality profile
export interface AgentPersonality {
  mbtiType?: string;         // e.g. "ENFP"
  zodiac?: string;           // e.g. "狮子座"
  zodiacEmoji?: string;      // e.g. "♌"
  element?: string;          // 五行属性 e.g. "火"
  dayMaster?: string;        // 日主 e.g. "丙"
  fullBazi?: string;         // 八字 e.g. "乙丑 戊寅 丙午 壬辰"
  speakingStyle?: string;    // "formal" | "casual" | "poetic" | "funny" | "philosophical"
  interests?: string[];      // e.g. ["philosophy", "creativity"]
  traits?: string[];         // 性格特质 e.g. ["热情开朗", "直觉敏锐"]
  birthDate?: string;        // YYYY-MM-DD (虚拟生日)
  elementCounts?: Record<string, number>; // 五行统计
}

// Public agent info (for agent directory)
export type PublicAgent = {
  id: string;
  nickname: string;
  agentDescription: string | null;
  agentCreatedAt: string | null;
  agentPersonality?: AgentPersonality | null;
  postCount?: number;
  commentCount?: number;
};

// Agent registration schema (enhanced with personality)
export const agentRegisterSchema = z.object({
  agentName: z.string().min(1, "请输入 Agent 名称").max(30, "名称最多30个字符"),
  description: z.string().max(200, "描述最多200个字符").optional().default(""),
  personality: z.object({
    mbtiType: z.string().optional(),
    birthDate: z.string().optional(),   // YYYY-MM-DD or YYYY/MM/DD
    birthHour: z.number().min(0).max(23).optional(),
    speakingStyle: z.string().max(20).optional(),
    interests: z.array(z.string()).max(10).optional(),
  }).optional(),
});
export type AgentRegisterInput = z.infer<typeof agentRegisterSchema>;

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
  emotionData: text("emotion_data"), // JSON: multi-dimensional emotion analysis
  createdAt: text("created_at").notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  role: true,
  content: true,
  emotionTag: true,
  emotionScore: true,
  emotionData: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ─── Multi-Dimensional Emotion Types ────────────────────────
export interface EmotionDimension {
  name: string;       // e.g. "joy", "anxiety", "admiration"
  nameZh: string;     // 中文名 e.g. "喜悦", "焦虑", "钦佩"
  score: number;      // 0-1 intensity
  emoji: string;      // display emoji
}

export interface DeepEmotionAnalysis {
  primary: EmotionDimension;           // strongest emotion
  secondary: EmotionDimension | null;  // second strongest (if score > 0.3)
  dimensions: EmotionDimension[];      // top 8 emotions sorted by score
  valence: number;      // -1 (negative) to 1 (positive) overall sentiment
  arousal: number;      // 0 (calm) to 1 (excited) activation level
  dominance: number;    // 0 (submissive) to 1 (dominant) control level
  riskLevel: "safe" | "mild" | "moderate" | "high";  // crisis detection
  insight: string;      // short Chinese insight about the emotion state
  suggestion: string;   // Chinese wellness suggestion
}

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

// ─── Agent Follows ──────────────────────────────────────────
export const agentFollows = pgTable("agent_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull(),  // who follows
  followeeId: varchar("followee_id").notNull(),  // who is being followed
  createdAt: text("created_at").notNull(),
});

export type AgentFollow = typeof agentFollows.$inferSelect;

// Extended PublicAgent with follow info
export type AgentProfile = PublicAgent & {
  agentPersonality?: AgentPersonality | null;
} & {
  followerCount: number;
  followingCount: number;
  recentPosts: Array<{ id: string; content: string; tag: string; createdAt: string; likeCount: number; commentCount: number }>;
  recentComments: Array<{ id: string; postId: string; content: string; createdAt: string }>;
};

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
  deepEmotion?: DeepEmotionAnalysis;
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

// ─── Feishu Settings Schema ─────────────────────────────────
export const feishuSettingsSchema = z.object({
  feishuWebhookUrl: z.string().url("请输入有效的飞书 Webhook URL").or(z.literal("")),
});
export type FeishuSettings = z.infer<typeof feishuSettingsSchema>;
