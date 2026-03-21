/**
 * Soul Matching Engine (灵魂匹配引擎)
 *
 * Composite matching algorithm fusing four computations:
 *   1. Cosine similarity (30% weight) — personality vector direction
 *   2. Euclidean similarity (20%) — absolute distance
 *   3. Complementarity bonus — rational-emotional, planning-creative, shared traits
 *   4. Interest overlap (20%) — Jaccard-like overlap
 *
 * Personality model: Big Five (OCEAN) + Jungian (Ni, Se, Ti, Fi) = 9 dimensions
 * Archetypes: 12 soul archetypes derived from weighted dimension scores
 */

// ═══════════════════════════════════════════════════════════════
// DIMENSIONS
// ═══════════════════════════════════════════════════════════════
export const DIMS = ["O", "C", "E", "A", "N", "Ni", "Se", "Ti", "Fi"] as const;
export type DimKey = (typeof DIMS)[number];
export type DimScores = Record<string, number>;

// ═══════════════════════════════════════════════════════════════
// 25 PERSONALITY QUESTIONS — Big Five (OCEAN) + Jungian
// ═══════════════════════════════════════════════════════════════
export interface QuestionOption {
  t: string;
  s: Partial<Record<DimKey, number>>;
}

export interface Question {
  id: number;
  cat: string;
  q: string;
  o: QuestionOption[];
}

