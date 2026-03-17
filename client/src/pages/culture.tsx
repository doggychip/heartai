import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  CalendarCheck,
  Sparkles,
  Heart,
  ChevronRight,
  ChevronLeft,
  User,
  Clock,
  CloudSun,
  Apple,
  Dumbbell,
  Brain,
  ArrowLeft,
  TrendingUp,
  Loader2,
  Zap,
  Briefcase,
  DollarSign,
  HeartPulse,
  Star,
  Users,
  Dice5,
  Send,
  Globe,
  Type,
  CloudMoon,
} from "lucide-react";
import { Link } from "wouter";

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

interface FortuneData {
  totalScore: number;
  loveScore: number;
  careerScore: number;
  wealthScore: number;
  healthScore: number;
  summary: string;
  detail: string;
  luckyColor: string;
  luckyNumber: string;
  luckyDirection: string;
  advice: string;
  warning: string;
  meta: {
    birthDate: string;
    birthElement: string;
    todayBazi: string;
    todayLunar: string;
    solarTerm: string | null;
  };
}

interface CompatibilityData {
  totalScore: number;
  dimensions: { name: string; score: number; desc: string }[];
  summary: string;
  strengths: string[];
  challenges: string[];
  advice: string;
  person1: { name: string; element: string; dayMaster: string; elementCount: Record<string, number> };
  person2: { name: string; element: string; dayMaster: string; elementCount: Record<string, number> };
}

interface DivinationData {
  hexagramName: string;
  mainReading: string;
  changingReading: string | null;
  answer: string;
  outlook: string;
  advice: string;
  timing: string;
  palace?: { name: string; element: string };
  shiYao?: number;
  yingYao?: number;
  yaoDetails?: { position: number; value: number; type: string; isChanging: boolean; ganZhi: string; element: string; liuQin: string; liuShen: string; isShi: boolean; isYing: boolean }[];
  dongYao?: number[];
  bianGua?: { mark: string; name: string } | null;
  meta: {
    question: string;
    mark?: string;
    hexagram?: { upper: string; lower: string; lines: { value: number; changing: boolean }[] };
  };
}

interface MultiCalendarData {
  date: string;
  gregorian: string;
  lunar: string;
  ganzhiYear: string;
  buddhist: string;
  buddhistYear: number;
  taoist: string;
  taoistYear: number;
  hijri: string;
  hijriYear: number;
  hijriMonth: string;
  hijriDay: number;
  weekday: string;
  description: { buddhist: string; taoist: string; hijri: string };
}

// ─── Constants ─────────────────────────────────────────

