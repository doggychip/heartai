import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bell, Heart, MessageCircle, Bot, User, Check, Zap, Star, Info,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────
interface FromUser {
  nickname: string;
  avatarUrl: string | null;
  isAgent: boolean;
}

interface EnrichedNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  linkTo: string | null;
  fromUserId: string | null;
  isRead: boolean;
  createdAt: string;
  fromUser: FromUser | null;
  postPreview: string | null;
}

type TabKey = "comment" | "like" | "system";

interface TabCounts {
  comment: number;
  like: number;
  system: number;
}

// ─── Helpers ───────────────────────────────────────────────
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

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

// ─── Tab Config ────────────────────────────────────────────
const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "comment", label: "评论", icon: MessageCircle },
  { key: "like", label: "点赞", icon: Heart },
  { key: "system", label: "系统", icon: Info },
];

function filterByTab(notifications: EnrichedNotification[], tab: TabKey): EnrichedNotification[] {
  if (tab === "comment") return notifications.filter(n => n.type === "comment");
  if (tab === "like") return notifications.filter(n => n.type === "like");
  // system = everything else (avatar_action, fortune, system)
  return notifications.filter(n => !["comment", "like"].includes(n.type));
}

// ─── Notification Row ──────────────────────────────────────
function NotificationRow({ notif }: { notif: EnrichedNotification }) {
  const senderName = notif.fromUser?.nickname || "系统";
  const isAgent = notif.fromUser?.isAgent ?? false;

  // Determine action text based on type
  let actionText = "";
  if (notif.type === "comment") actionText = "评论了你";
  else if (notif.type === "like") actionText = "赞了你的帖子";
  else actionText = notif.title;

  const content = (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 transition-colors ${
        notif.isRead
          ? "bg-transparent"
          : "bg-primary/[0.03]"
      } ${notif.linkTo ? "active:bg-accent/30" : ""}`}
      data-testid={`notification-row-${notif.id}`}
    >
      {/* Left: Avatar */}
      <Avatar className="w-10 h-10 flex-shrink-0 mt-0.5">
        {notif.fromUser?.avatarUrl ? (
          <AvatarImage src={notif.fromUser.avatarUrl} alt={senderName} />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {notif.fromUser ? getInitial(senderName) : (
            notif.type === "system" ? <Info className="w-4 h-4" /> :
            notif.type === "fortune" ? <Star className="w-4 h-4" /> :
            notif.type === "avatar_action" ? <Zap className="w-4 h-4" /> :
            <Bell className="w-4 h-4" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Middle: Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-foreground">
            {senderName}
          </span>
          {/* AI/人类 badge */}
          {notif.fromUser && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-4 leading-none font-normal ${
                isAgent
                  ? "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/5"
                  : "border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/5"
              }`}
            >
              {isAgent ? (
                <><Bot className="w-2.5 h-2.5 mr-0.5" />AI</>
              ) : (
                <><User className="w-2.5 h-2.5 mr-0.5" />人类</>
              )}
            </Badge>
          )}
          {!notif.isRead && (
            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
          )}
        </div>

        {/* Action text */}
        {notif.type === "comment" || notif.type === "like" ? (
          <p className="text-xs text-muted-foreground mt-0.5">
            {actionText}
          </p>
        ) : null}

        {/* Body - show for comment (the actual comment) and system types */}
        {(notif.type === "comment" || notif.type === "system" || notif.type === "avatar_action" || notif.type === "fortune") && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notif.body}
          </p>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {timeAgo(notif.createdAt)}
        </p>
      </div>

      {/* Right: Post preview snippet */}
      {notif.postPreview && (
        <div className="flex-shrink-0 w-[72px] ml-2">
          <div className="w-full h-16 rounded-md bg-muted/60 border border-border/50 p-1.5 overflow-hidden">
            <p className="text-[9px] text-muted-foreground leading-tight line-clamp-4">
              {notif.postPreview}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  if (notif.linkTo) {
    return (
      <Link href={notif.linkTo} key={notif.id}>
        {content}
      </Link>
    );
  }
  return <div key={notif.id}>{content}</div>;
}

// ─── Main Page ─────────────────────────────────────────────
export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("comment");

  const { data: notifications, isLoading } = useQuery<EnrichedNotification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications");
      return res.json();
    },
  });

  const { data: tabCounts } = useQuery<TabCounts>({
    queryKey: ["/api/notifications/tab-counts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications/tab-counts");
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
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/tab-counts"] });
    },
  });

  const filtered = notifications ? filterByTab(notifications, activeTab) : [];
  const totalUnread = notifications?.filter(n => !n.isRead).length || 0;

  return (
    <div className="flex-1 overflow-y-auto" data-testid="notifications-page">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2" data-testid="text-notifications-title">
          <Bell className="w-5 h-5 text-primary" />
          消息通知
        </h1>
        {totalUnread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markReadMutation.mutate()}
            disabled={markReadMutation.isPending}
            className="gap-1.5 text-xs text-muted-foreground"
            data-testid="button-mark-all-read"
          >
            <Check className="w-3.5 h-3.5" />
            全部已读
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border" data-testid="notification-tabs">
        {TABS.map((tab) => {
          const count = tabCounts?.[tab.key] || 0;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 relative py-3 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label}
              {count > 0 && (
                <Badge
                  className={`ml-0.5 h-4 min-w-[16px] px-1 text-[10px] leading-none font-medium rounded-full ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count > 99 ? "99+" : count}
                </Badge>
              )}
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="pb-6">
        {isLoading && (
          <div className="px-4 py-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>暂无{TABS.find(t => t.key === activeTab)?.label}通知</p>
            <p className="text-xs mt-1 text-muted-foreground/60">
              {activeTab === "comment" && "当有人评论你的帖子时会在这里显示"}
              {activeTab === "like" && "当有人点赞你的帖子时会在这里显示"}
              {activeTab === "system" && "系统通知、分身动态会在这里显示"}
            </p>
          </div>
        )}

        {!isLoading && filtered.map((notif) => (
          <NotificationRow key={notif.id} notif={notif} />
        ))}
      </div>
    </div>
  );
}
