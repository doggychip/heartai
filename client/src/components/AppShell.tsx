import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth";
import {
  Sparkles,
  MessageCircle,
  ClipboardList,
  BookHeart,
  Users,
  Bot,
  Sun,
  Moon,
  LogOut,
  LogIn,
  User,
  Settings,
  Brain,
  Scroll,
  Star,
  Compass,
  Gauge,
  Calendar,
  Layers,
  Home,
  TrendingUp,
  Lightbulb,
  Heart,
  Radar,
} from "lucide-react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

const NAV_ITEMS = [
  { path: "/", label: "今日运势", icon: Gauge, guestVisible: false },
  { path: "/wisdom", label: "智慧问答", icon: Lightbulb, guestVisible: false },
  { path: "/zodiac", label: "星座解读", icon: Star, guestVisible: false },
  { path: "/horoscope", label: "星座运势", icon: TrendingUp, guestVisible: false },
  { path: "/mbti", label: "MBTI人格", icon: Compass, guestVisible: false },
  { path: "/tarot", label: "塔罗占卜", icon: Layers, guestVisible: false },
  { path: "/bazi", label: "八字命理", icon: Calendar, guestVisible: false },
  { path: "/fengshui", label: "风水评估", icon: Home, guestVisible: false },
  { path: "/compatibility", label: "缘分雷达", icon: Radar, guestVisible: false },
  { path: "/soulmate", label: "灵魂伴侣", icon: Heart, guestVisible: false },
  { path: "/chat", label: "AI 对话", icon: MessageCircle, guestVisible: false },
  { path: "/emotion-insights", label: "情感频道", icon: Brain, guestVisible: false },
  { path: "/culture", label: "国粹频道", icon: Scroll, guestVisible: true },
  { path: "/assessments", label: "心理测评", icon: ClipboardList, guestVisible: false },
  { path: "/journal", label: "情绪日记", icon: BookHeart, guestVisible: false },
  { path: "/community", label: "互助社区", icon: Users, guestVisible: true },
  { path: "/agents", label: "Agent 名录", icon: Bot, guestVisible: true },
];

// SVG Logo Component for 观星
function GuanXingLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-label="观星">
      <circle cx="16" cy="16" r="14" fill="hsl(var(--primary))" />
      <circle cx="16" cy="16" r="11" fill="hsl(var(--primary))" stroke="hsl(var(--primary-foreground))" strokeWidth="0.5" opacity="0.3" />
      {/* Main star */}
      <path d="M16 6L18.5 12.5H25L19.75 16.5L22 23L16 19L10 23L12.25 16.5L7 12.5H13.5L16 6Z" fill="hsl(var(--primary-foreground))" opacity="0.95" />
      {/* Small stars */}
      <circle cx="8" cy="8" r="1" fill="hsl(var(--primary-foreground))" opacity="0.6" />
      <circle cx="25" cy="9" r="0.7" fill="hsl(var(--primary-foreground))" opacity="0.4" />
      <circle cx="24" cy="24" r="0.8" fill="hsl(var(--primary-foreground))" opacity="0.5" />
    </svg>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { user, isGuest, logout } = useAuth();

  const visibleNavItems = isGuest
    ? NAV_ITEMS.filter((item) => item.guestVisible)
    : NAV_ITEMS;
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const isActive = (path: string) =>
    path === "/"
      ? location === "/" || location === ""
      : location.startsWith(path);

  // Mobile: show max 5 items in bottom bar
  const mobileNavItems = isGuest
    ? visibleNavItems.slice(0, 5)
    : [
        NAV_ITEMS[0],  // 今日运势
        NAV_ITEMS[1],  // 智慧问答
        NAV_ITEMS[5],  // 塔罗占卜
        NAV_ITEMS[8],  // 缘分雷达
        NAV_ITEMS[15], // 互助社区
      ];

  // ─── Mobile Layout ──────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-background" data-testid="app-shell-mobile">
        {/* Top bar */}
        <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <GuanXingLogo className="w-7 h-7" />
            <span className="font-semibold text-sm">观星</span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/settings">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                data-testid="button-settings-mobile"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsDark(!isDark)}
              data-testid="button-theme-toggle"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {user && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={logout}
                data-testid="button-logout-mobile"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </main>

        {/* Bottom tab bar */}
        <nav className="border-t border-border bg-card/80 backdrop-blur-sm flex-shrink-0 safe-area-bottom" data-testid="bottom-nav">
          <div className="flex items-center justify-around h-14">
            {mobileNavItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                      active
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                    data-testid={`nav-mobile-${item.path.replace("/", "") || "home"}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] leading-none">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  // ─── Desktop Layout ─────────────────────────────────────
  return (
    <div className="flex h-screen bg-background" data-testid="app-shell">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border flex flex-col bg-card/50" data-testid="sidebar">
        {/* Logo */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <GuanXingLogo />
              <div className="flex flex-col">
                <span className="font-semibold text-base leading-tight">观星</span>
                <span className="text-[10px] text-muted-foreground leading-tight">GuanXing</span>
              </div>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsDark(!isDark)}
            data-testid="button-theme-toggle"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto flex-1">
          {visibleNavItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.path.replace("/", "") || "home"}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Settings link — hide for guests */}
        {!isGuest && (
          <div className="px-3 mt-1">
            <Link href="/settings">
              <div
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                  isActive("/settings")
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
                data-testid="nav-settings"
              >
                <Settings className="w-4 h-4 flex-shrink-0" />
                <span>设置</span>
              </div>
            </Link>
          </div>
        )}

        {/* User info or guest login prompt */}
        <div className="mt-auto">
          {user ? (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/5">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium truncate flex-1">
                  {user.nickname || user.username}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={logout}
                  data-testid="button-logout"
                >
                  <LogOut className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : isGuest ? (
            <div className="px-3 pb-2">
              <Link href="/auth">
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10 text-primary text-sm cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={logout}
                  data-testid="button-guest-login"
                >
                  <LogIn className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">登录 / 注册</span>
                </div>
              </Link>
            </div>
          ) : null}

          {/* Footer */}
          <div className="p-3 border-t border-border">
            <PerplexityAttribution />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
