import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Settings, MessageCircle, RefreshCw } from "lucide-react";

interface LetterSection {
  icon: string;
  title: string;
  content: string;
}

interface DailyLetterData {
  id: string;
  date: string;
  greeting: string;
  sections: LetterSection[];
  signoff: string;
  whisper: string | null;
  followUp: string | null;
  generatedAt: string;
  vibeScore?: number;
  vibeWord?: string;
  oneLiner?: string;
}

function LetterSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

// Vibe meter — visual energy indicator
function VibeMeter({ score, word }: { score: number; word: string }) {
  const pct = (score / 10) * 100;
  const getColor = (s: number) => {
    if (s >= 8) return { bar: "bg-emerald-500", text: "text-emerald-500", glow: "from-emerald-500/20" };
    if (s >= 6) return { bar: "bg-indigo-500", text: "text-indigo-500", glow: "from-indigo-500/20" };
    if (s >= 4) return { bar: "bg-amber-500", text: "text-amber-500", glow: "from-amber-500/20" };
    return { bar: "bg-rose-400", text: "text-rose-400", glow: "from-rose-400/20" };
  };
  const c = getColor(score);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${c.bar} transition-all duration-1000 ease-out`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className={`text-right flex items-baseline gap-1`}>
        <span className={`text-2xl font-bold ${c.text}`}>{score}</span>
        <span className="text-[10px] text-muted-foreground">/10</span>
      </div>
    </div>
  );
}

export default function DailyLetterPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [followUpReply, setFollowUpReply] = useState("");
  const [followUpSent, setFollowUpSent] = useState(false);
  const [forceRegen, setForceRegen] = useState(false);

  const { data: letter, isLoading, error, refetch } = useQuery<DailyLetterData>({
    queryKey: ["/api/daily-letter", forceRegen],
    queryFn: async () => {
      const url = forceRegen ? "/api/daily-letter?force=true" : "/api/daily-letter";
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: !!user,
    staleTime: forceRegen ? 0 : 10 * 60 * 1000,
    retry: 1,
  });

  const replyMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/mood/checkin", {
        mood: "😶",
        note: message,
      });
      return res.json();
    },
    onSuccess: () => {
      setFollowUpSent(true);
      setFollowUpReply("");
    },
  });

  const userName = user?.nickname || user?.username || "用户";
  const noBirthData = !user?.birthDate;

  if (isLoading) return <LetterSkeleton />;

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-6">
            <Link href="/">
              <ArrowLeft className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </Link>
            <h1 className="text-lg font-semibold">观星日报</h1>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
              <span className="text-3xl">📡</span>
              <p className="text-sm text-muted-foreground">日报加载失败，稍后再试</p>
              <Button variant="outline" size="sm" onClick={() => { setForceRegen(true); setTimeout(() => refetch(), 100); }}>
                重试
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!letter) return null;

  const vibeScore = letter.vibeScore || 7;
  const vibeWord = letter.vibeWord || "";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Link href="/">
            <ArrowLeft className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold">观星日报</h1>
            <p className="text-[11px] text-muted-foreground">{letter.date}</p>
          </div>
          <RefreshCw
            className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            onClick={() => { setForceRegen(true); setTimeout(() => refetch(), 100); }}
          />
        </div>

        {/* Greeting + One-liner Hero */}
        <Card className="border-0 shadow-md rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent dark:from-indigo-900/30 dark:via-violet-900/15">
          <CardContent className="p-5">
            <p className="text-base font-semibold text-foreground/90 mb-2">
              {letter.greeting}
            </p>
            {letter.oneLiner && (
              <p className="text-sm text-foreground/60 mb-4">{letter.oneLiner}</p>
            )}
            <div className="mb-1.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">今日能量</span>
                {vibeWord && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {vibeWord}
                  </span>
                )}
              </div>
              <VibeMeter score={vibeScore} word={vibeWord} />
            </div>
          </CardContent>
        </Card>

        {/* Whisper (micro-reminder) */}
        {letter.whisper && (
          <div className="flex items-start gap-2 px-1 animate-in fade-in duration-500">
            <span className="text-sm">💬</span>
            <p className="text-[13px] text-foreground/60 italic">{letter.whisper}</p>
          </div>
        )}

        {/* Sections as individual cards */}
        {letter.sections.map((section, idx) => (
          <Card
            key={idx}
            className="border-0 shadow-sm rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-400"
            style={{ animationDelay: `${idx * 100}ms`, animationFillMode: "both" }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{section.icon}</span>
                <h3 className="text-sm font-semibold">{section.title}</h3>
              </div>
              <p className="text-[13px] leading-relaxed text-foreground/70 whitespace-pre-line">
                {section.content}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Follow-up question */}
        {letter.followUp && !followUpSent && (
          <Card
            className="border-0 shadow-sm rounded-xl bg-violet-500/5 dark:bg-violet-950/20 animate-in fade-in duration-500"
            style={{ animationDelay: "400ms", animationFillMode: "both" }}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <MessageCircle className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/70">{letter.followUp}</p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="回一句..."
                  value={followUpReply}
                  onChange={(e) => setFollowUpReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && followUpReply.trim() && replyMutation.mutate(followUpReply.trim())}
                  className="text-sm h-9"
                  maxLength={200}
                />
                <Button
                  size="sm"
                  className="h-9 px-3 bg-violet-500 hover:bg-violet-600 text-white"
                  disabled={!followUpReply.trim() || replyMutation.isPending}
                  onClick={() => replyMutation.mutate(followUpReply.trim())}
                >
                  {replyMutation.isPending ? "..." : "回复"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {followUpSent && (
          <div className="text-center text-sm text-muted-foreground animate-in fade-in duration-300">
            收到了，会记住的 ✓
          </div>
        )}

        {/* No birth data prompt */}
        {noBirthData && (
          <Card className="border-0 shadow-sm rounded-xl bg-amber-500/5 dark:bg-amber-950/15">
            <CardContent className="p-3 flex items-center gap-3">
              <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-xs text-foreground/60 flex-1">填写出生日期，日报会更准</p>
              <Link href="/settings">
                <Button variant="outline" size="sm" className="text-xs h-7 px-2.5">
                  去设置
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Signoff */}
        <p className="text-[11px] text-muted-foreground/50 text-right pr-2 pt-2">
          {letter.signoff}
        </p>

        <div className="h-4" />
      </div>
    </div>
  );
}
