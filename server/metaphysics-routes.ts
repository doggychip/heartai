// Metaphysics Test API routes — imported and called from routes.ts
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import OpenAI from "openai";

function getUserId(req: Request): string {
  return (req as any).userId;
}

export function registerMetaphysicsRoutes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
) {
  // ─── GET cached result ────────────────────────────────
  app.get("/api/metaphysics/:testType", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { testType } = req.params;
      const cached = await storage.getMetaphysicsResult(userId, testType);
      if (!cached) return res.json({ result: null });
      res.json({ result: JSON.parse(cached.result), birthData: JSON.parse(cached.birthData) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST enneagram (save quiz result) ────────────────
  app.post("/api/metaphysics/enneagram", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { scores, dominantType, wingType } = req.body;
      const result = JSON.stringify({ scores, dominantType, wingType });
      const birthData = JSON.stringify({ type: "quiz" });
      await storage.saveMetaphysicsResult(userId, "enneagram", birthData, result);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST star-mansion (AI analysis) ──────────────────
  app.post("/api/metaphysics/star-mansion", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { birthDate } = req.body;
      if (!birthDate) return res.status(400).json({ error: "请输入出生日期" });

      const client = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: process.env.DEEPSEEK_API_KEY,
      });

      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content: `你是一位精通中国传统天文学的二十八星宿分析师。用户提供出生日期后，你需要：
1. 根据出生日期确定其本命星宿（二十八星宿之一）
2. 给出该星宿的性格特质分析
3. 给出星宿关系（亲、友、衰、安、坏、危、成、荣等）
4. 给出幸运元素

请以JSON格式回复，格式如下：
{
  "mansion": "星宿名",
  "title": "一句话描述",
  "group": "所属星象(东方青龙/北方玄武/西方白虎/南方朱雀)",
  "element": "五行属性",
  "personality": "详细性格描述(100字以上)",
  "traits": ["特质1", "特质2", "特质3", "特质4"],
  "compatible": ["相合星宿1", "相合星宿2", "相合星宿3"],
  "challenging": ["冲突星宿1", "冲突星宿2"],
  "luckyColor": "幸运颜色",
  "luckyDirection": "幸运方位",
  "luckyNumber": "幸运数字"
}
只回复JSON，不要其他内容。`,
          },
          { role: "user", content: `我的出生日期是 ${birthDate}` },
        ],
      });

      let result: any;
      try {
        const text = response.choices[0]?.message?.content?.trim() || "";
        result = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      } catch {
        result = {
          mansion: "角宿",
          title: "敏锐果断的先行者",
          group: "东方青龙",
          element: "木",
          personality: "角宿之人天生具有敏锐的洞察力和果断的行动力，善于开创新局面。性格刚毅正直，有领导才能，但有时过于急躁。内心深处渴望自由和成长，追求卓越。",
          traits: ["果断", "敏锐", "开创力强", "正直"],
          compatible: ["亢宿", "氐宿", "房宿"],
          challenging: ["奎宿", "娄宿"],
          luckyColor: "青绿色",
          luckyDirection: "东方",
          luckyNumber: "3",
        };
      }

      const birthData = JSON.stringify({ birthDate });
      await storage.saveMetaphysicsResult(userId, "star_mansion", birthData, JSON.stringify(result));
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST zodiac (AI analysis) ────────────────────────
  app.post("/api/metaphysics/zodiac", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { birthYear } = req.body;
      if (!birthYear) return res.status(400).json({ error: "请输入出生年份" });

      const animals = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
      const animal = animals[(birthYear - 4) % 12];

      const client = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: process.env.DEEPSEEK_API_KEY,
      });

      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content: `你是一位精通中国传统生肖文化的分析师。用户提供出生年份后，请给出该生肖的详细分析。

请以JSON格式回复：
{
  "animal": "生肖名",
  "emoji": "对应emoji",
  "title": "一句话特质描述",
  "element": "该年五行属性",
  "personality": "详细性格描述(100字以上)",
  "strengths": ["优点1", "优点2", "优点3", "优点4"],
  "weaknesses": ["缺点1", "缺点2"],
  "compatible": ["和谐生肖1", "和谐生肖2", "和谐生肖3"],
  "challenging": ["磨合生肖1", "磨合生肖2"],
  "luckyNumbers": ["数字1", "数字2"],
  "luckyColors": ["颜色1", "颜色2"],
  "career": "事业方向建议",
  "love": "感情建议"
}
只回复JSON，不要其他内容。`,
          },
          { role: "user", content: `我出生于${birthYear}年，属${animal}` },
        ],
      });

      let result: any;
      try {
        const text = response.choices[0]?.message?.content?.trim() || "";
        result = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      } catch {
        result = {
          animal,
          emoji: "🐉",
          title: `${animal}年出生 · 充满活力`,
          element: "土",
          personality: `属${animal}的人性格独特，具有该生肖特有的个性魅力。待人真诚，做事认真，在生活和事业中都能展现出色的能力。`,
          strengths: ["聪明", "勤劳", "忠诚", "善良"],
          weaknesses: ["固执", "敏感"],
          compatible: ["鼠", "猴", "鸡"],
          challenging: ["兔", "狗"],
          luckyNumbers: ["2", "8"],
          luckyColors: ["金色", "红色"],
          career: "适合从事需要创造力和领导力的工作。",
          love: "感情中需要多一些耐心和包容。",
        };
      }

      const birthData = JSON.stringify({ birthYear });
      await storage.saveMetaphysicsResult(userId, "zodiac", birthData, JSON.stringify(result));
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST numerology (calculation + AI) ───────────────
  app.post("/api/metaphysics/numerology", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { birthDate } = req.body;
      if (!birthDate) return res.status(400).json({ error: "请输入出生日期" });

      // Calculate life path number
      const digits = birthDate.replace(/-/g, "").split("").map(Number);
      let lifePathSum = digits.reduce((a: number, b: number) => a + b, 0);
      while (lifePathSum > 9) {
        lifePathSum = lifePathSum.toString().split("").map(Number).reduce((a: number, b: number) => a + b, 0);
      }

      // Birthday number
      const day = parseInt(birthDate.split("-")[2], 10);
      let birthdayNum = day;
      while (birthdayNum > 9) {
        birthdayNum = birthdayNum.toString().split("").map(Number).reduce((a: number, b: number) => a + b, 0);
      }

      // Talent number (from month + day)
      const month = parseInt(birthDate.split("-")[1], 10);
      let talentNum = month + day;
      while (talentNum > 9) {
        talentNum = talentNum.toString().split("").map(Number).reduce((a: number, b: number) => a + b, 0);
      }

      const client = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: process.env.DEEPSEEK_API_KEY,
      });

      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content: `你是一位精通生命灵数学的分析师。请根据用户的灵数信息给出详细解读。

请以JSON格式回复：
{
  "lifePathMeaning": "生命灵数详细解读(80字以上)",
  "birthdayMeaning": "生日数解读(50字以上)",
  "talentMeaning": "天赋数解读(50字以上)",
  "traits": ["核心特质1", "核心特质2", "核心特质3", "核心特质4"],
  "motto": "一句代表性格言",
  "strengths": "优势领域描述",
  "challenges": "挑战领域描述",
  "compatibility": "最佳搭配灵数",
  "luckyColor": "幸运颜色",
  "career": "适合的职业方向"
}
只回复JSON，不要其他内容。`,
          },
          {
            role: "user",
            content: `我的出生日期是 ${birthDate}，生命灵数是 ${lifePathSum}，生日数是 ${birthdayNum}，天赋数是 ${talentNum}`,
          },
        ],
      });

      let aiInterpretation: any;
      try {
        const text = response.choices[0]?.message?.content?.trim() || "";
        aiInterpretation = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      } catch {
        aiInterpretation = {
          lifePathMeaning: `生命灵数${lifePathSum}的人具有独特的人生使命。你天生具备${lifePathSum === 1 ? "领导力" : lifePathSum === 2 ? "协调力" : "创造力"}，在人生旅途中不断探索和成长。`,
          birthdayMeaning: `生日数${birthdayNum}赋予你直觉和感知力。`,
          talentMeaning: `天赋数${talentNum}表明你在创造性领域有特殊天赋。`,
          traits: ["直觉力强", "善于思考", "追求完美", "富有同情心"],
          motto: "用智慧照亮前行的路",
          strengths: "分析能力强，善于解决复杂问题",
          challenges: "有时过于追求完美",
          compatibility: String((lifePathSum % 9) + 1),
          luckyColor: "紫色",
          career: "适合从事需要分析和创造力的工作",
        };
      }

      const result = {
        lifePathNumber: lifePathSum,
        birthdayNumber: birthdayNum,
        talentNumber: talentNum,
        ...aiInterpretation,
      };

      const birthData = JSON.stringify({ birthDate });
      await storage.saveMetaphysicsResult(userId, "numerology", birthData, JSON.stringify(result));
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST ziwei (AI analysis) ─────────────────────────
  app.post("/api/metaphysics/ziwei", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { birthDate, birthHour, gender } = req.body;
      if (!birthDate) return res.status(400).json({ error: "请输入出生日期" });

      const client = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: process.env.DEEPSEEK_API_KEY,
      });

      const genderLabel = gender === "female" ? "女" : "男";
      const hourLabel = birthHour !== undefined ? `${birthHour}时` : "未知";

      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: `你是一位精通紫微斗数的命理分析师。请根据用户提供的出生信息，进行紫微斗数命盘分析。

请以JSON格式回复：
{
  "pattern": "命盘格局名称",
  "patternDesc": "格局简述",
  "palaces": [
    {
      "name": "命宫",
      "mainStar": "主星名",
      "description": "该宫位详细分析(60字以上)"
    },
    {
      "name": "迁移宫",
      "mainStar": "主星名",
      "description": "该宫位详细分析"
    },
    {
      "name": "事业宫",
      "mainStar": "主星名",
      "description": "该宫位详细分析"
    },
    {
      "name": "财帛宫",
      "mainStar": "主星名",
      "description": "该宫位详细分析"
    },
    {
      "name": "夫妻宫",
      "mainStar": "主星名",
      "description": "该宫位详细分析"
    },
    {
      "name": "福德宫",
      "mainStar": "主星名",
      "description": "该宫位详细分析"
    }
  ],
  "summary": "整体命格总结(100字以上)",
  "advice": "人生建议"
}
只回复JSON，不要其他内容。`,
          },
          {
            role: "user",
            content: `性别：${genderLabel}，出生日期：${birthDate}，出生时辰：${hourLabel}`,
          },
        ],
      });

      let result: any;
      try {
        const text = response.choices[0]?.message?.content?.trim() || "";
        result = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      } catch {
        result = {
          pattern: "紫府朝垣格",
          patternDesc: "有领导能力，易取得地位",
          palaces: [
            { name: "命宫", mainStar: "紫微", description: "紫微坐命，天生具有领导气质，为人端庄大方，有统御能力。行事稳重，有贵人相助。" },
            { name: "迁移宫", mainStar: "天机", description: "外出发展有利，善于变通，社交能力强。适合多走动，异地发展有机遇。" },
            { name: "事业宫", mainStar: "天府", description: "事业运势良好，适合管理和领导岗位。做事有规划，能够稳步上升。" },
            { name: "财帛宫", mainStar: "武曲", description: "财运不错，善于理财投资。正财运佳，偏财运需谨慎。中晚年财运更佳。" },
            { name: "夫妻宫", mainStar: "太阳", description: "感情热烈奔放，有魅力吸引异性。需要注意沟通和包容。" },
            { name: "福德宫", mainStar: "太阴", description: "内心细腻敏感，追求精神层面的满足。适合修身养性，培养兴趣爱好。" },
          ],
          summary: "此命格为紫府朝垣格，主人有领导才能和管理能力，一生中有贵人扶持。性格稳重大方，做事有规划。事业和财运都较为顺遂，适合往管理方向发展。感情方面需要多沟通理解。",
          advice: "发挥你的领导才能，同时注意与人为善，多倾听他人意见，事业会更上一层楼。",
        };
      }

      const birthData = JSON.stringify({ birthDate, birthHour, gender });
      await storage.saveMetaphysicsResult(userId, "ziwei", birthData, JSON.stringify(result));
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
