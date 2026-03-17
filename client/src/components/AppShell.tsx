import { useState, useEffect, createContext, useContext } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  Moon as MoonIcon,
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
  Home as HomeIcon,
  TrendingUp,
  Lightbulb,
  Heart,
  Radar,
  Zap,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  X,
  Bell,
  Moon,
  Podcast,
  UserCircle,
  Flame,
  CalendarCheck,
  Network,
  Code,
  Package,
  Hexagon,
  CircleDot,
  Hash,
  TreePine,
  Orbit,
  Activity,
  PenTool,
  Shell,
  Fingerprint,
  Gem,
} from "lucide-react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

// Owl Logo — wrapped in white container for dark-mode visibility
import owlLogoSrc from "@assets/owl-logo.png";

function GuanXingLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`${className} rounded-lg overflow-hidden bg-white dark:bg-white flex-shrink-0 flex items-center justify-center`}>
      <img src={owlLogoSrc} alt="观星" className="w-full h-full scale-125 object-contain" />
    </div>
  );
}

// ─── Navigation Groups ─────────────────────────────────────
interface NavItem {
  path: string;
  label: string;
  icon: any;
  guestVisible: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
  guestOnly?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "首页",
    defaultOpen: true,
    items: [
      { path: "/", label: "今日运势", icon: LayoutDashboard, guestVisible: true },
    ],
  },
  {
    label: "免费体验",
    defaultOpen: true,
    guestOnly: true,
    items: [
      { path: "/almanac", label: "万年黄历", icon: CalendarCheck, guestVisible: true },
      { path: "/qiuqian", label: "求签解签", icon: Flame, guestVisible: true },
      { path: "/name-score", label: "姓名测分", icon: Star, guestVisible: true },
      { path: "/horoscope", label: "星座运势", icon: TrendingUp, guestVisible: true },
      { path: "/community", label: "社区浏览", icon: Users, guestVisible: true },
    ],
  },
  {
    label: "命理探索",
    defaultOpen: true,
    items: [
      { path: "/fortune", label: "今日运势", icon: Gauge, guestVisible: false },
      { path: "/zodiac", label: "星座解读", icon: Star, guestVisible: false },
      { path: "/horoscope", label: "星座运势", icon: TrendingUp, guestVisible: false },
      { path: "/mbti", label: "MBTI人格", icon: Compass, guestVisible: false },
      { path: "/bazi", label: "八字命理", icon: Calendar, guestVisible: true },
      { path: "/tarot", label: "塔罗占卜", icon: Layers, guestVisible: true },
      { path: "/qiuqian", label: "求签解签", icon: Flame, guestVisible: true },
      { path: "/zeji", label: "择吉日", icon: CalendarCheck, guestVisible: true },
      { path: "/fengshui", label: "风水评估", icon: HomeIcon, guestVisible: false },
      { path: "/compatibility", label: "缘分雷达", icon: Radar, guestVisible: false },
      { path: "/soulmate", label: "灵魂伴侣", icon: Heart, guestVisible: false },
    ],
  },
  {
    label: "玄学测试",
    defaultOpen: false,
    items: [
      { path: "/discover/enneagram", label: "九型人格", icon: Hexagon, guestVisible: true },
      { path: "/discover/star-mansion", label: "二十八星宿", icon: CircleDot, guestVisible: true },
      { path: "/discover/zodiac", label: "生肖详解", icon: Shell, guestVisible: true },
      { path: "/discover/numerology", label: "灵数分析", icon: Hash, guestVisible: true },
      { path: "/discover/ziwei", label: "紫微斗数", icon: Gem, guestVisible: true },
      { path: "/discover/chakra", label: "脉轮测试", icon: Activity, guestVisible: true },
      { path: "/discover/htp", label: "房树人", icon: TreePine, guestVisible: true },
      { path: "/discover/mayan", label: "玛雅历", icon: Orbit, guestVisible: true },
      { path: "/discover/human-design", label: "人类图", icon: Fingerprint, guestVisible: true },
      { path: "/discover/zhengyu", label: "政余", icon: PenTool, guestVisible: true },
    ],
  },
  {
    label: "AI 互动",
    defaultOpen: true,
    items: [
      { path: "/wisdom", label: "智慧问答", icon: Lightbulb, guestVisible: false },
      { path: "/chat", label: "AI 对话", icon: MessageCircle, guestVisible: false },
      { path: "/avatar", label: "AI 分身", icon: Zap, guestVisible: false },
      { path: "/avatar-plaza", label: "分身广场", icon: Podcast, guestVisible: false },
    ],
  },
  {
    label: "自我探索",
    defaultOpen: false,
    items: [
      { path: "/dream", label: "梦境解析", icon: Moon, guestVisible: true },
      { path: "/emotion-insights", label: "情感频道", icon: Brain, guestVisible: false },
      { path: "/assessments", label: "心理测评", icon: ClipboardList, guestVisible: false },
      { path: "/journal", label: "情绪日记", icon: BookHeart, guestVisible: false },
    ],
  },
  {
    label: "社区广场",
    defaultOpen: true,
    items: [
      { path: "/culture", label: "国粹频道", icon: Scroll, guestVisible: true },
      { path: "/community", label: "互助社区", icon: Users, guestVisible: true },
      { path: "/agents", label: "Agent 名录", icon: Bot, guestVisible: true },
      { path: "/agent-team", label: "Agent Team", icon: Network, guestVisible: false },
    ],
  },
  {
    label: "开发者",
    defaultOpen: false,
    items: [
      { path: "/clawhub", label: "ClawHub Skills", icon: Package, guestVisible: false },
      { path: "/developer", label: "开发者中心", icon: Code, guestVisible: false },
    ],
  },
];

