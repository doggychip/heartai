import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { clientAvatarSvg } from "@/lib/avatar";
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
  Scroll,
  Flame,
  CalendarCheck,
  Home as HomeIcon,
  Radar,
  Moon,
  ChevronRight,
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
  isPersonalized?: boolean;
}

interface DashboardData {
  date: string;
  lunar: { lunarDate: string; yearName: string; dayName: string; yi?: string } | null;
  personality: { element?: string; mbtiType?: string; zodiacSign?: string } | null;
  moodTrend: { score: number; tags: string; date: string }[];
  hotPosts: { id: string; content: string; tag: string; likeCount: number; commentCount: number; authorName: string; createdAt: string }[];
  avatar: { name: string; isActive: boolean; recentActions: { type: string; innerThought: string; createdAt: string }[] } | null;
  dailyQian: { number: number; title: string; poem: string; rank: string } | null;
  stats: { totalPosts: number; totalMoodEntries: number };
}


// ─── Constants ──────────────────────────────────────────────
const ELEMENT_EMOJI: Record<string, string> = { "金": "🪙", "木": "🌿", "水": "💧", "火": "🔥", "土": "🪨" };

const DIMENSION_CONFIG = [
  { key: "love" as const, label: "爱情", icon: Heart, color: "hsl(330, 55%, 55%)", gradient: "from-pink-400 to-pink-500" },
  { key: "wealth" as const, label: "财富", icon: Coins, color: "hsl(35, 85%, 55%)", gradient: "from-amber-400 to-amber-500" },
  { key: "career" as const, label: "事业", icon: Briefcase, color: "hsl(235, 65%, 55%)", gradient: "from-blue-400 to-blue-500" },
  { key: "study" as const, label: "学习", icon: GraduationCap, color: "hsl(160, 50%, 45%)", gradient: "from-emerald-400 to-emerald-500" },
  { key: "social" as const, label: "人际", icon: Users, color: "hsl(280, 50%, 55%)", gradient: "from-purple-400 to-purple-500" },
];

const TAG_LABELS: Record<string, string> = {
  sharing: "分享", question: "提问", encouragement: "鼓励", resource: "资源",
};

