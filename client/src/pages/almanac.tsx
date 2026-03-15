import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Compass,
  Clock,
  Sparkles,
  Shield,
  AlertTriangle,
  Star,
  MapPin,
  Baby,
  Scroll,
  ArrowLeft,
  Swords,
  BookOpen,
  RotateCcw,
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
  goodGods: string[];
  badGods: string[];
  by12God: string;
  life12God: string;
  fetalGodDesc: string;
  chong: string;
  sha: string;
  pengzuTaboo: string;
  hourDetails: { name: string; luck: number; gods: string[] }[];
}

interface MultiCalendar {
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

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

// ─── Live Clock Component ──────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');

  return (
    <div className="text-center">
      <div className="flex items-baseline justify-center gap-0.5">
        <span className="text-5xl font-black tracking-tight tabular-nums">{h}</span>
        <span className="text-4xl font-light opacity-60 animate-pulse">:</span>
        <span className="text-5xl font-black tracking-tight tabular-nums">{m}</span>
        <span className="text-2xl font-medium opacity-50 ml-1 tabular-nums">{s}</span>
      </div>
    </div>
  );
}

// ─── Location Display ──────────────────────────────────
function LocationDisplay() {
  const [location, setLocation] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=zh`,
            { headers: { 'User-Agent': 'GuanXing/1.0' } }
          );
          const data = await resp.json();
          const city = data.address?.city || data.address?.town || data.address?.county || data.address?.state || '';
          const district = data.address?.suburb || data.address?.district || '';
          setLocation(district ? `${city} ${district}` : city);
        } catch {
          setLocation(null);
        }
      },
      () => setLocation(null),
      { timeout: 5000 }
    );
  }, []);

  if (!location) return null;
  return (
    <div className="flex items-center justify-center gap-1 text-xs opacity-70">
      <MapPin className="w-3 h-3" />
      <span>{location}</span>
    </div>
  );
}

// ─── Horizontal Date Strip ─────────────────────────────
function DateStrip({
  selectedDate,
  onSelect,
}: {
  selectedDate: Date;
  onSelect: (d: Date) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  });

  // Generate days for the view month
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Date[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const today = new Date();
  const todayStr = formatDate(today);
  const selectedStr = formatDate(selectedDate);

  // Scroll selected date into view
  useEffect(() => {
    setTimeout(() => {
      const el = scrollRef.current?.querySelector('[data-selected="true"]') as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 100);
  }, [selectedStr, viewMonth]);

  // Sync viewMonth when selectedDate changes to a different month
  useEffect(() => {
    if (selectedDate.getMonth() !== viewMonth.getMonth() || selectedDate.getFullYear() !== viewMonth.getFullYear()) {
      setViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [selectedDate]);

  const prevMonth = () => {
    setViewMonth(new Date(year, month - 1, 1));
    onSelect(new Date(year, month - 1, Math.min(selectedDate.getDate(), new Date(year, month, 0).getDate())));
  };
  const nextMonth = () => {
    setViewMonth(new Date(year, month + 1, 1));
    onSelect(new Date(year, month + 1, Math.min(selectedDate.getDate(), new Date(year, month + 2, 0).getDate())));
  };

  const isViewingToday = selectedStr === todayStr;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 hover:bg-white/10 rounded-lg transition" data-testid="btn-prev-month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold min-w-[80px] text-center">
            {year}年{month + 1}月
          </span>
          <button onClick={nextMonth} className="p-1.5 hover:bg-white/10 rounded-lg transition" data-testid="btn-next-month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {!isViewingToday && (
          <button
            onClick={() => {
              const t = new Date();
              setViewMonth(new Date(t.getFullYear(), t.getMonth(), 1));
              onSelect(t);
            }}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-full transition"
            data-testid="btn-go-today"
          >
            <RotateCcw className="w-3 h-3" />
            今天
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {days.map((day) => {
          const ds = formatDate(day);
          const isSelected = ds === selectedStr;
          const isToday = ds === todayStr;
          const dow = day.getDay();
          const isWeekend = dow === 0 || dow === 6;

          return (
            <button
              key={ds}
              ref={isToday ? todayRef : undefined}
              data-selected={isSelected}
              onClick={() => onSelect(day)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 py-1.5 px-2.5 rounded-xl transition-all min-w-[44px] ${
                isSelected
                  ? 'bg-white text-red-700 shadow-md scale-105'
                  : isToday
                  ? 'bg-white/20 text-white'
                  : 'hover:bg-white/10 text-white/80'
              }`}
              data-testid={`date-${day.getDate()}`}
            >
              <span className={`text-[10px] ${isSelected ? 'text-red-500' : isWeekend ? 'text-amber-200' : 'opacity-60'}`}>
                {WEEKDAYS[dow]}
              </span>
              <span className={`text-base font-bold ${isSelected ? 'text-red-700' : ''}`}>
                {day.getDate()}
              </span>
              {isToday && !isSelected && (
                <div className="w-1 h-1 rounded-full bg-amber-300" />
              )}
              {isToday && isSelected && (
                <div className="w-1 h-1 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Almanac Page ─────────────────────────────────
export default function AlmanacPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedHour, setExpandedHour] = useState<number | null>(null);
  const dateStr = formatDate(selectedDate);

  const { data: almanac, isLoading: almanacLoading } = useQuery<AlmanacData>({
    queryKey: ["/api/culture/almanac", dateStr],
    queryFn: () => apiRequest("GET", `/api/culture/almanac?date=${dateStr}`).then(r => r.json()),
  });

  const { data: multiCal, isLoading: calLoading } = useQuery<MultiCalendar>({
    queryKey: ["/api/calendar/multi", dateStr],
    queryFn: () => apiRequest("GET", `/api/calendar/multi?date=${dateStr}`).then(r => r.json()),
  });

  const isToday = formatDate(new Date()) === dateStr;
  const seasonEmoji: Record<string, string> = { '春': '🌸', '夏': '☀️', '秋': '🍂', '冬': '❄️' };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-orange-50/30 to-red-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* ─── Hero Header with Clock + Location + Date Strip ─── */}
      <div className="bg-gradient-to-b from-red-700 via-red-600 to-amber-600 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-60px] right-[-40px] w-48 h-48 rounded-full border border-white/10" />
        <div className="absolute bottom-[-30px] left-[-20px] w-32 h-32 rounded-full border border-white/10" />
        <div className="absolute top-4 left-8 w-2 h-2 rounded-full bg-amber-300/30" />
        <div className="absolute top-16 right-16 w-3 h-3 rounded-full bg-amber-200/20" />

        <div className="relative max-w-2xl mx-auto px-4">
          {/* Top bar */}
          <div className="flex items-center justify-between py-3">
            <Link href="/culture">
              <button className="p-1.5 hover:bg-white/20 rounded-lg transition flex items-center gap-1.5" data-testid="btn-back-culture">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">国粹</span>
              </button>
            </Link>
            <div className="flex items-center gap-1.5">
              <Scroll className="w-4 h-4 opacity-80" />
              <span className="text-sm font-bold">万年黄历</span>
            </div>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>

          {/* Location */}
          <div className="mt-1">
            <LocationDisplay />
          </div>

          {/* Live Clock */}
          <div className="py-3">
            <LiveClock />
            <div className="text-center mt-1.5 space-y-0.5">
              <div className="text-sm opacity-80">
                {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 星期{WEEKDAYS[selectedDate.getDay()]}
              </div>
              {almanac && (
                <div className="text-xs opacity-60">
                  农历{almanac.lunar.monthName}{almanac.lunar.dayName} {almanac.bazi.year.pillar}年
                </div>
              )}
            </div>
          </div>

          {/* Horizontal Date Strip */}
          <div className="pb-3">
            <DateStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
          </div>
        </div>
      </div>

      {/* ─── Content ─────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Lunar + Bazi Info */}
        {almanacLoading ? (
          <Card className="p-4"><Skeleton className="h-24" /></Card>
        ) : almanac ? (
          <Card className="overflow-hidden border-amber-200/60 dark:border-amber-900/40">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {almanac.lunar.monthName}{almanac.lunar.dayName}
                  </span>
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400">
                    {almanac.lunar.zodiac}年
                  </Badge>
                  {almanac.season && (
                    <span className="text-xs text-gray-500">{seasonEmoji[almanac.season] || ''}{almanac.season}</span>
                  )}
                  {almanac.solarTerm && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-100 text-xs">
                      {almanac.solarTerm}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {almanac.bazi.full}
                </div>
              </div>

              {/* Duty12 + By12 + Chong Sha */}
              <div className="flex flex-wrap gap-2 text-xs">
                {almanac.duty12 && (
                  <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 hover:bg-indigo-100">
                    <Star className="w-3 h-3 mr-1" /> 值神·{almanac.duty12}
                  </Badge>
                )}
                {almanac.by12God && (
                  <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 hover:bg-yellow-100">
                    <Sun className="w-3 h-3 mr-1" /> {almanac.by12God}
                  </Badge>
                )}
                {almanac.life12God && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100">
                    {almanac.life12God}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {almanac.chong && (
                  <Badge variant="outline" className="border-red-200 text-red-600 dark:text-red-400">
                    <Swords className="w-3 h-3 mr-1" /> {almanac.chong}
                  </Badge>
                )}
                {almanac.sha && (
                  <Badge variant="outline" className="border-orange-200 text-orange-600 dark:text-orange-400">
                    <Shield className="w-3 h-3 mr-1" /> {almanac.sha}
                  </Badge>
                )}
                {almanac.fetalGodDesc && (
                  <Badge variant="outline" className="border-pink-200 text-pink-600 dark:text-pink-400">
                    <Baby className="w-3 h-3 mr-1" /> 胎神·{almanac.fetalGodDesc}
                  </Badge>
                )}
                {almanac.pengzuTaboo && (
                  <Badge variant="outline" className="border-orange-200 text-orange-600 dark:text-orange-400">
                    <BookOpen className="w-3 h-3 mr-1" /> 彭祖百忌·{almanac.pengzuTaboo}
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        ) : null}

        {/* 宜忌 */}
        {almanacLoading ? (
          <Card className="p-4"><Skeleton className="h-32" /></Card>
        ) : almanac ? (
          <div className="grid grid-cols-2 gap-3">
            {/* 宜 */}
            <Card className="overflow-hidden border-emerald-200/60 dark:border-emerald-900/40">
              <div className="bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-2 text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="font-bold">宜</span>
              </div>
              <div className="p-3">
                {almanac.acts.good.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {almanac.acts.good.map((act, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded">
                        {act}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">暂无数据</p>
                )}
              </div>
            </Card>

            {/* 忌 */}
            <Card className="overflow-hidden border-red-200/60 dark:border-red-900/40">
              <div className="bg-gradient-to-r from-red-600 to-rose-500 px-4 py-2 text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold">忌</span>
              </div>
              <div className="p-3">
                {almanac.acts.bad.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {almanac.acts.bad.map((act, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded">
                        {act}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">暂无数据</p>
                )}
              </div>
            </Card>
          </div>
        ) : null}

        {/* 吉神/凶神 */}
        {almanac && (almanac.goodGods.length > 0 || almanac.badGods.length > 0) && (
          <Card className="p-4 space-y-3 border-amber-200/60 dark:border-amber-900/40">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600" /> 今日神煞
            </h3>
            {almanac.goodGods.length > 0 && (
              <div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1.5">吉神宜趋</p>
                <div className="flex flex-wrap gap-1.5">
                  {almanac.goodGods.map((g, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {almanac.badGods.length > 0 && (
              <div>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1.5">凶神宜忌</p>
                <div className="flex flex-wrap gap-1.5">
                  {almanac.badGods.map((g, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full border border-red-200/60 dark:border-red-800/40">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 吉神方位 */}
        {almanac && Object.keys(almanac.luckDirections).length > 0 && (
          <Card className="p-4 space-y-3 border-amber-200/60 dark:border-amber-900/40">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-600" /> 吉神方位
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(almanac.luckDirections).map(([god, dir]) => (
                <div key={god} className="text-center p-2 bg-amber-50/60 dark:bg-amber-900/20 rounded-lg">
                  <MapPin className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{god}</p>
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{dir || '—'}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 时辰吉凶 */}
        {almanac && almanac.hourDetails.length > 0 && (
          <Card className="p-4 space-y-3 border-amber-200/60 dark:border-amber-900/40">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" /> 时辰吉凶
              <span className="text-[10px] font-normal text-gray-400 ml-auto">点击查看详情</span>
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {almanac.hourDetails.map((h, i) => (
                <div
                  key={i}
                  className={`text-center p-2 rounded-lg border transition cursor-pointer hover:shadow-sm ${
                    h.luck > 0
                      ? 'bg-emerald-50/80 border-emerald-200/60 dark:bg-emerald-900/20 dark:border-emerald-800/40'
                      : 'bg-red-50/80 border-red-200/60 dark:bg-red-900/20 dark:border-red-800/40'
                  } ${expandedHour === i ? 'ring-2 ring-amber-400' : ''}`}
                  onClick={() => setExpandedHour(expandedHour === i ? null : i)}
                >
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {h.name.split('(')[0]}
                  </div>
                  <div className="text-[10px] text-gray-400">{h.name.match(/\((.*)\)/)?.[1]}</div>
                  <div className={`text-sm font-bold mt-0.5 ${h.luck > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {h.luck > 0 ? '吉' : '凶'}
                  </div>
                </div>
              ))}
            </div>
            {/* Expanded hour detail */}
            {expandedHour !== null && almanac.hourDetails[expandedHour] && (
              <div className="mt-2 p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-200/40 dark:border-amber-800/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {almanac.hourDetails[expandedHour].name}
                  </span>
                  <Badge className={almanac.hourDetails[expandedHour].luck > 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-100'
                  }>
                    {almanac.hourDetails[expandedHour].luck > 0 ? '吉时' : '凶时'}
                  </Badge>
                </div>
                {almanac.hourDetails[expandedHour].gods.length > 0 ? (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">当值神煞</p>
                    <div className="flex flex-wrap gap-1">
                      {almanac.hourDetails[expandedHour].gods.map((g, gi) => (
                        <span key={gi} className="text-xs px-2 py-0.5 bg-white dark:bg-gray-800 rounded-full border border-gray-200/60 dark:border-gray-700/60 text-gray-600 dark:text-gray-300">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">暂无详细神煞数据</p>
                )}
              </div>
            )}
          </Card>
        )}

        {/* 纳音五行 */}
        {almanac && (
          <Card className="p-4 space-y-3 border-amber-200/60 dark:border-amber-900/40">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" /> 四柱纳音
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '年柱', pillar: almanac.bazi.year.pillar, nayin: almanac.nayin.year },
                { label: '月柱', pillar: almanac.bazi.month.pillar, nayin: almanac.nayin.month },
                { label: '日柱', pillar: almanac.bazi.day.pillar, nayin: almanac.nayin.day },
                { label: '时柱', pillar: almanac.bazi.hour.pillar, nayin: almanac.nayin.hour },
              ].map((p) => (
                <div key={p.label} className="text-center p-2 bg-gradient-to-b from-amber-50/80 to-orange-50/60 dark:from-amber-900/20 dark:to-orange-900/10 rounded-lg border border-amber-200/40 dark:border-amber-800/30">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{p.label}</p>
                  <p className="text-base font-bold text-amber-700 dark:text-amber-300 tracking-widest">{p.pillar}</p>
                  <p className="text-xs text-orange-600/80 dark:text-orange-400/60 mt-0.5">{p.nayin || '—'}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 多历法展示 */}
        {calLoading ? (
          <Card className="p-4"><Skeleton className="h-40" /></Card>
        ) : multiCal ? (
          <Card className="overflow-hidden border-purple-200/60 dark:border-purple-900/40">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-white flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="font-bold text-sm">多历法展示</span>
            </div>
            <div className="p-4 space-y-2.5">
              {[
                { icon: '☸️', label: '佛历', value: multiCal.buddhist, desc: multiCal.description.buddhist, color: 'text-amber-600 dark:text-amber-400' },
                { icon: '☯️', label: '道历', value: multiCal.taoist, desc: multiCal.description.taoist, color: 'text-blue-600 dark:text-blue-400' },
                { icon: '☪️', label: '回历', value: multiCal.hijri, desc: multiCal.description.hijri, color: 'text-green-600 dark:text-green-400' },
                { icon: '🌙', label: '农历', value: multiCal.lunar, desc: `干支纪年：${multiCal.ganzhiYear}`, color: 'text-purple-600 dark:text-purple-400' },
              ].map((cal) => (
                <div key={cal.label} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50/80 dark:bg-gray-800/50 hover:bg-gray-100/80 dark:hover:bg-gray-800/70 transition">
                  <span className="text-xl mt-0.5">{cal.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{cal.label}</span>
                      <span className={`text-sm font-bold ${cal.color}`}>{cal.value}</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">{cal.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {/* 声明 */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 pb-8 pt-2">
          黄历数据基于《协纪辨方书》算法推演 · 仅供参考
        </p>
      </div>
    </div>
  );
}
