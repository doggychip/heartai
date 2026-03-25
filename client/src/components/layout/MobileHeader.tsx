import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { NotificationBell } from "./NotificationBell";
import { GuanXingLogo } from "./GuanXingLogo";
import { Sun, Moon as MoonIcon, LogOut, LogIn, Settings } from "lucide-react";

export function MobileHeader({
  isDark,
  onToggleTheme,
}: {
  isDark: boolean;
  onToggleTheme: () => void;
}) {
  const { user, isGuest, logout } = useAuth();

  return (
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
          onClick={onToggleTheme}
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
  );
}