const ELEMENT_COLORS: Record<string, { bg: string; text: string; icon: any; ring: string }> = {
  "金": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", icon: Mountain, ring: "ring-amber-500/30" },
  "木": { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", icon: Leaf, ring: "ring-green-500/30" },
  "水": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", icon: Droplets, ring: "ring-blue-500/30" },
  "火": { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", icon: Flame, ring: "ring-red-500/30" },
  "土": { bg: "bg-yellow-700/10", text: "text-yellow-700 dark:text-yellow-500", icon: Mountain, ring: "ring-yellow-500/30" },
};

const SEASON_MAP: Record<string, { name: string; icon: any; color: string }> = {
  "春": { name: "春", icon: Leaf, color: "text-green-500" },
  "夏": { name: "夏", icon: Sun, color: "text-red-500" },
  "秋": { name: "秋", icon: Wind, color: "text-amber-500" },
  "冬": { name: "冬", icon: Moon, color: "text-blue-500" },
};

const HOUR_NAMES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const HOUR_TIMES = ["23-1", "1-3", "3-5", "5-7", "7-9", "9-11", "11-13", "13-15", "15-17", "17-19", "19-21", "21-23"];

type CultureView = "home" | "almanac" | "bazi" | "solar" | "fortune" | "compatibility" | "divination" | "name-score" | "qiuqian" | "zeji" | "dream";

// ─── Score Ring Component ──────────────────────────────

function ScoreRing({ score, size = 64, label, color }: { score: number; size?: number; label?: string; color?: string }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const scoreColor = color || (score >= 80 ? "text-green-500" : score >= 60 ? "text-amber-500" : "text-red-400");

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-muted/20" strokeWidth={4} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className={scoreColor}
            strokeWidth={4} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center font-bold text-sm ${scoreColor}`}>
          {score}
        </div>
      </div>
      {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
    </div>
  );
}

// ─── Dashboard Home ────────────────────────────────────

function CultureHome({ onNavigate }: { onNavigate: (v: CultureView) => void }) {
  const { data: almanac, isLoading } = useQuery<AlmanacData>({
    queryKey: ["/api/culture/almanac"],
  });

  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  const { data: multiCal } = useQuery<MultiCalendarData>({
    queryKey: ["/api/calendar/multi"],
    queryFn: () => apiRequest("GET", `/api/calendar/multi?tz=${encodeURIComponent(userTz)}`).then(r => r.json()),
  });

  const seasonInfo = almanac ? (SEASON_MAP[almanac.season] || SEASON_MAP["春"]) : SEASON_MAP["春"];

  return (
    <div className="space-y-5">
      {/* Today Hero Card */}
      {isLoading ? (
        <Skeleton className="h-36 w-full" />
      ) : almanac && (
        <Card className="p-5 bg-gradient-to-br from-primary/5 via-primary/8 to-amber-500/5 border-primary/20 relative overflow-hidden"
          data-testid="culture-hero-card">
          <div className="absolute top-3 right-3 opacity-10">
            <Scroll className="w-16 h-16" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
              <Calendar className="w-3 h-3" />
              <span>{almanac.date}</span>
              {almanac.solarTerm && (
                <Badge className="text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 h-4 px-1.5">
                  {almanac.solarTerm}
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-bold mb-1">
              {almanac.lunar.monthName}{almanac.lunar.dayName}
            </h2>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-[10px] h-5">{almanac.lunar.yearName}年</Badge>
              <Badge variant="outline" className="text-[10px] h-5">{almanac.lunar.zodiac}年</Badge>
              <Badge variant="outline" className="text-[10px] h-5">{almanac.bazi.day.pillar}日</Badge>
            </div>
            <div className="flex gap-4 text-xs">
              {almanac.acts.good.length === 1 && almanac.acts.good[0] === '諸事不宜' ? (
                <div>
                  <span className="text-amber-500">☸ </span>
                  <span className="text-muted-foreground">今日诸事不宜，宜静心修养</span>
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-green-600 dark:text-green-400">宜 </span>
                    <span className="text-muted-foreground">{almanac.acts.good.slice(0, 4).join("·")}</span>
                  </div>
                  <div>
                    <span className="text-red-500">忌 </span>
                    <span className="text-muted-foreground">{almanac.acts.bad.slice(0, 3).join("·")}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Feature Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { view: "fortune" as CultureView, icon: Sparkles, label: "每日运势", desc: "AI智能解读", color: "text-purple-500", bg: "bg-purple-500/10" },
          { view: "divination" as CultureView, icon: Dice5, label: "AI占卜", desc: "六爻问卦", color: "text-indigo-500", bg: "bg-indigo-500/10" },
          { view: "compatibility" as CultureView, icon: Users, label: "缘分合盘", desc: "双人五行", color: "text-pink-500", bg: "bg-pink-500/10" },
          { view: "almanac" as CultureView, icon: Scroll, label: "万年黄历", desc: "宜忌·神煞·吉时", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", linkTo: "/almanac" },
          { view: "bazi" as CultureView, icon: Compass, label: "八字排盘", desc: "十神·藏干·神煞", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10", linkTo: "/bazi" },
          { view: "solar" as CultureView, icon: Leaf, label: "节气养生", desc: "食物·运动", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
          { view: "name-score" as CultureView, icon: Type, label: "姓名测分", desc: "五格三才", color: "text-rose-500", bg: "bg-rose-500/10", linkTo: "/name-score" },
          { view: "qiuqian" as CultureView, icon: Flame, label: "求签解签", desc: "AI智慧解签", color: "text-amber-500", bg: "bg-amber-500/10", linkTo: "/qiuqian" },
          { view: "zeji" as CultureView, icon: CalendarCheck, label: "择吉日", desc: "搬家·结婚·开业", color: "text-red-500", bg: "bg-red-500/10", linkTo: "/zeji" },
          { view: "dream" as CultureView, icon: CloudMoon, label: "解梦", desc: "AI周公解梦", color: "text-violet-500", bg: "bg-violet-500/10", linkTo: "/dream" },
        ].map((item) => {
          const cardContent = (
            <Card
              key={item.view}
              className="p-3 cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.98]"
              onClick={'linkTo' in item ? undefined : () => onNavigate(item.view)}
              data-testid={`culture-nav-${item.view}`}
            >
              <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center mb-2`}>
                <item.icon className={`w-4.5 h-4.5 ${item.color}`} />
              </div>
              <div className="text-xs font-medium">{item.label}</div>
              <div className="text-[10px] text-muted-foreground">{item.desc}</div>
            </Card>
          );
          if ('linkTo' in item && (item as any).linkTo) {
            return <Link key={item.view} href={(item as any).linkTo}>{cardContent}</Link>;
          }
          return cardContent;
        })}
      </div>

      {/* Quick Info Cards */}
      {almanac && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="text-[10px] text-muted-foreground mb-1.5">今日四柱</div>
            <div className="flex gap-1.5">
              {[almanac.bazi.year, almanac.bazi.month, almanac.bazi.day, almanac.bazi.hour].map((p, i) => (
                <div key={i} className="flex-1 text-center bg-accent/30 rounded-md py-1.5">
                  <div className="text-xs font-bold">{p.pillar}</div>
                  <div className="text-[9px] text-muted-foreground">{["年", "月", "日", "时"][i]}柱</div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px] text-muted-foreground mb-1.5">吉时速查</div>
            <div className="flex flex-wrap gap-1">
              {almanac.luckHours.map((luck, i) => luck > 0 ? (
                <Badge key={i} variant="outline" className="text-[9px] text-green-600 dark:text-green-400 border-green-500/30 h-5">
                  {HOUR_NAMES[i]}时 {HOUR_TIMES[i]}
                </Badge>
              ) : null).filter(Boolean).slice(0, 6)}
            </div>
          </Card>
        </div>
      )}

      {/* 多历法展示 */}
      {multiCal && (
        <Card className="p-4 border-purple-200/40 dark:border-purple-900/30" data-testid="multi-calendar-card">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium">多历法展示</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: '☸️', label: '佛历', value: `${multiCal.buddhistYear}年`, color: 'text-amber-600 dark:text-amber-400' },
              { icon: '☯️', label: '道历', value: `${multiCal.taoistYear}年`, color: 'text-blue-600 dark:text-blue-400' },
              { icon: '☪️', label: '回历', value: `${multiCal.hijriYear}年`, color: 'text-green-600 dark:text-green-400' },
              { icon: '🌙', label: '农历', value: multiCal.lunar.replace('农历', ''), color: 'text-purple-600 dark:text-purple-400' },
            ].map((cal) => (
              <div key={cal.label} className="flex items-center gap-2 p-2 rounded-lg bg-accent/30">
                <span className="text-sm">{cal.icon}</span>
                <div>
                  <div className="text-[10px] text-muted-foreground">{cal.label}</div>
                  <div className={`text-xs font-bold ${cal.color}`}>{cal.value}</div>
                </div>
              </div>
            ))}
          </div>
          <Link href="/almanac">
            <Button variant="ghost" className="w-full mt-2 text-xs text-purple-500 hover:text-purple-600 h-7" data-testid="btn-view-almanac">
              查看完整黄历 →
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}

