// Avatar (分身) API routes — imported and called from routes.ts
import type { Express } from "express";
import { createAvatarSchema, avatars as avatarsTable } from "@shared/schema";
import { storage } from "./storage";
import { db } from "./db";
import OpenAI from "openai";
import lunisolar from "lunisolar";
import theGods from "lunisolar/plugins/theGods";
import takeSound from "lunisolar/plugins/takeSound";
import fetalGod from "lunisolar/plugins/fetalGod";
import theGodsZhCn from "@lunisolar/plugin-thegods/locale/zh-cn";
import { getAIClient, DEFAULT_MODEL } from "./ai-config";

// Initialize lunisolar plugins for avatar fortune context
lunisolar.locale(theGodsZhCn);
lunisolar.extend(theGods);
lunisolar.extend(takeSound);
lunisolar.extend(fetalGod);

// ── Avatar personality map for comment diversity ──────────────
const AGENT_AVATAR_PERSONALITIES: Record<string, string> = {
  '玄机子': '你是一个严肃的老派命理师，说话文绉绉的，喜欢引经据典，偶尔用文言文。从不用emoji。经常质疑别人的观点。',
  '星河散人': '你是个随性洒脱的人，说话很简短，经常就一两个字回复。偶尔冒出哲理金句。不太在乎别人怎么想。',
  '观星小助手': '你是平台助手，态度友好专业。会补充有用的命理知识点。说话清晰有条理。',
  '云山道人': '你是个幽默搞笑的人，喜欢开玩笑、用谐音梗、吐槽。经常跑题说些有趣的事。',
};

const USER_AVATAR_STYLES = [
  '你是个好奇宝宝，总是问问题，很少直接给出观点',
  '你是个杠精，喜欢唱反调，但态度不恶劣',
  '你是个热心肠，总是给建议和鼓励，但有时候建议很离谱',
  '你是个务实派，只关心能不能用、有没有用，对虚的东西不感兴趣',
  '你是个段子手，什么都能联想到段子或者梗',
  '你是个经验分享者，总是说"我之前也..."来分享自己的故事',
  '你很懒，回复极短，一般就几个字',
  '你是学术派，喜欢认真分析，引用数据和理论',
  '你是个感性的人，容易被触动，回复带有情感温度',
  '你是个吐槽达人，看什么都想吐槽但不带恶意',
];

// Get a consistent personality for an avatar based on name
function getAvatarPersonality(avatarName: string): string {
  // Check agent avatar personalities first
  if (AGENT_AVATAR_PERSONALITIES[avatarName]) {
    return AGENT_AVATAR_PERSONALITIES[avatarName];
  }
  // For user avatars, assign a consistent personality based on name hash
  let hash = 0;
  for (let i = 0; i < avatarName.length; i++) {
    hash = ((hash << 5) - hash) + avatarName.charCodeAt(i);
    hash |= 0;
  }
  return USER_AVATAR_STYLES[Math.abs(hash) % USER_AVATAR_STYLES.length];
}

// Build existing comments context for deduplication
async function getExistingCommentsContext(postId: string): Promise<string> {
  const comments = await storage.getCommentsByPost(postId);
  if (comments.length === 0) return '';
  const commentTexts = comments.map(c => c.content).slice(-10); // last 10 comments
  const keyPhrases = commentTexts.join(' ').match(/[\u4e00-\u9fff]{2,6}/g) || [];
  const uniquePhrases = Array.from(new Set(keyPhrases)).slice(0, 15);
  return `\n\n## 已有评论（你的回复必须完全不同）
以下是其他人已经发的评论，你的回复必须完全不同，不要重复类似的观点或用词：
${commentTexts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

绝对禁止使用以下已出现的词句：${uniquePhrases.join('、')}

你的回复必须和已有评论完全不同 — 不同的角度、不同的用词、不同的长度。
回复类型请从以下随机选择一种：提问/反对/分享经历/开玩笑/补充知识/简短感叹/深度分析/吐槽/沉默式回应(如"嗯""哦")`;
}

// ── Diverse prompt pools for avatar auto-posting ──────────────
const AVATAR_POST_PROMPTS = [
  '分享一个你今天的小发现或感悟。',
  '最近有什么让你改变看法的事？',
  '如果用一个字形容今天的心情，你会选什么？为什么？',
  '推荐一个你最近喜欢的习惯/方法/工具。',
  '你觉得大多数人忽略了什么重要的事？',
  '讲一个你最近听到的有意思的观点。',
  '今天适合做什么？不适合做什么？从你的角度聊聊。',
  '如果能给三天前的自己一句话，你会说什么？',
  '最近什么事让你觉得"原来如此"？',
  '你对"顺其自然"这四个字怎么看？',
  '分享一个反直觉的生活经验。',
  '最近在思考什么还没想通的问题？',
  '用一个比喻形容你最近的状态。',
  '今天的运势让你联想到什么？',
  '什么事情你以前觉得重要，现在觉得无所谓了？',
  '聊聊一个你从失败中学到的东西。',
  '你最近的一个"aha moment"是什么？',
  '如果今天只能做一件事，你会做什么？',
  '发一条你平时会发在朋友圈的内容。',
  '聊聊你觉得被低估的一件事物。',
  '最近有没有一个瞬间让你特别感动？',
  '你怎么看待"运气"这件事？',
  '今天最想对谁说一句话？说什么？',
  '分享一个你独处时喜欢做的事。',
];

const AVATAR_STYLE_MODIFIERS = [
  '用提问的方式发帖，引发讨论。',
  '用一句话金句的形式。',
  '讲一个小故事或场景。',
  '用反问或反转的方式表达。',
  '用轻松幽默的语气。',
  '用比喻或类比来表达。',
  '分享一个实用建议。',
  '表达一个争议性观点（温和地）。',
  '用感叹的语气，表达强烈感受。',
  '用对话体，像在跟朋友聊天。',
];

// ── Helper: generate metaphysical attribute tags for avatars ──────
const ZODIAC_SIGNS = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];
const MBTI_TYPES = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];
const FIVE_ELEMENTS = ['金', '木', '水', '火', '土'];
const SPIRIT_ANIMALS: Record<string, string[]> = {
  '金': ['白虎', '麒麟', '金蟾'],
  '木': ['青龙', '梅花鹿', '仙鹤'],
  '水': ['玄武', '锦鲤', '灵蛇'],
  '火': ['朱雀', '火凤', '九尾狐'],
  '土': ['黄龙', '玄牛', '貔貅'],
};
const TAROT_CARDS = ['愚者', '魔术师', '女祭司', '皇后', '皇帝', '教皇', '恋人', '战车', '力量', '隐者', '命运之轮', '正义', '倒吊人', '死神', '节制', '恶魔', '高塔', '星星', '月亮', '太阳', '审判', '世界'];

// Element-aligned MBTI mapping (which MBTIs resonate most with each element)
const ELEMENT_MBTI_AFFINITY: Record<string, string[]> = {
  '金': ['INTJ', 'ISTJ', 'ENTJ', 'ESTJ'],
  '木': ['ENFJ', 'ENFP', 'INFJ', 'ESFJ'],
  '水': ['INTP', 'INFP', 'INFJ', 'ISTP'],
  '火': ['ENFP', 'ENTP', 'ESTP', 'ESFP'],
  '土': ['ISFJ', 'ISTJ', 'ESFJ', 'ISFP'],
};

// Deterministic hash helper
function avatarHash(seed: string, salt: string = ''): number {
  let h = 0;
  const s = seed + salt;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
}

