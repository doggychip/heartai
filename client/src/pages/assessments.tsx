import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Clock, ChevronRight, ArrowRight } from "lucide-react";
import type { Assessment } from "@shared/schema";

type AssessmentListItem = Pick<
  Assessment,
  "id" | "slug" | "name" | "description" | "category" | "icon" | "questionCount" | "estimatedMinutes"
>;

const CATEGORY_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  professional: { label: "专业量表", variant: "default" },
  personality: { label: "性格测试", variant: "secondary" },
  fun: { label: "趣味测试", variant: "outline" },
};

export default function AssessmentsPage() {
  const { data: assessments = [], isLoading } = useQuery<AssessmentListItem[]>({
    queryKey: ["/api/assessments"],
  });

  return (
    <div className="flex-1 overflow-y-auto" data-testid="assessments-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h1 className="text-lg sm:text-xl font-semibold">心理测评</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            通过科学的心理测评工具，更好地了解自己的情绪和心理状态。
          </p>
        </div>

        {/* Assessment list */}
        {isLoading ? (
          <div className="space-y-4" data-testid="assessments-loading">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : assessments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground" data-testid="assessments-empty">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>暂无可用的测评</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="assessments-list">
            {assessments.map((a) => {
              const cat = CATEGORY_LABELS[a.category] || CATEGORY_LABELS.professional;
              return (
                <Link key={a.id} href={`/assessments/${a.slug}`}>
                  <Card
                    className="p-5 cursor-pointer transition-all hover:shadow-md hover:border-primary/20 group"
                    data-testid={`card-assessment-${a.slug}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-3xl flex-shrink-0 mt-0.5">{a.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="font-semibold text-sm">{a.name}</h2>
                          <Badge variant={cat.variant} className="text-xs">
                            {cat.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5">
                          {a.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ClipboardList className="w-3.5 h-3.5" />
                            {a.questionCount} 题
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            约 {a.estimatedMinutes} 分钟
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-2 group-hover:text-primary transition-colors" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Results link */}
        {assessments.length > 0 && (
          <div className="mt-8 text-center">
            <Link href="/assessment-history">
              <span className="inline-flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer" data-testid="link-assessment-history">
                查看历史测评记录
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
