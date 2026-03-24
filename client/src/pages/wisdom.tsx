import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  RotateCcw,
  Lightbulb,
  MessageCircle,
  Compass,
  Palette,
  Hash,
  MapPin,
  ChevronRight,
} from "lucide-react";

interface WisdomResult {
  question: string;
  title: string;
  answer: string;
  keyInsight: string;
  actionTips: string[];
  luckyElement: { color: string; number: number; direction: string };
  relatedTopics: string[];
}

const ZODIAC_SIGNS = [
  "白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座",
  "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座",
];

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP",
];

export default function WisdomPage() {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [zodiacSign, setZodiacSign] = useState("");
  const [mbtiType, setMbtiType] = useState("");
  const [result, setResult] = useState<WisdomResult | null>(null);

  const hotQQuery = useQuery<{ emoji: string; q: string }[]>({
    queryKey: ["/api/wisdom/hot-questions"],
  });

  const mutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", "/api/wisdom/ask", {
        question: q,
        zodiacSign: zodiacSign || undefined,
        mbtiType: mbtiType || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
    onError: (err: Error) =>
      toast({ title: "提问失败", description: err.message, variant: "destructive" }),
  });

  const askQuestion = (q: string) => {
    setQuestion(q);
    mutation.mutate(q);
  };

  const restart = () => {
    setResult(null);
    setQuestion("");
  };

  // ─── Result View ─────
  if (result) {
    return (
      <div className="flex-1 overflow-y-auto" data-testid="wisdom-result-page">
        <PageContainer className="space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">智慧指引</h1>
            <Button variant="outline" size="sm" onClick={restart} data-testid="button-wisdom-restart">
              <RotateCcw className="w-4 h-4 mr-1" /> 再问一个
            </Button>
          </div>

          {/* Question echo */}
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">你的问题</p>
            <p className="text-sm font-medium mt-1">{result.question}</p>
          </div>

          {/* Key Insight Hero */}
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <CardContent className="py-6 text-center">
              <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h2 className="text-lg font-bold">{result.title}</h2>
              <p className="text-sm text-muted-foreground mt-2 italic">「{result.keyInsight}」</p>
            </CardContent>
          </Card>

          {/* Answer */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" /> 详细解答
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{result.answer}</p>
            </CardContent>
          </Card>

          {/* Action Tips */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" /> 行动建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.actionTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                    </div>
                    <p className="text-sm text-foreground/80">{tip}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lucky Elements */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="py-3 text-center">
                <Palette className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">幸运色</p>
                <p className="text-sm font-bold">{result.luckyElement.color}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 text-center">
                <Hash className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">幸运数字</p>
                <p className="text-sm font-bold">{result.luckyElement.number}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 text-center">
                <MapPin className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">幸运方位</p>
                <p className="text-sm font-bold">{result.luckyElement.direction}</p>
              </CardContent>
            </Card>
          </div>

          {/* Related Topics */}
          {result.relatedTopics.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">相关话题:</span>
              {result.relatedTopics.map((topic, i) => (
                <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-accent"
                  onClick={() => askQuestion(topic)}>
                  {topic}
                </Badge>
              ))}
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground pb-4">
            * 以上内容融合东方智慧与现代心理学，仅供娱乐和自我探索参考
          </p>
        </PageContainer>
      </div>
    );
  }

  // ─── Input Form ─────
  return (
    <div className="flex-1 overflow-y-auto" data-testid="wisdom-page">
      <PageContainer className="space-y-6">
        <PageHeader icon={Sparkles} title="智慧问答" description="融合星座·MBTI·命理，AI为你个性化解答" iconClassName="text-amber-500" />

        {/* Personal context for personalized answers */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">我的星座 (选填)</label>
            <Select value={zodiacSign} onValueChange={setZodiacSign}>
              <SelectTrigger data-testid="select-wisdom-zodiac" className="h-9">
                <SelectValue placeholder="选择星座" />
              </SelectTrigger>
              <SelectContent>
                {ZODIAC_SIGNS.map((z) => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">我的MBTI (选填)</label>
            <Select value={mbtiType} onValueChange={setMbtiType}>
              <SelectTrigger data-testid="select-wisdom-mbti" className="h-9">
                <SelectValue placeholder="选择MBTI" />
              </SelectTrigger>
              <SelectContent>
                {MBTI_TYPES.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Hot Questions */}
        {hotQQuery.data && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-muted-foreground" />
              热门问题
            </p>
            <div className="grid gap-2">
              {hotQQuery.data.map((item, i) => (
                <button
                  key={i}
                  onClick={() => askQuestion(item.q)}
                  disabled={mutation.isPending}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/50 transition-all text-left group"
                  data-testid={`button-hot-q-${i}`}
                >
                  <span className="text-lg flex-shrink-0">{item.emoji}</span>
                  <span className="text-sm flex-1">{item.q}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom question */}
        <Card>
          <CardContent className="pt-5 space-y-3">
            <label className="text-sm font-medium block">自由提问</label>
            <Textarea
              placeholder="想问什么都可以：运势、感情、事业、人生选择..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="resize-none"
              data-testid="input-wisdom-question"
            />
            <Button
              className="w-full"
              disabled={!question.trim() || mutation.isPending}
              onClick={() => mutation.mutate(question)}
              data-testid="button-wisdom-submit"
            >
              {mutation.isPending ? (
                <><Sparkles className="w-4 h-4 mr-2 animate-spin" /> 智慧正在浮现...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> 获取智慧指引</>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          * 填写星座/MBTI可获得更个性化的解答，仅供娱乐参考
        </p>
      </PageContainer>
    </div>
  );
}
