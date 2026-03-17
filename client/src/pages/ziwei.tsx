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
import { ArrowLeft, Loader2, Star, Sparkles, User, Briefcase, DollarSign, Heart, Smile } from "lucide-react";
import { Link } from "wouter";

interface Palace {
  name: string;
  mainStar: string;
  description: string;
}

interface ZiweiResult {
  pattern: string;
  patternDesc: string;
  palaces: Palace[];
  summary: string;
  advice: string;
}

const PALACE_ICONS: Record<string, any> = {
  "命宫": User,
  "迁移宫": Star,
  "事业宫": Briefcase,
  "财帛宫": DollarSign,
  "夫妻宫": Heart,
  "福德宫": Smile,
};

const PALACE_COLORS: Record<string, string> = {
  "命宫": "from-purple-500/20 to-indigo-500/20",
  "迁移宫": "from-blue-500/20 to-cyan-500/20",
  "事业宫": "from-amber-500/20 to-orange-500/20",
  "财帛宫": "from-yellow-500/20 to-amber-500/20",
  "夫妻宫": "from-rose-500/20 to-pink-500/20",
  "福德宫": "from-emerald-500/20 to-teal-500/20",
};

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

export default function ZiweiPage() {
  const { user } = useAuth();
  const [birthDate, setBirthDate] = useState(user?.birthDate || "");
  const [birthHour, setBirthHour] = useState<string>("");
  const [gender, setGender] = useState<string>("male");
  const [result, setResult] = useState<ZiweiResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/metaphysics/ziwei", {
        birthDate,
        birthHour: birthHour ? parseInt(birthHour) : undefined,
        gender,
      });
      return res.json();
    },
    onSuccess: (data) => setResult(data.result),
  });

  if (result) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4 overflow-x-hidden">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/discover">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-lg font-bold">紫微斗数</h1>
        </div>

        {/* Pattern */}
        <Card className="bg-gradient-to-br from-violet-500/15 to-purple-500/15 border-0 p-6 text-center space-y-3">
          <div className="text-4xl">🌟</div>
          <h2 className="text-xl font-bold">{result.pattern}</h2>
          <p className="text-sm text-muted-foreground">{result.patternDesc}</p>
        </Card>

        {/* Key 4 palaces grid */}
        <div className="grid grid-cols-2 gap-3">
          {result.palaces.slice(0, 4).map((palace) => {
            const Icon = PALACE_ICONS[palace.name] || Star;
            const grad = PALACE_COLORS[palace.name] || "from-gray-500/20 to-gray-500/20";
            return (
              <Card key={palace.name} className={`bg-gradient-to-br ${grad} border-0 p-4 space-y-2`}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{palace.name}</span>
                </div>
                <Badge variant="secondary" className="text-xs">{palace.mainStar}</Badge>
              </Card>
            );
          })}
        </div>

        {/* All palaces detail */}
        <Card className="bg-transparent border-0 p-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" /> 宫位详解
          </h3>
          {result.palaces.map((palace, i) => (
            <div key={i} className="space-y-1 pb-3 border-b border-border/30 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{palace.name}</Badge>
                <span className="text-xs text-muted-foreground">主星: {palace.mainStar}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{palace.description}</p>
            </div>
          ))}
        </Card>

        {/* Summary */}
        <Card className="bg-transparent border-0 p-4 space-y-3">
          <h3 className="font-semibold">命格总结</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
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
        <h1 className="text-lg font-bold">紫微斗数</h1>
      </div>

      <div className="text-center space-y-4 py-8">
        <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
          <span className="text-4xl">🌟</span>
        </div>
        <h2 className="text-xl font-bold">紫微斗数命盘</h2>
        <p className="text-sm text-muted-foreground px-4">
          紫微斗数是中国传统命理学中最精密的推算系统之一，通过出生信息排出命盘，分析十二宫位的星曜组合，揭示人生各方面的运势走向。
        </p>
      </div>

      <Card className="rounded-xl bg-card/30 border-0 p-4 space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">出生日期</label>
          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="h-10 text-sm bg-background"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">出生时辰</label>
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

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">性别</label>
          <div className="flex gap-3">
            <Button
              variant={gender === "male" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setGender("male")}
            >
              男
            </Button>
            <Button
              variant={gender === "female" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setGender("female")}
            >
              女
            </Button>
          </div>
        </div>

        <Button
          className="w-full"
          disabled={!birthDate || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />正在排盘分析...</>
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
