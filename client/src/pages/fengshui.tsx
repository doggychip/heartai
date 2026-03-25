import { PageContainer } from "@/components/PageContainer";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  RotateCcw,
  Home,
  Building2,
  MapPin,
  Layers,
  Heart,
  AlertTriangle,
  Leaf,
  CheckCircle2,
} from "lucide-react";

interface FengshuiArea {
  name: string;
  score: number;
  analysis: string;
  tips: string[];
}

interface FengshuiResult {
  spaceType: string;
  facing: string;
  overallScore: number;
  summary: string;
  areas: FengshuiArea[];
  luckyItems: string[];
  taboos: string[];
  seasonalAdvice: string;
}

const SPACE_TYPES = [
  { value: "apartment", label: "公寓/住宅" },
  { value: "house", label: "独栋/别墅" },
  { value: "office", label: "办公室" },
  { value: "shop", label: "商铺/店面" },
  { value: "studio", label: "工作室" },
  { value: "bedroom", label: "卧室" },
];

const FACINGS = [
  { value: "north", label: "坐南朝北" },
  { value: "south", label: "坐北朝南" },
  { value: "east", label: "坐西朝东" },
  { value: "west", label: "坐东朝西" },
  { value: "northeast", label: "坐西南朝东北" },
  { value: "northwest", label: "坐东南朝西北" },
  { value: "southeast", label: "坐西北朝东南" },
  { value: "southwest", label: "坐东北朝西南" },
  { value: "unknown", label: "不确定" },
];

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "text-green-500" : score >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth="4"
          className="text-muted/30"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className={color}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <span className={`absolute text-lg font-bold ${color}`}>{score}</span>
    </div>
  );
}

export default function FengshuiPage() {
  const { toast } = useToast();
  const [spaceType, setSpaceType] = useState("");
  const [facing, setFacing] = useState("");
  const [floor, setFloor] = useState("");
  const [concerns, setConcerns] = useState("");
  const [result, setResult] = useState<FengshuiResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/fengshui/analyze", {
        spaceType, facing: facing || undefined, floor: floor || undefined, concerns: concerns || undefined,
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
    return (
      <div className="flex-1 overflow-y-auto" data-testid="fengshui-result-page">
        <PageContainer className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">风水评估</h1>
            <Button variant="outline" size="sm" onClick={restart} data-testid="button-fengshui-restart">
              <RotateCcw className="w-4 h-4 mr-1" /> 重新评估
            </Button>
          </div>

          {/* Score Hero */}
          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <CardContent className="py-6">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {SPACE_TYPES.find(s => s.value === result.spaceType)?.label || result.spaceType} · {result.facing}
                </p>
                <ScoreRing score={result.overallScore} size={100} />
                <p className="text-xs text-muted-foreground">风水综合评分</p>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-500" /> 风水总述
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/80">{result.summary}</p>
            </CardContent>
          </Card>

          {/* Area Analysis */}
          {result.areas.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" /> 分区分析
              </h2>
              {result.areas.map((area, idx) => (
                <Card key={idx}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">{area.name}</p>
                      <Badge
                        variant={area.score >= 80 ? "secondary" : area.score >= 60 ? "outline" : "destructive"}
                        className="text-xs"
                      >
                        {area.score}分
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{area.analysis}</p>
                    {area.tips.length > 0 && (
                      <div className="space-y-1">
                        {area.tips.map((tip, ti) => (
                          <div key={ti} className="flex items-start gap-2 text-xs text-foreground/70">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Lucky Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="w-4 h-4 text-amber-500" /> 开运物品
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.luckyItems.map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-xs py-1">
                    <Leaf className="w-3 h-3 mr-1" /> {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Taboos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> 风水禁忌
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.taboos.map((taboo, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                    <span>{taboo}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Seasonal Advice */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Leaf className="w-4 h-4 text-green-500" /> 当季调整建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/80">{result.seasonalAdvice}</p>
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground pb-4">
            * 以上内容基于传统风水文化，仅供参考
          </p>
        </PageContainer>
      </div>
    );
  }

  // ─── Input Form ─────
  const floors = Array.from({ length: 50 }, (_, i) => String(i + 1));

  return (
    <div className="flex-1 overflow-y-auto" data-testid="fengshui-page">
      <PageContainer className="space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Home className="w-5 h-5 text-emerald-500" />
            风水环境评估
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            输入空间信息，获取AI风水分析和改善建议
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">空间类型 *</label>
              <Select value={spaceType} onValueChange={setSpaceType}>
                <SelectTrigger data-testid="select-space-type">
                  <SelectValue placeholder="选择空间类型" />
                </SelectTrigger>
                <SelectContent>
                  {SPACE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">朝向 (选填)</label>
                <Select value={facing} onValueChange={setFacing}>
                  <SelectTrigger data-testid="select-facing">
                    <SelectValue placeholder="选择朝向" />
                  </SelectTrigger>
                  <SelectContent>
                    {FACINGS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">楼层 (选填)</label>
                <Select value={floor} onValueChange={setFloor}>
                  <SelectTrigger data-testid="select-floor">
                    <SelectValue placeholder="楼层" />
                  </SelectTrigger>
                  <SelectContent>
                    {floors.map((f) => (
                      <SelectItem key={f} value={f}>{f}层</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">特别关注 (选填)</label>
              <Textarea
                placeholder="例：想提升财运 / 睡眠质量不好 / 新搬家想布置"
                value={concerns}
                onChange={(e) => setConcerns(e.target.value)}
                rows={2}
                className="resize-none"
                data-testid="input-fengshui-concerns"
              />
            </div>

            <Button
              className="w-full"
              disabled={!spaceType || mutation.isPending}
              onClick={() => mutation.mutate()}
              data-testid="button-fengshui-submit"
            >
              {mutation.isPending ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" /> AI 正在勘察风水...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" /> 开始评估
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          * 基于中国传统风水学，结合AI智能分析，仅供文化探索参考
        </p>
      </PageContainer>
    </div>
  );
}