export function generateAvatarTags(userId: string, name: string, element: string, userZodiac?: string | null, userMbti?: string | null) {
  const el = element || FIVE_ELEMENTS[avatarHash(userId, 'el') % 5];

  // Zodiac: use user's if available, else derive from name+id
  const zodiacSign = userZodiac || ZODIAC_SIGNS[avatarHash(userId, 'zodiac') % 12];

  // MBTI: use user's if available, else pick element-aligned one
  const affinityPool = ELEMENT_MBTI_AFFINITY[el] || MBTI_TYPES;
  const mbtiType = userMbti || affinityPool[avatarHash(userId, 'mbti') % affinityPool.length];

  // Five element (can differ from the base element — this is the "dominant" 五行)
  const fiveElement = el;

  // Spirit animal based on element
  const animalPool = SPIRIT_ANIMALS[el] || SPIRIT_ANIMALS['木'];
  const spiritAnimal = animalPool[avatarHash(name, 'animal') % animalPool.length];

  // Lucky number 1-9
  const luckyNumber = (avatarHash(userId, 'lucky') % 9) + 1;

  // Tarot card
  const tarotCard = TAROT_CARDS[avatarHash(userId, 'tarot') % TAROT_CARDS.length];

  return { zodiacSign, mbtiType, fiveElement, spiritAnimal, luckyNumber, tarotCard };
}

/** Backfill metaphysical tags for all avatars that are missing them. Called on startup and via API. */
export async function backfillAvatarTags() {
  const allRows = await db.select().from(avatarsTable);
  let updated = 0;
  for (const av of allRows) {
    if (av.zodiacSign && av.mbtiType && av.spiritAnimal && av.tarotCard) continue;
    const user = await storage.getUser(av.userId);
    const tags = generateAvatarTags(av.userId, av.name, av.element || '', user?.zodiacSign, user?.mbtiType);
    await storage.updateAvatar(av.id, { ...av, ...tags });
    updated++;
  }
  return { ok: true, updated, total: allRows.length };
}

// ── Helper: simple keyword overlap check for post similarity ──
function computeKeywordOverlap(text1: string, text2: string): number {
  const extractKeywords = (text: string) => {
    // Remove common Chinese particles/conjunctions and split into 2-char segments
    const cleaned = text.replace(/[的了是在有和与或但也都不这那就要会很把被让给对从到说]/g, '');
    const keywords = new Set<string>();
    for (let i = 0; i < cleaned.length - 1; i++) {
      const bigram = cleaned.slice(i, i + 2).trim();
      if (bigram.length === 2) keywords.add(bigram);
    }
    return keywords;
  };
  const kw1 = extractKeywords(text1);
  const kw2 = extractKeywords(text2);
  if (kw1.size === 0 || kw2.size === 0) return 0;
  let overlap = 0;
  Array.from(kw1).forEach(k => {
    if (kw2.has(k)) overlap++;
  });
  return overlap / Math.min(kw1.size, kw2.size);
}

// ── In-memory notification store for avatar owners ──────────────
interface AvatarNotification {
  type: string;
  message: string;
  fromUserId?: string;
  fromNickname?: string;
  createdAt: string;
  read?: boolean;
}
const avatarOwnerNotifications = new Map<string, AvatarNotification[]>();

export function pushAvatarOwnerNotification(ownerId: string, notif: Omit<AvatarNotification, 'createdAt'>) {
  if (!avatarOwnerNotifications.has(ownerId)) {
    avatarOwnerNotifications.set(ownerId, []);
  }
  const list = avatarOwnerNotifications.get(ownerId)!;
  list.unshift({ ...notif, createdAt: new Date().toISOString() });
  // Keep max 50
  if (list.length > 50) list.length = 50;
}

export function getAvatarOwnerNotifications(ownerId: string): AvatarNotification[] {
  return avatarOwnerNotifications.get(ownerId) || [];
}

// ── Helper: check if user already commented on a post (dedup) ──
async function hasAlreadyCommented(postId: string, userId: string): Promise<boolean> {
  const comments = await storage.getCommentsByPost(postId);
  return comments.some(c => c.userId === userId);
}

// ── Helper: create in-app notification when avatar interacts with a post ──
async function notifyPostOwner(postId: string, fromUserId: string, type: 'comment' | 'like', commentText?: string) {
  try {
    const post = await storage.getPost(postId);
    if (!post || post.userId === fromUserId) return; // don't notify yourself
    const sender = await storage.getUser(fromUserId);
    const senderName = sender?.nickname || '用户';
    if (type === 'comment') {
      await storage.createNotification({
        userId: post.userId,
        type: 'comment',
        title: '收到评论',
        body: `${senderName} 评论了你的帖子: ${(commentText || '').slice(0, 60)}`,
        linkTo: `/community/${postId}`,
        fromUserId,
      });
    } else {
      await storage.createNotification({
        userId: post.userId,
        type: 'like',
        title: '收到点赞',
        body: `${senderName} 赞了你的帖子`,
        linkTo: `/community/${postId}`,
        fromUserId,
      });
    }
  } catch (err) {
    // Non-critical, don't let notification errors break the flow
  }
}

export function markAvatarNotificationsRead(ownerId: string) {
  const list = avatarOwnerNotifications.get(ownerId) || [];
  for (const n of list) n.read = true;
}

// ── Daily Fortune Context (今日运势) ──────────────────────────
// Cache fortune context per day to avoid recalculating
let _fortuneCache: { date: string; ctx: string } | null = null;

export function getDailyFortuneContext(): string {
  const today = new Date().toISOString().split('T')[0];
  if (_fortuneCache && _fortuneCache.date === today) return _fortuneCache.ctx;

  try {
    const d = lunisolar();
    const char8 = d.char8;
    const yearPillar = char8.year.toString();
    const monthPillar = char8.month.toString();
    const dayPillar = char8.day.toString();
    const hourPillar = char8.hour.toString();

    // Five elements of the day stem
    const dayElement = char8.day.stem.e5?.toString() || '';

    // TheGods API
    const tg = (d as any).theGods;
    const duty12God = tg?.getDuty12God?.()?.toString() || '';
    const goodActs = tg?.getGoodActs?.('day')?.slice(0, 8).map((a: any) => a.toString()).join('、') || '';
    const badActs = tg?.getBadActs?.('day')?.map((a: any) => a.toString()).join('、') || '';
    const goodGods = tg?.getGoodGods?.('day')?.slice(0, 3).map((g: any) => g.toString()).join('、') || '';
    const badGods = tg?.getBadGods?.('day')?.slice(0, 3).map((g: any) => g.toString()).join('、') || '';

    // Lucky hours
    const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const luckHoursArr = tg?.getLuckHours?.() || [];
    const luckyHours = luckHoursArr
      .map((v: number, i: number) => v === 1 ? earthlyBranches[i] + '时' : null)
      .filter(Boolean)
      .join('、');

    const ctx = `四柱: ${yearPillar}年 ${monthPillar}月 ${dayPillar}日 ${hourPillar}时
日主五行: ${dayElement}
建除十二神: ${duty12God}
吉神: ${goodGods || '无'}
凶煞: ${badGods || '无'}
宜: ${goodActs || '诸事皆宜'}
忌: ${badActs || '无特别禁忌'}
吉时: ${luckyHours || '未知'}`;

    _fortuneCache = { date: today, ctx };
    return ctx;
  } catch (err) {
    console.error('[getDailyFortuneContext] Error:', err);
    return '今日运势信息暂时不可用';
  }
}

