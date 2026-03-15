import { storage } from "./storage";
import { randomUUID } from "crypto";

// ─── SDS (抑郁自评量表) ─────────────────────────────────────
const sdsQuestions = [
  "我觉得闷闷不乐，情绪低沉",
  "我觉得一天之中早晨最好",
  "我一阵阵哭出来或觉得想哭",
  "我晚上睡眠不好",
  "我吃得跟平常一样多",
  "我与异性亲密接触时和以往一样感到愉快",
  "我发觉我的体重在下降",
  "我有便秘的苦恼",
  "我心跳比平常快",
  "我无缘无故地感到疲乏",
  "我的头脑跟平常一样清楚",
  "我觉得经常做的事情并没有困难",
  "我觉得不安而平静不下来",
  "我对将来抱有希望",
  "我比平常容易生气激动",
  "我觉得做出决定是容易的",
  "我觉得自己是个有用的人，有人需要我",
  "我的生活过得很有意思",
  "我认为如果我死了别人会生活得更好",
  "平常感兴趣的事我仍然照样感兴趣",
];

const sdsScoring = {
  type: "sds",
  reverseItems: [1, 4, 5, 6, 10, 11, 13, 15, 16, 17, 19],
  options: ["没有或很少时间", "小部分时间", "相当多时间", "绝大部分或全部时间"],
  optionScores: [1, 2, 3, 4],
  thresholds: [
    { max: 52, summary: "正常范围", detail: "你的情绪状态在正常范围内。继续保持积极健康的生活方式，关注自己的情绪变化。" },
    { max: 62, summary: "轻度抑郁", detail: "你可能存在轻度抑郁倾向。建议关注自己的情绪变化，增加运动和社交活动，保持规律作息。如果持续感到不适，建议咨询专业人士。" },
    { max: 72, summary: "中度抑郁", detail: "你可能存在中度抑郁。建议尽快寻求专业心理咨询师或医生的帮助。同时注意保持基本的生活规律，不要独处太久。" },
    { max: 100, summary: "重度抑郁", detail: "你可能存在较严重的抑郁倾向。请务必尽快就医，寻求专业的心理治疗。如有紧急情况，请拨打心理援助热线：400-161-9995。" },
  ],
};

// ─── SAS (焦虑自评量表) ─────────────────────────────────────
const sasQuestions = [
  "我觉得比平常容易紧张和着急",
  "我无缘无故地感到害怕",
  "我容易心里烦乱或觉得惊恐",
  "我觉得我可能将要发疯",
  "我觉得一切都很好，也不会发生什么不幸",
  "我手脚发抖打颤",
  "我因为头痛、颈痛和背痛而苦恼",
  "我感觉容易衰弱和疲乏",
  "我觉得心平气和，并且容易安静坐着",
  "我觉得心跳得很快",
  "我因为一阵阵头晕而苦恼",
  "我有晕倒发作或觉得要晕倒似的",
  "我呼气吸气都感到很容易",
  "我的手脚麻木和刺痛",
  "我因为胃痛和消化不良而苦恼",
  "我常常要小便",
  "我的手常常是干燥温暖的",
  "我脸红发热",
  "我容易入睡并且一夜睡得很好",
  "我做噩梦",
];

const sasScoring = {
  type: "sas",
  reverseItems: [4, 8, 12, 16, 18],
  options: ["没有或很少时间", "小部分时间", "相当多时间", "绝大部分或全部时间"],
  optionScores: [1, 2, 3, 4],
  thresholds: [
    { max: 49, summary: "正常范围", detail: "你的焦虑水平在正常范围内。保持当前良好的心理状态，注意劳逸结合。" },
    { max: 59, summary: "轻度焦虑", detail: "你可能存在轻度焦虑。建议尝试放松训练，如深呼吸、冥想或瑜伽。保持规律运动，减少咖啡因摄入。" },
    { max: 69, summary: "中度焦虑", detail: "你可能存在中度焦虑。建议寻求专业心理咨询，学习认知行为疗法技巧来管理焦虑。" },
    { max: 100, summary: "重度焦虑", detail: "你可能存在严重焦虑。请尽快寻求专业医疗帮助。如果感到无法承受，请拨打心理援助热线：400-161-9995。" },
  ],
};

