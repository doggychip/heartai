import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  Sparkles,
  RotateCcw,
  Star,
  Compass,
  Flame,
  Droplets,
  TreePine,
  Mountain,
  CircleDot,
  User,
  Info,
  BarChart3,
  LayoutGrid,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

interface HiddenStemShiShen {
  stem: string;
  element: string;
  shiShen: string;
}

interface Pillar {
  name: string;
  pillar: string;
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
  nayin: string;
  hiddenStems: string[];
  shiShen: string;
  hiddenStemShiShen: HiddenStemShiShen[];
  life12: string;
}

interface Personality {
  [key: string]: string;
}

interface BaziResult {
  birthDate: string;
  birthHour: number;
  fullBazi: string;
  pillars: Pillar[];
  dayMaster: string;
  dayMasterElement: string;
  zodiac: string;
  constellation: string;
  elementCount: Record<string, number>;
  personality: Personality;
  kongWang: string;
  pillarKongWang: Record<string, boolean>;
  shenSha: Record<string, string[]>;
}

// ─── Constants ───────────────────────────────────────────────────────

const HOURS = [
  { value: "0", label: "子时(23-01)" },
  { value: "2", label: "丑时(01-03)" },
  { value: "4", label: "寅时(03-05)" },
  { value: "6", label: "卯时(05-07)" },
  { value: "8", label: "辰时(07-09)" },
  { value: "10", label: "巳时(09-11)" },
  { value: "12", label: "午时(11-13)" },
  { value: "14", label: "未时(13-15)" },
  { value: "16", label: "申时(15-17)" },
  { value: "18", label: "酉时(17-19)" },
  { value: "20", label: "戌时(19-21)" },
  { value: "22", label: "亥时(21-23)" },
];

const PILLAR_KEYS = ["year", "month", "day", "hour"] as const;

const ELEMENT_COLORS: Record<string, { text: string; bg: string }> = {
  金: { text: "text-amber-400", bg: "bg-amber-400/15" },
  木: { text: "text-green-400", bg: "bg-green-400/15" },
  水: { text: "text-blue-400", bg: "bg-blue-400/15" },
  火: { text: "text-red-400", bg: "bg-red-400/15" },
  土: { text: "text-yellow-700 dark:text-yellow-600", bg: "bg-yellow-600/15" },
};

const ELEMENT_ICONS: Record<string, typeof Mountain> = {
  金: Mountain,
  木: TreePine,
  水: Droplets,
  火: Flame,
  土: CircleDot,
};

const ELEMENT_BAR_COLORS: Record<string, string> = {
  金: "bg-amber-400",
  木: "bg-green-400",
  水: "bg-blue-400",
  火: "bg-red-400",
  土: "bg-yellow-600",
};

function getElementColor(element: string): string {
  return ELEMENT_COLORS[element]?.text ?? "text-foreground";
}

// ─── Component ───────────────────────────────────────────────────────