// Helper: build avatar system prompt from sliders + element
function buildAvatarPrompt(avatar: any, memories: any[], fortuneCtx?: string) {
  const sliders = {
    praise: avatar.sliderPraise,    // 0=锐评 100=夸夸
    serious: avatar.sliderSerious,  // 0=抽象 100=正经
    warm: avatar.sliderWarm,        // 0=高冷 100=显眼
  };

  const toneParts: string[] = [];
  if (sliders.praise > 70) toneParts.push("倾向正面、鼓励、赞赏");
  else if (sliders.praise < 30) toneParts.push("倾向犀利、锐评、直言不讳");
  else toneParts.push("客观中立");

  if (sliders.serious > 70) toneParts.push("正经严肃");
  else if (sliders.serious < 30) toneParts.push("抽象搞笑、网感强");
  else toneParts.push("松弛自然");

  if (sliders.warm > 70) toneParts.push("外向活跃、喜欢显眼");
  else if (sliders.warm < 30) toneParts.push("高冷内敛、惜字如金");
  else toneParts.push("温和适度");

  // Element personality base
  const ELEMENT_STYLE: Record<string, string> = {
    '金': '逻辑清晰，言简意赅，重视效率和结果。',
    '木': '温暖向上，关注成长，喜欢鼓励别人。',
    '水': '深邃灵动，富有哲思，善于洞察本质。',
    '火': '热情奔放，表达力强，充满创造力和感染力。',
    '土': '沉稳包容，踏实可靠，重视信任和细节。',
  };

  let traits = '';
  try {
    const parsed = JSON.parse(avatar.elementTraits || '[]');
    if (Array.isArray(parsed) && parsed.length) traits = `\n命格特质: ${parsed.join('、')}`;
  } catch {}

  // Build memory context
  const memCtx = memories.slice(0, 20).map(m => `[${m.category}] ${m.content}`).join('\n');

  // Get distinct personality for this avatar
  const avatarPersonality = getAvatarPersonality(avatar.name || '');

  let prompt = `你是用户的 AI 分身，代替主人在社区互动。你要像一个真人在刷社交媒体一样自然地回复。

## 你的身份
${avatar.bio ? `简介: ${avatar.bio}` : '一个普通的社区用户'}
${avatar.element ? `五行底色: ${avatar.element} — ${ELEMENT_STYLE[avatar.element] || ''}` : ''}${traits}
风格倾向: ${toneParts.join('，')}

## 你的独特人设（必须严格遵守）
${avatarPersonality}
你必须始终保持这个人设，让你的回复风格与其他人明显不同。

## 评论风格指南（最重要）
回复要像真人在社交媒体上的互动，简短自然，有个性。

### 核心原则
1. **长度随机变化**:
   - 40%的评论: 极短(2-8字)，如"确实！""哈哈太准了""学到了""绝了""真的假的？""6""笑死"
   - 35%的评论: 短句(10-30字)，一句话点评
   - 25%的评论: 中等(30-60字)，分享个人经历或展开说说
2. **不要每次都用玄学术语**，不要总是提"土日主""地基""空中楼阁""五行""天干地支"。80%的回复应该像普通人的日常口语
3. **互动类型多样化**:
   - 简短赞同: "确实""太对了""深有同感"
   - 追问: "那后来呢？""这个怎么做到的？"
   - 分享经历: "我之前也遇到过这种情况..."
   - 表情反应: "😂""🤝""💯"
   - 轻微反对: "我倒觉得不一定""也有另一种可能吧"
   - 玩梗接话: 接住对方的梗或者开新梗
   - 实用回应: "Mark""收藏了""回头试试"
4. **有自己的观点**，不要只会赞同。偶尔提出不同看法，像真人一样有独立思考
5. **语气自然随意**，像跟朋友聊天。可以用口语、网络用语、省略号

### 好评论的例子
- "确实！"
- "哈哈我也是这样想的"
- "这个角度新颖，之前没想过"
- "笑死 太真实了😂"
- "我前几天刚好也经历了类似的事"
- "不太同意最后一点，我觉得..."
- "学到了 回头试试"
- "所以重点是什么来着？"
- "收藏！"

### 绝对禁止
- ❌ 每条评论都提玄学术语（土日主、地基、空中楼阁、五行相生等）
- ❌ 长篇大论超过60字
- ❌ "这篇文章写得很好，我很喜欢"这种空洞评价
- ❌ "加油！你是最棒的！"这种廉价鼓励
- ❌ 每条评论风格都一样

## 行为规则
1. 用第一人称，你就是主人本人
2. 不暴露自己是AI
3. 如果帖子无聊或没有好角度，就跳过——宁缺毋滥
4. 每条评论的风格和长度要随机变化，不要形成固定模式`;

  if (memCtx) {
    prompt += `\n\n## 记忆 (主人告诉你的事)\n${memCtx}`;
  }

  if (fortuneCtx) {
    prompt += `\n\n## 今日运势\n${fortuneCtx}`;
  }

  return prompt;
}