export const QUESTIONS: Question[] = [
  { id: 1, cat: "energy", q: "周末早上醒来，你的第一反应是？", o: [
    { t: "约朋友出去探索新地方！", s: { E: 4, O: 2 } },
    { t: "先看看手机，再决定要不要出门", s: { E: 1, N: 1 } },
    { t: "终于可以一个人安静待着了", s: { E: -3, Ti: 2 } },
    { t: "列个今天要做的事情清单", s: { C: 3, Ti: 1 } },
  ]},
  { id: 2, cat: "energy", q: "在一个不认识人的派对上，你会？", o: [
    { t: "主动搭讪，认识新朋友", s: { E: 4, O: 2, A: 1 } },
    { t: "找个角落观察大家的互动", s: { E: -2, Ni: 3 } },
    { t: "找到一个人深聊整晚", s: { E: -1, Fi: 3 } },
    { t: "找借口尽快离开", s: { E: -4, N: 2 } },
  ]},
  { id: 3, cat: "energy", q: "连续社交三天后，你的状态是？", o: [
    { t: "精力充沛，还想继续！", s: { E: 4, A: 1 } },
    { t: "开心但需要一个安静的晚上恢复", s: { E: 1, N: 1 } },
    { t: "已经完全耗尽，需要独处充电", s: { E: -4, N: 2 } },
    { t: "取决于和谁社交，有些人给我能量", s: { E: 0, Fi: 2, Ni: 1 } },
  ]},
  { id: 4, cat: "emotion", q: "朋友突然哭了，你会？", o: [
    { t: "立刻抱住TA，什么都不说", s: { Fi: 3, A: 3 } },
    { t: "问清楚发生了什么，帮TA分析解决", s: { Ti: 3, C: 1 } },
    { t: "默默陪着，等TA准备好了再说", s: { Fi: 2, E: -1 } },
    { t: "带TA去吃好吃的转移注意力", s: { Se: 2, A: 2, E: 1 } },
  ]},
  { id: 5, cat: "emotion", q: "看一部很悲伤的电影时，你？", o: [
    { t: "控制不住地哭得稀里哗啦", s: { Fi: 4, N: 2 } },
    { t: "感动但不太会外露情绪", s: { Fi: 1, Ti: 1, E: -1 } },
    { t: "更关注剧情逻辑和演技", s: { Ti: 3, O: 1 } },
    { t: "会想到自己类似的经历而触动", s: { Fi: 3, Ni: 2 } },
  ]},
  { id: 6, cat: "emotion", q: "你的情绪波动频率？", o: [
    { t: "像过山车，起伏很大", s: { N: 4, Fi: 2 } },
    { t: "偶尔波动，大部分时候平稳", s: { N: 1, C: 1 } },
    { t: "非常稳定，很少有大起大落", s: { N: -3, Ti: 1, C: 2 } },
    { t: "表面平静，内心其实很丰富", s: { N: 2, E: -2, Fi: 2 } },
  ]},
  { id: 7, cat: "thinking", q: "做一个重要决定时，你更依赖？", o: [
    { t: "直觉和内心的感受", s: { Ni: 3, Fi: 2 } },
    { t: "详细的数据分析和利弊对比", s: { Ti: 4, C: 2 } },
    { t: "询问信任的人的意见", s: { A: 2, E: 1, Fi: 1 } },
    { t: "先行动再调整，做了才知道", s: { Se: 3, O: 1, C: -1 } },
  ]},
  { id: 8, cat: "thinking", q: "你更擅长哪种思维方式？", o: [
    { t: "发散联想——从一个点想到无数可能", s: { Ni: 4, O: 3 } },
    { t: "逻辑推理——一步一步得出结论", s: { Ti: 4, C: 1 } },
    { t: "共情理解——站在别人角度感受", s: { Fi: 3, A: 2 } },
    { t: "实际操作——动手试比空想强", s: { Se: 3, C: 1 } },
  ]},
  { id: 9, cat: "thinking", q: "遇到一个完全陌生的领域，你？", o: [
    { t: "兴奋！立刻想深入了解", s: { O: 4, Ni: 2 } },
    { t: "有点焦虑，先做大量功课", s: { C: 2, N: 2, Ti: 1 } },
    { t: "找个这领域的人带我入门", s: { A: 1, E: 1, Se: 1 } },
    { t: "看看有没有实际用处再说", s: { Se: 2, Ti: 1, C: 1 } },
  ]},
  { id: 10, cat: "lifestyle", q: "计划好的旅行突然被取消，你？", o: [
    { t: "太好了！可以自由安排了", s: { O: 2, C: -2, Se: 1 } },
    { t: "有点失落，但马上做新计划", s: { C: 3, N: -1 } },
    { t: "很沮丧，需要时间消化情绪", s: { N: 3, Fi: 2 } },
    { t: "无所谓，反正还有别的事做", s: { N: -2, Se: 1 } },
  ]},
  { id: 11, cat: "lifestyle", q: "你的房间通常是什么样的？", o: [
    { t: "井井有条，东西都有固定位置", s: { C: 4 } },
    { t: "创意混乱，但我知道东西在哪", s: { O: 2, C: -2 } },
    { t: "看心情，偶尔大扫除一次", s: { C: -1, N: 1 } },
    { t: "极简风，越少东西越好", s: { Ti: 1, C: 1, E: -1 } },
  ]},
  { id: 12, cat: "lifestyle", q: "截止日期临近，你的工作方式？", o: [
    { t: "早就做完了，现在在检查", s: { C: 4, N: -1 } },
    { t: "按计划推进，不慌不忙", s: { C: 3, Ti: 1 } },
    { t: "在压力下爆发，最后一刻完成", s: { C: -2, O: 1, N: 2 } },
    { t: "视情况，如果感兴趣会提前完成", s: { Fi: 1, O: 1 } },
  ]},
  { id: 13, cat: "values", q: "你更欣赏哪种人？", o: [
    { t: "才华横溢、思想深邃的天才", s: { Ni: 2, O: 3 } },
    { t: "温暖善良、让人如沐春风的人", s: { Fi: 1, A: 3 } },
    { t: "意志坚定、说到做到的实干家", s: { C: 3, Ti: 1 } },
    { t: "自由不羁、活出自我的冒险家", s: { O: 3, Se: 2, C: -1 } },
  ]},
  { id: 14, cat: "values", q: "如果只能选一个，你最看重？", o: [
    { t: "真实——做最真实的自己", s: { Fi: 4, O: 1 } },
    { t: "成就——实现有意义的目标", s: { C: 3, Ti: 2 } },
    { t: "连接——和重要的人深度联结", s: { A: 3, Fi: 2, E: 1 } },
    { t: "自由——不被任何东西束缚", s: { O: 3, C: -2, Se: 1 } },
  ]},
  { id: 15, cat: "values", q: "你觉得人生最大的遗憾会是？", o: [
    { t: "没有勇气追求真正想要的", s: { Fi: 3, O: 2 } },
    { t: "没有好好珍惜身边的人", s: { A: 3, Fi: 2 } },
    { t: "没有达成自己设定的目标", s: { C: 3, Ti: 1 } },
    { t: "活得太安全，没有冒过险", s: { O: 3, Se: 2 } },
  ]},
  { id: 16, cat: "social", q: "和朋友意见不合时，你通常？", o: [
    { t: "据理力争，真理越辩越明", s: { Ti: 3, E: 1, A: -1 } },
    { t: "先退一步，认真想想对方的道理", s: { A: 3, Fi: 1 } },
    { t: "各自保留意见，不伤和气", s: { A: 2, E: -1 } },
    { t: "用幽默化解尴尬", s: { E: 2, O: 1, A: 1 } },
  ]},
  { id: 17, cat: "social", q: "你在团队中通常扮演什么角色？", o: [
    { t: "领导者——提出方向带着大家走", s: { E: 3, C: 2, Ti: 1 } },
    { t: "协调者——确保每个人都被听到", s: { A: 3, Fi: 2, E: 1 } },
    { t: "创意者——提出别人想不到的点子", s: { O: 4, Ni: 2 } },
    { t: "执行者——把想法变成现实", s: { C: 3, Se: 2 } },
  ]},
  { id: 18, cat: "social", q: "你理想中的友谊是？", o: [
    { t: "无话不谈，什么都能分享", s: { E: 2, Fi: 2, A: 2 } },
    { t: "互相独立，但关键时刻在", s: { E: -1, C: 1, Ti: 1 } },
    { t: "一起冒险，创造疯狂回忆", s: { O: 2, Se: 2, E: 1 } },
    { t: "灵魂共鸣，不用说太多就懂", s: { Ni: 3, Fi: 2, E: -1 } },
  ]},
  { id: 19, cat: "dreams", q: "如果可以拥有一种超能力？", o: [
    { t: "读心术——理解每个人的真实想法", s: { Fi: 2, Ni: 3 } },
    { t: "时间暂停——做完所有想做的事", s: { C: 2, Se: 1, Ti: 1 } },
    { t: "瞬间移动——自由去任何地方", s: { O: 3, Se: 2 } },
    { t: "超级智慧——解开宇宙的终极秘密", s: { Ti: 3, Ni: 3 } },
  ]},
  { id: 20, cat: "dreams", q: "你做白日梦时，最常想什么？", o: [
    { t: "幻想完全不同的人生可能性", s: { Ni: 4, O: 3 } },
    { t: "回味过去美好的记忆细节", s: { Se: 2, Fi: 2 } },
    { t: "规划未来要达成的目标和步骤", s: { C: 3, Ti: 2 } },
    { t: "想象和在乎的人一起的场景", s: { Fi: 3, A: 2 } },
  ]},
  { id: 21, cat: "identity", q: "深夜一个人时，你最常做什么？", o: [
    { t: "刷社交媒体，看看大家在干嘛", s: { E: 2, Se: 1 } },
    { t: "思考人生，想些深刻的问题", s: { Ni: 3, E: -1, O: 1 } },
    { t: "追剧/打游戏，享受放松时光", s: { Se: 2, N: -1 } },
    { t: "写日记或整理自己的想法", s: { Fi: 3, C: 1, E: -1 } },
  ]},
  { id: 22, cat: "identity", q: "你觉得了解一个人最好的方式？", o: [
    { t: "和TA一起经历一件困难的事", s: { Se: 2, C: 1, A: 1 } },
    { t: "深夜长谈，聊彼此的内心世界", s: { Fi: 3, Ni: 2, E: -1 } },
    { t: "观察TA怎么对待服务员和陌生人", s: { Ti: 2, Ni: 2, A: 1 } },
    { t: "一起旅行，24小时相处", s: { Se: 2, E: 2, O: 1 } },
  ]},
  { id: 23, cat: "identity", q: "你如何处理压力？", o: [
    { t: "运动或做些身体力行的事", s: { Se: 3, E: 1, N: -1 } },
    { t: "找人倾诉或寻求支持", s: { E: 2, A: 2, Fi: 1 } },
    { t: "独处安静地思考和恢复", s: { E: -3, Ni: 2, Ti: 1 } },
    { t: "投入工作或兴趣来转移注意力", s: { C: 2, Se: 1 } },
  ]},
  { id: 24, cat: "identity", q: "别人对你最常见的评价是？", o: [
    { t: "你想得真深 / 你好有想法", s: { Ni: 3, O: 2 } },
    { t: "你人真好 / 跟你在一起很舒服", s: { A: 3, Fi: 1 } },
    { t: "你太靠谱了 / 什么都安排得好", s: { C: 3, Ti: 1 } },
    { t: "你好有趣 / 跟你在一起不无聊", s: { E: 2, O: 2, Se: 1 } },
  ]},
  { id: 25, cat: "identity", q: "选一个词形容你内心最深处的渴望：", o: [
    { t: "被理解", s: { Fi: 4, Ni: 2, N: 1 } },
    { t: "被需要", s: { A: 3, C: 1, Fi: 1 } },
    { t: "自由", s: { O: 4, C: -2, Se: 1 } },
    { t: "意义", s: { Ni: 4, Ti: 1, Fi: 1 } },
  ]},
];

