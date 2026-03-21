import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { ArrowLeft, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";

const TRIGGERS = [
  { label: "工作压力", emoji: "💼" },
  { label: "感情", emoji: "💕" },
  { label: "睡眠", emoji: "😴" },
  { label: "家庭", emoji: "🏠" },
  { label: "健康", emoji: "🌿" },
  { label: "财务", emoji: "💰" },
  { label: "学习", emoji: "📚" },
  { label: "天气", emoji: "🌦" },
  { label: "友情", emoji: "👥" },
  { label: "独处", emoji: "🧘" },
];

const MOODS = [
  { emoji: "😊", label: "开心" },
  { emoji: "😌", label: "平静" },
  { emoji: "😔", label: "低落" },
  { emoji: "😤", label: "烦躁" },
  { emoji: "😰", label: "焦虑" },
  { emoji: "😴", label: "疲惫" },
  { emoji: "🥰", label: "幸福" },
  { emoji: "😶", label: "无感" },
];

interface CheckinResponse {
  id: string;
  aiResponse: string;
  wuxingInsight: string;
  ritual: string;
}

interface StreakData {
  streak: number;
  todayCheckedIn: boolean;
}

interface MoodHistoryData {
  entries: {
    id: string;
    mood: string;
    moodScore: number;
    note: string | null;
    aiResponse: string | null;
    wuxingInsight: string | null;
    context: string | null;
    createdAt: string;
  }[];
  patterns: {
    dominantMood: string;
    moodTrend: "improving" | "stable" | "declining";
    totalEntries: number;
  };
}

function MoodCalendar({ entries }: { entries: { moodScore: number; createdAt: string }[] }) {
  const days = 35; // 5 rows × 7 cols
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group scores by date
  const byDate: Record<string, number[]> = {};
  for (const e of entries) {
    const d = e.createdAt.slice(0, 10);
    (byDate[d] = byDate[d] || []).push(e.moodScore);
  }

  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    const scores = byDate[key];
    const avg = scores ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const isToday = i === days - 1;
    return { key, avg, isToday };
  });

  const getColor = (avg: number | null) => {
    if (avg === null) return "bg-muted/40";
    if (avg >= 8) return "bg-emerald-500/70";
    if (avg >= 6) return "bg-green-400/60";
    if (avg >= 4) return "bg-amber-400/60";
    return "bg-rose-400/60";
  };

  return (
    <Card className="border-0 shadow-sm rounded-xl mb-4">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">近35天情绪日历</p>
        <div className="grid grid-cols-7 gap-1">
          {cells.map(cell => (
            <div
              key={cell.key}
              title={cell.avg !== null ? `${cell.key}: ${cell.avg.toFixed(1)}分` : cell.key}
              className={`aspect-square rounded-sm ${getColor(cell.avg)} ${cell.isToday ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-2 justify-end">
          {[
            { color: "bg-emerald-500/70", label: "8+" },
            { color: "bg-green-400/60", label: "6-7" },
            { color: "bg-amber-400/60", label: "4-5" },
            { color: "bg-rose-400/60", label: "1-3" },
            { color: "bg-muted/40", label: "无" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
              <span className="text-[9px] text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 20 || h < 5) return "晚安";
  if (h < 12) return "早安";
  if (h < 14) return "午安";
  return "午安";
}

function isEvening(): boolean {
  const h = new Date().getHours();
  return h >= 20 || h < 5;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export default function MoodCheckinPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [result, setResult] = useState<CheckinResponse | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const toggleTrigger = useCallback((label: string) => {
    setSelectedTriggers(prev =>
      prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
    );
  }, []);

  const userName = user?.nickname || user?.username || "用户";
  const evening = isEvening();

  const { data: streak } = useQuery<StreakData>({
    queryKey: ["/api/mood/streak"],
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const { data: history, isLoading: historyLoading } = useQuery<MoodHistoryData>({
    queryKey: ["/api/mood/history", { days: 30 }],
    enabled: !!user && showHistory,
    staleTime: 60 * 1000,
  });

  const checkinMutation = useMutation({
    mutationFn: async (data: { mood: string; note?: string; triggers?: string[] }) => {
      const res = await apiRequest("POST", "/api/mood/checkin", data);
      return res.json() as Promise<CheckinResponse>;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/mood/streak"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/history"] });
    },
  });

  const handleCheckin = () => {
    if (!selectedMood) return;
    checkinMutation.mutate({
      mood: selectedMood,
      note: note.trim() || undefined,
      triggers: selectedTriggers.length > 0 ? selectedTriggers : undefined,
    });
  };

  // Show result after check-in
  if (result) {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-indigo-950/30 via-blue-950/20 to-background">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => { setResult(null); setSelectedMood(null); setNote(""); }}>
              <ArrowLeft className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </button>
            <h1 className="text-lg font-semibold">情绪签到</h1>
          </div>

          {/* Selected mood */}
          <div className="text-center mb-6 animate-in fade-in duration-500">
            <span className="text-5xl">{selectedMood}</span>
            <p className="text-sm text-muted-foreground mt-2">已记录</p>
          </div>

          {/* AI Response Card */}
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500/10 to-orange-500/5 dark:from-amber-900/20 dark:to-orange-900/10 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <CardContent className="p-5 space-y-4">
              <p className="text-sm leading-relaxed text-foreground/80">{result.aiResponse}</p>

              <div className="border-t border-amber-200/30 dark:border-amber-800/20 pt-3">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">五行洞察</p>
                <p className="text-[13px] text-foreground/60">{result.wuxingInsight}</p>
              </div>

              {result.ritual && (
                <div className="bg-white/50 dark:bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">小仪式</p>
                  <p className="text-sm text-foreground/70">{result.ritual}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Streak */}
          {streak && streak.streak > 0 && (
            <div className="text-center mt-4 animate-in fade-in duration-700" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <p className="text-sm text-muted-foreground">
                已连续签到 <span className="text-amber-500 font-bold">{streak.streak}</span> 天
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setResult(null); setSelectedMood(null); setNote(""); setSelectedTriggers([]); }}
            >
              再签一次
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setResult(null); setShowHistory(true); }}
            >
              查看情绪轨迹
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show history view
  if (showHistory) {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-indigo-950/30 via-blue-950/20 to-background">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setShowHistory(false)}>
              <ArrowLeft className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </button>
            <h1 className="text-lg font-semibold">情绪轨迹</h1>
          </div>

          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : history && history.entries.length > 0 ? (
            <>
              {/* Mood calendar heatmap */}
              <MoodCalendar entries={history.entries} />

              {/* Trigger trend chart */}
              {(() => {
                const freq: Record<string, number> = {};
                for (const entry of history.entries) {
                  if (!entry.note) continue;
                  const m = entry.note.match(/^\[([^\]]+)\]/);
                  if (!m) continue;
                  for (const t of m[1].split(",")) {
                    const tag = t.trim();
                    if (tag) freq[tag] = (freq[tag] || 0) + 1;
                  }
                }
                const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
                if (sorted.length === 0) return null;
                const max = sorted[0][1];
                const triggerMap = Object.fromEntries(TRIGGERS.map(t => [t.label, t.emoji]));
                return (
                  <Card className="border-0 shadow-sm rounded-xl mb-4">
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-3">常见触发因素</p>
                      <div className="space-y-2">
                        {sorted.map(([tag, cnt]) => (
                          <div key={tag} className="flex items-center gap-2">
                            <span className="text-base w-5 flex-shrink-0">{triggerMap[tag] || "•"}</span>
                            <span className="text-xs w-14 flex-shrink-0 text-foreground/80">{tag}</span>
                            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-400/70 transition-all duration-700"
                                style={{ width: `${(cnt / max) * 100}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-4 text-right">{cnt}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Pattern summary */}
              <Card className="border-0 shadow-sm rounded-xl mb-4 bg-gradient-to-r from-amber-500/5 to-orange-500/5 dark:from-amber-900/15 dark:to-orange-900/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">最常情绪</p>
                      <span className="text-2xl">{history.patterns.dominantMood}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">趋势</p>
                      <div className="flex items-center gap-1">
                        {history.patterns.moodTrend === "improving" && <TrendingUp className="w-4 h-4 text-green-500" />}
                        {history.patterns.moodTrend === "declining" && <TrendingDown className="w-4 h-4 text-red-400" />}
                        {history.patterns.moodTrend === "stable" && <Minus className="w-4 h-4 text-muted-foreground" />}
                        <span className="text-sm font-medium">
                          {history.patterns.moodTrend === "improving" ? "好转中" : history.patterns.moodTrend === "declining" ? "需关注" : "平稳"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">总记录</p>
                      <p className="text-lg font-bold">{history.patterns.totalEntries}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mood timeline */}
              <div className="space-y-2">
                {history.entries.map((entry) => (
                  <Card key={entry.id} className="border-0 shadow-sm rounded-xl">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">{entry.mood}</span>
                        <div className="flex-1 min-w-0">
                          {entry.note && (
                            <p className="text-sm text-foreground/80 mb-1">{entry.note.replace(/^\[[^\]]*\]\s*/, "")}</p>
                          )}
                          {entry.aiResponse && (
                            <p className="text-xs text-foreground/50 line-clamp-2">{entry.aiResponse}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">{timeAgo(entry.createdAt)}</span>
                            {entry.context && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {entry.context === "evening" ? "晚间" : "日间"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <span className="text-4xl">🌙</span>
              <p className="text-sm text-muted-foreground mt-3">还没有情绪记录</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowHistory(false)}>
                去签到
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main check-in view
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-indigo-950/30 via-blue-950/20 to-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <Link href="/">
            <ArrowLeft className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
          </Link>
          <h1 className="text-lg font-semibold">情绪签到</h1>
          {streak && streak.streak > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-medium ml-auto">
              连续 {streak.streak} 天
            </span>
          )}
        </div>

        {/* Greeting */}
        <div className="text-center mb-8 animate-in fade-in duration-500">
          <h2 className="text-xl font-medium text-foreground/90">
            {getGreeting()}，{userName}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {evening ? "今天最有意义的一刻是什么？" : "今天感觉怎么样？"}
          </p>
        </div>

        {/* Mood Grid */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {MOODS.map(({ emoji, label }) => (
            <button
              key={emoji}
              onClick={() => setSelectedMood(emoji)}
              className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl transition-all duration-200 ${
                selectedMood === emoji
                  ? "bg-amber-500/15 ring-2 ring-amber-500/40 scale-105 shadow-lg shadow-amber-500/10"
                  : "bg-card/50 hover:bg-card/80 hover:scale-[1.02]"
              }`}
            >
              <span className={`text-3xl transition-transform duration-200 ${selectedMood === emoji ? "scale-110" : ""}`}>
                {emoji}
              </span>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>

        {/* Trigger tags */}
        {selectedMood && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mb-4">
            <p className="text-[11px] text-muted-foreground mb-2 tracking-wide">今天的情绪和什么有关？</p>
            <div className="flex flex-wrap gap-2">
              {TRIGGERS.map(({ label, emoji }) => (
                <button
                  key={label}
                  onClick={() => toggleTrigger(label)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                    selectedTriggers.includes(label)
                      ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/40 scale-105"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span>{emoji}</span>{label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Note input */}
        {selectedMood && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
            <Input
              placeholder={evening ? "今天最有意义的一刻是..." : "今天有什么想说的？"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-card/50 border-border/50 rounded-xl"
              maxLength={200}
            />

            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl h-11"
              onClick={handleCheckin}
              disabled={checkinMutation.isPending}
            >
              {checkinMutation.isPending ? "记录中..." : "签到"}
            </Button>
          </div>
        )}

        {/* History link */}
        <div className="text-center mt-8">
          <button
            onClick={() => setShowHistory(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            查看情绪轨迹 →
          </button>
        </div>
      </div>
    </div>
  );
}
