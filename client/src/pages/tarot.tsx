import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  RotateCcw,
  Eye,
  Lightbulb,
  Layers,
} from "lucide-react";

interface TarotCard {
  id: number;
  name: string;
  nameEn: string;
  emoji: string;
  reversed: boolean;
  position: string;
  interpretation: string;
}

interface TarotResult {
  question: string;
  spread: string;
  cards: TarotCard[];
  overall: string;
  advice: string;
}

type SpreadType = "single" | "three" | "cross";

const SPREADS: { value: SpreadType; label: string; desc: string; count: number }[] = [
  { value: "single", label: "单牌指引", desc: "一张牌，直指核心", count: 1 },
  { value: "three", label: "时间之流", desc: "过去·现在·未来", count: 3 },
  { value: "cross", label: "十字牌阵", desc: "五张牌全面解读", count: 5 },
];

export default function TarotPage() {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [spread, setSpread] = useState<SpreadType>("single");
  const [result, setResult] = useState<TarotResult | null>(null);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tarot/draw", { question, spread });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      setFlipped(new Set());
    },
    onError: (err: Error) =>
      toast({ title: "占卜失败", description: err.message, variant: "destructive" }),
  });

  const flipCard = (idx: number) => {
    setFlipped((prev) => new Set(prev).add(idx));
  };

  const restart = () => {
    setResult(null);
    setFlipped(new Set());
    setQuestion("");
  };

  // ─── Result View ─────
  if (result) {
    const allFlipped = flipped.size >= result.cards.length;
    return (
      <div className="flex-1 overflow-y-auto" data-testid="tarot-result-page">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">塔罗占卜</h1>
            <Button variant="outline" size="sm" onClick={restart} data-testid="button-tarot-restart">
              <RotateCcw className="w-4 h-4 mr-1" /> 重新占卜
            </Button>
          </div>

          {/* Question */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">你的问题</p>
            <p className="text-base font-medium mt-1">{result.question}</p>
          </div>

          {/* Cards */}
          <div className={`grid gap-4 ${result.cards.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : result.cards.length === 3 ? "grid-cols-3" : "grid-cols-3"}`}>
            {result.cards.map((card, idx) => {
              const isFlipped = flipped.has(idx);
              return (
                <div key={idx} className="flex flex-col items-center">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">{card.position}</p>
                  {!isFlipped ? (
                    <button
                      onClick={() => flipCard(idx)}
                      className="w-full aspect-[2/3] rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-2 hover:border-primary/60 transition-all hover:scale-[1.02] cursor-pointer"
                      data-testid={`button-flip-card-${idx}`}
                    >
                      <Sparkles className="w-8 h-8 text-primary/50" />
                      <span className="text-xs text-muted-foreground">点击翻牌</span>
                    </button>
                  ) : (
                    <div className="w-full aspect-[2/3] rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-primary/20 flex flex-col items-center justify-center p-3 animate-in fade-in duration-500">
                      <span className="text-3xl mb-1">{card.emoji}</span>
                      <p className="text-sm font-bold text-center">{card.name}</p>
                      <p className="text-[10px] text-muted-foreground">{card.nameEn}</p>
                      <Badge
                        variant={card.reversed ? "destructive" : "secondary"}
                        className="mt-1 text-[10px]"
                      >
                        {card.reversed ? "逆位" : "正位"}
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}

          </div>

          {/* Card Interpretations — show after all cards flipped */}
          {allFlipped && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {result.cards.map((card, idx) => (
                <Card key={idx}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{card.emoji}</span>
                      <div>
                        <p className="text-sm font-medium">
                          {card.position} · {card.name} {card.reversed ? "(逆位)" : "(正位)"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">{card.interpretation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Overall reading */}
              <Card className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-500" /> 整体解读
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-foreground/80">{result.overall}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" /> 行动建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-foreground/80">{result.advice}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {!allFlipped && (
            <p className="text-xs text-center text-muted-foreground animate-pulse">
              点击翻开所有卡牌查看完整解读
            </p>
          )}

          <p className="text-xs text-center text-muted-foreground pb-4">
            * 塔罗占卜仅供娱乐和自我探索参考
          </p>
        </div>
      </div>
    );
  }

  // ─── Input Form ─────
  return (
    <div className="flex-1 overflow-y-auto" data-testid="tarot-page">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            塔罗占卜
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            选择牌阵，让塔罗牌为你指引方向
          </p>
        </div>

        {/* Spread selection */}
        <div className="space-y-3">
          <p className="text-sm font-medium">选择牌阵</p>
          <div className="grid grid-cols-3 gap-3">
            {SPREADS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSpread(s.value)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  spread === s.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
                data-testid={`button-spread-${s.value}`}
              >
                <div className="flex justify-center gap-1 mb-2">
                  {Array.from({ length: s.count }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-5 h-7 rounded-sm ${
                        spread === s.value ? "bg-primary/30" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium">{s.label}</p>
                <p className="text-[10px] text-muted-foreground">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Question input */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">你想问什么？</label>
              <Textarea
                placeholder="例：近期的感情运势如何？我该怎么选择？"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                className="resize-none"
                data-testid="input-tarot-question"
              />
              <p className="text-[10px] text-muted-foreground mt-1">留空则默认占卜今日运势</p>
            </div>
            <Button
              className="w-full"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              data-testid="button-tarot-submit"
            >
              {mutation.isPending ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" /> 塔罗牌正在洗牌...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 mr-2" /> 开始占卜
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          * 基于22张大阿卡那牌，AI智能解读，仅供娱乐参考
        </p>
      </div>
    </div>
  );
}
