// MCP Server for HeartAI (观星) — expose metaphysics tools via Model Context Protocol
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

async function callInternal(path: string, body: Record<string, unknown>, apiKey: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as any).error || `API error ${res.status}`);
  return data;
}

async function callWebhook(body: Record<string, unknown>, apiKey: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/webhook/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as any).error || `Webhook error ${res.status}`);
  return data;
}

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

/**
 * Create an MCP server instance bound to a specific API key.
 * Each SSE connection gets its own McpServer (SDK limitation: one transport per server).
 */
export function createMcpServer(apiKey: string): McpServer {
  const mcp = new McpServer(
    { name: "guanxing", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  // 1. bazi_analysis — 八字命理分析
  mcp.tool(
    "bazi_analysis",
    "Analyze Chinese Four Pillars (BaZi / 八字) based on birth date and time. Returns heavenly stems, earthly branches, five elements breakdown, day master, and detailed analysis.",
    {
      birthDate: z.string().describe("Birth date in YYYY-MM-DD format"),
      birthHour: z.number().min(0).max(23).optional().describe("Birth hour (0-23)"),
      name: z.string().optional().describe("Person's name (optional)"),
    },
    async ({ birthDate, birthHour, name }) => {
      return text(await callInternal("/api/v1/bazi", { birthDate, birthHour, name }, apiKey));
    },
  );

  // 2. daily_fortune — 今日运势
  mcp.tool(
    "daily_fortune",
    "Get personalized daily fortune based on zodiac sign and optional birth date. Returns scores for career, love, wealth, health, and advice.",
    {
      zodiac: z.string().describe("Zodiac sign (e.g. 白羊座, 金牛座)"),
      birthDate: z.string().optional().describe("Birth date YYYY-MM-DD for improved accuracy"),
    },
    async ({ zodiac, birthDate }) => {
      return text(await callInternal("/api/v1/fortune", { zodiac, birthDate }, apiKey));
    },
  );

  // 3. qiuqian — 求签
  mcp.tool(
    "qiuqian",
    "Draw a divine lot (求签) — traditional Chinese temple fortune stick divination. Ask a question and receive a signed poem with interpretation.",
    {
      question: z.string().describe("The question to ask"),
      type: z.enum(["guanyin", "guandi"]).optional().describe("Divination type: guanyin (观音灵签) or guandi (关帝灵签)"),
    },
    async ({ question, type }) => {
      return text(await callInternal("/api/v1/qiuqian", { question, type }, apiKey));
    },
  );

  // 4. almanac — 万年黄历
  mcp.tool(
    "almanac",
    "Look up the Chinese almanac (黄历/万年历) for a given date. Returns lunar date, auspicious/inauspicious activities, five elements, and more.",
    {
      date: z.string().optional().describe("Date in YYYY-MM-DD format (defaults to today)"),
    },
    async ({ date }) => {
      return text(await callInternal("/api/v1/almanac", { date }, apiKey));
    },
  );

  // 5. dream_interpret — 解梦
  mcp.tool(
    "dream_interpret",
    "Interpret a dream using traditional Zhou Gong dream analysis (周公解梦) combined with modern psychology. Describe your dream and get symbols, interpretation, and advice.",
    {
      dream: z.string().describe("Description of the dream"),
      mood: z.string().optional().describe("Mood upon waking (optional)"),
    },
    async ({ dream, mood }) => {
      return text(await callInternal("/api/v1/dream", { dream, mood }, apiKey));
    },
  );

  // 6. tarot — 塔罗占卜
  mcp.tool(
    "tarot",
    "Perform a tarot card reading. Ask a question and choose a spread type. Returns drawn cards with meanings and a comprehensive interpretation.",
    {
      question: z.string().describe("The question for the tarot reading"),
      spread: z.enum(["single", "three", "cross"]).optional().describe("Spread type: single card, three-card, or Celtic cross"),
    },
    async ({ question, spread }) => {
      return text(await callInternal("/api/v1/tarot", { question, spread }, apiKey));
    },
  );

  // 7. name_score — 姓名测分
  mcp.tool(
    "name_score",
    "Score and analyze a Chinese name using traditional Five Grid numerology (五格剖象法). Returns total score, grid breakdown, five elements analysis.",
    {
      surname: z.string().describe("Surname (姓)"),
      givenName: z.string().describe("Given name (名)"),
      birthDate: z.string().optional().describe("Birth date YYYY-MM-DD for enhanced analysis"),
    },
    async ({ surname, givenName, birthDate }) => {
      return text(await callInternal("/api/v1/name-score", { surname, givenName, birthDate }, apiKey));
    },
  );

  // 8. fengshui — 风水评估
  mcp.tool(
    "fengshui",
    "Feng shui assessment for a living or working space. Get a score, analysis, suggestions, and lucky/unlucky items.",
    {
      spaceType: z.enum(["home", "office", "shop"]).describe("Type of space: home, office, or shop"),
      direction: z.string().optional().describe("Facing direction (e.g. 南, 北, 东南)"),
      concerns: z.string().optional().describe("Specific concerns (e.g. 财运, 健康, 人际)"),
    },
    async ({ spaceType, direction, concerns }) => {
      return text(await callInternal("/api/v1/fengshui", { spaceType, direction, concerns }, apiKey));
    },
  );

  // 9. compatibility — 缘分合盘
  mcp.tool(
    "compatibility",
    "Analyze compatibility between two people based on their birth info, zodiac, or names. Returns score, dimensional analysis, and relationship advice.",
    {
      person1: z.object({
        name: z.string().optional(),
        birthDate: z.string().optional(),
        zodiac: z.string().optional(),
      }).describe("First person's info"),
      person2: z.object({
        name: z.string().optional(),
        birthDate: z.string().optional(),
        zodiac: z.string().optional(),
      }).describe("Second person's info"),
    },
    async ({ person1, person2 }) => {
      return text(await callInternal("/api/v1/compatibility", { person1, person2 }, apiKey));
    },
  );

  // 10. zodiac — 星座运势
  mcp.tool(
    "zodiac",
    "Get in-depth zodiac sign analysis including personality traits, element, ruling planet, and compatibility.",
    {
      sign: z.string().describe("Zodiac sign (e.g. 白羊座, Aries)"),
      aspect: z.string().optional().describe("Aspect to focus on: personality, love, career, health"),
    },
    async ({ sign, aspect }) => {
      return text(await callInternal("/api/v1/zodiac", { zodiac: sign, aspect }, apiKey));
    },
  );

  // 11. community_browse — 浏览社区
  mcp.tool(
    "community_browse",
    "Browse the latest community posts on GuanXing. Returns up to 20 recent posts with authors and engagement counts.",
    {},
    async () => {
      return text(await callWebhook({ action: "list_posts" }, apiKey));
    },
  );

  // 12. crypto_fortune — 加密运势
  mcp.tool(
    "crypto_fortune",
    "Get a crypto token fortune reading based on Chinese Five Elements (五行). Returns energy score, fortune level, AI insight combining metaphysics with crypto, lucky trading hours, and advice. Tokens: BTC(金), ETH(水), SOL(火), BNB(土), AVAX(木), DOGE(火).",
    {
      token: z.string().describe("Crypto token symbol (e.g. BTC, ETH, SOL)"),
      birthDate: z.string().optional().describe("Birth date YYYY-MM-DD for personalized reading"),
      birthHour: z.number().min(0).max(23).optional().describe("Birth hour (0-23)"),
    },
    async ({ token, birthDate, birthHour }) => {
      return text(await callInternal("/api/v1/crypto-fortune", { token, birthDate, birthHour }, apiKey));
    },
  );

  // 13. community_post — 发帖
  mcp.tool(
    "community_post",
    "Create a new post in the GuanXing community. Share thoughts, ask questions, or offer encouragement.",
    {
      content: z.string().describe("Post content"),
      tag: z.enum(["sharing", "question", "encouragement", "resource"]).optional().describe("Post tag/category"),
    },
    async ({ content, tag }) => {
      return text(await callWebhook({ action: "post", content, tag: tag || "sharing" }, apiKey));
    },
  );

  return mcp;
}

// Track active transports by session ID so POST messages can be routed
export const transports = new Map<string, SSEServerTransport>();
export { SSEServerTransport };
