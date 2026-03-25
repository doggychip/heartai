/**
 * Shared command handlers for Telegram & Discord bots.
 * Each function calls existing fortune/metaphysics logic directly (no HTTP).
 */
import lunisolar from "lunisolar";
import { getAIClient, getFortuneClient, DEFAULT_MODEL, FORTUNE_MODEL } from "./ai-config";

// ─── Rate Limiting ────────────────────────────────────────
const userCooldowns = new Map<string, number>();
const COOLDOWN_MS = 3000;

export function checkBotRateLimit(userId: string): boolean {
  const now = Date.now();
  const last = userCooldowns.get(userId) || 0;
  if (now - last < COOLDOWN_MS) return false;
  userCooldowns.set(userId, now);
  return true;
}

// ─── Helpers ──────────────────────────────────────────────

function progressBar(score: number, max = 100): string {
  const filled = Math.round((score / max) * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled) + ` ${score}/${max}`;
}

function starRating(score: number): string {
  const stars = Math.round(score / 20);
  return "⭐".repeat(stars);
}

function getStemElement(stem: string): string {
  const map: Record<string, string> = {
    "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
    "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水",
  };
  return map[stem] || "";
}

function parseAIJSON(raw: string): any {
  try {
    return JSON.parse(raw.replace(/```json\n?|```/g, "").trim());
  } catch {
    return null;
  }
}

// ─── Crypto Fortune Helpers (mirrored from routes.ts) ─────

const CRYPTO_ELEMENTS: Record<string, string> = {
  BTC: "金", ETH: "水", SOL: "火", BNB: "土", TON: "木", AVAX: "木", DOGE: "火",
};

const ELEMENT_RELATIONS: Record<string, Record<string, string>> = {
  金: { 金: "比和", 木: "我克", 水: "我生", 火: "克我", 土: "生我" },
  木: { 金: "克我", 木: "比和", 水: "生我", 火: "我生", 土: "我克" },
  水: { 金: "生我", 木: "我生", 水: "比和", 火: "我克", 土: "克我" },
  火: { 金: "我克", 木: "生我", 水: "克我", 火: "比和", 土: "我生" },
  土: { 金: "我生", 木: "克我", 水: "我克", 火: "生我", 土: "比和" },
};

const ELEMENT_EMOJI: Record<string, string> = {
  金: "🪙", 水: "💧", 火: "🔥", 土: "🌍", 木: "🌿",
};

function calcCryptoFortune(tokenElement: string, dayElement: string, tokenSymbol?: string): { score: number; fortuneLevel: string } {
  const rel = ELEMENT_RELATIONS[tokenElement]?.[dayElement] || "比和";
  const baseScores: Record<string, number> = { 生我: 88, 比和: 75, 我生: 65, 我克: 55, 克我: 40 };
  const base = baseScores[rel] ?? 60;
  const dayHash = new Date().getDate() * 7 + new Date().getMonth() * 13;
  const tokenHash = tokenSymbol ? tokenSymbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0) : 0;
  const variance = (((dayHash + tokenHash) % 21) - 10);
  const score = Math.max(20, Math.min(100, base + variance));
  const fortuneLevel = score >= 85 ? "大吉" : score >= 70 ? "吉" : score >= 55 ? "平" : score >= 40 ? "凶" : "大凶";
  return { score, fortuneLevel };
}

// 100支签 pool (subset used by routes.ts)
const QIAN_RANKS = ["上上", "上中", "中上", "中中", "中平", "中下", "下下"];

// ─── Command: fortune (每日运势) ──────────────────────────

