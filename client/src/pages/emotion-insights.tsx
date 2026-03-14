import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Activity,
  Heart,
  Calendar,
  FileText,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Smile,
  Frown,
  Meh,
  Zap,
  CloudRain,
  Flame,
  Leaf,
  Users,
} from "lucide-react";
import type { CommunityPost } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

// ─── Types ─────────────────────────────────────────────

interface TrendPoint {
  period: string;
  avgValence: number;
  avgArousal: number;
  avgDominance: number;
  count: number;
  topEmotion: string;
  topEmoji: string;
}

interface TrendsResponse {
  period: string;
  trend: TrendPoint[];
  totalPoints: number;
}

interface CalendarDay {
  day: number;
  avgValence: number;
  count: number;
  topEmotion: string;
  topEmoji: string;
}

interface CalendarResponse {
  year: number;
  month: number;
  days: CalendarDay[];
}

interface WeekReport {
  weekStart: string;
  weekEnd: string;
  analysisCount: number;
  avgValence: number;
  topEmotions: { name: string; count: number }[];
  insights: string[];
  suggestions: string[];
  mood: "positive" | "negative" | "neutral";
}

interface ReportResponse {
  reports: WeekReport[];
  totalAnalyses: number;
}

type EnrichedPost = CommunityPost & {
  authorNickname: string;
  authorAvatar: string | null;
};

interface EmotionStat {
  name: string;
  count: number;
  totalScore: number;
  avgScore: number;
  nameZh: string;
  emoji: string;
}

interface ValencePoint {
  createdAt: string;
  valence: number;
  arousal: number;
  primary: string;
}

interface EmotionStatsResponse {
  totalAnalyses: number;
  topEmotions: EmotionStat[];
  valenceTrend: ValencePoint[];
  avgValence: number;
}

// ─── Constants ─────────────────────────────────────────

