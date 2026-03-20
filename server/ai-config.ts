/**
 * HeartAI Centralized AI Client Configuration
 *
 * Dual-model strategy:
 *   - FORTUNE_MODEL (deepseek-reasoner): Deep fortune/metaphysics analysis — bazi, tarot,
 *     dream interpretation, horoscopes, compatibility, daily fortune, AI chat.
 *     Produces Chain-of-Thought reasoning for higher quality answers.
 *   - FAST_MODEL (deepseek-chat): Community posts, bot replies, master comments,
 *     agent intro posts, IM chat — where speed matters more than depth.
 *   - DEFAULT_MODEL: Alias for FORTUNE_MODEL (used by most features).
 *
 * Note: deepseek-reasoner does NOT support:
 *   - Function Calling (not used in our chat completions)
 *   - temperature, top_p, presence_penalty, frequency_penalty (ignored, no error)
 *   - logprobs, top_logprobs (will error — do not use)
 *
 * Environment variables:
 *   DEEPSEEK_API_KEY  — DeepSeek API key (used for all AI features)
 */

import OpenAI from "openai";

// ─── Configuration ───────────────────────────────────────────

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

/** Deep reasoning model — for fortune, metaphysics, emotional companion */
export const FORTUNE_MODEL = "deepseek-reasoner";

/** Fast model — for community posts, bot replies, short content generation */
export const FAST_MODEL = "deepseek-chat";

/** Default model — alias for FORTUNE_MODEL (deep reasoning) */
export const DEFAULT_MODEL = "deepseek-reasoner";

// ─── Cached Clients ─────────────────────────────────────────

let _defaultClient: OpenAI | null = null;

/**
 * Shared AI client — same DeepSeek endpoint for both models.
 * The model is specified per-request, not per-client.
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

/** @deprecated Use getAIClient() — kept for backwards compatibility */
export function getFortuneClient(): OpenAI {
  return getAIClient();
}
