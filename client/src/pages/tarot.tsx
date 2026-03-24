import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
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

const SPREADS: { value: SpreadType; label: string; desc: string; count: number; icon: string }[] = [
  { value: "single", label: "单牌指引", desc: "一张牌，直指核心", count: 1, icon: "🃏" },
  { value: "three", label: "时间之流", desc: "过去·现在·未来", count: 3, icon: "🔮" },
  { value: "cross", label: "十字牌阵", desc: "五张牌全面解读", count: 5, icon: "✨" },
];

// Tarot card back pattern component
function CardBack({ onClick, index }: { onClick: () => void; index: number }) {
  return (
    <button
      onClick={onClick}
      className="w-full aspect-[2/3] rounded-2xl relative overflow-hidden cursor-pointer group"
      data-testid={`button-flip-card-${index}`}
    >
      {/* Mystical gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-900 group-hover:from-indigo-500 group-hover:via-purple-600 group-hover:to-violet-800 transition-all duration-500" />
      {/* Inner border frame */}
      <div className="absolute inset-2 rounded-xl border border-amber-400/30 group-hover:border-amber-400/50 transition-colors" />
      {/* Center star pattern */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-amber-400/40 group-hover:border-amber-400/60 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
            <Sparkles className="w-6 h-6 text-amber-300/70 group-hover:text-amber-300 transition-colors" />
          </div>
          {/* Corner decorations */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-amber-400/20" />
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-px h-4 bg-amber-400/20" />
          <div className="absolute top-1/2 -left-6 -translate-y-1/2 h-px w-4 bg-amber-400/20" />
          <div className="absolute top-1/2 -right-6 -translate-y-1/2 h-px w-4 bg-amber-400/20" />
        </div>
      </div>
      {/* Shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {/* Bottom text */}
      <div className="absolute bottom-3 inset-x-0 text-center">
        <span className="text-[10px] text-amber-200/60 group-hover:text-amber-200/90 transition-colors">点击翻牌</span>
      </div>
    </button>
  );
}

// Revealed card face
function CardFace({ card }: { card: TarotCard }) {
  return (
    <div className="w-full aspect-[2/3] rounded-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      {/* Background */}
      <div className={`absolute inset-0 ${card.reversed
        ? "bg-gradient-to-br from-rose-500/15 to-purple-600/15"
        : "bg-gradient-to-br from-indigo-500/10 to-amber-500/10"
      }`} />
      <div className="absolute inset-1 rounded-xl border border-primary/15" />
      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
        <span className="text-4xl mb-2">{card.emoji}</span>
        <p className="text-sm font-bold text-center leading-tight">{card.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{card.nameEn}</p>
        <Badge
          variant={card.reversed ? "destructive" : "secondary"}
          className="mt-2 text-[10px]"
        >
          {card.reversed ? "逆位 ↓" : "正位 ↑"}
        </Badge>
      </div>
    </div>
  );
}

export default function TarotPage() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const [, navigate] = useLocation();
  const [question, setQuestion] = useState("");
  const [spread, setSpread] = useState<SpreadType>("three");
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
    onError: (err: Error) => {
      if (err.message.startsWith("401")) {
        toast({
          title: "请登录后使用塔罗占卜",
          description: "登录后即可解锁占卜功能",
          variant: "destructive",
          action: (
            <ToastAction altText="去登录" onClick={() => { logout(); navigate("/auth"); }}>
              去登录
            </ToastAction>
          ),
        });
      } else {
        toast({ title: "占卜失败", description: err.message, variant: "destructive" });
      }
    },
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
        <PageContainer className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              塔罗占卜
            </h1>
            <Button variant="outline" size="sm" onClick={restart} data-testid="button-tarot-restart">
              <RotateCcw className="w-4 h-4 mr-1" /> 重新占卜
            </Button>
          </div>

          {/* Question */}
          <Card className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border-primary/10">
            <CardContent className="py-4 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">你的问题</p>
              <p className="text-sm font-medium">{result.question}</p>
            </CardContent>
          </Card>

          {/* Cards layout */}
          <div className={`grid gap-4 ${
            result.cards.length === 1 ? "grid-cols-1 max-w-[160px] mx-auto" :
            result.cards.length === 3 ? "grid-cols-3 max-w-md mx-auto" :
            "grid-cols-3 max-w-md mx-auto"
          }`}>
            {result.cards.slice(0, result.cards.length <= 3 ? result.cards.length : 3).map((card, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <p className="text-xs text-muted-foreground mb-2 font-medium">{card.position}</p>
                {!flipped.has(idx) ? (
                  <CardBack onClick={() => flipCard(idx)} index={idx} />
                ) : (
                  <CardFace card={card} />
                )}
              </div>
            ))}
          </div>

          {/* Row 2 for cross spread */}
          {result.cards.length === 5 && (
            <div className="grid grid-cols-2 gap-4 max-w-[280px] mx-auto">
              {result.cards.slice(3).map((card, i) => {
                const idx = i + 3;
                return (
                  <div key={idx} className="flex flex-col items-center">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">{card.position}</p>
                    {!flipped.has(idx) ? (
                      <CardBack onClick={() => flipCard(idx)} index={idx} />
                    ) : (
                      <CardFace card={card} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Card Interpretations — show after all cards flipped */}
          {allFlipped && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {result.cards.map((card, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">{card.emoji}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">{card.position} · {card.name}</p>
                          <Badge variant={card.reversed ? "destructive" : "outline"} className="text-[10px]">
                            {card.reversed ? "逆位" : "正位"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{card.interpretation}</p>
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
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground animate-pulse">
                ✨ 点击翻开所有卡牌查看完整解读 ✨
              </p>
            </div>
          )}

          <div className="border-t border-border pt-3">
            <p className="text-[10px] text-center text-muted-foreground">
              ⚠️ 免责声明：塔罗占卜仅供娱乐和自我探索参考，不构成任何决策建议。请理性看待占卜结果。
            </p>
          </div>
        </PageContainer>
      </div>
    );
  }

  // ─── Input Form ─────
  return (
    <div className="flex-1 overflow-y-auto" data-testid="tarot-page">
      <PageContainer className="space-y-6">
        <PageHeader icon={Sparkles} title="塔罗占卜" description="选择牌阵，让塔罗牌为你指引方向" iconClassName="text-purple-500" />

        {/* Spread selection — upgraded visuals */}
        <div className="space-y-3">
          <p className="text-sm font-medium">选择牌阵</p>
          <div className="grid grid-cols-3 gap-3">
            {SPREADS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSpread(s.value)}
                className={`p-4 rounded-2xl border-2 text-center transition-all duration-200 ${
                  spread === s.value
                    ? "border-primary bg-gradient-to-br from-indigo-500/10 to-purple-500/10 scale-[1.02] shadow-sm"
                    : "border-border hover:border-primary/30 hover:bg-accent/30"
                }`}
                data-testid={`button-spread-${s.value}`}
              >
                <span className="text-2xl">{s.icon}</span>
                <div className="flex justify-center gap-1 my-2">
                  {Array.from({ length: s.count }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-6 rounded-sm border transition-colors ${
                        spread === s.value
                          ? "bg-primary/20 border-primary/40"
                          : "bg-muted/60 border-muted"
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
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              data-testid="button-tarot-submit"
            >
              {mutation.isPending ? (
                <><Sparkles className="w-4 h-4 mr-2 animate-spin" /> 塔罗牌正在洗牌...</>
              ) : (
                <><Layers className="w-4 h-4 mr-2" /> 开始占卜</>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="border-t border-border pt-3">
          <p className="text-[10px] text-center text-muted-foreground">
            ⚠️ 免责声明：基于22张大阿卡那牌，AI智能解读，仅供娱乐和自我探索参考，不构成任何决策建议。
          </p>
        </div>
      </PageContainer>
    </div>
  );
}
