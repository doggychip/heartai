import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { X, UserPlus, Sparkles } from "lucide-react";

const BANNER_DISMISSED_KEY = "gx_guest_banner_dismissed";

/**
 * Bottom banner shown to guests after using a free feature.
 * Dismissible via sessionStorage. Shows register CTA.
 */
export default function GuestBanner() {
  const { user, isGuest, logout } = useAuth();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Only show for guests (not logged-in users)
    if (user || !isGuest) {
      setDismissed(true);
      return;
    }
    const stored = sessionStorage.getItem(BANNER_DISMISSED_KEY);
    setDismissed(stored === "1");
  }, [user, isGuest]);

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(BANNER_DISMISSED_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-40 px-3 pb-2 animate-in slide-in-from-bottom duration-300 sm:bottom-0"
      data-testid="guest-banner"
    >
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-3 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-amber-300 flex-shrink-0" />
        <p className="text-white text-xs flex-1 min-w-0">
          喜欢这个功能？注册观星，解锁全部 12+ 玄学工具
        </p>
        <Link href="/auth">
          <Button
            size="sm"
            variant="secondary"
            className="text-xs h-7 px-3 flex-shrink-0 bg-white/20 text-white hover:bg-white/30 border-0"
            onClick={() => logout()}
          >
            <UserPlus className="w-3 h-3 mr-1" />
            注册
          </Button>
        </Link>
        <button
          onClick={handleDismiss}
          className="text-white/60 hover:text-white transition-colors flex-shrink-0"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
