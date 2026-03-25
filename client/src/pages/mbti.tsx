import { PageContainer } from "@/components/PageContainer";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Compass,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Brain,
  Heart,
  Users,
  Briefcase,
  RotateCcw,
  Star,
  Shield,
  AlertTriangle,
  BookOpen,
  Lightbulb,
  Target,
  Zap,
} from "lucide-react";

// ─── 70-Question MBTI Bank from vsme/mbti ─────
const MBTI_QUESTIONS = [
  { no: 1, question: "在派对上，你通常会：", optionA: "与许多人交流，包括陌生人", scoreA: "E", optionB: "与几个你认识的人交流", scoreB: "I" },
  { no: 2, question: "你更倾向于：", optionA: "现实一些，而不是爱幻想", scoreA: "S", optionB: "爱幻想，而不是过于现实", scoreB: "N" },
  { no: 3, question: "以下哪种情况更糟：", optionA: "总是异想天开", scoreA: "S", optionB: "墨守成规", scoreB: "N" },
  { no: 4, question: "你更欣赏：", optionA: "原则", scoreA: "T", optionB: "情感", scoreB: "F" },
  { no: 5, question: "你更倾向于：", optionA: "有说服力的", scoreA: "T", optionB: "感人的", scoreB: "F" },
  { no: 6, question: "你更喜欢哪种工作方式：", optionA: "按截止日期完成任务", scoreA: "J", optionB: "随意什么时候都行", scoreB: "P" },
  { no: 7, question: "你做选择时更倾向于：", optionA: "比较谨慎", scoreA: "J", optionB: "有点冲动", scoreB: "P" },
  { no: 8, question: "在聚会上你通常：", optionA: "待到很晚，越来越有活力", scoreA: "E", optionB: "早早离开，感觉越来越疲倦", scoreB: "I" },
  { no: 9, question: "你更被哪种人吸引：", optionA: "理智的人", scoreA: "S", optionB: "富有想象力的人", scoreB: "N" },
  { no: 10, question: "你对以下哪个更感兴趣：", optionA: "现实存在的事物", scoreA: "S", optionB: "可能存在的事物", scoreB: "N" },
  { no: 11, question: "当评判他人时，你更容易被哪种因素影响：", optionA: "法律比具体情况更重要", scoreA: "T", optionB: "具体情况比法律更重要", scoreB: "F" },
  { no: 12, question: "在与他人交往时，你倾向于：", optionA: "比较客观", scoreA: "T", optionB: "更带有个人感情", scoreB: "F" },
  { no: 13, question: "你更倾向于：", optionA: "守时", scoreA: "J", optionB: "从容", scoreB: "P" },
  { no: 14, question: "什么情况更让你烦恼：", optionA: "事情未完成", scoreA: "J", optionB: "事情已完成", scoreB: "P" },
  { no: 15, question: "在你的社交圈中你是：", optionA: "了解他人动态", scoreA: "E", optionB: "对新闻消息不太了解", scoreB: "I" },
  { no: 16, question: "在做日常事务时你更倾向于：", optionA: "按常规方式做", scoreA: "S", optionB: "用你自己的方式做", scoreB: "N" },
  { no: 17, question: "作家应该：", optionA: "直接说自己想表达的意思", scoreA: "S", optionB: "多用比喻来表达想法", scoreB: "N" },
  { no: 18, question: "你更喜欢哪一种：", optionA: "坚持统一的原则或方法", scoreA: "T", optionB: "因情境改变想法或立场", scoreB: "F" },
  { no: 19, question: "你在做哪种判断时更舒服：", optionA: "逻辑判断", scoreA: "T", optionB: "价值判断", scoreB: "F" },
  { no: 20, question: "你更希望事情是：", optionA: "尘埃落定，已经决定的", scoreA: "J", optionB: "尚未确定，充满变数的", scoreB: "P" },
  { no: 21, question: "你会说你更：", optionA: "严肃和坚定", scoreA: "J", optionB: "随和", scoreB: "P" },
  { no: 22, question: "打电话时你：", optionA: "很少担心不知道说什么", scoreA: "E", optionB: "提前准备你要说的话", scoreB: "I" },
  { no: 23, question: "事实应该是：", optionA: "不言自明", scoreA: "S", optionB: "用来说明原理", scoreB: "N" },
  { no: 24, question: "你觉得有远见的人是：", optionA: "有点让人烦", scoreA: "S", optionB: "非常吸引人", scoreB: "N" },
  { no: 25, question: "你更常是：", optionA: "一个冷静的人", scoreA: "T", optionB: "一个热心的人", scoreB: "F" },
  { no: 26, question: "更糟糕的是：", optionA: "不公正", scoreA: "T", optionB: "无情", scoreB: "F" },
  { no: 27, question: "一般来说，应该让事情怎么发展：", optionA: "经过仔细选择和决定", scoreA: "J", optionB: "顺其自然，听天由命", scoreB: "P" },
  { no: 28, question: "你对以下哪种情况感觉更满意：", optionA: "已经购买了", scoreA: "J", optionB: "拥有购买的机会", scoreB: "P" },
  { no: 29, question: "在公司中你会：", optionA: "发起对话", scoreA: "E", optionB: "等待别人接近", scoreB: "I" },
  { no: 30, question: "常识是：", optionA: "很少被质疑", scoreA: "S", optionB: "经常被质疑", scoreB: "N" },
  { no: 31, question: "孩子们通常没有做到：", optionA: "让自己变得更有用", scoreA: "S", optionB: "充分发挥他们的想象力", scoreB: "N" },
  { no: 32, question: "在做决定时你感觉更舒服的是：", optionA: "标准", scoreA: "T", optionB: "感觉", scoreB: "F" },
  { no: 33, question: "你更倾向于：", optionA: "坚定而不是温柔", scoreA: "T", optionB: "温柔而不是坚定", scoreB: "F" },
  { no: 34, question: "更值得钦佩的是：", optionA: "有组织并且有条理的能力", scoreA: "J", optionB: "适应和权宜之计的能力", scoreB: "P" },
  { no: 35, question: "你更重视：", optionA: "无限", scoreA: "J", optionB: "思想开放", scoreB: "P" },
  { no: 36, question: "与他人的新的非日常互动：", optionA: "刺激你并使你精力充沛", scoreA: "E", optionB: "消耗你的精力", scoreB: "I" },
  { no: 37, question: "你更常是：", optionA: "一个实际的人", scoreA: "S", optionB: "一个异想天开的人", scoreB: "N" },
  { no: 38, question: "你更可能：", optionA: "看出别人的用处", scoreA: "S", optionB: "看出别人的视角", scoreB: "N" },
  { no: 39, question: "更令人满意的是：", optionA: "彻底讨论一个问题", scoreA: "T", optionB: "就一个问题达成协议", scoreB: "F" },
  { no: 40, question: "更多支配你的是：", optionA: "你的头脑", scoreA: "T", optionB: "你的心", scoreB: "F" },
  { no: 41, question: "你对哪种工作更感到舒适：", optionA: "合同工", scoreA: "J", optionB: "临时性工作", scoreB: "P" },
  { no: 42, question: "你倾向于寻找：", optionA: "有序的", scoreA: "J", optionB: "任何出现的", scoreB: "P" },
  { no: 43, question: "你更喜欢：", optionA: "许多朋友但联系短暂", scoreA: "E", optionB: "少数朋友但联系时间更长", scoreB: "I" },
  { no: 44, question: "你更依赖：", optionA: "事实", scoreA: "S", optionB: "原则", scoreB: "N" },
  { no: 45, question: "你更感兴趣的是：", optionA: "生产和分配", scoreA: "S", optionB: "设计和研究", scoreB: "N" },
  { no: 46, question: "更大的赞美是：", optionA: "\u201c那是一个非常逻辑的人\u201d", scoreA: "T", optionB: "\u201c那是一个非常感性的人\u201d", scoreB: "F" },
  { no: 47, question: "你更看重自己的是：", optionA: "坚定不移", scoreA: "T", optionB: "忠诚奉献", scoreB: "F" },
  { no: 48, question: "你更常喜欢哪种表达方式：", optionA: "确定的、不可更改的说法", scoreA: "J", optionB: "暂时的、还在讨论中的说法", scoreB: "P" },
  { no: 49, question: "你在什么时候感觉更舒服：", optionA: "做出决定之后", scoreA: "J", optionB: "做决定之前", scoreB: "P" },
  { no: 50, question: "你：", optionA: "与陌生人轻松并详细地交谈", scoreA: "E", optionB: "与陌生人没什么可说的", scoreB: "I" },
  { no: 51, question: "你更倾向于信任你的：", optionA: "经验", scoreA: "S", optionB: "直觉", scoreB: "N" },
  { no: 52, question: "你觉得自己：", optionA: "注重实际多于有创造力", scoreA: "S", optionB: "有创造力多于注重实际", scoreB: "N" },
  { no: 53, question: "以下哪个人更值得赞扬：", optionA: "理智清晰的人", scoreA: "T", optionB: "情感强烈的人", scoreB: "F" },
  { no: 54, question: "你更倾向于是：", optionA: "公正的", scoreA: "T", optionB: "有同情心的", scoreB: "F" },
  { no: 55, question: "通常更偏好：", optionA: "确保事情有条不紊", scoreA: "J", optionB: "随遇而安", scoreB: "P" },
  { no: 56, question: "在关系中大多数事情应该是：", optionA: "可重新协商的", scoreA: "J", optionB: "随机和依情境而变的", scoreB: "P" },
  { no: 57, question: "电话铃响时你是否：", optionA: "急忙去第一个接电话", scoreA: "E", optionB: "希望别人会接", scoreB: "I" },
  { no: 58, question: "你更欣赏自己：", optionA: "很强的现实感", scoreA: "S", optionB: "丰富的想象力", scoreB: "N" },
  { no: 59, question: "你更倾向于关注：", optionA: "基础原理", scoreA: "S", optionB: "深层含义", scoreB: "N" },
  { no: 60, question: "你觉得哪种问题更大：", optionA: "太过感情用事", scoreA: "T", optionB: "太过理性", scoreB: "F" },
  { no: 61, question: "你认为自己基本上是：", optionA: "头脑硬", scoreA: "T", optionB: "心肠软", scoreB: "F" },
  { no: 62, question: "哪种情境更吸引你：", optionA: "有结构和计划的", scoreA: "J", optionB: "无结构和未计划的", scoreB: "P" },
  { no: 63, question: "你是一个更倾向于：", optionA: "有规律的而不是异想天开的", scoreA: "J", optionB: "异想天开的而不是有规律的", scoreB: "P" },
  { no: 64, question: "你更倾向于是：", optionA: "容易接近", scoreA: "E", optionB: "有些保留", scoreB: "I" },
  { no: 65, question: "在写作中，你更喜欢哪种表达方式：", optionA: "更直接明了的", scoreA: "S", optionB: "更富有比喻性的", scoreB: "N" },
  { no: 66, question: "对你来说更难的是：", optionA: "理解他人", scoreA: "S", optionB: "利用他人", scoreB: "N" },
  { no: 67, question: "你更希望自己拥有：", optionA: "清晰的理性", scoreA: "T", optionB: "强大的同情心", scoreB: "F" },
  { no: 68, question: "哪种问题更大：", optionA: "没有分辨力", scoreA: "T", optionB: "过于挑剔", scoreB: "F" },
  { no: 69, question: "你更喜欢：", optionA: "有计划的活动", scoreA: "J", optionB: "无计划的活动", scoreB: "P" },
  { no: 70, question: "你倾向于更多地是：", optionA: "深思熟虑的", scoreA: "J", optionB: "随性所至的", scoreB: "P" },
];