export async function handleFortune(birthDate?: string): Promise<string> {
  try {
    const today = lunisolar(new Date());
    const todayBazi = today.char8.toString();
    const dayMasterStem = today.char8.day.stem.toString();
    const todayLunar = `${today.lunar.getMonthName()}${today.lunar.getDayName()}`;
    const todaySolarTerm = today.solarTerm?.toString() || "";
    const dateStr = new Date().toLocaleDateString("zh-CN");

    let birthInfo = "";
    let birthElement = "";
    if (birthDate) {
      try {
        const birth = lunisolar(birthDate);
        const birthBazi = birth.char8.toString();
        const birthDM = birth.char8.day.stem.toString();
        birthElement = getStemElement(birthDM);
        birthInfo = `\n用户出生日期: ${birthDate}\n用户八字: ${birthBazi}\n日主五行: ${birthElement}(${birthDM})`;
      } catch (err) { console.error("[BOT] birth bazi parse error:", err); }
    }

    // Get 宜忌
    let good: string[] = [], bad: string[] = [];
    try {
      const rawActs = (today as any).theGods?.getActs?.();
      if (rawActs) {
        good = (rawActs.good || rawActs[0] || []).map((a: any) => a.toString());
        bad = (rawActs.bad || rawActs[1] || []).map((a: any) => a.toString());
      }
    } catch (err) { console.error("[BOT] theGods getActs error:", err); }

    const client = getAIClient();
    const prompt = `你是一位精通中国传统命理学的AI顾问。生成今日运势报告。
${birthInfo}
今日: ${dateStr}，农历${todayLunar}，四柱${todayBazi}，天干${dayMasterStem}
节气: ${todaySolarTerm || "无"}
宜: ${good.slice(0, 6).join("、") || "无"}
忌: ${bad.slice(0, 6).join("、") || "无"}

返回严格JSON:
{"totalScore":85,"loveScore":80,"careerScore":88,"wealthScore":75,"studyScore":70,"socialScore":82,"summary":"一句话概括","detail":"100字分析","luckyColor":"颜色","luckyNumber":"数字","luckyDirection":"方位","advice":"建议"}`;

    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: 500,
      temperature: 0.8,
      messages: [
        { role: "system", content: "你是命理AI助手。只返回JSON。" },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() || "{}";
    const f = parseAIJSON(raw) || {
      totalScore: 80, loveScore: 78, careerScore: 82, wealthScore: 76, studyScore: 75, socialScore: 80,
      summary: "今日运势平稳", detail: "整体运势平稳，宜静不宜动。",
      luckyColor: "绿色", luckyNumber: "3", luckyDirection: "东方", advice: "保持乐观心态",
    };

    return `🌟 *今日运势* — ${dateStr}

📊 综合运势: ${progressBar(f.totalScore)}

💕 爱情: ${starRating(f.loveScore)} ${f.loveScore}
💰 财运: ${starRating(f.wealthScore)} ${f.wealthScore}
💼 事业: ${starRating(f.careerScore)} ${f.careerScore}
📚 学业: ${starRating(f.studyScore || 75)} ${f.studyScore || 75}
🤝 人际: ${starRating(f.socialScore || 80)} ${f.socialScore || 80}

🎨 幸运色: ${f.luckyColor}
🔢 幸运数字: ${f.luckyNumber}
🧭 幸运方位: ${f.luckyDirection}

💡 *今日箴言:* ${f.summary}

${f.detail}

✨ ${f.advice}`;
  } catch (err) {
    console.error("[BOT] fortune error:", err);
    return "🌟 今日运势获取中遇到问题，请稍后再试~";
  }
}

// ─── Command: crypto (加密运势) ───────────────────────────

export async function handleCrypto(tokenSymbol?: string): Promise<string> {
  try {
    const lsr = lunisolar();
    const dayGan = lsr.char8.day.stem.toString();
    const dayZhi = lsr.char8.day.branch.toString();
    const dayElement = lsr.char8.day.stem.e5?.toString() || "土";
    const dateStr = new Date().toLocaleDateString("zh-CN");

    const TOKENS = [
      { symbol: "BTC", name: "Bitcoin" },
      { symbol: "ETH", name: "Ethereum" },
      { symbol: "SOL", name: "Solana" },
      { symbol: "BNB", name: "BNB" },
      { symbol: "TON", name: "Toncoin" },
    ];

    const tokensToShow = tokenSymbol
      ? TOKENS.filter(t => t.symbol === tokenSymbol.toUpperCase())
      : TOKENS;

    if (tokensToShow.length === 0) {
      return `❌ 不支持的代币: ${tokenSymbol}\n支持: BTC, ETH, SOL, BNB, TON`;
    }

    let lines = `🪙 *加密运势* — ${dateStr}\n`;

    for (const t of tokensToShow) {
      const elem = CRYPTO_ELEMENTS[t.symbol] || "金";
      const { score, fortuneLevel } = calcCryptoFortune(elem, dayElement, t.symbol);
      const interaction = ELEMENT_RELATIONS[elem]?.[dayElement] || "比和";
      const emoji = ELEMENT_EMOJI[elem] || "🔮";

      const relDesc: Record<string, string> = {
        生我: "能量充沛，气场相合",
        比和: "势均力敌，稳中求进",
        我生: "能量外泄，宜守不宜攻",
        我克: "可驾驭之势，主动出击",
        克我: "气场受制，静观其变",
      };

      lines += `\n${emoji} *${t.symbol}* (${elem}): ${progressBar(score)}`;
      lines += `\n  ${fortuneLevel} · ${interaction} · ${relDesc[interaction] || "平稳"}`;
    }

    lines += `\n\n📅 天干${dayGan}(${dayElement}) 地支${dayZhi}`;
    lines += `\n⚠️ 仅供娱乐，非投资建议`;

    return lines;
  } catch (err) {
    console.error("[BOT] crypto error:", err);
    return "🪙 加密运势获取失败，请稍后再试~";
  }
}

// ─── Command: bazi (八字) ─────────────────────────────────

export async function handleBazi(birthDate: string, birthHour?: number): Promise<string> {
  try {
    const [year, month, day] = birthDate.split("-").map(Number);
    if (!year || !month || !day) return "❌ 请输入正确的日期格式: YYYY-MM-DD";

    const hourVal = birthHour ?? 12;
    const dateStr = `${year}/${month}/${day} ${hourVal}:00`;
    const d = lunisolar(dateStr);

    const pillars = ["year", "month", "day", "hour"] as const;
    const pillarNames = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" };
    const dayMaster = d.char8.day.stem.toString();
    const dayElement = getStemElement(dayMaster);

    let pillarLines = "";
    const elementCount: Record<string, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };

    for (const p of pillars) {
      const stem = d.char8[p].stem.toString();
      const branch = d.char8[p].branch.toString();
      const stemE = getStemElement(stem);
      if (stemE && elementCount[stemE] !== undefined) elementCount[stemE]++;
      const branchEMap: Record<string, string> = {
        "子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土", "巳": "火",
        "午": "火", "未": "土", "申": "金", "酉": "金", "戌": "土", "亥": "水",
      };
      const branchE = branchEMap[branch] || "";
      if (branchE && elementCount[branchE] !== undefined) elementCount[branchE]++;
      pillarLines += `  ${pillarNames[p]}: ${stem}${branch}`;
      if (p === "day") pillarLines += ` ← 日主`;
      pillarLines += `\n`;
    }

    // 五行分布
    const elemBar = Object.entries(elementCount)
      .map(([e, c]) => `${ELEMENT_EMOJI[e] || ""}${e}:${"●".repeat(c)}${"○".repeat(Math.max(0, 4 - c))}(${c})`)
      .join("  ");

    // AI interpretation
    let aiInsight = "";
    try {
      const client = getFortuneClient();
      const resp = await client.chat.completions.create({
        model: FORTUNE_MODEL,
        max_tokens: 300,
        messages: [
          { role: "system", content: "你是八字命理师。简洁解读，100字以内。" },
          { role: "user", content: `八字: ${d.char8.toString()}，日主${dayMaster}(${dayElement})。五行分布: ${JSON.stringify(elementCount)}。简要分析性格和运势。` },
        ],
      });
      aiInsight = resp.choices[0]?.message?.content?.trim() || "";
    } catch (err) { console.error("[BOT] bazi AI insight error:", err); }

    return `🔮 *八字分析*

📅 出生: ${birthDate}${birthHour !== undefined ? ` ${birthHour}时` : ""}
📋 八字: ${d.char8.toString()}

*四柱:*
${pillarLines}
👤 *日主:* ${dayMaster} (${dayElement}) ${ELEMENT_EMOJI[dayElement] || ""}

*五行分布:*
${elemBar}

${aiInsight ? `\n💡 *解读:*\n${aiInsight}` : ""}`;
  } catch (err) {
    console.error("[BOT] bazi error:", err);
    return "🔮 八字计算失败，请检查日期格式 (YYYY-MM-DD)";
  }
}

