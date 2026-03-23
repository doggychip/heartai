import { PageContainer } from "@/components/PageContainer";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookHeart,
  Plus,
  TrendingUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isToday,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import type { MoodEntry } from "@shared/schema";

const MOOD_LEVELS = [
  { score: 1, emoji: "😢", label: "很差" },
  { score: 2, emoji: "😔", label: "较差" },
  { score: 3, emoji: "😐", label: "一般" },
  { score: 4, emoji: "🙂", label: "不错" },
  { score: 5, emoji: "😊", label: "很好" },
];

const EMOTION_OPTIONS = [
  { tag: "happy", label: "开心", emoji: "😊" },
  { tag: "calm", label: "平静", emoji: "🍃" },
  { tag: "grateful", label: "感恩", emoji: "🙏" },
  { tag: "excited", label: "兴奋", emoji: "🎉" },
  { tag: "sad", label: "难过", emoji: "😢" },
  { tag: "anxious", label: "焦虑", emoji: "😰" },
  { tag: "angry", label: "生气", emoji: "😤" },
  { tag: "tired", label: "疲惫", emoji: "😩" },
  { tag: "lonely", label: "孤独", emoji: "🥺" },
  { tag: "confused", label: "迷茫", emoji: "🤔" },
];

function getMoodColor(score: number): string {
  if (score >= 5) return "hsl(150, 60%, 45%)";
  if (score >= 4) return "hsl(90, 50%, 45%)";
  if (score >= 3) return "hsl(45, 60%, 50%)";
  if (score >= 2) return "hsl(25, 60%, 50%)";
  return "hsl(0, 60%, 50%)";
}

function getMoodBgClass(score: number): string {
  if (score >= 4) return "bg-green-500/20 text-green-700 dark:text-green-400";
  if (score >= 3) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
  return "bg-red-500/20 text-red-700 dark:text-red-400";
}

// ─── New Entry Form ────────────────────────────────────────

