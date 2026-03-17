import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { clientAvatarSvg } from "@/lib/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Flame, Medal } from "lucide-react";

interface Leader {
  rank: number;
  userId: string;
  nickname: string;
  totalMerit: number;
  streak: number;
  topBadge: string | null;
}

export default function LeaderboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<{ leaders: Leader[] }>({
    queryKey: ["/api/merits/leaderboard"],
  });

  const { data: myMerits } = useQuery<{ totalMerit: number; rank: number; currentStreak: number }>({
    queryKey: ["/api/merits/summary"],
    enabled: !!user,
  });

  const leaders = data?.leaders || [];

  const rankStyles = [
    "bg-gradient-to-r from-amber-500 to-yellow-400 text-white",
    "bg-gradient-to-r from-slate-400 to-gray-300 text-white",
    "bg-gradient-to-r from-amber-700 to-orange-600 text-white",
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 dark:from-amber-700 dark:via-orange-700 dark:to-red-700 px-4 pt-6 pb-14">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5 text-white" />
          <h1 className="text-lg font-bold text-white">功德排行榜</h1>
        </div>
        <p className="text-white/70 text-xs">积德行善，修行不止</p>

        {myMerits && (
          <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs">我的排名</p>
              <p className="text-white text-xl font-bold">#{myMerits.rank}</p>
            </div>
            <div className="text-center">
              <p className="text-white/70 text-xs">总功德</p>
              <p className="text-white text-xl font-bold">{myMerits.totalMerit}</p>
            </div>
            <div className="text-center">
              <p className="text-white/70 text-xs">连签</p>
              <p className="text-white text-xl font-bold flex items-center gap-1">
                <Flame className="w-4 h-4 text-amber-300" />{myMerits.currentStreak}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="relative -mt-8 px-4 pb-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : leaders.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">还没有人上榜，快来签到吧</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {leaders.map((leader) => {
              const isMe = user?.id === leader.userId;
              return (
                <Card
                  key={leader.userId}
                  className={`border-0 shadow-sm transition-all ${isMe ? "ring-2 ring-primary/30" : ""}`}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {/* Rank */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      leader.rank <= 3 ? rankStyles[leader.rank - 1] : "bg-muted text-muted-foreground"
                    }`}>
                      {leader.rank <= 3 ? (
                        <Medal className="w-4 h-4" />
                      ) : (
                        leader.rank
                      )}
                    </div>

                    {/* Avatar */}
                    <img
                      src={clientAvatarSvg(leader.nickname)}
                      alt={leader.nickname}
                      className="w-9 h-9 rounded-full flex-shrink-0"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {leader.nickname}
                        {isMe && <span className="text-[10px] text-primary ml-1">(我)</span>}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {leader.topBadge && <span>{leader.topBadge}</span>}
                        {leader.streak > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Flame className="w-3 h-3 text-orange-400" />{leader.streak}天
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Merit */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{leader.totalMerit}</p>
                      <p className="text-[10px] text-muted-foreground">功德</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