// ─── Command: qiuqian (求签) ──────────────────────────────

const QIAN_POOL = [
  { number: 1, rank: "上上", title: "开天辟地", poem: "天开地辟结良缘，日吉时良万事全。若得此签非小可，人行忠正帝王宣。", jie: "万事皆通，如日方升。" },
  { number: 5, rank: "中中", title: "刘晨遇仙", poem: "一锄掘地要求泉，须是掘开数丈渊。须到久深方见水，比中尽有更深缘。", jie: "持之以恒，功到自成。" },
  { number: 7, rank: "中下", title: "苏秦不第", poem: "奔波阵阵似浮云，何日停车落脚跟。心事不须空计较，且从耐守自然轮。", jie: "切忌焦躁，静待时机。" },
  { number: 11, rank: "上上", title: "书生遇友", poem: "逍遥自在乐升平，万事安然百事宁。无数良田收获满，喜看秋色入门庭。", jie: "丰收在望，万事如意。" },
  { number: 20, rank: "上上", title: "姜太公遇文王", poem: "当春久雨喜开晴，玉出昆山石自明。终有贵人来协力，前程万里甚分明。", jie: "雨过天晴，贵人提携。" },
  { number: 25, rank: "上上", title: "伯牙访友", poem: "知音说与知音听，非是知音不与弹。曲调若逢同声和，尽在高山流水间。", jie: "遇知己，得共鸣。" },
  { number: 32, rank: "上上", title: "刘备求贤", poem: "刘备当年在许昌，须知孔明入南阳。凤鸣高岗风远扬，斯时正是好时光。", jie: "礼贤下士，正当其时。" },
  { number: 39, rank: "下下", title: "姜女寻夫", poem: "天边消息实难猜，无限忧愁挂满怀。若得贵人垂一引，前途指日见光明。", jie: "忧虑重重，盼望贵人。" },
  { number: 45, rank: "下下", title: "仁宗认母", poem: "温柔自古胜刚强，莫把心机太较量。百计千方终无益，不如守拙待时芳。", jie: "守拙待时，莫强求。" },
  { number: 47, rank: "上上", title: "梁灏登科", poem: "锦上添花色更鲜，运来禄马喜双全。时人莫讶功名晚，天意分明在少年。", jie: "锦上添花，双喜临门。" },
  { number: 53, rank: "上中", title: "狄青挂帅", poem: "失意番成得意时，龙门一跳便成奇。青云直上无难事，大展鸿图在此时。", jie: "厚积薄发，鱼跃龙门。" },
  { number: 58, rank: "上上", title: "文王遇凤", poem: "凤鸣岐山兆吉祥，文王圣德感上苍。从此龙飞凤舞起，八百基业万年长。", jie: "龙凤呈祥，千载良机。" },
  { number: 65, rank: "上上", title: "凤凰涅槃", poem: "浴火重生翔九天，灰飞烟灭又重圆。绝处逢生天注定，涅槃之后更蹁跹。", jie: "置之死地而后生。" },
  { number: 73, rank: "上上", title: "龙门鲤跃", poem: "一朝鱼化龙门去，翻身一跃入青云。十年辛苦无人问，一举成名天下闻。", jie: "十年磨一剑，一朝成大器。" },
  { number: 84, rank: "上上", title: "状元游街", poem: "十年苦读一朝中，金榜题名天下同。春风得意马蹄疾，一日看尽长安花。", jie: "功成名就，喜气洋洋。" },
  { number: 88, rank: "上上", title: "九天揽月", poem: "可上九天揽明月，可下五洋捉鳖鱼。胸怀壮志凌云起，万里鹏程在此时。", jie: "壮志凌云，正是时候。" },
  { number: 99, rank: "上上", title: "满堂金玉", poem: "满堂金玉福禄全，喜事连连乐无边。紫微高照添吉庆，家和万事兴百年。", jie: "满堂吉庆，万事亨通。" },
  { number: 3, rank: "下下", title: "董永卖身", poem: "临风冒雨去还乡，心已思量意已忙。因祸得福天之意，更逢云开见太阳。", jie: "先苦后甜，守得云开。" },
  { number: 28, rank: "下下", title: "李后寻夫", poem: "东边月上正婵娟，倏尔云遮月半边。万事不由人计较，一心还仗上苍怜。", jie: "世事难料，随缘而安。" },
  { number: 77, rank: "下下", title: "荆轲刺秦", poem: "风萧萧兮易水寒，壮士一去不复还。虽怀壮志成败论，须知时势胜人谋。", jie: "时势不利，切勿冒进。" },
];

