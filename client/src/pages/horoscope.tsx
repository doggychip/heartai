import { PageContainer } from "@/components/PageContainer";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  RotateCcw,
  Heart,
  Briefcase,
  Wallet,
  Activity,
  Calendar,
  Palette,
  Hash,
  Star,
  TrendingUp,
} from "lucide-react";

interface HoroscopeResult {
  sign: string;
  dateRange: string;
  scores: {
    overall: number;
    love: number;
    career: number;
    wealth: number;
    health: number;
  };
  lucky: {
    day: string;
    color: string;
    number: number;
  };
  overallAdvice: string;
  loveAdvice: string;
  careerAdvice: string;
  wealthAdvice: string;
  healthAdvice: string;
}

const ZODIAC_SIGNS = [
  { value: "白羊座", emoji: "♈", dates: "3/21-4/19", element: "火" },
  { value: "金牛座", emoji: "♉", dates: "4/20-5/20", element: "土" },
  { value: "双子座", emoji: "♊", dates: "5/21-6/21", element: "风" },
  { value: "巨蟹座", emoji: "♋", dates: "6/22-7/22", element: "水" },
  { value: "狮子座", emoji: "♌", dates: "7/23-8/22", element: "火" },
  { value: "处女座", emoji: "♍", dates: "8/23-9/22", element: "土" },
  { value: "天秤座", emoji: "♎", dates: "9/23-10/23", element: "风" },
  { value: "天蝎座", emoji: "♏", dates: "10/24-11/22", element: "水" },
  { value: "射手座", emoji: "♐", dates: "11/23-12/21", element: "火" },
  { value: "摩羯座", emoji: "♑", dates: "12/22-1/19", element: "土" },
  { value: "水瓶座", emoji: "♒", dates: "1/20-2/18", element: "风" },
  { value: "双鱼座", emoji: "♓", dates: "2/19-3/20", element: "水" },
];

function ScoreBar({ label, score, icon: Icon, color }: { label: string; score: number; icon: any; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
      <span className="text-sm w-10 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${
            score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-medium w-8 text-right">{score}</span>
    </div>
  );
}

export default function HoroscopePage() {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const [sign, setSign] = useState("");
  const [result, setResult] = useState<HoroscopeResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/horoscope/weekly", { sign });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
    onError: (err: Error) =>
      toast({ title: "获取失败", description: err.message, variant: "destructive" }),
  });

  const restart = () => {
    setResult(null);
    setSign("");
  };

  const signInfo = ZODIAC_SIGNS.find((z) => z.value === (result?.sign || sign));

  // ─── Result View ─────
  if (result) {
    return (
      <div className="flex-1 overflow-y-auto" data-testid="horoscope-result-page">
        <PageContainer className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">星座运势</h1>
            <Button variant="outline" size="sm" onClick={restart} data-testid="button-horoscope-restart">
              <RotateCcw className="w-4 h-4 mr-1" /> 换个星座
            </Button>
          </div>

          {/* Sign Hero */}
          <Card className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border-violet-500/20">
            <CardContent className="py-6 text-center">
              <span className="text-5xl">{signInfo?.emoji}</span>
              <h2 className="text-lg font-bold mt-2">{result.sign}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                本周运势 · {result.dateRange}
              </p>
              <div className="flex items-center justify-center gap-1 mt-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(result.scores.overall / 20)
                        ? "text-amber-400 fill-amber-400"
                        : "text-muted/40"
                    }`}
                  />
                ))}
                <span className="text-sm font-bold ml-2">{result.scores.overall}分</span>
              </div>
            </CardContent>
          </Card>

          {/* Score Bars */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> 运势指数
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScoreBar label="综合" score={result.scores.overall} icon={Star} color="text-amber-500" />
              <ScoreBar label="爱情" score={result.scores.love} icon={Heart} color="text-pink-500" />
              <ScoreBar label="事业" score={result.scores.career} icon={Briefcase} color="text-blue-500" />
              <ScoreBar label="财运" score={result.scores.wealth} icon={Wallet} color="text-amber-600" />
              <ScoreBar label="健康" score={result.scores.health} icon={Activity} color="text-green-500" />
            </CardContent>
          </Card>

          {/* Lucky Info */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="py-4 text-center">
                <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">幸运日</p>
                <p className="text-sm font-bold">{result.lucky.day}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <Palette className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">幸运色</p>
                <p className="text-sm font-bold">{result.lucky.color}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <Hash className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">幸运数字</p>
                <p className="text-sm font-bold">{result.lucky.number}</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Advice */}
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" /> 总运势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground/80">{result.overallAdvice}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" /> 感情运势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground/80">{result.loveAdvice}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-500" /> 事业运势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground/80">{result.careerAdvice}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-600" /> 财运
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground/80">{result.wealthAdvice}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-500" /> 健康运势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground/80">{result.healthAdvice}</p>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-center text-muted-foreground pb-4">
            * 星座运势仅供娱乐参考，不构成任何建议
          </p>
        </PageContainer>
      </div>
    );
  }

  // ─── Sign Selection ─────
  return (
    <div className="flex-1 overflow-y-auto" data-testid="horoscope-page">
      <PageContainer className="space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-violet-500" />
            星座运势
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            选择你的星座，查看本周详细运势
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {ZODIAC_SIGNS.map((z) => (
            <button
              key={z.value}
              onClick={() => setSign(z.value)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                sign === z.value
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border hover:border-primary/30"
              }`}
              data-testid={`button-sign-${z.value}`}
            >
              <span className="text-2xl">{z.emoji}</span>
              <p className="text-xs font-medium mt-1">{z.value}</p>
              <p className="text-[10px] text-muted-foreground">{z.dates}</p>
            </button>
          ))}
        </div>

        {sign && (
          <Button
            className="w-full"
            disabled={mutation.isPending}
            onClick={() => {
              if (isGuest || !user) {
                toast({ title: "请先登录", description: "注册或登录后即可查看星座运势", variant: "destructive" });
                setTimeout(() => { window.location.href = "/auth"; }, 1200);
                return;
              }
              mutation.mutate();
            }}
            data-testid="button-horoscope-submit"
          >
            {mutation.isPending ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" /> 正在解读星象...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> 查看 {sign} 本周运势
              </>
            )}
          </Button>
        )}

        <p className="text-xs text-center text-muted-foreground">
          * AI 星座运势解读，每周更新，仅供娱乐参考
        </p>
      </PageContainer>
    </div>
  );
}
