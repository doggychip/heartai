import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  Flame,
  Heart,
  Briefcase,
  Coins,
  Activity,
  GraduationCap,
  Sparkles,
  RotateCcw,
  ChevronDown,
  Compass,
  Star,
  Clock,
  Palette,
  MapPin,
  Lightbulb,
  Loader2,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────

type QianCategory = "general" | "love" | "career" | "wealth" | "health" | "exam";

interface QianResult {
  qian: {
    number: number;
    rank: string;
    title: string;
    poem: string;
    baseMeaning: string;
  };
  category: string;
  categoryLabel: string;
  overallReading: string;
  poemAnalysis: string[];
  categoryAdvice: string;
  luckyElements: {
    direction: string;
    color: string;
    number: string;
    time: string;
  };
  actionTip: string;
  meta: {
    question: string | null;
    time: string;
    lunarTime: string;
    hourBranch: string;
  };
}

const CATEGORIES: { value: QianCategory; label: string; icon: typeof Flame; desc: string }[] = [
  { value: "general", label: "综合运势", icon: Compass, desc: "问天问地问自己" },
  { value: "love", label: "感情姻缘", icon: Heart, desc: "月老红线牵" },
  { value: "career", label: "事业前程", icon: Briefcase, desc: "锦绣前程路" },
  { value: "wealth", label: "财运财富", icon: Coins, desc: "财源广进来" },
  { value: "health", label: "健康平安", icon: Activity, desc: "福寿安康" },
  { value: "exam", label: "考试学业", icon: GraduationCap, desc: "金榜题名时" },
];

const RANK_STYLES: Record<string, { color: string; glow: string; bg: string }> = {
  "上上": { color: "text-amber-400", glow: "shadow-amber-500/30", bg: "from-amber-500/20 to-orange-500/20" },
  "上中": { color: "text-emerald-400", glow: "shadow-emerald-500/30", bg: "from-emerald-500/15 to-teal-500/15" },
  "中上": { color: "text-emerald-400", glow: "shadow-emerald-500/30", bg: "from-emerald-500/15 to-teal-500/15" },
  "中中": { color: "text-blue-400", glow: "shadow-blue-500/30", bg: "from-blue-500/10 to-indigo-500/10" },
  "中平": { color: "text-slate-400", glow: "shadow-slate-500/30", bg: "from-slate-500/10 to-gray-500/10" },
  "中下": { color: "text-orange-400", glow: "shadow-orange-500/30", bg: "from-orange-500/10 to-rose-500/10" },
  "下下": { color: "text-rose-400", glow: "shadow-rose-500/30", bg: "from-rose-500/10 to-red-500/10" },
};

// ─── Floating Incense Particles ─────────────────────

function IncenseParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-amber-300/30 dark:bg-amber-400/20"
          style={{
            left: `${15 + Math.random() * 70}%`,
            bottom: `${Math.random() * 30}%`,
            animation: `float-up ${6 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          20% { opacity: 0.6; }
          80% { opacity: 0.3; }
          100% { transform: translateY(-200px) scale(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Shaking Sticks Animation ────────────────────────

function ShakingSticks({ isShaking, onShakeComplete }: { isShaking: boolean; onShakeComplete: () => void }) {
  const [shakePhase, setShakePhase] = useState(0); // 0: idle, 1: shaking, 2: stick falling out
  const [fallingStick, setFallingStick] = useState(false);

  useEffect(() => {
    if (!isShaking) {
      setShakePhase(0);
      setFallingStick(false);
      return;
    }
    setShakePhase(1);
    const timer1 = setTimeout(() => {
      setShakePhase(2);
      setFallingStick(true);
    }, 2500);
    const timer2 = setTimeout(() => {
      onShakeComplete();
    }, 3800);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [isShaking, onShakeComplete]);

  return (
    <div className="relative w-48 h-64 mx-auto">
      {/* 签筒 */}
      <div
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-48 rounded-t-xl rounded-b-2xl overflow-hidden ${
          shakePhase === 1 ? "animate-shake" : ""
        }`}
      >
        {/* 签筒底色 */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-800 to-amber-950 dark:from-amber-700 dark:to-amber-900 rounded-t-xl rounded-b-2xl border-2 border-amber-600/50" />
        {/* 签筒装饰 */}
        <div className="absolute inset-x-3 top-2 bottom-6 border border-amber-500/30 rounded-t-lg rounded-b-xl" />
        <div className="absolute inset-x-5 top-4 text-center">
          <span className="text-amber-200/80 text-xs font-bold tracking-widest" style={{ writingMode: "vertical-rl" }}>
            观星灵签
          </span>
        </div>
        {/* 签条们 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-0.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 bg-gradient-to-b from-amber-100 to-amber-300 rounded-t-full"
              style={{
                height: `${16 + Math.random() * 8}px`,
                transform: `rotate(${(i - 3) * 4}deg)`,
                transformOrigin: "bottom center",
              }}
            />
          ))}
        </div>
      </div>

      {/* 掉出来的签 */}
      {fallingStick && (
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 origin-bottom"
          style={{
            animation: "stick-fall 1.2s ease-out forwards",
          }}
        >
          <div className="w-2 h-32 bg-gradient-to-b from-amber-100 to-amber-300 rounded-t-full rounded-b-sm shadow-lg relative">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />
          </div>
        </div>
      )}

      <style>{`
        @keyframes animate-shake {
          0%, 100% { transform: translateX(-50%) rotate(0deg); }
          10% { transform: translateX(-50%) rotate(-8deg); }
          20% { transform: translateX(-50%) rotate(8deg); }
          30% { transform: translateX(-50%) rotate(-6deg); }
          40% { transform: translateX(-50%) rotate(6deg); }
          50% { transform: translateX(-50%) rotate(-4deg); }
          60% { transform: translateX(-50%) rotate(4deg); }
          70% { transform: translateX(-50%) rotate(-2deg); }
          80% { transform: translateX(-50%) rotate(2deg); }
          90% { transform: translateX(-50%) rotate(-1deg); }
        }
        .animate-shake {
          animation: animate-shake 0.5s ease-in-out infinite;
        }
        @keyframes stick-fall {
          0% { transform: translateX(-50%) translateY(0) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          40% { transform: translateX(-50%) translateY(10px) rotate(15deg); }
          70% { transform: translateX(-30%) translateY(60px) rotate(35deg); }
          100% { transform: translateX(-10%) translateY(100px) rotate(45deg); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

// ─── Result Card (Qian Wen) ──────────────────────────

function QianWenCard({ result }: { result: QianResult }) {
  const rankStyle = RANK_STYLES[result.qian.rank] || RANK_STYLES["中中"];
  const poemLines = result.qian.poem.match(/[^，。]+[，。]/g) || [result.qian.poem];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20">
      {/* Decorative background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${rankStyle.bg}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.08),transparent_60%)]" />

      <div className="relative p-6 text-center">
        {/* Rank badge */}
        <Badge className={`mb-3 px-3 py-1 text-sm font-bold ${rankStyle.color} bg-background/80 border border-amber-500/20`}>
          {result.qian.rank}签
        </Badge>

        {/* Number + Title */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1">第 {result.qian.number} 签</p>
          <h2 className="text-xl font-bold tracking-wide">{result.qian.title}</h2>
        </div>

        {/* Poem in classical vertical-ish feel */}
        <div className="py-4 px-2 mb-3">
          <div className="grid grid-cols-2 gap-x-1 gap-y-3">
            {poemLines.map((line, i) => (
              <p key={i} className="text-sm text-foreground/80 font-medium leading-relaxed">
                {line.replace(/[，。]/g, "")}
              </p>
            ))}
          </div>
        </div>

        {/* Base meaning */}
        <div className="mt-2 px-4 py-2 rounded-lg bg-background/50 border border-border/50">
          <p className="text-xs text-muted-foreground mb-0.5">签解</p>
          <p className="text-sm font-medium">{result.qian.baseMeaning}</p>
        </div>
      </div>
    </div>
  );
}

// ─── AI Interpretation Section ───────────────────────

function AIInterpretation({ result }: { result: QianResult }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Overall Reading */}
      <Card className="overflow-hidden border-primary/10">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-2">住持解签</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.overallReading}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Poem Analysis — collapsible */}
      <Card className="overflow-hidden">
        <button
          className="w-full px-4 py-3 flex items-center justify-between text-left"
          onClick={() => setExpanded(!expanded)}
          data-testid="button-toggle-poem-analysis"
        >
          <span className="text-sm font-semibold flex items-center gap-2">
            <Star className="w-4 h-4 text-purple-500" />
            签诗逐句解读
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded && (
          <CardContent className="pt-0 pb-4 px-4 space-y-3">
            {result.poemAnalysis.map((analysis, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground mt-1 font-mono w-4 flex-shrink-0">{i + 1}.</span>
                <p className="text-sm text-muted-foreground leading-relaxed">{analysis}</p>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Category-specific Advice */}
      <Card className="overflow-hidden border-primary/10">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Lightbulb className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-2">{result.categoryLabel}指引</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.categoryAdvice}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lucky Elements Grid */}
      {result.luckyElements && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: MapPin, label: "吉方位", value: result.luckyElements.direction, color: "text-green-500" },
            { icon: Palette, label: "吉色", value: result.luckyElements.color, color: "text-pink-500" },
            { icon: Star, label: "吉数", value: result.luckyElements.number, color: "text-amber-500" },
            { icon: Clock, label: "吉时", value: result.luckyElements.time, color: "text-blue-500" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="text-center p-3 rounded-xl bg-card border border-border/50">
              <Icon className={`w-4 h-4 mx-auto mb-1.5 ${color}`} />
              <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
              <p className="text-xs font-medium truncate">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action Tip */}
      {result.actionTip && (
        <div className="text-center py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/15">
          <p className="text-xs text-muted-foreground mb-1">行动指南</p>
          <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{result.actionTip}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────

export default function QiuqianPage() {
  const { toast } = useToast();
  const { token } = useAuth();
  const [category, setCategory] = useState<QianCategory>("general");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QianResult | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/culture/qiuqian", { question, category });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err: Error) => {
      toast({ title: "求签失败", description: err.message, variant: "destructive" });
      setIsShaking(false);
    },
  });

  const handleDraw = useCallback(() => {
    setIsShaking(true);
    setShowResult(false);
    mutation.mutate();
  }, [mutation]);

  const handleShakeComplete = useCallback(() => {
    setIsShaking(false);
    setShowResult(true);
    // Scroll to result after a short delay
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  }, []);

  const restart = () => {
    setResult(null);
    setShowResult(false);
    setIsShaking(false);
    setQuestion("");
  };

  // ─── Result View ─────
  if (result && showResult) {
    return (
      <div className="flex-1 overflow-y-auto" data-testid="qiuqian-result-page">
        <div className="max-w-2xl mx-auto p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              灵签解读
            </h1>
            <Button variant="outline" size="sm" onClick={restart} data-testid="button-qiuqian-restart">
              <RotateCcw className="w-4 h-4 mr-1" /> 重新求签
            </Button>
          </div>

          {/* Question badge */}
          {result.meta.question && (
            <div className="text-center px-4 py-2 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-[10px] text-muted-foreground mb-0.5">所求之事</p>
              <p className="text-sm">{result.meta.question}</p>
            </div>
          )}

          {/* Qian Wen Card */}
          <QianWenCard result={result} />

          {/* AI Interpretation */}
          <AIInterpretation result={result} />

          {/* Disclaimer */}
          <div className="border-t border-border pt-3 pb-6">
            <p className="text-[10px] text-center text-muted-foreground">
              ⚠️ 免责声明：求签解签仅供娱乐和文化体验参考，不构成任何决策建议。请理性看待结果。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Input Form (Ritual) ─────
  return (
    <div className="flex-1 overflow-y-auto" data-testid="qiuqian-page">
      <div className="max-w-2xl mx-auto p-5 space-y-6">
        {/* Header with atmosphere */}
        <div className="relative text-center pt-4 pb-2">
          <IncenseParticles />
          <Flame className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-1">观星灵签</h1>
          <p className="text-sm text-muted-foreground">
            静心虔诚，心诚则灵
          </p>
        </div>

        {/* Category Selection */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">选择所求类别</p>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(({ value, label, icon: Icon, desc }) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className={`p-3 rounded-xl border text-center transition-all duration-200 ${
                  category === value
                    ? "border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10 shadow-sm"
                    : "border-border hover:border-amber-500/30 hover:bg-accent/30"
                }`}
                data-testid={`button-category-${value}`}
              >
                <Icon className={`w-4 h-4 mx-auto mb-1.5 ${category === value ? "text-amber-500" : "text-muted-foreground"}`} />
                <p className="text-xs font-medium">{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Question Input */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">心中所想 <span className="text-xs font-normal">（选填）</span></p>
          <Textarea
            placeholder="在心中默念您的问题，也可以在此写下。留空则默认占卜今日运势。"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="resize-none text-sm"
            data-testid="input-qiuqian-question"
          />
        </div>

        {/* Shaking Animation Area */}
        <div className="py-2">
          <ShakingSticks isShaking={isShaking} onShakeComplete={handleShakeComplete} />
        </div>

        {/* Draw Button */}
        <Button
          className="w-full h-12 text-base bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg shadow-amber-500/20 transition-all"
          disabled={isShaking || mutation.isPending}
          onClick={handleDraw}
          data-testid="button-qiuqian-draw"
        >
          {isShaking || mutation.isPending ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 正在摇签...</>
          ) : (
            <><Flame className="w-5 h-5 mr-2" /> 虔诚摇签</>
          )}
        </Button>

        <div ref={scrollRef} />

        {/* Disclaimer */}
        <div className="border-t border-border pt-3">
          <p className="text-[10px] text-center text-muted-foreground">
            ⚠️ 观音灵签百首，AI智能解签。仅供文化体验参考，不构成任何决策建议。
          </p>
        </div>
      </div>
    </div>
  );
}
