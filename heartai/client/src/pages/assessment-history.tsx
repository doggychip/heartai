import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ClipboardList, Clock } from "lucide-react";
import type { AssessmentResult, Assessment } from "@shared/schema";

type AssessmentListItem = Pick<
  Assessment,
  "id" | "slug" | "name" | "icon" | "category" | "description" | "questionCount" | "estimatedMinutes"
>;

export default function AssessmentHistoryPage() {
  const { data: results = [], isLoading } = useQuery<AssessmentResult[]>({
    queryKey: ["/api/assessment-results"],
  });

  const { data: assessments = [] } = useQuery<AssessmentListItem[]>({
    queryKey: ["/api/assessments"],
  });

  const assessmentMap = new Map(assessments.map((a) => [a.id, a]));

  return (
    <div className="flex-1 overflow-y-auto" data-testid="assessment-history-page">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/assessments">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回测评列表
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            测评历史
          </h1>
          <p className="text-sm text-muted-foreground mt-1">查看你过去完成的所有测评记录</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground" data-testid="history-empty">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="mb-4">还没有完成过测评</p>
            <Link href="/assessments">
              <Button size="sm">去做测评</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3" data-testid="history-list">
            {[...results].reverse().map((r) => {
              const a = assessmentMap.get(r.assessmentId);
              return (
                <Link key={r.id} href={`/assessment-results/${r.id}`}>
                  <Card className="p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/20" data-testid={`card-history-${r.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl flex-shrink-0">{a?.icon || "📊"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm truncate">{a?.name || "测评"}</span>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {r.resultSummary}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(r.createdAt).toLocaleDateString("zh-CN", {
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {r.totalScore > 0 && (
                            <span className="ml-2">得分：{r.totalScore}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