// Feature grid icons — 2 rows of 5 (like 测测 app)
const FEATURE_GRID = [
  { path: "/bazi", label: "八字命理", icon: Calendar, color: "#b8863e" },
  { path: "/zodiac", label: "星座解读", icon: Star, color: "#d4467a" },
  { path: "/mbti", label: "MBTI", icon: Compass, color: "#2eaa7a" },
  { path: "/fortune", label: "今日运势", icon: Gauge, color: "#e8922e" },
  { path: "/compatibility", label: "缘分雷达", icon: Radar, color: "#ec4899" },
  { path: "/avatar", label: "AI 分身", icon: Zap, color: "#8b5cf6" },
  { path: "/soulmate", label: "灵魂伴侣", icon: Heart, color: "#f43f5e" },
  { path: "/tarot", label: "塔罗占卜", icon: Layers, color: "#9b59b6" },
  { path: "/qiuqian", label: "求签解签", icon: Flame, color: "#f97316" },
  { path: "/chat", label: "AI 对话", icon: MessageCircle, color: "#4a6cf7" },
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
      <div className="flex-1 overflow-y-auto" data-testid="dashboard-loading">
        {/* Skeleton header */}
        <div className="bg-gradient-to-br from-indigo-500 via-blue-500 to-sky-400 px-4 pt-6 pb-12">
          <Skeleton className="h-6 w-40 bg-white/20" />
          <Skeleton className="h-4 w-60 bg-white/20 mt-2" />
        </div>
        <div className="px-4 -mt-8 space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  const f = fortune || {
    totalScore: 0, dimensions: { love: 0, wealth: 0, career: 0, study: 0, social: 0 },
    luckyColor: "", luckyNumber: 0, luckyDirection: "", aiInsight: "", date: "",
  };

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

  const userName = user?.nickname || user?.username || "用户";
  const element = dashboard?.personality?.element;
  const avatarSrc = clientAvatarSvg(userName, element);

  return (
    <div className="flex-1 overflow-y-auto bg-background" data-testid="dashboard-page">

      {/* ═══════════ Blue Gradient Header ═══════════ */}
      <div className="relative bg-gradient-to-br from-indigo-500 via-blue-500 to-sky-400 dark:from-indigo-700 dark:via-blue-700 dark:to-sky-600 px-4 pt-5 pb-14">
        {/* Decorative circles */}
        <div className="absolute top-[-30px] right-[-20px] w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute bottom-[-10px] left-[20%] w-24 h-24 rounded-full bg-white/5" />

        {/* Avatar row */}
        <div className="relative flex items-center gap-3">
          <Link href={user ? `/profile/${user.id}` : "/"}>
            <img
              src={avatarSrc}
              alt="avatar"
              className="w-12 h-12 rounded-full border-2 border-white/30 shadow-lg cursor-pointer"
              data-testid="img-user-avatar"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-base font-semibold truncate">
              {getGreeting()}，{userName}
            </h1>
            <p className="text-white/70 text-xs mt-0.5 truncate">
              {dashboard?.date}
              {dashboard?.lunar ? ` · 农历${dashboard.lunar.lunarDate}` : ""}
              {element ? ` · ${ELEMENT_EMOJI[element] || "✦"} ${element}命` : ""}
            </p>
          </div>
          {dashboard?.personality?.mbtiType && (
            <Badge className="bg-white/20 text-white border-0 text-xs px-2 py-0.5 flex-shrink-0">
              {dashboard.personality.mbtiType}
            </Badge>
          )}
        </div>

        {/* Daily fortune stick pill */}
        {dashboard?.dailyQian && (
          <Link href="/qiuqian">
            <div className="mt-3 relative bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-white/15 transition" data-testid="link-daily-qian">
              <Scroll className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span className="text-amber-200 text-[11px] flex-shrink-0 font-medium">每日一签</span>
              <span className="text-white/40 text-[10px] flex-shrink-0">|</span>
              <span className="text-white/70 text-[11px] truncate">{dashboard.dailyQian.poem}</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0 ml-auto" />
            </div>
          </Link>
        )}
      </div>

      {/* ═══════════ Content (overlaps header) ═══════════ */}
      <div className="relative -mt-8 px-4 pb-6 space-y-4">

        {/* ─── "自己" Fortune Card ─────────────────── */}
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden" data-testid="card-fortune">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold">今日运势</span>
                {f.isPersonalized && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-medium">命理分析</span>
                )}
                <span className="text-2xl font-black ml-1" style={{
                  color: f.totalScore >= 75 ? "hsl(35, 85%, 55%)" : f.totalScore >= 40 ? "hsl(235, 65%, 55%)" : "hsl(330, 55%, 55%)"
                }}>{f.totalScore}<span className="text-sm font-normal text-muted-foreground ml-0.5">分</span></span>
              </div>
              <Link href="/fortune">
                <span className="text-xs text-muted-foreground flex items-center gap-0.5 cursor-pointer hover:text-primary transition-colors">
                  更多 <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>

            {/* AI insight text */}
            {f.aiInsight && (
              <p className="text-xs text-foreground/60 mb-3 leading-relaxed line-clamp-2">{f.aiInsight}</p>
            )}

            {/* Dimension rings — circular progress with glow */}
            <div className="flex items-center justify-between">
              {DIMENSION_CONFIG.map((dim, i) => {
                const score = f.dimensions[dim.key];
                const r = 24;
                const circumference = 2 * Math.PI * r;
                const strokeDashoffset = circumference - (circumference * Math.min(score, 100)) / 100;
                const gradId = `ring-grad-${dim.key}`;
                return (
                  <div key={dim.key} className="flex flex-col items-center gap-1.5">
                    <div className="relative w-[58px] h-[58px]">
                      {/* Outer glow */}
                      <div className="absolute inset-[-3px] rounded-full opacity-20 blur-md" style={{ background: dim.color }} />
                      <svg className="w-full h-full -rotate-90 relative" viewBox="0 0 58 58">
                        <defs>
                          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={dim.color} stopOpacity="1" />
                            <stop offset="100%" stopColor={dim.color} stopOpacity="0.6" />
                          </linearGradient>
                        </defs>
                        {/* Track */}
                        <circle cx="29" cy="29" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/15" />
                        {/* Progress arc */}
                        <circle
                          cx="29" cy="29" r={r}
                          fill="none"
                          stroke={`url(#${gradId})`}
                          strokeWidth="5.5"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-[1.2s] ease-out"
                          style={{ filter: `drop-shadow(0 0 6px ${dim.color}88)` }}
                        />
                      </svg>
                      {/* Center score */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[15px] font-extrabold" style={{ color: dim.color }}>{score}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">{dim.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Lucky info row */}
            {(f.luckyColor || f.luckyNumber > 0 || f.luckyDirection) && (
              <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border/50">
                {f.luckyColor && (
                  <span className="text-[10px] text-muted-foreground">🎨 {f.luckyColor}</span>
                )}
                {f.luckyNumber > 0 && (
                  <span className="text-[10px] text-muted-foreground">🔢 {f.luckyNumber}</span>
                )}
                {f.luckyDirection && (
                  <span className="text-[10px] text-muted-foreground">🧭 {f.luckyDirection}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Feature Icon Grid (2 rows × 5) ──────── */}
        <div className="grid grid-cols-5 gap-y-3" data-testid="feature-grid">
          {FEATURE_GRID.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div className="flex flex-col items-center gap-1.5 cursor-pointer group" data-testid={`feature-${item.path.replace("/", "")}`}>
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${item.color}cc, ${item.color})` }}
                  >
                    <Icon className="w-5 h-5 text-white" strokeWidth={1.8} />
                  </div>
                  <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors leading-tight text-center">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ─── More Features Row ───────────────────── */}
        <div className="flex gap-3">
          <Link href="/culture" className="flex-1">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-r from-red-500/10 to-amber-500/10 dark:from-red-900/20 dark:to-amber-900/20">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <Scroll className="w-4.5 h-4.5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-medium">国粹频道</p>
                  <p className="text-[10px] text-muted-foreground">黄历 · 万年历 · 节气</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/almanac" className="flex-1">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-r from-violet-500/10 to-blue-500/10 dark:from-violet-900/20 dark:to-blue-900/20">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  <CalendarCheck className="w-4.5 h-4.5 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs font-medium">万年历</p>
                  <p className="text-[10px] text-muted-foreground">择吉 · 宜忌 · 五行</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* ─── Community Hot Posts ─────────────────── */}
        <div data-testid="section-hot-posts">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              社区热帖
            </h2>
            <Link href="/community">
              <span className="text-xs text-muted-foreground flex items-center gap-0.5 cursor-pointer hover:text-primary transition-colors">
                查看全部 <ChevronRight className="w-3 h-3" />
              </span>
            </Link>
          </div>

          {(dashboard?.hotPosts?.length ?? 0) > 0 ? (
            <div className="space-y-2.5">
              {dashboard!.hotPosts.slice(0, 5).map((post, idx) => (
                <Link key={post.id} href={`/community/${post.id}`}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" data-testid={`post-${post.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2.5">
                        {/* Rank number */}
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          idx === 0 ? "bg-orange-500 text-white" :
                          idx === 1 ? "bg-amber-500 text-white" :
                          idx === 2 ? "bg-yellow-500 text-white" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground/90 line-clamp-2 leading-snug">{post.content}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-muted-foreground">{post.authorName}</span>
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{TAG_LABELS[post.tag] || post.tag}</Badge>
                            <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-0.5">
                              <ThumbsUp className="w-3 h-3" />{post.likeCount}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <MessageSquare className="w-3 h-3" />{post.commentCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-8 flex flex-col items-center gap-2">
                <Users className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">社区还没有帖子，去发第一条吧</p>
                <Link href="/community">
                  <Button variant="outline" size="sm" className="text-xs mt-1">
                    去社区
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── AI Avatar Quick Card ──────────────── */}
        {dashboard?.avatar && (
          <Link href="/avatar">
            <Card className="border-0 shadow-sm bg-gradient-to-r from-violet-500/5 to-purple-500/5 dark:from-violet-900/20 dark:to-purple-900/20 hover:shadow-md transition-shadow cursor-pointer" data-testid="card-avatar-quick">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {dashboard.avatar.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{dashboard.avatar.name}</p>
                    <Badge variant={dashboard.avatar.isActive ? "default" : "secondary"} className="text-[9px] h-4">
                      {dashboard.avatar.isActive ? "活跃中" : "已暂停"}
                    </Badge>
                  </div>
                  {dashboard.avatar.recentActions.length > 0 && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {dashboard.avatar.recentActions[0].innerThought || "正在社区浏览中..."}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Spacer for bottom nav */}
        <div className="h-2" />
      </div>
    </div>
  );
}
