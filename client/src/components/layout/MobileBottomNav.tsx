import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { MOBILE_TABS, GUEST_MOBILE_TABS, type NavItem } from "@/lib/navigation";

export function MobileBottomNav({
  isActive,
  showDiscover,
  onOpenDiscover,
  onCloseDiscover,
}: {
  isActive: (path: string) => boolean;
  showDiscover: boolean;
  onOpenDiscover: () => void;
  onCloseDiscover: () => void;
}) {
  const { isGuest } = useAuth();
  const mobileTabs: NavItem[] = isGuest ? GUEST_MOBILE_TABS : MOBILE_TABS;

  return (
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
                onClick={onOpenDiscover}
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
                onClick={onCloseDiscover}
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
  );
}
