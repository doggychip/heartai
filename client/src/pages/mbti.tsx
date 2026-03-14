import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";

// ─── MBTI Question Bank (16 questions, 4 per dimension) ─────
const MBTI_QUESTIONS = [
  // E/I: Extraversion vs Introversion
  { dimension: "EI", text: "参加社交活动后，你通常感到...", optionA: "精力充沛，想继续交流", optionB: "需要独处来恢复能量" },
  { dimension: "EI", text: "你更喜欢哪种工作方式？", optionA: "团队协作，头脑风暴", optionB: "独立思考，安静工作" },
  { dimension: "EI", text: "认识新朋友时，你通常...", optionA: "主动搭话，享受认识新人", optionB: "等对方先开口，慢热型" },
  { dimension: "EI", text: "周末理想的度过方式是...", optionA: "和朋友聚会或外出活动", optionB: "在家看书、追剧或独处" },
  // S/N: Sensing vs Intuition
  { dimension: "SN", text: "解决问题时，你更倾向于...", optionA: "关注具体的事实和细节", optionB: "关注整体的模式和可能性" },
  { dimension: "SN", text: "你更相信...", optionA: "亲身经历和实际观察", optionB: "直觉和第六感" },
  { dimension: "SN", text: "学习新东西时，你偏好...", optionA: "按步骤一步步来", optionB: "先理解大框架再深入" },
  { dimension: "SN", text: "描述一件事时，你更注重...", optionA: "具体的细节和发生了什么", optionB: "背后的含义和象征" },
  // T/F: Thinking vs Feeling
  { dimension: "TF", text: "做重要决定时，你更依赖...", optionA: "逻辑分析和客观事实", optionB: "个人价值观和他人感受" },
  { dimension: "TF", text: "朋友向你倾诉烦恼，你会...", optionA: "帮他分析问题，提供解决方案", optionB: "先倾听共情，给予情感支持" },
  { dimension: "TF", text: "面对冲突时，你更看重...", optionA: "公平合理的解决方案", optionB: "维护和谐的人际关系" },
  { dimension: "TF", text: "评价他人时，你更关注...", optionA: "能力和效率", optionB: "品格和动机" },
  // J/P: Judging vs Perceiving
  { dimension: "JP", text: "对于日程安排，你更喜欢...", optionA: "提前计划，按时完成", optionB: "灵活随性，见机行事" },
  { dimension: "JP", text: "旅行时你偏好...", optionA: "详细规划好每天的行程", optionB: "大致方向即可，随走随看" },
  { dimension: "JP", text: "关于工作截止日期...", optionA: "通常提前完成", optionB: "倾向于最后冲刺" },
  { dimension: "JP", text: "你更欣赏哪种生活方式？", optionA: "有序、有规律、可预测", optionB: "自由、多变、充满惊喜" },
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
  dimensions: {
    E: number; I: number;
    S: number; N: number;
    T: number; F: number;
    J: number; P: number;
  };
  description: string;
  careerAdvice: string;
  relationshipAdvice: string;
  socialAdvice: string;
}

