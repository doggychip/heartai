import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Zap, Star, Brain, MessageCircle, Heart, Users,
  ArrowLeft, Flame, Droplets, Mountain, Wind, Leaf,
} from "lucide-react";
import { clientAvatarSvg } from "@/lib/avatar";

const ELEMENT_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  '金': { icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10', label: '金' },
  '木': { icon: Leaf, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: '木' },
  '水': { icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-500/10', label: '水' },
  '火': { icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10', label: '火' },
  '土': { icon: Mountain, color: 'text-orange-700', bg: 'bg-orange-700/10', label: '土' },
};

const TAG_LABELS: Record<string, string> = {
  sharing: "分享", question: "提问", encouragement: "鼓励", resource: "资源",
};

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:id");
  const { user: currentUser } = useAuth();
  const userId = params?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["/api/users", userId, "profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${userId}/profile`);
      return res.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">用户不存在</p>
      </div>
    );
  }

  const { user: profileUser, personality, avatar, stats, recentPosts, soulArchetype } = data;
  const elCfg = personality?.element ? ELEMENT_CONFIG[personality.element] : null;
  const isOwnProfile = currentUser?.id === profileUser.id;
  const userName = profileUser.nickname || profileUser.username || 'user';
  const avatarSrc = clientAvatarSvg(userName, personality?.element);

  return (
    <div className="flex-1 overflow-y-auto" data-testid="profile-page">
      {/* Header Card */}
      <div className="relative">
        {/* Gradient banner */}
        <div className={`h-28 ${elCfg?.bg || 'bg-primary/5'} relative`}>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>

        <div className="px-4 -mt-10 relative z-10">
          <div className="flex items-end gap-4">
            {/* Avatar */}
            <img
              src={avatarSrc}
              alt={userName}
              className="w-20 h-20 rounded-2xl border-4 border-background shadow-lg flex-shrink-0"
              data-testid="img-profile-avatar"
            />
            <div className="flex-1 pb-1">
              <h1 className="text-lg font-bold leading-tight">
                {profileUser.nickname || profileUser.username}
              </h1>
              {personality?.zodiac && (
                <p className="text-sm text-muted-foreground">
                  {personality.zodiacEmoji} {personality.zodiac}
                  {personality.mbtiType && ` · ${personality.mbtiType}`}
                </p>
              )}
              {soulArchetype && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 mt-1">
                  {soulArchetype.emoji} {soulArchetype.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 space-y-4 mt-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-card border border-border">
            <p className="text-lg font-bold">{stats.postCount}</p>
            <p className="text-[11px] text-muted-foreground">帖子</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-card border border-border">
            <p className="text-lg font-bold">{stats.followerCount}</p>
            <p className="text-[11px] text-muted-foreground">粉丝</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-card border border-border">
            <p className="text-lg font-bold">{stats.followingCount}</p>
            <p className="text-[11px] text-muted-foreground">关注</p>
          </div>
        </div>

        {/* 命格底色 Card */}
        {personality && (
          <Card className="border-border" data-testid="card-personality">
            <CardContent className="p-4 space-y-3">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                命格名片
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {personality.element && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">五行:</span>
                    <Badge variant="secondary" className={elCfg?.color}>
                      {personality.element}
                    </Badge>
                  </div>
                )}
                {personality.zodiac && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">星座:</span>
                    <span>{personality.zodiacEmoji} {personality.zodiac}</span>
                  </div>
                )}
                {personality.mbtiType && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">MBTI:</span>
                    <Badge variant="outline">{personality.mbtiType}</Badge>
                  </div>
                )}
                {personality.dayMaster && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">日主:</span>
                    <span>{personality.dayMaster}</span>
                  </div>
                )}
              </div>
              {personality.fullBazi && (
                <div className="text-xs text-muted-foreground mt-1">
                  八字: {personality.fullBazi}
                </div>
              )}
              {personality.traits && personality.traits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {personality.traits.map((t: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI 分身 Status */}
        {avatar && (
          <Card className="border-border" data-testid="card-avatar-status">
            <CardContent className="p-4 space-y-2">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                AI 分身
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{avatar.name}</p>
                  {avatar.bio && <p className="text-xs text-muted-foreground">{avatar.bio}</p>}
                </div>
                <Badge variant={avatar.isActive ? "default" : "secondary"}>
                  {avatar.isActive ? "在线" : "离线"}
                </Badge>
              </div>
              {avatar.element && (
                <div className="text-xs text-muted-foreground">
                  命格底色: {avatar.element}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Posts */}
        {recentPosts && recentPosts.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-semibold text-sm flex items-center gap-2 px-1">
              <MessageCircle className="w-4 h-4 text-primary" />
              最近动态
            </h2>
            {recentPosts.map((post: any) => (
              <Link key={post.id} href={`/community/${post.id}`}>
                <Card className="border-border hover:bg-accent/30 transition-colors cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {TAG_LABELS[post.tag] || post.tag}
                          </Badge>
                          <span className="flex items-center gap-0.5">
                            <Heart className="w-3 h-3" /> {post.likeCount}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MessageCircle className="w-3 h-3" /> {post.commentCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* No personality data message */}
        {!personality && !avatar && recentPosts?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <User className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>这位用户还没有设置个人资料</p>
            {isOwnProfile && (
              <Link href="/bazi">
                <Button variant="outline" size="sm" className="mt-3">
                  去完善命格信息
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
