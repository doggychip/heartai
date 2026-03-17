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

  // ─── POST chakra (quiz + AI analysis) ─────────────────────
  app.post("/api/metaphysics/chakra", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { scores } = req.body;
      if (!scores || !Array.isArray(scores) || scores.length !== 7) {
        return res.status(400).json({ error: "请完成所有脉轮测试题目" });
      }

      const chakraNames = ["海底轮", "脐轮", "太阳轮", "心轮", "喉轮", "眉心轮", "顶轮"];
      const maxScore = 15;

      const client = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: process.env.DEEPSEEK_API_KEY,
      });

      const scoreDesc = scores
        .map((s: number, i: number) => `${chakraNames[i]}: ${s}/${maxScore}分`)
        .join("、");

      let analysis = "";
      try {
        const response = await client.chat.completions.create({
          model: "deepseek-chat",
          max_tokens: 1500,
          messages: [
            {
              role: "system",
              content: `你是一位精通脉轮能量系统的灵性导师。请根据用户的七个脉轮得分进行深度解读。
每个脉轮满分15分，13分以上为过度活跃，10-12分为平衡，7-9分为略有不足，6分以下为不足。
请分析：
1. 整体能量分布特点（2-3句）
2. 最强和最弱的脉轮及其含义
3. 脉轮之间的关系和影响
4. 具体的平衡建议（冥想、瑜伽、日常习惯等）
用中文回复，温暖友善的语气，300字左右。不要用JSON格式，直接用文字段落回复。`,
            },
            { role: "user", content: `我的脉轮得分：${scoreDesc}` },
          ],
        });
        analysis = response.choices[0]?.message?.content?.trim() || "";
      } catch {
        analysis = `你的脉轮能量分布显示了独特的能量模式。${
          scores[3] >= 10 ? "心轮能量充沛，说明你具有很强的同理心和爱的能力。" : "心轮需要更多关注，尝试练习慈悲冥想来增强爱的能量。"
        }${
          scores[0] >= 10 ? "海底轮稳固，你有良好的安全感基础。" : "建议多进行接地练习，增强根基稳定性。"
        }整体而言，保持规律的冥想和瑜伽练习，有助于各脉轮能量的平衡与流通。`;
      }

      const result = { scores, analysis };
      const birthData = JSON.stringify({ type: "quiz" });
      await storage.saveMetaphysicsResult(userId, "chakra", birthData, JSON.stringify(result));
      res.json({ success: true, analysis });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST htp (House-Tree-Person AI analysis) ─────────────
  app.post("/api/metaphysics/htp", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { selections } = req.body;
      if (!selections || Object.keys(selections).length < 3) {
        return res.status(400).json({ error: "请至少完成房、树、人的基本选择" });
      }

      const client = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: process.env.DEEPSEEK_API_KEY,
      });

      const selectionDesc = Object.entries(selections)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      let result: any;
      try {
        const response = await client.chat.completions.create({
          model: "deepseek-chat",
          max_tokens: 2000,
          messages: [
            {
              role: "system",
              content: `你是一位精通房树人(HTP)心理测验的心理分析师。用户通过选择不同的元素完成了房树人测试。请根据他们的选择进行心理分析。

HTP心理学解读要点：
- 房子代表家庭关系和安全感（大门=开放性，窗户=与外界接触，屋顶=理想/幻想，烟囱=温暖/情感）
- 树代表自我成长和生命力（树冠=思想/社交，树干=自我力量，根=安全感/过去，果实=成就）
- 人代表自我形象和社交（头=智力/幻想，身体=需求/驱力，手=社交/控制，脚=稳定/独立）
- 附加物代表环境感知（太阳=权威/温暖，云=焦虑，花草=对美的追求，动物=本能需求）

请以JSON格式回复：
{
  "personality": "性格特质分析(100字以上)",
  "traits": ["特质1", "特质2", "特质3", "特质4"],
  "emotional": "情感状态分析(80字以上)",
  "relationships": "人际关系模式(80字以上)",
  "innerWorld": "内心世界和潜意识(80字以上)",
  "suggestion": "成长建议(50字以上)"
}
只回复JSON，不要其他内容。`,
            },
            { role: "user", content: `我的房树人选择：\n${selectionDesc}` },
          ],
        });

        const text = response.choices[0]?.message?.content?.trim() || "";
        result = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      } catch {
        result = {
          personality: "你的选择反映了一个内心丰富、注重安全感的人。你对家庭有着深厚的情感连接，同时也渴望个人的成长空间。你的思维方式倾向于实际和稳重，但内心深处保有对美好事物的追求。",
          traits: ["稳重", "细腻", "有安全感需求", "追求美好"],
          emotional: "你的情感表达较为含蓄，倾向于通过行动而非言语来表达感受。你重视情感的稳定性，不喜欢剧烈的情绪波动。",
          relationships: "你在人际关系中偏向主动但不强势。你喜欢与人保持适当的距离，既不过于亲密也不过于疏远。",
          innerWorld: "你的内心世界丰富而有序。你有清晰的价值观和目标，同时也有未被满足的深层需求等待被发现。",
          suggestion: "建议多关注自己的情感需求，尝试更加开放地表达内心的想法和感受。",
        };
      }

      const birthData = JSON.stringify({ type: "htp_selection" });
      await storage.saveMetaphysicsResult(userId, "htp", birthData, JSON.stringify(result));
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST mayan (Kin calculation + AI) ─────────────────────
  app.post("/api/metaphysics/mayan", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { birthDate } = req.body;
      if (!birthDate) return res.status(400).json({ error: "请输入出生日期" });

      const [yearStr, monthStr, dayStr] = birthDate.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);

      // Calculate Kin number using Dreamspell system
      // Reference: Jan 1, 2000 = Kin 111
      const refDate = new Date(2000, 0, 1);
      const refKin = 111;
      const targetDate = new Date(year, month - 1, day);
      const diffDays = Math.round((targetDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
      let kin = ((refKin + diffDays - 1) % 260) + 1;
      if (kin <= 0) kin += 260;

      const sealIndex = (kin - 1) % 20;
      const toneIndex = (kin - 1) % 13;

      // Cross pattern
      const supportSealIndex = (19 - sealIndex + 20) % 20;
      const challengeSealIndex = (sealIndex + 10) % 20;
      const hiddenPowerSealIndex = (19 - sealIndex + 20) % 20;

      // Guide seal calculation
      const guideToneGroup = toneIndex % 5;
      const guideOffsets = [0, 16, 12, 8, 4];
      const guideSealIndex = (sealIndex + guideOffsets[guideToneGroup]) % 20;

      const sealNames = [
        "红龙", "白风", "蓝夜", "黄种子", "红蛇",
        "白世界桥", "蓝手", "黄星星", "红月", "白狗",
        "蓝猴", "黄人", "红天行者", "白巫师", "蓝鹰",
        "黄战士", "红地球", "白镜", "蓝风暴", "黄太阳",
      ];

      const toneNames = [
        "磁性的", "月亮的", "电力的", "自存的", "超频的",
        "韵律的", "共振的", "银河的", "太阳的", "行星的",
        "光谱的", "水晶的", "宇宙的",
      ];

      const mainSeal = sealNames[sealIndex];
      const tone = toneNames[toneIndex];

      // AI interpretation
      const client = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: process.env.DEEPSEEK_API_KEY,
      });

      let interpretation = "";
      try {
        const response = await client.chat.completions.create({
          model: "deepseek-chat",
          max_tokens: 1500,
          messages: [
            {
              role: "system",
              content: `你是一位精通玛雅卓尔金历的星际印记解读师。请根据用户的Kin信息进行深度解读。
分析内容包括：
1. 这个Kin号码的总体含义和能量特质
2. 主图腾的性格描述和人生使命
3. 调性的影响和生命课题
4. 十字图腾的综合影响
5. 人生方向建议
用中文回复，温暖有灵性的语气，400字左右。不要用JSON格式，直接用文字段落回复。`,
            },
            {
              role: "user",
              content: `出生日期：${birthDate}
Kin ${kin}：${tone}${mainSeal}
调性：${toneIndex + 1} ${tone}
主图腾：${mainSeal}
指引：${sealNames[guideSealIndex]}
支持：${sealNames[supportSealIndex]}
挑战：${sealNames[challengeSealIndex]}
推动：${sealNames[hiddenPowerSealIndex]}`,
            },
          ],
        });
        interpretation = response.choices[0]?.message?.content?.trim() || "";
      } catch {
        interpretation = `Kin ${kin} ${tone}${mainSeal}，你携带着独特的星际印记来到这个世界。${mainSeal}赋予你核心的生命能量，而${tone}的调性则定义了你表达这份能量的方式。你的十字图腾揭示了完整的灵魂蓝图：指引图腾引导你的方向，支持图腾给予你力量，挑战图腾带来成长的机遇，推动图腾则是你隐藏的天赋。在人生旅途中，拥抱你所有图腾的能量，让它们和谐共舞。`;
      }

      const result = {
        kin,
        sealIndex,
        toneIndex,
        guideSealIndex,
        supportSealIndex,
        challengeSealIndex,
        hiddenPowerSealIndex,
        interpretation,
      };

      const birthData2 = JSON.stringify({ birthDate });
      await storage.saveMetaphysicsResult(userId, "mayan", birthData2, JSON.stringify(result));
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST human-design (AI analysis) ──────────────────────
  app.post("/api/metaphysics/human-design", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { birthDate, birthTime, birthPlace } = req.body;
      if (!birthDate) return res.status(400).json({ error: "请输入出生日期" });

      const client = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: process.env.DEEPSEEK_API_KEY,
      });

      const timeLabel = birthTime || "未知";
      const placeLabel = birthPlace || "未知";

      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: `你是一位精通人类图(Human Design)系统的分析师。请根据用户的出生信息，生成一份人类图分析报告。

请以JSON格式回复：
{
  "type": "类型(显示者/生产者/显示生产者/投射者/反映者)",
  "typeTitle": "类型的中文描述称号",
  "typeDescription": "该类型的详细描述(100字以上)",
  "strategy": "人生策略",
  "strategyDesc": "策略详细说明(60字以上)",
  "authority": "内在权威类型",
  "authorityDesc": "权威详细说明(60字以上)",
  "profile": "人生角色(如2/4, 3/5, 6/2等)",
  "profileDesc": "角色详细说明(60字以上)",
  "definition": "定义类型(单一定义/分裂定义/三分定义/四分定义)",
  "notSelfTheme": "非自我主题",
  "centers": [
    { "name": "能量中心名", "status": "有定义/无定义", "description": "简述" }
  ],
  "summary": "综合人生建议(100字以上)"
}
只回复JSON，不要其他内容。`,
          },
          { role: "user", content: `出生日期：${birthDate}，出生时间：${timeLabel}，出生地点：${placeLabel}` },
        ],
      });

      let result: any;
      try {
        const text = response.choices[0]?.message?.content?.trim() || "";
        result = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      } catch {
        result = {
          type: "生产者",
          typeTitle: "世界的建设者",
          typeDescription: "生产者是人类图中最常见的类型，约占人口的37%。你拥有持续的荐骨能量，天生就是为了回应生命中的机遇而存在。当你做着正确的事情时，你会感到满足和充实。",
          strategy: "等待回应",
          strategyDesc: "不要主动发起，而是等待生活向你提出邀请和机会，然后用你的荐骨直觉去回应。",
          authority: "荐骨权威",
          authorityDesc: "你的内在权威来自荐骨中心，它会通过身体的感觉告诉你什么是正确的。注意那些让你兴奋或抗拒的身体反应。",
          profile: "3/5",
          profileDesc: "探索者与救世主的结合。你通过亲身体验来学习，并因此被他人视为能够解决问题的人。",
          definition: "单一定义",
          notSelfTheme: "挫败感",
          centers: [
            { name: "荐骨", status: "有定义", description: "持久的生命力和工作能量" },
            { name: "情绪", status: "无定义", description: "容易受他人情绪影响" },
          ],
          summary: "作为生产者，你的人生关键是学会等待和回应。当你跟随荐骨的指引做正确的事，你会感到深深的满足。不要害怕说不，这是你保护自己能量的方式。",
        };
      }

      const birthData = JSON.stringify({ birthDate, birthTime, birthPlace });
      await storage.saveMetaphysicsResult(userId, "human_design", birthData, JSON.stringify(result));
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST zhengyu (AI analysis) ───────────────────────────
  app.post("/api/metaphysics/zhengyu", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { birthDate, birthTime } = req.body;
      if (!birthDate) return res.status(400).json({ error: "请输入出生日期" });

      const client = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: process.env.DEEPSEEK_API_KEY,
      });

      const timeLabel = birthTime || "未知";

      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: `你是一位精通政余分析（融合希腊占星术与中国传统命理）的分析师。请根据用户的出生信息生成分析。

政余体系关键概念：
- 格局：如"水日会合格·木星升殿格"等
- 五星：命主(Lord)、用星(Useful)、恩星(Benefic)、难星(Malefic)、财星(Wealth)
- 每颗星有宫位分配

请以JSON格式回复：
{
  "pattern": "格局名称",
  "patternDesc": "格局简述",
  "stars": [
    { "name": "命主", "palace": "宫位", "description": "详细分析(60字以上)" },
    { "name": "用星", "palace": "宫位", "description": "详细分析(60字以上)" },
    { "name": "财星", "palace": "宫位", "description": "详细分析(60字以上)" },
    { "name": "难星", "palace": "宫位", "description": "详细分析(60字以上)" },
    { "name": "恩星", "palace": "宫位", "description": "详细分析(60字以上)" }
  ],
  "lifeDirection": "整体人生方向分析(100字以上)",
  "advice": "人生建议"
}
只回复JSON，不要其他内容。`,
          },
          { role: "user", content: `出生日期：${birthDate}，出生时间：${timeLabel}` },
        ],
      });

      let result: any;
      try {
        const text = response.choices[0]?.message?.content?.trim() || "";
        result = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      } catch {
        result = {
          pattern: "水日会合格·木星升殿格",
          patternDesc: "智慧与机遇并存，善于在变化中把握方向",
          stars: [
            { name: "命主", palace: "命宫", description: "命主居于命宫，代表你有着强烈的自我意识和主导力量。你天生具有领袖气质，善于规划和执行。" },
            { name: "用星", palace: "官禄宫", description: "用星居于官禄宫，代表你的才能最适合在事业领域发挥。你善于处理复杂事务，适合管理类工作。" },
            { name: "财星", palace: "财帛宫", description: "财星居于财帛宫，正财运较好。你通过自身努力可以获得稳定的财富积累，中年后财运更佳。" },
            { name: "难星", palace: "迁移宫", description: "难星居于迁移宫，提示你在外出发展时需要多加注意。异地发展可能遇到一些阻碍，但也是成长的机会。" },
            { name: "恩星", palace: "福德宫", description: "恩星居于福德宫，为你带来精神层面的庇佑。你内心有良好的价值观指引，能够找到内心的平静。" },
          ],
          lifeDirection: "你的命格显示出一个智慧与行动力兼备的格局。命主之力赋予你清晰的方向感，而恩星的庇佑让你在挑战中不失本心。人生前半段以积累为主，后半段以成就为主。",
          advice: "发挥你的智慧优势，保持内心的平衡，在变化中寻找稳定的方向。",
        };
      }

      const birthData = JSON.stringify({ birthDate, birthTime });
      await storage.saveMetaphysicsResult(userId, "zhengyu", birthData, JSON.stringify(result));
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
