import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { X, Sparkles, Lightbulb } from "lucide-react";

interface ProactiveData {
  id: string;
  type: string;
  message: string;
  avatarId: string;
  avatarName: string;
  tip?: string;
  createdAt: string;
  isRead: boolean;
}

export default function ProactiveMessageCard() {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<ProactiveData>({
    queryKey: ["/api/proactive/daily"],
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/proactive/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proactive/daily"] });
    },
  });

  // Fade-in animation
  useEffect(() => {
    if (data && !dismissed) {
      const t = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(t);
    }
  }, [data, dismissed]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => setDismissed(true), 300);
    if (data?.id && !data.isRead) {
      markRead.mutate(data.id);
    }
  };

  if (dismissed) return null;

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-500/5 to-orange-500/5 dark:from-amber-900/15 dark:to-orange-900/15">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card
      className={`border-0 shadow-sm bg-gradient-to-r from-amber-500/5 to-orange-500/5 dark:from-amber-900/15 dark:to-orange-900/15 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {data.avatarName} · 每日问候
              </span>
              <button
                onClick={handleDismiss}
                className="p-0.5 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground/50 hover:text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-sm text-foreground/85 leading-relaxed">
              {data.message}
            </p>

            {data.tip && (
              <div className="mt-2 flex items-start gap-1.5 bg-amber-500/8 dark:bg-amber-500/10 rounded-lg px-2.5 py-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-[11px] text-foreground/70 leading-relaxed">{data.tip}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
