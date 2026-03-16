import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ──────────────────────────────────────────────────
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  publicId: text("public_id").unique(), // 6-char alphanumeric ID for user search (e.g. "GX-A3K9")
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  nickname: text("nickname"),
  avatarUrl: text("avatar_url"),
  openclawWebhookUrl: text("openclaw_webhook_url"),
  openclawWebhookToken: text("openclaw_webhook_token"),
  feishuWebhookUrl: text("feishu_webhook_url"),
  agentApiKey: text("agent_api_key"),
  // User profile (persistent, auto-populated)
  birthDate: text("birth_date"),             // YYYY-MM-DD
  birthHour: integer("birth_hour"),            // 0-23
  mbtiType: text("mbti_type"),                // e.g. "ENFP"
  zodiacSign: text("zodiac_sign"),            // e.g. "白羊座"
  
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
  avatarUrl?: string | null;
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
  isFromAvatar: boolean("is_from_avatar").notNull().default(false), // AI分身自动发帖标识
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
  isFromAvatar: boolean("is_from_avatar").notNull().default(false), // AI分身自动点赞标识
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
  isFromAvatar: boolean("is_from_avatar").notNull().default(false), // AI分身自动评论标识
  createdAt: text("created_at").notNull(),
});

export const insertPostCommentSchema = createInsertSchema(postComments).pick({
  postId: true,
  userId: true,
  content: true,
  isAnonymous: true,
  isFromAvatar: true,
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

// ─── AI 分身 (Cyber Avatar) ─────────────────────────────────
export const avatars = pgTable("avatars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(), // one avatar per user
  name: text("name").notNull(),
  bio: text("bio"),

  // 性格滑块 (0-100)
  sliderPraise: integer("slider_praise").notNull().default(50),    // 0=锐评 100=夸夸
  sliderSerious: integer("slider_serious").notNull().default(50),  // 0=抽象 100=正经
  sliderWarm: integer("slider_warm").notNull().default(50),        // 0=高冷 100=显眼

  // 命格底色 (auto-computed from user personality)
  element: text("element"),           // 五行属性
  elementTraits: text("element_traits"), // JSON: string[] 命格特质

  // 玄学标签 (metaphysical attribute tags — auto-populated)
  zodiacSign: text("zodiac_sign"),       // 星座 e.g. "白羊座"
  mbtiType: text("mbti_type"),           // MBTI人格 e.g. "ENFP"
  fiveElement: text("five_element"),     // 五行属性 e.g. "火"
  spiritAnimal: text("spirit_animal"),   // 灵兽 e.g. "朱雀"
  luckyNumber: integer("lucky_number"),  // 幸运数字 e.g. 7
  tarotCard: text("tarot_card"),         // 塔罗牌 e.g. "愚者"

  // 分身设置
  isActive: boolean("is_active").notNull().default(true),
  autoLike: boolean("auto_like").notNull().default(true),
  autoComment: boolean("auto_comment").notNull().default(true),
  autoBrowse: boolean("auto_browse").notNull().default(true),
  maxActionsPerHour: integer("max_actions_per_hour").notNull().default(10),

  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertAvatarSchema = createInsertSchema(avatars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAvatar = z.infer<typeof insertAvatarSchema>;
export type Avatar = typeof avatars.$inferSelect;

export const createAvatarSchema = z.object({
  name: z.string().min(1, "请输入分身名称").max(20),
  bio: z.string().max(200).optional(),
  sliderPraise: z.number().min(0).max(100).default(50),
  sliderSerious: z.number().min(0).max(100).default(50),
  sliderWarm: z.number().min(0).max(100).default(50),
  autoLike: z.boolean().default(true),
  autoComment: z.boolean().default(true),
  autoBrowse: z.boolean().default(true),
});
export type CreateAvatarInput = z.infer<typeof createAvatarSchema>;

// ─── 分身记忆 (Avatar Memory) ───────────────────────────────
export const avatarMemories = pgTable("avatar_memories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  avatarId: varchar("avatar_id").notNull(),
  category: text("category").notNull(), // "interest" | "style" | "opinion" | "fact" | "preference"
  content: text("content").notNull(),
  source: text("source"),             // where this was learned from
  weight: integer("weight").notNull().default(1), // importance 1-10
  createdAt: text("created_at").notNull(),
});

export const insertAvatarMemorySchema = createInsertSchema(avatarMemories).omit({
  id: true, createdAt: true,
});
export type InsertAvatarMemory = z.infer<typeof insertAvatarMemorySchema>;
export type AvatarMemory = typeof avatarMemories.$inferSelect;

// ─── 分身行为日志 (Avatar Action Log) ───────────────────────
export const avatarActions = pgTable("avatar_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  avatarId: varchar("avatar_id").notNull(),
  actionType: text("action_type").notNull(), // "browse" | "like" | "comment" | "skip"
  targetPostId: varchar("target_post_id"),
  content: text("content"),                  // for comment actions
  innerThought: text("inner_thought"),       // AI内心OS
  isApproved: boolean("is_approved"),        // null=pending, true=user approved, false=rejected
  createdAt: text("created_at").notNull(),
});

export const insertAvatarActionSchema = createInsertSchema(avatarActions).omit({
  id: true, createdAt: true,
});
export type InsertAvatarAction = z.infer<typeof insertAvatarActionSchema>;
export type AvatarAction = typeof avatarActions.$inferSelect;

// ─── 分身对话 (Avatar Chat — others chat with your avatar) ──
export const avatarChats = pgTable("avatar_chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  avatarId: varchar("avatar_id").notNull(),  // whose avatar
  visitorId: varchar("visitor_id").notNull(), // who is chatting
  createdAt: text("created_at").notNull(),
});

export const avatarChatMessages = pgTable("avatar_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull(),
  role: text("role").notNull(),  // "visitor" | "avatar"
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

export type AvatarChat = typeof avatarChats.$inferSelect;
export type AvatarChatMessage = typeof avatarChatMessages.$inferSelect;

// ─── Notifications ────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),      // recipient
  type: text("type").notNull(),               // "like" | "comment" | "avatar_action" | "fortune" | "system"
  title: text("title").notNull(),
  body: text("body").notNull(),
  linkTo: text("link_to"),                    // e.g. "/community/postId"
  fromUserId: varchar("from_user_id"),        // who triggered it (null for system)
  isRead: boolean("is_read").notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// ─── Agent Team Orchestration ──────────────────────────────
// Tracks each agent's role, system prompt, and usage stats
export const agentTeam = pgTable("agent_team", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentKey: text("agent_key").notNull().unique(),       // "main" | "stella" | "prediction" | "market" | "tech"
  name: text("name").notNull(),                          // 显示名 e.g. "星曜命理师"
  role: text("role").notNull(),                           // "orchestrator" | "specialist"
  domain: text("domain").notNull(),                       // "命理" | "运势" | "市场" | "技术" | "编排"
  description: text("description").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  icon: text("icon").notNull(),                           // lucide icon name
  color: text("color").notNull(),                         // badge color class
  totalCalls: integer("total_calls").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  avgLatencyMs: integer("avg_latency_ms").notNull().default(0),
  lastActiveAt: text("last_active_at"),
  isActive: boolean("is_active").notNull().default(true),
});

export type AgentTeamMember = typeof agentTeam.$inferSelect;

// ─── Agent Dispatch Log (Orchestrator routing records) ─────
export const agentDispatchLog = pgTable("agent_dispatch_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  userMessage: text("user_message").notNull(),
  intentClassified: text("intent_classified").notNull(),  // "命理" | "运势" | "社区" | "对话" | "技术"
  dispatchedTo: text("dispatched_to").notNull(),           // agent_key
  responsePreview: text("response_preview"),               // first 100 chars
  tokensUsed: integer("tokens_used").notNull().default(0),
  latencyMs: integer("latency_ms").notNull().default(0),
  success: boolean("success").notNull().default(true),
  errorMsg: text("error_msg"),
  createdAt: text("created_at").notNull(),
});

