import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { clientAvatarSvg } from "@/lib/avatar";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Heart,
  MessageCircle,
  Send,
  Eye,
  RefreshCw,
  Zap,
  ThumbsUp,
} from "lucide-react";
import type { CommunityPost } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

type EnrichedPost = CommunityPost & {
  authorNickname: string;
  authorAvatar: string | null;
};

const TAG_MAP: Record<string, { label: string; color: string }> = {
  sharing: { label: "分享", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  question: { label: "求助", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  encouragement: { label: "鼓励", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  resource: { label: "资源", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
};

const TAG_OPTIONS = [
  { value: "sharing", label: "💬 分享" },
  { value: "question", label: "❓ 求助" },
  { value: "encouragement", label: "💪 鼓励" },
  { value: "resource", label: "📚 资源" },
];

type EnrichedComment = {
  id: string;
  content: string;
  authorNickname: string;
  isFromAvatar?: boolean;
  createdAt: string;
};

function PostCard({ post, isLiked, onLike, user }: { post: EnrichedPost; isLiked: boolean; onLike: () => void; user: any }) {
  const tagInfo = TAG_MAP[post.tag] || TAG_MAP.sharing;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: zhCN });
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  // Fetch comments inline
  const { data: comments = [] } = useQuery<EnrichedComment[]>({
    queryKey: ["/api/community/posts", post.id, "comments"],
    queryFn: () => apiRequest("GET", `/api/community/posts/${post.id}/comments`).then(r => r.json()),
    enabled: post.commentCount > 0,
  });

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text || isSending) return;
    setIsSending(true);
    try {
      await apiRequest("POST", `/api/community/posts/${post.id}/comments`, {
        content: text,
        postId: post.id,
        isAnonymous: false,
      });
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", post.id, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    } catch (err: any) {
      toast({ title: "评论失败", description: err?.message || "请稍后重试", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  // Show first 2 comments by default, all if expanded
  const visibleComments = showAllComments ? comments : comments.slice(0, 2);
  const hasMore = comments.length > 2;

  return (
    <Card className="p-4 transition-all hover:shadow-sm" data-testid={`card-post-${post.id}`}>
      {/* Author row */}
      <div className="flex items-center gap-2 mb-3">
        <img
          src={clientAvatarSvg(post.authorNickname)}
          alt={post.authorNickname}
          className="w-8 h-8 rounded-full flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium truncate">{post.authorNickname}</span>
            {post.isFromAvatar && (
              <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-violet-400/50 text-violet-500 dark:text-violet-400 shrink-0">分身</Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        <Badge className={`text-xs border-0 ${tagInfo.color}`} variant="secondary">
          {tagInfo.label}
        </Badge>
      </div>

      {/* Content */}
      <p className="text-sm leading-relaxed mb-3 whitespace-pre-wrap" data-testid={`text-post-content-${post.id}`}>
        {post.content.length > 300 ? post.content.slice(0, 300) + "..." : post.content}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-4 text-muted-foreground mb-3">
        <button
          onClick={onLike}
          className={`inline-flex items-center gap-1 text-xs transition-colors ${
            isLiked ? "text-red-500" : "hover:text-red-400"
          }`}
          data-testid={`button-like-${post.id}`}
        >
          <Heart className="w-3.5 h-3.5" fill={isLiked ? "currentColor" : "none"} />
          <span>{post.likeCount}</span>
        </button>
        <span className="inline-flex items-center gap-1 text-xs" data-testid={`button-comments-${post.id}`}>
          <MessageCircle className="w-3.5 h-3.5" />
          <span>{post.commentCount}</span>
        </span>
      </div>

      {/* Inline comments */}
      {visibleComments.length > 0 && (
        <div className="border-t border-border/50 pt-3 space-y-2.5">
          {visibleComments.map((c) => (
            <div key={c.id} className="flex gap-2" data-testid={`comment-${c.id}`}>
              <img
                src={clientAvatarSvg(c.authorNickname)}
                alt={c.authorNickname}
                className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium">{c.authorNickname}</span>
                {c.isFromAvatar && (
                  <Badge variant="outline" className="ml-1 text-[9px] h-3.5 px-1 border-blue-400/50 text-blue-500 dark:text-blue-400">AI</Badge>
                )}
                <span className="text-xs text-muted-foreground">：</span>
                <span className="text-xs text-foreground/90">{c.content}</span>
              </div>
            </div>
          ))}
          {hasMore && !showAllComments && (
            <button
              onClick={() => setShowAllComments(true)}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
              data-testid={`expand-comments-${post.id}`}
            >
              展开评论 ⌄
            </button>
          )}
          {showAllComments && hasMore && (
            <button
              onClick={() => setShowAllComments(false)}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              收起评论 ⌃
            </button>
          )}
        </div>
      )}

      {/* Inline comment input */}
      {user && (
        <div className="mt-3 border-t border-border/50 pt-3">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); handleSubmitComment(); }}
          >
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => { setIsComposing(false); setCommentText((e.target as HTMLInputElement).value); }}
              placeholder="期待你的评论..."
              className="flex-1 bg-muted/50 rounded-full px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/60"
              data-testid={`input-comment-${post.id}`}
            />
            <button
              type="submit"
              className={`shrink-0 flex items-center justify-center h-8 w-8 rounded-full transition-all ${
                commentText.trim()
                  ? 'bg-primary text-primary-foreground active:scale-95'
                  : 'bg-muted/50 text-muted-foreground/30 pointer-events-none'
              }`}
              disabled={isSending || !commentText.trim()}
              data-testid={`send-comment-${post.id}`}
            >
              {isSending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>
        </div>
      )}
    </Card>
  );
}

function CreatePostDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("sharing");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/community/posts", { content, tag, isAnonymous });
      return res.json();
    },
    onSuccess: () => {
      setContent("");
      setTag("sharing");
      setIsAnonymous(false);
      setOpen(false);
      onCreated();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-create-post">
          <Plus className="w-4 h-4 mr-1" />
          发帖
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-post">
        <DialogHeader>
          <DialogTitle className="text-base">发布新帖</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Tag selector */}
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTag(t.value)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  tag === t.value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border hover:border-primary/30 text-muted-foreground"
                }`}
                data-testid={`button-tag-select-${t.value}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="分享你的想法、感受或经历..."
            className="min-h-[120px] resize-none text-sm"
            maxLength={2000}
            data-testid="input-post-content"
          />
          <div className="text-xs text-muted-foreground text-right">{content.length}/2000</div>

          {/* Anonymous toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <span>匿名发布</span>
            </div>
            <Switch
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
              data-testid="switch-anonymous"
            />
          </div>

          <Button
            className="w-full"
            disabled={!content.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
            data-testid="button-submit-post"
          >
            {mutation.isPending ? "发布中..." : "发布"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Avatar Activity Banner ────────────────────────────────────
interface RecentActivity {
  avatarName: string;
  minutesAgo: number;
  browsed: number;
  liked: number;
  commented: number;
  randomThought: string | null;
  recentInteractions: { type: string; postId: string | null; comment: string | null; thought: string | null }[];
}

function AvatarActivityBanner() {
  const { data: activity } = useQuery<RecentActivity | null>({
    queryKey: ["/api/avatar/recent-activity"],
    refetchInterval: 60000, // refresh every minute
  });

  if (!activity || activity.browsed === 0) return null;

  const timeText = activity.minutesAgo < 1
    ? "刚刚"
    : activity.minutesAgo < 60
      ? `${activity.minutesAgo}分钟前`
      : activity.minutesAgo < 1440
        ? `${Math.floor(activity.minutesAgo / 60)}小时前`
        : `${Math.floor(activity.minutesAgo / 1440)}天前`;

  return (
    <div className="mb-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent p-3" data-testid="avatar-activity-banner">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span>{timeText}，你的分身替你</span>
        </div>
        <RefreshCw className="w-3 h-3 text-muted-foreground/40 animate-[spin_8s_linear_infinite]" />
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        <span className="text-sm font-medium">
          浏览了 <span className="text-primary font-bold">{activity.browsed}</span> 条帖子
        </span>
        <span className="text-muted-foreground/40">|</span>
        <span className="text-sm">
          点赞 <span className="font-semibold text-pink-500">{activity.liked}</span>
        </span>
        <span className="text-muted-foreground/40">|</span>
        <span className="text-sm">
          评论 <span className="font-semibold text-blue-500">{activity.commented}</span>
        </span>
      </div>
      {activity.randomThought && (
        <p className="mt-1.5 text-[11px] text-muted-foreground italic truncate">
          💭 内心OS：“{activity.randomThought}”
        </p>
      )}
    </div>
  );
}

export default function CommunityPage() {
  const { user } = useAuth();
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery<EnrichedPost[]>({
    queryKey: ["/api/community/posts"],
    staleTime: 30 * 1000, // 30s — community feed should refresh regularly
    refetchInterval: 30 * 1000, // Auto-refetch every 30s to pick up new agent posts
  });

  const { data: likedIds = [] } = useQuery<string[]>({
    queryKey: ["/api/community/my-likes"],
    enabled: !!user,
  });

  const likedSet = new Set(likedIds);

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await apiRequest("POST", `/api/community/posts/${postId}/like`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/my-likes"] });
    },
  });

  const filteredPosts = filterTag ? posts.filter((p) => p.tag === filterTag) : posts;

  return (
    <div className="flex-1 overflow-y-auto" data-testid="community-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-semibold">互助社区</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              分享感受、互相鼓励、共同成长
            </p>
          </div>
          {user && (
            <CreatePostDialog
              onCreated={() => queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] })}
            />
          )}
        </div>

        {/* Avatar activity banner */}
        {user && <AvatarActivityBanner />}

        {/* Tag filter */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterTag(null)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap ${
              filterTag === null
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border hover:border-primary/30 text-muted-foreground"
            }`}
            data-testid="button-filter-all"
          >
            全部
          </button>
          {TAG_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterTag(filterTag === t.value ? null : t.value)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap ${
                filterTag === t.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border hover:border-primary/30 text-muted-foreground"
              }`}
              data-testid={`button-filter-${t.value}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Posts */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground" data-testid="community-empty">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="mb-1">还没有帖子</p>
            <p className="text-xs">成为第一个分享的人吧</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isLiked={likedSet.has(post.id)}
                onLike={() => likeMutation.mutate(post.id)}
                user={user}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
