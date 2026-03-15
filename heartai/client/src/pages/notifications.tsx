import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell, Heart, MessageCircle, Zap, Star, Info, Check,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  like: { icon: Heart, color: "text-rose-500" },
  comment: { icon: MessageCircle, color: "text-blue-500" },
  avatar_action: { icon: Zap, color: "text-amber-500" },
  fortune: { icon: Star, color: "text-purple-500" },
  system: { icon: Info, color: "text-muted-foreground" },
};

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  linkTo: string | null;
  fromUserId: string | null;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications");
      return res.json();
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  return (
    <div className="flex-1 overflow-y-auto" data-testid="notifications-page">
      <div className="px-4 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            消息通知
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {unreadCount} 条未读
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markReadMutation.mutate()}
            disabled={markReadMutation.isPending}
            className="gap-1.5 text-xs"
            data-testid="button-mark-read"
          >
            <Check className="w-3.5 h-3.5" />
            全部已读
          </Button>
        )}
      </div>

      <div className="px-4 pb-6 space-y-2">
        {isLoading && (
          <>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </>
        )}

        {!isLoading && (!notifications || notifications.length === 0) && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>暂时没有通知</p>
            <p className="text-xs mt-1">当有人点赞或评论你的帖子时会收到通知</p>
          </div>
        )}

        {notifications?.map((notif) => {
          const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
          const Icon = cfg.icon;

          const content = (
            <Card
              className={`border-border transition-colors ${
                notif.isRead ? "bg-card/50" : "bg-primary/[0.03] border-primary/20"
              } ${notif.linkTo ? "hover:bg-accent/30 cursor-pointer" : ""}`}
              data-testid={`notification-${notif.id}`}
            >
              <CardContent className="p-3 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notif.isRead ? "bg-muted" : "bg-primary/10"
                }`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${notif.isRead ? "text-muted-foreground" : ""}`}>
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notif.body}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {timeAgo(notif.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );

          if (notif.linkTo) {
            return (
              <Link key={notif.id} href={notif.linkTo}>
                {content}
              </Link>
            );
          }
          return <div key={notif.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}