export type AgentDispatchRecord = typeof agentDispatchLog.$inferSelect;

// ─── Event Bus (pub/sub cross-agent events) ────────────────
export const agentEvents = pgTable("agent_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(),   // "fortune_shift" | "qiuqian_drawn" | "post_created" | "mood_alert" | "bazi_analyzed"
  publisherAgent: text("publisher_agent").notNull(),  // agent_key that published
  payload: text("payload").notNull(),                  // JSON string
  subscriberAgents: text("subscriber_agents").notNull(), // JSON array of agent_keys that consumed
  status: text("status").notNull().default("pending"),  // "pending" | "processing" | "completed" | "failed"
  resultSummary: text("result_summary"),
  userId: varchar("user_id"),
  createdAt: text("created_at").notNull(),
  processedAt: text("processed_at"),
});

export type AgentEvent = typeof agentEvents.$inferSelect;

// ─── Agent Team Types ──────────────────────────────────────
export type AgentTeamTopology = {
  orchestrator: AgentTeamMember;
  specialists: AgentTeamMember[];
  connections: Array<{ from: string; to: string; label: string }>;
};

export type AgentTeamStats = {
  totalDispatches: number;
  todayDispatches: number;
  totalEvents: number;
  avgLatency: number;
  agentUsage: Array<{ agentKey: string; name: string; calls: number; tokens: number }>;
  recentEvents: AgentEvent[];
  recentDispatches: AgentDispatchRecord[];
};

