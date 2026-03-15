import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles,
  Heart,
  Briefcase,
  Coins,
  GraduationCap,
  Users,
  TrendingUp,
  Zap,
  MessageSquare,
  ThumbsUp,
  Star,
  Calendar,
  Layers,
  Compass,
  Brain,
  BookHeart,
  Gauge,
  ArrowRight,
  MessageCircle,
  RefreshCw,
  Clock,
  Scroll,
  MapPin,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────
interface FortuneData {
  totalScore: number;
  dimensions: { love: number; wealth: number; career: number; study: number; social: number };
  luckyColor: string;
  luckyNumber: number;
  luckyDirection: string;
  aiInsight: string;
  date: string;
  zodiac?: string;
}

interface DashboardData {
  date: string;
  lunar: { lunarDate: string; yearName: string; dayName: string; yi?: string } | null;
  personality: { element?: string; mbtiType?: string; zodiacSign?: string } | null;
  moodTrend: { score: number; tags: string; date: string }[];
  hotPosts: { id: string; content: string; tag: string; likeCount: number; commentCount: number; authorName: string; createdAt: string }[];
  avatar: { name: string; isActive: boolean; recentActions: { type: string; innerThought: string; createdAt: string }[] } | null;
  stats: { totalPosts: number; totalMoodEntries: number };
}

const ELEMENT_EMOJI: Record<string, string> = { "金": "🪙", "木": "🌿", "水": "💧", "火": "🔥", "土": "🪨" };
const ELEMENT_COLOR: Record<string, string> = {
  "金": "hsl(45, 80%, 55%)",
  "木": "hsl(140, 50%, 45%)",
  "水": "hsl(210, 60%, 55%)",
  "火": "hsl(10, 75%, 55%)",
  "土": "hsl(30, 45%, 50%)",
};

const TAG_LABELS: Record<string, string> = {
  sharing: "分享",
  question: "提问",
  encouragement: "鼓励",
  resource: "资源",
};

const DIMENSION_CONFIG = [
  { key: "love" as const, label: "爱情", icon: Heart, color: "hsl(330, 55%, 55%)" },
  { key: "wealth" as const, label: "财富", icon: Coins, color: "hsl(35, 85%, 55%)" },
  { key: "career" as const, label: "事业", icon: Briefcase, color: "hsl(235, 65%, 55%)" },
  { key: "study" as const, label: "学习", icon: GraduationCap, color: "hsl(160, 50%, 45%)" },
  { key: "social" as const, label: "人际", icon: Users, color: "hsl(280, 50%, 55%)" },
];

// ─── Dashboard Clock ────────────────────────────────────────
function DashboardClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return (
    <div className="flex items-baseline gap-0.5">
      <span className="text-3xl font-black tabular-nums">{h}</span>
      <span className="text-2xl font-light opacity-50 animate-pulse">:</span>
      <span className="text-3xl font-black tabular-nums">{m}</span>
      <span className="text-lg font-medium opacity-40 ml-0.5 tabular-nums">{s}</span>
    </div>
  );
}

// ─── Mini Score Ring ────────────────────────────────────────
function MiniScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={getColor(score)} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold" style={{ color: getColor(score) }}>{score}</span>
        <span className="text-[9px] text-muted-foreground">综合</span>
      </div>
    </div>
  );
}

