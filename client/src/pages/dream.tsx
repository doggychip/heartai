import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Moon, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const DREAM_PROMPTS = [
  "我梦见自己在飞...",
  "我梦见了一片大海...",
  "我梦见考试忘带笔...",
  "我梦见了已故的亲人...",
  "我梦见蛇缠绕在身上...",
  "我梦见自己掉牙了...",
];

export default function DreamPage() {
  const { toast } = useToast();
  const [dream, setDream] = useState("");
  const [result, setResult] = useState<{ dream: string; interpretation: string } | null>(null);

  const interpretMutation = useMutation({
    mutationFn: async (dreamText: string) => {
      const res = await apiRequest("POST", "/api/dream/interpret", { dream: dreamText });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: () => {
      toast({ title: "解析失败", description: "请稍后重试", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!dream.trim() || interpretMutation.isPending) return;
    interpretMutation.mutate(dream.trim());
  };

  const handleReset = () => {
    setResult(null);
    setDream("");
  };

  // ─── Result View ─────────────────────────────
  if (result) {
    return (
      <div className="flex-1 overflow-y-auto" data-testid="dream-result">
        <div className="px-4 py-5">
          <PageHeader
            icon={Moon}
            iconClassName="text-indigo-400"
            title="梦境解析"
            description=""
            actions={
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                重新解梦
              </Button>
            }
          />
        </div>

        <div className="px-4 pb-6 space-y-4">
          {/* Original dream */}
          <Card className="border-border bg-indigo-500/5">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-indigo-400 mb-1.5">你的梦境</p>
              <p className="text-sm">{result.dream}</p>
            </CardContent>
          </Card>

          {/* Interpretation */}
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">解析结果</h2>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                {result.interpretation}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Input View ──────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto" data-testid="dream-page">
      <div className="px-4 py-5">
        <PageHeader
          icon={Moon}
          iconClassName="text-indigo-400"
          title="梦境解析"
          description="融合周公解梦、命理学与心理学，为你解读梦境"
        />
      </div>

      <div className="px-4 pb-6 space-y-4">
        {/* Dream input */}
        <Card className="border-border">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">描述你的梦境</p>
            <Textarea
              value={dream}
              onChange={(e) => setDream(e.target.value)}
              placeholder="尽量详细地描述你记得的梦境内容..."
              className="min-h-[120px] resize-none text-sm"
              data-testid="input-dream"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {dream.length}/1000 字
              </p>
              <Button
                onClick={handleSubmit}
                disabled={dream.trim().length < 2 || interpretMutation.isPending}
                className="gap-1.5"
                data-testid="button-interpret"
              >
                {interpretMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    开始解梦
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick prompts */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">常见梦境</p>
          <div className="flex flex-wrap gap-2">
            {DREAM_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setDream(prompt)}
                data-testid={`dream-prompt-${prompt.slice(0, 4)}`}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>

        {/* Info card */}
        <Card className="border-border bg-card/50">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-medium">关于梦境解析</h3>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">🌙</span>
                <span>周公解梦: 古老的中国梦境解读传统</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">🔮</span>
                <span>命理关联: 结合你的五行命格分析梦境含义</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">🧠</span>
                <span>心理洞察: 现代心理学视角解读潜意识</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✨</span>
                <span>开运建议: 基于梦境给出行动指引</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