export async function handleQiuqian(category?: string, question?: string): Promise<string> {
  try {
    const categoryLabels: Record<string, string> = {
      事业: "事业前程", 感情: "感情姻缘", 财运: "财运财富", 学业: "考试学业", 健康: "健康平安",
    };
    const catLabel = (category && categoryLabels[category]) || "综合运势";

    const qian = QIAN_POOL[Math.floor(Math.random() * QIAN_POOL.length)];

    let aiReading = "";
    try {
      const client = getFortuneClient();
      const resp = await client.chat.completions.create({
        model: FORTUNE_MODEL,
        max_tokens: 400,
        temperature: 0.85,
        messages: [
          { role: "system", content: "你是古寺住持，温暖正面地解签。150字以内。" },
          { role: "user", content: `第${qian.number}签·${qian.rank}签·${qian.title}\n签诗：${qian.poem}\n签解：${qian.jie}\n类别：${catLabel}\n${question ? `问题：${question}` : "通用解读"}` },
        ],
      });
      aiReading = resp.choices[0]?.message?.content?.trim() || "";
    } catch (err) { console.error("[BOT] qiuqian AI reading error:", err); }

    const rankEmoji = qian.rank.includes("上") ? "🔴" : qian.rank.includes("下") ? "🟢" : "🟡";

    return `🎋 *观音灵签* · 第${qian.number}签

${rankEmoji} *${qian.rank}签* — ${qian.title}

📜 *签诗:*
${qian.poem}

📖 *签解:* ${qian.jie}

🏷️ 类别: ${catLabel}
${question ? `❓ 问题: ${question}` : ""}

${aiReading ? `\n🔮 *解签:*\n${aiReading}` : ""}`;
  } catch (err) {
    console.error("[BOT] qiuqian error:", err);
    return "🎋 求签遇到问题，请稍后再试~";
  }
}

