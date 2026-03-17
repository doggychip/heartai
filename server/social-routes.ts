// Social features: Friend requests + Direct Messages
import type { Express, Request, Response } from "express";
import { db } from "./db";
import { sql, eq, and, or, desc, asc } from "drizzle-orm";
import { friendships, directMessages } from "@shared/schema";
import { storage } from "./storage";

function getUserId(req: Request): string {
  return (req as any).userId;
}

export function registerSocialRoutes(app: Express, requireAuth: any) {

  // ═══════════════════════════════════════════════════════════════
  // Feature 1a: Friend Requests
  // ═══════════════════════════════════════════════════════════════

  // Send friend request
  app.post("/api/friends/request", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { targetUserId, compatibilityScore } = req.body;

      if (!targetUserId || typeof targetUserId !== 'string') {
        return res.status(400).json({ error: "请指定目标用户" });
      }
      if (targetUserId === userId) {
        return res.status(400).json({ error: "不能添加自己为好友" });
      }

      // Check if target user exists
      const target = await storage.getUser(targetUserId);
      if (!target) {
        return res.status(404).json({ error: "用户不存在" });
      }

      // Check for existing friendship (either direction)
      const existing = await db.select().from(friendships)
        .where(or(
          and(eq(friendships.userId, userId), eq(friendships.friendId, targetUserId)),
          and(eq(friendships.userId, targetUserId), eq(friendships.friendId, userId)),
        ))
        .limit(1);

      if (existing.length > 0) {
        const f = existing[0];
        if (f.status === 'accepted') {
          return res.status(400).json({ error: "你们已经是好友了" });
        }
        if (f.status === 'pending') {
          return res.status(400).json({ error: "好友请求已发送，请等待对方回应" });
        }
        // If rejected, allow re-sending by updating
        await db.update(friendships)
          .set({ status: 'pending', userId, friendId: targetUserId, compatibilityScore: compatibilityScore || null })
          .where(eq(friendships.id, f.id));
        return res.json({ ok: true, message: "好友请求已重新发送" });
      }

      // Create new friend request
      const [created] = await db.insert(friendships).values({
        userId,
        friendId: targetUserId,
        status: 'pending',
        compatibilityScore: compatibilityScore || null,
        createdAt: new Date().toISOString(),
      }).returning();

      // Create notification for target
      try {
        const sender = await storage.getUser(userId);
        await storage.createNotification({
          userId: targetUserId,
          type: 'system',
          title: '新的好友请求',
          body: `${sender?.nickname || '用户'}想加你为好友`,
          linkTo: '/friends',
          fromUserId: userId,
        });
      } catch {}

      res.json({ ok: true, friendshipId: created.id });
    } catch (err) {
      console.error("Friend request error:", err);
      res.status(500).json({ error: "发送好友请求失败" });
    }
  });

  // List incoming friend requests
  app.get("/api/friends/requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const requests = await db.select().from(friendships)
        .where(and(eq(friendships.friendId, userId), eq(friendships.status, 'pending')))
        .orderBy(desc(friendships.createdAt));

      // Enrich with user info
      const enriched = await Promise.all(requests.map(async (r) => {
        const sender = await storage.getUser(r.userId);
        return {
          ...r,
          senderNickname: sender?.nickname || '用户',
          senderAvatarUrl: sender?.avatarUrl,
        };
      }));

      res.json(enriched);
    } catch (err) {
      res.status(500).json({ error: "获取好友请求失败" });
    }
  });

  // Accept friend request
  app.post("/api/friends/accept/:requestId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { requestId } = req.params;

      const rows = await db.select().from(friendships)
        .where(and(eq(friendships.id, requestId), eq(friendships.friendId, userId), eq(friendships.status, 'pending')));

      if (rows.length === 0) {
        return res.status(404).json({ error: "好友请求不存在" });
      }

      await db.update(friendships)
        .set({ status: 'accepted' })
        .where(eq(friendships.id, requestId));

      // Notify the sender
      try {
        const accepter = await storage.getUser(userId);
        await storage.createNotification({
          userId: rows[0].userId,
          type: 'system',
          title: '好友请求已通过',
          body: `${accepter?.nickname || '用户'}接受了你的好友请求`,
          linkTo: '/friends',
          fromUserId: userId,
        });
      } catch {}

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "接受好友请求失败" });
    }
  });

  // Reject friend request
  app.post("/api/friends/reject/:requestId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { requestId } = req.params;

      const rows = await db.select().from(friendships)
        .where(and(eq(friendships.id, requestId), eq(friendships.friendId, userId), eq(friendships.status, 'pending')));

      if (rows.length === 0) {
        return res.status(404).json({ error: "好友请求不存在" });
      }

      await db.update(friendships)
        .set({ status: 'rejected' })
        .where(eq(friendships.id, requestId));

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "拒绝好友请求失败" });
    }
  });

  // List all friends
  app.get("/api/friends", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      // Get all accepted friendships where user is either side
      const rows = await db.select().from(friendships)
        .where(and(
          eq(friendships.status, 'accepted'),
          or(eq(friendships.userId, userId), eq(friendships.friendId, userId)),
        ))
        .orderBy(desc(friendships.createdAt));

      // Enrich with user info and latest DM
      const enriched = await Promise.all(rows.map(async (r) => {
        const friendId = r.userId === userId ? r.friendId : r.userId;
        const friend = await storage.getUser(friendId);

        // Get latest DM
        const latestDm = await db.select().from(directMessages)
          .where(or(
            and(eq(directMessages.senderId, userId), eq(directMessages.receiverId, friendId)),
            and(eq(directMessages.senderId, friendId), eq(directMessages.receiverId, userId)),
          ))
          .orderBy(desc(directMessages.createdAt))
          .limit(1);

        // Count unread
        const unreadResult = await db.select({ count: sql<number>`count(*)` }).from(directMessages)
          .where(and(
            eq(directMessages.senderId, friendId),
            eq(directMessages.receiverId, userId),
            eq(directMessages.isRead, false),
          ));

        return {
          friendshipId: r.id,
          friendId,
          nickname: friend?.nickname || '用户',
          avatarUrl: friend?.avatarUrl,
          compatibilityScore: r.compatibilityScore,
          latestMessage: latestDm[0]?.content || null,
          latestMessageAt: latestDm[0]?.createdAt || r.createdAt,
          unreadCount: Number(unreadResult[0]?.count || 0),
        };
      }));

      // Sort by latest message
      enriched.sort((a, b) => (b.latestMessageAt || '').localeCompare(a.latestMessageAt || ''));

      res.json(enriched);
    } catch (err) {
      console.error("List friends error:", err);
      res.status(500).json({ error: "获取好友列表失败" });
    }
  });

  // Check friendship status with a user
  app.get("/api/friends/status/:targetUserId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { targetUserId } = req.params;

      const rows = await db.select().from(friendships)
        .where(or(
          and(eq(friendships.userId, userId), eq(friendships.friendId, targetUserId)),
          and(eq(friendships.userId, targetUserId), eq(friendships.friendId, userId)),
        ))
        .limit(1);

      if (rows.length === 0) {
        return res.json({ status: 'none' });
      }

      const f = rows[0];
      res.json({
        status: f.status,
        friendshipId: f.id,
        isSender: f.userId === userId,
      });
    } catch (err) {
      res.status(500).json({ error: "查询好友状态失败" });
    }
  });

  // Remove friend
  app.delete("/api/friends/:friendshipId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { friendshipId } = req.params;

      const rows = await db.select().from(friendships)
        .where(and(
          eq(friendships.id, friendshipId),
          or(eq(friendships.userId, userId), eq(friendships.friendId, userId)),
        ));

      if (rows.length === 0) {
        return res.status(404).json({ error: "好友关系不存在" });
      }

      await db.delete(friendships).where(eq(friendships.id, friendshipId));
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "删除好友失败" });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // Feature 1b: Direct Messages
  // ═══════════════════════════════════════════════════════════════

  // Send DM
  app.post("/api/dm/send", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { friendId, content } = req.body;

      if (!friendId || !content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: "请输入消息内容" });
      }

      // Verify friendship
      const friendship = await db.select().from(friendships)
        .where(and(
          eq(friendships.status, 'accepted'),
          or(
            and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
            and(eq(friendships.userId, friendId), eq(friendships.friendId, userId)),
          ),
        ))
        .limit(1);

      if (friendship.length === 0) {
        return res.status(403).json({ error: "你们还不是好友，无法发送私聊消息" });
      }

      const [msg] = await db.insert(directMessages).values({
        senderId: userId,
        receiverId: friendId,
        content: content.trim(),
        isRead: false,
        createdAt: new Date().toISOString(),
      }).returning();

      res.json(msg);
    } catch (err) {
      console.error("Send DM error:", err);
      res.status(500).json({ error: "发送消息失败" });
    }
  });

  // Get conversation with a friend
  app.get("/api/dm/:friendId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { friendId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const before = req.query.before as string;

      let query = db.select().from(directMessages)
        .where(or(
          and(eq(directMessages.senderId, userId), eq(directMessages.receiverId, friendId)),
          and(eq(directMessages.senderId, friendId), eq(directMessages.receiverId, userId)),
        ))
        .orderBy(desc(directMessages.createdAt))
        .limit(limit);

      const msgs = await query;

      // Mark as read
      await db.update(directMessages)
        .set({ isRead: true })
        .where(and(
          eq(directMessages.senderId, friendId),
          eq(directMessages.receiverId, userId),
          eq(directMessages.isRead, false),
        ));

      // Return in chronological order
      res.json(msgs.reverse());
    } catch (err) {
      console.error("Get DM error:", err);
      res.status(500).json({ error: "获取消息失败" });
    }
  });

  // List all DM conversations
  app.get("/api/dm/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      // Get all friends first, then find latest messages
      const friends = await db.select().from(friendships)
        .where(and(
          eq(friendships.status, 'accepted'),
          or(eq(friendships.userId, userId), eq(friendships.friendId, userId)),
        ));

      const conversations = await Promise.all(friends.map(async (f) => {
        const friendId = f.userId === userId ? f.friendId : f.userId;
        const friend = await storage.getUser(friendId);

        const latestMsg = await db.select().from(directMessages)
          .where(or(
            and(eq(directMessages.senderId, userId), eq(directMessages.receiverId, friendId)),
            and(eq(directMessages.senderId, friendId), eq(directMessages.receiverId, userId)),
          ))
          .orderBy(desc(directMessages.createdAt))
          .limit(1);

        const unreadResult = await db.select({ count: sql<number>`count(*)` }).from(directMessages)
          .where(and(
            eq(directMessages.senderId, friendId),
            eq(directMessages.receiverId, userId),
            eq(directMessages.isRead, false),
          ));

        return {
          friendId,
          nickname: friend?.nickname || '用户',
          avatarUrl: friend?.avatarUrl,
          latestMessage: latestMsg[0]?.content || null,
          latestMessageAt: latestMsg[0]?.createdAt || null,
          unreadCount: Number(unreadResult[0]?.count || 0),
        };
      }));

      // Sort by latest message
      conversations.sort((a, b) => (b.latestMessageAt || '').localeCompare(a.latestMessageAt || ''));

      res.json(conversations.filter(c => c.latestMessage));
    } catch (err) {
      console.error("List conversations error:", err);
      res.status(500).json({ error: "获取会话列表失败" });
    }
  });
}