// MBTI Animal personalities (16 types)
const MBTI_ANIMALS: Record<string, { animal: string; emoji: string; title: string; traits: string[] }> = {
  "INTJ": { animal: "独角兽", emoji: "🦄", title: "战略独角兽", traits: ["独立思考", "远见卓识", "追求完美"] },
  "INTP": { animal: "猫头鹰", emoji: "🦉", title: "智慧猫头鹰", traits: ["好奇心强", "逻辑清晰", "热爱探索"] },
  "ENTJ": { animal: "雄狮", emoji: "🦁", title: "领袖雄狮", traits: ["果断有力", "天生领袖", "目标导向"] },
  "ENTP": { animal: "海豚", emoji: "🐬", title: "创意海豚", traits: ["灵活多变", "善于辩论", "创新达人"] },
  "INFJ": { animal: "长颈鹿", emoji: "🦒", title: "利他长颈鹿", traits: ["深度共情", "理想主义", "温柔坚定"] },
  "INFP": { animal: "小鹿", emoji: "🦌", title: "梦想小鹿", traits: ["内心丰富", "富有创意", "忠于自我"] },
  "ENFJ": { animal: "金毛犬", emoji: "🐕", title: "暖心金毛", traits: ["热情关怀", "善于激励", "乐于奉献"] },
  "ENFP": { animal: "蝴蝶", emoji: "🦋", title: "自由蝴蝶", traits: ["热情洋溢", "充满创意", "感染力强"] },
  "ISTJ": { animal: "蜜蜂", emoji: "🐝", title: "勤劳蜜蜂", traits: ["可靠踏实", "严谨细致", "恪守承诺"] },
  "ISFJ": { animal: "考拉", emoji: "🐨", title: "守护考拉", traits: ["温暖体贴", "默默奉献", "忠诚可靠"] },
  "ESTJ": { animal: "雄鹰", emoji: "🦅", title: "执行雄鹰", traits: ["组织能力强", "高效务实", "公正果断"] },
  "ESFJ": { animal: "天鹅", emoji: "🦢", title: "优雅天鹅", traits: ["善解人意", "乐于助人", "注重和谐"] },
  "ISTP": { animal: "猎豹", emoji: "🐆", title: "敏捷猎豹", traits: ["冷静分析", "动手能力强", "灵活应变"] },
  "ISFP": { animal: "兔子", emoji: "🐰", title: "艺术兔子", traits: ["感性细腻", "审美独到", "自在随性"] },
  "ESTP": { animal: "猎鹰", emoji: "🦅", title: "冒险猎鹰", traits: ["行动力强", "善于观察", "享受当下"] },
  "ESFP": { animal: "孔雀", emoji: "🦚", title: "魅力孔雀", traits: ["活力四射", "表现力强", "乐观开朗"] },
};