// ─── Command: tarot (塔罗牌) ──────────────────────────────

const TAROT_CARDS = [
  { name: "愚人", nameEn: "The Fool", emoji: "🎭" },
  { name: "魔术师", nameEn: "The Magician", emoji: "🪄" },
  { name: "女祭司", nameEn: "The High Priestess", emoji: "🌙" },
  { name: "女皇", nameEn: "The Empress", emoji: "👑" },
  { name: "皇帝", nameEn: "The Emperor", emoji: "👑" },
  { name: "教皇", nameEn: "The Hierophant", emoji: "⛪" },
  { name: "恋人", nameEn: "The Lovers", emoji: "❤️" },
  { name: "战车", nameEn: "The Chariot", emoji: "🚗" },
  { name: "力量", nameEn: "Strength", emoji: "🦁" },
  { name: "隐士", nameEn: "The Hermit", emoji: "🏮" },
  { name: "命运之轮", nameEn: "Wheel of Fortune", emoji: "☸️" },
  { name: "正义", nameEn: "Justice", emoji: "⚖️" },
  { name: "倒吊人", nameEn: "The Hanged Man", emoji: "🙈" },
  { name: "死神", nameEn: "Death", emoji: "💀" },
  { name: "节制", nameEn: "Temperance", emoji: "✨" },
  { name: "恶魔", nameEn: "The Devil", emoji: "😈" },
  { name: "塔", nameEn: "The Tower", emoji: "🏚️" },
  { name: "星星", nameEn: "The Star", emoji: "⭐" },
  { name: "月亮", nameEn: "The Moon", emoji: "🌝" },
  { name: "太阳", nameEn: "The Sun", emoji: "☀️" },
  { name: "审判", nameEn: "Judgement", emoji: "📯" },
  { name: "世界", nameEn: "The World", emoji: "🌍" },
];