// ─── MBTI (简版 20 题) ──────────────────────────────────────
const mbtiQuestions = [
  { q: "在社交聚会中，你通常", a: "与很多人交流，包括陌生人", b: "只与少数你认识的人交流" },
  { q: "你更倾向于", a: "广泛涉猎各种事物", b: "深入研究某一领域" },
  { q: "以下哪种情况让你更舒适", a: "在一群人中", b: "独处或与一两个亲密朋友在一起" },
  { q: "你更喜欢", a: "在团队中工作", b: "独立工作" },
  { q: "做决定时，你更依赖", a: "逻辑和客观分析", b: "个人价值观和情感" },
  { q: "你更看重", a: "公正和真相", b: "和谐与体谅" },
  { q: "处理冲突时，你倾向于", a: "直接面对，就事论事", b: "考虑他人感受，寻求妥协" },
  { q: "你评价他人时更看重", a: "他们的能力和成就", b: "他们的品格和为人" },
  { q: "你更关注", a: "事实和细节", b: "可能性和大局" },
  { q: "你更喜欢", a: "具体、实际的信息", b: "抽象、理论性的概念" },
  { q: "你更相信", a: "自己的亲身经验", b: "自己的直觉和灵感" },
  { q: "你对事情的描述更倾向于", a: "按照实际发生的情况", b: "用比喻和类比" },
  { q: "你更倾向于", a: "提前计划并遵循安排", b: "灵活应变，随机行动" },
  { q: "关于截止日期", a: "你通常会提前完成", b: "你经常在最后一刻才完成" },
  { q: "你的工作空间通常", a: "整洁有序", b: "有些杂乱但你知道东西在哪" },
  { q: "做重要决定前，你通常", a: "收集足够信息后果断决定", b: "保持开放态度，等待更多信息" },
  { q: "周末你更倾向于", a: "参加社交活动", b: "待在家里放松" },
  { q: "开会时你更倾向于", a: "积极发言和讨论", b: "先思考再发言" },
  { q: "处理问题时你更看重", a: "效率和结果", b: "过程和人的感受" },
  { q: "你更享受", a: "确定的、有计划的生活", b: "自由灵活的生活方式" },
];

const mbtiScoring = {
  type: "mbti",
  dimensions: [
    { name: "E/I", questions: [0, 1, 2, 3, 16, 17], aType: "E", bType: "I" },
    { name: "S/N", questions: [8, 9, 10, 11], aType: "S", bType: "N" },
    { name: "T/F", questions: [4, 5, 6, 7, 18], aType: "T", bType: "F" },
    { name: "J/P", questions: [12, 13, 14, 15, 19], aType: "J", bType: "P" },
  ],
  options: ["选项 A", "选项 B"],
  optionScores: [0, 1],
  typeDescriptions: {
    INTJ: { name: "建筑师", desc: "富有想象力和战略性的思想者，一切皆在计划之中。独立、果断、有远见。" },
    INTP: { name: "逻辑学家", desc: "具有创造力的发明家，对知识有不可抑制的渴望。善于分析、客观、灵活。" },
    ENTJ: { name: "指挥官", desc: "大胆、富有想象力且意志强大的领导者。果断、高效、追求卓越。" },
    ENTP: { name: "辩论家", desc: "聪明好奇的思想者，不会放过任何智力挑战。机智、灵活、善于创新。" },
    INFJ: { name: "提倡者", desc: "安静而神秘，同时鼓舞人心且不知疲倦的理想主义者。有远见、同理心强。" },
    INFP: { name: "调停者", desc: "诗意、善良的利他主义者，总是渴望为事业找到善的一面。理想主义、富有创造力。" },
    ENFJ: { name: "主人公", desc: "富有魅力且鼓舞人心的领导者，能够催眠听众。热情、有同理心、有组织力。" },
    ENFP: { name: "竞选者", desc: "热情、有创造力、乐观的精神自由者，总能找到理由微笑。充满活力和想象力。" },
    ISTJ: { name: "物流师", desc: "实际且注重事实的个人，可靠性不容怀疑。负责、严谨、有条理。" },
    ISFJ: { name: "守卫者", desc: "非常敬业和温暖的保护者，随时准备保护他们所爱的人。忠诚、体贴、有耐心。" },
    ESTJ: { name: "总经理", desc: "出色的管理者，在管理事物和人员方面无与伦比。务实、高效、有组织力。" },
    ESFJ: { name: "执政官", desc: "非常关心他人，善于交际，受欢迎的人。热心、合作、有责任感。" },
    ISTP: { name: "鉴赏家", desc: "大胆而实际的实验者，擅长使用各种工具。灵活、善于观察、独立。" },
    ISFP: { name: "探险家", desc: "灵活和迷人的艺术家，随时准备探索和体验新事物。温和、敏感、有同理心。" },
    ESTP: { name: "企业家", desc: "聪明、精力充沛且善于感知的人，真正享受生活在边缘。大胆、务实、直接。" },
    ESFP: { name: "表演者", desc: "自发的、精力充沛的和热情的表演者 - 生活在他们周围永远不会无聊。活泼、友善、热情。" },
  },
};

