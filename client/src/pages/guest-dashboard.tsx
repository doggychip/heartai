import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import {
  Sparkles,
  Heart,
  Briefcase,
  Coins,
  GraduationCap,
  Users,
  Calendar,
  Layers,
  Star,
  Flame,
  CalendarCheck,
  MessageCircle,
  Lock,
  Compass,
  TrendingUp,
  Radar,
  Moon,
  Home as HomeIcon,
  UserPlus,
  LogIn,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────
interface GuestFortuneData {
  date: string;
  lunar: { lunarDate: string; yearName: string; dayName: string; yi: string; ji: string };
  totalScore: number;
  dimensions: { love: number; wealth: number; career: number; study: number; social: number };
  luckyColor: string;
  luckyNumber: number;
  luckyDirection: string;
  aiInsight: string;
  isPersonalized: boolean;
}

const DIMENSION_CONFIG = [
  { key: "love" as const, label: "爱情", icon: Heart, color: "hsl(330, 55%, 55%)" },
  { key: "wealth" as const, label: "财富", icon: Coins, color: "hsl(35, 85%, 55%)" },
  { key: "career" as const, label: "事业", icon: Briefcase, color: "hsl(235, 65%, 55%)" },
  { key: "study" as const, label: "学习", icon: GraduationCap, color: "hsl(160, 50%, 45%)" },
  { key: "social" as const, label: "人际", icon: Users, color: "hsl(280, 50%, 55%)" },
];

// Free features guests can try
const FREE_FEATURES = [
  { path: "/almanac", label: "万年黄历", icon: CalendarCheck, color: "#8b5cf6", desc: "每日宜忌，五行纳音" },
  { path: "/qiuqian", label: "求签解签", icon: Flame, color: "#f97316", desc: "灵签占卜，解答疑惑" },
  { path: "/name-score", label: "姓名测分", icon: Star, color: "#eab308", desc: "姓名五格，吉凶分析" },
  { path: "/horoscope", label: "星座运势", icon: Compass, color: "#ec4899", desc: "十二星座，每日运势" },
  { path: "/community", label: "社区浏览", icon: Users, color: "#06b6d4", desc: "社区互动，分享心得" },
];

// Gated features that require login
const GATED_FEATURES = [
  { path: "/chat", label: "AI对话", icon: MessageCircle, color: "#6366f1" },
  { path: "/bazi", label: "八字排盘", icon: Calendar, color: "#b8863e" },
  { path: "/tarot", label: "塔罗占卜", icon: Layers, color: "#9b59b6" },
  { path: "/fengshui", label: "风水评估", icon: HomeIcon, color: "#0d9488" },
  { path: "/compatibility", label: "缘分合盘", icon: Radar, color: "#ec4899" },
  { path: "/soulmate", label: "正缘画像", icon: Heart, color: "#f43f5e" },
  { path: "/life-curve", label: "人生曲线", icon: TrendingUp, color: "#10b981" },
  { path: "/dream", label: "解梦", icon: Moon, color: "#7c3aed" },
];

// ─── Live clock ─────────────────────────────────────────────
function useLiveClock() {
  const fmt = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${y}年${parseInt(m)}月${parseInt(d)}日 周${weekdays[now.getDay()]} ${hh}:${mm}`;
  };
  const [clock, setClock] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setClock(fmt()), 30_000);
    return () => clearInterval(id);
  }, []);
  return clock;
}

// ─── Guest Dashboard ────────────────────────────────────────
export default function GuestDashboard() {
  const { logout } = useAuth();
  const clock = useLiveClock();

  const { data: fortune, isLoading } = useQuery<GuestFortuneData>({
    queryKey: ["/api/fortune/guest"],
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto" data-testid="guest-dashboard-loading">
        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 px-4 pt-6 pb-14">
          <Skeleton className="h-6 w-48 bg-white/20" />
          <Skeleton className="h-4 w-64 bg-white/20 mt-2" />
        </div>
        <div className="px-4 -mt-8 space-y-4">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  const f = fortune || {
    totalScore: 72, dimensions: { love: 70, wealth: 65, career: 75, study: 68, social: 72 },
    luckyColor: "蓝色", luckyNumber: 7, luckyDirection: "东南", aiInsight: "", date: "",
    lunar: { lunarDate: "", yearName: "", dayName: "", yi: "", ji: "" }, isPersonalized: false,
  };

  const getScoreLabel = (s: number) => {
    if (s >= 90) return "大吉";
    if (s >= 75) return "吉";
    if (s >= 60) return "中吉";
    if (s >= 40) return "平";
    return "需注意";
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background" data-testid="guest-dashboard">
      {/* ═══ Cosmic Gradient Header ═══ */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 dark:from-indigo-800 dark:via-blue-800 dark:to-purple-900 px-4 pt-6 pb-16 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-40px] right-[-30px] w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute bottom-[-20px] left-[15%] w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute top-4 right-8 w-2 h-2 rounded-full bg-amber-300/60" />
        <div className="absolute top-12 right-16 w-1.5 h-1.5 rounded-full bg-white/40" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <h1 className="text-white text-lg font-bold">观星 GuanXing</h1>
          </div>
          <p className="text-white/70 text-sm">{clock}</p>
          {f.lunar?.lunarDate && (
            <p className="text-white/60 text-xs mt-1">
              农历{f.lunar.lunarDate}
              {f.lunar.yearName ? ` · ${f.lunar.yearName}` : ""}
              {f.lunar.dayName ? ` · ${f.lunar.dayName}` : ""}
            </p>
          )}
          {f.lunar?.yi && (
            <div className="flex gap-3 mt-2 text-[11px]">
              <span className="text-emerald-300">宜: {f.lunar.yi}</span>
              {f.lunar?.ji && <span className="text-red-300">忌: {f.lunar.ji}</span>}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Content ═══ */}
      <div className="relative -mt-10 px-4 pb-6 flex flex-col gap-6">

        {/* ─── Fortune Card ─── */}
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden" data-testid="guest-fortune-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold">今日运势</span>
                <span className="text-2xl font-black ml-1" style={{
                  color: f.totalScore >= 75 ? "hsl(35, 85%, 55%)" : f.totalScore >= 40 ? "hsl(235, 65%, 55%)" : "hsl(330, 55%, 55%)"
                }}>{f.totalScore}<span className="text-sm font-normal text-muted-foreground ml-0.5">分</span></span>
              </div>
              <Badge variant="secondary" className="text-[10px]">{getScoreLabel(f.totalScore)}</Badge>
            </div>

            {/* AI insight */}
            {f.aiInsight && (
              <p className="text-xs text-foreground/60 mb-3 leading-relaxed">{f.aiInsight}</p>
            )}

            {/* Dimension rings */}
            <div className="flex items-center justify-between">
              {DIMENSION_CONFIG.map((dim) => {
                const score = f.dimensions[dim.key];
                const r = 22;
                const circumference = 2 * Math.PI * r;
                const strokeDashoffset = circumference - (circumference * Math.min(score, 100)) / 100;
                const gradId = `guest-ring-${dim.key}`;
                return (
                  <div key={dim.key} className="flex flex-col items-center gap-1.5">
                    <div className="relative w-[52px] h-[52px]">
                      <div className="absolute inset-[-3px] rounded-full opacity-20 blur-md" style={{ background: dim.color }} />
                      <svg className="w-full h-full -rotate-90 relative" viewBox="0 0 52 52">
                        <defs>
                          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={dim.color} stopOpacity="1" />
                            <stop offset="100%" stopColor={dim.color} stopOpacity="0.6" />
                          </linearGradient>
                        </defs>
                        <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/15" />
                        <circle
                          cx="26" cy="26" r={r}
                          fill="none" stroke={`url(#${gradId})`}
                          strokeWidth="4.5" strokeLinecap="round"
                          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-[1.2s] ease-out"
                          style={{ filter: `drop-shadow(0 0 4px ${dim.color}88)` }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[13px] font-extrabold" style={{ color: dim.color }}>{score}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">{dim.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Lucky info */}
            {(f.luckyColor || f.luckyNumber > 0 || f.luckyDirection) && (
              <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border/50">
                {f.luckyColor && <span className="text-[10px] text-muted-foreground">🎨 {f.luckyColor}</span>}
                {f.luckyNumber > 0 && <span className="text-[10px] text-muted-foreground">🔢 {f.luckyNumber}</span>}
                {f.luckyDirection && <span className="text-[10px] text-muted-foreground">🧭 {f.luckyDirection}</span>}
              </div>
            )}

            {/* CTA */}
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-center text-muted-foreground mb-2">想看更详细的运势？注册免费查看</p>
              <Link href="/auth">
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  onClick={() => logout()}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  注册查看专属运势
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* ─── Free Features ─── */}
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            免费体验
          </h2>
          <div className="grid grid-cols-5 gap-y-3">
            {FREE_FEATURES.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} href={item.path}>
                  <div className="flex flex-col items-center gap-1.5 cursor-pointer group relative">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${item.color}cc, ${item.color})` }}
                    >
                      <Icon className="w-5 h-5 text-white" strokeWidth={1.8} />
                    </div>
                    <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors leading-tight text-center">
                      {item.label}
                    </span>
                    <Badge className="absolute -top-1 -right-1 text-[8px] h-3.5 px-1 bg-emerald-500 text-white border-0 shadow-sm">
                      免费
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ─── Gated Features ─── */}
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-muted-foreground" />
            登录解锁
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {GATED_FEATURES.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} href={item.path}>
                  <div className="flex flex-col items-center gap-1.5 cursor-pointer group relative opacity-75 hover:opacity-100 transition-opacity">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm grayscale group-hover:grayscale-0 transition-all"
                      style={{ background: `linear-gradient(135deg, ${item.color}88, ${item.color}aa)` }}
                    >
                      <Icon className="w-5 h-5 text-white" strokeWidth={1.8} />
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight text-center">
                      {item.label}
                    </span>
                    <Badge variant="outline" className="absolute -top-1 -right-1 text-[8px] h-3.5 px-1 border-amber-500/50 text-amber-500 bg-background shadow-sm">
                      <Lock className="w-2 h-2 mr-0.5" />
                      登录
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ─── Register CTA ─── */}
        <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/30 dark:to-purple-900/30">
          <CardContent className="p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-base mb-1">解锁全部 12+ 玄学工具</h3>
            <p className="text-xs text-muted-foreground mb-4">
              八字命理、塔罗占卜、AI对话、风水评估...
              <br />免费注册，开启你的观星之旅
            </p>
            <div className="flex gap-3">
              <Link href="/auth" className="flex-1">
                <Button
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  onClick={() => logout()}
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  免费注册
                </Button>
              </Link>
              <Link href="/auth" className="flex-1">
                <Button variant="outline" className="w-full" onClick={() => logout()}>
                  <LogIn className="w-4 h-4 mr-1.5" />
                  已有账号？登录
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Spacer */}
        <div className="h-2" />
      </div>
    </div>
  );
}
