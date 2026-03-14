import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Scroll,
  Sun,
  Moon,
  Compass,
  Leaf,
  Flame,
  Droplets,
  Mountain,
  Wind,
  Calendar,
  Sparkles,
  Heart,
  ChevronRight,
  User,
  Clock,
  CloudSun,
  Apple,
  Dumbbell,
  Brain,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────

interface AlmanacData {
  date: string;
  lunar: {
    year: number; month: number; day: number;
    yearName: string; monthName: string; dayName: string;
    isLeap: boolean; zodiac: string;
  };
  bazi: {
    full: string;
    year: { stem: string; branch: string; pillar: string };
    month: { stem: string; branch: string; pillar: string };
    day: { stem: string; branch: string; pillar: string };
    hour: { stem: string; branch: string; pillar: string };
  };
  nayin: { year: string; month: string; day: string; hour: string };
  solarTerm: string | null;
  season: string;
  acts: { good: string[]; bad: string[] };
  duty12: string;
  luckHours: number[];
  luckDirections: Record<string, string>;
}

interface BaziResult {
  birthDate: string;
  birthHour: number;
  fullBazi: string;
  pillars: {
    name: string; pillar: string; stem: string; branch: string;
    stemElement: string; branchElement: string; nayin: string;
    hiddenStems: string[];
  }[];
  dayMaster: string;
  dayMasterElement: string;
  zodiac: string;
  elementCount: Record<string, number>;
  personality: {
    traits: string[];
    emotionTendency: string;
    strengths: string[];
    advice: string;
  };
}

interface SolarTermData {
  currentTerm: string | null;
  recentTerm: string;
  recentDate: string;
  nextTerm: string;
  nextDate: string;
  season: string;
  wellness: {
    name: string; description: string;
    wellness: string[]; emotionGuide: string;
    foods: string[]; exercise: string;
  };
  lunarDate: string;
}

// ─── Constants ─────────────────────────────────────────

