import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Send,
  Eye,
} from "lucide-react";
import type { CommunityPost, PostComment } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

type EnrichedPost = CommunityPost & {
  authorNickname: string;
  authorAvatar: string | null;
};

type EnrichedComment = PostComment & {
  authorNickname: string;
};

const TAG_MAP: Record<string, { label: string; color: string }> = {
  sharing: { label: "分享", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  question: { label: "求助", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  encouragement: { label: "鼓励", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  resource: { label: "资源", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
};

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const postId = params.id;

  const [commentContent, setCommentContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { data: post, isLoading: postLoading } = useQuery<EnrichedPost>({
    queryKey: ["/api/community/posts", postId],
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<EnrichedComment[]>({
    queryKey: ["/api/community/posts", postId, "comments"],
  });

  const { data: likedIds = [] } = useQuery<string[]>({
    queryKey: ["/api/community/my-likes"],
    enabled: !!user,
  });

  const isLiked = likedIds.includes(postId);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/community/posts/${postId}/like`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/my-likes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/community/posts/${postId}/comments`, {
        content: commentContent,
        isAnonymous,
      });
      return res.json();
    },
    onSuccess: () => {
      setCommentContent("");
      setIsAnonymous(false);
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
  });

  if (postLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        帖子不存在
      </div>
    );
  }

  const tagInfo = TAG_MAP[post.tag] || TAG_MAP.sharing;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: zhCN });

  return (
    <div className="flex-1 overflow-y-auto" data-testid="post-detail-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 text-muted-foreground"
          onClick={() => navigate("/community")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>

        {/* Post */}
        <Card className="p-5 mb-6" data-testid={`card-post-detail-${post.id}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-primary">
                {post.authorNickname.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block">{post.authorNickname}</span>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
            <Badge className={`text-xs border-0 ${tagInfo.color}`} variant="secondary">
              {tagInfo.label}
            </Badge>
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4" data-testid="text-post-full-content">
            {post.content}
          </p>

          <div className="flex items-center gap-4 text-muted-foreground pt-3 border-t border-border">
            <button
              onClick={() => likeMutation.mutate()}
              className={`inline-flex items-center gap-1 text-xs transition-colors ${
                isLiked ? "text-red-500" : "hover:text-red-400"
              }`}
              data-testid="button-like-detail"
            >
              <Heart className="w-3.5 h-3.5" fill={isLiked ? "currentColor" : "none"} />
              <span>{post.likeCount} 赞</span>
            </button>
            <span className="inline-flex items-center gap-1 text-xs">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{post.commentCount} 评论</span>
            </span>
          </div>
        </Card>

        {/* Comment input */}
        {user && (
          <Card className="p-4 mb-6" data-testid="card-comment-input">
            <Textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="写下你的评论..."
              className="min-h-[60px] resize-none text-sm mb-3"
              maxLength={500}
              data-testid="input-comment"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Eye className="w-3 h-3" />
                <span>匿名</span>
                <Switch
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                  className="scale-75"
                  data-testid="switch-comment-anonymous"
                />
              </div>
              <Button
                size="sm"
                disabled={!commentContent.trim() || commentMutation.isPending}
                onClick={() => commentMutation.mutate()}
                data-testid="button-submit-comment"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                {commentMutation.isPending ? "发送中..." : "发送"}
              </Button>
            </div>
          </Card>
        )}

        {/* Comments list */}
        <div data-testid="comments-list">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            评论 ({comments.length})
          </h2>

          {commentsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm" data-testid="comments-empty">
              暂无评论，来说两句吧
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => {
                const cTimeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: zhCN });
                return (
                  <div
                    key={comment.id}
                    className="flex gap-2.5 py-3 border-b border-border last:border-0"
                    data-testid={`comment-${comment.id}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {comment.authorNickname.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">{comment.authorNickname}</span>
                        <span className="text-xs text-muted-foreground">{cTimeAgo}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
