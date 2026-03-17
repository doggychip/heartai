import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { clientAvatarSvg } from "@/lib/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, Star, Crown, Users, UserPlus, Check, MessageCircle, Loader2 } from "lucide-react";

const ELEMENT_COLORS: Record<string, string> = {
  '金': 'bg-amber-500/15 text-amber-600',
  '木': 'bg-green-500/15 text-green-600',
  '水': 'bg-blue-500/15 text-blue-600',
  '火': 'bg-red-500/15 text-red-600',
  '土': 'bg-yellow-700/15 text-yellow-700',
};

const ELEMENT_EMOJI: Record<string, string> = { '金': '🪙', '木': '🌿', '水': '💧', '火': '🔥', '土': '🪨' };

const TYPE_COLORS: Record<string, string> = {
  '灵魂共振型': 'bg-pink-500/15 text-pink-600',
  '互补成长型': 'bg-blue-500/15 text-blue-600',
  '知己良友型': 'bg-green-500/15 text-green-600',
  '欢喜冤家型': 'bg-orange-500/15 text-orange-600',
  '比和型': 'bg-purple-500/15 text-purple-600',
};

interface Match {
  userId: string;
  nickname: string;
  zodiac: string | null;
  mbti: string | null;
  wuxing: string;
  score: number;
  type: string;
  reason: string;
}

interface Noble {
  userId: string;
  nickname: string;
  zodiac: string | null;
  wuxing: string;
  reason: string;
}

// Friend request button component
function AddFriendButton({ userId, score }: { userId: string; score: number }) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'sent' | 'friends'>('idle');

  // Check existing friendship status
  const { data: friendStatus } = useQuery<{ status: string }>({
    queryKey: ["/api/friends/status", userId],
  });

  const sendRequest = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", "/api/friends/request", { targetUserId: userId, compatibilityScore: score });
      return resp.json();
    },
    onSuccess: () => {
      setStatus('sent');
      queryClient.invalidateQueries({ queryKey: ["/api/friends/status", userId] });
    },
    onError: () => {
      setStatus('idle');
    },
  });

  const currentStatus = friendStatus?.status || 'none';

  if (currentStatus === 'accepted') {
    return (
      <Link href={`/dm/${userId}`}>
        <button className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-[11px] font-medium">
          <MessageCircle className="w-3 h-3" /> 私聊
        </button>
      </Link>
    );
  }

  if (currentStatus === 'pending' || status === 'sent') {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[11px]">
        <Check className="w-3 h-3" /> 已申请
      </span>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setStatus('pending'); sendRequest.mutate(); }}
      disabled={sendRequest.isPending}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[11px] font-medium shadow-sm hover:shadow transition-all disabled:opacity-50"
    >
      {sendRequest.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
      加好友
    </button>
  );
}

export default function MatchingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: destinyData, isLoading: destinyLoading } = useQuery<{ matches: Match[]; needsProfile?: boolean }>({
    queryKey: ["/api/matching/destiny"],
    enabled: !!user,
  });

  const { data: nobleData, isLoading: nobleLoading } = useQuery<{ nobles: Noble[]; todayStem: string; todayBranch: string; todayElement: string }>({
    queryKey: ["/api/matching/today-noble"],
    enabled: !!user,
  });

  const matches = destinyData?.matches || [];
  const nobles = nobleData?.nobles || [];

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 dark:from-pink-700 dark:via-purple-700 dark:to-indigo-700 px-4 pt-6 pb-14">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <h1 className="text-lg font-bold text-white">缘分配对</h1>
          </div>
          <button
            onClick={() => navigate("/friends")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-white text-xs font-medium hover:bg-white/25 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" /> 好友消息
          </button>
        </div>
        <p className="text-white/70 text-xs">五行生克 + 生肖合化，发现你的有缘人</p>
      </div>

      <div className="relative -mt-8 px-4 pb-6 space-y-4">

        {/* Today's Noble */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-500/5 to-orange-500/5 dark:from-amber-900/20 dark:to-orange-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold">今日贵人</span>
              {nobleData && (
                <Badge variant="secondary" className="text-[10px]">
                  {nobleData.todayStem}{nobleData.todayBranch} {ELEMENT_EMOJI[nobleData.todayElement] || ''}{nobleData.todayElement}日
                </Badge>
              )}
            </div>

            {nobleLoading ? (
              <Skeleton className="h-20" />
            ) : nobles.length === 0 ? (
              <p className="text-xs text-muted-foreground">今日暂无特别贵人推荐</p>
            ) : (
              <div className="space-y-2">
                {nobles.map((noble) => (
                  <div key={noble.userId} className="flex items-center gap-3 bg-background/60 rounded-xl p-2.5">
                    <img src={clientAvatarSvg(noble.nickname)} alt="" className="w-10 h-10 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{noble.nickname}</span>
                        <Badge className={`text-[9px] h-4 px-1.5 border-0 ${ELEMENT_COLORS[noble.wuxing] || ''}`}>
                          {ELEMENT_EMOJI[noble.wuxing] || ''} {noble.wuxing}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{noble.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Destiny Matches */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-pink-500" />
            <h2 className="text-sm font-semibold">缘分配对</h2>
          </div>

          {destinyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : destinyData?.needsProfile ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-10 text-center">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">请先设置你的出生日期</p>
                <Link href="/settings">
                  <Button size="sm" variant="outline">去设置</Button>
                </Link>
              </CardContent>
            </Card>
          ) : matches.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-10 text-center">
                <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">暂时没有找到有缘人，邀请更多朋友加入吧</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <Card key={match.userId} className="border-0 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar + Score Ring */}
                      <div className="relative flex-shrink-0">
                        <img src={clientAvatarSvg(match.nickname)} alt="" className="w-14 h-14 rounded-full" />
                        {/* Score ring */}
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background shadow flex items-center justify-center">
                          <span className={`text-[10px] font-bold ${
                            match.score >= 80 ? 'text-pink-500' : match.score >= 60 ? 'text-blue-500' : 'text-orange-500'
                          }`}>{match.score}</span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold">{match.nickname}</span>
                          <Badge className={`text-[9px] h-4 px-1.5 border-0 ${TYPE_COLORS[match.type] || 'bg-muted'}`}>
                            {match.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-[9px] h-4 px-1.5 border-0 ${ELEMENT_COLORS[match.wuxing] || ''}`}>
                            {ELEMENT_EMOJI[match.wuxing] || ''} {match.wuxing}
                          </Badge>
                          {match.zodiac && (
                            <span className="text-[10px] text-muted-foreground">{match.zodiac}</span>
                          )}
                          {match.mbti && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{match.mbti}</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{match.reason}</p>
                        <div className="mt-2">
                          <AddFriendButton userId={match.userId} score={match.score} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