// ═══════════════════════════════════════════════════════════════
// 12 ARCHETYPES
// ═══════════════════════════════════════════════════════════════
export interface Archetype {
  id: string;
  name: string;
  emoji: string;
  color: string;
  weights: Partial<Record<DimKey, number>>;
  description: string;
}

export const ARCHETYPES: Archetype[] = [
  { id: "dreamer", name: "梦想织造者", emoji: "🌙", color: "#7C5CFC", weights: { Ni: 3, Fi: 2, O: 2, E: -1 },
    description: "你是一个充满想象力和同理心的人，总能看到别人看不到的美好。你的内心世界丰富而深邃，像一片浩瀚星空。" },
  { id: "guardian", name: "温暖守护者", emoji: "☀️", color: "#FF8A5C", weights: { A: 3, Fi: 2, E: 1, C: 1 },
    description: "你是朋友圈里的太阳，用温暖和善意照亮每个人。你天生懂得关心人，是最好的倾听者和支持者。" },
  { id: "explorer", name: "理性探索家", emoji: "🔭", color: "#4ECDC4", weights: { Ti: 3, Ni: 2, O: 2, C: 1 },
    description: "你用清晰的逻辑和无限的好奇心探索世界。在别人看到混乱的地方，你能发现隐藏的规律和真理。" },
  { id: "adventurer", name: "自由冒险者", emoji: "🌊", color: "#45B7D1", weights: { O: 3, Se: 2, E: 1, C: -2 },
    description: "你是风一样自由的灵魂，不喜欢被规则束缚。每一天都是新的冒险，你让身边的人也变得勇敢。" },
  { id: "architect", name: "稳重建筑师", emoji: "🏛️", color: "#96CEB4", weights: { C: 3, Ti: 2, Se: 1, A: 1 },
    description: "你是团队的基石，用可靠和坚韧建造一切。你的执行力让梦想变成现实，值得每个人信赖。" },
  { id: "artist", name: "灵魂艺术家", emoji: "🎨", color: "#DDA0DD", weights: { O: 3, Fi: 2, Ni: 2, Se: 1 },
    description: "你以独特的视角感受世界，将感受化为创造。你的存在本身就是一件艺术品，充满感染力。" },
  { id: "catalyst", name: "社交催化剂", emoji: "⚡", color: "#FFD93D", weights: { E: 3, A: 2, O: 1, Se: 1 },
    description: "你是人群中的能量源，能让任何聚会变得有趣。你天生懂得连接人与人，创造奇妙的化学反应。" },
  { id: "sage", name: "安静哲学家", emoji: "📚", color: "#8B9DC3", weights: { Ni: 3, Ti: 2, E: -3, O: 1 },
    description: "你在安静中思考深刻的问题，拥有超越年龄的智慧。你的见解总能让人茅塞顿开。" },
  { id: "healer", name: "共情治愈师", emoji: "🌿", color: "#77DD77", weights: { Fi: 3, A: 3, N: 1, E: -1 },
    description: "你能感受到每个人内心深处的情感波动。你的存在本身就是疗愈，人们在你面前卸下防备。" },
  { id: "maverick", name: "叛逆革新者", emoji: "🔥", color: "#FF6B6B", weights: { O: 3, Ti: 2, C: -2, E: 1 },
    description: "你拒绝「就是这样」的答案，总在挑战现状。你的叛逆是为了创造更好的可能。" },
  { id: "anchor", name: "深海锚点", emoji: "🐋", color: "#5B7DB1", weights: { C: 2, Fi: 2, E: -2, N: -2 },
    description: "你是人群中最安静却最稳定的存在。你的力量来自内心的平静。在风暴中，你是所有人的避风港。" },
  { id: "spark", name: "灵感火花", emoji: "✨", color: "#FFB347", weights: { O: 3, Ni: 3, Se: 1, C: -1 },
    description: "你的脑海中永远有新奇的想法在碰撞。你像一颗不停闪烁的星火，点亮每一个对话。" },
];

