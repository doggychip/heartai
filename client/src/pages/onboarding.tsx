import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  Sparkles, MessageCircle, TrendingUp, Heart, ChevronRight,
  Star, Flame, Droplets, Mountain, Leaf,
} from "lucide-react";

const BIRTH_HOURS = [
  { value: 0, label: "子时 (23:00-01:00)" },
  { value: 2, label: "丑时 (01:00-03:00)" },
  { value: 4, label: "寅时 (03:00-05:00)" },
  { value: 6, label: "卯时 (05:00-07:00)" },
  { value: 8, label: "辰时 (07:00-09:00)" },
  { value: 10, label: "巳时 (09:00-11:00)" },
  { value: 12, label: "午时 (11:00-13:00)" },
  { value: 14, label: "未时 (13:00-15:00)" },
  { value: 16, label: "申时 (15:00-17:00)" },
  { value: 18, label: "酉时 (17:00-19:00)" },
  { value: 20, label: "戌时 (19:00-21:00)" },
  { value: 22, label: "亥时 (21:00-23:00)" },
];

const ELEMENT_DISPLAY: Record<string, { icon: any; color: string; bg: string; gradient: string }> = {
  "金": { icon: Star, color: "text-amber-500", bg: "bg-amber-500/10", gradient: "from-amber-400 to-yellow-500" },
  "木": { icon: Leaf, color: "text-emerald-500", bg: "bg-emerald-500/10", gradient: "from-emerald-400 to-green-500" },
  "水": { icon: Droplets, color: "text-blue-500", bg: "bg-blue-500/10", gradient: "from-blue-400 to-cyan-500" },
  "火": { icon: Flame, color: "text-red-500", bg: "bg-red-500/10", gradient: "from-red-400 to-orange-500" },
  "土": { icon: Mountain, color: "text-orange-700", bg: "bg-orange-700/10", gradient: "from-orange-400 to-amber-600" },
};

export default function OnboardingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [stage, setStage] = useState<"birth" | "reveal" | "choose">("birth");
  const [birthDate, setBirthDate] = useState("");
  const [birthHour, setBirthHour] = useState<number | null>(null);

  // Save profile mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = { birthDate };
      if (birthHour !== null) body.birthHour = birthHour;
      const res = await apiRequest("PATCH", "/api/profile", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setStage("reveal");
    },
  });

  // Fetch updated user data for reveal
  const { data: profile } = useQuery({
    queryKey: ["/api/users", user?.id, "profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${user?.id}/profile`);
      return res.json();
    },
    enabled: stage === "reveal" && !!user?.id,
  });

  // Fetch fortune for reveal
  const { data: fortune } = useQuery({
    queryKey: ["/api/fortune/today"],
    enabled: stage === "reveal" && !!user,
  });

  const personality = profile?.personality;
  const el = personality?.element;
  const elConfig = el ? ELEMENT_DISPLAY[el] : null;
  const ElIcon = elConfig?.icon || Sparkles;

  const userName = user?.nickname || user?.username || "旅者";

  // ── Stage 1: Birth Data ──
  if (stage === "birth") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-indigo-950/30 via-violet-950/20 to-background min-h-screen">
        <div className="max-w-sm w-full space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold">{userName}，探索你的命格</h1>
            <p className="text-sm text-muted-foreground">输入出生日期，解锁专属于你的命理分析</p>
          </div>

          {/* Birth date input */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">出生日期</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  出生时辰 <span className="text-muted-foreground font-normal">(可选，更精准)</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {BIRTH_HOURS.map(h => (
                    <button
                      key={h.value}
                      onClick={() => setBirthHour(birthHour === h.value ? null : h.value)}
                      className={`text-[11px] py-2 rounded-lg border transition-colors ${
                        birthHour === h.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-accent/50"
                      }`}
                    >
                      {h.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full h-11 text-base"
                disabled={!birthDate || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "解析命格中..." : "揭秘我的命格"}
              </Button>
            </CardContent>
          </Card>

          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto block"
          >
            稍后再说，先逛逛 →
          </button>
        </div>
      </div>
    );
  }

  // ── Stage 2: Destiny Reveal ──
  if (stage === "reveal") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-indigo-950/30 via-violet-950/20 to-background min-h-screen">
        <div className="max-w-sm w-full space-y-6">
          <div className="text-center mb-2">
            <h1 className="text-xl font-bold">你的命格名片</h1>
            <p className="text-sm text-muted-foreground mt-1">{userName}，这是属于你的命理底色</p>
          </div>

          {/* Destiny Card */}
          <Card className={`border-0 shadow-lg overflow-hidden ${elConfig?.bg || "bg-primary/5"}`}>
            <CardContent className="p-6">
              {/* Element hero */}
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${elConfig?.gradient || "from-primary to-primary/80"} flex items-center justify-center shadow-md`}>
                  <ElIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{el || "?"} 命</span>
                    {personality?.dayMaster && (
                      <Badge variant="secondary" className="text-xs">日主 {personality.dayMaster}</Badge>
                    )}
                  </div>
                  {personality?.zodiac && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {personality.zodiacEmoji} {personality.zodiac}
                      {personality.mbtiType ? ` · ${personality.mbtiType}` : ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Bazi */}
              {personality?.fullBazi && (
                <div className="bg-background/60 rounded-xl p-3 mb-4">
                  <p className="text-[10px] text-muted-foreground mb-1">八字命盘</p>
                  <p className="text-sm font-mono font-medium tracking-wider">{personality.fullBazi}</p>
                </div>
              )}

              {/* Traits */}
              {personality?.traits?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {personality.traits.slice(0, 6).map((t: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs animate-in fade-in duration-500" style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}>
                      {t}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Fortune preview */}
              {fortune && (
                <div className="flex items-center justify-between bg-background/60 rounded-xl p-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">今日运势</p>
                    <p className="text-lg font-bold">{(fortune as any).totalScore}<span className="text-xs text-muted-foreground font-normal">/100</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">幸运色</p>
                    <p className="text-sm font-medium">{(fortune as any).luckyColor || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">幸运数</p>
                    <p className="text-sm font-medium">{(fortune as any).luckyNumber || "—"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button className="w-full h-11" onClick={() => setStage("choose")}>
            开始探索 <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Stage 3: Choose First Feature ──
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-indigo-950/30 via-violet-950/20 to-background min-h-screen">
      <div className="max-w-sm w-full space-y-4">
        <div className="text-center mb-2">
          <h1 className="text-xl font-bold">选一个开始</h1>
          <p className="text-sm text-muted-foreground mt-1">AI 已经了解你的命格了</p>
        </div>

        <Link href="/chat">
          <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer bg-gradient-to-r from-violet-500/10 to-pink-500/10 dark:from-violet-900/25 dark:to-pink-900/25 mb-3">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-sm flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">灵魂对话</p>
                <p className="text-xs text-muted-foreground mt-0.5">AI 结合你的命格聊天，比普通聊天更懂你</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/fortune">
          <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-900/25 dark:to-orange-900/25 mb-3">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">今日运势</p>
                <p className="text-xs text-muted-foreground mt-0.5">基于你命盘的专属运势分析</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/soul-match">
          <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-900/25 dark:to-teal-900/25">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm flex-shrink-0">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">灵魂匹配</p>
                <p className="text-xs text-muted-foreground mt-0.5">25 道深度人格问题，找到你的灵魂共振者</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
