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

// ─── AI Helpers ──────────────────────────────────────────────

/**
 * Extract JSON from AI response text.
 * Handles deepseek-reasoner's <think>...</think> preamble and markdown fences.
 */
export function extractJSON(raw: string): string {
  // Strip <think>...</think> reasoning blocks from deepseek-reasoner
  let stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  // Strip markdown code fences
  stripped = stripped.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
  // Try to extract first JSON object or array
  const match = stripped.match(/\{[\s\S]*\}/) || stripped.match(/\[[\s\S]*\]/);
  return match ? match[0] : stripped;
}

/**
 * Clamp a value to a numeric range with a default fallback.
 * Use for score fields from AI responses that may be strings, NaN, or out of range.
 */
export function clampScore(v: any, lo = 0, hi = 100, def = 75): number {
  const n = Number(v);
  return isNaN(n) ? def : Math.max(lo, Math.min(hi, Math.round(n)));
}

/**
 * AI completion with one retry on transient errors (429, 5xx).
 * Drop-in replacement for client.chat.completions.create().
 */
export async function aiComplete(
  params: Parameters<OpenAI['chat']['completions']['create']>[0],
  retries = 1
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const client = getAIClient();
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await client.chat.completions.create(params) as OpenAI.Chat.Completions.ChatCompletion;
    } catch (err: any) {
      if (attempt < retries && (err?.status === 429 || err?.status >= 500)) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("AI completion failed after retries");
}