const ELEMENT_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  "金": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", icon: Mountain },
  "木": { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", icon: Leaf },
  "水": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", icon: Droplets },
  "火": { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", icon: Flame },
  "土": { bg: "bg-yellow-700/10", text: "text-yellow-700 dark:text-yellow-500", icon: Mountain },
};

const SEASON_MAP: Record<string, { name: string; icon: any; color: string }> = {
  "春": { name: "春", icon: Leaf, color: "text-green-500" },
  "夏": { name: "夏", icon: Sun, color: "text-red-500" },
  "秋": { name: "秋", icon: Wind, color: "text-amber-500" },
  "冬": { name: "冬", icon: Moon, color: "text-blue-500" },
};

const HOUR_NAMES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const HOUR_TIMES = ["23-1", "1-3", "3-5", "5-7", "7-9", "9-11", "11-13", "13-15", "15-17", "17-19", "19-21", "21-23"];

// ─── Tab 1: 每日黄历 ───────────────────────────────────

function AlmanacTab() {
  const { data, isLoading } = useQuery<AlmanacData>({
    queryKey: ["/api/culture/almanac"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) return null;
  const seasonInfo = SEASON_MAP[data.season] || SEASON_MAP["春"];
  const SeasonIcon = seasonInfo.icon;

  return (
    <div className="space-y-4">
      {/* Hero card — Today's date */}
      <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">{data.date}</div>
            <h2 className="text-xl font-bold">
              {data.lunar.monthName}{data.lunar.dayName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px]">
                {data.lunar.yearName}年
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {data.lunar.zodiac}年
              </Badge>
              {data.solarTerm && (
                <Badge className="text-[10px] bg-primary/20 text-primary border-0">
                  {data.solarTerm}
                </Badge>
              )}
            </div>
          </div>
          <div className={`flex flex-col items-center gap-1 ${seasonInfo.color}`}>
            <SeasonIcon className="w-8 h-8" />
            <span className="text-xs font-medium">{seasonInfo.name}</span>
          </div>
        </div>

        {/* Bazi */}
        <div className="grid grid-cols-4 gap-2">
          {(["year", "month", "day", "hour"] as const).map((key) => {
            const p = data.bazi[key];
            const label = key === "year" ? "年" : key === "month" ? "月" : key === "day" ? "日" : "时";
            return (
              <div key={key} className="text-center">
                <div className="text-[10px] text-muted-foreground mb-0.5">{label}柱</div>
                <div className="text-base font-bold tracking-wider">{p.pillar}</div>
                <div className="text-[10px] text-muted-foreground">{data.nayin[key]}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 宜忌 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1 h-4 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-green-600 dark:text-green-400">宜</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {data.acts.good.length > 0 ? data.acts.good.slice(0, 8).map((act, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] font-normal bg-green-500/5">
                {act}
              </Badge>
            )) : (
              <span className="text-xs text-muted-foreground">诸事不宜</span>
            )}
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1 h-4 rounded-full bg-red-500" />
            <span className="text-xs font-medium text-red-600 dark:text-red-400">忌</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {data.acts.bad.length > 0 ? data.acts.bad.slice(0, 8).map((act, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] font-normal bg-red-500/5">
                {act}
              </Badge>
            )) : (
              <span className="text-xs text-muted-foreground">诸事不忌</span>
            )}
          </div>
        </Card>
      </div>

      {/* 建除十二神 + 吉神方位 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Compass className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">今日信息</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {data.duty12 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">建除:</span>
              <span className="font-medium">{data.duty12}</span>
            </div>
          )}
          {Object.entries(data.luckDirections).map(([god, dir]) => (
            <div key={god} className="flex items-center gap-2">
              <span className="text-muted-foreground">{god}:</span>
              <span className="font-medium">{dir}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 时辰吉凶 */}
      {data.luckHours.length === 12 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">时辰吉凶</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {data.luckHours.map((luck, i) => (
              <div
                key={i}
                className={`text-center p-1.5 rounded-lg ${
                  luck > 0
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-red-500/5 text-red-400 dark:text-red-500"
                }`}
              >
                <div className="text-xs font-medium">{HOUR_NAMES[i]}</div>
                <div className="text-[9px] text-muted-foreground">{HOUR_TIMES[i]}</div>
                <div className="text-[10px] font-medium mt-0.5">{luck > 0 ? "吉" : "凶"}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 2: 八字分析 ───────────────────────────────────

function BaziTab() {
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthHour, setBirthHour] = useState("12");
  const [result, setResult] = useState<BaziResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/culture/bazi", {
        year: parseInt(birthYear),
        month: parseInt(birthMonth),
        day: parseInt(birthDay),
        hour: parseInt(birthHour),
      });
      return res.json() as Promise<BaziResult>;
    },
    onSuccess: (data) => setResult(data),
  });

  const canSubmit = birthYear.length === 4 && birthMonth && birthDay;

  return (
    <div className="space-y-4">
      {/* Input form */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">输入出生信息</span>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">出生年</label>
            <input
              type="number"
              placeholder="1990"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-center"
              min="1901"
              max="2100"
              data-testid="input-birth-year"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">月</label>
            <select
              value={birthMonth}
              onChange={(e) => setBirthMonth(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
              data-testid="input-birth-month"
            >
              <option value="">月</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}月</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">日</label>
            <select
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
              data-testid="input-birth-day"
            >
              <option value="">日</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}日</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">时辰</label>
            <select
              value={birthHour}
              onChange={(e) => setBirthHour(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
              data-testid="input-birth-hour"
            >
              {HOUR_NAMES.map((name, i) => {
                const hour = i === 0 ? 0 : i * 2 - 1;
                return (
                  <option key={i} value={hour}>
                    {name}时 ({HOUR_TIMES[i]})
                  </option>
                );
              })}
              <option value="12">不确定</option>
            </select>
          </div>
        </div>

        <Button
          className="w-full"
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate()}
          data-testid="button-calculate-bazi"
        >
          {mutation.isPending ? "排盘中..." : "排盘分析"}
        </Button>
      </Card>

      {/* Result */}
      {result && (
        <>
          {/* 四柱排盘 */}
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">四柱排盘</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px]">{result.zodiac}年</Badge>
                <Badge variant="outline" className="text-[10px]">日主 {result.dayMaster}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {result.pillars.map((p, i) => {
                const stemEl = ELEMENT_COLORS[p.stemElement];
                const branchEl = ELEMENT_COLORS[p.branchElement];
                return (
                  <div key={i} className="text-center">
                    <div className="text-[10px] text-muted-foreground mb-1">{p.name}</div>
                    <div className={`text-lg font-bold ${stemEl?.text || ""}`}>{p.stem}</div>
                    <div className={`text-lg font-bold ${branchEl?.text || ""}`}>{p.branch}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{p.nayin}</div>
                    {p.hiddenStems.length > 0 && (
                      <div className="text-[9px] text-muted-foreground/70 mt-0.5">
                        藏 {p.hiddenStems.join(" ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 五行分布 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium">五行分布</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(result.elementCount).map(([el, count]) => {
                const info = ELEMENT_COLORS[el];
                const Icon = info?.icon || Mountain;
                const maxCount = Math.max(...Object.values(result.elementCount), 1);
                return (
                  <div key={el} className="text-center">
                    <div className={`mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-1 ${info?.bg || "bg-muted"}`}>
                      <Icon className={`w-5 h-5 ${info?.text || ""}`} />
                    </div>
                    <div className="text-xs font-bold">{el}</div>
                    <div className="text-[10px] text-muted-foreground">{count} 个</div>
                    <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${count === 0 ? "bg-red-400" : "bg-primary/60"}`}
                        style={{ width: `${Math.max((count / maxCount) * 100, 10)}%` }}
                      />
                    </div>
                    {count === 0 && (
                      <div className="text-[9px] text-red-400 mt-0.5">缺</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 性格与情绪分析 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">性格与情绪倾向</span>
              <Badge variant="outline" className="text-[10px]">
                {result.dayMasterElement}命
              </Badge>
            </div>

            {/* Traits */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {result.personality.traits.map((trait, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                  {trait}
                </Badge>
              ))}
            </div>

            {/* Emotion tendency */}
            <div className="mb-3">
              <div className="text-[10px] text-muted-foreground font-medium mb-1">情绪倾向</div>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {result.personality.emotionTendency}
              </p>
            </div>

            {/* Strengths */}
            <div className="mb-3">
              <div className="text-[10px] text-muted-foreground font-medium mb-1">情绪优势</div>
              <ul className="space-y-1">
                {result.personality.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">✦</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Advice */}
            <div className="p-3 rounded-lg bg-primary/5">
              <div className="text-[10px] text-primary font-medium mb-1">调节建议</div>
              <p className="text-xs text-foreground/70 leading-relaxed">
                {result.personality.advice}
              </p>
            </div>
          </Card>
        </>
      )}

      {!result && !mutation.isPending && (
        <Card className="p-8 text-center">
          <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">输入出生信息获取八字分析</p>
          <p className="text-xs text-muted-foreground/60">基于传统命理学的五行与情绪倾向分析</p>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 3: 节气养生 ───────────────────────────────────

function SolarTermTab() {
  const { data, isLoading } = useQuery<SolarTermData>({
    queryKey: ["/api/culture/solar-terms"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) return null;
  const w = data.wellness;
  const seasonInfo = SEASON_MAP[data.season] || SEASON_MAP["春"];
  const SeasonIcon = seasonInfo.icon;

  return (
    <div className="space-y-4">
      {/* Current term hero */}
      <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">当前节气</div>
            <h2 className="text-xl font-bold">{w.name || data.recentTerm}</h2>
            <p className="text-xs text-muted-foreground mt-1">{w.description}</p>
          </div>
          <div className={`flex flex-col items-center gap-1 ${seasonInfo.color}`}>
            <SeasonIcon className="w-8 h-8" />
            <span className="text-xs font-medium">{seasonInfo.name}季</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {data.recentDate && (
            <span>始于 {data.recentDate}</span>
          )}
          {data.nextTerm && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span>下一节气: {data.nextTerm} ({data.nextDate})</span>
            </>
          )}
        </div>
      </Card>

      {/* 情绪调节 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">节气情绪指南</span>
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed">
          {w.emotionGuide}
        </p>
      </Card>

      {/* 养生建议 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CloudSun className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">养生要点</span>
        </div>
        <ul className="space-y-2">
          {w.wellness.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span className="text-primary mt-0.5 flex-shrink-0">•</span>
              <span className="text-foreground/80">{tip}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* 推荐食物 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Apple className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">时令饮食</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {w.foods.map((food, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] font-normal">
              {food}
            </Badge>
          ))}
        </div>
      </Card>

      {/* 运动建议 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">推荐运动</span>
        </div>
        <p className="text-xs text-foreground/80">{w.exercise}</p>
      </Card>

      {/* 农历信息 */}
      <Card className="p-3">
        <div className="text-center text-xs text-muted-foreground">
          今日农历: {data.lunarDate}
        </div>
      </Card>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────

export default function CulturePage() {
  const [activeTab, setActiveTab] = useState("almanac");

  return (
    <div className="flex-1 overflow-y-auto" data-testid="culture-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Scroll className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">国粹频道</h1>
            <p className="text-xs text-muted-foreground">传统文化 · 黄历宜忌 · 八字五行 · 节气养生</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-5">
            <TabsTrigger value="almanac" className="text-xs gap-1" data-testid="tab-almanac">
              <Calendar className="w-3.5 h-3.5" />
              每日黄历
            </TabsTrigger>
            <TabsTrigger value="bazi" className="text-xs gap-1" data-testid="tab-bazi">
              <Sparkles className="w-3.5 h-3.5" />
              八字分析
            </TabsTrigger>
            <TabsTrigger value="wellness" className="text-xs gap-1" data-testid="tab-wellness">
              <Leaf className="w-3.5 h-3.5" />
              节气养生
            </TabsTrigger>
          </TabsList>

          <TabsContent value="almanac">
            <AlmanacTab />
          </TabsContent>

          <TabsContent value="bazi">
            <BaziTab />
          </TabsContent>

          <TabsContent value="wellness">
            <SolarTermTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
