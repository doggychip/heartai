import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Flame, Check, Star, Trophy, ChevronRight } from "lucide-react";

interface CheckinResponse {
  checkin: {
    date: string;
    streak: number;
    meritEarned: number;
    dailyMessage: string;
    totalMerit: number;
  };
  isNew: boolean;
  newBadges?: Array<{ badgeType: string; badgeName: string; badgeIcon: string }>;
}

export default function CheckinButton() {
  const { toast } = useToast();
  const [showResult, setShowResult] = useState(false);
  const [checkinResult, setCheckinResult] = useState<CheckinResponse | null>(null);

  // Check if already checked in today
  const { data: meritData } = useQuery<{ totalMerit: number; currentStreak: number; totalCheckins: number; rank: number }>({
    queryKey: ["/api/merits/summary"],
    staleTime: 60 * 1000,
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/checkin");
      return res.json() as Promise<CheckinResponse>;
    },
    onSuccess: (data) => {
      setCheckinResult(data);
      setShowResult(true);
      queryClient.invalidateQueries({ queryKey: ["/api/merits/summary"] });
      if (data.isNew && data.newBadges?.length) {
        data.newBadges.forEach(b => {
          toast({ title: `${b.badgeIcon} 获得新成就：${b.badgeName}` });
        });
      }
    },
    onError: () => {
      toast({ title: "签到失败", description: "请稍后重试", variant: "destructive" });
    },
  });

  const isCheckedIn = checkinResult?.isNew === false || (checkinResult?.isNew === true && showResult);
  const streak = checkinResult?.checkin.streak || meritData?.currentStreak || 0;
  const totalMerit = checkinResult?.checkin.totalMerit || meritData?.totalMerit || 0;

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-500/5 to-orange-500/5 dark:from-amber-900/20 dark:to-orange-900/20">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Checkin button */}
          <button
            onClick={() => checkinMutation.mutate()}
            disabled={checkinMutation.isPending}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
              isCheckedIn
                ? "bg-green-500/15"
                : "bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 animate-pulse"
            }`}
          >
            {checkinMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isCheckedIn ? (
              <Check className="w-6 h-6 text-green-600" />
            ) : (
              <Star className="w-6 h-6 text-white" strokeWidth={2} />
            )}
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {showResult && checkinResult?.isNew ? (
              <>
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  +{checkinResult.checkin.meritEarned} 功德
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {checkinResult.checkin.dailyMessage}
                </p>
              </>
            ) : isCheckedIn ? (
              <>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-green-500" /> 已签到
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {checkinResult?.checkin.dailyMessage || "今日修行已完成"}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">每日签到</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">点击签到，积累功德值</p>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {streak > 0 && (
              <div className="text-center">
                <div className="flex items-center gap-0.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-sm font-bold text-orange-500">{streak}</span>
                </div>
                <p className="text-[9px] text-muted-foreground">连签</p>
              </div>
            )}
            <Link href="/leaderboard">
              <div className="text-center cursor-pointer hover:opacity-80 transition">
                <div className="flex items-center gap-0.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{totalMerit}</span>
                </div>
                <p className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                  功德 <ChevronRight className="w-2.5 h-2.5" />
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Badge shelf - show if just earned new badges */}
        {checkinResult?.newBadges && checkinResult.newBadges.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">新成就:</span>
            {checkinResult.newBadges.map(b => (
              <Badge key={b.badgeType} variant="secondary" className="text-[10px] h-5 px-1.5">
                {b.badgeIcon} {b.badgeName}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
