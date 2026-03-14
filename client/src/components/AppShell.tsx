import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth";
import {
  Heart,
  MessageCircle,
  ClipboardList,
  BookHeart,
  Users,
  Bot,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

const NAV_ITEMS = [
  { path: "/", label: "AI 对话", icon: MessageCircle },
  { path: "/assessments", label: "心理测评", icon: ClipboardList },
  { path: "/journal", label: "情绪日记", icon: BookHeart },
  { path: "/community", label: "互助社区", icon: Users },
  { path: "/agents", label: "Agent 名录", icon: Bot },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { user, logout } = useAuth();
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

  // ─── Mobile Layout ──────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-background" data-testid="app-shell-mobile">
        {/* Top bar */}
        <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-semibold text-sm">HeartAI</span>
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
            {NAV_ITEMS.map((item) => {
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
                    data-testid={`nav-mobile-${item.path.replace("/", "") || "chat"}`}
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
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary-foreground" fill="currentColor" />
              </div>
              <span className="font-semibold text-base">HeartAI</span>
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
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.path.replace("/", "") || "chat"}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Settings link */}
        <div className="px-3 mt-1">
          <Link href="/settings">
            <div
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* User info */}
        {user && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-accent/30">
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
        )}

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <PerplexityAttribution />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
