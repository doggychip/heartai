import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Heart, Loader2, RotateCcw, Share2, ArrowLeft } from "lucide-react";

// ─── Types ─────────────────────────────────────────────

type PortraitType = "past_life" | "future_partner" | "spirit_animal";

interface PortraitResult {
  ok: boolean;
  type: PortraitType;
  typeLabel: string;
  portrait: string;
  element: string;
  dayMaster: string;
  creditsCost: number;
  note: string;
}

interface ReadingOption {
  type: PortraitType;
  label: string;
  emoji: string;
  desc: string;
  gradient: string;
  gradientBorder: string;
  badgeClass: string;
}

const READING_OPTIONS: ReadingOption[] = [
  {
    type: "past_life",
    label: "前世画像",
    emoji: "🏛️",
    desc: "探索你的前世身份",
    gradient: "from-purple-600/20 via-purple-500/10 to-indigo-600/20",
    gradientBorder: "border-purple-500/30 hover:border-purple-400/50",
    badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  {
    type: "future_partner",
    label: "命定伴侣",
    emoji: "💕",
    desc: "遇见命中注定的TA",
    gradient: "from-pink-600/20 via-rose-500/10 to-pink-600/20",
    gradientBorder: "border-pink-500/30 hover:border-pink-400/50",
    badgeClass: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  },
  {
    type: "spirit_animal",
    label: "灵魂守护兽",
    emoji: "🐲",
    desc: "发现你的灵魂守护兽",
    gradient: "from-emerald-600/20 via-emerald-500/10 to-teal-600/20",
    gradientBorder: "border-emerald-500/30 hover:border-emerald-400/50",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
];

// ─── Component ─────────────────────────────────────────

export default function AiPortraitPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [confirmType, setConfirmType] = useState<PortraitType | null>(null);
  const [result, setResult] = useState<PortraitResult | null>(null);

  const portraitMutation = useMutation({
    mutationFn: async (type: PortraitType) => {
      const res = await apiRequest("POST", "/api/fortune/ai-portrait", { type });
      if (res.status === 402) {
        throw new Error("402: 积分不足");
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json() as Promise<PortraitResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      setConfirmType(null);
    },
    onError: (err: Error) => {
      setConfirmType(null);
      if (err.message.startsWith("402")) {
        toast({
          title: "积分不足",
          description: "请前往会员中心充值积分",
          variant: "destructive",
        });
      } else {
        toast({
          title: "生成失败",
          description: "请稍后重试",
          variant: "destructive",
        });
      }
    },
  });

  const handleConfirm = () => {
    if (!confirmType || portraitMutation.isPending) return;
    portraitMutation.mutate(confirmType);
  };

  const handleReset = () => {
    setResult(null);
    setConfirmType(null);
  };

  // Find the option for current result
  const resultOption = result
    ? READING_OPTIONS.find((o) => o.type === result.type)
    : null;

  // ─── Result View ─────────────────────────────
  if (result && resultOption) {
    return (
      <PageContainer>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
          </div>

          {/* Result Card */}
          <Card className={`border ${resultOption.gradientBorder} overflow-hidden`}>
            <div className={`bg-gradient-to-br ${resultOption.gradient} p-6`}>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">{resultOption.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold">{result.typeLabel}</h2>
                  <p className="text-xs text-muted-foreground">{resultOption.desc}</p>
                </div>
              </div>
            </div>
            <CardContent className="p-5 space-y-4">
              {/* Portrait Text */}
              <div className="text-sm leading-relaxed whitespace-pre-line">
                {result.portrait}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {result.element && (
                  <Badge variant="outline" className={resultOption.badgeClass}>
                    {result.element}
                  </Badge>
                )}
                {result.dayMaster && (
                  <Badge variant="outline" className={resultOption.badgeClass}>
                    日主 · {result.dayMaster}
                  </Badge>
                )}
              </div>

              {/* Disclaimer */}
              {result.note && (
                <p className="text-xs text-muted-foreground/70 border-t border-border/50 pt-3">
                  {result.note}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  再来一次
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    toast({ title: "分享功能即将上线", description: "敬请期待" });
                  }}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  分享
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // ─── Selection View ──────────────────────────
  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <h1 className="text-xl font-bold">AI 灵魂画像</h1>
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-sm text-muted-foreground">
            以命理为笔，AI为墨，绘出你看不见的灵魂面貌
          </p>
        </div>

        {/* Reading Cards */}
        <div className="space-y-4">
          {READING_OPTIONS.map((option) => (
            <Card
              key={option.type}
              className={`border ${option.gradientBorder} cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]`}
              onClick={() => setConfirmType(option.type)}
            >
              <div className={`bg-gradient-to-br ${option.gradient}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{option.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg">{option.label}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {option.desc}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs border-border/50">
                      5 积分
                    </Badge>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>

        {/* Confirm Dialog */}
        {confirmType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
            <Card className="w-full max-w-sm border-border animate-in fade-in zoom-in-95 duration-200">
              <CardContent className="p-6 space-y-4 text-center">
                <span className="text-4xl block">
                  {READING_OPTIONS.find((o) => o.type === confirmType)?.emoji}
                </span>
                <h3 className="text-lg font-bold">
                  {READING_OPTIONS.find((o) => o.type === confirmType)?.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  本次解读将消耗 <span className="text-primary font-semibold">5 积分</span>
                </p>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmType(null)}
                    disabled={portraitMutation.isPending}
                  >
                    取消
                  </Button>
                  <Button
                    className="flex-1 gap-1.5"
                    onClick={handleConfirm}
                    disabled={portraitMutation.isPending}
                  >
                    {portraitMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        确认解读
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
