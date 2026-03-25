import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { NAV_GROUPS, type NavGroup } from "@/lib/navigation";
import { NotificationBell } from "./NotificationBell";
import { GuanXingLogo } from "./GuanXingLogo";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import {
  Sun,
  Moon as MoonIcon,
  LogOut,
  LogIn,
  User,
  Settings,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ─── Sidebar Group ────────────────────────────────────
function SidebarGroup({ group, isGuest, isActive }: {
  group: NavGroup;
  isGuest: boolean;
  isActive: (path: string) => boolean;
}) {
  if (group.guestOnly && !isGuest) return null;

  const visibleItems = isGuest
    ? group.items.filter((i) => i.guestVisible)
    : group.items;

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

// ─── Desktop Sidebar ────────────────────────────────────
export function DesktopSidebar({
  isActive,
  isDark,
  onToggleTheme,
}: {
  isActive: (path: string) => boolean;
  isDark: boolean;
  onToggleTheme: () => void;
}) {
  const { user, isGuest, logout } = useAuth();

  return (
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
            onClick={onToggleTheme}
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
  );
}