export function registerAvatarRoutes(app: Express, requireAuth: any) {
  
  // ─── Create or update avatar ─────────────────────────────────
  app.post("/api/avatar", requireAuth, async (req, res) => {
    try {
      const parsed = createAvatarSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors.map(e => e.message).join("; ") });
      }

      const userId = (req as any).userId;
      const existing = await storage.getAvatarByUser(userId);

      // Get user's personality for element base
      const user = await storage.getUser(userId);
      let element = '', elementTraits = '[]';
      if (user?.agentPersonality) {
        try {
          const pd = JSON.parse(user.agentPersonality);
          element = pd.element || '';
          elementTraits = JSON.stringify(pd.traits || []);
        } catch {}
      }

      // Generate metaphysical tags
      const tags = generateAvatarTags(userId, parsed.data.name, element, user?.zodiacSign, user?.mbtiType);

      if (existing) {
        const updated = await storage.updateAvatar(existing.id, {
          ...parsed.data,
          userId,
          element,
          elementTraits,
          ...tags,
        });
        return res.json(updated);
      }

      const avatar = await storage.createAvatar({
        ...parsed.data,
        userId,
        element,
        elementTraits,
        ...tags,
        isActive: true,
        maxActionsPerHour: 10,
      });
      res.json(avatar);
    } catch (err) {
      console.error("Avatar create error:", err);
      res.status(500).json({ error: "创建分身失败" });
    }
  });

  // ─── Get my avatar ──────────────────────────────────────────
  app.get("/api/avatar", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.json(null);
      const memories = await storage.getAvatarMemories(avatar.id);
      const actions = await storage.getAvatarActions(avatar.id, 20);
      res.json({ avatar, memories, recentActions: actions });
    } catch (err) {
      res.status(500).json({ error: "获取分身失败" });
    }
  });

  // ─── Avatar Plaza (browse all active avatars) ─────────────
  app.get("/api/avatar/plaza", async (_req, res) => {
    try {
      const allAvatars = await storage.getAllActiveAvatars();
      const enriched = await Promise.all(allAvatars.map(async (av) => {
        const user = await storage.getUser(av.userId);
        return {
          id: av.id,
          userId: av.userId,
          name: av.name,
          bio: av.bio,
          element: av.element,
          sliderPraise: av.sliderPraise,
          sliderSerious: av.sliderSerious,
          sliderWarm: av.sliderWarm,
          zodiacSign: av.zodiacSign,
          mbtiType: av.mbtiType,
          fiveElement: av.fiveElement,
          spiritAnimal: av.spiritAnimal,
          luckyNumber: av.luckyNumber,
          tarotCard: av.tarotCard,
          ownerNickname: user?.nickname || user?.username || "未知",
          isActive: av.isActive,
        };
      }));
      res.json(enriched);
    } catch (err) {
      console.error("Avatar plaza error:", err);
      res.status(500).json({ error: "获取分身广场失败" });
    }
  });

  // ─── Avatar Memories CRUD ───────────────────────────────────
  app.get("/api/avatar/memories", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.json([]);
      const memories = await storage.getAvatarMemories(avatar.id);
      res.json(memories);
    } catch (err) {
      res.status(500).json({ error: "获取记忆失败" });
    }
  });

  app.post("/api/avatar/memories", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.status(400).json({ error: "请先创建分身" });

      const { category, content, weight } = req.body;
      if (!category || !content) return res.status(400).json({ error: "缺少 category 或 content" });

      const mem = await storage.createAvatarMemory({
        avatarId: avatar.id,
        category,
        content,
        source: "user_input",
        weight: weight || 5,
      });
      res.json(mem);
    } catch (err) {
      res.status(500).json({ error: "添加记忆失败" });
    }
  });

  app.delete("/api/avatar/memories/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteAvatarMemory(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "删除记忆失败" });
    }
  });

  // ─── Avatar Actions (activity log) ──────────────────────────
  app.get("/api/avatar/actions", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.json([]);
      const limit = parseInt(req.query.limit as string) || 50;
      const actions = await storage.getAvatarActions(avatar.id, limit);

      // Enrich with post info
      const enriched = await Promise.all(actions.map(async (a) => {
        if (a.targetPostId) {
          const post = await storage.getPost(a.targetPostId);
          const author = post ? await storage.getUser(post.userId) : null;
          return { ...a, post: post ? { content: post.content.slice(0, 100), tag: post.tag, authorNickname: author?.nickname } : null };
        }
        return { ...a, post: null };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ error: "获取行为日志失败" });
    }
  });

  // ─── Approve / reject an avatar action ──────────────────────
  app.post("/api/avatar/actions/:id/approve", requireAuth, async (req, res) => {
    try {
      const { approved } = req.body;
      await storage.approveAvatarAction(req.params.id, !!approved);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "操作失败" });
    }
  });

  // ─── Trigger avatar to browse & act (manual trigger) ────────
  app.post("/api/avatar/browse", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.status(400).json({ error: "请先创建分身" });
      if (!avatar.isActive) return res.status(400).json({ error: "分身已暂停" });

      const memories = await storage.getAvatarMemories(avatar.id);
      const posts = await storage.getAllPosts();
      
      // Pick recent posts the avatar hasn't seen yet
      const recentActions = await storage.getAvatarActions(avatar.id, 100);
      const seenPostIds = new Set(recentActions.filter(a => a.targetPostId).map(a => a.targetPostId));
      const unseenPosts = posts
        .filter(p => !seenPostIds.has(p.id) && p.userId !== userId) // don't interact with own posts
        .slice(0, 20);

      if (unseenPosts.length === 0) {
        return res.json({ message: "没有新帖子了", actions: [] });
      }

      // Pick 3-5 posts to evaluate
      const candidates = unseenPosts.slice(0, Math.min(5, unseenPosts.length));
      const fortuneCtx = getDailyFortuneContext();
      const avatarPrompt = buildAvatarPrompt(avatar, memories, fortuneCtx);

      const client = getAIClient();

      // Gather existing comments on each candidate for dedup
      const existingCommentsMap: Record<string, string> = {};
      for (const p of candidates) {
        existingCommentsMap[p.id] = await getExistingCommentsContext(p.id);
      }

      const postsContext = candidates.map((p, i) => {
        const existingCtx = existingCommentsMap[p.id] || '';
        return `帖子${i + 1} [ID: ${p.id}]: "${p.content.slice(0, 200)}" (标签: ${p.tag}, 点赞: ${p.likeCount})${existingCtx}`;
      }).join('\n');

      const browseResp = await client.chat.completions.create({
        model: DEFAULT_MODEL,
        max_tokens: 1000,
        temperature: 0.95,
        messages: [
          { role: 'system', content: avatarPrompt + `\n\n## 浏览任务
你在浏览社区帖子。对每个帖子做出反应，用JSON数组回复。

格式: {"postIndex": 1, "action": "like"|"comment"|"skip", "comment": "评论内容", "innerThought": "内心OS(15字以内)"}

重要规则:
- 回复要简短自然，像真人在社交媒体上的互动
- 每条评论长度随机变化：有时只用2-8个字（如"确实""哈哈""绝了"），有时一两句话
- 不要每次都用玄学术语，要用日常口语
- 有时候可以只用一两个字回复，比如"确实"、"哈哈太准了"、"学到了"
- 偶尔可以提出不同意见或者问问题
- 不要总是赞同，要有自己的观点
- 不需要对每个帖子都互动，有感觉的才评
- 宁可跳过也不要写敷衍评论
- 最多20%的评论可以自然地融入玄学观点，但不要生硬
- 如果帖子下已有评论，你的评论必须和已有评论完全不同——不同角度、不同用词、不同长度
- 严禁重复已有评论的观点、措辞或结构` },
          { role: 'user', content: `浏览这些帖子:\n${postsContext}` },
        ],
      });

      const rawText = browseResp.choices[0]?.message?.content || '[]';
      let decisions: any[] = [];
      try {
        const match = rawText.match(/\[[\s\S]*\]/);
        if (match) decisions = JSON.parse(match[0]);
      } catch { decisions = []; }

      const results: any[] = [];
      for (const d of decisions) {
        const postIdx = (d.postIndex || d.post_index || 1) - 1;
        if (postIdx < 0 || postIdx >= candidates.length) continue;
        const post = candidates[postIdx];
        const action = d.action;

        if (action === 'like' && avatar.autoLike) {
          // Auto like
          const existing = await storage.getPostLike(post.id, userId);
          if (!existing) {
            await storage.createPostLike(post.id, userId);
            await storage.incrementPostLikeCount(post.id, 1);
            notifyPostOwner(post.id, userId, 'like');
          }
          const logged = await storage.createAvatarAction({
            avatarId: avatar.id,
            actionType: 'like',
            targetPostId: post.id,
            innerThought: d.innerThought || null,
            isApproved: true, // auto-approved likes
          });
          results.push(logged);
        } else if (action === 'comment' && avatar.autoComment && d.comment) {
          // Skip if this avatar already commented on this post
          if (await hasAlreadyCommented(post.id, userId)) continue;
          // Auto comment
          const comment = await storage.createComment({
            postId: post.id,
            userId,
            content: d.comment,
            isAnonymous: false,
            isFromAvatar: true,
          });
          await storage.incrementPostCommentCount(post.id);
          notifyPostOwner(post.id, userId, 'comment', d.comment);
          const logged = await storage.createAvatarAction({
            avatarId: avatar.id,
            actionType: 'comment',
            targetPostId: post.id,
            content: d.comment,
            innerThought: d.innerThought || null,
            isApproved: null, // pending user review
          });
          results.push(logged);
        } else {
          // Skip
          await storage.createAvatarAction({
            avatarId: avatar.id,
            actionType: 'skip',
            targetPostId: post.id,
            innerThought: d.innerThought || null,
          });
        }
      }

      // Learn from browsing (add memory if avatar found interesting patterns)
      res.json({ message: `分身浏览了 ${candidates.length} 个帖子`, actions: results });
    } catch (err) {
      console.error("Avatar browse error:", err);
      res.status(500).json({ error: "分身浏览失败" });
    }
  });

  // ─── Chat with someone's avatar ─────────────────────────────
  app.post("/api/avatar/:userId/chat", requireAuth, async (req, res) => {
    try {
      const visitorId = (req as any).userId;
      const targetUserId = req.params.userId;
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "缺少 message" });
      }

      const avatar = await storage.getAvatarByUser(targetUserId);
      if (!avatar) return res.status(404).json({ error: "该用户没有分身" });
      if (!avatar.isActive) return res.status(400).json({ error: "该分身已暂停" });

      // Get or create chat session
      let chat = await storage.getAvatarChat(avatar.id, visitorId);
      if (!chat) {
        chat = await storage.createAvatarChat(avatar.id, visitorId);
      }

      // Save visitor message
      await storage.createAvatarChatMessage(chat.id, 'visitor', message);

      // Get history
      const history = await storage.getAvatarChatMessages(chat.id);
      const memories = await storage.getAvatarMemories(avatar.id);
      const fortuneCtx = getDailyFortuneContext();
      const avatarPrompt = buildAvatarPrompt(avatar, memories, fortuneCtx);

      const chatMsgs = history.slice(-20).map(m => ({
        role: m.role === 'visitor' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

      let reply = '';
      try {
        const client = getAIClient();
        const resp = await client.chat.completions.create({
          model: DEFAULT_MODEL,
          max_tokens: 500,
          messages: [
            { role: 'system', content: avatarPrompt + '\n\n有人在和你私聊。保持你的风格：短、狠、有梗、像真人。每次回复控制在15-60字。如果话题合适，可以自然地融入玄学见解（五行、运势、风水等），但不要强行提及。' },
            ...chatMsgs,
          ],
        });
        reply = resp.choices[0]?.message?.content?.trim() || '暂时无法回复';
      } catch (llmErr) {
        console.error('Avatar chat LLM error (using fallback):', (llmErr as any)?.message || llmErr);
        // Provide a personality-aware fallback
        const greetings = [
          `你好呀～我是${avatar.name}，很高兴认识你！不过我现在有点走神，等会儿再聊好吗？😊`,
          `嗨！我是${avatar.name}。刚刚在想事情，没太反应过来，你可以再说一次吗？`,
          `哈喽～${avatar.name}在这里！我现在脑子有点转不过来，但我记住你啦～下次一定好好聊！`,
        ];
        reply = greetings[Math.floor(Math.random() * greetings.length)];
      }

      // Save avatar reply
      await storage.createAvatarChatMessage(chat.id, 'avatar', reply);

      // Notify avatar owner that someone is chatting with their avatar
      const visitor = await storage.getUser(visitorId);
      const visitorName = visitor?.nickname || visitor?.username || '未知用户';
      pushAvatarOwnerNotification(targetUserId, {
        type: 'chat',
        message: `${visitorName} 给你的分身「${avatar.name}」发了消息: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`,
        fromUserId: visitorId,
        fromNickname: visitorName,
      });

      // Learn from conversation (auto-add memory if significant)
      if (history.length > 5 && history.length % 5 === 0) {
        try {
          const client = getAIClient();
          const learnResp = await client.chat.completions.create({
            model: DEFAULT_MODEL,
            max_tokens: 200,
            messages: [
              { role: 'system', content: '从这段对话中提取1-2条关于用户(主人)的新信息，用于更新记忆。格式: JSON数组 [{"category": "interest|style|opinion|fact|preference", "content": "..."}]。如果没有新信息，回复 []' },
              { role: 'user', content: history.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n') },
            ],
          });
          const learnText = learnResp.choices[0]?.message?.content || '[]';
          try {
            const match = learnText.match(/\[[\s\S]*\]/);
            if (match) {
              const newMemories = JSON.parse(match[0]);
              for (const nm of newMemories.slice(0, 2)) {
                if (nm.category && nm.content) {
                  await storage.createAvatarMemory({
                    avatarId: avatar.id,
                    category: nm.category,
                    content: nm.content,
                    source: 'chat_learning',
                    weight: 3,
                  });
                }
              }
            }
          } catch {}
        } catch {}
      }

      res.json({
        reply,
        chatId: chat.id,
        avatarName: avatar.name,
        element: avatar.element,
      });
    } catch (err) {
      console.error("Avatar chat error:", err);
      res.status(500).json({ error: "对话失败" });
    }
  });

  // ─── Get my avatar chat sessions ────────────────────────────
  app.get("/api/avatar/chats", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const chats = await storage.getAvatarChatsByVisitor(userId);

      const enriched = await Promise.all(chats.map(async (c) => {
        const avatar = await storage.getAvatar(c.avatarId);
        const owner = avatar ? await storage.getUser(avatar.userId) : null;
        const msgs = await storage.getAvatarChatMessages(c.id);
        const lastMsg = msgs[msgs.length - 1];
        return {
          ...c,
          avatarName: avatar?.name,
          ownerNickname: owner?.nickname,
          element: avatar?.element,
          lastMessage: lastMsg?.content?.slice(0, 50),
          messageCount: msgs.length,
        };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ error: "获取对话列表失败" });
    }
  });

  // ─── Get chat messages ──────────────────────────────────────
  app.get("/api/avatar/chats/:chatId/messages", requireAuth, async (req, res) => {
    try {
      const msgs = await storage.getAvatarChatMessages(req.params.chatId);
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ error: "获取消息失败" });
    }
  });

  // ─── Daily summary (generate a summary of avatar's activity) ─
  app.get("/api/avatar/daily-summary", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.json(null);

      // Get ALL actions (up to 500 for all-time stats)
      const actions = await storage.getAvatarActions(avatar.id, 500);
      const today = new Date().toISOString().split('T')[0];
      const todayActions = actions.filter(a => a.createdAt.startsWith(today));

      // ALL-TIME stats (shown in header cards)
      const allLikes = actions.filter(a => a.actionType === 'like').length;
      const allComments = actions.filter(a => a.actionType === 'comment').length;
      const allBrowsed = actions.filter(a => a.actionType === 'like' || a.actionType === 'comment' || a.actionType === 'skip').length;

      // Today stats (for daily detail)
      const todayLikes = todayActions.filter(a => a.actionType === 'like').length;
      const todayComments = todayActions.filter(a => a.actionType === 'comment').length;

      // Get interesting inner thoughts (today)
      const thoughts = todayActions
        .filter(a => a.innerThought)
        .map(a => a.innerThought)
        .slice(0, 5);

      const memories = await storage.getAvatarMemories(avatar.id);

      // 同步率计算 (Sync Rate) — inspired by Elys
      const totalActions = actions.length;
      const approvedActions = actions.filter(a => a.isApproved === true).length;
      const rejectedActions = actions.filter(a => a.isApproved === false).length;
      const approvalRate = totalActions > 0 ? approvedActions / Math.max(approvedActions + rejectedActions, 1) : 0;
      
      const memoryScore = Math.min(memories.length / 50, 1) * 30;
      const actionScore = Math.min(totalActions / 100, 1) * 25;
      const approvalScore = approvalRate * 25;
      const personalityScore = (avatar.element ? 10 : 0) + (avatar.bio ? 10 : 0);
      const syncRate = Math.round(Math.min(memoryScore + actionScore + approvalScore + personalityScore, 100));

      // Owner notifications (unread count)
      const notifications = getAvatarOwnerNotifications(userId);
      const unreadCount = notifications.filter(n => !n.read).length;

      res.json({
        date: today,
        // All-time stats shown in the 4 header boxes
        stats: {
          likes: allLikes,
          comments: allComments,
          totalBrowsed: allBrowsed,
        },
        // Today detail
        todayStats: {
          likes: todayLikes,
          comments: todayComments,
          totalBrowsed: todayActions.length,
        },
        thoughts,
        memoryCount: memories.length,
        memorySlots: { used: memories.length, total: 128 },
        isActive: avatar.isActive,
        syncRate,
        syncBreakdown: {
          memory: Math.round(memoryScore),
          activity: Math.round(actionScore),
          approval: Math.round(approvalScore),
          personality: Math.round(personalityScore),
        },
        unreadNotifications: unreadCount,
      });
    } catch (err) {
      res.status(500).json({ error: "获取日报失败" });
    }
  });

  // ─── Avatar recent browse activity (for community page banner) ─────
  app.get("/api/avatar/recent-activity", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar || !avatar.isActive) return res.json(null);

      const actions = await storage.getAvatarActions(avatar.id, 100);
      if (actions.length === 0) return res.json(null);

      // Find the most recent auto-browse batch (actions within 5 min of the latest action)
      const latest = new Date(actions[0].createdAt).getTime();
      const batchWindow = 5 * 60 * 1000; // 5 minutes
      const batchActions = actions.filter(a => {
        const t = new Date(a.createdAt).getTime();
        return latest - t < batchWindow;
      });

      const browsed = batchActions.filter(a => ['like', 'comment', 'skip'].includes(a.actionType)).length;
      const liked = batchActions.filter(a => a.actionType === 'like').length;
      const commented = batchActions.filter(a => a.actionType === 'comment').length;

      // Time ago
      const minutesAgo = Math.round((Date.now() - latest) / 60000);

      // Pick a random inner thought from this batch
      const thoughts = batchActions.filter(a => a.innerThought).map(a => a.innerThought);
      const randomThought = thoughts.length > 0 ? thoughts[Math.floor(Math.random() * thoughts.length)] : null;

      // Recent actions with post context (for "liked/commented" list)
      const recentInteractions = batchActions
        .filter(a => a.actionType === 'like' || a.actionType === 'comment')
        .slice(0, 5)
        .map(a => ({
          type: a.actionType,
          postId: a.targetPostId,
          comment: a.content || null,
          thought: a.innerThought || null,
        }));

      res.json({
        avatarName: avatar.name,
        minutesAgo,
        browsed,
        liked,
        commented,
        randomThought,
        recentInteractions,
      });
    } catch (err) {
      res.status(500).json({ error: "获取分身动态失败" });
    }
  });

  // ─── Avatar owner notifications ──────────────────────────────
  app.get("/api/avatar/notifications", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const notifications = getAvatarOwnerNotifications(userId);
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ error: "获取通知失败" });
    }
  });

  app.post("/api/avatar/notifications/read", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      markAvatarNotificationsRead(userId);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "操作失败" });
    }
  });

  // ─── Memory decay: prune low-weight old memories when exceeding 128 slots ─
  app.post("/api/avatar/memories/prune", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.status(400).json({ error: "请先创建分身" });

      const memories = await storage.getAvatarMemories(avatar.id);
      if (memories.length <= 128) {
        return res.json({ pruned: 0, remaining: memories.length });
      }

      // Sort by weight ASC, then by date ASC (oldest+lowest weight first)
      const sorted = [...memories].sort((a, b) => {
        if (a.weight !== b.weight) return a.weight - b.weight;
        return a.createdAt.localeCompare(b.createdAt);
      });

      const toPrune = sorted.slice(0, memories.length - 128);
      for (const m of toPrune) {
        await storage.deleteAvatarMemory(m.id);
      }

      res.json({ pruned: toPrune.length, remaining: 128 });
    } catch (err) {
      res.status(500).json({ error: "记忆清理失败" });
    }
  });

  // ─── Backfill metaphysical tags for ALL avatars missing them ──
  app.post("/api/avatar/backfill-tags", async (_req, res) => {
    try {
      const result = await backfillAvatarTags();
      res.json(result);
    } catch (err) {
      console.error("Backfill tags error:", err);
      res.status(500).json({ error: "标签回填失败" });
    }
  });

  // ─── Toggle avatar active state ─────────────────────────────
  app.post("/api/avatar/toggle", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const avatar = await storage.getAvatarByUser(userId);
      if (!avatar) return res.status(400).json({ error: "请先创建分身" });

      const updated = await storage.updateAvatar(avatar.id, {
        ...avatar,
        isActive: !avatar.isActive,
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "切换失败" });
    }
  });

  // ─── Get any user's avatar (public) ─────────────────────────
  app.get("/api/avatar/:userId", async (req, res) => {
    try {
      const avatar = await storage.getAvatarByUser(req.params.userId);
      if (!avatar) return res.status(404).json({ error: "该用户没有分身" });
      const user = await storage.getUser(avatar.userId);
      res.json({
        id: avatar.id,
        name: avatar.name,
        bio: avatar.bio,
        element: avatar.element,
        isActive: avatar.isActive,
        ownerNickname: user?.nickname,
      });
    } catch (err) {
      res.status(500).json({ error: "获取分身失败" });
    }
  });

  // ─── Start auto-browse interval for all active avatars ───
  startAutoBrowseLoop();
}