export default function MBTIPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentQ, setCurrentQ] = useState(-1); // -1 = intro screen
  const [answers, setAnswers] = useState<number[]>([]); // 0=A, 1=B for each question
  const [result, setResult] = useState<MBTIResult | null>(null);

  const submitMutation = useMutation({
    mutationFn: async (ans: number[]) => {
      const res = await apiRequest("POST", "/api/mbti/submit", { answers: ans });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
    onError: (err: Error) => toast({ title: "提交失败", description: err.message, variant: "destructive" }),
  });

  const handleAnswer = (choice: number) => {
    const newAnswers = [...answers, choice];
    setAnswers(newAnswers);
    if (currentQ < MBTI_QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      // Submit
      submitMutation.mutate(newAnswers);
    }
  };

  const handleBack = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
      setAnswers(answers.slice(0, -1));
    }
  };

  const restart = () => {
    setCurrentQ(-1);
    setAnswers([]);
    setResult(null);
  };

  const progress = currentQ >= 0 ? ((currentQ + 1) / MBTI_QUESTIONS.length) * 100 : 0;

  // ─── Result View ─────────────────────
  if (result) {
    const dimPairs = [
      { left: "E", right: "I", leftLabel: "外向", rightLabel: "内向", leftVal: result.dimensions.E, rightVal: result.dimensions.I },
      { left: "S", right: "N", leftLabel: "实感", rightLabel: "直觉", leftVal: result.dimensions.S, rightVal: result.dimensions.N },
      { left: "T", right: "F", leftLabel: "思考", rightLabel: "情感", leftVal: result.dimensions.T, rightVal: result.dimensions.F },
      { left: "J", right: "P", leftLabel: "判断", rightLabel: "感知", leftVal: result.dimensions.J, rightVal: result.dimensions.P },
    ];

    return (
      <div className="flex-1 overflow-y-auto" data-testid="mbti-result-page">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
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
              <p className="text-sm text-muted-foreground">{result.animal}人格</p>
              <div className="flex gap-2 mt-3">
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
                const leftPct = Math.round((leftVal / total) * 100);
                const rightPct = 100 - leftPct;
                const dominant = leftPct >= rightPct ? left : right;
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

          {/* Description */}
          <Card data-testid="card-mbti-description">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">人格描述</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/80">{result.description}</p>
            </CardContent>
          </Card>

          {/* Advice Cards */}
          <div className="space-y-3">
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
                  <Heart className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium mb-1">亲密关系</p>
                    <p className="text-sm text-muted-foreground">{result.relationshipAdvice}</p>
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
          </div>
        </div>
      </div>
    );
  }

  // ─── Intro View ─────────────────────
  if (currentQ < 0) {
    return (
      <div className="flex-1 overflow-y-auto" data-testid="mbti-page">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-500" />
              MBTI 人格测试
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              16道题，发现你的人格动物
            </p>
          </div>

          <Card className="bg-gradient-to-br from-primary/5 to-amber-500/5">
            <CardContent className="flex flex-col items-center py-10 space-y-4">
              <div className="text-5xl">🧠</div>
              <h2 className="text-lg font-bold">准备好了吗？</h2>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                回答16道简单的选择题，AI将分析你的MBTI人格类型，
                并为你匹配一个可爱的动物人格。
              </p>
              <div className="flex gap-4 text-center text-xs text-muted-foreground">
                <div>
                  <p className="font-bold text-lg text-foreground">16</p>
                  <p>道题目</p>
                </div>
                <div>
                  <p className="font-bold text-lg text-foreground">3</p>
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
                onClick={() => setCurrentQ(0)}
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
        </div>
      </div>
    );
  }

  // ─── Question View ─────────────────────
  if (submitMutation.isPending) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Sparkles className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">AI 正在分析你的人格...</p>
        </div>
      </div>
    );
  }

  const q = MBTI_QUESTIONS[currentQ];
  return (
    <div className="flex-1 overflow-y-auto" data-testid="mbti-question-page">
      <div className="max-w-xl mx-auto p-6 space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>第 {currentQ + 1} / {MBTI_QUESTIONS.length} 题</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question */}
        <Card data-testid={`card-mbti-q-${currentQ}`}>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-base font-semibold text-center">{q.text}</h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-auto py-4 text-left justify-start text-sm font-normal whitespace-normal"
                onClick={() => handleAnswer(0)}
                data-testid="button-option-a"
              >
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mr-3 flex-shrink-0">A</span>
                {q.optionA}
              </Button>
              <Button
                variant="outline"
                className="w-full h-auto py-4 text-left justify-start text-sm font-normal whitespace-normal"
                onClick={() => handleAnswer(1)}
                data-testid="button-option-b"
              >
                <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold flex items-center justify-center mr-3 flex-shrink-0">B</span>
                {q.optionB}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back button */}
        {currentQ > 0 && (
          <Button variant="ghost" size="sm" onClick={handleBack} data-testid="button-mbti-back">
            <ChevronLeft className="w-4 h-4 mr-1" />
            上一题
          </Button>
        )}
      </div>
    </div>
  );
}
