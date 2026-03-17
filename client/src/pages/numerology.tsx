import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Sparkles, Hash } from "lucide-react";
import { Link } from "wouter";

interface NumerologyResult {
  lifePathNumber: number;
  birthdayNumber: number;
  talentNumber: number;
  lifePathMeaning: string;
  birthdayMeaning: string;
  talentMeaning: string;
  traits: string[];
  motto: string;
  strengths: string;
  challenges: string;
  compatibility: string;
  luckyColor: string;
  career: string;
}

const NUMBER_COLORS: Record<number, string> = {
  1: "from-red-500/20 to-orange-500/20",
  2: "from-orange-500/20 to-amber-500/20",
  3: "from-amber-500/20 to-yellow-500/20",
  4: "from-emerald-500/20 to-green-500/20",
  5: "from-cyan-500/20 to-blue-500/20",
  6: "from-blue-500/20 to-indigo-500/20",
  7: "from-indigo-500/20 to-violet-500/20",
  8: "from-violet-500/20 to-purple-500/20",
  9: "from-purple-500/20 to-pink-500/20",
};

const NUMBER_KEYWORDS: Record<number, string> = {
  1: "领袖 · 独立 · 开创",
  2: "协调 · 敏感 · 合作",
  3: "创意 · 表达 · 社交",
  4: "务实 · 稳定 · 坚韧",
  5: "自由 · 冒险 · 变化",
  6: "责任 · 和谐 · 关怀",
  7: "智慧 · 内省 · 灵性",
  8: "权力 · 财富 · 成就",
  9: "博爱 · 包容 · 理想",
};

export default function NumerologyPage() {
  const { user } = useAuth();
  const [birthDate, setBirthDate] = useState(user?.birthDate || "");
  const [result, setResult] = useState<NumerologyResult | null>(null);

  const mutation = useMutation({
    mutationFn: async (date: string) => {
      const res = await apiRequest("POST", "/api/metaphysics/numerology", { birthDate: date });
      return res.json();
    },
    onSuccess: (data) => setResult(data.result),
  });

  if (result) {
    const grad = NUMBER_COLORS[result.lifePathNumber] || "from-purple-500/20 to-blue-500/20";

    return (
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4 overflow-x-hidden">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/discover">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-lg font-bold">灵数分析</h1>
        </div>

        {/* Main number */}
        <Card className={`bg-gradient-to-br ${grad} border-0 p-6 text-center space-y-3`}>
          <div className="mx-auto w-20 h-20 rounded-full bg-background/20 flex items-center justify-center">
            <span className="text-4xl font-bold">{result.lifePathNumber}</span>
          </div>
          <h2 className="text-lg font-bold">生命灵数 {result.lifePathNumber}</h2>
          <p className="text-sm text-muted-foreground">{NUMBER_KEYWORDS[result.lifePathNumber] || ""}</p>
          {result.motto && (
            <p className="text-sm italic text-muted-foreground">「{result.motto}」</p>
          )}
        </Card>

        {/* Three numbers */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-card/50 border-transparent p-3 text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-lg font-bold text-primary">{result.lifePathNumber}</span>
            </div>
            <p className="text-xs text-muted-foreground">生命灵数</p>
          </Card>
          <Card className="bg-card/50 border-transparent p-3 text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <span className="text-lg font-bold text-amber-400">{result.birthdayNumber}</span>
            </div>
            <p className="text-xs text-muted-foreground">生日数</p>
          </Card>
          <Card className="bg-card/50 border-transparent p-3 text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <span className="text-lg font-bold text-emerald-400">{result.talentNumber}</span>
            </div>
            <p className="text-xs text-muted-foreground">天赋数</p>
          </Card>
        </div>

        {/* Number grid visualization */}
        <Card className="bg-card/50 border-transparent p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Hash className="w-4 h-4" /> 灵数矩阵
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
              const isActive = n === result.lifePathNumber || n === result.birthdayNumber || n === result.talentNumber;
              return (
                <div
                  key={n}
                  className={`aspect-square rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                    isActive
                      ? "bg-primary/15 text-primary ring-2 ring-primary/30"
                      : "bg-accent/20 text-muted-foreground/40"
                  }`}
                >
                  {n}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Traits */}
        <Card className="bg-card/50 border-transparent p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> 核心特质
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.traits.map((t, i) => (
              <Badge key={i} className="bg-primary/10 text-primary border-0">{t}</Badge>
            ))}
          </div>
        </Card>

        {/* Life path meaning */}
        <Card className="bg-card/50 border-transparent p-4 space-y-3">
          <h3 className="font-semibold">生命灵数 {result.lifePathNumber} 解读</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.lifePathMeaning}</p>
        </Card>

        {/* Birthday & Talent */}
        <div className="grid grid-cols-1 gap-3">
          <Card className="bg-card/50 border-transparent p-4 space-y-2">
            <h3 className="text-sm font-semibold">生日数 {result.birthdayNumber}</h3>
            <p className="text-sm text-muted-foreground">{result.birthdayMeaning}</p>
          </Card>
          <Card className="bg-card/50 border-transparent p-4 space-y-2">
            <h3 className="text-sm font-semibold">天赋数 {result.talentNumber}</h3>
            <p className="text-sm text-muted-foreground">{result.talentMeaning}</p>
          </Card>
        </div>

        {/* Strengths & Challenges */}
        <Card className="bg-card/50 border-transparent p-4 space-y-3">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-emerald-400 mb-1">✨ 优势领域</h3>
              <p className="text-sm text-muted-foreground">{result.strengths}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-orange-400 mb-1">⚡ 挑战领域</h3>
              <p className="text-sm text-muted-foreground">{result.challenges}</p>
            </div>
          </div>
        </Card>

        {/* Extra info */}
        <Card className="bg-card/50 border-transparent p-4">
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-accent/30 rounded-xl p-3">
              <p className="text-muted-foreground text-xs">最佳搭配</p>
              <p className="font-medium mt-1">灵数 {result.compatibility}</p>
            </div>
            <div className="bg-accent/30 rounded-xl p-3">
              <p className="text-muted-foreground text-xs">幸运颜色</p>
              <p className="font-medium mt-1">{result.luckyColor}</p>
            </div>
            <div className="bg-accent/30 rounded-xl p-3">
              <p className="text-muted-foreground text-xs">职业方向</p>
              <p className="font-medium mt-1 text-xs leading-tight">{result.career.slice(0, 20)}</p>
            </div>
          </div>
        </Card>

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
        <h1 className="text-lg font-bold">灵数分析</h1>
      </div>

      <div className="text-center space-y-4 py-4">
        {/* Number grid */}
        <div className="grid grid-cols-3 gap-2 max-w-[180px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <div
              key={n}
              className={`aspect-square rounded-full bg-gradient-to-br ${NUMBER_COLORS[n]} flex items-center justify-center`}
            >
              <span className="text-xl font-bold">{n}</span>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold">探索你的生命数字</h2>
        <p className="text-sm text-muted-foreground px-4">
          生命灵数是古老的数字命理学体系，通过你的出生日期揭示生命密码。每个数字都蕴含着独特的能量和使命。
        </p>
      </div>

      <Card className="bg-card/50 border-transparent p-4 space-y-4">
        <label className="text-sm font-medium">出生日期</label>
        <Input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="bg-background"
        />
        <Button
          className="w-full"
          disabled={!birthDate || mutation.isPending}
          onClick={() => mutation.mutate(birthDate)}
        >
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />正在分析灵数...</>
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
