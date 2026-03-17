import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";

// ─── 7 Chakras Data ──────────────────────────────────────────

interface ChakraInfo {
  name: string;
  sanskrit: string;
  color: string;
  colorClass: string;
  bgClass: string;
  keywords: string;
}

const CHAKRAS: ChakraInfo[] = [
  { name: "海底轮", sanskrit: "Muladhara", color: "#EF4444", colorClass: "text-red-500", bgClass: "bg-red-500", keywords: "安全感、生存、稳定" },
  { name: "脐轮", sanskrit: "Svadhisthana", color: "#F97316", colorClass: "text-orange-500", bgClass: "bg-orange-500", keywords: "情感、创造力、愉悦" },
  { name: "太阳轮", sanskrit: "Manipura", color: "#EAB308", colorClass: "text-yellow-500", bgClass: "bg-yellow-500", keywords: "自信、意志力、力量" },
  { name: "心轮", sanskrit: "Anahata", color: "#22C55E", colorClass: "text-green-500", bgClass: "bg-green-500", keywords: "爱、同理心、接纳" },
  { name: "喉轮", sanskrit: "Vishuddha", color: "#3B82F6", colorClass: "text-blue-500", bgClass: "bg-blue-500", keywords: "表达、沟通、真实" },
  { name: "眉心轮", sanskrit: "Ajna", color: "#6366F1", colorClass: "text-indigo-500", bgClass: "bg-indigo-500", keywords: "直觉、智慧、洞察" },
  { name: "顶轮", sanskrit: "Sahasrara", color: "#A855F7", colorClass: "text-purple-500", bgClass: "bg-purple-500", keywords: "灵性、开悟、合一" },
];

// ─── 21 Questions (3 per chakra) ─────────────────────────────

const QUESTIONS: { text: string; chakra: number }[] = [
  // Root (0)
  { text: "我感到自己在生活中有稳定的根基和安全感", chakra: 0 },
  { text: "我对基本的生活需求（住所、食物、收入）感到安心", chakra: 0 },
  { text: "我与家人和自己的身体有着良好的连接", chakra: 0 },
  // Sacral (1)
  { text: "我能自由地表达自己的情感和创造力", chakra: 1 },
  { text: "我享受生活中的愉悦体验，不会有罪恶感", chakra: 1 },
  { text: "我与他人有健康的情感联系和亲密关系", chakra: 1 },
  // Solar Plexus (2)
  { text: "我对自己的能力和决定充满信心", chakra: 2 },
  { text: "我能够设定健康的界限并坚持自己的立场", chakra: 2 },
  { text: "我感到自己有力量去追求目标并实现它们", chakra: 2 },
  // Heart (3)
  { text: "我能够无条件地爱自己和他人", chakra: 3 },
  { text: "我容易对他人产生同理心和慈悲心", chakra: 3 },
  { text: "我在给予和接受爱之间保持着平衡", chakra: 3 },
  // Throat (4)
  { text: "我能清晰、自信地表达自己的想法和感受", chakra: 4 },
  { text: "我善于倾听他人并进行有效的沟通", chakra: 4 },
  { text: "我敢于说出真实的想法，即使可能不受欢迎", chakra: 4 },
  // Third Eye (5)
  { text: "我信任自己的直觉和内在的指引", chakra: 5 },
  { text: "我能在纷繁复杂的情况中看到本质和真相", chakra: 5 },
  { text: "我经常有清晰的洞见或灵感闪现", chakra: 5 },
  // Crown (6)
  { text: "我感到与某种更大的力量或宇宙有连接", chakra: 6 },
  { text: "我在日常生活中能体会到平静和内在的合一感", chakra: 6 },
  { text: "我对生命有深层的感恩和敬畏之心", chakra: 6 },
];

const LIKERT_OPTIONS = [
  { value: 1, label: "完全不符合" },
  { value: 2, label: "较少符合" },
  { value: 3, label: "一般" },
  { value: 4, label: "比较符合" },
  { value: 5, label: "完全符合" },
];

function getChakraStatus(score: number): { label: string; color: string } {
  if (score >= 13) return { label: "过度活跃", color: "text-orange-400" };
  if (score >= 10) return { label: "平衡", color: "text-emerald-400" };
  if (score >= 7) return { label: "略有不足", color: "text-yellow-400" };
  return { label: "不足", color: "text-red-400" };
}

