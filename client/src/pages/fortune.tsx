import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import {
  Star,
  Heart,
  Briefcase,
  Coins,
  GraduationCap,
  Users,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Compass,
} from "lucide-react";
import CryptoFortuneSection from "@/components/CryptoFortuneSection";
import { FortuneShareButton } from "@/components/share-cards";

interface FortuneData {
  totalScore: number;
  dimensions: {
    love: number;
    wealth: number;
    career: number;
    study: number;
    social: number;
  };
  luckyColor: string;
  luckyNumber: number;
  luckyDirection: string;
  aiInsight: string;
  date: string;
  zodiac?: string;
  classicalQuote?: { text: string; source: string; note: string };
}

const DIMENSION_CONFIG = [
  { key: "love" as const, label: "爱情", icon: Heart, color: "hsl(330, 55%, 55%)" },
  { key: "wealth" as const, label: "财富", icon: Coins, color: "hsl(35, 85%, 55%)" },
  { key: "career" as const, label: "事业", icon: Briefcase, color: "hsl(235, 65%, 55%)" },
  { key: "study" as const, label: "学习", icon: GraduationCap, color: "hsl(160, 50%, 45%)" },
  { key: "social" as const, label: "人际", icon: Users, color: "hsl(280, 50%, 55%)" },
];

function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const r = (size - 20) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  const getColor = (s: number) => {
    if (s >= 80) return "hsl(35, 85%, 55%)";
    if (s >= 60) return "hsl(235, 65%, 55%)";
    if (s >= 40) return "hsl(160, 50%, 45%)";
    return "hsl(330, 55%, 55%)";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={getColor(score)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color: getColor(score) }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">综合运势</span>
      </div>
    </div>
  );
}

function DimensionBar({ label, score, icon: Icon, color }: {
  label: string;
  score: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-16 flex-shrink-0">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${score}%`,
            backgroundColor: color,
          }}
        />
        <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-semibold" style={{
          color: score > 50 ? "white" : "hsl(var(--foreground))"
        }}>
          {score}
        </span>
      </div>
    </div>
  );
}

function FortuneHistoryChart({ history }: { history: { date: string; score: number }[] }) {
  if (history.length < 2) return null;
  const W = 280, H = 64, PAD = 8;
  const min = Math.min(...history.map(d => d.score));
  const max = Math.max(...history.map(d => d.score));
  const range = max - min || 1;
  const pts = history.map((d, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((d.score - min) / range) * (H - PAD * 2);
    return { x, y, ...d };
  });
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = `M${pts[0].x},${H - PAD} ` + pts.map(p => `L${p.x},${p.y}`).join(" ") + ` L${pts[pts.length - 1].x},${H - PAD} Z`;
  const latest = pts[pts.length - 1];
  const getColor = (s: number) => s >= 80 ? "#f59e0b" : s >= 60 ? "#6366f1" : "#f43f5e";
  const color = getColor(latest.score);
  const trend = latest.score - pts[0].score;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">近{history.length}天运势走势</span>
        <span className="text-xs font-medium" style={{ color }}>
          {trend > 3 ? "↑ 上升中" : trend < -3 ? "↓ 下降中" : "→ 平稳"}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: H }}>
        <defs>
          <linearGradient id="fhg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#fhg)" />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5}
            fill={i === pts.length - 1 ? color : "hsl(var(--background))"}
            stroke={color} strokeWidth={i === pts.length - 1 ? 0 : 1.5} />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">{history[0].date.slice(5)}</span>
        <span className="text-[10px] text-muted-foreground">{history[history.length - 1].date.slice(5)}</span>
      </div>
    </div>
  );
}

function useLiveDate() {
  const fmt = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return {
      dateKey: `${y}-${m}-${d}`,
      display: `${y}年${parseInt(m)}月${parseInt(d)}日 周${weekdays[now.getDay()]}`,
    };
  };
  const [d, setD] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setD(fmt()), 60_000);
    return () => clearInterval(id);
  }, []);
  return d;
}

