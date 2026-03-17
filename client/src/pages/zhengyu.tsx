import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Sparkles, Star, Crown, Swords, HandCoins, ShieldAlert, CircleDot } from "lucide-react";
import { Link } from "wouter";

interface StarInfo {
  name: string;
  role: string;
  palace: string;
  interpretation: string;
}

interface ZhengyuResult {
  pattern: string;
  patternDescription: string;
  stars: StarInfo[];
  overallAnalysis: string;
  lifeDirection: string;
  advice: string;
}

const STAR_CONFIGS: Record<string, { icon: any; color: string; bgGrad: string }> = {
  "命主": { icon: Crown, color: "text-amber-400", bgGrad: "from-amber-500/15 to-yellow-500/15" },
  "用星": { icon: Star, color: "text-cyan-400", bgGrad: "from-cyan-500/15 to-blue-500/15" },
  "恩星": { icon: Sparkles, color: "text-emerald-400", bgGrad: "from-emerald-500/15 to-teal-500/15" },
  "难星": { icon: ShieldAlert, color: "text-rose-400", bgGrad: "from-rose-500/15 to-red-500/15" },
  "财星": { icon: HandCoins, color: "text-purple-400", bgGrad: "from-purple-500/15 to-violet-500/15" },
};

const STAR_ORDER = ["命主", "用星", "财星", "难星", "恩星"];

const SHICHEN = [
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

export default function ZhengyuPage() {
  const { user } = useAuth();
  const [birthDate, setBirthDate] = useState(user?.birthDate || "");
  const [birthHour, setBirthHour] = useState<string>("");
  const [result, setResult] = useState<ZhengyuResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/metaphysics/zhengyu", {
        birthDate,
        birthHour: birthHour ? parseInt(birthHour) : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => setResult(data.result),
  });

  if (result) {
    // Order stars for the cycle diagram
    const orderedStars = STAR_ORDER
      .map((role) => result.stars.find((s) => s.role === role))
      .filter(Boolean) as StarInfo[];

    return (
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4 overflow-x-hidden">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/discover">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-lg font-bold">政余分析</h1>
        </div>

        {/* Pattern header */}
        <Card className="bg-gradient-to-br from-amber-500/15 to-orange-500/15 border-0 p-6 text-center space-y-3">
          <div className="text-4xl">⭐</div>
          <h2 className="text-xl font-bold">{result.pattern}</h2>
          <p className="text-sm text-muted-foreground">{result.patternDescription}</p>
        </Card>

        {/* Star cycle diagram */}
        <Card className="bg-card/50 border-transparent p-6 space-y-4">
          <h3 className="font-semibold text-center flex items-center justify-center gap-2">
            <CircleDot className="w-4 h-4 text-amber-400" /> 五星循环
          </h3>
          <div className="relative w-64 h-64 mx-auto">
            {/* Circle background */}
            <div className="absolute inset-4 rounded-full border-2 border-dashed border-border/40" />

            {/* 5 stars positioned in a circle */}
            {orderedStars.map((star, i) => {
              const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
              const radius = 100;
              const cx = 128 + radius * Math.cos(angle);
              const cy = 128 + radius * Math.sin(angle);
              const config = STAR_CONFIGS[star.role] || STAR_CONFIGS["命主"];
              const Icon = config.icon;

              return (
                <div
                  key={star.role}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `${cx}px`,
                    top: `${cy}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${config.bgGrad} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <span className="text-xs font-semibold mt-1">{star.role}</span>
                  <span className="text-[10px] text-muted-foreground">{star.name}</span>
                </div>
              );
            })}

            {/* Arrows between stars (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 256 256">
              {orderedStars.map((_, i) => {
                const a1 = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                const a2 = (((i + 1) % 5) * 2 * Math.PI) / 5 - Math.PI / 2;
                const r = 100;
                const rInner = 72;
                const x1 = 128 + rInner * Math.cos(a1);
                const y1 = 128 + rInner * Math.sin(a1);
                const x2 = 128 + rInner * Math.cos(a2);
                const y2 = 128 + rInner * Math.sin(a2);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeOpacity={0.2}
                    strokeWidth={1.5}
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="currentColor" fillOpacity={0.3} />
                </marker>
              </defs>
            </svg>
          </div>
        </Card>

        {/* Star palace assignments */}
        <div className="space-y-3">
          {result.stars.map((star, i) => {
            const config = STAR_CONFIGS[star.role] || STAR_CONFIGS["命主"];
            const Icon = config.icon;
            return (
              <Card key={i} className={`bg-gradient-to-br ${config.bgGrad} border-0 p-4 space-y-2`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-sm font-semibold">{star.role}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">{star.palace}</Badge>
                </div>
                <p className="text-xs font-medium text-foreground/80">{star.name}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{star.interpretation}</p>
              </Card>
            );
          })}
        </div>

        {/* Overall analysis */}
        <Card className="bg-card/50 border-transparent p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> 综合分析
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{result.overallAnalysis}</p>
        </Card>

        {/* Life direction */}
        <Card className="bg-card/50 border-transparent p-4 space-y-3">
          <h3 className="font-semibold">人生方向</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.lifeDirection}</p>
          <div className="bg-accent/30 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">💡 人生建议</p>
            <p className="text-sm">{result.advice}</p>
          </div>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          当前内容为免费内容，仅供娱乐参考
        </p>

        <Button variant="outline" className="w-full" onClick={() => setResult(null)}>重新分析</Button>
      </div>
    );
  }

  // Landing page
  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-6 overflow-x-hidden">
      <div className="flex items-center gap-3">
        <Link href="/discover">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-lg font-bold">政余分析</h1>
      </div>

      <div className="text-center space-y-4 py-8">
        <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
          <span className="text-4xl">⭐</span>
        </div>
        <h2 className="text-xl font-bold">政余星命分析</h2>
        <p className="text-sm text-muted-foreground px-4">
          政余分析融合希腊占星术（Hellenistic Astrology）的精华，通过五颗关键星体——命主、用星、恩星、难星、财星——的宫位分布，解读人生格局与命运走向。
        </p>

        {/* Star preview */}
        <div className="flex justify-center gap-3 pt-2">
          {STAR_ORDER.map((role) => {
            const config = STAR_CONFIGS[role];
            const Icon = config.icon;
            return (
              <div key={role} className={`bg-gradient-to-br ${config.bgGrad} rounded-xl p-3 text-center`}>
                <Icon className={`w-5 h-5 ${config.color} mx-auto`} />
                <p className="text-[10px] text-muted-foreground mt-1">{role}</p>
              </div>
            );
          })}
        </div>
      </div>

      <Card className="bg-card/50 border-transparent p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">出生日期</label>
          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">出生时辰</label>
          <Select value={birthHour} onValueChange={setBirthHour}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="选择时辰（可选）" />
            </SelectTrigger>
            <SelectContent>
              {SHICHEN.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full"
          disabled={!birthDate || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />正在解析星命...</>
          ) : (
            "开始分析"
          )}
        </Button>
        {mutation.isError && (
          <p className="text-sm text-red-400 text-center">{(mutation.error as Error).message}</p>
        )}
      </Card>
    </div>
  );
}
