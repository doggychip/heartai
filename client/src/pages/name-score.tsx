import { PageContainer } from "@/components/PageContainer";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  RotateCcw,
  Flame,
  Droplets,
  Mountain,
  Leaf,
  Wind,
  PenLine,
  ArrowRight,
  Star,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────

interface LuckInfo {
  level: string;
  label: string;
}

interface GeInfo {
  value: number;
  luck: LuckInfo;
  meaning: string;
  element: string;
}

interface WuGe {
  tianGe: GeInfo;
  renGe: GeInfo;
  diGe: GeInfo;
  waiGe: GeInfo;
  zongGe: GeInfo;
}

interface SanCai {
  elements: string;
  tianCai: string;
  renCai: string;
  diCai: string;
  score: number;
  level: string;
}

interface NameScoreResult {
  name: string;
  surname: string;
  givenName: string;
  surnameStrokes: number[];
  givenStrokes: number[];
  wuGe: WuGe;
  sanCai: SanCai;
  totalScore: number;
  rating: string;
}

// ─── Constants ─────────────────────────────────────────

const ELEMENT_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  "金": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", icon: Mountain },
  "木": { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", icon: Leaf },
  "水": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", icon: Droplets },
  "火": { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", icon: Flame },
  "土": { bg: "bg-yellow-700/10", text: "text-yellow-700 dark:text-yellow-500", icon: Wind },
};

const LUCK_STYLES: Record<string, { bg: string; text: string }> = {
  "吉": { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400" },
  "半吉": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  "凶": { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400" },
};

const WU_GE_LABELS: { key: keyof WuGe; label: string; desc: string }[] = [
  { key: "tianGe", label: "天格", desc: "先天运势" },
  { key: "renGe", label: "人格", desc: "主运势" },
  { key: "diGe", label: "地格", desc: "前运势" },
  { key: "waiGe", label: "外格", desc: "副运势" },
  { key: "zongGe", label: "总格", desc: "后运势" },
];

// ─── Score Ring ────────────────────────────────────────

function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 90 ? "text-green-500" :
    score >= 70 ? "text-blue-500" :
    score >= 60 ? "text-amber-500" :
    "text-red-500";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor"
          className="text-muted/20" strokeWidth={5}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor"
          className={color}
          strokeWidth={5} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className={`absolute inset-0 flex flex-col items-center justify-center ${color}`}>
        <span className="text-2xl font-bold">{score}</span>
        <span className="text-[10px] text-muted-foreground">分</span>
      </div>
    </div>
  );
}

// ─── Page Component ────────────────────────────────────

export default function NameScorePage() {
  const { toast } = useToast();
  const [surname, setSurname] = useState("");
  const [givenName, setGivenName] = useState("");
  const [result, setResult] = useState<NameScoreResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/culture/name-score", {
        surname,
        givenName,
      });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
    onError: (err: Error) =>
      toast({ title: "测算失败", description: err.message, variant: "destructive" }),
  });

  const restart = () => {
    setResult(null);
  };

  // ─── Result View ─────
  if (result) {
    const scoreColor =
      result.totalScore >= 90 ? "text-green-500" :
      result.totalScore >= 70 ? "text-blue-500" :
      result.totalScore >= 60 ? "text-amber-500" :
      "text-red-500";

    return (
      <div className="flex-1 overflow-y-auto" data-testid="name-score-result-page">
        <PageContainer className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              姓名测分结果
            </h1>
            <Button variant="outline" size="sm" onClick={restart} data-testid="button-name-score-restart">
              <RotateCcw className="w-4 h-4 mr-1" /> 重新测算
            </Button>
          </div>

          {/* Total Score Hero */}
          <Card className="bg-gradient-to-br from-indigo-500/10 to-amber-500/10 border-indigo-500/20">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">「{result.name}」综合评分</p>
                <ScoreRing score={result.totalScore} size={120} />
                <Badge
                  variant="secondary"
                  className={`text-sm px-4 py-1 ${
                    result.totalScore >= 90 ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" :
                    result.totalScore >= 70 ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" :
                    result.totalScore >= 60 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
                    "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  }`}
                >
                  {result.rating}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 五格分析 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" /> 五格分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {WU_GE_LABELS.map(({ key, label, desc }) => {
                  const ge = result.wuGe[key];
                  const elStyle = ELEMENT_STYLES[ge.element] || ELEMENT_STYLES["金"];
                  const luckStyle = LUCK_STYLES[ge.luck.label] || LUCK_STYLES["凶"];
                  const ElIcon = elStyle.icon;

                  return (
                    <div
                      key={key}
                      className="flex items-start gap-3 p-3 rounded-xl bg-card border"
                      data-testid={`card-wuge-${key}`}
                    >
                      <div className={`w-10 h-10 rounded-lg ${elStyle.bg} flex items-center justify-center flex-shrink-0`}>
                        <ElIcon className={`w-5 h-5 ${elStyle.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">{label}</span>
                          <span className="text-sm font-bold text-primary">{ge.value}</span>
                          <Badge variant="outline" className={`text-[10px] ${elStyle.bg} ${elStyle.text} border-0`}>
                            {ge.element}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] ${luckStyle.bg} ${luckStyle.text} border-0`}>
                            {ge.luck.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{ge.meaning}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 三才配置 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" /> 三才配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                {[
                  { label: "天才", element: result.sanCai.tianCai },
                  { label: "人才", element: result.sanCai.renCai },
                  { label: "地才", element: result.sanCai.diCai },
                ].map((item, i, arr) => {
                  const elStyle = ELEMENT_STYLES[item.element] || ELEMENT_STYLES["金"];
                  const ElIcon = elStyle.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-12 h-12 rounded-xl ${elStyle.bg} flex items-center justify-center`}>
                          <ElIcon className={`w-6 h-6 ${elStyle.text}`} />
                        </div>
                        <span className="text-xs font-medium">{item.label}</span>
                        <Badge variant="outline" className={`text-[10px] ${elStyle.bg} ${elStyle.text} border-0`}>
                          {item.element}
                        </Badge>
                      </div>
                      {i < arr.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground mx-1" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-3">
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 px-3 py-1">
                  配置：{result.sanCai.elements}
                </Badge>
                <Badge variant="secondary" className={`px-3 py-1 ${
                  result.sanCai.level === "吉"
                    ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                    : result.sanCai.level === "半吉"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                }`}>
                  {result.sanCai.level} · {result.sanCai.score}分
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 笔画详情 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PenLine className="w-4 h-4 text-indigo-500" /> 笔画详情
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {result.surname.split("").map((char, i) => (
                  <div key={`s-${i}`} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-primary/5 border border-primary/10 min-w-[60px]">
                    <span className="text-lg font-bold text-primary">{char}</span>
                    <span className="text-[10px] text-muted-foreground">姓</span>
                    <Badge variant="outline" className="text-[10px]">
                      {result.surnameStrokes[i]}画
                    </Badge>
                  </div>
                ))}
                {result.givenName.split("").map((char, i) => (
                  <div key={`g-${i}`} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 min-w-[60px]">
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{char}</span>
                    <span className="text-[10px] text-muted-foreground">名</span>
                    <Badge variant="outline" className="text-[10px]">
                      {result.givenStrokes[i]}画
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground pb-4">
            * 以上内容基于传统五格剖象法，仅供娱乐和文化探索参考
          </p>
        </PageContainer>
      </div>
    );
  }

  // ─── Input Form ─────
  return (
    <div className="flex-1 overflow-y-auto" data-testid="name-score-page">
      <PageContainer className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            姓名测分
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            五格三才姓名分析
          </p>
        </div>

        {/* Form */}
        <Card data-testid="card-name-score-form">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground mb-1 block">姓氏</label>
              <Input
                placeholder="请输入姓氏"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                maxLength={2}
                data-testid="input-surname"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground mb-1 block">名字</label>
              <Input
                placeholder="请输入名字"
                value={givenName}
                onChange={(e) => setGivenName(e.target.value)}
                maxLength={4}
                data-testid="input-given-name"
              />
            </div>
            <Button
              className="w-full"
              disabled={!surname || !givenName || mutation.isPending}
              onClick={() => mutation.mutate()}
              data-testid="button-name-score-submit"
            >
              {mutation.isPending ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  正在测算...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  开始测算
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          * 基于传统五格剖象法与康熙字典笔画，仅供娱乐参考
        </p>
      </PageContainer>
    </div>
  );
}
