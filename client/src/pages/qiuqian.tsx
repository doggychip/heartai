import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import qiantongSrc from "@assets/qiantong.jpg";
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

// ─── Number to Chinese ───────────────────────────────

function numberToChinese(n: number): string {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (n <= 10) return ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][n];
  if (n < 20) return "十" + (n % 10 === 0 ? "" : digits[n % 10]);
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return digits[tens] + "十" + (ones === 0 ? "" : digits[ones]);
  }
  return "一百";
}

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
              ? 'rgba(147, 197, 253, 0.3)'
              : i % 3 === 1
              ? 'rgba(196, 181, 253, 0.3)'
              : 'rgba(252, 211, 77, 0.25)',
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

// ─── Shaking Sticks Animation (Real Image) ───────────

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
    <div className="relative w-56 h-56 mx-auto flex items-center justify-center">
      {/* Glow under the pot */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-40 h-10 rounded-full bg-gradient-to-r from-red-300/30 via-amber-300/40 to-red-300/30 dark:from-red-500/15 dark:via-amber-500/20 dark:to-red-500/15 blur-xl" />

      {/* Real 签筒 image */}
      <img
        src={qiantongSrc}
        alt="签筒"
        className={`relative w-44 h-44 object-contain drop-shadow-xl select-none ${
          shakePhase === 1 ? "animate-shake" : ""
        }`}
        draggable={false}
      />

      {/* 掉出来的签 */}
      {fallingStick && (
        <div
          className="absolute left-[55%] top-2 origin-bottom"
          style={{ animation: "stick-fall 1.2s ease-out forwards" }}
        >
          <div className="w-2.5 h-28 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-500 rounded-t-full rounded-b-sm shadow-lg relative">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-600 shadow-sm shadow-red-500/50" />
          </div>
        </div>
      )}

      <style>{`
        @keyframes animate-shake {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(-10deg); }
          20% { transform: rotate(10deg); }
          30% { transform: rotate(-8deg); }
          40% { transform: rotate(8deg); }
          50% { transform: rotate(-5deg); }
          60% { transform: rotate(5deg); }
          70% { transform: rotate(-3deg); }
          80% { transform: rotate(3deg); }
          90% { transform: rotate(-1deg); }
        }
        .animate-shake {
          animation: animate-shake 0.5s ease-in-out infinite;
        }
        @keyframes stick-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          40% { transform: translateY(10px) rotate(18deg); }
          70% { transform: translateY(60px) rotate(40deg); }
          100% { transform: translateY(100px) rotate(50deg); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

// ─── Traditional Paper Slip Card (车公灵签 Style) ────

function QianWenCard({ result }: { result: QianResult }) {
  // Parse poem into lines — split on ，。；, and filter empty
  const poemLines = result.qian.poem
    .split(/[，。；\n]+/)
    .map(s => s.trim())
    .filter(Boolean);

  // Use AI overallReading for 解曰 section (dynamic, not static baseMeaning)
  // Truncate to ~60 chars for the paper slip, full version shown below in AI cards
  const aiReading = result.overallReading || result.qian.baseMeaning;
  // Split into short phrases for vertical layout (max ~4 phrases)
  const readingSentences = aiReading
    .split(/[，。！？；\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .slice(0, 4);

  const rankNumber = numberToChinese(result.qian.number);

  return (
    <div className="mx-auto max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Outer frame — traditional paper slip with red border */}
      <div
        className="relative border-[3px] border-red-600 dark:border-red-500 rounded-sm"
        style={{
          background: "linear-gradient(135deg, #fdf6e3, #f5e6c8, #fdf6e3)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.12), inset 0 0 30px rgba(218,165,32,0.08)",
        }}
      >
        {/* Inner border line for traditional double-border feel */}
        <div className="absolute inset-[6px] border border-red-500/40 dark:border-red-400/30 rounded-sm pointer-events-none" />

        {/* ── Header: Temple Name ── */}
        <div className="relative pt-4 pb-2 text-center border-b-2 border-red-600/60 dark:border-red-500/50 mx-3">
          <p className="text-xs text-red-700/70 dark:text-red-400/70 tracking-[0.3em] mb-1">
            观 星 神 殿
          </p>
          <h2
            className="text-2xl font-black tracking-[0.4em] text-red-700 dark:text-red-400"
            style={{ fontFamily: "'Noto Serif SC', 'STKaiti', 'KaiTi', serif" }}
          >
            观星灵签
          </h2>
        </div>

        {/* ── Body: Poem + Number/Rank ── */}
        <div className="relative px-4 pt-4 pb-3">
          <div className="flex">
            {/* Left side: Sign number + rank (vertical text) */}
            <div
              className="flex-shrink-0 pr-3 border-r border-red-500/30 dark:border-red-400/20 flex flex-col items-center justify-start pt-1 gap-1"
              style={{ writingMode: "vertical-rl", fontFamily: "'Noto Serif SC', 'STKaiti', 'KaiTi', serif" }}
            >
              <span className="text-lg font-bold text-red-700 dark:text-red-400 tracking-[0.2em]">
                {rankNumber}
              </span>
              <span className="text-lg font-bold text-red-700 dark:text-red-400 tracking-[0.2em]">
                {result.qian.rank}签
              </span>
            </div>

            {/* Center: Poem in vertical columns */}
            <div className="flex-1 flex justify-center py-2 min-h-[160px]">
              <div
                className="flex flex-row-reverse gap-3 items-start"
                style={{ writingMode: "vertical-rl", fontFamily: "'Noto Serif SC', 'STKaiti', 'KaiTi', serif" }}
              >
                {poemLines.map((line, i) => (
                  <p
                    key={i}
                    className="text-base font-semibold text-red-800/90 dark:text-red-300/90 leading-[1.8] tracking-[0.15em]"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 住持解签 Section (AI-generated, replaces static 解曰) ── */}
        <div className="mx-3 border-t-2 border-red-600/60 dark:border-red-500/50 pt-3 pb-4 px-2">
          <div className="flex items-start gap-2">
            {/* 解曰 label — vertical */}
            <div
              className="flex-shrink-0 pt-0.5"
              style={{ writingMode: "vertical-rl", fontFamily: "'Noto Serif SC', 'STKaiti', 'KaiTi', serif" }}
            >
              <span className="text-base font-bold text-red-700 dark:text-red-400 tracking-[0.3em]">解曰</span>
            </div>

            {/* AI interpretation — horizontal flowing text for readability */}
            <div className="flex-1 pl-1">
              <p
                className="text-sm font-medium text-red-800/80 dark:text-red-300/80 leading-relaxed tracking-wide"
                style={{ fontFamily: "'Noto Serif SC', 'STKaiti', 'KaiTi', serif" }}
              >
                {readingSentences.join("，")}。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle title below the slip */}
      <p className="text-center text-xs text-muted-foreground mt-3 tracking-wide">
        「{result.qian.title}」
      </p>
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

          {/* Traditional Paper Slip Card */}
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

        {/* Shaking Animation Area — Real Image */}
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