// Flatten for lookups
const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

// Mobile bottom tabs: 5 primary destinations
const MOBILE_TABS: NavItem[] = [
  { path: "/", label: "首页", icon: LayoutDashboard, guestVisible: false },
  { path: "/fortune", label: "运势", icon: Gauge, guestVisible: false },
  { path: "/chat", label: "对话", icon: MessageCircle, guestVisible: false },
  { path: "/community", label: "社区", icon: Users, guestVisible: true },
  { path: "/discover", label: "发现", icon: Grid3X3, guestVisible: true },
];

const GUEST_MOBILE_TABS: NavItem[] = [
  { path: "/", label: "运势", icon: LayoutDashboard, guestVisible: true },
  { path: "/almanac", label: "黄历", icon: CalendarCheck, guestVisible: true },
  { path: "/qiuqian", label: "灵签", icon: Flame, guestVisible: true },
  { path: "/community", label: "社区", icon: Users, guestVisible: true },
  { path: "/discover", label: "发现", icon: Grid3X3, guestVisible: true },
];


// ─── Discover Panel (mobile "more" menu) ─────────────────
function DiscoverPanel({ onClose, isGuest }: { onClose: () => void; isGuest: boolean }) {
  const groups = NAV_GROUPS.filter((g) => g.label !== "首页" && !g.guestOnly);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" data-testid="discover-panel">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative mt-auto bg-card rounded-t-2xl max-h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-base">发现更多</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="overflow-y-auto p-4 space-y-5">
          {groups.map((group) => {
            const visibleItems = (isGuest
              ? group.items.filter((i) => i.guestVisible)
              : group.items
            );
            if (visibleItems.length === 0) return null;
            
            return (
              <div key={group.label}>
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">{group.label}</p>
                <div className="grid grid-cols-4 gap-2">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} href={item.path}>
                        <div
                          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={onClose}
                          data-testid={`discover-${item.path.replace("/", "") || "home"}`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-[11px] text-foreground/80 leading-tight text-center">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Group (desktop) ────────────────────────────────
function SidebarGroup({ group, isGuest, isActive }: {
  group: NavGroup;
  isGuest: boolean;
  isActive: (path: string) => boolean;
}) {
  // Guest-only groups are hidden when logged in
  if (group.guestOnly && !isGuest) return null;

  const visibleItems = isGuest
    ? group.items.filter((i) => i.guestVisible)
    : group.items;
    
  // Check if any item in this group is active
  const hasActiveItem = visibleItems.some((item) => isActive(item.path));
  const [open, setOpen] = useState(group.defaultOpen || hasActiveItem);

  useEffect(() => {
    if (hasActiveItem) setOpen(true);
  }, [hasActiveItem]);

  if (visibleItems.length === 0) return null;
  
  // Single item group (like "首页") — don't show group header
  if (group.label === "首页") {
    return (
      <div className="space-y-0.5">
        {visibleItems.map((item) => {
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
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider w-full hover:text-muted-foreground transition-colors"
        onClick={() => setOpen(!open)}
        data-testid={`group-toggle-${group.label}`}
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {group.label}
      </button>
      {open && visibleItems.map((item) => {
        const active = isActive(item.path);
        const Icon = item.icon;
        return (
          <Link key={item.path} href={item.path}>
            <div
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
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
    </div>
  );
}

// ─── Notification Bell ──────────────────────────────────────
function NotificationBell() {
  const { user } = useAuth();
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications/unread-count");
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
  const count = data?.count || 0;
  return (
    <Link href="/notifications">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative text-muted-foreground"
        data-testid="button-notifications"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Button>
    </Link>
  );
}

// ─── Discover context — lets child pages open the overlay ────
const DiscoverContext = createContext<{ openDiscover: () => void }>({ openDiscover: () => {} });
export function useDiscoverOverlay() {
  return useContext(DiscoverContext);
}

// ─── Main AppShell ──────────────────────────────────────────
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { user, isGuest, logout } = useAuth();
  const [showDiscover, setShowDiscover] = useState(false);

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

  const mobileTabs = isGuest ? GUEST_MOBILE_TABS : MOBILE_TABS;

  const discoverCtx = { openDiscover: () => setShowDiscover(true) };

  // ─── Mobile Layout ──────────────────────────────────────
  if (isMobile) {
    return (
      <DiscoverContext.Provider value={discoverCtx}>
      <div className="flex flex-col h-screen bg-background" data-testid="app-shell-mobile">
        {/* Top bar */}
        <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card/50 flex-shrink-0">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <GuanXingLogo className="w-7 h-7" />
              <span className="font-semibold text-sm">观星</span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {!isGuest && <NotificationBell />}
            {!isGuest && (
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
            )}
            {isGuest && !user && (
              <Link href="/auth">
                <Button
                  size="sm"
                  className="h-7 text-xs px-3 bg-primary"
                  onClick={logout}
                  data-testid="button-guest-login-mobile"
                >
                  <LogIn className="w-3 h-3 mr-1" />
                  登录
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsDark(!isDark)}
              data-testid="button-theme-toggle"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
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
        <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto overflow-x-hidden pb-16">
          {children}
        </main>

        {/* Bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 backdrop-blur-sm" data-testid="bottom-nav">
          <div className="flex items-center justify-around h-14 px-1">
            {mobileTabs.map((item) => {
              const Icon = item.icon;
              const isDiscover = item.path === "/discover";
              const active = isDiscover ? showDiscover : isActive(item.path);

              if (isDiscover) {
                return (
                  <div
                    key={item.path}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                    onClick={() => setShowDiscover(true)}
                    data-testid={`nav-mobile-${item.path.replace("/", "") || "home"}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] leading-none">{item.label}</span>
                  </div>
                );
              }

              return (
                <Link key={item.path} href={item.path}>
                  <div
                    className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                    onClick={() => setShowDiscover(false)}
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

        {/* Discover overlay */}
        {showDiscover && (
          <DiscoverPanel onClose={() => setShowDiscover(false)} isGuest={isGuest} />
        )}
      </div>
      </DiscoverContext.Provider>
    );
  }

  // ─── Desktop Layout ─────────────────────────────────────
  return (
    <DiscoverContext.Provider value={discoverCtx}>
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
          <div className="flex items-center gap-0.5">
              {!isGuest && <NotificationBell />}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsDark(!isDark)}
                data-testid="button-theme-toggle"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
              </Button>
            </div>
        </div>

        {/* Grouped Navigation */}
        <nav className="p-3 space-y-3 overflow-y-auto flex-1">
          {NAV_GROUPS.map((group) => (
            <SidebarGroup
              key={group.label}
              group={group}
              isGuest={isGuest}
              isActive={isActive}
            />
          ))}
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
                <Link href={`/profile/${user.id}`}>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-primary/20 transition-colors">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                </Link>
                <Link href={`/profile/${user.id}`}>
                  <span className="text-xs font-medium truncate flex-1 cursor-pointer hover:text-primary transition-colors">
                    {user.nickname || user.username}
                  </span>
                </Link>
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
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
    </DiscoverContext.Provider>
  );
}