// ─── PHQ-9 (患者健康问卷 - 9 项) ─────────────────────────────
const phq9Questions = [
  "做事时提不起劲或没有兴趣",
  "感到心情低落、沮丧或绝望",
  "入睡困难、睡不安稳或睡眠过多",
  "感觉疲倦或没有活力",
  "食欲不振或吃太多",
  "觉得自己很糟糕——或觉得自己很失败，或让自己或家人失望",
  "对事物专注有困难，例如读报纸或看电视时",
  "动作或说话速度缓慢到别人已经察觉？或正好相反——Loss控制不住地，坐立不安，走来走去",
  "有不如死掉或用某种方式伤害自己的念头",
];

const phq9Scoring = {
  type: "phq9",
  reverseItems: [],
  options: ["完全不会", "好几天", "一半以上的天数", "几乎每天"],
  optionScores: [0, 1, 2, 3],
  thresholds: [
    { max: 4, summary: "没有抑郁", detail: "你目前没有明显的抑郁症状。继续保持良好的心理健康状态。" },
    { max: 9, summary: "轻微抑郁", detail: "你可能有轻微的抑郁症状。建议保持健康的生活方式，加强体育锻炼和社交活动。" },
    { max: 14, summary: "中度抑郁", detail: "你可能有中度抑郁。建议寻求心理咨询，并考虑与医生讨论治疗方案。" },
    { max: 19, summary: "中重度抑郁", detail: "你可能有中重度抑郁。强烈建议尽快寻求专业帮助，可以考虑药物治疗和心理治疗的结合。" },
    { max: 27, summary: "重度抑郁", detail: "你可能有严重的抑郁症状。请立即寻求专业医疗帮助。如有紧急情况，请拨打心理援助热线：400-161-9995。" },
  ],
};

export async function seedAssessments() {
  const existing = await storage.getAllAssessments();
  if (existing.length > 0) return;

  // SDS
  await storage.createAssessment({
    id: randomUUID(),
    slug: "sds",
    name: "抑郁自评量表 (SDS)",
    description: "SDS 是国际通用的抑郁症状自评工具，由 Zung 于 1965 年编制。通过 20 个问题评估你近一周的情绪状态。",
    category: "professional",
    icon: "📋",
    questionCount: 20,
    estimatedMinutes: 5,
    questions: JSON.stringify(sdsQuestions.map((q, i) => ({
      id: i,
      text: q,
      options: sdsScoring.options,
    }))),
    scoringRules: JSON.stringify(sdsScoring),
    isActive: true,
  });

  // SAS
  await storage.createAssessment({
    id: randomUUID(),
    slug: "sas",
    name: "焦虑自评量表 (SAS)",
    description: "SAS 是广泛使用的焦虑症状自评工具，由 Zung 于 1971 年编制。通过 20 个问题评估你近一周的焦虑程度。",
    category: "professional",
    icon: "📊",
    questionCount: 20,
    estimatedMinutes: 5,
    questions: JSON.stringify(sasQuestions.map((q, i) => ({
      id: i,
      text: q,
      options: sasScoring.options,
    }))),
    scoringRules: JSON.stringify(sasScoring),
    isActive: true,
  });

  // PHQ-9
  await storage.createAssessment({
    id: randomUUID(),
    slug: "phq9",
    name: "患者健康问卷 (PHQ-9)",
    description: "PHQ-9 是一种简短的抑郁症筛查工具，广泛应用于初级保健。仅需 9 题，快速评估抑郁严重程度。",
    category: "professional",
    icon: "🩺",
    questionCount: 9,
    estimatedMinutes: 3,
    questions: JSON.stringify(phq9Questions.map((q, i) => ({
      id: i,
      text: q,
      options: phq9Scoring.options,
    }))),
    scoringRules: JSON.stringify(phq9Scoring),
    isActive: true,
  });

  // MBTI
  await storage.createAssessment({
    id: randomUUID(),
    slug: "mbti",
    name: "MBTI 性格测试 (简版)",
    description: "基于 Myers-Briggs 类型指标的简版性格测试，通过 20 个问题帮助你了解自己的性格类型。",
    category: "personality",
    icon: "🧩",
    questionCount: 20,
    estimatedMinutes: 5,
    questions: JSON.stringify(mbtiQuestions.map((q, i) => ({
      id: i,
      text: q.q,
      options: [q.a, q.b],
    }))),
    scoringRules: JSON.stringify(mbtiScoring),
    isActive: true,
  });

  console.log("Seeded 4 assessments: SDS, SAS, PHQ-9, MBTI");
}
