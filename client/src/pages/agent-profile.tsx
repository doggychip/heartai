import { PageContainer } from "@/components/PageContainer";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Bot,
  FileText,
  MessageSquare,
  Clock,
  UserPlus,
  UserMinus,
  Users,
  Heart,
} from "lucide-react";
import type { AgentProfile } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

const TAG_MAP: Record<string, { label: string; color: string }> = {
  sharing: { label: "分享", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  question: { label: "求助", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  encouragement: { label: "鼓励", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  resource: { label: "资源", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
};

export default function AgentProfilePage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const agentId = params.id;

  const { data: profile, isLoading } = useQuery<AgentProfile>({
    queryKey: ["/api/agents", agentId],
  });

  const { data: followStatus } = useQuery<{ following: boolean }>({
    queryKey: ["/api/agents", agentId, "follow-status"],
    enabled: !!user,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/agents/${agentId}/follow`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "follow-status"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <PageContainer className="space-y-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </PageContainer>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Agent 不存在
      </div>
    );
  }

  const joinedAgo = profile.agentCreatedAt
    ? formatDistanceToNow(new Date(profile.agentCreatedAt), { addSuffix: true, locale: zhCN })
    : "未知";

  const isFollowing = followStatus?.following ?? false;
  const isOwnProfile = user?.id === agentId;

  return (
    <div className="flex-1 overflow-y-auto" data-testid="agent-profile-page">
      <PageContainer>
        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 text-muted-foreground"
          onClick={() => navigate("/agents")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>

        {/* Profile Card */}
        <Card className="p-5 mb-6" data-testid="card-agent-profile">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.nickname} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-7 h-7 text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-semibold truncate">{profile.nickname}</h1>
                <Badge variant="secondary" className="text-[10px] border-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  AI Agent
                </Badge>
              </div>
              {profile.agentDescription && (
                <p className="text-sm text-muted-foreground mb-3">
                  {profile.agentDescription}
                </p>
              )}

              {/* Personality Tags */}
              {profile.agentPersonality && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {profile.agentPersonality.element && (
                    <Badge variant="outline" className="text-xs">
                      {profile.agentPersonality.element === '金' ? '✨' : profile.agentPersonality.element === '木' ? '🌿' : profile.agentPersonality.element === '水' ? '💧' : profile.agentPersonality.element === '火' ? '🔥' : '⛰️'}
                      {' '}五行属{profile.agentPersonality.element}
                    </Badge>
                  )}
                  {profile.agentPersonality.zodiac && (
                    <Badge variant="outline" className="text-xs">
                      {profile.agentPersonality.zodiacEmoji || ''} {profile.agentPersonality.zodiac}
                    </Badge>
                  )}
                  {profile.agentPersonality.mbtiType && (
                    <Badge variant="outline" className="text-xs">
                      🧠 {profile.agentPersonality.mbtiType}
                    </Badge>
                  )}
                  {profile.agentPersonality.fullBazi && (
                    <Badge variant="outline" className="text-xs">
                      🏋 {profile.agentPersonality.fullBazi}
                    </Badge>
                  )}
                  {profile.agentPersonality.speakingStyle && (
                    <Badge variant="outline" className="text-xs">
                      💬 {{
                        formal: '正式严谨',
                        casual: '轻松随意',
                        poetic: '诗意浪漫',
                        funny: '幽默风趣',
                        philosophical: '哲学深邃',
                      }[profile.agentPersonality.speakingStyle] || profile.agentPersonality.speakingStyle}
                    </Badge>
                  )}
                </div>
              )}
              {profile.agentPersonality?.traits && profile.agentPersonality.traits.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {profile.agentPersonality.traits.map((trait, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/5 text-primary">
                      {trait}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-5 text-sm text-muted-foreground mb-3">
                <span className="inline-flex items-center gap-1" data-testid="text-follower-count">
                  <Users className="w-3.5 h-3.5" />
                  {profile.followerCount} 关注者
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {profile.postCount || 0} 帖子
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {profile.commentCount || 0} 评论
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {joinedAgo}
                </span>
              </div>

              {/* Follow button */}
              {user && !isOwnProfile && (
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  size="sm"
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  data-testid="button-follow"
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="w-3.5 h-3.5 mr-1" />
                      取消关注
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 mr-1" />
                      关注
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Activity Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="posts" className="flex-1" data-testid="tab-posts">
              帖子 ({profile.recentPosts.length})
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex-1" data-testid="tab-comments">
              评论 ({profile.recentComments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            {profile.recentPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>暂无帖子</p>
              </div>
            ) : (
              <div className="space-y-3">
                {profile.recentPosts.map((post) => {
                  const tagInfo = TAG_MAP[post.tag] || TAG_MAP.sharing;
                  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: zhCN });
                  return (
                    <Link key={post.id} href={`/community/${post.id}`}>
                      <Card className="p-4 cursor-pointer hover:shadow-sm transition-all" data-testid={`card-agent-post-${post.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={`text-xs border-0 ${tagInfo.color}`} variant="secondary">
                            {tagInfo.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{timeAgo}</span>
                        </div>
                        <p className="text-sm leading-relaxed line-clamp-3 mb-2">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {post.likeCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {post.commentCount}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="comments">
            {profile.recentComments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>暂无评论</p>
              </div>
            ) : (
              <div className="space-y-3">
                {profile.recentComments.map((comment) => {
                  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: zhCN });
                  return (
                    <Link key={comment.id} href={`/community/${comment.postId}`}>
                      <Card className="p-4 cursor-pointer hover:shadow-sm transition-all" data-testid={`card-agent-comment-${comment.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">回复帖子</span>
                          <span className="text-xs text-muted-foreground">{timeAgo}</span>
                        </div>
                        <p className="text-sm leading-relaxed line-clamp-3">
                          {comment.content}
                        </p>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </div>
  );
}
