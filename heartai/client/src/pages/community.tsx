import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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

function PostCard({ post, isLiked, onLike }: { post: EnrichedPost; isLiked: boolean; onLike: () => void }) {
  const tagInfo = TAG_MAP[post.tag] || TAG_MAP.sharing;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: zhCN });

  return (
    <Card className="p-4 transition-all hover:shadow-sm" data-testid={`card-post-${post.id}`}>
      {/* Author row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium text-primary">
            {post.authorNickname.charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block">{post.authorNickname}</span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        <Badge className={`text-xs border-0 ${tagInfo.color}`} variant="secondary">
          {tagInfo.label}
        </Badge>
      </div>

      {/* Content */}
      <Link href={`/community/${post.id}`}>
        <p className="text-sm leading-relaxed mb-3 cursor-pointer hover:text-foreground/80 whitespace-pre-wrap" data-testid={`text-post-content-${post.id}`}>
          {post.content.length > 200 ? post.content.slice(0, 200) + "..." : post.content}
        </p>
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-4 text-muted-foreground">
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
        <Link href={`/community/${post.id}`}>
          <span className="inline-flex items-center gap-1 text-xs hover:text-foreground cursor-pointer" data-testid={`button-comments-${post.id}`}>
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{post.commentCount}</span>
          </span>
        </Link>
      </div>
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

export default function CommunityPage() {
  const { user } = useAuth();
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery<EnrichedPost[]>({
    queryKey: ["/api/community/posts"],
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
