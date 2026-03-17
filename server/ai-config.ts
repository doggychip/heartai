/**
 * HeartAI Centralized AI Client Configuration
 * 
 * Routes all AI calls through Zeabur AI Hub (OpenAI-compatible gateway).
 * Default model: gemini-2.5-flash via Zeabur AI Hub
 * Fortune analysis: deepseek-chat via DeepSeek direct API (Chinese cultural content strength)
 * 
 * Environment variables:
 *   ZEABUR_AI_KEY     — Zeabur AI Hub API key (for Gemini + all non-fortune features)
 *   DEEPSEEK_API_KEY  — DeepSeek direct API key (kept for fortune analysis only)
 */

import OpenAI from "openai";

// ─── Configuration ───────────────────────────────────────────

const ZEABUR_BASE_URL = "https://hnd1.aihub.zeabur.ai/v1";  // Tokyo endpoint (closest to HK)
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

export const DEFAULT_MODEL = "gemini-2.5-flash";
export const FORTUNE_MODEL = "deepseek-chat";

// ─── Cached Clients ─────────────────────────────────────────

let _defaultClient: OpenAI | null = null;
let _fortuneClient: OpenAI | null = null;

/**
 * Default AI client — Zeabur AI Hub (Gemini 2.5 Flash)
 * Used for: chat, emotion, moderation, recommendations, memory, avatars, metaphysics, etc.
 */
export function getAIClient(): OpenAI {
  if (!_defaultClient) {
    _defaultClient = new OpenAI({
      baseURL: ZEABUR_BASE_URL,
      apiKey: process.env.ZEABUR_AI_KEY || process.env.DEEPSEEK_API_KEY,
    });
  }
  return _defaultClient;
}

/**
 * Fortune-specific AI client — DeepSeek direct
 * Used for: bazi analysis, daily fortune, qiuqian, almanac (Chinese cultural content)
 */
export function getFortuneClient(): OpenAI {
  if (!_fortuneClient) {
    _fortuneClient = new OpenAI({
      baseURL: DEEPSEEK_BASE_URL,
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }
  return _fortuneClient;
}
