import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";

// ─── 20 Solar Seals ──────────────────────────────────────────

interface SealInfo {
  name: string;
  color: string;
  colorClass: string;
  bgClass: string;
  keywords: string;
  symbol: string;
}

const SEALS: SealInfo[] = [
  { name: "红龙", color: "red", colorClass: "text-red-400", bgClass: "bg-red-500/20", keywords: "诞生、滋养、存在", symbol: "🐉" },
  { name: "白风", color: "white", colorClass: "text-slate-300", bgClass: "bg-slate-400/20", keywords: "灵性、沟通、呼吸", symbol: "🌬️" },
  { name: "蓝夜", color: "blue", colorClass: "text-blue-400", bgClass: "bg-blue-500/20", keywords: "梦想、丰盛、直觉", symbol: "🌙" },
  { name: "黄种子", color: "yellow", colorClass: "text-yellow-400", bgClass: "bg-yellow-500/20", keywords: "觉察、目标、绽放", symbol: "🌱" },
  { name: "红蛇", color: "red", colorClass: "text-red-400", bgClass: "bg-red-500/20", keywords: "生命力、本能、生存", symbol: "🐍" },
  { name: "白世界桥", color: "white", colorClass: "text-slate-300", bgClass: "bg-slate-400/20", keywords: "死亡、平等、机遇", symbol: "🌉" },
  { name: "蓝手", color: "blue", colorClass: "text-blue-400", bgClass: "bg-blue-500/20", keywords: "疗愈、成就、知识", symbol: "🤲" },
  { name: "黄星星", color: "yellow", colorClass: "text-yellow-400", bgClass: "bg-yellow-500/20", keywords: "优雅、艺术、美", symbol: "⭐" },
  { name: "红月", color: "red", colorClass: "text-red-400", bgClass: "bg-red-500/20", keywords: "净化、流动、宇宙水", symbol: "🌗" },
  { name: "白狗", color: "white", colorClass: "text-slate-300", bgClass: "bg-slate-400/20", keywords: "爱、忠诚、心灵", symbol: "🐕" },
  { name: "蓝猴", color: "blue", colorClass: "text-blue-400", bgClass: "bg-blue-500/20", keywords: "魔法、游戏、幻象", symbol: "🐒" },
  { name: "黄人", color: "yellow", colorClass: "text-yellow-400", bgClass: "bg-yellow-500/20", keywords: "自由意志、智慧、影响", symbol: "🧑" },
  { name: "红天行者", color: "red", colorClass: "text-red-400", bgClass: "bg-red-500/20", keywords: "探索、空间、觉醒", symbol: "🚀" },
  { name: "白巫师", color: "white", colorClass: "text-slate-300", bgClass: "bg-slate-400/20", keywords: "永恒、魅力、感受力", symbol: "🧙" },
  { name: "蓝鹰", color: "blue", colorClass: "text-blue-400", bgClass: "bg-blue-500/20", keywords: "视野、创造、心智", symbol: "🦅" },
  { name: "黄战士", color: "yellow", colorClass: "text-yellow-400", bgClass: "bg-yellow-500/20", keywords: "智慧、勇气、质疑", symbol: "⚔️" },
  { name: "红地球", color: "red", colorClass: "text-red-400", bgClass: "bg-red-500/20", keywords: "演化、同步、导航", symbol: "🌍" },
  { name: "白镜", color: "white", colorClass: "text-slate-300", bgClass: "bg-slate-400/20", keywords: "无限、秩序、反射", symbol: "🪞" },
  { name: "蓝风暴", color: "blue", colorClass: "text-blue-400", bgClass: "bg-blue-500/20", keywords: "催化、能量、自我产生", symbol: "🌀" },
  { name: "黄太阳", color: "yellow", colorClass: "text-yellow-400", bgClass: "bg-yellow-500/20", keywords: "开悟、生命、宇宙火", symbol: "☀️" },
];

const TONES = [
  "磁性的", "月亮的", "电力的", "自存的", "超频的",
  "韵律的", "共振的", "银河的", "太阳的", "行星的",
  "光谱的", "水晶的", "宇宙的",
];

// ─── Mayan Calendar Calculation ──────────────────────────────

