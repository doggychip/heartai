import OpenAI from "openai";
import type { DeepEmotionAnalysis, EmotionDimension } from "@shared/schema";
import { getAIClient, DEFAULT_MODEL } from "./ai-config";

/**
 * HeartAI 深度情感分析引擎
 * 
 * Uses DeepSeek to perform multi-dimensional emotion analysis on user messages,
 * inspired by Hume AI's 53-dimension emotion model. Outputs structured emotion
 * data including primary/secondary emotions, VAD model scores, risk assessment,
 * and personalized suggestions.
 */

const EMOTION_ANALYSIS_PROMPT = `你是一个专业的情感分析AI引擎。分析用户消息中的情感维度。

## 可用情感维度 (共30个核心维度)
joy(喜悦😊), sadness(悲伤😢), anger(愤怒😤), fear(恐惧😨), anxiety(焦虑😰),
surprise(惊讶😮), calm(平静🍃), love(爱💕), gratitude(感恩🙏), hope(希望🌟),
excitement(兴奋🎉), contentment(满足😌), pride(自豪💪), amusement(愉悦😄),
admiration(钦佩✨), relief(释然😮‍💨), interest(好奇🤔), determination(坚定💎),
nostalgia(怀念🌅), empathy(共情🤝),
disappointment(失望😞), loneliness(孤独🥀), guilt(内疚😔), shame(羞耻😳),
frustration(挫败😩), jealousy(嫉妒💚), contempt(轻蔑😑), disgust(厌恶🤢),
confusion(困惑❓), tiredness(疲惫😴)

## 输出格式 (严格JSON)
{
  "dimensions": [
    {"name": "emotion_key", "nameZh": "中文名", "score": 0.0-1.0, "emoji": "emoji"}
  ],
  "valence": -1.0到1.0之间 (负面到正面),
  "arousal": 0.0到1.0之间 (平静到激动),
  "dominance": 0.0到1.0之间 (无力到掌控),
  "riskLevel": "safe|mild|moderate|high",
  "insight": "一句话分析用户情感状态(20-40字)",
  "suggestion": "一句温暖建议(20-50字)"
}

## 规则
1. dimensions 数组必须包含 top 8 个最相关的情感，按 score 降序排列
2. 每个 score 必须是 0.0-1.0 的浮点数，代表该情感的强度
3. valence: 正面情感为正值，负面为负值
4. arousal: 高能量(兴奋/愤怒)为高值，低能量(平静/悲伤)为低值
5. dominance: 掌控感(自信/骄傲)为高值，无力感(恐惧/悲伤)为低值
6. riskLevel: 检测自杀/自残/危机信号，大多数情况是 safe 或 mild
7. 只输出JSON，不要任何其他文字`;

// Cache DeepSeek client
let cachedClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (!cachedClient) {
    cachedClient = getAIClient();
  }
  return cachedClient;
}

/**
 * Analyze a user message for multi-dimensional emotions using DeepSeek
 */
export async function analyzeEmotion(userMessage: string, conversationContext?: string): Promise<DeepEmotionAnalysis> {
  try {
    const client = getClient();
    
    const userPrompt = conversationContext 
      ? `[对话上下文]\n${conversationContext}\n\n[当前消息]\n${userMessage}`
      : userMessage;

    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: 500,
      temperature: 0.3, // Low temperature for consistent analysis
      messages: [
        { role: "system", content: EMOTION_ANALYSIS_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content || "";
    return parseEmotionResponse(raw);
  } catch (err) {
    console.error("Emotion analysis error:", err);
    return getDefaultEmotion();
  }
}

function parseEmotionResponse(raw: string): DeepEmotionAnalysis {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return getDefaultEmotion();
    
    const data = JSON.parse(jsonMatch[0]);
    
    // Validate and normalize dimensions
    const dimensions: EmotionDimension[] = (data.dimensions || [])
      .slice(0, 8)
      .map((d: any) => ({
        name: String(d.name || "neutral"),
        nameZh: String(d.nameZh || "中性"),
        score: Math.max(0, Math.min(1, Number(d.score) || 0)),
        emoji: String(d.emoji || "😐"),
      }))
      .sort((a: EmotionDimension, b: EmotionDimension) => b.score - a.score);

    if (dimensions.length === 0) return getDefaultEmotion();

    const primary = dimensions[0];
    const secondary = dimensions.length > 1 && dimensions[1].score > 0.3 ? dimensions[1] : null;

    return {
      primary,
      secondary,
      dimensions,
      valence: Math.max(-1, Math.min(1, Number(data.valence) || 0)),
      arousal: Math.max(0, Math.min(1, Number(data.arousal) || 0.5)),
      dominance: Math.max(0, Math.min(1, Number(data.dominance) || 0.5)),
      riskLevel: validateRiskLevel(data.riskLevel),
      insight: String(data.insight || "正在感受当下"),
      suggestion: String(data.suggestion || "继续表达你的感受，我在倾听"),
    };
  } catch (err) {
    console.error("Failed to parse emotion response:", err);
    return getDefaultEmotion();
  }
}

function validateRiskLevel(level: any): "safe" | "mild" | "moderate" | "high" {
  if (["safe", "mild", "moderate", "high"].includes(level)) return level;
  return "safe";
}

function getDefaultEmotion(): DeepEmotionAnalysis {
  return {
    primary: { name: "calm", nameZh: "平静", score: 0.6, emoji: "🍃" },
    secondary: null,
    dimensions: [
      { name: "calm", nameZh: "平静", score: 0.6, emoji: "🍃" },
      { name: "interest", nameZh: "好奇", score: 0.4, emoji: "🤔" },
      { name: "contentment", nameZh: "满足", score: 0.3, emoji: "😌" },
    ],
    valence: 0.2,
    arousal: 0.3,
    dominance: 0.5,
    riskLevel: "safe",
    insight: "正在感受当下",
    suggestion: "继续表达你的感受，我在倾听",
  };
}

/**
 * Convert DeepEmotionAnalysis back to legacy format for backward compatibility
 */
export function toLegacyEmotion(deep: DeepEmotionAnalysis): { emotion: string; score: number; suggestion: string } {
  // Map to closest legacy emotion
  const legacyMap: Record<string, string> = {
    joy: "joy", excitement: "joy", amusement: "joy", contentment: "joy", pride: "joy",
    love: "joy", gratitude: "joy", hope: "joy", admiration: "joy", relief: "joy",
    sadness: "sadness", loneliness: "sadness", disappointment: "sadness",
    nostalgia: "sadness", guilt: "sadness", shame: "sadness",
    anger: "anger", frustration: "anger", contempt: "anger", jealousy: "anger", disgust: "anger",
    fear: "fear", anxiety: "anxiety",
    surprise: "surprise", confusion: "surprise",
    calm: "calm", tiredness: "calm",
    interest: "neutral", determination: "neutral", empathy: "neutral",
  };
  
  const legacyEmotion = legacyMap[deep.primary.name] || "neutral";
  const legacyScore = Math.round(deep.primary.score * 10);
  
  return {
    emotion: legacyEmotion,
    score: Math.max(1, Math.min(10, legacyScore)),
    suggestion: deep.suggestion,
  };
}