// ═══════════════════════════════════════════════════════════════
// Phase 4: ClawHub Skills + Webhook API + Developer Ecosystem
// ═══════════════════════════════════════════════════════════════

// ─── Developer Apps (third-party developer registration) ────
export const developerApps = pgTable("developer_apps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),        // owner (观星 user)
  appName: text("app_name").notNull(),          // e.g. "我的风水App"
  appDescription: text("app_description"),
  apiKey: text("api_key").notNull().unique(),    // gx_sk_xxxxxxxx
  webhookUrl: text("webhook_url"),              // optional callback URL
  permissions: text("permissions").notNull(),    // JSON: string[] e.g. ["bazi","fortune","qiuqian"]
  rateLimit: integer("rate_limit").notNull().default(100), // requests per hour
  totalCalls: integer("total_calls").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull(),
  lastUsedAt: text("last_used_at"),
});

export const insertDeveloperAppSchema = createInsertSchema(developerApps).omit({
  id: true, totalCalls: true, totalTokens: true, createdAt: true, lastUsedAt: true,
});
export type InsertDeveloperApp = z.infer<typeof insertDeveloperAppSchema>;
export type DeveloperApp = typeof developerApps.$inferSelect;

export const createDeveloperAppSchema = z.object({
  appName: z.string().min(1, "请输入应用名称").max(50, "名称最多50个字符"),
  appDescription: z.string().max(500, "描述最多500个字符").optional(),
  permissions: z.array(z.enum(["bazi", "fortune", "qiuqian", "almanac", "zodiac", "fengshui", "dream", "tarot", "name_score", "compatibility"])).min(1, "请至少选择一个权限"),
  webhookUrl: z.string().url("请输入有效的 URL").or(z.literal("")).optional(),
});
export type CreateDeveloperAppInput = z.infer<typeof createDeveloperAppSchema>;

// ─── Webhook API Logs ───────────────────────────────────────
export const webhookLogs = pgTable("webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appId: varchar("app_id").notNull(),           // developer app
  endpoint: text("endpoint").notNull(),          // e.g. "/api/v1/bazi"
  method: text("method").notNull(),              // GET | POST
  requestBody: text("request_body"),            // JSON input
  responseStatus: integer("response_status").notNull(),
  responsePreview: text("response_preview"),     // first 200 chars
  tokensUsed: integer("tokens_used").notNull().default(0),
  latencyMs: integer("latency_ms").notNull().default(0),
  ip: text("ip"),
  createdAt: text("created_at").notNull(),
});

export type WebhookLog = typeof webhookLogs.$inferSelect;

// ─── ClawHub Skill Definitions ──────────────────────────────
export interface ClawHubSkill {
  id: string;
  slug: string;              // e.g. "guanxing-bazi"
  name: string;              // 八字命理
  nameEn: string;            // BaZi Analysis
  description: string;       // 中文描述
  category: "divination" | "fortune" | "culture" | "wellness";
  icon: string;              // lucide icon name
  endpoint: string;          // /api/v1/bazi
  inputSchema: object;       // JSON Schema of expected input
  outputSchema: object;      // JSON Schema of response
  exampleInput: object;
  exampleOutput: object;
  installs: number;
  version: string;
}

// ─── Webhook API Types ──────────────────────────────────────
export interface WebhookApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta: {
    skill: string;
    version: string;
    tokensUsed: number;
    latencyMs: number;
    timestamp: string;
  };
}