function calculateKin(year: number, month: number, day: number): number {
  // Correlation constant: July 26, 2025 = Kin 1 (new cycle starting point)
  // Using José Argüelles' Dreamspell system
  // Reference: July 26, 1987 = Kin 34 (Galactic Activation, Harmonic Convergence start)
  // We use a simpler calculation based on a known reference date
  // Jan 1, 2000 = Kin 111 (in Dreamspell system)

  const referenceDate = new Date(2000, 0, 1); // Jan 1, 2000
  const referenceKin = 111;
  const targetDate = new Date(year, month - 1, day);

  const diffTime = targetDate.getTime() - referenceDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let kin = ((referenceKin + diffDays - 1) % 260) + 1;
  if (kin <= 0) kin += 260;

  return kin;
}

function getSealIndex(kin: number): number {
  return (kin - 1) % 20;
}

function getToneIndex(kin: number): number {
  return (kin - 1) % 13;
}

// Cross pattern calculations (Dreamspell system)
function getSupportSeal(sealIdx: number): number {
  // Support: (19 - sealIdx) or symmetric partner
  return (19 - sealIdx + 20) % 20;
}

function getChallengeSeal(sealIdx: number): number {
  // Challenge/Antipode: seal + 10
  return (sealIdx + 10) % 20;
}

function getHiddenPowerSeal(sealIdx: number): number {
  // Hidden Power: 19 - sealIdx (complement)
  return (19 - sealIdx + 20) % 20;
}

function getGuideSeal(sealIdx: number, toneIdx: number): number {
  // Guide is determined by tone and seal color
  // Color: Red=0, White=1, Blue=2, Yellow=3
  const color = sealIdx % 4;
  const guideToneGroup = toneIdx % 5;

  // Guide seal table based on color and tone group
  const guideOffsets: Record<number, number[]> = {
    0: [0, 16, 12, 8, 4],   // Red seals
    1: [0, 16, 12, 8, 4],   // White seals
    2: [0, 16, 12, 8, 4],   // Blue seals
    3: [0, 16, 12, 8, 4],   // Yellow seals
  };

  const offset = guideOffsets[color][guideToneGroup];
  return (sealIdx + offset) % 20;
}

