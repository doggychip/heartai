import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Activity,
  Heart,
} from "lucide-react";

interface EmotionStat {
  name: string;
  count: number;
  totalScore: number;
  avgScore: number;
  nameZh: string;
  emoji: string;
}

interface ValencePoint {
  createdAt: string;
  valence: number;
  arousal: number;
  primary: string;
}

interface EmotionStatsResponse {
  totalAnalyses: number;
  topEmotions: EmotionStat[];
  valenceTrend: ValencePoint[];
  avgValence: number;
}

// Simple inline sparkline
function Sparkline({ points, width = 200, height = 40 }: { points: number[]; width?: number; height?: number }) {
  if (points.length < 2) return null;
  
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);

  const path = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * (height - 8) - 4;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  // Fill area
  const fillPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#sparkGrad)" />
      <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmotionFrequencyBar({ stat, maxCount }: { stat: EmotionStat; maxCount: number }) {
  const pct = (stat.count / maxCount) * 100;
  return (
    <div className="flex items-center gap-3" data-testid={`stat-${stat.name}`}>
      <span className="text-base">{stat.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium">{stat.nameZh}</span>
          <span className="text-[10px] text-muted-foreground">{stat.count}次 · 均强{Math.round(stat.avgScore * 100)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/60 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function EmotionInsightsPage() {
  const { data, isLoading } = useQuery<EmotionStatsResponse>({
    queryKey: ["/api/emotion-stats"],
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const stats = data;
  const hasData = stats && stats.totalAnalyses > 0;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5" data-testid="emotion-insights-page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">情感洞察</h1>
          <p className="text-xs text-muted-foreground">基于深度情感分析引擎的多维度情绪分析</p>
        </div>
      </div>

      {!hasData ? (
        <Card className="p-8 text-center">
          <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">暂无情感数据</p>
          <p className="text-xs text-muted-foreground/60">与 HeartAI 对话后，这里会显示你的情感分析报告</p>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalAnalyses}</div>
              <div className="text-[10px] text-muted-foreground mt-1">分析次数</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold flex items-center justify-center gap-1">
                {stats.avgValence > 0.1 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : stats.avgValence < -0.1 ? (
                  <TrendingDown className="w-5 h-5 text-orange-500" />
                ) : (
                  <Minus className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {stats.avgValence > 0.1 ? "整体偏积极" : stats.avgValence < -0.1 ? "整体偏消极" : "整体中性"}
              </div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl">{stats.topEmotions[0]?.emoji || "😌"}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{stats.topEmotions[0]?.nameZh || "平静"}</div>
            </Card>
          </div>

          {/* Valence trend */}
          {stats.valenceTrend.length >= 2 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">情绪效价趋势</span>
                <Badge variant="outline" className="text-[10px]">最近 {stats.valenceTrend.length} 次对话</Badge>
              </div>
              <div className="h-12">
                <Sparkline
                  points={stats.valenceTrend.map(v => v.valence)}
                  width={300}
                  height={48}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>负面 ←</span>
                <span>→ 正面</span>
              </div>
            </Card>
          )}

          {/* Emotion frequency */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">情绪频次排行</span>
            </div>
            <div className="space-y-3">
              {stats.topEmotions.map((stat) => (
                <EmotionFrequencyBar
                  key={stat.name}
                  stat={stat}
                  maxCount={stats.topEmotions[0]?.count || 1}
                />
              ))}
            </div>
          </Card>

          {/* Recent emotion timeline */}
          {stats.valenceTrend.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">近期情绪</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stats.valenceTrend.slice(-15).map((v, i) => (
                  <Badge
                    key={i}
                    variant={v.valence > 0.1 ? "default" : v.valence < -0.1 ? "destructive" : "secondary"}
                    className="text-[10px] font-normal"
                  >
                    {v.primary}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