export async function handleTarot(question?: string): Promise<string> {
  try {
    const shuffled = [...TAROT_CARDS].sort(() => Math.random() - 0.5);
    const card = shuffled[0];
    const reversed = Math.random() > 0.5;
    const orientation = reversed ? "逆位" : "正位";

    let aiReading = "";
    try {
      const client = getAIClient();
      const resp = await client.chat.completions.create({
        model: DEFAULT_MODEL,
        max_tokens: 400,
        messages: [
          { role: "system", content: "你是塔罗牌解读大师。给出温暖有洞见的解读，150字以内。" },
          { role: "user", content: `问题: ${question || "今日运势如何？"}\n牌: ${card.name}(${card.nameEn}) ${orientation}\n请解读这张牌的含义和建议。` },
        ],
      });
      aiReading = resp.choices[0]?.message?.content?.trim() || "";
    } catch (err) { console.error("[BOT] tarot AI reading error:", err); }

    return `🃏 *塔罗占卜*

${card.emoji} *${card.name}* (${card.nameEn})
📍 ${orientation}

${question ? `❓ 问题: ${question}\n` : ""}
${aiReading ? `🔮 *解读:*\n${aiReading}` : `${card.name}${orientation}提示你关注内心的声音，保持开放心态。`}

⚠️ 以娱乐和文化探索为目的，结果仅供参考`;
  } catch (err) {
    console.error("[BOT] tarot error:", err);
    return "🃏 塔罗占卜遇到问题，请稍后再试~";
  }
}

// ─── Command: dream (解梦) ────────────────────────────────

export async function handleDream(dreamText: string): Promise<string> {
  try {
    if (!dreamText || dreamText.trim().length < 2) {
      return "❌ 请描述你的梦境内容，至少2个字";
    }

    let interpretation = "";
    try {
      const client = getAIClient();
      const resp = await client.chat.completions.create({
        model: DEFAULT_MODEL,
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content: `你是融合周公解梦、命理学和心理学的梦境分析师。分析要包含:
1. 周公解梦传统解读
2. 心理洞察
3. 开运建议
200字以内，温暖有洞察力。`,
          },
          { role: "user", content: `我梦见了: ${dreamText}` },
        ],
      });
      interpretation = resp.choices[0]?.message?.content?.trim() || "";
    } catch (err) { console.error("[BOT] dream AI interpretation error:", err); }

    if (!interpretation) {
      // Fallback
      const keywords: Record<string, string> = {
        水: "水象征财运和情感的流动，清澈代表心境澄明。",
        飞: "飞翔寓意渴望自由和突破。",
        山: "山象征目标和挑战。",
        花: "花朵象征美好与新生，预示好运将至。",
        考: "考试类梦境代表自我评价和焦虑。",
      };
      let matched = "梦境是内心的镜子，映射出潜意识中的想法。";
      for (const [k, v] of Object.entries(keywords)) {
        if (dreamText.includes(k)) { matched = v; break; }
      }
      interpretation = matched + "\n\n建议在日记中记录这个梦，思考它与近期生活的关联。保持心境平和，多与自然接触。";
    }

    return `🌙 *解梦*

💭 梦境: ${dreamText.slice(0, 100)}${dreamText.length > 100 ? "..." : ""}

🔮 *解读:*
${interpretation}`;
  } catch (err) {
    console.error("[BOT] dream error:", err);
    return "🌙 解梦遇到问题，请稍后再试~";
  }
}

// ─── Command: almanac (老黄历) ────────────────────────────