export default function ChakraPage() {
  const [stage, setStage] = useState<"landing" | "quiz" | "result">("landing");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(21).fill(0));
  const [chakraScores, setChakraScores] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");

  const analysisMutation = useMutation({
    mutationFn: async (data: { scores: number[] }) => {
      const res = await apiRequest("POST", "/api/metaphysics/chakra", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.analysis) setAiAnalysis(data.analysis);
    },
  });

  function calculateResults() {
    const scores = [0, 0, 0, 0, 0, 0, 0];
    QUESTIONS.forEach((q, i) => {
      scores[q.chakra] += answers[i];
    });
    setChakraScores(scores);
    analysisMutation.mutate({ scores });
    setStage("result");
  }

  // ─── Landing Page ──────────────────────────────────────────
  if (stage === "landing") {
    return (
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-6 overflow-x-hidden">
        <div className="flex items-center gap-3">
          <Link href="/discover">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-lg font-bold">脉轮测试</h1>
        </div>

        <div className="text-center space-y-4 py-4">
          {/* Vertical chakra visualization */}
          <div className="flex flex-col items-center gap-2 py-4">
            {[...CHAKRAS].reverse().map((chakra, i) => {
              const size = 28 + (6 - i) * 6;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: chakra.color,
                      opacity: 0.7,
                    }}
                  />
                  <div className="text-left">
                    <span className={`text-xs font-semibold ${chakra.colorClass}`}>{chakra.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{chakra.keywords}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="text-xl font-bold">探索你的脉轮能量</h2>
          <p className="text-sm text-muted-foreground px-4">
            脉轮是人体七个主要能量中心。通过21道题目了解每个脉轮的活跃状态，发现需要关注和平衡的能量领域。
          </p>
        </div>

        <Button className="w-full" onClick={() => { setStage("quiz"); setCurrentQ(0); }}>
          开始测试
        </Button>
      </div>
    );
  }

  // ─── Quiz ──────────────────────────────────────────────────
  if (stage === "quiz") {
    const q = QUESTIONS[currentQ];
    const chakra = CHAKRAS[q.chakra];
    const progress = ((currentQ + 1) / QUESTIONS.length) * 100;

    return (
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-6 overflow-x-hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => currentQ > 0 ? setCurrentQ(currentQ - 1) : setStage("landing")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground flex-1 text-center">
            {currentQ + 1} / {QUESTIONS.length}
          </span>
          <Badge variant="outline" className="text-xs" style={{ borderColor: chakra.color, color: chakra.color }}>
            {chakra.name}
          </Badge>
        </div>

        {/* Progress bar with chakra colors */}
        <div className="w-full bg-accent/30 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: chakra.color }}
          />
        </div>

        <div className="py-8 text-center">
          <div
            className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: chakra.color, opacity: 0.6 }}
          />
          <p className="text-lg font-medium leading-relaxed px-2">{q.text}</p>
        </div>

        <div className="space-y-3">
          {LIKERT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                const newAnswers = [...answers];
                newAnswers[currentQ] = opt.value;
                setAnswers(newAnswers);

                if (currentQ < QUESTIONS.length - 1) {
                  setTimeout(() => setCurrentQ(currentQ + 1), 200);
                } else {
                  // Last question — calculate with updated answers
                  const scores = [0, 0, 0, 0, 0, 0, 0];
                  QUESTIONS.forEach((question, idx) => {
                    scores[question.chakra] += idx === currentQ ? opt.value : newAnswers[idx];
                  });
                  setChakraScores(scores);
                  analysisMutation.mutate({ scores });
                  setStage("result");
                }
              }}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                answers[currentQ] === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent bg-transparent hover:bg-accent/30"
              }`}
            >
              <span className="text-sm">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentQ > 0 && (
            <Button variant="outline" size="sm" onClick={() => setCurrentQ(currentQ - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> 上一题
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── Result Page ───────────────────────────────────────────
  const maxScore = 15;

  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4 overflow-x-hidden">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/discover">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-lg font-bold">脉轮测试 · 结果</h1>
      </div>

      {/* Header card */}
      <Card className="bg-gradient-to-br from-violet-500/15 to-rose-500/15 border-0 p-6 text-center space-y-3">
        <div className="text-4xl">🧘</div>
        <h2 className="text-xl font-bold">你的脉轮能量分布</h2>
        <p className="text-sm text-muted-foreground">
          基于你的回答，以下是每个脉轮的活跃程度
        </p>
      </Card>

      {/* Vertical chakra diagram with scores */}
      <Card className="bg-transparent border-0 p-4 space-y-3">
        {[...CHAKRAS].reverse().map((chakra, reverseIdx) => {
          const idx = 6 - reverseIdx;
          const score = chakraScores[idx];
          const pct = (score / maxScore) * 100;
          const status = getChakraStatus(score);

          return (
            <div key={idx} className="flex items-center gap-3">
              <div
                className="rounded-full flex-shrink-0"
                style={{
                  width: 24 + (score / maxScore) * 16,
                  height: 24 + (score / maxScore) * 16,
                  backgroundColor: chakra.color,
                  opacity: 0.3 + (score / maxScore) * 0.7,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${chakra.colorClass}`}>{chakra.name}</span>
                  <span className={`text-xs ${status.color}`}>{status.label}</span>
                </div>
                <div className="w-full bg-accent/30 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: chakra.color }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{score}/{maxScore}</span>
              </div>
            </div>
          );
        })}
      </Card>

      {/* AI Analysis */}
      {(analysisMutation.isPending || aiAnalysis) && (
        <Card className="bg-transparent border-0 p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" /> AI 脉轮解读
          </h3>
          {analysisMutation.isPending ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">正在分析你的脉轮状态...</span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {aiAnalysis}
            </div>
          )}
        </Card>
      )}

      {/* Chakra details */}
      <Card className="bg-transparent border-0 p-4 space-y-3">
        <h3 className="font-semibold">各脉轮详情</h3>
        {CHAKRAS.map((chakra, idx) => {
          const score = chakraScores[idx];
          const status = getChakraStatus(score);
          return (
            <div key={idx} className="pb-3 border-b border-border/30 last:border-0 last:pb-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chakra.color }} />
                <span className="text-sm font-semibold">{chakra.name}</span>
                <span className="text-[10px] text-muted-foreground">({chakra.sanskrit})</span>
                <Badge variant="outline" className={`text-[10px] ml-auto ${status.color}`}>
                  {status.label} · {score}分
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{chakra.keywords}</p>
            </div>
          );
        })}
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        仅供娱乐参考，不代替专业心理评估
      </p>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setStage("landing");
          setAnswers(new Array(21).fill(0));
          setCurrentQ(0);
          setAiAnalysis("");
        }}
      >
        重新测试
      </Button>
    </div>
  );
}