export default function MayanPage() {
  const { user } = useAuth();
  const [birthDate, setBirthDate] = useState(user?.birthDate || "");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/metaphysics/mayan", { birthDate });
      return res.json();
    },
    onSuccess: (data) => setResult(data.result),
  });

  if (result) {
    const mainSeal = SEALS[result.sealIndex] || SEALS[0];
    const guideSeal = SEALS[result.guideSealIndex] || SEALS[0];
    const supportSeal = SEALS[result.supportSealIndex] || SEALS[0];
    const challengeSeal = SEALS[result.challengeSealIndex] || SEALS[0];
    const hiddenPowerSeal = SEALS[result.hiddenPowerSealIndex] || SEALS[0];
    const tone = TONES[result.toneIndex] || TONES[0];

    return (
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4 overflow-x-hidden">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/discover">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-lg font-bold">玛雅历</h1>
        </div>

        {/* Kin Card */}
        <Card className="bg-gradient-to-br from-orange-500/15 to-red-500/15 border-0 p-6 text-center space-y-3">
          <div className="text-4xl">{mainSeal.symbol}</div>
          <h2 className="text-2xl font-bold">Kin {result.kin}</h2>
          <h3 className="text-lg font-semibold">{tone}{mainSeal.name}</h3>
          <Badge variant="secondary">调性 {result.toneIndex + 1} · 图腾 {result.sealIndex + 1}</Badge>
        </Card>

        {/* Cross Pattern */}
        <Card className="bg-transparent border-0 p-4 space-y-4">
          <h3 className="font-semibold text-center">十字图腾</h3>

          <div className="relative w-full max-w-[280px] mx-auto" style={{ height: 280 }}>
            {/* Guide (top) */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 text-center">
              <div className={`w-14 h-14 rounded-full ${guideSeal.bgClass} flex items-center justify-center mx-auto`}>
                <span className="text-xl">{guideSeal.symbol}</span>
              </div>
              <p className="text-xs font-semibold mt-1">{guideSeal.name}</p>
              <p className="text-[10px] text-muted-foreground">指引</p>
            </div>

            {/* Support (left) */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-center">
              <div className={`w-14 h-14 rounded-full ${supportSeal.bgClass} flex items-center justify-center mx-auto`}>
                <span className="text-xl">{supportSeal.symbol}</span>
              </div>
              <p className="text-xs font-semibold mt-1">{supportSeal.name}</p>
              <p className="text-[10px] text-muted-foreground">支持</p>
            </div>

            {/* Main (center) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <div className={`w-16 h-16 rounded-full ${mainSeal.bgClass} border-2 border-primary/30 flex items-center justify-center mx-auto`}>
                <span className="text-2xl">{mainSeal.symbol}</span>
              </div>
              <p className="text-xs font-bold mt-1">{mainSeal.name}</p>
              <p className="text-[10px] text-primary">主图腾</p>
            </div>

            {/* Challenge (right) */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 text-center">
              <div className={`w-14 h-14 rounded-full ${challengeSeal.bgClass} flex items-center justify-center mx-auto`}>
                <span className="text-xl">{challengeSeal.symbol}</span>
              </div>
              <p className="text-xs font-semibold mt-1">{challengeSeal.name}</p>
              <p className="text-[10px] text-muted-foreground">挑战</p>
            </div>

            {/* Hidden Power (bottom) */}
            <div className="absolute left-1/2 bottom-0 -translate-x-1/2 text-center">
              <div className={`w-14 h-14 rounded-full ${hiddenPowerSeal.bgClass} flex items-center justify-center mx-auto`}>
                <span className="text-xl">{hiddenPowerSeal.symbol}</span>
              </div>
              <p className="text-xs font-semibold mt-1">{hiddenPowerSeal.name}</p>
              <p className="text-[10px] text-muted-foreground">推动</p>
            </div>

            {/* Connecting lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 280 280">
              <line x1="140" y1="70" x2="140" y2="110" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
              <line x1="140" y1="170" x2="140" y2="210" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
              <line x1="70" y1="140" x2="110" y2="140" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
              <line x1="170" y1="140" x2="210" y2="140" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
            </svg>
          </div>
        </Card>

        {/* Totem details */}
        <Card className="bg-transparent border-0 p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" /> 图腾详解
          </h3>
          {[
            { label: "主图腾", seal: mainSeal, desc: "你的核心本质和根本能量" },
            { label: "指引", seal: guideSeal, desc: "引导你前进的更高力量" },
            { label: "支持", seal: supportSeal, desc: "支撑你的友善能量" },
            { label: "挑战", seal: challengeSeal, desc: "需要整合的对立力量" },
            { label: "推动", seal: hiddenPowerSeal, desc: "隐藏的力量与天赋" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 pb-3 border-b border-border/30 last:border-0 last:pb-0">
              <div className={`w-8 h-8 rounded-full ${item.seal.bgClass} flex items-center justify-center flex-shrink-0`}>
                <span>{item.seal.symbol}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{item.label}</span>
                  <span className={`text-xs ${item.seal.colorClass}`}>{item.seal.name}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{item.seal.keywords}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </Card>

        {/* AI Interpretation */}
        {result.interpretation && (
          <Card className="bg-transparent border-0 p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> AI 深度解读
            </h3>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {result.interpretation}
            </div>
          </Card>
        )}

        <p className="text-xs text-center text-muted-foreground">
          基于 Dreamspell 体系，仅供娱乐参考
        </p>

        <Button variant="outline" className="w-full" onClick={() => setResult(null)}>
          重新分析
        </Button>
      </div>
    );
  }

  // ─── Landing Page ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-6 overflow-x-hidden">
      <div className="flex items-center gap-3">
        <Link href="/discover">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-lg font-bold">玛雅历分析</h1>
      </div>

      <div className="text-center space-y-4 py-8">
        <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
          <span className="text-4xl">🌀</span>
        </div>
        <h2 className="text-xl font-bold">探索你的星际印记</h2>
        <p className="text-sm text-muted-foreground px-4">
          玛雅卓尔金历是260天的神圣周期，由20个太阳图腾和13个银河调性组成。通过你的出生日期，揭示你独特的星际印记(Kin)和十字图腾。
        </p>

        {/* Mini seal display */}
        <div className="flex flex-wrap justify-center gap-1 px-4">
          {SEALS.map((seal, i) => (
            <span key={i} className="text-sm" title={seal.name}>
              {seal.symbol}
            </span>
          ))}
        </div>
      </div>

      <Card className="bg-transparent border-0 p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">出生日期</label>
          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="bg-background"
          />
        </div>

        <Button
          className="w-full"
          disabled={!birthDate || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />正在计算星际印记...</>
          ) : (
            "开始分析"
          )}
        </Button>
        {mutation.isError && (
          <p className="text-sm text-red-400 text-center">{(mutation.error as Error).message}</p>
        )}
      </Card>
    </div>
  );
}
