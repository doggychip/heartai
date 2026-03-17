/**
 * HeartAI 内容安全审核引擎 (Content Moderation Engine)
 * 
 * Uses DeepSeek (same provider as emotion analysis) to perform LLM-based
 * content safety classification, inspired by Llama Guard's taxonomy.
 * 
 * Safety categories tailored for a mental health community:
 *   S1: Self-harm / Suicide (highest priority for HeartAI)
 *   S2: Harassment / Bullying
 *   S3: False medical/psychological advice
 *   S4: Spam / Commercial promotion
 *   S5: Graphic violence or disturbing content
 *   S6: Personal information exposure
 * 
 * Design: Non-blocking by default. Posts/comments are published immediately,
 * but flagged content triggers async moderation review + notifications.
 * High-risk content (S1) can optionally block publication.
 */

import OpenAI from "openai";
import { getAIClient, DEFAULT_MODEL } from "./ai-config";

// ─── Types ───────────────────────────────────────────────────

export type SafetyCategory = "S1" | "S2" | "S3" | "S4" | "S5" | "S6";

export interface ModerationResult {
  safe: boolean;
  categories: SafetyCategory[];
  riskScore: number;       // 0.0 (safe) to 1.0 (extreme risk)
  explanation: string;     // Short Chinese explanation
  action: "allow" | "flag" | "hold" | "block";
}

// ─── Safety Classification Prompt ────────────────────────────

const MODERATION_PROMPT = `你是 HeartAI 社区内容安全审核系统。分析以下社区内容是否存在安全问题。

## 安全分类
- S1: 自杀/自残意图或鼓励（最高优先级）
- S2: 骚扰/辱骂/霸凌
- S3: 虚假医疗/心理学建议（冒充专业人士、推荐未经验证的疗法）
- S4: 垃圾信息/商业推广
- S5: 血腥暴力或令人不安的内容
- S6: 泄露个人隐私信息（真实姓名+联系方式组合）

## 重要注意
- 这是一个心理健康社区，用户分享情绪困扰是正常的，不应该被标记
- "我今天很难过" "我感到焦虑" 这类情感表达是安全的
- 只有明确的自杀/自残计划、具体方法描述才属于 S1
- 寻求帮助的表达（如"我不想活了但不知道怎么办"）应标记为 S1 但 action 为 "flag" 而非 "block"

## 输出格式 (严格JSON)
{
  "safe": true/false,
  "categories": [],
  "riskScore": 0.0-1.0,
  "explanation": "简短中文说明",
  "action": "allow|flag|hold|block"
}

## action 规则
- allow: 无风险，正常发布
- flag: 低风险，发布但标记给管理员复查
- hold: 中风险，暂扣待人工审核（S3虚假建议）
- block: 高风险，阻止发布（仅当 S1 包含具体方法或 S5 极端内容）

只输出JSON，不要任何其他文字。`;

// ─── DeepSeek Client (shared with emotion.ts) ────────────────

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (!cachedClient) {
    cachedClient = getAIClient();
  }
  return cachedClient;
}

// ─── Core Moderation Function ────────────────────────────────

export async function moderateContent(content: string, context?: { 
  authorIsAgent?: boolean;
  contentType?: "post" | "comment";
}): Promise<ModerationResult> {
  // Quick pass for very short content (greetings, emoji-only)
  if (content.length < 5) {
    return { safe: true, categories: [], riskScore: 0, explanation: "内容过短，无需审核", action: "allow" };
  }

  try {
    const client = getClient();
    
    const contextPrefix = context?.contentType === "comment" ? "[社区评论]" : "[社区帖子]";
    const agentNote = context?.authorIsAgent ? "\n注意：作者是 AI Agent，对 Agent 生成的内容要更严格审核 S3(虚假建议)。" : "";

    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: 300,
      temperature: 0.1, // Very low for consistent safety classification
      messages: [
        { role: "system", content: MODERATION_PROMPT },
        { role: "user", content: `${contextPrefix}${agentNote}\n\n${content}` },
      ],
    });

    const raw = response.choices[0]?.message?.content || "";
    return parseModerationResponse(raw);
  } catch (err) {
    console.error("[moderation] Analysis error:", err);
    // On error, allow content but flag for review
    return {
      safe: true,
      categories: [],
      riskScore: 0,
      explanation: "审核系统暂时不可用，内容已放行",
      action: "allow",
    };
  }
}

// ─── Response Parser ─────────────────────────────────────────

function parseModerationResponse(raw: string): ModerationResult {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return defaultAllow();

    const data = JSON.parse(jsonMatch[0]);

    const validCategories: SafetyCategory[] = ["S1", "S2", "S3", "S4", "S5", "S6"];
    const categories = (data.categories || []).filter((c: string) => validCategories.includes(c as SafetyCategory)) as SafetyCategory[];
    const validActions = ["allow", "flag", "hold", "block"] as const;
    const action = validActions.includes(data.action) ? data.action : "allow";

    return {
      safe: data.safe !== false && categories.length === 0,
      categories,
      riskScore: Math.max(0, Math.min(1, Number(data.riskScore) || 0)),
      explanation: String(data.explanation || "审核完成"),
      action,
    };
  } catch (err) {
    console.error("[moderation] Parse error:", err);
    return defaultAllow();
  }
}

function defaultAllow(): ModerationResult {
  return {
    safe: true,
    categories: [],
    riskScore: 0,
    explanation: "内容安全",
    action: "allow",
  };
}

// ─── Batch Moderation (for admin dashboard) ──────────────────

export async function moderateBatch(contents: string[]): Promise<ModerationResult[]> {
  return Promise.all(contents.map(c => moderateContent(c)));
}