export async function handleAlmanac(dateStr?: string): Promise<string> {
  try {
    const targetDate = dateStr || new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
    const d = lunisolar(targetDate);

    // Lunar info
    const lunarYear = d.format("lY");
    const lunarMonth = d.lunar.getMonthName();
    const lunarDay = d.lunar.getDayName();
    const zodiac = d.format("cZ");
    const bazi = d.char8.toString();
    const solarTerm = d.solarTerm?.toString() || "无";

    // 宜忌
    let good: string[] = [], bad: string[] = [];
    let duty12 = "";
    try {
      const rawActs = (d as any).theGods?.getActs?.();
      if (rawActs) {
        good = (rawActs.good || []).map((a: any) => a.toString());
        bad = (rawActs.bad || []).map((a: any) => a.toString());
      }
      duty12 = (d as any).theGods?.getDuty12God?.()?.toString() || "";
    } catch (err) { console.error("[BOT] almanac acts error:", err); }

    // 吉神方位
    let wealthDir = "", joyDir = "";
    try {
      const dirs = ["喜神", "財神"] as const;
      for (const god of dirs) {
        const [d24] = (d as any).theGods.getLuckDirection(god);
        if (god === "喜神") joyDir = d24?.direction || "";
        if (god === "財神") wealthDir = d24?.direction || "";
      }
    } catch (err) { console.error("[BOT] almanac directions error:", err); }

    return `📅 *老黄历* — ${targetDate}

🏮 农历: ${lunarYear} ${lunarMonth}${lunarDay}
🐲 生肖年: ${zodiac}
📋 四柱: ${bazi}
🌿 节气: ${solarTerm}
${duty12 ? `⚖️ 建除: ${duty12}` : ""}

✅ *宜:*
${good.slice(0, 8).join("、") || "诸事不宜"}

❌ *忌:*
${bad.slice(0, 8).join("、") || "无"}

${wealthDir ? `💰 财神方位: ${wealthDir}` : ""}
${joyDir ? `😊 喜神方位: ${joyDir}` : ""}`;
  } catch (err) {
    console.error("[BOT] almanac error:", err);
    return "📅 黄历查询失败，请稍后再试~";
  }
}

// ─── Command: fengshui (风水) ─────────────────────────────

export async function handleFengshui(input: string): Promise<string> {
  try {
    if (!input || input.trim().length < 1) {
      return "❌ 请描述空间类型或方向，如: 客厅朝南、卧室、办公室";
    }

    let aiResult = "";
    try {
      const client = getAIClient();
      const resp = await client.chat.completions.create({
        model: DEFAULT_MODEL,
        max_tokens: 600,
        messages: [
          { role: "system", content: "你是风水顾问，精通中国传统风水学。给出实用的风水建议，200字以内。" },
          { role: "user", content: `请分析以下空间的风水并给出建议:\n${input}` },
        ],
      });
      aiResult = resp.choices[0]?.message?.content?.trim() || "";
    } catch (err) { console.error("[BOT] fengshui AI error:", err); }

    if (!aiResult) {
      aiResult = "风水讲究藏风聚气。建议保持空间通风明亮，避免门对门、镜对床。摆放绿色植物有助于提升气场。";
    }

    return `🏠 *风水分析*

📍 ${input}

🔮 *分析与建议:*
${aiResult}

⚠️ 以文化探索为目的，结果仅供参考`;
  } catch (err) {
    console.error("[BOT] fengshui error:", err);
    return "🏠 风水分析失败，请稍后再试~";
  }
}

// ─── Command: help ────────────────────────────────────────

export function handleHelp(): string {
  return `🌟 *观星 GuanXing — 命令列表*

🔮 /fortune — 每日运势 (可选: 出生日期)
🪙 /crypto — 加密运势 (可选: BTC/ETH/SOL/BNB/TON)
📋 /bazi — 八字分析 (需要: 出生日期 YYYY-MM-DD)
🎋 /qiuqian — 求签 (可选: 类别+问题)
🃏 /tarot — 塔罗占卜 (可选: 问题)
🌙 /dream — 解梦 (需要: 梦境描述)
📅 /almanac — 老黄历 (可选: 日期)
🏠 /fengshui — 风水分析 (需要: 空间描述)

💡 *使用示例:*
/fortune 1990-05-15
/crypto BTC
/bazi 1990-05-15 14
/qiuqian 事业 我该不该跳槽
/tarot 感情运势如何
/dream 梦见在天上飞
/almanac 2026-03-20
/fengshui 客厅朝南

🌐 观星 GuanXing — AI 情感陪伴 × 东方玄学`;
}
