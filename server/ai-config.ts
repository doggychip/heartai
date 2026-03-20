/**
 * HeartAI Centralized AI Client Configuration
 *
 * Uses DeepSeek Reasoner (deepseek-reasoner) for all AI features.
 * deepseek-reasoner produces Chain-of-Thought reasoning before answering,
 * improving quality for metaphysics, fortune, and emotional companion features.
 *
 * Note: deepseek-reasoner does NOT support:
 *   - Function Calling (not used in our chat completions)
 *   - temperature, top_p, presence_penalty, frequency_penalty (ignored, no error)
 *   - logprobs, top_logprobs (will error — do not use)
 * The response includes reasoning_content (CoT) + content (final answer).
 * Our code reads .message.content which works correctly.
 *
 * Environment variables:
 *   DEEPSEEK_API_KEY  — DeepSeek API key (used for all AI features)
 */

import OpenAI from "openai";

// ─── Configuration ───────────────────────────────────────────

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

export const DEFAULT_MODEL = "deepseek-reasoner";
export const FORTUNE_MODEL = "deepseek-reasoner";

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
