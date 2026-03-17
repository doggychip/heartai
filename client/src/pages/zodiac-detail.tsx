import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Heart, Briefcase, Sparkles } from "lucide-react";
import { Link } from "wouter";

interface ZodiacResult {
  animal: string;
  emoji: string;
  title: string;
  element: string;
  personality: string;
  strengths: string[];
  weaknesses: string[];
  compatible: string[];
  challenging: string[];
  luckyNumbers: string[];
  luckyColors: string[];
  career: string;
  love: string;
}

const ANIMALS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const ANIMAL_EMOJIS: Record<string, string> = {
  "鼠": "🐭", "牛": "🐮", "虎": "🐯", "兔": "🐰", "龙": "🐲", "蛇": "🐍",
  "马": "🐴", "羊": "🐑", "猴": "🐵", "鸡": "🐔", "狗": "🐶", "猪": "🐷",
};

export default function ZodiacDetailPage() {
  const { user } = useAuth();
  const defaultYear = user?.birthDate ? user.birthDate.split("-")[0] : "";
  const [birthYear, setBirthYear] = useState(defaultYear);
  const [result, setResult] = useState<ZodiacResult | null>(null);

  const mutation = useMutation({
    mutationFn: async (year: number) => {
      const res = await apiRequest("POST", "/api/metaphysics/zodiac", { birthYear: year });
      return res.json();
    },
    onSuccess: (data) => setResult(data.result),
  });

  if (result) {
    const emoji = result.emoji || ANIMAL_EMOJIS[result.animal] || "🐲";

    return (
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4 overflow-x-hidden">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/discover">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-lg font-bold">生肖详解</h1>
        </div>

        {/* Main result */}
        <Card className="bg-gradient-to-br from-amber-500/15 to-orange-500/15 border-0 p-6 text-center space-y-3">
          <div className="text-6xl">{emoji}</div>
          <h2 className="text-2xl font-bold">属{result.animal}</h2>
          <p className="text-sm text-muted-foreground">{result.title}</p>
          <Badge variant="secondary">五行 · {result.element}</Badge>
        </Card>

        {/* Personality */}
        <Card className="bg-card/50 border-transparent p-4 space-y-3">
          <h3 className="font-semibold">性格描述</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.personality}</p>
        </Card>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-emerald-500/5 border-transparent p-4 space-y-2">
            <h3 className="text-sm font-semibold text-emerald-400">✨ 优点</h3>
            <div className="space-y-1">
              {result.strengths.map((s, i) => (
                <Badge key={i} variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-0 mr-1 mb-1">{s}</Badge>
              ))}
            </div>
          </Card>
          <Card className="bg-orange-500/5 border-transparent p-4 space-y-2">
            <h3 className="text-sm font-semibold text-orange-400">⚡ 缺点</h3>
            <div className="space-y-1">
              {result.weaknesses.map((w, i) => (
                <Badge key={i} variant="secondary" className="bg-orange-500/10 text-orange-400 border-0 mr-1 mb-1">{w}</Badge>
              ))}
            </div>
          </Card>
        </div>

        {/* Compatibility */}
        <Card className="bg-card/50 border-transparent p-4 space-y-3">
          <h3 className="font-semibold">生肖关系</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">🤝 和谐生肖</p>
              <div className="flex flex-wrap gap-1.5">
                {result.compatible.map((c, i) => (
                  <Badge key={i} className="bg-emerald-500/10 text-emerald-400 border-0">
                    {ANIMAL_EMOJIS[c] || ""} {c}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">⚔️ 磨合生肖</p>
              <div className="flex flex-wrap gap-1.5">
                {result.challenging.map((c, i) => (
                  <Badge key={i} className="bg-red-500/10 text-red-400 border-0">
                    {ANIMAL_EMOJIS[c] || ""} {c}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Career & Love */}
        <Card className="bg-card/50 border-transparent p-4 space-y-3">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-1">
                <Briefcase className="w-3.5 h-3.5" /> 事业方向
              </h3>
              <p className="text-sm text-muted-foreground">{result.career}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-1">
                <Heart className="w-3.5 h-3.5" /> 感情建议
              </h3>
              <p className="text-sm text-muted-foreground">{result.love}</p>
            </div>
          </div>
        </Card>

        {/* Lucky elements */}
        <Card className="bg-card/50 border-transparent p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-yellow-400" /> 幸运元素
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-accent/30 rounded-xl p-3 text-center">
              <p className="text-muted-foreground text-xs">幸运数字</p>
              <p className="font-medium mt-1">{result.luckyNumbers.join("、")}</p>
            </div>
            <div className="bg-accent/30 rounded-xl p-3 text-center">
              <p className="text-muted-foreground text-xs">幸运颜色</p>
              <p className="font-medium mt-1">{result.luckyColors.join("、")}</p>
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
        <h1 className="text-lg font-bold">生肖详解</h1>
      </div>

      <div className="text-center space-y-4 py-4">
        {/* Zodiac circle */}
        <div className="relative mx-auto w-48 h-48">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10" />
          {ANIMALS.map((animal, i) => {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + 40 * Math.cos(angle);
            const y = 50 + 40 * Math.sin(angle);
            return (
              <span
                key={animal}
                className="absolute text-lg"
                style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
              >
                {ANIMAL_EMOJIS[animal]}
              </span>
            );
          })}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-muted-foreground">十二生肖</span>
          </div>
        </div>

        <h2 className="text-xl font-bold">探索你的生肖命格</h2>
        <p className="text-sm text-muted-foreground px-4">
          十二生肖是中国传统文化的重要组成部分，蕴含着丰富的性格密码和命运信息。
        </p>
      </div>

      <Card className="bg-card/50 border-transparent p-4 space-y-4">
        <label className="text-sm font-medium">出生年份</label>
        <Input
          type="number"
          placeholder="例如: 1990"
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          className="bg-background"
          min={1900}
          max={2030}
        />
        {birthYear && parseInt(birthYear) >= 1900 && (
          <p className="text-sm text-center text-muted-foreground">
            属 {ANIMAL_EMOJIS[ANIMALS[(parseInt(birthYear) - 4) % 12]]} {ANIMALS[(parseInt(birthYear) - 4) % 12]}
          </p>
        )}
        <Button
          className="w-full"
          disabled={!birthYear || mutation.isPending}
          onClick={() => mutation.mutate(parseInt(birthYear))}
        >
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />正在生成分析...</>
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