export default function FortunePage() {
  const { user } = useAuth();
  const liveDate = useLiveDate();

  const { data: fortune, isLoading, refetch, isFetching } = useQuery<FortuneData>({
    queryKey: ["/api/fortune/today"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: historyData } = useQuery<{ history: { date: string; score: number }[] }>({
    queryKey: ["/api/fortune/history"],
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  // Auto-refresh fortune when date changes (midnight crossing)
  const lastDateRef = useState(() => liveDate.dateKey)[0];
  useEffect(() => {
    if (liveDate.dateKey !== lastDateRef) refetch();
  }, [liveDate.dateKey]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const data = fortune || {
    totalScore: 0,
    dimensions: { love: 0, wealth: 0, career: 0, study: 0, social: 0 },
    luckyColor: "",
    luckyNumber: 0,
    luckyDirection: "",
    aiInsight: "正在加载运势数据...",
    date: new Date().toISOString().split("T")[0],
  };

  const getScoreLabel = (s: number) => {
    if (s >= 90) return "大吉";
    if (s >= 75) return "吉";
    if (s >= 60) return "中吉";
    if (s >= 40) return "平";
    return "需注意";
  };

  return (
    <div className="flex-1 overflow-y-auto" data-testid="fortune-page">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              今日运势
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {liveDate.display} {data.zodiac ? `· ${data.zodiac}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {fortune && (
              <FortuneShareButton
                fortune={data}
                nickname={user?.nickname || "\u89c2\u661f\u7528\u6237"}
                zodiac={data.zodiac || user?.zodiacSign || undefined}
              />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh-fortune"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>
        </div>

        {/* Score Ring Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-card to-primary/5" data-testid="card-fortune-score">
          <CardContent className="flex flex-col items-center py-8 gap-4">
            <ScoreRing score={data.totalScore} />
            <Badge
              variant="secondary"
              className="text-sm px-4 py-1"
              style={{
                backgroundColor: data.totalScore >= 75 ? "hsl(35, 85%, 55%)" : data.totalScore >= 40 ? "hsl(235, 65%, 55%)" : "hsl(330, 55%, 55%)",
                color: "white",
              }}
            >
              {getScoreLabel(data.totalScore)}
            </Badge>
          </CardContent>
        </Card>

        {/* Fortune History */}
        {historyData && historyData.history.length >= 2 && (
          <Card>
            <CardContent className="py-4 px-4">
              <FortuneHistoryChart history={historyData.history} />
            </CardContent>
          </Card>
        )}

        {/* Dimensions */}
        <Card data-testid="card-fortune-dimensions">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              五维分析
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DIMENSION_CONFIG.map((dim) => (
              <DimensionBar
                key={dim.key}
                label={dim.label}
                score={data.dimensions[dim.key]}
                icon={dim.icon}
                color={dim.color}
              />
            ))}
          </CardContent>
        </Card>

        {/* Crypto Fortune */}
        <CryptoFortuneSection />

        {/* Lucky Info */}
        {(data.luckyColor || data.luckyNumber || data.luckyDirection) && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <CardContent className="py-4">
                <span className="text-xs text-muted-foreground">幸运色</span>
                <p className="font-semibold text-sm mt-1">{data.luckyColor || "—"}</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="py-4">
                <span className="text-xs text-muted-foreground">幸运数字</span>
                <p className="font-semibold text-sm mt-1">{data.luckyNumber || "—"}</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="py-4">
                <span className="text-xs text-muted-foreground">幸运方位</span>
                <p className="font-semibold text-sm mt-1">{data.luckyDirection || "—"}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Insight */}
        <Card className="bg-primary/5 border-primary/10" data-testid="card-fortune-insight">
          <CardContent className="py-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Star className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary mb-1">AI 解读</p>
                <p className="text-sm leading-relaxed text-foreground/80">{data.aiInsight}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Classical Quote */}
        {data.classicalQuote && (
          <Card className="border-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-amber-900/15 dark:to-orange-900/10">
            <CardContent className="py-5">
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium tracking-[2px] uppercase mb-3">今日古典金句</p>
              <blockquote className="relative pl-3 border-l-2 border-amber-400/60">
                <p className="text-sm font-medium leading-relaxed text-foreground/90 mb-1.5">
                  {data.classicalQuote.text}
                </p>
                <footer className="text-[11px] text-muted-foreground">— {data.classicalQuote.source}</footer>
              </blockquote>
              <p className="text-xs text-foreground/55 mt-3 leading-relaxed italic">
                {data.classicalQuote.note}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/zodiac">
            <Card className="cursor-pointer hover:bg-accent/30 transition-colors">
              <CardContent className="py-4 flex items-center gap-3">
                <Star className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">星座解读</p>
                  <p className="text-xs text-muted-foreground">日/月/升分析</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/mbti">
            <Card className="cursor-pointer hover:bg-accent/30 transition-colors">
              <CardContent className="py-4 flex items-center gap-3">
                <Compass className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">MBTI人格</p>
                  <p className="text-xs text-muted-foreground">发现你的人格</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