// ═══════════════════════════════════════════════════════════════
// AI FRIEND POOL (fallback matches)
// ═══════════════════════════════════════════════════════════════
export interface AiFriend {
  id: string;
  name: string;
  emoji: string;
  archetype: string;
  bio: string;
  interests: string[];
  scores: DimScores;
}

export const AI_FRIENDS: AiFriend[] = [
  { id: "ai_xiaoyue", name: "小月", emoji: "🌙", archetype: "梦想织造者", bio: "插画师，喜欢在咖啡馆画画，养了两只猫", interests: ["绘画", "猫", "独立音乐", "冥想"], scores: { Ni: 6, Fi: 5, E: -3, O: 5, A: 3, N: 2, C: -1, Ti: 0, Se: 1 } },
  { id: "ai_ajie", name: "阿杰", emoji: "🔭", archetype: "理性探索家", bio: "程序员，周末爱徒步，正在学习天文学", interests: ["编程", "徒步", "天文", "科幻电影"], scores: { Ti: 7, Ni: 4, O: 5, C: 3, E: 0, A: 1, N: -1, Fi: 0, Se: 2 } },
  { id: "ai_xiaoyu", name: "小雨", emoji: "☀️", archetype: "温暖守护者", bio: "幼儿园老师，业余烘焙达人，最爱治愈系日剧", interests: ["烘焙", "日剧", "手账", "瑜伽"], scores: { Fi: 6, A: 7, E: 2, Se: 3, C: 2, N: 1, O: 1, Ti: -1, Ni: 1 } },
  { id: "ai_dapeng", name: "大鹏", emoji: "🌊", archetype: "自由冒险者", bio: "自由摄影师，去过30个国家，梦想环游世界", interests: ["摄影", "旅行", "冲浪", "纪录片"], scores: { O: 7, Se: 5, E: 4, C: -3, Ni: 2, Fi: 1, A: 1, N: 0, Ti: 0 } },
  { id: "ai_sisi", name: "思思", emoji: "🎨", archetype: "灵魂艺术家", bio: "音乐制作人，喜欢探店和vintage文化", interests: ["音乐", "vintage", "咖啡", "电影"], scores: { O: 7, Ni: 5, Fi: 4, Se: 2, E: 1, C: -1, A: 1, N: 2, Ti: 0 } },
  { id: "ai_laok", name: "老K", emoji: "🏛️", archetype: "稳重建筑师", bio: "项目经理，铁人三项爱好者，做事超靠谱", interests: ["运动", "GTD", "投资", "读书"], scores: { C: 7, Ti: 4, Se: 3, A: 2, E: 1, O: 0, N: -2, Fi: 0, Ni: 1 } },
  { id: "ai_xiaoyu2", name: "小鱼", emoji: "⚡", archetype: "社交催化剂", bio: "活动策划，朋友超多，哪里好玩都知道", interests: ["派对", "美食", "旅行", "桌游"], scores: { E: 7, A: 4, O: 4, Se: 3, C: 0, N: 0, Fi: 1, Ti: -1, Ni: 0 } },
  { id: "ai_azhe", name: "阿哲", emoji: "📚", archetype: "安静哲学家", bio: "研究生在读，热爱哲学和古典音乐", interests: ["哲学", "古典乐", "围棋", "写作"], scores: { Ni: 7, Ti: 5, E: -5, O: 3, C: 1, Fi: 1, A: 0, N: 1, Se: -2 } },
  { id: "ai_xiaocheng", name: "小橙", emoji: "🌿", archetype: "共情治愈师", bio: "心理咨询师实习生，喜欢种花和做饭", interests: ["心理学", "园艺", "烹饪", "诗歌"], scores: { Fi: 7, A: 6, N: 2, Ni: 3, E: -1, O: 2, C: 1, Ti: 0, Se: 1 } },
  { id: "ai_feifei", name: "飞飞", emoji: "🔥", archetype: "叛逆革新者", bio: "创业者，做独立游戏，讨厌无聊的规则", interests: ["游戏设计", "创业", "朋克音乐", "滑板"], scores: { O: 6, Ti: 4, C: -4, E: 3, Ni: 2, Se: 2, N: 1, Fi: 0, A: -1 } },
];

