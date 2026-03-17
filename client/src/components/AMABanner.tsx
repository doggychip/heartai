import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MessageCircle, Send, Clock } from "lucide-react";

interface AMASession {
  id: string;
  avatarId: string;
  avatarName: string;
  topic: string;
  description: string;
  questionCount: number;
  createdAt: string;
  closesAt: string | null;
}

export default function AMABanner() {
  const { toast } = useToast();
  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState("");

  const { data } = useQuery<{ session: AMASession | null }>({
    queryKey: ["/api/ama/active"],
    staleTime: 5 * 60 * 1000,
  });

  const askMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ama/ask", { question: question.trim() });
      return res.json();
    },
    onSuccess: () => {
      setQuestion("");
      setAskOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/ama/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      toast({ title: "提问成功", description: "大师正在回复你的问题..." });
    },
    onError: () => {
      toast({ title: "提问失败", description: "请稍后重试", variant: "destructive" });
    },
  });

  const session = data?.session;
  if (!session) return null;

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/25 dark:to-purple-900/25 mb-4">
      <CardContent className="p-3.5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm font-semibold">AMA 大师开讲</span>
              <Badge variant="secondary" className="text-[9px] h-4 bg-green-500/15 text-green-600 border-0">
                进行中
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">{session.topic}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground">{session.avatarName} 主持</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MessageCircle className="w-3 h-3" /> {session.questionCount} 问题
              </span>
            </div>
          </div>

          <Dialog open={askOpen} onOpenChange={setAskOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-xs">
                提问
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">向 {session.avatarName} 提问</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">{session.topic}</p>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="输入你想问的问题..."
                className="min-h-[100px] resize-none text-sm mt-2"
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{question.length}/500</span>
                <Button
                  disabled={!question.trim() || askMutation.isPending}
                  onClick={() => askMutation.mutate()}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600"
                >
                  {askMutation.isPending ? "提交中..." : (
                    <><Send className="w-3.5 h-3.5 mr-1" />提交问题</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
