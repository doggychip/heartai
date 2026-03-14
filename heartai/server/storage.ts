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
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message> = new Map();
  private moodEntries: Map<string, MoodEntry> = new Map();
  private assessments: Map<string, Assessment> = new Map();
  private assessmentResults: Map<string, AssessmentResult> = new Map();
  private posts: Map<string, CommunityPost> = new Map();
  private likes: Map<string, PostLike> = new Map();
  private comments: Map<string, PostComment> = new Map();

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { id, username: insertUser.username, password: insertUser.password, nickname: insertUser.nickname ?? null, avatarUrl: null };
    this.users.set(id, user);
    return user;
  }

  // Conversations
  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }
  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(c => c.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async createConversation(conv: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = { id, userId: conv.userId, title: conv.title ?? "新对话", createdAt: new Date().toISOString() };
    this.conversations.set(id, conversation);
    return conversation;
  }

  // Messages
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(m => m.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async createMessage(msg: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { id, conversationId: msg.conversationId, role: msg.role, content: msg.content, emotionTag: msg.emotionTag ?? null, emotionScore: msg.emotionScore ?? null, createdAt: new Date().toISOString() };
    this.messages.set(id, message);
    return message;
  }

  // Mood entries
  async getMoodEntriesByUser(userId: string): Promise<MoodEntry[]> {
    return Array.from(this.moodEntries.values()).filter(e => e.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry> {
    const id = randomUUID();
    const moodEntry: MoodEntry = { id, userId: entry.userId, moodScore: entry.moodScore, emotionTags: entry.emotionTags, note: entry.note ?? null, createdAt: new Date().toISOString() };
    this.moodEntries.set(id, moodEntry);
    return moodEntry;
  }

  // Assessments
  async getAllAssessments(): Promise<Assessment[]> {
    return Array.from(this.assessments.values()).filter(a => a.isActive);
  }
  async getAssessment(id: string): Promise<Assessment | undefined> {
    return this.assessments.get(id);
  }
  async getAssessmentBySlug(slug: string): Promise<Assessment | undefined> {
    return Array.from(this.assessments.values()).find(a => a.slug === slug);
  }
  async createAssessment(a: Assessment): Promise<Assessment> {
    this.assessments.set(a.id, a);
    return a;
  }

  // Assessment results
  async getAssessmentResultsByUser(userId: string): Promise<AssessmentResult[]> {
    return Array.from(this.assessmentResults.values()).filter(r => r.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getAssessmentResult(id: string): Promise<AssessmentResult | undefined> {
    return this.assessmentResults.get(id);
  }
  async createAssessmentResult(r: InsertAssessmentResult): Promise<AssessmentResult> {
    const id = randomUUID();
    const result: AssessmentResult = { id, userId: r.userId, assessmentId: r.assessmentId, answers: r.answers, totalScore: r.totalScore, resultSummary: r.resultSummary, resultDetail: r.resultDetail, createdAt: new Date().toISOString() };
    this.assessmentResults.set(id, result);
    return result;
  }

  // Community posts
  async getAllPosts(): Promise<CommunityPost[]> {
    return Array.from(this.posts.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getPost(id: string): Promise<CommunityPost | undefined> {
    return this.posts.get(id);
  }
  async createPost(post: InsertCommunityPost): Promise<CommunityPost> {
    const id = randomUUID();
    const p: CommunityPost = { id, userId: post.userId, content: post.content, tag: post.tag, isAnonymous: post.isAnonymous ?? false, likeCount: 0, commentCount: 0, createdAt: new Date().toISOString() };
    this.posts.set(id, p);
    return p;
  }
  async incrementPostLikeCount(postId: string, delta: number): Promise<void> {
    const post = this.posts.get(postId);
    if (post) { post.likeCount += delta; this.posts.set(postId, post); }
  }
  async incrementPostCommentCount(postId: string): Promise<void> {
    const post = this.posts.get(postId);
    if (post) { post.commentCount += 1; this.posts.set(postId, post); }
  }

  // Post likes
  async getPostLike(postId: string, userId: string): Promise<PostLike | undefined> {
    return Array.from(this.likes.values()).find(l => l.postId === postId && l.userId === userId);
  }
  async createPostLike(postId: string, userId: string): Promise<PostLike> {
    const id = randomUUID();
    const like: PostLike = { id, postId, userId, createdAt: new Date().toISOString() };
    this.likes.set(id, like);
    return like;
  }
  async deletePostLike(postId: string, userId: string): Promise<void> {
    for (const [key, like] of this.likes) {
      if (like.postId === postId && like.userId === userId) { this.likes.delete(key); break; }
    }
  }
  async getUserLikedPostIds(userId: string): Promise<string[]> {
    return Array.from(this.likes.values()).filter(l => l.userId === userId).map(l => l.postId);
  }

  // Post comments
  async getCommentsByPost(postId: string): Promise<PostComment[]> {
    return Array.from(this.comments.values()).filter(c => c.postId === postId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async createComment(comment: InsertPostComment): Promise<PostComment> {
    const id = randomUUID();
    const c: PostComment = { id, postId: comment.postId, userId: comment.userId, content: comment.content, isAnonymous: comment.isAnonymous ?? false, createdAt: new Date().toISOString() };
    this.comments.set(id, c);
    return c;
  }
}

export const storage = new MemStorage();
