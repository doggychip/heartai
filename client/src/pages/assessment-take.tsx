import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

interface QuestionData {
  id: number;
  text: string;
  options: string[];
}

interface AssessmentDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  questionCount: number;
  estimatedMinutes: number;
  questions: QuestionData[];
}

export default function AssessmentTakePage() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [started, setStarted] = useState(false);

  const { data: assessment, isLoading, error } = useQuery<AssessmentDetail>({
    queryKey: ["/api/assessments", params.slug],
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { assessmentId: string; answers: number[] }) => {
      const res = await apiRequest("POST", "/api/assessments/submit", data);
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessment-results"] });
      navigate(`/assessment-results/${result.id}`);
    },
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

  if (error || !assessment) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="assessment-error">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-destructive" />
          <p className="text-sm text-muted-foreground">测评不存在或加载失败</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/assessments")}>
            返回测评列表
          </Button>
        </div>
      </div>
    );
  }

  // Initialize answers array once
  if (answers.length === 0 && assessment.questions.length > 0) {
    setAnswers(new Array(assessment.questions.length).fill(null));
    return null;
  }

  // Intro screen
  if (!started) {
    return (
      <div className="flex-1 overflow-y-auto" data-testid="assessment-intro">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 -ml-2 text-muted-foreground"
            onClick={() => navigate("/assessments")}
            data-testid="button-back-assessments"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>

          <Card className="p-6 sm:p-8 text-center">
            <div className="text-5xl mb-4">{assessment.icon}</div>
            <h1 className="text-xl font-semibold mb-2">{assessment.name}</h1>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {assessment.description}
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mb-8">
              <span>共 {assessment.questionCount} 题</span>
              <span>·</span>
              <span>约 {assessment.estimatedMinutes} 分钟</span>
            </div>
            <Button size="lg" onClick={() => setStarted(true)} data-testid="button-start-assessment">
              开始测评
            </Button>
            <p className="text-xs text-muted-foreground mt-6">
              请根据你<span className="font-medium">最近一周</span>的实际感受作答，每题只有一个选项，没有对错之分。
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const question = assessment.questions[currentQ];
  const progress = ((currentQ + 1) / assessment.questions.length) * 100;
  const allAnswered = answers.every((a) => a !== null);

  const selectAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = optionIndex;
    setAnswers(newAnswers);

    // Auto-advance after a short delay
    if (currentQ < assessment.questions.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 300);
    }
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    submitMutation.mutate({
      assessmentId: assessment.id,
      answers: answers as number[],
    });
  };

  return (
    <div className="flex-1 overflow-y-auto" data-testid="assessment-take">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{assessment.name}</span>
            <span>
              {currentQ + 1} / {assessment.questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" data-testid="progress-assessment" />
        </div>

        {/* Question */}
        <Card className="p-6 mb-6" data-testid={`card-question-${currentQ}`}>
          <p className="text-sm font-medium mb-5 leading-relaxed">
            <span className="text-primary mr-2">{currentQ + 1}.</span>
            {question.text}
          </p>

          <div className="space-y-2.5">
            {question.options.map((option, oi) => {
              const isSelected = answers[currentQ] === oi;
              return (
                <button
                  key={oi}
                  onClick={() => selectAnswer(oi)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all border ${
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-border bg-card hover:border-primary/30 hover:bg-accent/50 text-muted-foreground"
                  }`}
                  data-testid={`button-option-${currentQ}-${oi}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
            disabled={currentQ === 0}
            data-testid="button-prev-question"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            上一题
          </Button>

          {currentQ === assessment.questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || submitMutation.isPending}
              data-testid="button-submit-assessment"
            >
              {submitMutation.isPending ? (
                "计算中..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  提交测评
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentQ(Math.min(assessment.questions.length - 1, currentQ + 1))}
              data-testid="button-next-question"
            >
              下一题
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Quick nav dots */}
        <div className="flex flex-wrap gap-1.5 justify-center mt-8" data-testid="question-dots">
          {assessment.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-6 h-6 rounded-full text-xs transition-all ${
                i === currentQ
                  ? "bg-primary text-primary-foreground font-medium"
                  : answers[i] !== null
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
              data-testid={`dot-question-${i}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