function NewEntryForm({ onClose }: { onClose: () => void }) {
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: { moodScore: number; emotionTags: string[]; note: string }) => {
      const res = await apiRequest("POST", "/api/mood", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood"] });
      onClose();
    },
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <Card className="p-6 mb-6" data-testid="card-new-entry">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-sm">今天心情如何？</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} data-testid="button-close-entry">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Mood score */}
      <div className="flex items-center justify-center gap-3 mb-6" data-testid="mood-score-picker">
        {MOOD_LEVELS.map((m) => (
          <button
            key={m.score}
            onClick={() => setMoodScore(m.score)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              moodScore === m.score
                ? "bg-primary/10 scale-110"
                : "hover:bg-accent/50 opacity-60 hover:opacity-100"
            }`}
            data-testid={`button-mood-${m.score}`}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-xs text-muted-foreground">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Emotion tags */}
      <div className="mb-5">
        <p className="text-xs text-muted-foreground mb-2">选择你的情绪标签（可多选）</p>
        <div className="flex flex-wrap gap-2" data-testid="emotion-tags-picker">
          {EMOTION_OPTIONS.map((e) => (
            <button
              key={e.tag}
              onClick={() => toggleTag(e.tag)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs transition-all border ${
                selectedTags.includes(e.tag)
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border hover:border-primary/30 text-muted-foreground"
              }`}
              data-testid={`button-tag-${e.tag}`}
            >
              <span>{e.emoji}</span>
              <span>{e.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="mb-5">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="写点什么吧...今天发生了什么？有什么感想？"
          className="resize-none text-sm min-h-[80px]"
          data-testid="input-journal-note"
        />
      </div>

      <Button
        className="w-full"
        disabled={moodScore === null || mutation.isPending}
        onClick={() => {
          if (moodScore === null) return;
          mutation.mutate({ moodScore, emotionTags: selectedTags, note });
        }}
        data-testid="button-save-entry"
      >
        {mutation.isPending ? "保存中..." : "保存记录"}
      </Button>
    </Card>
  );
}

// ─── Calendar View ─────────────────────────────────────────

function CalendarView({ entries }: { entries: MoodEntry[] }) {
  const [viewMonth, setViewMonth] = useState(new Date());

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = getDay(monthStart); // 0=Sun

  const entryMap = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    entries.forEach((e) => {
      const key = format(new Date(e.createdAt), "yyyy-MM-dd");
      // Keep the latest entry for each day
      if (!map.has(key) || new Date(e.createdAt) > new Date(map.get(key)!.createdAt)) {
        map.set(key, e);
      }
    });
    return map;
  }, [entries]);

  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div data-testid="calendar-view">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          data-testid="button-prev-month"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium" data-testid="text-current-month">
          {format(viewMonth, "yyyy 年 M 月", { locale: zhCN })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          data-testid="button-next-month"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const entry = entryMap.get(key);
          const today = isToday(day);
          return (
            <div
              key={key}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${
                today ? "ring-1 ring-primary/40" : ""
              } ${entry ? "cursor-default" : ""}`}
              title={entry ? `心情: ${MOOD_LEVELS[entry.moodScore - 1]?.label || entry.moodScore}` : undefined}
              data-testid={`day-${key}`}
            >
              <span className={`${today ? "font-medium text-primary" : "text-muted-foreground"}`}>
                {day.getDate()}
              </span>
              {entry && (
                <span className="text-sm leading-none mt-0.5">
                  {MOOD_LEVELS[entry.moodScore - 1]?.emoji || "😐"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Trend Chart ───────────────────────────────────────────

function TrendChart({ entries }: { entries: MoodEntry[] }) {
  const chartData = useMemo(() => {
    // Group by date, take average mood
    const dayMap = new Map<string, number[]>();
    entries.forEach((e) => {
      const key = format(new Date(e.createdAt), "MM/dd");
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key)!.push(e.moodScore);
    });

    return Array.from(dayMap.entries())
      .map(([date, scores]) => ({
        date,
        mood: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      }))
      .slice(-30); // Last 30 days
  }, [entries]);

  if (chartData.length < 2) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="trend-empty">
        <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">至少需要 2 天的记录才能显示趋势图</p>
      </div>
    );
  }

  return (
    <div data-testid="trend-chart" className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => MOOD_LEVELS[v - 1]?.emoji || ""}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => {
              const m = MOOD_LEVELS[Math.round(value) - 1];
              return [`${m?.emoji} ${m?.label} (${value})`, "心情"];
            }}
          />
          <Line
            type="monotone"
            dataKey="mood"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Journal Page ─────────────────────────────────────

export default function JournalPage() {
  const [showForm, setShowForm] = useState(false);

  const { data: entries = [], isLoading } = useQuery<MoodEntry[]>({
    queryKey: ["/api/mood"],
  });

  // Sort newest first for list view
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries]
  );

  return (
    <div className="flex-1 overflow-y-auto" data-testid="journal-page">
      <PageContainer>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <BookHeart className="w-5 h-5 text-primary flex-shrink-0" />
              <h1 className="text-lg sm:text-xl font-semibold">情绪日记</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              记录每天的心情，观察情绪变化趋势
            </p>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)} className="flex-shrink-0" data-testid="button-new-entry">
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">记录</span>心情
            </Button>
          )}
        </div>

        {/* New entry form */}
        {showForm && <NewEntryForm onClose={() => setShowForm(false)} />}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : entries.length === 0 && !showForm ? (
          <div className="text-center py-16 text-muted-foreground" data-testid="journal-empty">
            <BookHeart className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="mb-4">还没有情绪记录</p>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              写下第一篇
            </Button>
          </div>
        ) : entries.length > 0 && (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="list" data-testid="tab-list">
                <BookHeart className="w-3.5 h-3.5 mr-1" />
                记录
              </TabsTrigger>
              <TabsTrigger value="calendar" data-testid="tab-calendar">
                <CalendarDays className="w-3.5 h-3.5 mr-1" />
                日历
              </TabsTrigger>
              <TabsTrigger value="trend" data-testid="tab-trend">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                趋势
              </TabsTrigger>
            </TabsList>

            {/* List view */}
            <TabsContent value="list">
              <div className="space-y-3" data-testid="journal-list">
                {sortedEntries.map((entry) => {
                  const tags: string[] = (() => {
                    try { return JSON.parse(entry.emotionTags); } catch { return []; }
                  })();
                  const moodInfo = MOOD_LEVELS[entry.moodScore - 1] || MOOD_LEVELS[2];

                  return (
                    <Card key={entry.id} className="p-4" data-testid={`card-entry-${entry.id}`}>
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">{moodInfo.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-xs ${getMoodBgClass(entry.moodScore)} border-0`}>
                              {moodInfo.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.createdAt), "M月d日 HH:mm", { locale: zhCN })}
                            </span>
                          </div>
                          {entry.note && (
                            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                              {entry.note}
                            </p>
                          )}
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tags.map((t) => {
                                const opt = EMOTION_OPTIONS.find((o) => o.tag === t);
                                return (
                                  <span
                                    key={t}
                                    className="inline-flex items-center gap-0.5 text-xs text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded"
                                  >
                                    {opt?.emoji} {opt?.label || t}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Calendar view */}
            <TabsContent value="calendar">
              <Card className="p-5">
                <CalendarView entries={entries} />
              </Card>
            </TabsContent>

            {/* Trend view */}
            <TabsContent value="trend">
              <Card className="p-5">
                <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  近 30 天心情趋势
                </h2>
                <TrendChart entries={entries} />
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </PageContainer>
    </div>
  );
}