const EMOTION_CATEGORIES = [
  { key: "焦虑", label: "焦虑", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
  { key: "开心", label: "开心", icon: Smile, color: "text-green-500", bg: "bg-green-500/10" },
  { key: "压力", label: "压力", icon: Flame, color: "text-red-500", bg: "bg-red-500/10" },
  { key: "悲伤", label: "悲伤", icon: CloudRain, color: "text-blue-500", bg: "bg-blue-500/10" },
  { key: "愤怒", label: "愤怒", icon: Frown, color: "text-orange-500", bg: "bg-orange-500/10" },
  { key: "平静", label: "平静", icon: Leaf, color: "text-teal-500", bg: "bg-teal-500/10" },
];

const MONTH_NAMES = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

// ─── Shared Components ─────────────────────────────────

function Sparkline({ points, width = 200, height = 40, color }: { points: number[]; width?: number; height?: number; color?: string }) {
  if (points.length < 2) return null;
  
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);

  const path = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * (height - 8) - 4;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  const fillPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  const strokeColor = color || "hsl(var(--primary))";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <defs>
        <linearGradient id={`sparkGrad-${color || "default"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#sparkGrad-${color || "default"})`} />
      <path d={path} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmotionFrequencyBar({ stat, maxCount }: { stat: EmotionStat; maxCount: number }) {
  const pct = (stat.count / maxCount) * 100;
  return (
    <div className="flex items-center gap-3" data-testid={`stat-${stat.name}`}>
      <span className="text-base">{stat.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium">{stat.nameZh}</span>
          <span className="text-[10px] text-muted-foreground">{stat.count}次 · 均强{Math.round(stat.avgScore * 100)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/60 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function valenceColor(v: number): string {
  if (v > 0.3) return "text-green-500";
  if (v > 0.1) return "text-green-400";
  if (v < -0.3) return "text-orange-500";
  if (v < -0.1) return "text-orange-400";
  return "text-muted-foreground";
}

function valenceBgColor(v: number): string {
  if (v > 0.3) return "bg-green-500";
  if (v > 0.1) return "bg-green-400";
  if (v < -0.3) return "bg-orange-500";
  if (v < -0.1) return "bg-orange-400";
  return "bg-muted-foreground/40";
}

function valenceLabel(v: number): string {
  if (v > 0.3) return "积极";
  if (v > 0.1) return "偏积极";
  if (v < -0.3) return "消极";
  if (v < -0.1) return "偏消极";
  return "中性";
}

// ─── Tab 1: 情绪趋势 ───────────────────────────────────

function EmotionTrendsTab() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  
  const { data: stats, isLoading: statsLoading } = useQuery<EmotionStatsResponse>({
    queryKey: ["/api/emotion-stats"],
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery<TrendsResponse>({
    queryKey: ["/api/emotion-channel/trends", period],
    queryFn: async () => {
      const res = await fetch(`/api/emotion-channel/trends?period=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const isLoading = statsLoading || trendsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const hasData = stats && stats.totalAnalyses > 0;
  const trend = trendsData?.trend || [];

  return (
    <div className="space-y-4">
      {!hasData ? (
        <Card className="p-8 text-center">
          <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">暂无趋势数据</p>
          <p className="text-xs text-muted-foreground/60">与 HeartAI 对话后，这里会显示情绪趋势图</p>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-primary">{stats!.totalAnalyses}</div>
              <div className="text-[10px] text-muted-foreground mt-1">分析次数</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold flex items-center justify-center gap-1">
                {stats!.avgValence > 0.1 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : stats!.avgValence < -0.1 ? (
                  <TrendingDown className="w-5 h-5 text-orange-500" />
                ) : (
                  <Minus className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {stats!.avgValence > 0.1 ? "整体偏积极" : stats!.avgValence < -0.1 ? "整体偏消极" : "整体中性"}
              </div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl">{stats!.topEmotions[0]?.emoji || "😌"}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{stats!.topEmotions[0]?.nameZh || "平静"}</div>
            </Card>
          </div>

          {/* Period toggle */}
          <div className="flex items-center gap-2">
            {(["day", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  period === p
                    ? "border-primary bg-primary/10 text-foreground font-medium"
                    : "border-border hover:border-primary/30 text-muted-foreground"
                }`}
                data-testid={`button-period-${p}`}
              >
                {p === "day" ? "按天" : p === "week" ? "按周" : "按月"}
              </button>
            ))}
          </div>

          {/* Trend chart */}
          {trend.length >= 2 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">情绪效价趋势</span>
                <Badge variant="outline" className="text-[10px]">{trend.length} 个{period === "day" ? "天" : period === "week" ? "周" : "月"}</Badge>
              </div>
              <div className="h-14">
                <Sparkline
                  points={trend.map(t => t.avgValence)}
                  width={300}
                  height={56}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>负面 ←</span>
                <span>→ 正面</span>
              </div>
            </Card>
          )}

          {/* Trend detail rows */}
          {trend.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">各时段概览</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {trend.slice().reverse().map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{t.topEmoji}</span>
                      <div>
                        <div className="text-xs font-medium">{t.period}</div>
                        <div className="text-[10px] text-muted-foreground">{t.topEmotion} · {t.count}次分析</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-medium ${valenceColor(t.avgValence)}`}>
                        {valenceLabel(t.avgValence)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        效价 {t.avgValence > 0 ? "+" : ""}{t.avgValence}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Emotion frequency */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">情绪频次排行</span>
            </div>
            <div className="space-y-3">
              {stats!.topEmotions.map((stat) => (
                <EmotionFrequencyBar
                  key={stat.name}
                  stat={stat}
                  maxCount={stats!.topEmotions[0]?.count || 1}
                />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Tab 2: 情感报告 ───────────────────────────────────

function EmotionReportsTab() {
  const { data, isLoading } = useQuery<ReportResponse>({
    queryKey: ["/api/emotion-channel/report"],
    queryFn: async () => {
      const res = await fetch("/api/emotion-channel/report", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  const reports = data?.reports || [];

  if (reports.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-1">暂无情感报告</p>
        <p className="text-xs text-muted-foreground/60">持续与 HeartAI 对话，系统会自动生成周报</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          共 {data!.totalAnalyses} 次分析 · {reports.length} 份周报
        </div>
      </div>

      {reports.map((report, i) => {
        const moodIcon = report.mood === "positive" ? (
          <Smile className="w-4 h-4 text-green-500" />
        ) : report.mood === "negative" ? (
          <Frown className="w-4 h-4 text-orange-500" />
        ) : (
          <Meh className="w-4 h-4 text-muted-foreground" />
        );

        return (
          <Card key={i} className="p-4" data-testid={`card-report-${i}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {moodIcon}
                <span className="text-sm font-medium">
                  {report.weekStart.slice(5)} ~ {report.weekEnd.slice(5)}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {report.analysisCount} 次分析
              </Badge>
            </div>

            {/* Valence indicator */}
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-2 flex-1 rounded-full overflow-hidden bg-muted`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    report.mood === "positive" ? "bg-green-500" : report.mood === "negative" ? "bg-orange-500" : "bg-muted-foreground/50"
                  }`}
                  style={{ width: `${Math.min(100, Math.abs(report.avgValence) * 100 + 30)}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${
                report.mood === "positive" ? "text-green-500" : report.mood === "negative" ? "text-orange-500" : "text-muted-foreground"
              }`}>
                {valenceLabel(report.avgValence)}
              </span>
            </div>

            {/* Top emotions */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {report.topEmotions.map((e, j) => (
                <Badge key={j} variant="secondary" className="text-[10px] font-normal">
                  {e.name} ({e.count})
                </Badge>
              ))}
            </div>

            {/* Insights */}
            {report.insights.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] text-muted-foreground mb-1 font-medium">洞察</div>
                <ul className="space-y-1">
                  {report.insights.map((ins, j) => (
                    <li key={j} className="text-xs text-muted-foreground leading-relaxed flex gap-1.5">
                      <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                      <span>{ins}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {report.suggestions.length > 0 && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-1 font-medium">建议</div>
                <ul className="space-y-1">
                  {report.suggestions.map((sug, j) => (
                    <li key={j} className="text-xs text-muted-foreground leading-relaxed flex gap-1.5">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✦</span>
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── Tab 3: 社区话题 ───────────────────────────────────

function EmotionCommunityTab() {
  const [emotionFilter, setEmotionFilter] = useState<string | null>(null);
  const { user } = useAuth();

  const { data: posts = [], isLoading } = useQuery<EnrichedPost[]>({
    queryKey: ["/api/emotion-channel/community", emotionFilter],
    queryFn: async () => {
      const url = emotionFilter
        ? `/api/emotion-channel/community?emotion=${encodeURIComponent(emotionFilter)}`
        : "/api/emotion-channel/community";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: likedIds = [] } = useQuery<string[]>({
    queryKey: ["/api/community/my-likes"],
    enabled: !!user,
  });
  const likedSet = new Set(likedIds);

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await apiRequest("POST", `/api/community/posts/${postId}/like`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emotion-channel/community"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/my-likes"] });
    },
  });

  return (
    <div className="space-y-4">
      {/* Emotion category filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setEmotionFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap flex items-center gap-1 ${
            emotionFilter === null
              ? "border-primary bg-primary/10 text-foreground font-medium"
              : "border-border hover:border-primary/30 text-muted-foreground"
          }`}
          data-testid="button-emotion-all"
        >
          <Users className="w-3 h-3" />
          全部
        </button>
        {EMOTION_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => setEmotionFilter(emotionFilter === cat.key ? null : cat.key)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap flex items-center gap-1 ${
                emotionFilter === cat.key
                  ? "border-primary bg-primary/10 text-foreground font-medium"
                  : "border-border hover:border-primary/30 text-muted-foreground"
              }`}
              data-testid={`button-emotion-${cat.key}`}
            >
              <Icon className={`w-3 h-3 ${emotionFilter === cat.key ? cat.color : ""}`} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">
            {emotionFilter ? `暂无与「${emotionFilter}」相关的帖子` : "暂无社区帖子"}
          </p>
          <p className="text-xs text-muted-foreground/60">发布帖子分享你的感受吧</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const isLiked = likedSet.has(post.id);
            const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: zhCN });
            return (
              <Card key={post.id} className="p-4 transition-all hover:shadow-sm" data-testid={`card-epost-${post.id}`}>
                {/* Author */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-primary">
                      {post.authorNickname.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium truncate block">{post.authorNickname}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                  </div>
                </div>

                {/* Content */}
                <Link href={`/community/${post.id}`}>
                  <p className="text-sm leading-relaxed mb-2 cursor-pointer hover:text-foreground/80 whitespace-pre-wrap">
                    {post.content.length > 180 ? post.content.slice(0, 180) + "..." : post.content}
                  </p>
                </Link>

                {/* Actions */}
                <div className="flex items-center gap-4 text-muted-foreground">
                  <button
                    onClick={() => likeMutation.mutate(post.id)}
                    className={`inline-flex items-center gap-1 text-xs transition-colors ${
                      isLiked ? "text-red-500" : "hover:text-red-400"
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5" fill={isLiked ? "currentColor" : "none"} />
                    <span>{post.likeCount}</span>
                  </button>
                  <Link href={`/community/${post.id}`}>
                    <span className="inline-flex items-center gap-1 text-xs hover:text-foreground cursor-pointer">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{post.commentCount}</span>
                    </span>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: 情绪日历 (农历+节气增强) ───────────────────────

interface LunarDayInfo {
  day: number;
  lunarDay: string;
  lunarMonth: string;
  solarTerm: string | null;
  isFirstLunarDay: boolean;
}

interface LunarMonthResponse {
  year: number;
  month: number;
  days: LunarDayInfo[];
}

function EmotionCalendarTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // 情绪日历数据
  const { data, isLoading } = useQuery<CalendarResponse>({
    queryKey: ["/api/emotion-channel/calendar", year, month],
    queryFn: async () => {
      const res = await fetch(`/api/emotion-channel/calendar?year=${year}&month=${month}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // 农历+节气数据
  const { data: lunarData } = useQuery<LunarMonthResponse>({
    queryKey: ["/api/culture/lunar-month", year, month],
    queryFn: async () => {
      const res = await fetch(`/api/culture/lunar-month?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Build lunar lookup map
  const lunarMap = new Map<number, LunarDayInfo>();
  if (lunarData?.days) {
    for (const d of lunarData.days) lunarMap.set(d.day, d);
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // Convert to Mon=0
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayMap = new Map<number, CalendarDay>();
  if (data?.days) {
    for (const d of data.days) dayMap.set(d.day, d);
  }

  const cells: (CalendarDay | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(dayMap.get(d) || { day: d, avgValence: 0, count: 0, topEmotion: "", topEmoji: "" });
  }

  // Summary
  const activeDays = data?.days?.filter(d => d.count > 0) || [];
  const overallValence = activeDays.length > 0
    ? activeDays.reduce((s, d) => s + d.avgValence, 0) / activeDays.length
    : 0;

  // Count solar terms this month
  const solarTermsThisMonth = lunarData?.days?.filter(d => d.solarTerm) || [];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth} data-testid="button-prev-month">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <div className="text-sm font-medium">
              {year}年 {MONTH_NAMES[month - 1]}
            </div>
            {lunarData?.days && lunarData.days.length > 0 && (
              <div className="text-[10px] text-muted-foreground">
                农历{lunarData.days[0].lunarMonth}
                {lunarData.days[lunarData.days.length - 1].lunarMonth !== lunarData.days[0].lunarMonth
                  ? ` ~ ${lunarData.days[lunarData.days.length - 1].lunarMonth}` : ""}
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth} data-testid="button-next-month">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-primary">{activeDays.length}</div>
          <div className="text-[10px] text-muted-foreground">记录天数</div>
        </Card>
        <Card className="p-3 text-center">
          <div className={`text-lg font-bold ${activeDays.length > 0 ? valenceColor(overallValence) : ""}`}>
            {activeDays.length > 0 ? valenceLabel(overallValence) : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">月均情绪</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {solarTermsThisMonth.length}
          </div>
          <div className="text-[10px] text-muted-foreground">本月节气</div>
        </Card>
      </div>

      {/* Solar term badges */}
      {solarTermsThisMonth.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {solarTermsThisMonth.map((d) => (
            <Badge key={d.day} variant="outline" className="text-[10px] gap-1 border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30">
              <Leaf className="w-3 h-3" />
              {d.solarTerm} · {month}/{d.day}
            </Badge>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card className="p-3">
          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="text-center text-[10px] text-muted-foreground font-medium py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }
              const hasData = cell.count > 0;
              const isToday = cell.day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
              const lunar = lunarMap.get(cell.day);
              const hasSolarTerm = !!lunar?.solarTerm;
              const isLunarFirst = !!lunar?.isFirstLunarDay;

              // Show: solar term name > 初一(月名) > 农历日
              const lunarLabel = hasSolarTerm
                ? lunar!.solarTerm!
                : isLunarFirst
                  ? lunar!.lunarMonth
                  : lunar?.lunarDay || "";

              return (
                <div
                  key={`day-${cell.day}`}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-colors ${
                    isToday ? "ring-1 ring-primary" : ""
                  } ${hasSolarTerm ? "bg-amber-50 dark:bg-amber-950/20" : ""} ${hasData && !hasSolarTerm ? "bg-accent/30 hover:bg-accent/50" : ""} ${isLunarFirst && !hasSolarTerm ? "bg-red-50/50 dark:bg-red-950/10" : ""}`}
                  title={hasData
                    ? `${cell.topEmotion} · ${cell.count}条记录 · 效价${cell.avgValence}${lunar ? ` · ${lunar.lunarMonth}${lunar.lunarDay}` : ""}${hasSolarTerm ? ` · ${lunar!.solarTerm}` : ""}`
                    : lunar ? `${lunar.lunarMonth}${lunar.lunarDay}${hasSolarTerm ? ` · ${lunar.solarTerm}` : ""}` : ""}
                  data-testid={`calendar-day-${cell.day}`}
                >
                  {/* Gregorian date */}
                  <span className={`text-[11px] leading-none ${isToday ? "font-bold text-primary" : hasData ? "font-medium" : "text-muted-foreground"}`}>
                    {cell.day}
                  </span>

                  {/* Lunar / solar term sublabel */}
                  {lunarLabel && (
                    <span className={`text-[8px] leading-none mt-0.5 truncate max-w-full px-0.5 ${
                      hasSolarTerm
                        ? "text-amber-600 dark:text-amber-400 font-medium"
                        : isLunarFirst
                          ? "text-red-500 dark:text-red-400 font-medium"
                          : "text-muted-foreground/70"
                    }`}>
                      {lunarLabel}
                    </span>
                  )}

                  {/* Emotion indicator */}
                  {hasData && (
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${valenceBgColor(cell.avgValence)}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center flex-wrap gap-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>积极</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
          <span>中性</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span>消极</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-500/30" style={{width: 8, height: 8}} />
          <span>节气</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-red-500 font-medium">初一</span>
          <span>农历月首</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────

export default function EmotionInsightsPage() {
  const [activeTab, setActiveTab] = useState("trends");

  return (
    <div className="flex-1 overflow-y-auto" data-testid="emotion-channel-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">情感频道</h1>
            <p className="text-xs text-muted-foreground">多维度情绪分析 · 趋势追踪 · 社区话题</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-5">
            <TabsTrigger value="trends" className="text-xs gap-1" data-testid="tab-trends">
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">情绪趋势</span>
              <span className="sm:hidden">趋势</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs gap-1" data-testid="tab-reports">
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">情感报告</span>
              <span className="sm:hidden">报告</span>
            </TabsTrigger>
            <TabsTrigger value="community" className="text-xs gap-1" data-testid="tab-community">
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">社区话题</span>
              <span className="sm:hidden">话题</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs gap-1" data-testid="tab-calendar">
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">情绪日历</span>
              <span className="sm:hidden">日历</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <EmotionTrendsTab />
          </TabsContent>

          <TabsContent value="reports">
            <EmotionReportsTab />
          </TabsContent>

          <TabsContent value="community">
            <EmotionCommunityTab />
          </TabsContent>

          <TabsContent value="calendar">
            <EmotionCalendarTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