interface MBTIResult {
  type: string;
  animal: string;
  animalEmoji: string;
  title: string;
  traits: string[];
  epithet: string;
  dimensions: {
    E: number; I: number;
    S: number; N: number;
    T: number; F: number;
    J: number; P: number;
  };
  description: string;
  generalTraits: string[];
  relationshipStrengths: string[];
  relationshipWeaknesses: string[];
  strengths: string[];
  gifts: string[];
  tenRulesToLive: string[];
  careerAdvice: string;
  relationshipAdvice: string;
  socialAdvice: string;
}

// Questions per page
const QUESTIONS_PER_PAGE = 7;
const TOTAL_PAGES = Math.ceil(MBTI_QUESTIONS.length / QUESTIONS_PER_PAGE);

export default function MBTIPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [phase, setPhase] = useState<"intro" | "test" | "loading" | "result">("intro");
  const [currentPage, setCurrentPage] = useState(0);
  // answers: keyed by question index, value is "A" or "B"
  const [answers, setAnswers] = useState<Record<number, "A" | "B">>({});
  const [result, setResult] = useState<MBTIResult | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const submitMutation = useMutation({
    mutationFn: async (ans: Record<number, "A" | "B">) => {
      // Convert to array of "A"|"B" for the 70 questions
      const ansArray = MBTI_QUESTIONS.map((_, i) => ans[i] || "A");
      const res = await apiRequest("POST", "/api/mbti/submit", { answers: ansArray });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      setPhase("result");
    },
    onError: (err: Error) => {
      setPhase("test");
      toast({ title: "提交失败", description: err.message, variant: "destructive" });
    },
  });

  const pageQuestions = MBTI_QUESTIONS.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  const answeredOnPage = pageQuestions.filter((_, i) => answers[currentPage * QUESTIONS_PER_PAGE + i] !== undefined).length;
  const allPageAnswered = answeredOnPage === pageQuestions.length;
  const totalAnswered = Object.keys(answers).length;
  const progress = (totalAnswered / MBTI_QUESTIONS.length) * 100;

  const handleAnswer = (qIndex: number, choice: "A" | "B") => {
    setAnswers(prev => ({ ...prev, [qIndex]: choice }));
  };

  const nextPage = () => {
    if (currentPage < TOTAL_PAGES - 1) {
      setCurrentPage(currentPage + 1);
      topRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (totalAnswered === MBTI_QUESTIONS.length) {
      setPhase("loading");
      submitMutation.mutate(answers);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      topRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const restart = () => {
    setPhase("intro");
    setCurrentPage(0);
    setAnswers({});
    setResult(null);
  };

  // ─── Result View ─────────────────────
  if (phase === "result" && result) {
    const dimPairs = [
      { left: "E", right: "I", leftLabel: "外向", rightLabel: "内向", leftVal: result.dimensions.E, rightVal: result.dimensions.I },
      { left: "S", right: "N", leftLabel: "实感", rightLabel: "直觉", leftVal: result.dimensions.S, rightVal: result.dimensions.N },
      { left: "T", right: "F", leftLabel: "思考", rightLabel: "情感", leftVal: result.dimensions.T, rightVal: result.dimensions.F },
      { left: "J", right: "P", leftLabel: "判断", rightLabel: "感知", leftVal: result.dimensions.J, rightVal: result.dimensions.P },
    ];

    return (
      <div className="flex-1 overflow-y-auto" data-testid="mbti-result-page">
        <PageContainer className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">MBTI 测试结果</h1>
            <Button variant="outline" size="sm" onClick={restart} data-testid="button-mbti-restart">
              <RotateCcw className="w-4 h-4 mr-1" />
              重新测试
            </Button>
          </div>

          {/* Hero Card */}
          <Card className="bg-gradient-to-br from-primary/10 to-amber-500/10 border-primary/20" data-testid="card-mbti-hero">
            <CardContent className="flex flex-col items-center py-8">
              <span className="text-6xl mb-3">{result.animalEmoji}</span>
              <Badge className="mb-2 bg-primary text-primary-foreground px-4 py-1 text-lg">
                {result.type}
              </Badge>
              <h2 className="text-lg font-bold">{result.title}</h2>
              <p className="text-sm text-muted-foreground">{result.epithet} · {result.animal}人格</p>
              <div className="flex gap-2 mt-3 flex-wrap justify-center">
                {result.traits.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dimension Chart */}
          <Card data-testid="card-mbti-dimensions">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                维度分析
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dimPairs.map(({ left, right, leftLabel, rightLabel, leftVal, rightVal }) => {
                const total = leftVal + rightVal;
                const leftPct = total > 0 ? Math.round((leftVal / total) * 100) : 50;
                const rightPct = 100 - leftPct;
                return (
                  <div key={left + right} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={leftPct >= rightPct ? "font-bold text-primary" : "text-muted-foreground"}>
                        {left} {leftLabel} {leftPct}%
                      </span>
                      <span className={rightPct > leftPct ? "font-bold text-primary" : "text-muted-foreground"}>
                        {rightPct}% {rightLabel} {right}
                      </span>
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${leftPct}%` }}
                      />
                      <div
                        className="h-full bg-amber-500/60 transition-all duration-500"
                        style={{ width: `${rightPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Tabbed detailed results */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="text-xs">概述</TabsTrigger>
              <TabsTrigger value="traits" className="text-xs">特质</TabsTrigger>
              <TabsTrigger value="relationship" className="text-xs">关系</TabsTrigger>
              <TabsTrigger value="growth" className="text-xs">成长</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* AI Description */}
              <Card data-testid="card-mbti-description">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    AI 人格解读
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-foreground/80">{result.description}</p>
                </CardContent>
              </Card>

              {/* Career & Social Advice */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium mb-1">职业发展</p>
                      <p className="text-sm text-muted-foreground">{result.careerAdvice}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium mb-1">人际交往</p>
                      <p className="text-sm text-muted-foreground">{result.socialAdvice}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="traits" className="space-y-4 mt-4">
              {/* General Traits */}
              {result.generalTraits && result.generalTraits.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      核心特质
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.generalTraits.map((t, i) => (
                        <Badge key={i} variant="outline" className="text-xs py-1">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Strengths */}
              {result.strengths && result.strengths.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-500" />
                      核心优势
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Gifts */}
              {result.gifts && result.gifts.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      天赋潜能
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.gifts.map((g, i) => (
                        <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5 flex-shrink-0">★</span>
                          {g}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="relationship" className="space-y-4 mt-4">
              {/* Relationship Strengths */}
              {result.relationshipStrengths && result.relationshipStrengths.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-500" />
                      关系优势
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.relationshipStrengths.map((s, i) => (
                        <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                          <span className="text-pink-500 mt-0.5 flex-shrink-0">♥</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Relationship Weaknesses */}
              {result.relationshipWeaknesses && result.relationshipWeaknesses.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      需要注意
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.relationshipWeaknesses.map((w, i) => (
                        <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                          <span className="text-orange-500 mt-0.5 flex-shrink-0">!</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* AI Relationship Advice */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Heart className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium mb-1">AI 亲密关系建议</p>
                      <p className="text-sm text-muted-foreground">{result.relationshipAdvice}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="growth" className="space-y-4 mt-4">
              {/* Ten Rules to Live */}
              {result.tenRulesToLive && result.tenRulesToLive.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      成长法则
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3">
                      {result.tenRulesToLive.map((rule, i) => (
                        <li key={i} className="text-sm text-foreground/80 flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{rule}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </PageContainer>
      </div>
    );
  }

  // ─── Intro View ─────────────────────
  if (phase === "intro") {
    return (
      <div className="flex-1 overflow-y-auto" data-testid="mbti-page">
        <PageContainer className="space-y-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-500" />
              MBTI 人格测试
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              完整版70题，精准定位你的人格类型
            </p>
          </div>

          <Card className="bg-gradient-to-br from-primary/5 to-amber-500/5">
            <CardContent className="flex flex-col items-center py-10 space-y-4">
              <div className="text-5xl">🧠</div>
              <h2 className="text-lg font-bold">准备好了吗？</h2>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                回答70道选择题，AI将基于标准MBTI理论精确分析你的人格类型，
                并提供详尽的特质解读、关系分析和成长建议。
              </p>
              <div className="flex gap-6 text-center text-xs text-muted-foreground">
                <div>
                  <p className="font-bold text-lg text-foreground">70</p>
                  <p>道题目</p>
                </div>
                <div>
                  <p className="font-bold text-lg text-foreground">10</p>
                  <p>分钟</p>
                </div>
                <div>
                  <p className="font-bold text-lg text-foreground">16</p>
                  <p>种人格</p>
                </div>
              </div>
              <Button
                size="lg"
                className="mt-4"
                onClick={() => { setPhase("test"); setCurrentPage(0); }}
                data-testid="button-start-mbti"
              >
                开始测试
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Preview grid of animals */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">16种动物人格</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(MBTI_ANIMALS).map(([type, info]) => (
                  <div key={type} className="text-center p-2 rounded-lg bg-muted/50">
                    <span className="text-xl">{info.emoji}</span>
                    <p className="text-[10px] font-medium mt-0.5">{type}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </div>
    );
  }

  // ─── Loading View ─────────────────────
  if (phase === "loading" || submitMutation.isPending) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Sparkles className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">AI 正在深度分析你的人格...</p>
          <p className="text-xs text-muted-foreground">基于70道题的完整评估</p>
        </div>
      </div>
    );
  }

  // ─── Test View (Paginated) ─────────────────────
  return (
    <div className="flex-1 overflow-y-auto" data-testid="mbti-question-page">
      <div className="max-w-xl mx-auto p-6 space-y-5" ref={topRef}>
        {/* Progress Header */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>第 {currentPage + 1} / {TOTAL_PAGES} 页</span>
            <span>已答 {totalAnswered} / {MBTI_QUESTIONS.length} 题 ({Math.round(progress)}%)</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Questions on this page */}
        <div className="space-y-4">
          {pageQuestions.map((q, i) => {
            const qIndex = currentPage * QUESTIONS_PER_PAGE + i;
            const selected = answers[qIndex];
            return (
              <Card
                key={q.no}
                className={selected ? "border-primary/30 bg-primary/[0.02]" : ""}
                data-testid={`card-mbti-q-${qIndex}`}
              >
                <CardContent className="pt-5 pb-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {q.no}
                    </span>
                    <h3 className="text-sm font-medium leading-relaxed">{q.question}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pl-8">
                    <Button
                      variant={selected === "A" ? "default" : "outline"}
                      className={`w-full h-auto py-3 text-left justify-start text-sm font-normal whitespace-normal ${
                        selected === "A" ? "" : "hover:border-primary/50"
                      }`}
                      onClick={() => handleAnswer(qIndex, "A")}
                      data-testid={`button-q${qIndex}-a`}
                    >
                      <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mr-2 flex-shrink-0 ${
                        selected === "A" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                      }`}>A</span>
                      {q.optionA}
                    </Button>
                    <Button
                      variant={selected === "B" ? "default" : "outline"}
                      className={`w-full h-auto py-3 text-left justify-start text-sm font-normal whitespace-normal ${
                        selected === "B" ? "" : "hover:border-primary/50"
                      }`}
                      onClick={() => handleAnswer(qIndex, "B")}
                      data-testid={`button-q${qIndex}-b`}
                    >
                      <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mr-2 flex-shrink-0 ${
                        selected === "B" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-amber-500/10 text-amber-600"
                      }`}>B</span>
                      {q.optionB}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevPage}
            disabled={currentPage === 0}
            data-testid="button-mbti-prev"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            上一页
          </Button>
          <span className="text-xs text-muted-foreground">
            {answeredOnPage}/{pageQuestions.length} 已答
          </span>
          {currentPage < TOTAL_PAGES - 1 ? (
            <Button
              size="sm"
              onClick={nextPage}
              disabled={!allPageAnswered}
              data-testid="button-mbti-next"
            >
              下一页
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={nextPage}
              disabled={totalAnswered < MBTI_QUESTIONS.length}
              data-testid="button-mbti-submit"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              提交分析
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
