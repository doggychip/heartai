import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { NAV_GROUPS } from "@/lib/navigation";
import { X } from "lucide-react";

export function DiscoverPanel({ onClose, isGuest }: { onClose: () => void; isGuest: boolean }) {
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
