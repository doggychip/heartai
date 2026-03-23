import { useState, useEffect, createContext, useContext } from "react";
import { Link, useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth";
import { MessageCircle } from "lucide-react";

// Layout sub-components
import { DesktopSidebar } from "./layout/DesktopSidebar";
import { MobileHeader } from "./layout/MobileHeader";
import { MobileBottomNav } from "./layout/MobileBottomNav";
import { DiscoverPanel } from "./layout/DiscoverPanel";

// ─── Dark mode persistence ──────────────────────────────
const THEME_KEY = "guanxing-theme";

function getInitialDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(THEME_KEY);
  if (stored !== null) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
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
  const { isGuest } = useAuth();
  const [showDiscover, setShowDiscover] = useState(false);

  const [isDark, setIsDark] = useState(getInitialDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const isActive = (path: string) =>
    path === "/"
      ? location === "/" || location === ""
      : location.startsWith(path);

  const discoverCtx = { openDiscover: () => setShowDiscover(true) };

  // ─── Mobile Layout ──────────────────────────────────────
  if (isMobile) {
    return (
      <DiscoverContext.Provider value={discoverCtx}>
        <div className="flex flex-col h-screen bg-background" data-testid="app-shell-mobile">
          <MobileHeader isDark={isDark} onToggleTheme={toggleTheme} />

          {/* Main content */}
          <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto overflow-x-hidden pb-16">
            {children}
          </main>

          <MobileBottomNav
            isActive={isActive}
            showDiscover={showDiscover}
            onOpenDiscover={() => setShowDiscover(true)}
            onCloseDiscover={() => setShowDiscover(false)}
          />

          {/* Floating chat bubble */}
          {!isGuest && !location.startsWith("/chat") && !location.startsWith("/dm") && (
            <Link href="/chat">
              <div className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg shadow-violet-500/25 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform active:scale-95" data-testid="fab-chat">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
            </Link>
          )}

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
        <DesktopSidebar
          isActive={isActive}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </DiscoverContext.Provider>
  );
}