// ═══════════════════════════════════════════════════════════════
// MATCHING ALGORITHM
// ═══════════════════════════════════════════════════════════════

/** Cosine similarity between two score vectors */
export function cosine(a: DimScores, b: DimScores): number {
  let dot = 0, magA = 0, magB = 0;
  for (const k of DIMS) {
    const va = a[k] || 0, vb = b[k] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  return (!magA || !magB) ? 0 : dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Euclidean distance similarity (inverse, normalized) */
export function euclid(a: DimScores, b: DimScores): number {
  let sum = 0;
  for (const k of DIMS) {
    sum += Math.pow((a[k] || 0) - (b[k] || 0), 2);
  }
  return 1 / (1 + Math.sqrt(sum));
}

/** Complementarity bonus for compatible trait pairs */
export function complement(a: DimScores, b: DimScores): number {
  let bonus = 0;
  // Rational-emotional complement (Ti vs Fi dominant)
  const aTF = (a.Ti || 0) - (a.Fi || 0);
  const bTF = (b.Ti || 0) - (b.Fi || 0);
  if (Math.sign(aTF) !== Math.sign(bTF) && Math.abs(aTF) > 2 && Math.abs(bTF) > 2) bonus += 0.06;
  // Planning-creative complement (C vs O)
  if (((a.C || 0) > 3 && (b.O || 0) > 3) || ((b.C || 0) > 3 && (a.O || 0) > 3)) bonus += 0.04;
  // Shared openness
  if ((a.O || 0) > 2 && (b.O || 0) > 2) bonus += 0.05;
  // Shared emotional depth
  if ((a.Fi || 0) > 2 && (b.Fi || 0) > 2) bonus += 0.05;
  // Shared extraversion
  if ((a.E || 0) > 2 && (b.E || 0) > 2) bonus += 0.03;
  // Shared introversion
  if ((a.E || 0) < -2 && (b.E || 0) < -2) bonus += 0.04;
  // Shared intuition
  if ((a.Ni || 0) > 2 && (b.Ni || 0) > 2) bonus += 0.04;
  return bonus;
}

/** Interest overlap ratio */
export function interestOverlap(a: string[], b: string[]): number {
  if (!a?.length || !b?.length) return 0;
  const setA = new Set(a.map(x => x.toLowerCase()));
  let matches = 0;
  for (const item of b) {
    if (setA.has(item.toLowerCase())) matches++;
  }
  return matches / Math.max(a.length, b.length);
}

/** Composite match score (20-99) */
export function computeMatchScore(
  me: { scores: DimScores; interests: string[] },
  other: { scores: DimScores; interests: string[] },
): number {
  const sim =
    cosine(me.scores, other.scores) * 0.30 +
    euclid(me.scores, other.scores) * 0.20 +
    complement(me.scores, other.scores) +
    interestOverlap(me.interests || [], other.interests || []) * 0.20;
  const raw = Math.min(0.99, Math.max(0.20, sim + 0.32));
  return Math.round(raw * 100);
}

/** Generate up to 3 human-readable match reasons (Chinese) */
export function generateMatchReasons(
  a: DimScores, b: DimScores,
  aInterests: string[], bInterests: string[],
): string[] {
  const reasons: string[] = [];
  const cos = cosine(a, b);
  if (cos > 0.55) reasons.push("人格高度相似");
  else if (cos > 0.25) reasons.push("人格特征互补");

  const aTF = (a.Ti || 0) - (a.Fi || 0);
  const bTF = (b.Ti || 0) - (b.Fi || 0);
  if (Math.sign(aTF) !== Math.sign(bTF) && Math.abs(aTF) > 1) reasons.push("理性与感性互补");

  if ((a.O || 0) > 2 && (b.O || 0) > 2) reasons.push("同样热爱探索新事物");
  if ((a.Fi || 0) > 2 && (b.Fi || 0) > 2) reasons.push("情感深度共鸣");
  if ((a.E || 0) > 2 && (b.E || 0) > 2) reasons.push("社交能量匹配");
  if ((a.E || 0) < -2 && (b.E || 0) < -2) reasons.push("都享受安静的陪伴");
  if ((a.Ni || 0) > 2 && (b.Ni || 0) > 2) reasons.push("直觉与洞察力共振");
  if (interestOverlap(aInterests || [], bInterests || []) > 0) reasons.push("兴趣爱好重叠");

  return reasons.slice(0, 3);
}

/** Determine best-fitting archetype from dimension scores */
export function determineArchetype(scores: DimScores): Archetype {
  let best = ARCHETYPES[0];
  let bestScore = -Infinity;
  for (const arch of ARCHETYPES) {
    let s = 0;
    for (const [k, w] of Object.entries(arch.weights)) {
      s += (scores[k] || 0) * (w as number);
    }
    if (s > bestScore) {
      bestScore = s;
      best = arch;
    }
  }
  return best;
}

/** Compute 6 trait bar percentages for profile display */
export interface TraitBar {
  left: string;
  right: string;
  pct: number;
  color: string;
}

export function computeTraitBars(scores: DimScores): TraitBar[] {
  const pairs: Array<{ l: string; r: string; k: string; k2?: string; neg?: boolean; c: string }> = [
    { l: "内向", r: "外向", k: "E", neg: true, c: "#7C5CFC" },
    { l: "理性", r: "感性", k: "Ti", k2: "Fi", c: "#4ECDC4" },
    { l: "直觉", r: "实感", k: "Ni", k2: "Se", c: "#FF6B9D" },
    { l: "计划", r: "随性", k: "C", k2: "O", c: "#FFD93D" },
    { l: "共情", r: "独立", k: "A", neg: true, c: "#96CEB4" },
    { l: "敏感", r: "稳定", k: "N", neg: true, c: "#DDA0DD" },
  ];

  return pairs.map(p => {
    let pct: number;
    if (p.neg) {
      pct = Math.max(5, Math.min(95, 50 + (scores[p.k] || 0) * 5));
    } else {
      const lv = scores[p.k] || 0;
      const rv = scores[p.k2!] || 0;
      const total = Math.abs(lv) + Math.abs(rv) || 1;
      pct = Math.max(5, Math.min(95, Math.round((lv / total) * 100)));
    }
    return { left: p.l, right: p.r, pct, color: p.c };
  });
}
