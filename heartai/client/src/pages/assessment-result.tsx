import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Share2, RotateCcw, ClipboardList, AlertCircle } from "lucide-react";
import type { AssessmentResult, Assessment } from "@shared/schema";

type AssessmentListItem = Pick<
  Assessment,
  "id" | "slug" | "name" | "description" | "category" | "icon" | "questionCount" | "estimatedMinutes"
>;

export default function AssessmentResultPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: result, isLoading, error } = useQuery<AssessmentResult>({
    queryKey: ["/api/assessment-results", params.id],
  });

  const { data: assessments = [] } = useQuery<AssessmentListItem[]>({
    queryKey: ["/api/assessments"],
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="result-error">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-destructive" />
          <p className="text-sm text-muted-foreground">结果不存在或加载失败</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/assessments")}>
            返回测评列表
          </Button>
        </div>
      </div>
    );
  }

  const assessment = assessments.find((a) => a.id === result.assessmentId);
  const isMBTI = result.resultSummary.includes("-") && result.totalScore === 0;

  return (
    <div className="flex-1 overflow-y-auto" data-testid="assessment-result-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 -ml-2 text-muted-foreground"
          onClick={() => navigate("/assessments")}
          data-testid="button-back-assessments"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回测评列表
        </Button>

        {/* Result card */}
        <Card className="p-8 text-center mb-6" data-testid="card-result-summary">
          <div className="text-5xl mb-4">{assessment?.icon || "📊"}</div>
          <h1 className="text-lg font-semibold mb-1">
            {assessment?.name || "测评结果"}
          </h1>
          <p className="text-xs text-muted-foreground mb-6">
            完成时间：{new Date(result.createdAt).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {/* Score display */}
          <div className="inline-flex flex-col items-center mb-6">
            {isMBTI ? (
              <div className="mb-2">
                <div className="text-4xl font-bold text-primary tracking-wider mb-1" data-testid="text-mbti-type">
                  {result.resultSummary.split(" - ")[0]}
                </div>
                <div className="text-sm font-medium text-foreground">
                  {result.resultSummary.split(" - ")[1]}
                </div>
              </div>
            ) : (
              <div className="mb-2">
                <div className="text-4xl font-bold text-primary" data-testid="text-score">
                  {result.totalScore}
                </div>
                <div className="text-xs text-muted-foreground mt-1">总分</div>
              </div>
            )}
            <Badge variant="secondary" className="text-sm px-4 py-1" data-testid="badge-result-summary">
              {result.resultSummary}
            </Badge>
          </div>
        </Card>

        {/* Detail */}
        <Card className="p-6 mb-6" data-testid="card-result-detail">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            详细解读
          </h2>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {result.resultDetail}
          </div>
        </Card>

        {/* Disclaimer */}
        <Card className="p-4 mb-8 bg-primary/5 border-primary/10" data-testid="card-disclaimer">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">免责声明：</span>
            本测评结果仅供参考，不构成任何医学或心理学诊断。如果你感到持续困扰，请咨询专业的心理咨询师或医生。
            紧急求助热线：<span className="font-medium text-primary">400-161-9995</span>
          </p>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          {assessment && (
            <Link href={`/assessments/${assessment.slug}`}>
              <Button variant="outline" size="sm" data-testid="button-retake">
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                重新测试
              </Button>
            </Link>
          )}
          <Link href="/assessments">
            <Button size="sm" data-testid="button-more-assessments">
              更多测评
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
