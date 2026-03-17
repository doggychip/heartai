import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { InviteCompatButton } from "@/pages/invite-compat";
import {
  Sparkles,
  RotateCcw,
  Heart,
  Users,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

interface RadarDim {
  score: number;
  label: string;
  desc: string;
}

interface CompatResult {
  person1: { name: string; element: string; bazi: string };
  person2: { name: string; element: string; bazi: string };
  totalScore: number;
  radar: {
    bond: RadarDim;
    passion: RadarDim;
    fun: RadarDim;
    intimacy: RadarDim;
    sync: RadarDim;
  };
  chemistry: string;
  destinyType: string;
  strengths: string[];
  challenges: string[];
  growthAdvice: string;
}

const ZODIAC_SIGNS = [
  "白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座",
  "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座",
];

// SVG Radar Chart Component
function RadarChart({ radar }: { radar: CompatResult["radar"] }) {
  const dims = [
    { key: "bond", ...radar.bond },
    { key: "passion", ...radar.passion },
    { key: "fun", ...radar.fun },
    { key: "intimacy", ...radar.intimacy },
    { key: "sync", ...radar.sync },
  ];

  const cx = 120, cy = 120, maxR = 90;
  const angleStep = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2; // start from top

  const getPoint = (index: number, ratio: number) => {
    const angle = startAngle + index * angleStep;
    return {
      x: cx + maxR * ratio * Math.cos(angle),
      y: cy + maxR * ratio * Math.sin(angle),
    };
  };

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Data polygon points
  const dataPoints = dims.map((d, i) => getPoint(i, d.score / 100));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  // Grid polygon for each ring
  const gridPaths = rings.map(r => {
    const pts = dims.map((_, i) => getPoint(i, r));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  });

  // Label positions (slightly outside)
  const labelPoints = dims.map((d, i) => {
    const p = getPoint(i, 1.18);
    return { ...p, ...d };
  });

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 240 240" className="w-full max-w-[260px]">
        {/* Grid */}
        {gridPaths.map((path, i) => (
          <path key={i} d={path} fill="none" stroke="currentColor" className="text-border" strokeWidth="0.5" opacity={0.5} />
        ))}
        {/* Axis lines */}
        {dims.map((_, i) => {
          const p = getPoint(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="currentColor" className="text-border" strokeWidth="0.5" opacity={0.3} />;
        })}
        {/* Data area */}
        <path d={dataPath} fill="hsl(var(--primary))" fillOpacity="0.15" stroke="hsl(var(--primary))" strokeWidth="2" />
        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="hsl(var(--primary))" />
        ))}
        {/* Labels */}
        {labelPoints.map((lp, i) => (
          <g key={i}>
            <text x={lp.x} y={lp.y - 6} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
              {lp.label}
            </text>
            <text x={lp.x} y={lp.y + 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
              {lp.score}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function CompatibilityPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [p1Name, setP1Name] = useState("");
  const [p1Date, setP1Date] = useState("");
  const [p1Zodiac, setP1Zodiac] = useState("");
  const [p2Name, setP2Name] = useState("");
  const [p2Date, setP2Date] = useState("");
  const [p2Zodiac, setP2Zodiac] = useState("");
  const [result, setResult] = useState<CompatResult | null>(null);

  // Auto-populate person1 from user profile
  useEffect(() => {
    if (user?.nickname) setP1Name(user.nickname);
    if (user?.birthDate) setP1Date(user.birthDate);
    if (user?.zodiacSign) setP1Zodiac(user.zodiacSign);
  }, [user?.nickname, user?.birthDate, user?.zodiacSign]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/compatibility/radar", {
        person1: { name: p1Name || "甲方", birthDate: p1Date, zodiacSign: p1Zodiac || undefined },
        person2: { name: p2Name || "乙方", birthDate: p2Date, zodiacSign: p2Zodiac || undefined },
      });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
    onError: (err: Error) =>
      toast({ title: "分析失败", description: err.message, variant: "destructive" }),
  });

  const restart = () => setResult(null);

  // ─── Result View ─────
  if (result) {
    const dims = [result.radar.bond, result.radar.passion, result.radar.fun, result.radar.intimacy, result.radar.sync];

    return (
      <div className="flex-1 overflow-y-auto" data-testid="compat-result-page">
        <div className="max-w-2xl mx-auto p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">缘分雷达</h1>
            <Button variant="outline" size="sm" onClick={restart} data-testid="button-compat-restart">
              <RotateCcw className="w-4 h-4 mr-1" /> 重新测算
            </Button>
          </div>

          {/* Score Hero */}
          <Card className="bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-purple-500/10 border-pink-500/20">
            <CardContent className="py-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="text-center">
                  <Badge className="text-xs bg-pink-500/10 text-pink-500 border-0">{result.person1.name}</Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{result.person1.element}命</p>
                </div>
                <Heart className="w-5 h-5 text-pink-500" />
                <div className="text-center">
                  <Badge className="text-xs bg-indigo-500/10 text-indigo-500 border-0">{result.person2.name}</Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{result.person2.element}命</p>
                </div>
              </div>
              <div className="relative inline-flex items-center justify-center w-20 h-20">
                <svg className="w-20 h-20 -rotate-90">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - result.totalScore / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-lg font-bold text-primary">{result.totalScore}</span>
              </div>
              <Badge variant="secondary" className="mt-2 text-xs">{result.destinyType}</Badge>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> 五维缘分雷达
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadarChart radar={result.radar} />
            </CardContent>
          </Card>

          {/* Dimension Details */}
          <div className="space-y-2">
            {dims.map((dim, i) => (
              <Card key={i}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{dim.label}</span>
                    <span className={`text-sm font-bold ${
                      dim.score >= 80 ? "text-green-500" : dim.score >= 60 ? "text-amber-500" : "text-red-400"
                    }`}>{dim.score}分</span>
                  </div>
                  <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden mb-1.5">
                    <div className={`h-full rounded-full transition-all duration-700 ${
                      dim.score >= 80 ? "bg-green-500" : dim.score >= 60 ? "bg-amber-500" : "bg-red-400"
                    }`} style={{ width: `${dim.score}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{dim.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chemistry */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-500" /> 化学反应
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/80">{result.chemistry}</p>
            </CardContent>
          </Card>

          {/* Strengths & Challenges */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-green-500/20">
              <CardContent className="py-3">
                <p className="text-[10px] text-green-600 dark:text-green-400 font-medium mb-2">关系优势</p>
                {result.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5 mb-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{s}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-amber-500/20">
              <CardContent className="py-3">
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mb-2">需要注意</p>
                {result.challenges.map((c, i) => (
                  <div key={i} className="flex items-start gap-1.5 mb-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{c}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Growth Advice */}
          <Card className="bg-accent/30">
            <CardContent className="py-4">
              <p className="text-[10px] font-medium text-primary mb-1">成长建议</p>
              <p className="text-sm text-foreground/80">{result.growthAdvice}</p>
            </CardContent>
          </Card>

          {/* Invite CTA */}
          <Card className="bg-gradient-to-r from-pink-500/5 to-rose-500/5 border-pink-500/20">
            <CardContent className="py-4 space-y-3">
              <p className="text-xs text-center text-muted-foreground">
                让朋友也来测测你们的缘分吧 💕
              </p>
              <InviteCompatButton />
            </CardContent>
          </Card>

          <div className="border-t border-border pt-3">
            <p className="text-[10px] text-center text-muted-foreground">
              ⚠️ 免责声明：缘分分析仅供娱乐和文化探索参考，不构成任何现实建议。真爱需要用心经营。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Input Form ─────
  return (
    <div className="flex-1 overflow-y-auto" data-testid="compat-page">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            缘分雷达
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            输入双方信息，AI五维分析你们的缘分契合度
          </p>
        </div>

        <Card className="rounded-xl bg-card/30 border-0">
          <CardContent className="pt-5 space-y-3">
            {/* Person 1 */}
            <div className="p-3 rounded-lg bg-pink-500/5 space-y-2">
              <p className="text-xs font-medium text-pink-500">甲方</p>
              <Input placeholder="姓名（选填）" value={p1Name} onChange={(e) => setP1Name(e.target.value)}
                className="h-10 text-sm" data-testid="input-p1-name" />
              <Input type="date" value={p1Date} onChange={(e) => setP1Date(e.target.value)}
                className="h-10 text-sm" data-testid="input-p1-date" />
              <Select value={p1Zodiac} onValueChange={setP1Zodiac}>
                <SelectTrigger className="h-10 text-sm" data-testid="select-p1-zodiac">
                  <SelectValue placeholder="星座（选填）" />
                </SelectTrigger>
                <SelectContent>
                  {ZODIAC_SIGNS.map((z) => (
                    <SelectItem key={z} value={z}>{z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                <Heart className="w-4 h-4 text-pink-500" />
              </div>
            </div>

            {/* Person 2 */}
            <div className="p-3 rounded-lg bg-indigo-500/5 space-y-2">
              <p className="text-xs font-medium text-indigo-500">乙方</p>
              <Input placeholder="姓名（选填）" value={p2Name} onChange={(e) => setP2Name(e.target.value)}
                className="h-10 text-sm" data-testid="input-p2-name" />
              <Input type="date" value={p2Date} onChange={(e) => setP2Date(e.target.value)}
                className="h-10 text-sm" data-testid="input-p2-date" />
              <Select value={p2Zodiac} onValueChange={setP2Zodiac}>
                <SelectTrigger className="h-10 text-sm" data-testid="select-p2-zodiac">
                  <SelectValue placeholder="星座（选填）" />
                </SelectTrigger>
                <SelectContent>
                  {ZODIAC_SIGNS.map((z) => (
                    <SelectItem key={z} value={z}>{z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
              disabled={!p1Date || !p2Date || mutation.isPending}
              onClick={() => mutation.mutate()}
              data-testid="button-compat-submit"
            >
              {mutation.isPending ? (
                <><Sparkles className="w-4 h-4 mr-2 animate-spin" /> 正在分析缘分...</>
              ) : (
                <><Users className="w-4 h-4 mr-2" /> 开始缘分分析</>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="border-t border-border pt-3">
          <p className="text-[10px] text-center text-muted-foreground">
            ⚠️ 免责声明：融合八字合婚与心理学分析，仅供娱乐参考。
          </p>
        </div>
      </div>
    </div>
  );
}
