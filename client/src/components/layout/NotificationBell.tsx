import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Bell } from "lucide-react";

export function NotificationBell() {
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
