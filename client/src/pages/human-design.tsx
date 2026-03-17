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
import { ArrowLeft, Loader2, Sparkles, Zap, Shield, Compass, Users } from "lucide-react";
import { Link } from "wouter";

interface HumanDesignResult {
  type: string;
  typeTitle: string;
  typeDescription: string;
  strategy: string;
  strategyDescription: string;
  authority: string;
  authorityDescription: string;
  profile: string;
  profileDescription: string;
  definition: string;
  definitionDescription: string;
  notSelfTheme: string;
  energyCenters: { name: string; status: string; description: string }[];
  detailedAnalysis: string;
  advice: string;
}

const TYPE_COLORS: Record<string, string> = {
  "显示者": "from-red-500/20 to-orange-500/20",
  "生产者": "from-amber-500/20 to-yellow-500/20",
  "显示生产者": "from-orange-500/20 to-amber-500/20",
  "投射者": "from-blue-500/20 to-indigo-500/20",
  "反映者": "from-violet-500/20 to-purple-500/20",
};

const TYPE_EMOJIS: Record<string, string> = {
  "显示者": "⚡",
  "生产者": "🔥",
  "显示生产者": "🌟",
  "投射者": "🔮",
  "反映者": "🌙",
};

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: `${String(i).padStart(2, "0")}:00`,
}));

