import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  Calendar,
  Heart,
  Briefcase,
  Activity,
  Star,
  Compass,
  Flame,
  Droplets,
  TreePine,
  Mountain,
  Wind,
  RotateCcw,
} from "lucide-react";

interface BaziResult {
  fourPillars: { year: string; month: string; day: string; hour: string };
  lunar: { year: number; month: number; day: number };
  summary: string;
  wuxing: string;
  personality: string;
  career: string;
  relationship: string;
  health: string;
  luckyElements: Record<string, any>;
  yearFortune: string;
}

const HOURS = [
  { value: "0", label: "子时 (23:00-01:00)" },
  { value: "2", label: "丑时 (01:00-03:00)" },
  { value: "4", label: "寅时 (03:00-05:00)" },
  { value: "6", label: "卯时 (05:00-07:00)" },
  { value: "8", label: "辰时 (07:00-09:00)" },
  { value: "10", label: "巳时 (09:00-11:00)" },
  { value: "12", label: "午时 (11:00-13:00)" },
  { value: "14", label: "未时 (13:00-15:00)" },
  { value: "16", label: "申时 (15:00-17:00)" },
  { value: "18", label: "酉时 (17:00-19:00)" },
  { value: "20", label: "戌时 (19:00-21:00)" },
  { value: "22", label: "亥时 (21:00-23:00)" },
];

export default function BaziPage() {
  const { toast } = useToast();
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState<string | undefined>(undefined);
  const [gender, setGender] = useState<string>("");
  const [result, setResult] = useState<BaziResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bazi/analyze", {
        year: parseInt(year), month: parseInt(month), day: parseInt(day),
        hour: hour !== undefined ? parseInt(hour) : undefined,
        gender: gender || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
    onError: (err: Error) => toast({ title: "分析失败", description: err.message, variant: "destructive" }),
  });

  const wuxingIcons: Record<string, any> = {
    "金": { icon: Mountain, color: "text-yellow-500" },
    "木": { icon: TreePine, color: "text-green-500" },
    "水": { icon: Droplets, color: "text-blue-500" },
    "火": { icon: Flame, color: "text-red-500" },
    "土": { icon: Wind, color: "text-amber-700" },
  };

  const restart = () => { setResult(null); };

  // ─── Result View ─────
  if (result) {
    return (
      <div className="flex-1 overflow-y-auto" data-testid="bazi-result-page">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">八字命理分析</h1>
            <Button variant="outline" size="sm" onClick={restart} data-testid="button-bazi-restart">
              <RotateCcw className="w-4 h-4 mr-1" /> 重新分析
            </Button>
          </div>

          {/* Four Pillars Hero */}
          <Card className="bg-gradient-to-br from-red-500/10 to-amber-500/10 border-red-500/20">
            <CardContent className="py-6">
              <p className="text-xs text-center text-muted-foreground mb-3">四柱八字</p>
              <div className="grid grid-cols-4 gap-3 text-center">
                {(["year", "month", "day", "hour"] as const).map((pillar) => (
                  <div key={pillar} className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">
                      {pillar === "year" ? "年柱" : pillar === "month" ? "月柱" : pillar === "day" ? "日柱" : "时柱"}
                    </p>
                    <div className="bg-card/80 rounded-lg py-3 border">
                      <p className="text-lg font-bold text-primary">{result.fourPillars[pillar]}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground mt-3">
                农历 {result.lunar.year}年{result.lunar.month}月{result.lunar.day}日
              </p>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> 命理总述
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/80">{result.summary}</p>
            </CardContent>
          </Card>

          {/* Five Elements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" /> 五行分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/80">{result.wuxing}</p>
            </CardContent>
          </Card>

          {/* Detail Cards */}
          <div className="space-y-3">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Star className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div><p className="text-sm font-medium mb-1">性格特质</p><p className="text-sm text-muted-foreground">{result.personality}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div><p className="text-sm font-medium mb-1">事业运势</p><p className="text-sm text-muted-foreground">{result.career}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Heart className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
                  <div><p className="text-sm font-medium mb-1">感情婚姻</p><p className="text-sm text-muted-foreground">{result.relationship}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Activity className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div><p className="text-sm font-medium mb-1">健康养生</p><p className="text-sm text-muted-foreground">{result.health}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lucky Elements */}
          {result.luckyElements && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-500" /> 幸运元素
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.luckyElements).map(([key, val]) => (
                    <Badge key={key} variant="secondary" className="text-xs py-1">
                      {key}: {Array.isArray(val) ? val.join('、') : String(val)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Year Fortune */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> 今年运势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/80">{result.yearFortune}</p>
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground pb-4">
            * 以上内容仅供娱乐和文化探索参考
          </p>
        </div>
      </div>
    );
  }

  // ─── Input Form ─────
  const years = Array.from({ length: 80 }, (_, i) => String(new Date().getFullYear() - i));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

  return (
    <div className="flex-1 overflow-y-auto" data-testid="bazi-page">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-500" />
            八字命理分析
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            输入出生日期时辰，解读你的命理密码
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">出生年</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger data-testid="select-year"><SelectValue placeholder="年" /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}年</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">月</label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger data-testid="select-month"><SelectValue placeholder="月" /></SelectTrigger>
                  <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}月</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">日</label>
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger data-testid="select-day"><SelectValue placeholder="日" /></SelectTrigger>
                  <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{d}日</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">时辰 (选填)</label>
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger data-testid="select-hour"><SelectValue placeholder="选择时辰" /></SelectTrigger>
                  <SelectContent>{HOURS.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">性别 (选填)</label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger data-testid="select-gender"><SelectValue placeholder="选择性别" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">男</SelectItem>
                    <SelectItem value="female">女</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!year || !month || !day || mutation.isPending}
              onClick={() => mutation.mutate()}
              data-testid="button-bazi-submit"
            >
              {mutation.isPending ? (
                <><Sparkles className="w-4 h-4 mr-2 animate-spin" /> AI 正在推算命理...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> 开始分析</>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          * 基于中国传统命理学，结合AI智能分析，仅供娱乐参考
        </p>
      </div>
    </div>
  );
}