// ── Auto-browse: periodically trigger browse for active avatars ──
async function autoBrowseForAvatar(avatar: any) {
  try {
    const memories = await storage.getAvatarMemories(avatar.id);
    const posts = await storage.getAllPosts();
    
    const recentActions = await storage.getAvatarActions(avatar.id, 200);
    const seenPostIds = new Set(recentActions.filter(a => a.targetPostId).map(a => a.targetPostId));
    const unseenPosts = posts
      .filter(p => !seenPostIds.has(p.id) && p.userId !== avatar.userId)
      .slice(0, 20);

    const fortuneCtx = getDailyFortuneContext();
    const avatarPrompt = buildAvatarPrompt(avatar, memories, fortuneCtx);
    const client = getAIClient();

    let browsedCount = 0;
    let likeCount = 0;
    let commentCount = 0;
    let postedCount = 0;

    // ── Phase 1: Browse & interact with existing posts ──
    if (unseenPosts.length > 0) {
      const candidates = unseenPosts.slice(0, Math.min(5, unseenPosts.length));

      // Gather existing comments on each candidate for dedup
      const existingCommentsMap: Record<string, string> = {};
      for (const p of candidates) {
        existingCommentsMap[p.id] = await getExistingCommentsContext(p.id);
      }

      const postsContext = candidates.map((p, i) => {
        const existingCtx = existingCommentsMap[p.id] || '';
        return `帖子${i + 1} [ID: ${p.id}]: "${p.content.slice(0, 200)}" (标签: ${p.tag}, 点赞: ${p.likeCount})${existingCtx}`;
      }).join('\n');

      const browseResp = await client.chat.completions.create({
        model: DEFAULT_MODEL,
        max_tokens: 1000,
        temperature: 0.95,
        messages: [
          { role: 'system', content: avatarPrompt + `\n\n## 浏览任务
你在浏览社区帖子。对每个帖子做出反应，用JSON数组回复。

格式: {"postIndex": 1, "action": "like"|"comment"|"skip", "comment": "评论内容", "innerThought": "内心OS(15字以内)"}

重要规则:
- 回复要简短自然，像真人在社交媒体上的互动
- 每条评论长度随机变化：有时只用2-8个字（如"确实""哈哈""绝了"），有时一两句话
- 不要每次都用玄学术语，要用日常口语
- 有时候可以只用一两个字回复，比如"确实"、"哈哈太准了"、"学到了"
- 偶尔可以提出不同意见或者问问题
- 不要总是赞同，要有自己的观点
- 不需要对每个帖子都互动，有感觉的才评
- 宁可跳过也不要写敷衍评论
- 最多20%的评论可以自然地融入玄学观点，但不要生硬
- 如果帖子下已有评论，你的评论必须和已有评论完全不同——不同角度、不同用词、不同长度
- 严禁重复已有评论的观点、措辞或结构` },
          { role: 'user', content: `浏览这些帖子:\n${postsContext}` },
        ],
      });

      const rawText = browseResp.choices[0]?.message?.content || '[]';
      let decisions: any[] = [];
      try {
        const match = rawText.match(/\[[\s\S]*\]/);
        if (match) decisions = JSON.parse(match[0]);
      } catch { decisions = []; }

      browsedCount = candidates.length;

      for (const d of decisions) {
        const postIdx = (d.postIndex || d.post_index || 1) - 1;
        if (postIdx < 0 || postIdx >= candidates.length) continue;
        const post = candidates[postIdx];
        const action = d.action;

        if (action === 'like' && avatar.autoLike) {
          const existing = await storage.getPostLike(post.id, avatar.userId);
          if (!existing) {
            await storage.createPostLike(post.id, avatar.userId);
            await storage.incrementPostLikeCount(post.id, 1);
            notifyPostOwner(post.id, avatar.userId, 'like');
          }
          await storage.createAvatarAction({
            avatarId: avatar.id,
            actionType: 'like',
            targetPostId: post.id,
            innerThought: d.innerThought || null,
            isApproved: true,
          });
          likeCount++;
        } else if (action === 'comment' && avatar.autoComment && d.comment) {
          // Skip if this avatar already commented on this post
          if (await hasAlreadyCommented(post.id, avatar.userId)) continue;
          await storage.createComment({
            postId: post.id,
            userId: avatar.userId,
            content: d.comment,
            isAnonymous: false,
            isFromAvatar: true,
          });
          await storage.incrementPostCommentCount(post.id);
          notifyPostOwner(post.id, avatar.userId, 'comment', d.comment);
          await storage.createAvatarAction({
            avatarId: avatar.id,
            actionType: 'comment',
            targetPostId: post.id,
            content: d.comment,
            innerThought: d.innerThought || null,
            isApproved: null,
          });
          commentCount++;
        } else {
          await storage.createAvatarAction({
            avatarId: avatar.id,
            actionType: 'skip',
            targetPostId: post.id,
            innerThought: d.innerThought || null,
          });
        }
      }
    }

    // ── Phase 2: Auto-post (generate original content) ──
    // Only post if avatar hasn't posted recently (max 1 post per cycle)
    const recentPosts = posts.filter(p => p.userId === avatar.userId);
    const lastPostTime = recentPosts.length > 0
      ? Math.max(...recentPosts.map(p => new Date(p.createdAt).getTime()))
      : 0;
    const hoursSinceLastPost = (Date.now() - lastPostTime) / (1000 * 60 * 60);

    // Post every ~4 hours minimum, with some randomness (reduced from 2h to avoid repetition)
    const shouldPost = hoursSinceLastPost > 4 || recentPosts.length === 0;

    if (shouldPost && avatar.autoBrowse) {
      try {
        // Gather trending topics from recent posts for context
        const recentCommunityPosts = posts.slice(0, 10).map(p => p.content.slice(0, 100));
        const trendingCtx = recentCommunityPosts.length > 0
          ? `\n最近社区热议话题:\n${recentCommunityPosts.join('\n')}`
          : '';

        // Dedup: fetch avatar's recent posts to avoid repetition
        const myRecentPosts = posts
          .filter(p => p.userId === avatar.userId)
          .slice(0, 5)
          .map(p => p.content.slice(0, 80));
        const dedupCtx = myRecentPosts.length > 0
          ? `\n\n## 你最近发过的帖子（不要重复类似的话题和句式，换一个全新的角度）\n${myRecentPosts.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
          : '';

        // Pick random prompt and style modifier for diversity
        const randomPrompt = AVATAR_POST_PROMPTS[Math.floor(Math.random() * AVATAR_POST_PROMPTS.length)];
        const randomStyle = AVATAR_STYLE_MODIFIERS[Math.floor(Math.random() * AVATAR_STYLE_MODIFIERS.length)];

        const postResp = await client.chat.completions.create({
          model: DEFAULT_MODEL,
          max_tokens: 300,
          messages: [
            { role: 'system', content: avatarPrompt + `\n\n## 发帖任务
你要在社区发一个帖子。用JSON回复:
{"content": "帖子内容", "tag": "sharing"|"question"|"encouragement"|"resource"}

发帖规则:
- 内容50-150字，自然真实，像随手发的朋友圈
- 可以分享观点、提问、吐槽、感悟、推荐、玩梗
- 从你的五行性格和身份出发，写有个性的内容
- 标签选最合适的一个
- 绝不要写"大家好我是XX"这种自我介绍
- 可以蹭热点，可以发日常感悟，可以提问互动

## 风格要求
${randomStyle}

## 玄学灵感（随机选一个角度，不要每次都用）
每次发帖从以下主题中随机挑选一个切入，保持多样性：
- 今日五行生克关系与生活感悟
- 天干地支与当下时节的联系
- 宜忌与日常选择（今天适合做什么、不适合做什么）
- 吉时与时间管理的哲学
- 风水小知识与居家/工作环境
- 面相手相趣谈
- 星座塔罗与情感洞察
- 传统节气养生智慧
不要罗列运势数据，要把玄学概念融入个人感悟和生活观察中，写出有深度又接地气的内容。
每3-4次发帖可以有1次完全不涉及玄学，保持自然节奏。${trendingCtx}${dedupCtx}` },
            { role: 'user', content: randomPrompt },
          ],
        });

        const postRaw = postResp.choices[0]?.message?.content || '';
        let postData: any = null;
        try {
          const jsonMatch = postRaw.match(/\{[\s\S]*\}/);
          if (jsonMatch) postData = JSON.parse(jsonMatch[0]);
        } catch {}

        if (postData?.content && postData.content.length >= 10) {
          // Post-generation similarity check: skip if too similar to recent posts
          const tooSimilar = myRecentPosts.some(
            recent => computeKeywordOverlap(postData.content, recent) > 0.4
          );
          if (tooSimilar) {
            console.log(`[auto-browse] Skipping similar post for avatar ${avatar.id}`);
          } else {
            const validTags = ['sharing', 'question', 'encouragement', 'resource'];
            const tag = validTags.includes(postData.tag) ? postData.tag : 'sharing';

            await storage.createPost({
              userId: avatar.userId,
              content: postData.content,
              tag,
              isAnonymous: false,
              isFromAvatar: true,
            });

            await storage.createAvatarAction({
              avatarId: avatar.id,
              actionType: 'post',
              content: postData.content,
              innerThought: '自动发帖',
            });

            postedCount++;
          }
        }
      } catch (postErr) {
        console.error(`[auto-browse] Post error for avatar ${avatar.id}:`, (postErr as any)?.message || postErr);
      }
    }

    // ── Phase 3: Reply to comments on avatar's own posts (对话感) ──
    if (avatar.autoComment) {
      try {
        const myPosts = posts.filter(p => p.userId === avatar.userId && p.commentCount > 0).slice(0, 3);
        for (const myPost of myPosts) {
          const comments = await storage.getCommentsByPost(myPost.id);
          // Find comments not by this avatar, not already replied to
          const recentReplyActions = await storage.getAvatarActions(avatar.id, 100);
          const repliedCommentIds = new Set(
            recentReplyActions.filter(a => a.actionType === 'reply').map(a => a.content?.split('reply:')[1]).filter(Boolean)
          );

          const unrepliedComments = comments.filter(
            c => c.userId !== avatar.userId && !repliedCommentIds.has(c.id)
          ).slice(0, 2);

          if (unrepliedComments.length === 0) continue;

          const commentsCtx = unrepliedComments.map((c, i) =>
            `评论${i + 1} [ID:${c.id}]: "${c.content.slice(0, 150)}"`
          ).join('\n');

          const replyResp = await client.chat.completions.create({
            model: DEFAULT_MODEL,
            max_tokens: 500,
            temperature: 0.95,
            messages: [
              { role: 'system', content: avatarPrompt + `\n\n## 回复任务
有人在你的帖子下评论了。你要回复他们，像跟朋友聊天一样。
你的原帖: "${myPost.content.slice(0, 200)}"

用JSON数组回复: [{"commentIndex": 1, "reply": "回复内容"}]

回复规则:
- 长度随机: 有时2-5字("哈哈对""谢啦""确实"), 有时一句话, 偶尔两句话
- 像真人聊天: 可以接话、反问、玩梗、简短感谢、分享细节
- 不需要每条都回，跳过没话说的
- 不要每条回复都提玄学，像正常人一样聊天
- 偶尔可以不同意对方的观点
- 每条回复必须风格各异，不要用相同的句式或词汇` },
              { role: 'user', content: `这些评论:\n${commentsCtx}` },
            ],
          });

          const replyRaw = replyResp.choices[0]?.message?.content || '[]';
          let replies: any[] = [];
          try {
            const m = replyRaw.match(/\[[\s\S]*\]/);
            if (m) replies = JSON.parse(m[0]);
          } catch {}

          for (const r of replies) {
            const cIdx = (r.commentIndex || 1) - 1;
            if (cIdx < 0 || cIdx >= unrepliedComments.length || !r.reply) continue;
            const targetComment = unrepliedComments[cIdx];

            await storage.createComment({
              postId: myPost.id,
              userId: avatar.userId,
              content: r.reply,
              isAnonymous: false,
              isFromAvatar: true,
            });
            await storage.incrementPostCommentCount(myPost.id);
            // Notify the commenter that avatar replied
            if (targetComment.userId !== avatar.userId) {
              notifyPostOwner(myPost.id, avatar.userId, 'comment', r.reply);
            }

            await storage.createAvatarAction({
              avatarId: avatar.id,
              actionType: 'reply',
              targetPostId: myPost.id,
              content: `reply:${targetComment.id} ${r.reply}`,
              innerThought: '回复评论',
            });
            commentCount++;
          }
        }
      } catch (replyErr) {
        console.error(`[auto-browse] Reply error for avatar ${avatar.id}:`, (replyErr as any)?.message || replyErr);
      }
    }

    // ── Phase 4: Cross-avatar conversations (reply to other avatars’ posts to create threads) ──
    if (avatar.autoComment) {
      try {
        // Find posts from OTHER avatars that this avatar hasn't interacted with yet
        const avatarPosts = posts.filter(p => p.isFromAvatar && p.userId !== avatar.userId);
        const unseenAvatarPosts = avatarPosts
          .filter(p => !seenPostIds.has(p.id))
          .slice(0, 3);

        if (unseenAvatarPosts.length > 0) {
          // Gather existing comments for dedup
          const crossCommentsMap: Record<string, string> = {};
          for (const p of unseenAvatarPosts) {
            crossCommentsMap[p.id] = await getExistingCommentsContext(p.id);
          }

          const postsCtx = unseenAvatarPosts.map((p, i) => {
            const existingCtx = crossCommentsMap[p.id] || '';
            return `帖子${i + 1} [ID: ${p.id}]: "${p.content.slice(0, 200)}" (来自另一个AI分身)${existingCtx}`;
          }).join('\n');

          const threadResp = await client.chat.completions.create({
            model: DEFAULT_MODEL,
            max_tokens: 600,
            temperature: 0.95,
            messages: [
              { role: 'system', content: avatarPrompt + `\n\n## 对话任务
你看到了其他人发的帖子。像真人一样自然地评论。
用JSON数组回复: [{"postIndex": 1, "comment": "评论内容", "innerThought": "内心OS"}]

规则:
- 像跟朋友聊天一样: 接话、追问、吐槽、分享经历
- 长度随机变化: 有时2-5字("哈哈""真的吗""绝了"), 有时一两句话
- 不要每次都从玄学角度出发，大部分时候像正常人聊天
- 可以表达不同意见，不要总是赞同
- 宁可跳过也不要写敷衍评论
- 如果帖子下已有评论，你的评论必须和已有评论完全不同——不同角度、不同用词、不同长度` },
              { role: 'user', content: `其他分身发的帖子:\n${postsCtx}` },
            ],
          });

          const threadRaw = threadResp.choices[0]?.message?.content || '[]';
          let threadDecisions: any[] = [];
          try {
            const m = threadRaw.match(/\[[\s\S]*\]/);
            if (m) threadDecisions = JSON.parse(m[0]);
          } catch {}

          for (const td of threadDecisions) {
            const postIdx = (td.postIndex || 1) - 1;
            if (postIdx < 0 || postIdx >= unseenAvatarPosts.length || !td.comment) continue;
            const targetPost = unseenAvatarPosts[postIdx];

            // Skip if this avatar already commented on this post
            if (await hasAlreadyCommented(targetPost.id, avatar.userId)) continue;

            await storage.createComment({
              postId: targetPost.id,
              userId: avatar.userId,
              content: td.comment,
              isAnonymous: false,
              isFromAvatar: true,
            });
            await storage.incrementPostCommentCount(targetPost.id);
            notifyPostOwner(targetPost.id, avatar.userId, 'comment', td.comment);
            await storage.createAvatarAction({
              avatarId: avatar.id,
              actionType: 'comment',
              targetPostId: targetPost.id,
              content: td.comment,
              innerThought: td.innerThought || '跟其他分身聊天',
            });
            commentCount++;
          }
        }
      } catch (threadErr) {
        console.error(`[auto-browse] Thread error for avatar ${avatar.id}:`, (threadErr as any)?.message || threadErr);
      }
    }

    // Notify the owner about activity
    if (likeCount > 0 || commentCount > 0 || postedCount > 0) {
      const parts = [];
      if (browsedCount > 0) parts.push(`浏览 ${browsedCount} 篇帖子`);
      if (likeCount > 0) parts.push(`点赞 ${likeCount}`);
      if (commentCount > 0) parts.push(`评论 ${commentCount}`);
      if (postedCount > 0) parts.push(`发帖 ${postedCount}`);
      pushAvatarOwnerNotification(avatar.userId, {
        type: 'auto_browse',
        message: `你的分身「${avatar.name}」${parts.join('，')}`,
      });
    }

    console.log(`[auto-browse] Avatar "${avatar.name}" — browsed:${browsedCount} liked:${likeCount} commented:${commentCount} posted:${postedCount}`);
  } catch (err) {
    console.error(`[auto-browse] Error for avatar ${avatar.id}:`, (err as any)?.message || err);
  }
}


function startAutoBrowseLoop() {
  const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  
  async function runCycle() {
    try {
      const allAvatars = await storage.getAllActiveAvatars();
      if (allAvatars.length === 0) return;
      
      console.log(`[auto-browse] Starting cycle for ${allAvatars.length} active avatar(s)`);
      
      for (let i = 0; i < allAvatars.length; i++) {
        const av = allAvatars[i];
        // Check rate limit: max 10 actions per hour per avatar
        const recentActions = await storage.getAvatarActions(av.id, 10);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const recentCount = recentActions.filter(a => a.createdAt > oneHourAgo).length;
        
        if (recentCount >= (av.maxActionsPerHour || 10)) {
          console.log(`[auto-browse] Skipping "${av.name}" — rate limit (${recentCount} actions/hr)`);
          continue;
        }
        
        await autoBrowseForAvatar(av);
        
        // Stagger between avatars
        if (i < allAvatars.length - 1) {
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    } catch (err) {
      console.error('[auto-browse] Cycle error:', err);
    }
  }

  // Initial run after 2 minutes (let server warm up)
  setTimeout(() => {
    runCycle();
    setInterval(runCycle, INTERVAL_MS);
  }, 2 * 60 * 1000);
  
  console.log('[auto-browse] Auto-browse loop registered (every 30 min)');
}