export default function HumanDesignPage() {
  const { user } = useAuth();
  const [birthDate, setBirthDate] = useState(user?.birthDate || "");
  const [birthHour, setBirthHour] = useState<string>("");
  const [birthMinute, setBirthMinute] = useState("");
  const [birthLocation, setBirthLocation] = useState("");
  const [result, setResult] = useState<HumanDesignResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/metaphysics/human-design", {
        birthDate,
        birthHour: birthHour ? parseInt(birthHour) : undefined,
        birthMinute: birthMinute ? parseInt(birthMinute) : undefined,
        birthLocation,
      });
      return res.json();
    },
    onSuccess: (data) => setResult(data.result),
  });

  if (result) {
    const grad = TYPE_COLORS[result.type] || "from-teal-500/20 to-blue-500/20";
    const emoji = TYPE_EMOJIS[result.type] || "🔮";

    return (
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/discover">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-lg font-bold">人类图分析</h1>
        </div>

        {/* Type header */}
        <Card className={`bg-gradient-to-br ${grad} border-0 p-6 text-center space-y-3`}>
          <div className="text-4xl">{emoji}</div>
          <h2 className="text-xl font-bold">{result.type}</h2>
          <p className="text-sm font-medium text-foreground/80">{result.typeTitle}</p>
          <p className="text-sm text-muted-foreground">{result.typeDescription}</p>
        </Card>

        {/* Key attributes grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border-0 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold">策略</span>
            </div>
            <Badge variant="secondary" className="text-xs">{result.strategy}</Badge>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/15 to-orange-500/15 border-0 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold">内在权威</span>
            </div>
            <Badge variant="secondary" className="text-xs">{result.authority}</Badge>
          </Card>
          <Card className="bg-gradient-to-br from-violet-500/15 to-purple-500/15 border-0 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold">人生角色</span>
            </div>
            <Badge variant="secondary" className="text-xs">{result.profile}</Badge>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border-0 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold">定义类型</span>
            </div>
            <Badge variant="secondary" className="text-xs">{result.definition}</Badge>
          </Card>
        </div>

        {/* Strategy detail */}
        <Card className="bg-card/50 border-border/50 p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" /> 策略解读
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.strategyDescription}</p>
        </Card>

        {/* Authority detail */}
        <Card className="bg-card/50 border-border/50 p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" /> 内在权威解读
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.authorityDescription}</p>
        </Card>

        {/* Profile detail */}
        <Card className="bg-card/50 border-border/50 p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" /> 人生角色 {result.profile}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.profileDescription}</p>
        </Card>

        {/* Definition detail */}
        <Card className="bg-card/50 border-border/50 p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" /> {result.definition}定义
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.definitionDescription}</p>
        </Card>

        {/* Energy centers */}
        {result.energyCenters && result.energyCenters.length > 0 && (
          <Card className="bg-card/50 border-border/50 p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" /> 能量中心
            </h3>
            {result.energyCenters.map((center, i) => (
              <div key={i} className="space-y-1 pb-3 border-b border-border/30 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{center.name}</Badge>
                  <Badge
                    className={`text-xs border-0 ${
                      center.status === "开放" ? "bg-blue-500/15 text-blue-400" : "bg-emerald-500/15 text-emerald-400"
                    }`}
                  >
                    {center.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{center.description}</p>
              </div>
            ))}
          </Card>
        )}

        {/* Not-self theme */}
        <Card className="bg-gradient-to-br from-rose-500/10 to-orange-500/10 border-0 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-rose-400">⚠️ 非自己主题</h3>
          <p className="text-sm text-muted-foreground">{result.notSelfTheme}</p>
        </Card>

        {/* Detailed analysis */}
        <Card className="bg-card/50 border-border/50 p-4 space-y-3">
          <h3 className="font-semibold">深度解读</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{result.detailedAnalysis}</p>
          <div className="bg-accent/30 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">💡 人生建议</p>
            <p className="text-sm">{result.advice}</p>
          </div>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          当前内容为免费内容，仅供娱乐参考。人类图分析基于AI生成，完整人类图需要精确天文计算。
        </p>

        <Button variant="outline" className="w-full" onClick={() => setResult(null)}>重新分析</Button>
      </div>
    );
  }

  // Landing page
  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/discover">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-lg font-bold">人类图分析</h1>
      </div>

      <div className="text-center space-y-4 py-8">
        <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-teal-500/20 to-blue-500/20 flex items-center justify-center">
          <span className="text-4xl">🔮</span>
        </div>
        <h2 className="text-xl font-bold">发现你的人类图</h2>
        <p className="text-sm text-muted-foreground px-4">
          人类图（Human Design）融合了占星学、易经、卡巴拉生命之树和脉轮系统，通过你的出生信息揭示你独特的能量蓝图、决策策略和人生角色。
        </p>

        {/* Type preview cards */}
        <div className="grid grid-cols-5 gap-2 px-2 pt-2">
          {[
            { name: "显示者", emoji: "⚡", color: "from-red-500/15 to-orange-500/15" },
            { name: "生产者", emoji: "🔥", color: "from-amber-500/15 to-yellow-500/15" },
            { name: "显示\n生产者", emoji: "🌟", color: "from-orange-500/15 to-amber-500/15" },
            { name: "投射者", emoji: "🔮", color: "from-blue-500/15 to-indigo-500/15" },
            { name: "反映者", emoji: "🌙", color: "from-violet-500/15 to-purple-500/15" },
          ].map((t) => (
            <div key={t.name} className={`bg-gradient-to-br ${t.color} rounded-xl p-2 text-center`}>
              <div className="text-lg">{t.emoji}</div>
              <p className="text-[10px] text-muted-foreground whitespace-pre-line leading-tight mt-1">{t.name}</p>
            </div>
          ))}
        </div>
      </div>

      <Card className="bg-card/50 border-border/50 p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">出生日期</label>
          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="bg-background"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">出生时间（小时）</label>
            <Select value={birthHour} onValueChange={setBirthHour}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="时" />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">分钟</label>
            <Input
              type="number"
              min={0}
              max={59}
              placeholder="分"
              value={birthMinute}
              onChange={(e) => setBirthMinute(e.target.value)}
              className="bg-background"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">出生地点</label>
          <Input
            type="text"
            placeholder="例如：北京、上海、广州"
            value={birthLocation}
            onChange={(e) => setBirthLocation(e.target.value)}
            className="bg-background"
          />
        </div>

        <Button
          className="w-full"
          disabled={!birthDate || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />正在生成人类图分析...</>
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
