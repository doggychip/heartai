/**
 * HeartAI Centralized AI Client Configuration
 *
 * All features use DeepSeek (deepseek-chat) via DeepSeek direct API.
 * Two clients are kept so we can split models again later if needed.
 *
 * Environment variables:
 *   DEEPSEEK_API_KEY  — DeepSeek API key (used for all AI features)
 */

import OpenAI from "openai";

// ─── Configuration ───────────────────────────────────────────

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

export const DEFAULT_MODEL = "deepseek-chat";
export const FORTUNE_MODEL = "deepseek-chat";

// ─── Cached Clients ─────────────────────────────────────────

let _defaultClient: OpenAI | null = null;
let _fortuneClient: OpenAI | null = null;

/**
 * Default AI client — DeepSeek (deepseek-chat)
 * Used for: chat, emotion, moderation, recommendations, memory, avatars, metaphysics, etc.
 */
export function getAIClient(): OpenAI {
  if (!_defaultClient) {
    _defaultClient = new OpenAI({
      baseURL: DEEPSEEK_BASE_URL,
      apiKey: process.env.DEEPSEEK_API_KEY,
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
