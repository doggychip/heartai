import { PageContainer } from "@/components/PageContainer";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Gift,
  Copy,
  Check,
  Users,
  Coins,
  Share2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface PremiumStatus {
  tier: string;
  credits: number;
  referralCode: string;
  referralCount: number;
}

export default function ReferralPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<PremiumStatus>({
    queryKey: ["/api/premium/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/premium/status");
      return res.json();
    },
    enabled: !!user,
  });

  const applyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/premium/referral", { code });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "邀请成功！", description: result.message });
        queryClient.invalidateQueries({ queryKey: ["/api/premium/status"] });
        setInputCode("");
      } else {
        toast({ title: "邀请失败", description: result.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "操作失败", description: "请稍后重试", variant: "destructive" });
    },
  });

  const handleCopy = () => {
    if (!data?.referralCode) return;
    const shareText = `🔮 来观星HeartAI，探索你的命运K线图！用我的邀请码 ${data.referralCode} 注册，我们各得5积分！`;
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      toast({ title: "已复制", description: "邀请文案已复制到剪贴板" });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <PageContainer className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <PageContainer className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            邀请好友
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            分享邀请码，双方各获得 5 积分
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardContent className="py-4 text-center">
              <Users className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{data?.referralCount ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">已邀请好友</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-4 text-center">
              <Coins className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{data?.credits ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">当前积分</p>
            </CardContent>
          </Card>
        </div>

        {/* My Referral Code */}
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardContent className="py-5 space-y-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">我的邀请码</p>
              <div className="bg-background border-2 border-dashed border-amber-500/40 rounded-xl py-4 px-6">
                <span className="text-2xl font-mono font-bold tracking-widest text-amber-500">
                  {data?.referralCode || "—"}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                variant="default"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "已复制" : "复制邀请文案"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (navigator.share && data?.referralCode) {
                    navigator.share({
                      title: "观星HeartAI",
                      text: `🔮 来观星HeartAI探索命运！用邀请码 ${data.referralCode} 注册，各得5积分！`,
                    }).catch(() => {});
                  } else {
                    handleCopy();
                  }
                }}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardContent className="py-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              邀请奖励规则
            </h3>
            <div className="space-y-2">
              {[
                { step: "1", text: "分享你的邀请码给好友" },
                { step: "2", text: "好友注册时填写邀请码" },
                { step: "3", text: "双方各获得 5 积分奖励" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <p className="text-sm text-foreground/80">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground">
                积分可用于 AI画像、真人解读等付费功能。邀请越多，积分越多！
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enter someone's code */}
        <Card>
          <CardContent className="py-4 space-y-3">
            <h3 className="text-sm font-semibold">输入邀请码</h3>
            <p className="text-xs text-muted-foreground">
              如果你有好友的邀请码，在这里输入
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="输入邀请码 (如 GX-A3K9)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="font-mono"
                maxLength={10}
              />
              <Button
                onClick={() => inputCode && applyMutation.mutate(inputCode)}
                disabled={!inputCode || applyMutation.isPending}
                className="gap-1 shrink-0"
              >
                <ArrowRight className="w-4 h-4" />
                确认
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CTA to premium */}
        <Link href="/premium">
          <Card className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20 cursor-pointer hover:border-indigo-500/40 transition-colors">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">想要更多积分？</p>
                <p className="text-xs text-muted-foreground">开通会员获取更多权益</p>
              </div>
              <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400">
                查看会员 →
              </Badge>
            </CardContent>
          </Card>
        </Link>
      </PageContainer>
    </div>
  );
}
