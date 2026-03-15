import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import {
  TrendingUp,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Heart,
  Coins,
  Briefcase,
  GraduationCap,
  Users,
  Info,
  Star,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────
interface LifeFortunePoint {
  age: number;
  year: number;
  totalScore: number;  // 综合运势 0-100
  love: number;
  wealth: number;
  career: number;
  study: number;
  social: number;
  dayPillar: string;   // 日柱
  luckyElement: string;
  phase: string;       // 大运阶段
  insight: string;     // 简短点评
}

interface LifeFortuneData {
  birthYear: number;
  birthDate: string;
  element: string;
  dayMaster: string;
  points: LifeFortunePoint[];
  currentAge: number;
  peakAge: number;
  valleyAge: number;
}

const DIM_COLORS: Record<string, { color: string; label: string; icon: any }> = {
  love: { color: "#e84393", label: "爱情", icon: Heart },
  wealth: { color: "#f9a825", label: "财富", icon: Coins },
  career: { color: "#5c6bc0", label: "事业", icon: Briefcase },
  study: { color: "#26a69a", label: "学习", icon: GraduationCap },
  social: { color: "#ab47bc", label: "人际", icon: Users },
};

// ─── K-Line Candlestick Chart ───────────────────────────────
function KLineChart({
  points,
  currentAge,
  selectedAge,
  onSelectAge,
  activeDim,
}: {
  points: LifeFortunePoint[];
  currentAge: number;
  selectedAge: number | null;
  onSelectAge: (age: number) => void;
  activeDim: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 750;
  const H = 340;
  const padL = 40, padR = 20, padT = 30, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Get score for active dimension
  const getScore = (p: LifeFortunePoint) => {
    if (activeDim === "total") return p.totalScore;
    return (p as any)[activeDim] ?? p.totalScore;
  };

  const scores = points.map(getScore);
  const minScore = Math.max(0, Math.min(...scores) - 10);
  const maxScore = Math.min(100, Math.max(...scores) + 10);
  const range = maxScore - minScore || 1;

  const barW = Math.min(14, chartW / points.length * 0.6);
  const gap = chartW / points.length;

  const toX = (i: number) => padL + gap * i + gap / 2;
  const toY = (s: number) => padT + chartH - ((s - minScore) / range) * chartH;

  // Moving average (5-point) for smooth line
  const ma5 = points.map((_, i) => {
    const start = Math.max(0, i - 2);
    const end = Math.min(points.length, i + 3);
    const slice = scores.slice(start, end);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
  const maPath = ma5.map((s, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(s)}`).join(" ");

  // Grid lines
  const gridLevels = [20, 40, 60, 80, 100].filter(v => v >= minScore && v <= maxScore);

  // Active color
  const dimColor = activeDim === "total"
    ? "#f59e0b"
    : DIM_COLORS[activeDim]?.color || "#f59e0b";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ touchAction: "pan-y" }}
    >
      {/* Background */}
      <rect x={padL} y={padT} width={chartW} height={chartH} fill="none" />

      {/* Grid lines */}
      {gridLevels.map((v) => (
        <g key={v}>
          <line
            x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)}
            stroke="currentColor" className="text-border" strokeWidth="0.5" strokeDasharray="4 3"
          />
          <text x={padL - 6} y={toY(v) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
            {v}
          </text>
        </g>
      ))}

      {/* Current age indicator band */}
      {points.some(p => p.age === currentAge) && (() => {
        const idx = points.findIndex(p => p.age === currentAge);
        return (
          <rect
            x={toX(idx) - gap / 2}
            y={padT}
            width={gap}
            height={chartH}
            fill={dimColor}
            fillOpacity="0.06"
          />
        );
      })()}

      {/* Candlesticks */}
      {points.map((p, i) => {
        const score = getScore(p);
        const prevScore = i > 0 ? getScore(points[i - 1]) : score;
        const isUp = score >= prevScore;
        const isSelected = selectedAge === p.age;
        const isCurrent = p.age === currentAge;

        // Candlestick: body = current score vs prev score
        const openY = toY(prevScore);
        const closeY = toY(score);
        const topY = Math.min(openY, closeY);
        const bodyH = Math.max(2, Math.abs(openY - closeY));

        // Wick: high = max dimension, low = min dimension
        const dims = [p.love, p.wealth, p.career, p.study, p.social];
        const highVal = Math.max(...dims);
        const lowVal = Math.min(...dims);
        const wickTop = toY(highVal);
        const wickBottom = toY(lowVal);

        const fillColor = isUp ? "#26a69a" : "#ef5350";
        const x = toX(i);

        return (
          <g
            key={p.age}
            className="cursor-pointer"
            onClick={() => onSelectAge(p.age)}
            data-testid={`kline-bar-${p.age}`}
          >
            {/* Selection highlight */}
            {isSelected && (
              <rect
                x={x - gap / 2} y={padT}
                width={gap} height={chartH}
                fill={dimColor} fillOpacity="0.1"
                rx="2"
              />
            )}

            {/* Wick (shadow line) */}
            <line
              x1={x} y1={wickTop} x2={x} y2={wickBottom}
              stroke={fillColor} strokeWidth="1.5"
            />

            {/* Candlestick body */}
            <rect
              x={x - barW / 2} y={topY}
              width={barW} height={bodyH}
              fill={isUp ? fillColor : fillColor}
              rx="1.5"
              stroke={isSelected ? dimColor : "none"}
              strokeWidth={isSelected ? 2 : 0}
            />

            {/* Current age marker */}
            {isCurrent && (
              <circle cx={x} cy={toY(score) - 12} r="3" fill={dimColor} />
            )}
          </g>
        );
      })}

      {/* MA5 smooth line */}
      <path d={maPath} fill="none" stroke={dimColor} strokeWidth="1.5" strokeOpacity="0.6" />

      {/* X-axis labels (every 5 or 10 years) */}
      {points.map((p, i) => {
        const showLabel = p.age % 10 === 0 || p.age === currentAge || i === 0 || i === points.length - 1;
        if (!showLabel) return null;
        const isCurrent = p.age === currentAge;
        return (
          <text
            key={p.age}
            x={toX(i)}
            y={H - 8}
            textAnchor="middle"
            className={`text-[10px] ${isCurrent ? "fill-primary font-bold" : "fill-muted-foreground"}`}
          >
            {p.age}岁
          </text>
        );
      })}

      {/* "今" label at current age */}
      {points.some(p => p.age === currentAge) && (() => {
        const idx = points.findIndex(p => p.age === currentAge);
        return (
          <text
            x={toX(idx)} y={padT - 8}
            textAnchor="middle"
            className="fill-primary text-[10px] font-bold"
          >
            ▼ 今
          </text>
        );
      })()}
    </svg>
  );
}

// ─── Dimension Tabs ─────────────────────────────────────────
function DimTabs({ active, onChange }: { active: string; onChange: (d: string) => void }) {
  const tabs = [
    { key: "total", label: "综合", color: "#f59e0b" },
    ...Object.entries(DIM_COLORS).map(([k, v]) => ({ key: k, label: v.label, color: v.color })),
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
            active === t.key
              ? "text-white shadow-sm"
              : "text-muted-foreground bg-muted/50 hover:bg-muted"
          }`}
          style={active === t.key ? { backgroundColor: t.color } : {}}
          data-testid={`tab-dim-${t.key}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Age Detail Panel ───────────────────────────────────────
function AgeDetail({ point, prevPoint }: { point: LifeFortunePoint; prevPoint?: LifeFortunePoint }) {
  const delta = prevPoint ? point.totalScore - prevPoint.totalScore : 0;
  const TrendIcon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const trendColor = delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-muted-foreground";

  const getLabel = (s: number) => {
    if (s >= 85) return "大吉";
    if (s >= 70) return "吉";
    if (s >= 55) return "中吉";
    if (s >= 40) return "平";
    return "凶";
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="age-detail-card">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">{point.age}岁 · {point.year}年</span>
            <Badge variant="secondary" className="text-[10px]">{point.phase}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold" style={{
              color: point.totalScore >= 70 ? "#f59e0b" : point.totalScore >= 40 ? "#5c6bc0" : "#e84393"
            }}>
              {point.totalScore}
            </span>
            <span className="text-xs text-muted-foreground">分</span>
            {delta !== 0 && (
              <span className={`flex items-center text-xs ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                {Math.abs(delta)}
              </span>
            )}
          </div>
        </div>

        {/* Mini dimension bars */}
        <div className="grid grid-cols-5 gap-1.5">
          {Object.entries(DIM_COLORS).map(([key, { color, label, icon: Icon }]) => {
            const val = (point as any)[key] ?? 0;
            return (
              <div key={key} className="text-center">
                <div className="relative h-12 bg-muted/30 rounded-md overflow-hidden mb-1">
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-md transition-all"
                    style={{ height: `${val}%`, backgroundColor: color, opacity: 0.7 }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">
                    {val}
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Insight */}
        {point.insight && (
          <div className="bg-background/60 rounded-lg px-3 py-2">
            <p className="text-xs text-foreground/70 leading-relaxed">
              <Sparkles className="w-3 h-3 inline text-amber-500 mr-1" />
              {point.insight}
            </p>
          </div>
        )}

        {/* Day pillar & element */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {point.dayPillar && <span>日柱: {point.dayPillar}</span>}
          {point.luckyElement && <span>流年五行: {point.luckyElement}</span>}
          <span className="ml-auto">{getLabel(point.totalScore)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function LifeCurvePage() {
  const { user } = useAuth();
  const [activeDim, setActiveDim] = useState("total");
  const [selectedAge, setSelectedAge] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<LifeFortuneData>({
    queryKey: ["/api/fortune/life-curve"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/fortune/life-curve");
      return res.json();
    },
    enabled: !!user,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Auto-select current age
  useEffect(() => {
    if (data && selectedAge === null) {
      setSelectedAge(data.currentAge);
    }
  }, [data, selectedAge]);

  const selectedPoint = data?.points.find(p => p.age === selectedAge);
  const selectedIdx = data?.points.findIndex(p => p.age === selectedAge) ?? -1;
  const prevPoint = selectedIdx > 0 ? data?.points[selectedIdx - 1] : undefined;

  // Stats
  const peakPoint = data?.points.reduce((a, b) => (a.totalScore > b.totalScore ? a : b));
  const valleyPoint = data?.points.reduce((a, b) => (a.totalScore < b.totalScore ? a : b));

  if (!user?.birthDate) {
    return (
      <div className="flex-1 overflow-y-auto" data-testid="life-curve-no-birth">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            人生运势曲线
          </h1>
          <Card className="bg-gradient-to-br from-amber-500/10 to-primary/5">
            <CardContent className="py-8 text-center space-y-4">
              <Calendar className="w-12 h-12 text-amber-500 mx-auto" />
              <div>
                <p className="text-sm font-medium">需要出生日期才能生成运势曲线</p>
                <p className="text-xs text-muted-foreground mt-1">请先在设置中填写你的出生日期</p>
              </div>
              <Link href="/settings">
                <Button size="sm" data-testid="button-go-settings">去设置</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-[220px] w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data || !data.points.length) {
    return (
      <div className="flex-1 overflow-y-auto p-6 text-center">
        <p className="text-sm text-muted-foreground mt-20">运势曲线生成失败，请稍后重试</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" data-testid="life-curve-page">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            人生运势曲线
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.dayMaster && `日主${data.dayMaster}`}
            {data.element && ` · ${data.element}命`}
            {` · ${data.birthDate}`}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="py-2.5 text-center">
              <p className="text-[10px] text-green-600 dark:text-green-400">巅峰</p>
              <p className="text-sm font-bold">{peakPoint?.age}岁</p>
              <p className="text-[10px] text-muted-foreground">{peakPoint?.totalScore}分</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-2.5 text-center">
              <p className="text-[10px] text-primary">当前</p>
              <p className="text-sm font-bold">{data.currentAge}岁</p>
              <p className="text-[10px] text-muted-foreground">{data.points.find(p => p.age === data.currentAge)?.totalScore ?? "—"}分</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="py-2.5 text-center">
              <p className="text-[10px] text-red-500">低谷</p>
              <p className="text-sm font-bold">{valleyPoint?.age}岁</p>
              <p className="text-[10px] text-muted-foreground">{valleyPoint?.totalScore}分</p>
            </CardContent>
          </Card>
        </div>

        {/* Dimension Tabs */}
        <DimTabs active={activeDim} onChange={setActiveDim} />

        {/* K-Line Chart */}
        <Card className="overflow-hidden" data-testid="card-kline-chart">
          <CardContent className="p-2">
            <KLineChart
              points={data.points}
              currentAge={data.currentAge}
              selectedAge={selectedAge}
              onSelectAge={setSelectedAge}
              activeDim={activeDim}
            />
          </CardContent>
        </Card>

        {/* Age Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost" size="sm"
            disabled={selectedIdx <= 0}
            onClick={() => selectedIdx > 0 && setSelectedAge(data.points[selectedIdx - 1].age)}
            data-testid="button-prev-age"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" /> 上一年
          </Button>
          <span className="text-xs text-muted-foreground">点击K线查看详情</span>
          <Button
            variant="ghost" size="sm"
            disabled={selectedIdx >= data.points.length - 1}
            onClick={() => selectedIdx < data.points.length - 1 && setSelectedAge(data.points[selectedIdx + 1].age)}
            data-testid="button-next-age"
          >
            下一年 <ChevronRight className="w-4 h-4 ml-0.5" />
          </Button>
        </div>

        {/* Selected Age Detail */}
        {selectedPoint && (
          <AgeDetail point={selectedPoint} prevPoint={prevPoint} />
        )}

        {/* Disclaimer */}
        <div className="border-t border-border pt-3">
          <p className="text-[10px] text-center text-muted-foreground">
            ⚠️ 免责声明：基于八字命理学推算，仅供文化探索和娱乐参考。人生掌握在自己手中。
          </p>
        </div>
      </div>
    </div>
  );
}
