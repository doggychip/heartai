// Shared authentication utilities — used by all route modules
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage";

// ─── JWT Configuration ───────────────────────────────────────
export const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    console.error("[FATAL] JWT_SECRET must be set in production. Exiting.");
    process.exit(1);
  }
  console.warn("[security] JWT_SECRET not set — using insecure default for development only.");
  return "heartai-dev-secret-change-in-production";
})();

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

// ─── Middleware ───────────────────────────────────────────────
export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  // 1. Check Bearer token (JWT)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      (req as any).userId = payload.userId;
      return next();
    } catch (_e) {
      // Invalid/expired token — fall through
    }
  }
  // 2. Check X-API-Key header (agent access)
  const apiKey = req.headers["x-api-key"] as string;
  if (apiKey) {
    storage.getUserByApiKey(apiKey).then(user => {
      if (user) {
        (req as any).userId = user.id;
        (req as any).isAgent = true;
      }
      next();
    }).catch(() => next());
    return;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).userId) {
    return res.status(401).json({ error: "请先登录" });
  }
  next();
}

export function getUserId(req: Request): string {
  return (req as any).userId;
}

// ─── Password Hashing ────────────────────────────────────────
const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  const isHashed = stored.startsWith("$2a$") || stored.startsWith("$2b$");
  if (isHashed) {
    return bcrypt.compare(plaintext, stored);
  }
  // Legacy plaintext comparison
  return plaintext === stored;
}

export function isPasswordHashed(password: string): boolean {
  return password.startsWith("$2a$") || password.startsWith("$2b$");
}

// ─── Rate Limiting ───────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// ─── Admin Secret Validation ─────────────────────────────────
export function validateAdminSecret(secret: string | undefined): { valid: boolean; error?: string; status?: number } {
  const expected = process.env.ADMIN_SECRET;
  if (!expected && process.env.NODE_ENV === "production") {
    return { valid: false, error: "Admin not configured", status: 503 };
  }
  const adminSecret = expected || "guanxing-bootstrap-2026";
  if (secret !== adminSecret) {
    return { valid: false, error: "Unauthorized", status: 403 };
  }
  return { valid: true };
}
