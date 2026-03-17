import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Star, Compass, Sparkles } from "lucide-react";
import { Link } from "wouter";

interface StarMansionResult {
  mansion: string;
  title: string;
  group: string;
  element: string;
  personality: string;
  traits: string[];
  compatible: string[];
  challenging: string[];
  luckyColor: string;
  luckyDirection: string;
  luckyNumber: string;
}

const GROUP_COLORS: Record<string, string> = {
  "东方青龙": "from-emerald-500/20 to-cyan-500/20",
  "北方玄武": "from-indigo-500/20 to-purple-500/20",
  "西方白虎": "from-amber-500/20 to-orange-500/20",
  "南方朱雀": "from-rose-500/20 to-red-500/20",
};

const GROUP_EMOJIS: Record<string, string> = {
  "东方青龙": "🐲",
  "北方玄武": "🐢",
  "西方白虎": "🐯",
  "南方朱雀": "🦅",
};

export default function StarMansionPage() {
  const { user } = useAuth();
  const [birthDate, setBirthDate] = useState(user?.birthDate || "");
  const [result, setResult] = useState<StarMansionResult | null>(null);

  const mutation = useMutation({
    mutationFn: async (date: string) => {
      const res = await apiRequest("POST", "/api/metaphysics/star-mansion", { birthDate: date });
      return res.json();
    },
    onSuccess: (data) => setResult(data.result),
  });

  if (result) {
    const gradClass = GROUP_COLORS[result.group] || "from-purple-500/20 to-blue-500/20";
    const groupEmoji = GROUP_EMOJIS[result.group] || "⭐";

    return (
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4 overflow-x-hidden">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/discover">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-lg font-bold">二十八星宿</h1>
        </div>

        {/* Main result card */}
        <Card className={`bg-gradient-to-br ${gradClass} border-0 p-6 text-center space-y-3`}>
          <div className="text-5xl">{groupEmoji}</div>
          <h2 className="text-2xl font-bold">{result.mansion}</h2>
          <p className="text-sm text-muted-foreground">{result.title}</p>
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge variant="secondary">{result.group}</Badge>
            <Badge variant="outline">五行 · {result.element}</Badge>
          </div>
        </Card>

        {/* Personality */}
        <Card className="bg-transparent border-0 p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" /> 性格特质
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.personality}</p>
          <div className="flex flex-wrap gap-2">
            {result.traits.map((t, i) => (
              <Badge key={i} className="bg-primary/10 text-primary border-0">{t}</Badge>
            ))}
          </div>
        </Card>

        {/* Compatibility */}
        <Card className="bg-transparent border-0 p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-400" /> 星宿关系
          </h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">相合星宿</p>
              <div className="flex flex-wrap gap-1.5">
                {result.compatible.map((c, i) => (
                  <Badge key={i} variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-0">{c}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">冲突星宿</p>
              <div className="flex flex-wrap gap-1.5">
                {result.challenging.map((c, i) => (
                  <Badge key={i} variant="secondary" className="bg-red-500/10 text-red-400 border-0">{c}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Lucky elements */}
        <Card className="bg-transparent border-0 p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-yellow-400" /> 幸运元素
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-accent/30 rounded-xl p-3">
              <p className="text-muted-foreground text-xs">幸运颜色</p>
              <p className="font-medium mt-1">{result.luckyColor}</p>
            </div>
            <div className="bg-accent/30 rounded-xl p-3">
              <p className="text-muted-foreground text-xs">幸运方位</p>
              <p className="font-medium mt-1">{result.luckyDirection}</p>
            </div>
            <div className="bg-accent/30 rounded-xl p-3">
              <p className="text-muted-foreground text-xs">幸运数字</p>
              <p className="font-medium mt-1">{result.luckyNumber}</p>
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
        <h1 className="text-lg font-bold">二十八星宿</h1>
      </div>

      <div className="text-center space-y-4 py-8">
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
            <span className="text-4xl">⭐</span>
          </div>
          {["角", "亢", "氐", "房", "心", "尾", "箕", "斗"].map((name, i) => {
            const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + 45 * Math.cos(angle);
            const y = 50 + 45 * Math.sin(angle);
            return (
              <span
                key={name}
                className="absolute text-[10px] text-muted-foreground"
                style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
              >
                {name}
              </span>
            );
          })}
        </div>

        <h2 className="text-xl font-bold">探索你的本命星宿</h2>
        <p className="text-sm text-muted-foreground px-4">
          二十八星宿是中国古代天文学的重要组成部分，根据你的出生日期，可以找到属于你的本命星宿，了解你的命格特质。
        </p>
      </div>

      <Card className="bg-transparent border-0 p-4 space-y-4">
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
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />正在查询星宿...</>
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