export default function BaziPage() {
  const { toast } = useToast();
  const { user, updateProfile } = useAuth();
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState<string | undefined>(undefined);
  const [gender, setGender] = useState("");
  const [result, setResult] = useState<BaziResult | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Auto-populate from user profile
  useEffect(() => {
    if (user?.birthDate) {
      const parts = user.birthDate.split('-');
      if (parts.length === 3) {
        setYear(parts[0]);
        setMonth(String(parseInt(parts[1])));
        setDay(String(parseInt(parts[2])));
      }
    }
    if (user?.birthHour !== undefined && user?.birthHour !== null) {
      setHour(String(user.birthHour));
    }
  }, [user?.birthDate, user?.birthHour]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/culture/bazi", {
        year: parseInt(year),
        month: parseInt(month),
        day: parseInt(day),
        hour: hour !== undefined ? parseInt(hour) : undefined,
      });
      return res.json();
    },
    onSuccess: (data: BaziResult) => {
      setResult(data);
      // Auto-save birth info to profile
      if (user && year && month && day) {
        const birthDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const profileData: any = { birthDate: birthDateStr };
        if (hour !== undefined) profileData.birthHour = parseInt(hour);
        updateProfile(profileData).catch(() => {});
      }
    },
    onError: (err: Error) =>
      toast({
        title: "排盘失败",
        description: err.message,
        variant: "destructive",
      }),
  });

  const years = Array.from({ length: 111 }, (_, i) => String(1920 + i));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

  // ─── Results View ──────────────────────────────────────────────────

  if (result) {
    const maxElementCount = Math.max(...Object.values(result.elementCount), 1);

    return (
      <div className="flex-1 overflow-y-auto" data-testid="bazi-result-page">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                八字排盘
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {result.fullBazi}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResult(null)}
              data-testid="button-bazi-restart"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              重新排盘
            </Button>
          </div>

          {/* Basic Info Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="py-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    日主
                  </p>
                  <p
                    className={`text-xl font-bold ${getElementColor(result.dayMasterElement)}`}
                  >
                    {result.dayMaster}
                  </p>
                  <Badge variant="secondary" className="text-[10px]">
                    {result.dayMasterElement}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    生肖
                  </p>
                  <p className="text-xl font-bold">{result.zodiac}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    星座
                  </p>
                  <p className="text-xl font-bold">{result.constellation}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    空亡
                  </p>
                  <p className="text-xl font-bold">{result.kongWang}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="overview" className="text-sm">
                <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                命盘总览
              </TabsTrigger>
              <TabsTrigger value="wuxing" className="text-sm">
                <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                五行分析
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: 命盘总览 */}
            <TabsContent value="overview" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-20 text-center font-semibold text-xs h-9 px-2">
                            &nbsp;
                          </TableHead>
                          {result.pillars.map((p) => (
                            <TableHead
                              key={p.name}
                              className="text-center font-semibold text-xs h-9 px-2"
                            >
                              {p.name}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* 十神 */}
                        <TableRow className="border-b border-border/50">
                          <TableCell className="text-center text-xs font-medium text-muted-foreground py-2 px-2">
                            十神
                          </TableCell>
                          {result.pillars.map((p, i) => (
                            <TableCell
                              key={i}
                              className="text-center text-xs py-2 px-2"
                            >
                              {i === 2 ? (
                                <span className="font-bold text-primary">
                                  日主
                                </span>
                              ) : (
                                p.shiShen
                              )}
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* 天干 */}
                        <TableRow className="border-b border-border/50 bg-muted/10">
                          <TableCell className="text-center text-xs font-medium text-muted-foreground py-2.5 px-2">
                            天干
                          </TableCell>
                          {result.pillars.map((p, i) => (
                            <TableCell
                              key={i}
                              className="text-center py-2.5 px-2"
                            >
                              <span
                                className={`text-lg font-bold ${getElementColor(p.stemElement)} ${i === 2 ? "underline underline-offset-4 decoration-2 decoration-primary" : ""}`}
                              >
                                {p.stem}
                              </span>
                              <span
                                className={`block text-[10px] mt-0.5 ${getElementColor(p.stemElement)} opacity-70`}
                              >
                                {p.stemElement}
                              </span>
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* 地支 */}
                        <TableRow className="border-b border-border/50 bg-muted/10">
                          <TableCell className="text-center text-xs font-medium text-muted-foreground py-2.5 px-2">
                            地支
                          </TableCell>
                          {result.pillars.map((p, i) => (
                            <TableCell
                              key={i}
                              className="text-center py-2.5 px-2"
                            >
                              <span
                                className={`text-lg font-bold ${getElementColor(p.branchElement)}`}
                              >
                                {p.branch}
                              </span>
                              <span
                                className={`block text-[10px] mt-0.5 ${getElementColor(p.branchElement)} opacity-70`}
                              >
                                {p.branchElement}
                              </span>
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* 藏干 */}
                        <TableRow className="border-b border-border/50">
                          <TableCell className="text-center text-xs font-medium text-muted-foreground py-2 px-2">
                            藏干
                          </TableCell>
                          {result.pillars.map((p, i) => (
                            <TableCell
                              key={i}
                              className="text-center text-xs py-2 px-2"
                            >
                              <div className="flex flex-col items-center gap-0.5">
                                {p.hiddenStemShiShen.map((hs, j) => (
                                  <span key={j}>
                                    <span
                                      className={`font-medium ${getElementColor(hs.element)}`}
                                    >
                                      {hs.stem}
                                    </span>
                                    <span className="text-muted-foreground text-[10px] ml-0.5">
                                      {hs.shiShen}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* 十二长生 */}
                        <TableRow className="border-b border-border/50">
                          <TableCell className="text-center text-xs font-medium text-muted-foreground py-2 px-2">
                            十二长生
                          </TableCell>
                          {result.pillars.map((p, i) => (
                            <TableCell
                              key={i}
                              className="text-center text-xs py-2 px-2"
                            >
                              {p.life12}
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* 纳音 */}
                        <TableRow className="border-b border-border/50">
                          <TableCell className="text-center text-xs font-medium text-muted-foreground py-2 px-2">
                            纳音
                          </TableCell>
                          {result.pillars.map((p, i) => (
                            <TableCell
                              key={i}
                              className="text-center text-xs py-2 px-2"
                            >
                              {p.nayin}
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* 空亡 */}
                        <TableRow className="border-b border-border/50">
                          <TableCell className="text-center text-xs font-medium text-muted-foreground py-2 px-2">
                            空亡
                          </TableCell>
                          {PILLAR_KEYS.map((key, i) => (
                            <TableCell
                              key={i}
                              className="text-center text-xs py-2 px-2"
                            >
                              {result.pillarKongWang[key] ? (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  空
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground/40">
                                  —
                                </span>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* 神煞 */}
                        <TableRow>
                          <TableCell className="text-center text-xs font-medium text-muted-foreground py-2 px-2">
                            神煞
                          </TableCell>
                          {PILLAR_KEYS.map((key, i) => (
                            <TableCell
                              key={i}
                              className="text-center text-xs py-2 px-2"
                            >
                              {result.shenSha[key]?.length > 0 ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  {result.shenSha[key].map((s, j) => (
                                    <Badge
                                      key={j}
                                      variant="secondary"
                                      className="text-[10px] px-1.5 py-0 whitespace-nowrap"
                                    >
                                      {s}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40">
                                  —
                                </span>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: 五行分析 */}
            <TabsContent value="wuxing" className="mt-4 space-y-4">
              {/* Five Elements Bar Chart */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Flame className="w-4 h-4 text-red-400" />
                    五行力量分布
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(["金", "木", "水", "火", "土"] as const).map((elem) => {
                    const count = result.elementCount[elem] ?? 0;
                    const Icon = ELEMENT_ICONS[elem];
                    const pct =
                      maxElementCount > 0
                        ? (count / maxElementCount) * 100
                        : 0;
                    return (
                      <div key={elem} className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 w-12 shrink-0">
                          <Icon
                            className={`w-3.5 h-3.5 ${ELEMENT_COLORS[elem].text}`}
                          />
                          <span
                            className={`text-sm font-medium ${ELEMENT_COLORS[elem].text}`}
                          >
                            {elem}
                          </span>
                        </div>
                        <div className="flex-1 h-6 bg-muted/50 rounded-md overflow-hidden relative">
                          <div
                            className={`h-full ${ELEMENT_BAR_COLORS[elem]} rounded-md transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-foreground/80">
                            {count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Day Master Description */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    日主解读
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-lg ${ELEMENT_COLORS[result.dayMasterElement]?.bg ?? "bg-muted"} flex items-center justify-center shrink-0`}
                    >
                      <span
                        className={`text-2xl font-bold ${getElementColor(result.dayMasterElement)}`}
                      >
                        {result.dayMaster}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        日主{result.dayMaster} · 五行属
                        <span
                          className={`${getElementColor(result.dayMasterElement)} font-bold`}
                        >
                          {result.dayMasterElement}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {result.dayMasterElement === "金" &&
                          "金主义，其性刚，其情烈。金盛之人骨肉相称，面方白净，眉高眼深。为人刚毅果断，疏财仗义。"}
                        {result.dayMasterElement === "木" &&
                          "木主仁，其性直，其情和。木盛之人丰姿秀丽，骨骼修长。为人有博爱恻隐之心，质朴清高。"}
                        {result.dayMasterElement === "水" &&
                          "水主智，其性聪，其情善。水旺之人面黑有采，语言清和。为人深思熟虑，足智多谋。"}
                        {result.dayMasterElement === "火" &&
                          "火主礼，其性急，其情恭。火盛之人头小脚长，浓眉小耳。为人谦和恭敬，纯朴急躁。"}
                        {result.dayMasterElement === "土" &&
                          "土主信，其性重，其情厚。土盛之人圆腰廓鼻，眉清目秀。为人忠孝至诚，度量宽厚。"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personality */}
              {result.personality &&
                Object.keys(result.personality).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        性格分析
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      {Object.entries(result.personality).map(
                        ([key, value]) => (
                          <div key={key}>
                            <p className="text-xs font-medium text-muted-foreground mb-0.5">
                              {key}
                            </p>
                            <p className="text-sm leading-relaxed text-foreground/80">
                              {value}
                            </p>
                          </div>
                        ),
                      )}
                    </CardContent>
                  </Card>
                )}
            </TabsContent>
          </Tabs>

          <p className="text-[10px] text-center text-muted-foreground pb-4">
            * 以上内容基于中国传统命理学，仅供文化探索参考
          </p>
        </div>
      </div>
    );
  }

  // ─── Input Form ────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto" data-testid="bazi-page">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/10">
            <Sparkles className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold">八字排盘</h1>
          <p className="text-sm text-muted-foreground">
            输入出生信息，排出你的四柱八字命盘
          </p>
        </div>

        {/* Form Card */}
        <Card className="border-primary/10">
          <CardContent className="pt-6 space-y-4">
            {/* Date Row */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                出生日期
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger data-testid="select-year">
                    <SelectValue placeholder="年份" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}年
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger data-testid="select-month">
                    <SelectValue placeholder="月" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}月
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger data-testid="select-day">
                    <SelectValue placeholder="日" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}日
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Hour + Gender Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  出生时辰
                </label>
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger data-testid="select-hour">
                    <SelectValue placeholder="选择时辰" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h.value} value={h.value}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  性别（选填）
                </label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger data-testid="select-gender">
                    <SelectValue placeholder="选择性别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">男</SelectItem>
                    <SelectItem value="female">女</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit */}
            <Button
              className="w-full mt-2"
              size="lg"
              disabled={!year || !month || !day || mutation.isPending}
              onClick={() => mutation.mutate()}
              data-testid="button-bazi-submit"
            >
              {mutation.isPending ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  正在排盘...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  排盘
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Hint */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p>
            八字排盘基于中国传统天干地支纪年法，通过出生年、月、日、时推算四柱八字，是中华传统文化的重要组成部分。
          </p>
        </div>
      </div>
    </div>
  );
}
