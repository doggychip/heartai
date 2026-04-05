/**
 * Premium / Subscription / Referral System
 *
 * Tiers:
 *   free    — limited reports (half content), 3 readings/day
 *   basic   — full reports, 10 readings/day (¥9.9/mo or $2.99/mo)
 *   pro     — unlimited readings, priority AI, merch discounts (¥29.9/mo or $9.99/mo)
 *   vip     — everything + 真人解读 credits, early access (¥99.9/mo or $29.99/mo)
 *
 * Credits: pay-per-use for individual premium features (e.g. AI画像)
 *   1 credit = ¥1 / $0.15
 *
 * Referral: share code → friend signs up → both get 5 credits
 */

import { pool } from "./db";

// ─── Tier Definitions ───────────────────────────────────────

export interface TierInfo {
  name: string;
  label: string;
  labelEn: string;
  priceMonthly: { cny: number; usd: number };
  dailyReadings: number;
  fullReports: boolean;
  aiPortraits: boolean;
  humanConsult: number; // credits/month for 真人解读
  merchDiscount: number; // percentage
}

export const TIERS: Record<string, TierInfo> = {
  free: {
    name: "free", label: "免费版", labelEn: "Free",
    priceMonthly: { cny: 0, usd: 0 },
    dailyReadings: 3, fullReports: false,
    aiPortraits: false, humanConsult: 0, merchDiscount: 0,
  },
  basic: {
    name: "basic", label: "基础版", labelEn: "Basic",
    priceMonthly: { cny: 9.9, usd: 2.99 },
    dailyReadings: 10, fullReports: true,
    aiPortraits: false, humanConsult: 0, merchDiscount: 5,
  },
  pro: {
    name: "pro", label: "专业版", labelEn: "Pro",
    priceMonthly: { cny: 29.9, usd: 9.99 },
    dailyReadings: 999, fullReports: true,
    aiPortraits: true, humanConsult: 0, merchDiscount: 15,
  },
  vip: {
    name: "vip", label: "VIP", labelEn: "VIP",
    priceMonthly: { cny: 99.9, usd: 29.99 },
    dailyReadings: 999, fullReports: true,
    aiPortraits: true, humanConsult: 3, merchDiscount: 30,
  },
};

// ─── Helpers ────────────────────────────────────────────────

export function getUserTier(user: { premiumTier?: string | null; premiumExpiresAt?: string | null }): string {
  if (!user.premiumTier || user.premiumTier === "free") return "free";
  if (user.premiumExpiresAt) {
    const expires = new Date(user.premiumExpiresAt);
    if (expires < new Date()) return "free"; // expired
  }
  return user.premiumTier;
}

export function getTierInfo(tier: string): TierInfo {
  return TIERS[tier] || TIERS.free;
}

export function isPremium(user: { premiumTier?: string | null; premiumExpiresAt?: string | null }): boolean {
  return getUserTier(user) !== "free";
}

// ─── Credit Operations ──────────────────────────────────────

export async function addCredits(userId: string, amount: number, reason: string): Promise<number> {
  const result = await pool.query(
    `UPDATE users SET credits = COALESCE(credits, 0) + $1 WHERE id = $2 RETURNING credits`,
    [amount, userId]
  );
  console.log(`[premium] +${amount} credits for ${userId}: ${reason}`);
  return result.rows[0]?.credits ?? 0;
}

export async function deductCredits(userId: string, amount: number, reason: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE users SET credits = credits - $1 WHERE id = $2 AND credits >= $1 RETURNING credits`,
    [amount, userId]
  );
  if (result.rowCount === 0) return false; // insufficient credits
  console.log(`[premium] -${amount} credits for ${userId}: ${reason}`);
  return true;
}

export async function getCredits(userId: string): Promise<number> {
  const result = await pool.query(`SELECT credits FROM users WHERE id = $1`, [userId]);
  return result.rows[0]?.credits ?? 0;
}

// ─── Subscription Operations ────────────────────────────────

export async function setSubscription(userId: string, tier: string, durationDays: number): Promise<void> {
  const expiresAt = new Date(Date.now() + durationDays * 86400_000).toISOString();
  await pool.query(
    `UPDATE users SET premium_tier = $1, premium_expires_at = $2 WHERE id = $3`,
    [tier, expiresAt, userId]
  );
  console.log(`[premium] ${userId} → ${tier} (${durationDays} days)`);
}

// ─── Referral Operations ────────────────────────────────────

const REFERRAL_REWARD_CREDITS = 5;

export async function generateReferralCode(userId: string): Promise<string> {
  // Use publicId as referral code, or generate one
  const result = await pool.query(`SELECT public_id, referral_code FROM users WHERE id = $1`, [userId]);
  const user = result.rows[0];
  if (user?.referral_code) return user.referral_code;

  const code = user?.public_id || `GX-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  await pool.query(`UPDATE users SET referral_code = $1 WHERE id = $2`, [code, userId]);
  return code;
}

export async function applyReferralCode(newUserId: string, referralCode: string): Promise<{ success: boolean; message: string }> {
  // Find referrer
  const referrerResult = await pool.query(
    `SELECT id FROM users WHERE referral_code = $1 AND id != $2`,
    [referralCode, newUserId]
  );
  if (referrerResult.rowCount === 0) {
    return { success: false, message: "无效的邀请码" };
  }

  const referrerId = referrerResult.rows[0].id;

  // Check if already referred
  const alreadyReferred = await pool.query(
    `SELECT referred_by FROM users WHERE id = $1`,
    [newUserId]
  );
  if (alreadyReferred.rows[0]?.referred_by) {
    return { success: false, message: "你已经使用过邀请码了" };
  }

  // Apply referral
  await pool.query(`UPDATE users SET referred_by = $1 WHERE id = $2`, [referralCode, newUserId]);
  await pool.query(
    `UPDATE users SET referral_count = COALESCE(referral_count, 0) + 1 WHERE id = $1`,
    [referrerId]
  );

  // Reward both
  await addCredits(newUserId, REFERRAL_REWARD_CREDITS, `referral bonus (invited by ${referralCode})`);
  await addCredits(referrerId, REFERRAL_REWARD_CREDITS, `referral bonus (invited ${newUserId})`);

  return { success: true, message: `成功！你和邀请人各获得 ${REFERRAL_REWARD_CREDITS} 积分` };
}