// ─── Mood Sparkline ─────────────────────────────────────────
function MoodSparkline({ data }: { data: { score: number; date: string }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
        还没有情绪记录
      </div>
    );
  }

  const sorted = [...data].reverse(); // oldest first
  const max = 10;
  const min = 0;
  const w = 200;
  const h = 48;
  const pad = 4;

  const points = sorted.map((d, i) => {
    const x = pad + (i / Math.max(sorted.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((d.score - min) / (max - min)) * (h - pad * 2);
    return `${x},${y}`;
  });

  const avg = sorted.reduce((a, b) => a + b.score, 0) / sorted.length;

  return (
    <div className="flex items-center gap-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="flex-1 h-12">
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {sorted.map((d, i) => {
          const x = pad + (i / Math.max(sorted.length - 1, 1)) * (w - pad * 2);
          const y = h - pad - ((d.score - min) / (max - min)) * (h - pad * 2);
          return <circle key={i} cx={x} cy={y} r="3" fill="hsl(var(--primary))" />;
        })}
      </svg>
      <div className="flex flex-col items-center flex-shrink-0">
        <span className="text-lg font-bold text-primary">{avg.toFixed(1)}</span>
        <span className="text-[9px] text-muted-foreground">平均</span>
      </div>
    </div>
  );
}

// ─── Quick Action Grid ──────────────────────────────────────
const QUICK_ACTIONS = [
  { path: "/fortune", label: "今日运势", icon: Gauge, bg: "#e8922e", bgLight: "#f0a544" },
  { path: "/tarot", label: "塔罗占卜", icon: Layers, bg: "#9b59b6", bgLight: "#af6ec5" },
  { path: "/chat", label: "AI 对话", icon: MessageCircle, bg: "#4a6cf7", bgLight: "#6b87f9" },
  { path: "/zodiac", label: "星座解读", icon: Star, bg: "#d4467a", bgLight: "#e06090" },
  { path: "/mbti", label: "MBTI", icon: Compass, bg: "#2eaa7a", bgLight: "#44c090" },
  { path: "/bazi", label: "八字命理", icon: Calendar, bg: "#b8863e", bgLight: "#cc9a52" },
  { path: "/journal", label: "情绪日记", icon: BookHeart, bg: "#d65a4a", bgLight: "#e06e5e" },
  { path: "/assessments", label: "心理测评", icon: Brain, bg: "#3498db", bgLight: "#52aaeb" },
];

// ─── Dashboard Page ─────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();

  const { data: dashboard, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const { data: fortune, isLoading: fortuneLoading, refetch: refetchFortune, isFetching: fortuneFetching } = useQuery<FortuneData>({
    queryKey: ["/api/fortune/today"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = dashLoading || fortuneLoading;

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6" data-testid="dashboard-loading">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  const getScoreLabel = (s: number) => {
    if (s >= 90) return "大吉";
    if (s >= 75) return "吉";
    if (s >= 60) return "中吉";
    if (s >= 40) return "平";
    return "需注意";
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 6) return "夜深了";
    if (h < 12) return "早上好";
    if (h < 14) return "中午好";
    if (h < 18) return "下午好";
    return "晚上好";
  };

  const f = fortune || {
    totalScore: 0, dimensions: { love: 0, wealth: 0, career: 0, study: 0, social: 0 },
    luckyColor: "", luckyNumber: 0, luckyDirection: "", aiInsight: "", date: "",
  };

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    return `${days}天前`;
  };

  return (
    <div className="flex-1 overflow-y-auto" data-testid="dashboard-page">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">

        {/* ─── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {getGreeting()}，{user?.nickname || user?.username}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
              <span>{dashboard?.date}</span>
              {dashboard?.lunar && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span>农历{dashboard.lunar.lunarDate}</span>
                  {dashboard.lunar.dayName && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{dashboard.lunar.dayName}</span>
                    </>
                  )}
                </>
              )}
            </p>
          </div>
          {dashboard?.personality?.element && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
              <span>{ELEMENT_EMOJI[dashboard.personality.element] || "✦"}</span>
              <span className="text-sm font-medium" style={{ color: ELEMENT_COLOR[dashboard.personality.element] || "hsl(var(--primary))" }}>
                {dashboard.personality.element}命
              </span>
              {dashboard.personality.mbtiType && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{dashboard.personality.mbtiType}</Badge>
              )}
            </div>
          )}
        </div>

        {/* ─── Today's Almanac Summary ───────────────────────── */}
        <Card className="border-0 shadow-sm overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-amber-500 text-white relative" data-testid="card-dashboard-almanac">
          <div className="absolute top-[-20px] right-[-10px] w-32 h-32 rounded-full border border-white/10" />
          <div className="absolute bottom-[-10px] left-[-10px] w-20 h-20 rounded-full border border-white/10" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <DashboardClock />
                </div>
                <div className="text-xs opacity-80 space-y-0.5">
                  <div>{dashboard?.date} {dashboard?.lunar ? `· 农历${dashboard.lunar.lunarDate}` : ''}</div>
                  {dashboard?.lunar?.yi && (
                    <div className="flex items-center gap-1">
                      <span className="text-amber-200">宜</span>
                      <span className="opacity-70 line-clamp-1">{dashboard.lunar.yi}</span>
                    </div>
                  )}
                </div>
              </div>
              <Link href="/almanac">
                <button className="flex flex-col items-center gap-1 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl transition" data-testid="link-almanac">
                  <Scroll className="w-5 h-5" />
                  <span className="text-[10px]">万年历</span>
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* ─── Top Row: Fortune + Avatar ──────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Fortune Card */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-primary/5 relative overflow-hidden" data-testid="card-dashboard-fortune">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                今日运势
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => refetchFortune()}
                  disabled={fortuneFetching}
                  data-testid="button-refresh-fortune"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fortuneFetching ? "animate-spin" : ""}`} />
                </Button>
                <Link href="/fortune">
                  <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="link-fortune-detail">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <MiniScoreRing score={f.totalScore} />
                <div className="flex-1 space-y-1.5">
                  {f.totalScore > 0 && (
                    <Badge
                      className="text-[10px] h-5"
                      style={{
                        backgroundColor: f.totalScore >= 75 ? "hsl(35, 85%, 55%)" : f.totalScore >= 40 ? "hsl(235, 65%, 55%)" : "hsl(330, 55%, 55%)",
                        color: "white",
                      }}
                    >
                      {getScoreLabel(f.totalScore)}
                    </Badge>
                  )}
                  {DIMENSION_CONFIG.map((dim) => (
                    <div key={dim.key} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-6">{dim.label}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${f.dimensions[dim.key]}%`, backgroundColor: dim.color }}
                        />
                      </div>
                      <span className="text-[10px] font-medium w-6 text-right">{f.dimensions[dim.key]}</span>
                    </div>
                  ))}
                </div>
              </div>
              {f.aiInsight && (
                <p className="text-xs text-foreground/60 mt-3 leading-relaxed line-clamp-2">{f.aiInsight}</p>
              )}
              {(f.luckyColor || f.luckyNumber) && (
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  {f.luckyColor && <span>幸运色: {f.luckyColor}</span>}
                  {f.luckyNumber > 0 && <span>幸运数: {f.luckyNumber}</span>}
                  {f.luckyDirection && <span>方位: {f.luckyDirection}</span>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Avatar Card */}
          <Card className="border-0 shadow-sm" data-testid="card-dashboard-avatar">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-violet-500" />
                AI 分身
              </CardTitle>
              <Link href="/avatar">
                <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="link-avatar-detail">
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {dashboard?.avatar ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                      {dashboard.avatar.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{dashboard.avatar.name}</p>
                      <Badge variant={dashboard.avatar.isActive ? "default" : "secondary"} className="text-[9px] h-4">
                        {dashboard.avatar.isActive ? "活跃中" : "已暂停"}
                      </Badge>
                    </div>
                  </div>
                  {dashboard.avatar.recentActions.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground font-medium">最近动态</p>
                      {dashboard.avatar.recentActions.map((action, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground/70 line-clamp-1">{action.innerThought || action.type}</p>
                            <p className="text-[10px] text-muted-foreground">{timeAgo(action.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">分身还没有社交动态</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 gap-2">
                  <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-violet-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">还没有创建 AI 分身</p>
                  <Link href="/avatar">
                    <Button variant="outline" size="sm" className="text-xs">
                      去创建
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Quick Actions ─────────────────────────────────── */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2" data-testid="quick-actions">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.path} href={action.path}>
                <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer group">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${action.bgLight}, ${action.bg})` }}
                  >
                    <Icon className="w-6 h-6 text-white drop-shadow-sm" strokeWidth={1.8} />
                  </div>
                  <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ─── Bottom Row: Mood + Hot Posts ───────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Mood Trend */}
          <Card className="border-0 shadow-sm" data-testid="card-dashboard-mood">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-emerald-500" />
                情绪趋势
              </CardTitle>
              <Link href="/emotion-insights">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <MoodSparkline data={dashboard?.moodTrend || []} />
              {(dashboard?.stats?.totalMoodEntries ?? 0) > 0 && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  共 {dashboard?.stats.totalMoodEntries} 条情绪记录
                </p>
              )}
              {(dashboard?.moodTrend?.length ?? 0) === 0 && (
                <Link href="/journal">
                  <Button variant="outline" size="sm" className="text-xs mt-2 w-full">
                    <BookHeart className="w-3.5 h-3.5 mr-1" />
                    记录今天的心情
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Hot Posts */}
          <Card className="border-0 shadow-sm" data-testid="card-dashboard-posts">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" />
                社区热帖
              </CardTitle>
              <Link href="/community">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {(dashboard?.hotPosts?.length ?? 0) > 0 ? (
                <div className="space-y-2.5">
                  {dashboard!.hotPosts.slice(0, 4).map((post) => (
                    <Link key={post.id} href={`/community/${post.id}`}>
                      <div className="flex items-start gap-2 py-1.5 cursor-pointer hover:bg-accent/30 rounded-lg px-2 -mx-2 transition-colors" data-testid={`post-${post.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground/80 line-clamp-1">{post.content}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{post.authorName}</span>
                            <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{TAG_LABELS[post.tag] || post.tag}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-shrink-0">
                          <span className="flex items-center gap-0.5">
                            <ThumbsUp className="w-3 h-3" />{post.likeCount}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MessageSquare className="w-3 h-3" />{post.commentCount}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-4 gap-2">
                  <p className="text-xs text-muted-foreground">社区还没有帖子</p>
                  <Link href="/community">
                    <Button variant="outline" size="sm" className="text-xs">
                      去发帖
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
