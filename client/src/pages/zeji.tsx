import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CalendarCheck,
  ChevronRight,
  Compass,
  Sparkles,
  AlertTriangle,
  Star,
  MapPin,
  Shield,
  Home,
  Heart,
  Briefcase,
  Scissors,
  PenLine,
  Plane,
  HandHeart,
  Shovel,
  BedDouble,
  GraduationCap,
  Stethoscope,
  Gem,
  Loader2,
  Swords,
  Search,
} from "lucide-react";
import { Link } from "wouter";

interface ZejiResult {
  date: string;
  weekday: string;
  lunarDate: string;
  zodiac: string;
  goodActs: string[];
  badActs: string[];
  duty12: string;
  chong: string;
  sha: string;
  luckDirections: Record<string, string>;
  score: number;
}

interface ZejiResponse {
  event: string;
  range: { start: string; end: string };
  count: number;
  results: ZejiResult[];
}

const EVENT_OPTIONS = [
  { key: "搬家", icon: Home, label: "搬家", desc: "移徙入宅" },
  { key: "结婚", icon: Heart, label: "结婚", desc: "嫁娶大吉" },
  { key: "开业", icon: Briefcase, label: "开业", desc: "开市开张" },
  { key: "装修", icon: Shovel, label: "装修", desc: "修造动土" },
  { key: "出行", icon: Plane, label: "出行", desc: "旅行出门" },
  { key: "签约", icon: PenLine, label: "签约", desc: "订盟立券" },
  { key: "就职", icon: GraduationCap, label: "就职", desc: "上任赴任" },
  { key: "纳采", icon: Gem, label: "纳采", desc: "提亲问名" },
  { key: "祈福", icon: HandHeart, label: "祈福", desc: "许愿还愿" },
  { key: "安床", icon: BedDouble, label: "安床", desc: "新床安置" },
  { key: "入学", icon: GraduationCap, label: "入学", desc: "拜师求学" },
  { key: "求医", icon: Stethoscope, label: "求医", desc: "治病疗目" },
  { key: "理发", icon: Scissors, label: "理发", desc: "沐浴整容" },
  { key: "动土", icon: Shovel, label: "动土", desc: "破土施工" },
  { key: "安葬", icon: MapPin, label: "安葬", desc: "入土为安" },
];

function formatDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ZejiPage() {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => formatDateStr(new Date()));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatDateStr(d);
  });
  const [searching, setSearching] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const queryEnabled = searching && !!selectedEvent && !!startDate;
  const { data, isLoading, isFetching } = useQuery<ZejiResponse>({
    queryKey: ["/api/culture/zeji", selectedEvent, startDate, endDate],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/culture/zeji?event=${encodeURIComponent(selectedEvent!)}&startDate=${startDate}&endDate=${endDate}`
      ).then((r) => r.json()),
    enabled: queryEnabled,
  });

  const doSearch = () => {
    if (!selectedEvent) return;
    setSearching(false);
    setTimeout(() => setSearching(true), 50);
    setExpandedIdx(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-orange-50/30 to-red-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-600 via-red-600 to-amber-700 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/culture">
            <button className="p-1 hover:bg-white/20 rounded-lg transition" data-testid="btn-back">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <CalendarCheck className="w-5 h-5 opacity-80" />
          <h1 className="text-lg font-bold tracking-wide">择吉日</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Event Selection */}
        <Card className="p-4 space-y-3 border-amber-200/60 dark:border-amber-900/40">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-600" />
            选择事件
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {EVENT_OPTIONS.map((ev) => (
              <button
                key={ev.key}
                onClick={() => {
                  setSelectedEvent(ev.key);
                  setSearching(false);
                }}
                className={`flex flex-col items-center p-2 rounded-lg border transition-all text-center ${
                  selectedEvent === ev.key
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-600 ring-1 ring-amber-400"
                    : "border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
                data-testid={`event-${ev.key}`}
              >
                <ev.icon
                  className={`w-5 h-5 mb-1 ${
                    selectedEvent === ev.key ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <span className="text-xs font-medium">{ev.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Date Range */}
        <Card className="p-4 space-y-3 border-amber-200/60 dark:border-amber-900/40">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-600" />
            选择日期范围
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">起始</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSearching(false);
                }}
                className="w-full h-10 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 ring-amber-400 outline-none appearance-none"
                data-testid="input-start-date"
              />
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 mt-5" />
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">结束</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSearching(false);
                }}
                className="w-full h-10 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 ring-amber-400 outline-none appearance-none"
                data-testid="input-end-date"
              />
            </div>
          </div>
        </Card>

        {/* Search Button */}
        <Button
          onClick={doSearch}
          disabled={!selectedEvent || isLoading || isFetching}
          className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white font-bold py-3 rounded-xl shadow-md"
          data-testid="btn-search"
        >
          {isLoading || isFetching ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Search className="w-4 h-4 mr-2" />
          )}
          {selectedEvent ? `查询「${selectedEvent}」吉日` : "请先选择事件类型"}
        </Button>

        {/* Results */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-20" />
              </Card>
            ))}
          </div>
        )}

        {data && !isLoading && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                在{data.range.start} 至 {data.range.end} 期间，
                共找到 <span className="font-bold text-amber-600 dark:text-amber-400">{data.count}</span> 个
                「{data.event}」吉日
              </p>
            </div>

            {data.count === 0 ? (
              <Card className="p-8 text-center border-amber-200/60 dark:border-amber-900/40">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  该时段内暂无适合「{data.event}」的吉日
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  建议扩大日期范围再试
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {data.results.map((r, idx) => (
                  <Card
                    key={r.date}
                    className={`overflow-hidden border-amber-200/60 dark:border-amber-900/40 cursor-pointer transition-all ${
                      expandedIdx === idx ? "ring-1 ring-amber-400" : ""
                    }`}
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    data-testid={`result-${idx}`}
                  >
                    {/* Compact row */}
                    <div className="flex items-center p-3 gap-3">
                      {/* Date block */}
                      <div className="flex-shrink-0 w-16 text-center">
                        <div className="text-2xl font-black text-amber-700 dark:text-amber-300">
                          {r.date.split("-")[2]}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {r.date.split("-")[1]}月 · 周{r.weekday}
                        </div>
                        <div className="text-[10px] text-amber-600/80 dark:text-amber-400/60">
                          {r.lunarDate}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-12 bg-amber-200/60 dark:bg-amber-800/40" />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {idx === 0 && (
                            <Badge className="bg-gradient-to-r from-amber-500 to-red-500 text-white text-[10px] px-1.5 py-0 hover:from-amber-500">
                              最佳
                            </Badge>
                          )}
                          {r.duty12 && (
                            <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-600 dark:text-indigo-400">
                              {r.duty12}
                            </Badge>
                          )}
                          {r.chong && (
                            <Badge variant="outline" className="text-[10px] border-red-200 text-red-500">
                              <Swords className="w-2.5 h-2.5 mr-0.5" />
                              {r.chong}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {r.goodActs.slice(0, 5).map((a, i) => (
                            <span
                              key={i}
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                EVENT_OPTIONS.find((e) => e.key === data.event)
                                  ?.key &&
                                (a.includes("嫁") || a.includes("移") || a.includes("开") || a.includes("修") || a.includes("出") || a.includes("祈") || a.includes("安") || a.includes("订") || a.includes("任") || a.includes("医") || a.includes("采") || a.includes("学") || a.includes("土") || a.includes("床") || a.includes("发") || a.includes("浴"))
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium"
                                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                              }`}
                            >
                              {a}
                            </span>
                          ))}
                          {r.goodActs.length > 5 && (
                            <span className="text-[10px] text-gray-400">+{r.goodActs.length - 5}</span>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedIdx === idx ? "rotate-90" : ""
                        }`}
                      />
                    </div>

                    {/* Expanded detail */}
                    {expandedIdx === idx && (
                      <div className="border-t border-amber-200/40 dark:border-amber-800/30 p-3 space-y-3 bg-amber-50/30 dark:bg-amber-900/10">
                        {/* 宜 */}
                        <div>
                          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> 宜
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {r.goodActs.map((a, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded">
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                        {/* 忌 */}
                        {r.badActs.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> 忌
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {r.badActs.map((a, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded">
                                  {a}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* 方位 */}
                        {Object.keys(r.luckDirections).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> 吉神方位
                            </p>
                            <div className="flex gap-3">
                              {Object.entries(r.luckDirections).map(([god, dir]) => (
                                <div key={god} className="text-center">
                                  <p className="text-[10px] text-gray-500">{god}</p>
                                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{dir || "—"}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* 冲煞 */}
                        <div className="flex gap-3 text-xs">
                          {r.chong && (
                            <span className="text-red-500 flex items-center gap-1">
                              <Shield className="w-3 h-3" /> {r.chong}
                            </span>
                          )}
                          {r.sha && (
                            <span className="text-orange-500 flex items-center gap-1">
                              <Shield className="w-3 h-3" /> {r.sha}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 pb-8 pt-2">
          基于《协纪辨方书》算法推演 · 仅供参考
        </p>
      </div>
    </div>
  );
}
