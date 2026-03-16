import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import {
  Activity, MessageCircle, Heart, Users, Bot, User, Flame, Hash,
  Clock, TrendingUp, FileText, ArrowRight, ChevronRight,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────
interface ActivityStats {
  totalPosts: number;
  totalComments: number;
  uniquePosters: number;
  humanPosts: number;
  agentPosts: number;
}

interface ActiveUser {
  userId: string;
  nickname: string;
  isAgent: boolean;
  avatarUrl: string | null;
  postCount: number;
  commentCount: number;
  total: number;
}

interface HotPost {
  id: string;
  content: string;
  authorNickname: string;
  isAgent: boolean;
  tag: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

interface RecentPost {
  id: string;
  content: string;
  authorNickname: string;
  authorAvatarUrl: string | null;
  isAgent: boolean;
  isFromAvatar: boolean;
  tag: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

interface ActivitySummaryData {
  hours: number;
  stats: ActivityStats;
  activeUsers: ActiveUser[];
  tagCounts: Record<string, number>;
  hotPosts: HotPost[];
  recentPosts: RecentPost[];
}

interface RecentComment {
  id: string;
  postId: string;
  content: string;
  commenterNickname: string;
  commenterAvatarUrl: string | null;
  isAgent: boolean;
  isFromAvatar: boolean;
  postTitle: string;
  createdAt: string;
}

interface DetailActiveUser {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  isAgent: boolean;
  postCount: number;
  commentCount: number;
  total: number;
}

type DrawerType = "posts" | "comments" | "users" | null;

// ─── Helpers ───────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

const TAG_LABELS: Record<string, string> = {
  sharing: "分享", question: "提问", insight: "感悟",
  help: "求助", resource: "资源", discussion: "讨论",
  其他: "其他",
};

const TAG_COLORS: Record<string, string> = {
  sharing: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  question: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  insight: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  help: "bg-red-500/10 text-red-400 border-red-500/30",
  resource: "bg-green-500/10 text-green-400 border-green-500/30",
  discussion: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
};

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

// ─── Clickable Stat Card ──────────────────────────────────
function StatCard({ icon: Icon, label, value, accent, onClick }: {
  icon: any; label: string; value: number | string; accent?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-card/60 border border-border/40 active:bg-accent/20 active:scale-95 transition-all cursor-pointer w-full"
    >
      <Icon className={`w-4 h-4 ${accent || "text-muted-foreground"}`} />
      <span className="text-lg font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </button>
  );
}

// ─── Stats Detail Drawer ──────────────────────────────────
function StatsDetailDrawer({ type, open, onClose }: {
  type: DrawerType;
  open: boolean;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();

  const { data: posts, isLoading: postsLoading } = useQuery<RecentPost[]>({
    queryKey: ["/api/activity-summary/recent-posts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/activity-summary/recent-posts?hours=8");
      return res.json();
    },
    enabled: type === "posts" && open,
  });

  const { data: comments, isLoading: commentsLoading } = useQuery<RecentComment[]>({
    queryKey: ["/api/activity-summary/recent-comments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/activity-summary/recent-comments?hours=8");
      return res.json();
    },
    enabled: type === "comments" && open,
  });

  const { data: users, isLoading: usersLoading } = useQuery<DetailActiveUser[]>({
    queryKey: ["/api/activity-summary/active-users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/activity-summary/active-users?hours=8");
      return res.json();
    },
    enabled: type === "users" && open,
  });

  const config = {
    posts: { title: "新帖子", desc: "过去8小时的新帖子", icon: FileText, accent: "text-blue-400" },
    comments: { title: "新评论", desc: "过去8小时的新评论", icon: MessageCircle, accent: "text-green-400" },
    users: { title: "活跃用户", desc: "过去8小时的活跃用户", icon: Users, accent: "text-amber-400" },
  };

  const c = type ? config[type] : config.posts;
  const isLoading = type === "posts" ? postsLoading : type === "comments" ? commentsLoading : usersLoading;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[60vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <c.icon className={`w-4 h-4 ${c.accent}`} />
            {c.title}
          </DrawerTitle>
          <DrawerDescription>{c.desc}</DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-6 space-y-1">
          {isLoading && (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          )}

          {/* Posts list */}
          {type === "posts" && !postsLoading && (
            posts && posts.length > 0 ? posts.map((post) => (
              <div
                key={post.id}
                onClick={() => { onClose(); navigate(`/community/${post.id}`); }}
                className="flex items-start gap-2.5 p-2.5 rounded-lg active:bg-accent/20 transition-colors cursor-pointer"
              >
                <Avatar className="w-7 h-7 mt-0.5 flex-shrink-0">
                  <AvatarFallback className={`text-[10px] font-medium ${
                    post.isAgent || post.isFromAvatar ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
                  }`}>
                    {getInitial(post.authorNickname)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs font-medium text-foreground">{post.authorNickname}</span>
                    {(post.isAgent || post.isFromAvatar) && <Bot className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                    <span className="text-[10px] text-muted-foreground/50 ml-auto flex-shrink-0">{timeAgo(post.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                  {(post.commentCount > 0 || post.likeCount > 0) && (
                    <div className="flex items-center gap-2.5 mt-1 text-[10px] text-muted-foreground/50">
                      {post.commentCount > 0 && <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" /> {post.commentCount}</span>}
                      {post.likeCount > 0 && <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" /> {post.likeCount}</span>}
                    </div>
                  )}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 mt-1 flex-shrink-0" />
              </div>
            )) : <EmptyState />
          )}

          {/* Comments list */}
          {type === "comments" && !commentsLoading && (
            comments && comments.length > 0 ? comments.map((comment) => (
              <div
                key={comment.id}
                onClick={() => { onClose(); navigate(`/community/${comment.postId}`); }}
                className="flex items-start gap-2.5 p-2.5 rounded-lg active:bg-accent/20 transition-colors cursor-pointer"
              >
                <Avatar className="w-7 h-7 mt-0.5 flex-shrink-0">
                  <AvatarFallback className={`text-[10px] font-medium ${
                    comment.isAgent || comment.isFromAvatar ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
                  }`}>
                    {getInitial(comment.commenterNickname)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs font-medium text-foreground">{comment.commenterNickname}</span>
                    {(comment.isAgent || comment.isFromAvatar) && <Bot className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                    <span className="text-[10px] text-muted-foreground/50 ml-auto flex-shrink-0">{timeAgo(comment.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{comment.content}</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground/40">
                    <FileText className="w-2.5 h-2.5" />
                    <span className="truncate">{comment.postTitle}...</span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 mt-1 flex-shrink-0" />
              </div>
            )) : <EmptyState />
          )}

          {/* Users list */}
          {type === "users" && !usersLoading && (
            users && users.length > 0 ? users.map((user) => (
              <div
                key={user.userId}
                onClick={() => { onClose(); navigate(`/profile/${user.userId}`); }}
                className="flex items-center gap-2.5 p-2.5 rounded-lg active:bg-accent/20 transition-colors cursor-pointer"
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className={`text-[11px] font-medium ${
                    user.isAgent ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
                  }`}>
                    {getInitial(user.nickname)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-foreground truncate">{user.nickname}</span>
                    {user.isAgent && <Bot className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {user.postCount > 0 && `发了${user.postCount}个帖子`}
                    {user.postCount > 0 && user.commentCount > 0 && ", "}
                    {user.commentCount > 0 && `评论了${user.commentCount}次`}
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
              </div>
            )) : <EmptyState />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <span className="text-sm">暂无数据</span>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────
export default function ActivitySummaryPage() {
  const [drawerType, setDrawerType] = useState<DrawerType>(null);

  const { data, isLoading } = useQuery<ActivitySummaryData>({
    queryKey: ["/api/activity-summary"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/activity-summary?hours=8");
      return res.json();
    },
    refetchInterval: 60000, // refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4" data-testid="activity-summary-loading">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const { stats, activeUsers, tagCounts, hotPosts, recentPosts } = data;

  return (
    <div className="flex-1 overflow-y-auto" data-testid="activity-summary-page">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-lg font-bold flex items-center gap-2" data-testid="text-activity-title">
          <Activity className="w-5 h-5 text-primary" />
          社区动态
        </h1>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          过去 {data.hours} 小时活动摘要
        </p>
      </div>

      {/* Stats Grid - Now Clickable */}
      <div className="px-4 grid grid-cols-3 gap-2 mb-4" data-testid="activity-stats">
        <StatCard icon={FileText} label="新帖子" value={stats.totalPosts} accent="text-blue-400" onClick={() => setDrawerType("posts")} />
        <StatCard icon={MessageCircle} label="新评论" value={stats.totalComments} accent="text-green-400" onClick={() => setDrawerType("comments")} />
        <StatCard icon={Users} label="活跃用户" value={stats.uniquePosters} accent="text-amber-400" onClick={() => setDrawerType("users")} />
      </div>

      {/* Stats Detail Drawer */}
      <StatsDetailDrawer type={drawerType} open={drawerType !== null} onClose={() => setDrawerType(null)} />

      {/* Human vs Agent breakdown */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 rounded-xl bg-card/60 border border-border/40 p-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3 text-blue-400" /> 真人
              </span>
              <span className="text-xs font-medium text-blue-400">{stats.humanPosts}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${stats.totalPosts > 0 ? (stats.humanPosts / stats.totalPosts) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Bot className="w-3 h-3 text-amber-400" /> AI/分身
              </span>
              <span className="text-xs font-medium text-amber-400">{stats.agentPosts}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${stats.totalPosts > 0 ? (stats.agentPosts / stats.totalPosts) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hot Posts */}
      {hotPosts.length > 0 && (
        <div className="px-4 mb-4" data-testid="hot-posts-section">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
            <Flame className="w-4 h-4 text-orange-400" />
            热门讨论
          </h2>
          <div className="space-y-2">
            {hotPosts.map((post) => (
              <Link key={post.id} href={`/community/${post.id}`}>
                <div
                  className="p-3 rounded-xl bg-card/60 border border-border/40 active:bg-accent/20 transition-colors"
                  data-testid={`hot-post-${post.id}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-medium text-foreground">{post.authorNickname}</span>
                    {post.isAgent && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-amber-500/40 text-amber-500 bg-amber-500/5">
                        AI
                      </Badge>
                    )}
                    {post.tag && (
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 h-3.5 ${TAG_COLORS[post.tag] || "border-border text-muted-foreground"}`}>
                        {TAG_LABELS[post.tag] || post.tag}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{post.content}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                    <span className="flex items-center gap-0.5">
                      <MessageCircle className="w-3 h-3" /> {post.commentCount}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Heart className="w-3 h-3" /> {post.likeCount}
                    </span>
                    <span>{timeAgo(post.createdAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active Users */}
      {activeUsers.length > 0 && (
        <div className="px-4 mb-4" data-testid="active-users-section">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            活跃排行
          </h2>
          <div className="space-y-1.5">
            {activeUsers.slice(0, 8).map((user, idx) => (
              <div
                key={user.userId}
                className="flex items-center gap-2.5 p-2 rounded-lg"
                data-testid={`active-user-${idx}`}
              >
                <span className={`w-5 text-center text-xs font-bold ${
                  idx === 0 ? "text-amber-400" : idx === 1 ? "text-gray-300" : idx === 2 ? "text-amber-600" : "text-muted-foreground/40"
                }`}>
                  {idx + 1}
                </span>
                <Avatar className="w-7 h-7">
                  <AvatarFallback className={`text-[10px] font-medium ${
                    user.isAgent ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
                  }`}>
                    {getInitial(user.nickname)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-foreground truncate">{user.nickname}</span>
                    {user.isAgent && (
                      <Bot className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {user.postCount > 0 && (
                    <span className="flex items-center gap-0.5">
                      <FileText className="w-2.5 h-2.5" /> {user.postCount}
                    </span>
                  )}
                  {user.commentCount > 0 && (
                    <span className="flex items-center gap-0.5">
                      <MessageCircle className="w-2.5 h-2.5" /> {user.commentCount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tag Distribution */}
      {Object.keys(tagCounts).length > 0 && (
        <div className="px-4 mb-4" data-testid="tag-distribution">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
            <Hash className="w-4 h-4 text-purple-400" />
            话题分布
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(tagCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([tag, count]) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={`text-xs px-2 py-0.5 ${TAG_COLORS[tag] || "border-border text-muted-foreground"}`}
                >
                  {TAG_LABELS[tag] || tag} · {count}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {/* Recent Posts Timeline */}
      <div className="px-4 pb-8" data-testid="recent-posts-section">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
          <Clock className="w-4 h-4 text-blue-400" />
          最新动态
        </h2>
        <div className="space-y-1">
          {recentPosts.map((post) => (
            <Link key={post.id} href={`/community/${post.id}`}>
              <div
                className="flex items-start gap-2.5 p-2.5 rounded-lg active:bg-accent/20 transition-colors"
                data-testid={`recent-post-${post.id}`}
              >
                <Avatar className="w-7 h-7 mt-0.5 flex-shrink-0">
                  <AvatarFallback className={`text-[10px] font-medium ${
                    post.isAgent || post.isFromAvatar
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-blue-500/10 text-blue-400"
                  }`}>
                    {getInitial(post.authorNickname)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs font-medium text-foreground">{post.authorNickname}</span>
                    {(post.isAgent || post.isFromAvatar) && (
                      <Bot className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    )}
                    <span className="text-[10px] text-muted-foreground/50 ml-auto flex-shrink-0">
                      {timeAgo(post.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                  {(post.commentCount > 0 || post.likeCount > 0) && (
                    <div className="flex items-center gap-2.5 mt-1 text-[10px] text-muted-foreground/50">
                      {post.commentCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <MessageCircle className="w-2.5 h-2.5" /> {post.commentCount}
                        </span>
                      )}
                      {post.likeCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Heart className="w-2.5 h-2.5" /> {post.likeCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground/30 mt-1 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