// ─── Almanac Detail View ───────────────────────────────

function AlmanacView() {
  const { data, isLoading } = useQuery<AlmanacData>({
    queryKey: ["/api/culture/almanac"],
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-32 w-full" /></div>;
  if (!data) return null;

  const seasonInfo = SEASON_MAP[data.season] || SEASON_MAP["春"];
  const SeasonIcon = seasonInfo.icon;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">{data.date}</div>
            <h2 className="text-xl font-bold">{data.lunar.monthName}{data.lunar.dayName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px]">{data.lunar.yearName}年</Badge>
              <Badge variant="outline" className="text-[10px]">{data.lunar.zodiac}年</Badge>
              {data.solarTerm && <Badge className="text-[10px] bg-primary/20 text-primary border-0">{data.solarTerm}</Badge>}
            </div>
          </div>
          <div className={`flex flex-col items-center gap-1 ${seasonInfo.color}`}>
            <SeasonIcon className="w-8 h-8" />
            <span className="text-xs font-medium">{seasonInfo.name}</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          建除十二神: <span className="text-foreground font-medium">{data.duty12}</span>
        </div>
      </Card>

      {/* 宜忌 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 border-green-500/20">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-5 h-5 rounded bg-green-500/10 flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400 text-xs font-bold">宜</span>
            </div>
            <span className="text-xs font-medium text-green-600 dark:text-green-400">今日宜</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {data.acts.good.map((a, i) => (
              <Badge key={i} variant="outline" className="text-[10px] border-green-500/20 text-green-700 dark:text-green-300">{a}</Badge>
            ))}
          </div>
        </Card>
        <Card className="p-3 border-red-500/20">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-5 h-5 rounded bg-red-500/10 flex items-center justify-center">
              <span className="text-red-500 text-xs font-bold">忌</span>
            </div>
            <span className="text-xs font-medium text-red-500">今日忌</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {data.acts.bad.map((a, i) => (
              <Badge key={i} variant="outline" className="text-[10px] border-red-500/20 text-red-600 dark:text-red-300">{a}</Badge>
            ))}
          </div>
        </Card>
      </div>

      {/* 四柱 */}
      <Card className="p-4">
        <h3 className="text-xs font-medium mb-3 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-primary" /> 今日四柱
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { name: "年柱", ...data.bazi.year, nayin: data.nayin.year },
            { name: "月柱", ...data.bazi.month, nayin: data.nayin.month },
            { name: "日柱", ...data.bazi.day, nayin: data.nayin.day },
            { name: "时柱", ...data.bazi.hour, nayin: data.nayin.hour },
          ].map((p) => (
            <div key={p.name} className="text-center bg-accent/30 rounded-lg p-2">
              <div className="text-[10px] text-muted-foreground mb-1">{p.name}</div>
              <div className="text-base font-bold">{p.pillar}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{p.nayin}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* 时辰吉凶 */}
      <Card className="p-4">
        <h3 className="text-xs font-medium mb-3 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" /> 时辰吉凶
        </h3>
        <div className="grid grid-cols-4 gap-1.5">
          {HOUR_NAMES.map((name, i) => {
            const isLucky = (data.luckHours[i] || 0) > 0;
            return (
              <div key={i} className={`text-center py-1.5 rounded-md text-[10px] ${isLucky ? "bg-green-500/10 text-green-600 dark:text-green-400 font-medium" : "bg-muted/30 text-muted-foreground"}`}>
                <div className="font-medium">{name}时</div>
                <div className="text-[9px]">{HOUR_TIMES[i]}</div>
                <div className={`text-[9px] font-medium ${isLucky ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>{isLucky ? "吉" : "凶"}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 吉方 */}
      <Card className="p-4">
        <h3 className="text-xs font-medium mb-3 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-primary" /> 吉神方位
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(data.luckDirections).map(([god, dir]) => (
            <div key={god} className="flex items-center justify-between bg-accent/20 rounded-lg px-3 py-2">
              <span className="text-xs font-medium">{god}</span>
              <Badge variant="outline" className="text-[10px]">{dir}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Bazi View ─────────────────────────────────────────

function BaziView() {
  const { user, updateProfile } = useAuth();
  const [birthDate, setBirthDate] = useState("");
  const [birthHour, setBirthHour] = useState(12);

  // Auto-populate from user profile
  useEffect(() => {
    if (user?.birthDate && !birthDate) setBirthDate(user.birthDate);
    if (user?.birthHour != null && birthHour === 12) setBirthHour(user.birthHour);
  }, [user]);

  const baziMutation = useMutation<BaziResult, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/culture/bazi", { birthDate, birthHour });
      // Auto-save birth data to user profile
      if (user && (!user.birthDate || user.birthDate !== birthDate || user.birthHour !== birthHour)) {
        updateProfile({ birthDate, birthHour }).catch(() => {});
      }
      return res.json();
    },
  });

  const data = baziMutation.data;

  return (
    <div className="space-y-4">
      {/* Input */}
      <Card className="p-4">
        <h3 className="text-xs font-medium mb-3 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-primary" /> 输入出生信息
        </h3>
        <div className="space-y-3">
          <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
            className="h-10 text-sm" data-testid="input-birth-date" />
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">出生时辰</label>
            <div className="grid grid-cols-4 gap-1">
              {HOUR_NAMES.map((name, i) => (
                <Button key={i} variant={birthHour === i * 2 + 1 ? "default" : "outline"} size="sm"
                  className="text-[10px] h-7" onClick={() => setBirthHour(i * 2 + 1)}>
                  {name} {HOUR_TIMES[i]}
                </Button>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={() => baziMutation.mutate()} disabled={!birthDate || baziMutation.isPending}
            data-testid="button-analyze-bazi">
            {baziMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Compass className="w-4 h-4 mr-1" />}
            排盘分析
          </Button>
        </div>
      </Card>

      {/* Results */}
      {data && (
        <>
          {/* Pillars */}
          <Card className="p-4">
            <h3 className="text-xs font-medium mb-3">八字四柱 · {data.fullBazi}</h3>
            <div className="grid grid-cols-4 gap-2">
              {data.pillars.map((p) => {
                const stemEl = ELEMENT_COLORS[p.stemElement] || ELEMENT_COLORS["土"];
                const branchEl = ELEMENT_COLORS[p.branchElement] || ELEMENT_COLORS["土"];
                return (
                  <div key={p.name} className="text-center">
                    <div className="text-[10px] text-muted-foreground mb-1">{p.name}</div>
                    <div className={`rounded-t-lg py-2 ${stemEl.bg}`}>
                      <div className={`text-lg font-bold ${stemEl.text}`}>{p.stem}</div>
                      <div className="text-[9px] text-muted-foreground">{p.stemElement}</div>
                    </div>
                    <div className={`rounded-b-lg py-2 ${branchEl.bg}`}>
                      <div className={`text-lg font-bold ${branchEl.text}`}>{p.branch}</div>
                      <div className="text-[9px] text-muted-foreground">{p.branchElement}</div>
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-1">{p.nayin}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 五行 */}
          <Card className="p-4">
            <h3 className="text-xs font-medium mb-3">五行分布 · 日主 {data.dayMaster}({data.dayMasterElement})</h3>
            <div className="flex gap-2">
              {Object.entries(data.elementCount).map(([el, count]) => {
                const info = ELEMENT_COLORS[el] || ELEMENT_COLORS["土"];
                const ElIcon = info.icon;
                const maxCount = Math.max(...Object.values(data.elementCount), 1);
                return (
                  <div key={el} className="flex-1 text-center">
                    <div className={`rounded-lg p-2 ${info.bg}`}>
                      <ElIcon className={`w-4 h-4 mx-auto ${info.text}`} />
                      <div className={`text-sm font-bold mt-1 ${info.text}`}>{count}</div>
                    </div>
                    <div className="mt-1.5 mx-auto w-4 bg-muted/30 rounded-full overflow-hidden" style={{ height: 40 }}>
                      <div className={`w-full rounded-full ${info.bg} border ${info.ring}`}
                        style={{ height: `${(count / maxCount) * 100}%`, marginTop: 'auto', transition: 'height 0.5s' }} />
                    </div>
                    <div className="text-[10px] mt-1 font-medium">{el}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 性格 */}
          <Card className="p-4">
            <h3 className="text-xs font-medium mb-3 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-primary" /> 五行性格分析
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-muted-foreground">性格特征</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.personality.traits.map((t, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">情绪倾向</span>
                <p className="text-xs mt-0.5">{data.personality.emotionTendency}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">优势</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.personality.strengths.map((s, i) => (
                    <Badge key={i} className="text-[10px] bg-primary/10 text-primary border-0">{s}</Badge>
                  ))}
                </div>
              </div>
              <div className="bg-accent/30 rounded-lg p-3">
                <span className="text-[10px] text-muted-foreground">调节建议</span>
                <p className="text-xs mt-0.5">{data.personality.advice}</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Solar Term View ───────────────────────────────────

function SolarTermView() {
  const { data, isLoading } = useQuery<SolarTermData>({
    queryKey: ["/api/culture/solar-terms"],
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-32 w-full" /></div>;
  if (!data) return null;

  const seasonInfo = SEASON_MAP[data.season] || SEASON_MAP["春"];
  const SeasonIcon = seasonInfo.icon;

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-gradient-to-br from-green-500/5 to-emerald-500/10 border-green-500/20">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{data.wellness.name}</h2>
            <p className="text-xs text-muted-foreground mt-1">{data.wellness.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-[10px]">{data.lunarDate}</Badge>
              <Badge variant="outline" className="text-[10px]">{data.season}季</Badge>
            </div>
          </div>
          <div className={`${seasonInfo.color}`}>
            <SeasonIcon className="w-10 h-10" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 text-center">
          <div className="text-[10px] text-muted-foreground">近期节气</div>
          <div className="text-sm font-bold mt-1">{data.recentTerm}</div>
          <div className="text-[10px] text-muted-foreground">{data.recentDate}</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-[10px] text-muted-foreground">下一节气</div>
          <div className="text-sm font-bold mt-1">{data.nextTerm}</div>
          <div className="text-[10px] text-muted-foreground">{data.nextDate}</div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-xs font-medium mb-3 flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-primary" /> 养生指南
        </h3>
        <div className="space-y-2">
          {data.wellness.wellness.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <div className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Leaf className="w-2.5 h-2.5 text-green-500" />
              </div>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-xs font-medium mb-3 flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-primary" /> 情绪调节
        </h3>
        <p className="text-xs bg-accent/30 rounded-lg p-3">{data.wellness.emotionGuide}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <h4 className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
            <Apple className="w-3 h-3" /> 推荐食物
          </h4>
          <div className="flex flex-wrap gap-1">
            {data.wellness.foods.map((f, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">{f}</Badge>
            ))}
          </div>
        </Card>
        <Card className="p-3">
          <h4 className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
            <Dumbbell className="w-3 h-3" /> 推荐运动
          </h4>
          <p className="text-xs">{data.wellness.exercise}</p>
        </Card>
      </div>
    </div>
  );
}

// ─── Daily Fortune View ────────────────────────────────

function FortuneView() {
  const { user, updateProfile } = useAuth();
  const [birthDate, setBirthDate] = useState("");

  // Auto-populate from user profile
  useEffect(() => {
    if (user?.birthDate && !birthDate) setBirthDate(user.birthDate);
  }, [user]);

  const fortuneMutation = useMutation<FortuneData, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/culture/daily-fortune", { birthDate });
      // Auto-save birth data to user profile
      if (user && (!user.birthDate || user.birthDate !== birthDate)) {
        updateProfile({ birthDate }).catch(() => {});
      }
      return res.json();
    },
  });

  const data = fortuneMutation.data;

  const scoreDimensions = data ? [
    { label: "感情", score: data.loveScore, icon: Heart, color: "text-pink-500" },
    { label: "事业", score: data.careerScore, icon: Briefcase, color: "text-blue-500" },
    { label: "财运", score: data.wealthScore, icon: DollarSign, color: "text-amber-500" },
    { label: "健康", score: data.healthScore, icon: HeartPulse, color: "text-green-500" },
  ] : [];

  return (
    <div className="space-y-4">
      {/* Input */}
      {!data && (
        <Card className="p-5 bg-gradient-to-br from-purple-500/5 to-indigo-500/10 border-purple-500/20">
          <div className="text-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="text-sm font-semibold">今日运势</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">输入出生日期，AI为你解读今日运势</p>
          </div>
          <div className="space-y-3">
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
              className="h-10 text-sm" data-testid="input-fortune-date" />
            <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              onClick={() => fortuneMutation.mutate()} disabled={!birthDate || fortuneMutation.isPending}
              data-testid="button-fortune">
              {fortuneMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
              查看今日运势
            </Button>
          </div>
        </Card>
      )}

      {/* Results */}
      {data && (
        <>
          {/* Total Score */}
          <Card className="p-5 bg-gradient-to-br from-purple-500/5 to-indigo-500/10 border-purple-500/20">
            <div className="flex items-center gap-4">
              <ScoreRing score={data.totalScore} size={80} color="text-purple-500" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold">{data.summary}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  {data.meta?.todayLunar && (
                    <Badge variant="outline" className="text-[9px] h-4">{data.meta.todayLunar}</Badge>
                  )}
                  {data.meta?.birthElement && (
                    <Badge variant="outline" className="text-[9px] h-4">{data.meta.birthElement}命</Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Dimension Scores */}
          <div className="grid grid-cols-4 gap-2">
            {scoreDimensions.map((dim) => (
              <Card key={dim.label} className="p-2">
                <ScoreRing score={dim.score} size={48} label={dim.label} color={dim.color} />
              </Card>
            ))}
          </div>

          {/* Detail */}
          <Card className="p-4">
            <p className="text-xs leading-relaxed">{data.detail}</p>
          </Card>

          {/* Lucky Items */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3 text-center">
              <div className="text-[10px] text-muted-foreground mb-1">幸运颜色</div>
              <div className="text-xs font-semibold">{data.luckyColor}</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-[10px] text-muted-foreground mb-1">幸运数字</div>
              <div className="text-xs font-semibold">{data.luckyNumber}</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-[10px] text-muted-foreground mb-1">幸运方位</div>
              <div className="text-xs font-semibold">{data.luckyDirection}</div>
            </Card>
          </div>

          {/* Advice */}
          <Card className="p-4 bg-green-500/5 border-green-500/20">
            <h4 className="text-[10px] text-green-600 dark:text-green-400 font-medium mb-1.5">今日建议</h4>
            <p className="text-xs">{data.advice}</p>
          </Card>
          {data.warning && (
            <Card className="p-4 bg-amber-500/5 border-amber-500/20">
              <h4 className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mb-1.5">注意事项</h4>
              <p className="text-xs">{data.warning}</p>
            </Card>
          )}

          <Button variant="outline" className="w-full text-xs" onClick={() => fortuneMutation.reset()}>
            重新测算
          </Button>
        </>
      )}
    </div>
  );
}

// ─── Compatibility View ────────────────────────────────

function CompatibilityView() {
  const [p1Name, setP1Name] = useState("");
  const [p1Date, setP1Date] = useState("");
  const [p2Name, setP2Name] = useState("");
  const [p2Date, setP2Date] = useState("");

  const mutation = useMutation<CompatibilityData, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/culture/compatibility", {
        person1: { name: p1Name || "甲方", birthDate: p1Date },
        person2: { name: p2Name || "乙方", birthDate: p2Date },
      });
      return res.json();
    },
  });

  const data = mutation.data;

  return (
    <div className="space-y-4">
      {!data && (
        <Card className="p-5 bg-gradient-to-br from-pink-500/5 to-rose-500/10 border-pink-500/20">
          <div className="text-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-pink-500" />
            </div>
            <h3 className="text-sm font-semibold">缘分合盘</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">输入两人出生日期，AI分析五行缘分</p>
          </div>
          <div className="space-y-3">
            <div className="bg-accent/30 rounded-lg p-3 space-y-2">
              <div className="text-[10px] font-medium text-pink-500">甲方</div>
              <Input placeholder="姓名（选填）" value={p1Name} onChange={(e) => setP1Name(e.target.value)} className="text-sm h-10" />
              <Input type="date" value={p1Date} onChange={(e) => setP1Date(e.target.value)} className="text-sm h-10" data-testid="input-p1-date" />
            </div>
            <div className="bg-accent/30 rounded-lg p-3 space-y-2">
              <div className="text-[10px] font-medium text-indigo-500">乙方</div>
              <Input placeholder="姓名（选填）" value={p2Name} onChange={(e) => setP2Name(e.target.value)} className="text-sm h-10" />
              <Input type="date" value={p2Date} onChange={(e) => setP2Date(e.target.value)} className="text-sm h-10" data-testid="input-p2-date" />
            </div>
            <Button className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
              onClick={() => mutation.mutate()} disabled={!p1Date || !p2Date || mutation.isPending}
              data-testid="button-compatibility">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Heart className="w-4 h-4 mr-1" />}
              合盘分析
            </Button>
          </div>
        </Card>
      )}

      {data && (
        <>
          {/* Score */}
          <Card className="p-5 bg-gradient-to-br from-pink-500/5 to-rose-500/10 border-pink-500/20">
            <div className="text-center">
              <ScoreRing score={data.totalScore} size={96} color="text-pink-500" />
              <div className="flex items-center justify-center gap-2 mt-3">
                <Badge className="text-[10px] bg-pink-500/10 text-pink-500 border-0">{data.person1.name}({data.person1.element})</Badge>
                <Heart className="w-3.5 h-3.5 text-pink-400" />
                <Badge className="text-[10px] bg-indigo-500/10 text-indigo-500 border-0">{data.person2.name}({data.person2.element})</Badge>
              </div>
            </div>
          </Card>

          {/* Dimensions */}
          <Card className="p-4">
            <h3 className="text-xs font-medium mb-3">细分维度</h3>
            <div className="space-y-3">
              {data.dimensions.map((dim) => (
                <div key={dim.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{dim.name}</span>
                    <span className={dim.score >= 80 ? "text-green-500" : dim.score >= 60 ? "text-amber-500" : "text-red-400"}>{dim.score}分</span>
                  </div>
                  <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${dim.score >= 80 ? "bg-green-500" : dim.score >= 60 ? "bg-amber-500" : "bg-red-400"}`}
                      style={{ width: `${dim.score}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{dim.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-4">
            <p className="text-xs leading-relaxed">{data.summary}</p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 border-green-500/20">
              <div className="text-[10px] text-green-600 dark:text-green-400 font-medium mb-1.5">优势</div>
              {data.strengths.map((s, i) => (
                <div key={i} className="text-xs flex items-center gap-1 mb-0.5">
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                  {s}
                </div>
              ))}
            </Card>
            <Card className="p-3 border-amber-500/20">
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mb-1.5">注意</div>
              {data.challenges.map((c, i) => (
                <div key={i} className="text-xs flex items-center gap-1 mb-0.5">
                  <div className="w-1 h-1 rounded-full bg-amber-500" />
                  {c}
                </div>
              ))}
            </Card>
          </div>

          <Card className="p-4 bg-accent/30">
            <h4 className="text-[10px] font-medium text-primary mb-1">相处建议</h4>
            <p className="text-xs">{data.advice}</p>
          </Card>

          <Button variant="outline" className="w-full text-xs" onClick={() => mutation.reset()}>
            重新测算
          </Button>
        </>
      )}
    </div>
  );
}

// ─── Divination View ───────────────────────────────────

function DivinationView() {
  const [question, setQuestion] = useState("");

  const mutation = useMutation<DivinationData, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/culture/divination", { question });
      return res.json();
    },
  });

  const data = mutation.data;

  const outlookColor = (outlook: string) => {
    if (outlook.includes("大吉")) return "text-green-500 bg-green-500/10";
    if (outlook.includes("中吉") || outlook.includes("小吉")) return "text-emerald-500 bg-emerald-500/10";
    if (outlook.includes("平")) return "text-muted-foreground bg-muted/30";
    return "text-amber-500 bg-amber-500/10";
  };

  return (
    <div className="space-y-4">
      {!data && (
        <Card className="p-5 bg-gradient-to-br from-indigo-500/5 to-violet-500/10 border-indigo-500/20">
          <div className="text-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-2">
              <Dice5 className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="text-sm font-semibold">AI占卜问答</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">心中默念问题，AI为你起卦解读</p>
          </div>
          <div className="space-y-3">
            <Textarea
              placeholder="请输入你想占问的事情，例如：最近适合跳槽吗？这段感情会有结果吗？"
              value={question} onChange={(e) => setQuestion(e.target.value)}
              className="text-sm min-h-[80px] resize-none" data-testid="input-divination"
            />
            <Button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
              onClick={() => mutation.mutate()} disabled={!question.trim() || mutation.isPending}
              data-testid="button-divination">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              起卦占问
            </Button>
          </div>
        </Card>
      )}

      {data && (
        <>
          {/* Hexagram */}
          <Card className="p-5 bg-gradient-to-br from-indigo-500/5 to-violet-500/10 border-indigo-500/20 text-center">
            <h3 className="text-base font-bold">{data.hexagramName}</h3>
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              {data.palace && (
                <Badge variant="outline" className="text-[10px]">
                  {data.palace.name}宫·{data.palace.element}
                </Badge>
              )}
              {data.shiYao && (
                <Badge variant="outline" className="text-[10px]">
                  世{data.shiYao}爵 应{data.yingYao}爵
                </Badge>
              )}
              <Badge className={`text-[10px] border-0 ${outlookColor(data.outlook)}`}>
                {data.outlook}
              </Badge>
              {data.bianGua && (
                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">
                  变→{data.bianGua.name}
                </Badge>
              )}
            </div>
          </Card>

          {/* 纳甲六爵 Visualization */}
          <Card className="p-4">
            <h4 className="text-[10px] text-muted-foreground mb-2">纳甲排盘</h4>
            <div className="flex flex-col-reverse gap-1">
              {(data.yaoDetails || []).map((yao, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-muted-foreground w-3 text-right">{yao.position}</span>
                  <span className="font-mono w-8 text-center">{yao.type}</span>
                  <span className={`w-6 text-center font-bold ${
                    yao.element === '木' ? 'text-green-600' : yao.element === '火' ? 'text-red-500' :
                    yao.element === '土' ? 'text-amber-700' : yao.element === '金' ? 'text-yellow-500' : 'text-blue-500'
                  }`}>{yao.ganZhi}</span>
                  <span className="w-5 text-center">{yao.element}</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1">{yao.liuQin}</Badge>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1">{yao.liuShen}</Badge>
                  {yao.isShi && <Badge className="text-[9px] h-4 px-1 bg-blue-500 border-0">世</Badge>}
                  {yao.isYing && <Badge className="text-[9px] h-4 px-1 bg-green-500 border-0">应</Badge>}
                  {yao.isChanging && <Badge className="text-[9px] h-4 px-1 bg-red-500 border-0">动</Badge>}
                </div>
              ))}
            </div>
          </Card>

          {/* Reading */}
          <Card className="p-4">
            <h4 className="text-[10px] font-medium text-muted-foreground mb-1.5">主卦解读</h4>
            <p className="text-xs leading-relaxed">{data.mainReading}</p>
            {data.changingReading && (
              <>
                <h4 className="text-[10px] font-medium text-muted-foreground mt-3 mb-1.5">变卦启示</h4>
                <p className="text-xs leading-relaxed">{data.changingReading}</p>
              </>
            )}
          </Card>

          {/* Answer */}
          <Card className="p-4 bg-accent/30">
            <h4 className="text-[10px] font-medium text-primary mb-1.5">
              关于「{data.meta.question.length > 20 ? data.meta.question.slice(0, 20) + '...' : data.meta.question}」
            </h4>
            <p className="text-xs leading-relaxed">{data.answer}</p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <div className="text-[10px] text-muted-foreground mb-1">行动建议</div>
              <p className="text-xs">{data.advice}</p>
            </Card>
            <Card className="p-3">
              <div className="text-[10px] text-muted-foreground mb-1">时机</div>
              <p className="text-xs">{data.timing}</p>
            </Card>
          </div>

          <Button variant="outline" className="w-full text-xs" onClick={() => { mutation.reset(); setQuestion(""); }}>
            重新起卦
          </Button>
        </>
      )}
    </div>
  );
}

// ─── View Title Map ────────────────────────────────────

const VIEW_TITLES: Record<CultureView, string> = {
  home: "国粹频道",
  almanac: "每日黄历",
  bazi: "八字排盘",
  solar: "节气养生",
  fortune: "每日运势",
  compatibility: "缘分合盘",
  divination: "AI占卜",
};

// ─── Main Page Component ───────────────────────────────

export default function CulturePage() {
  const [view, setView] = useState<CultureView>("home");

  return (
    <div className="flex-1 overflow-y-auto" data-testid="culture-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          {view !== "home" && (
            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1" onClick={() => setView("home")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Scroll className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{VIEW_TITLES[view]}</h1>
              {view === "home" && (
                <p className="text-xs text-muted-foreground">传统智慧 · AI解读 · 自我认知</p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {view === "home" && <CultureHome onNavigate={setView} />}
        {view === "almanac" && <AlmanacView />}
        {view === "bazi" && <BaziView />}
        {view === "solar" && <SolarTermView />}
        {view === "fortune" && <FortuneView />}
        {view === "compatibility" && <CompatibilityView />}
        {view === "divination" && <DivinationView />}
      </div>
    </div>
  );
}
