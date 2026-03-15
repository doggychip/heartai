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

const RANK_STYLES: Record<string, { color: string; glow: string; bg: string; border: string }> = {
  "上上": { color: "text-amber-500", glow: "shadow-amber-500/30", bg: "from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-950/30", border: "border-amber-300/60 dark:border-amber-700/50" },
  "上中": { color: "text-emerald-500", glow: "shadow-emerald-500/30", bg: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30", border: "border-emerald-300/60 dark:border-emerald-700/50" },
  "中上": { color: "text-emerald-500", glow: "shadow-emerald-500/30", bg: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30", border: "border-emerald-300/60 dark:border-emerald-700/50" },
  "中中": { color: "text-sky-500", glow: "shadow-sky-500/30", bg: "from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30", border: "border-sky-300/60 dark:border-sky-700/50" },
  "中平": { color: "text-slate-500", glow: "shadow-slate-500/30", bg: "from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/30", border: "border-slate-300/60 dark:border-slate-700/50" },
  "中下": { color: "text-orange-500", glow: "shadow-orange-500/30", bg: "from-orange-50 to-rose-50 dark:from-orange-950/30 dark:to-rose-950/30", border: "border-orange-300/60 dark:border-orange-700/50" },
  "下下": { color: "text-rose-500", glow: "shadow-rose-500/30", bg: "from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30", border: "border-rose-300/60 dark:border-rose-700/50" },
};

// ─── Floating Incense Particles ─────────────────────

function IncenseParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${3 + Math.random() * 4}px`,
            height: `${3 + Math.random() * 4}px`,
            left: `${10 + Math.random() * 80}%`,
            bottom: `${Math.random() * 20}%`,
            background: i % 3 === 0
              ? 'rgba(147, 197, 253, 0.3)'  // blue
              : i % 3 === 1
              ? 'rgba(196, 181, 253, 0.3)'  // purple
              : 'rgba(252, 211, 77, 0.25)', // gold
            animation: `float-up ${5 + Math.random() * 5}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 6}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          15% { opacity: 0.7; }
          50% { opacity: 0.5; }
          85% { opacity: 0.2; }
          100% { transform: translateY(-220px) scale(0.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Shaking Sticks Animation ────────────────────────

function ShakingSticks({ isShaking, onShakeComplete }: { isShaking: boolean; onShakeComplete: () => void }) {
  const [shakePhase, setShakePhase] = useState(0);
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
      {/* Glow under the pot */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 rounded-full bg-gradient-to-r from-rose-300/20 via-purple-300/30 to-sky-300/20 dark:from-rose-500/10 dark:via-purple-500/15 dark:to-sky-500/10 blur-xl" />

      {/* 签筒 */}
      <div
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-48 rounded-t-xl rounded-b-2xl overflow-hidden ${
          shakePhase === 1 ? "animate-shake" : ""
        }`}
      >
        {/* 签筒底色 — brighter warm gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-rose-400 via-fuchsia-500 to-indigo-600 dark:from-rose-500 dark:via-fuchsia-600 dark:to-indigo-700 rounded-t-xl rounded-b-2xl" />
        {/* Inner shine */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-t-xl rounded-b-2xl" />
        {/* Border */}
        <div className="absolute inset-0 rounded-t-xl rounded-b-2xl border-2 border-white/20" />
        {/* 签筒装饰线 */}
        <div className="absolute inset-x-3 top-2 bottom-6 border border-white/15 rounded-t-lg rounded-b-xl" />
        {/* 文字 */}
        <div className="absolute inset-x-5 top-4 text-center">
          <span className="text-white/90 text-xs font-bold tracking-widest drop-shadow-sm" style={{ writingMode: "vertical-rl" }}>
            观星灵签
          </span>
        </div>
        {/* 签条们 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-0.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 rounded-t-full"
              style={{
                height: `${16 + Math.random() * 8}px`,
                background: `linear-gradient(to bottom, #fef3c7, #f59e0b)`,
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
          style={{ animation: "stick-fall 1.2s ease-out forwards" }}
        >
          <div className="w-2 h-32 bg-gradient-to-b from-amber-100 to-amber-400 rounded-t-full rounded-b-sm shadow-lg relative">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm shadow-red-400/50" />
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
    <div className={`relative overflow-hidden rounded-2xl border ${rankStyle.border}`}>
      {/* Decorative background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${rankStyle.bg}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(147,197,253,0.1),transparent_60%)]" />

      <div className="relative p-6 text-center">
        {/* Rank badge */}
        <Badge className={`mb-3 px-4 py-1 text-sm font-bold ${rankStyle.color} bg-white/80 dark:bg-gray-900/80 border ${rankStyle.border} shadow-sm`}>
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
        <div className="mt-2 px-4 py-3 rounded-xl bg-white/60 dark:bg-gray-900/50 border border-border/40 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground mb-1">签解</p>
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
      <Card className="overflow-hidden border-sky-200/50 dark:border-sky-800/30 bg-gradient-to-br from-white to-sky-50/50 dark:from-gray-900 dark:to-sky-950/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/40 dark:to-indigo-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-sky-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-2">住持解签</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.overallReading}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Poem Analysis — collapsible */}
      <Card className="overflow-hidden border-purple-200/40 dark:border-purple-800/30">
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
      <Card className="overflow-hidden border-pink-200/40 dark:border-pink-800/30 bg-gradient-to-br from-white to-pink-50/30 dark:from-gray-900 dark:to-pink-950/10">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/40 dark:to-rose-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Lightbulb className="w-4 h-4 text-pink-500" />
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
            { icon: MapPin, label: "吉方位", value: result.luckyElements.direction, color: "text-emerald-500", bg: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30" },
            { icon: Palette, label: "吉色", value: result.luckyElements.color, color: "text-pink-500", bg: "from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30" },
            { icon: Star, label: "吉数", value: result.luckyElements.number, color: "text-amber-500", bg: "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30" },
            { icon: Clock, label: "吉时", value: result.luckyElements.time, color: "text-sky-500", bg: "from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`text-center p-3 rounded-xl bg-gradient-to-b ${bg} border border-border/30`}>
              <Icon className={`w-4 h-4 mx-auto mb-1.5 ${color}`} />
              <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
              <p className="text-xs font-medium truncate">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action Tip */}
      {result.actionTip && (
        <div className="text-center py-3 px-6 rounded-xl bg-gradient-to-r from-sky-50 via-purple-50 to-pink-50 dark:from-sky-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border border-purple-200/30 dark:border-purple-800/20">
          <p className="text-xs text-muted-foreground mb-1">行动指南</p>
          <p className="text-sm font-bold text-purple-700 dark:text-purple-300">{result.actionTip}</p>
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
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-sky-50/60 via-purple-50/30 to-pink-50/40 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" data-testid="qiuqian-result-page">
        <div className="max-w-2xl mx-auto p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-400" />
              灵签解读
            </h1>
            <Button variant="outline" size="sm" onClick={restart} data-testid="button-qiuqian-restart">
              <RotateCcw className="w-4 h-4 mr-1" /> 重新求签
            </Button>
          </div>

          {/* Question badge */}
          {result.meta.question && (
            <div className="text-center px-4 py-2 rounded-xl bg-white/70 dark:bg-gray-900/50 border border-purple-200/30 dark:border-purple-800/20 backdrop-blur-sm">
              <p className="text-[10px] text-muted-foreground mb-0.5">所求之事</p>
              <p className="text-sm">{result.meta.question}</p>
            </div>
          )}

          {/* Qian Wen Card */}
          <QianWenCard result={result} />

          {/* AI Interpretation */}
          <AIInterpretation result={result} />

          {/* Disclaimer */}
          <div className="border-t border-border/40 pt-3 pb-6">
            <p className="text-[10px] text-center text-muted-foreground">
              免责声明：求签解签仅供娱乐和文化体验参考，不构成任何决策建议。请理性看待结果。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Input Form (Ritual) ─────
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-sky-50/60 via-purple-50/30 to-pink-50/40 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" data-testid="qiuqian-page">
      <div className="max-w-2xl mx-auto p-5 space-y-6">
        {/* Header with atmosphere */}
        <div className="relative text-center pt-6 pb-3">
          <IncenseParticles />
          {/* Decorative halo */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-sky-200/40 via-purple-200/30 to-pink-200/40 dark:from-sky-800/20 dark:via-purple-800/15 dark:to-pink-800/20 blur-2xl" />
          <div className="relative">
            <Flame className="w-8 h-8 text-rose-400 mx-auto mb-3 drop-shadow-sm" />
            <h1 className="text-xl font-bold mb-1 bg-gradient-to-r from-purple-700 via-pink-600 to-sky-600 dark:from-purple-300 dark:via-pink-300 dark:to-sky-300 bg-clip-text text-transparent">
              观星灵签
            </h1>
            <p className="text-sm text-muted-foreground">
              静心虔诚，心诚则灵
            </p>
          </div>
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
                    ? "border-purple-400/50 bg-gradient-to-br from-sky-50 to-purple-50 dark:from-sky-950/30 dark:to-purple-950/30 shadow-sm ring-1 ring-purple-300/30"
                    : "border-border/60 hover:border-purple-300/40 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 bg-white/60 dark:bg-gray-900/40"
                }`}
                data-testid={`button-category-${value}`}
              >
                <Icon className={`w-4 h-4 mx-auto mb-1.5 ${category === value ? "text-purple-500" : "text-muted-foreground"}`} />
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
            className="resize-none text-sm bg-white/70 dark:bg-gray-900/50 border-border/50"
            data-testid="input-qiuqian-question"
          />
        </div>

        {/* Shaking Animation Area */}
        <div className="py-2">
          <ShakingSticks isShaking={isShaking} onShakeComplete={handleShakeComplete} />
        </div>

        {/* Draw Button */}
        <Button
          className="w-full h-12 text-base bg-gradient-to-r from-rose-500 via-purple-500 to-sky-500 hover:from-rose-600 hover:via-purple-600 hover:to-sky-600 shadow-lg shadow-purple-500/20 transition-all text-white font-semibold"
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
        <div className="border-t border-border/40 pt-3">
          <p className="text-[10px] text-center text-muted-foreground">
            观音灵签百首，AI智能解签。仅供文化体验参考，不构成任何决策建议。
          </p>
        </div>
      </div>
    </div>
  );
}
