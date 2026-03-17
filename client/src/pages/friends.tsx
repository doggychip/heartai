import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { clientAvatarSvg } from "@/lib/avatar";
import {
  Users,
  UserPlus,
  MessageCircle,
  Check,
  X,
  ArrowLeft,
  Bell,
  Heart,
} from "lucide-react";

interface Friend {
  friendshipId: string;
  friendId: string;
  nickname: string;
  avatarUrl: string | null;
  compatibilityScore: number | null;
  latestMessage: string | null;
  latestMessageAt: string | null;
  unreadCount: number;
}

interface FriendRequest {
  id: string;
  userId: string;
  senderNickname: string;
  senderAvatarUrl: string | null;
  compatibilityScore: number | null;
  createdAt: string;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');

  const { data: friends, isLoading: friendsLoading } = useQuery<Friend[]>({
    queryKey: ["/api/friends"],
    enabled: !!user,
  });

  const { data: requests, isLoading: requestsLoading } = useQuery<FriendRequest[]>({
    queryKey: ["/api/friends/requests"],
    enabled: !!user,
  });

  const acceptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const resp = await apiRequest("POST", `/api/friends/accept/${requestId}`);
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const resp = await apiRequest("POST", `/api/friends/reject/${requestId}`);
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
    },
  });

  const pendingCount = requests?.length || 0;

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/")} className="p-1 -ml-1 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-500" />
            好友
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-2 pb-2">
          <button
            onClick={() => setTab('friends')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === 'friends' ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground'
            }`}
          >
            好友列表
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors relative ${
              tab === 'requests' ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground'
            }`}
          >
            好友请求
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {tab === 'friends' ? (
          // Friends list
          friendsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : !friends || friends.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">还没有好友</p>
                <p className="text-xs text-muted-foreground/60">去缘分配对页面发现有缘人吧</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate("/matching")}>
                  去配对
                </Button>
              </CardContent>
            </Card>
          ) : (
            friends.map((friend) => (
              <button
                key={friend.friendshipId}
                onClick={() => navigate(`/dm/${friend.friendId}`)}
                className="w-full text-left"
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <img
                          src={friend.avatarUrl || clientAvatarSvg(friend.nickname)}
                          alt=""
                          className="w-12 h-12 rounded-full"
                        />
                        {friend.unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium">
                            {friend.unreadCount > 9 ? '9+' : friend.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{friend.nickname}</span>
                          {friend.compatibilityScore && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                              缘分 {friend.compatibilityScore}
                            </Badge>
                          )}
                        </div>
                        {friend.latestMessage ? (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {friend.latestMessage}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/50 mt-0.5">
                            还没有聊天记录
                          </p>
                        )}
                      </div>
                      <MessageCircle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))
          )
        ) : (
          // Friend requests
          requestsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : !requests || requests.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">暂无好友请求</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((req) => (
              <Card key={req.id} className="border-0 shadow-sm">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-3">
                    <img
                      src={req.senderAvatarUrl || clientAvatarSvg(req.senderNickname)}
                      alt=""
                      className="w-12 h-12 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{req.senderNickname}</span>
                      {req.compatibilityScore && (
                        <p className="text-xs text-pink-500">缘分值 {req.compatibilityScore}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => rejectMutation.mutate(req.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 w-8 p-0 bg-gradient-to-r from-pink-500 to-purple-500 border-0"
                        onClick={() => acceptMutation.mutate(req.id)}
                        disabled={acceptMutation.isPending}
                      >
                        <Check className="w-4 h-4 text-white" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )
        )}
      </div>
    </div>
  );
}
