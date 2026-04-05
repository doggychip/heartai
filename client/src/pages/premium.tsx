import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Crown,
  Sparkles,
  Check,
  X,
  Copy,
  Gift,
  Coins,
  Loader2,
  Star,
  Zap,
  Shield,
  Users,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface TierInfo {
  name: string;
  label: string;
  priceMonthly: { cny: number; usd: number };
  dailyReadings: number;
  fullReports: boolean;
  aiPortraits: boolean;
  humanConsult: boolean;
  merchDiscount: number;
}

interface PremiumStatus {
  tier: string;
  tierInfo: TierInfo;
  credits: number;
  referralCode: string;
  referralCount: number;
  tiers: Record<string, TierInfo>;
}

// ─── Constants ──────────────────────────────────────────────

const TIER_ORDER = ["free", "basic", "pro", "vip"] as const;

const TIER_STYLES: Record<string, { icon: typeof Star; gradient: string; badge: string; border: string }> = {
  free: {
    icon: Star,
    gradient: "from-slate-500/20 to-slate-600/20",
    badge: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    border: "border-slate-700/50",
  },
  basic: {
    icon: Zap,
    gradient: "from-blue-500/20 to-indigo-600/20",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    border: "border-blue-700/50",
  },
  pro: {
    icon: Shield,
    gradient: "from-amber-500/20 to-orange-600/20",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    border: "border-amber-700/50",
  },
  vip: {
    icon: Crown,
    gradient: "from-amber-400/30 via-yellow-500/20 to-orange-500/30",
    badge: "bg-gradient-to-r from-amber-400 to-yellow-500 text-black border-amber-400/50",
    border: "border-amber-500/60",
  },
};

const FEATURE_LABELS: { key: keyof TierInfo; label: string; type: "number" | "boolean" | "discount" }[] = [
  { key: "dailyReadings", label: "每日解读次数", type: "number" },
  { key: "fullReports", label: "完整报告", type: "boolean" },
  { key: "aiPortraits", label: "AI 画像", type: "boolean" },
  { key: "humanConsult", label: "真人咨询", type: "boolean" },
  { key: "merchDiscount", label: "周边折扣", type: "discount" },
];

// ─── Component ──────────────────────────────────────────────

export default function PremiumPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralInput, setReferralInput] = useState("");
  const [creditAmount, setCreditAmount] = useState(10);

  // ── Queries ────────────────────────────────────────────────

  const { data, isLoading } = useQuery<PremiumStatus>({
    queryKey: ["/api/premium/status"],
    enabled: !!user,
  });

  // ── Mutations ──────────────────────────────────────────────

  const subscribeMutation = useMutation({
    mutationFn: async (tier: string) => {
      const res = await apiRequest("POST", "/api/premium/subscribe", { tier, months: 1 });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "订阅失败");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/premium/status"] });
      toast({ title: "订阅成功", description: "你的会员已生效" });
    },
    onError: (err: any) => {
      toast({ title: "订阅失败", description: err.message || "请稍后再试", variant: "destructive" });
    },
  });

  const referralMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/premium/referral", { code });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "兑换失败");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/premium/status"] });
      setReferralInput("");
      toast({ title: "兑换成功", description: "推荐奖励已到账" });
    },
    onError: (err: any) => {
      toast({ title: "兑换失败", description: err.message || "请检查邀请码", variant: "destructive" });
    },
  });

  const buyCreditsMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest("POST", "/api/premium/buy-credits", { amount });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "购买失败");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/premium/status"] });
      toast({ title: "购买成功", description: `已充值 ${creditAmount} 积分` });
    },
    onError: (err: any) => {
      toast({ title: "购买失败", description: err.message || "请稍后再试", variant: "destructive" });
    },
  });

  // ── Helpers ────────────────────────────────────────────────

  const copyReferralCode = async () => {
    if (!data?.referralCode) return;
    try {
      await navigator.clipboard.writeText(data.referralCode);
      toast({ title: "已复制", description: "邀请码已复制到剪贴板" });
    } catch {
      toast({ title: "复制失败", description: "请手动复制邀请码", variant: "destructive" });
    }
  };

  const renderFeatureValue = (tier: TierInfo, feat: typeof FEATURE_LABELS[number]) => {
    const val = tier[feat.key];
    if (feat.type === "boolean") {
      return val ? (
        <Check className="w-4 h-4 text-emerald-400" />
      ) : (
        <X className="w-4 h-4 text-muted-foreground/40" />
      );
    }
    if (feat.type === "discount") {
      const discount = val as number;
      return discount > 0 ? (
        <span className="text-amber-400 font-medium">{discount}% off</span>
      ) : (
        <X className="w-4 h-4 text-muted-foreground/40" />
      );
    }
    // number
    const num = val as number;
    return num === -1 ? (
      <span className="text-amber-400 font-medium">无限</span>
    ) : (
      <span className="font-medium">{num}</span>
    );
  };

  // ── Render ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      </PageContainer>
    );
  }

  const currentTier = data?.tier || "free";
  const credits = data?.credits || 0;
  const tiers = data?.tiers || {};
  const referralCode = data?.referralCode || "";
  const referralCount = data?.referralCount || 0;

  return (
    <PageContainer>
      {/* ── Header ────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 dark:from-amber-700 dark:via-orange-700 dark:to-red-700 -mx-4 -mt-6 sm:-mx-6 sm:-mt-8 px-4 sm:px-6 pt-6 pb-14">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="w-5 h-5 text-white" />
          <h1 className="text-lg font-bold text-white">HeartAI 会员</h1>
        </div>
        <p className="text-white/70 text-xs">解锁更多心灵探索功能</p>

        <div className="mt-4 bg-white/10 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs">当前等级</p>
            <Badge className={`mt-1 ${TIER_STYLES[currentTier]?.badge || TIER_STYLES.free.badge}`}>
              {tiers[currentTier]?.label || currentTier}
            </Badge>
          </div>
          <div className="text-center">
            <p className="text-white/70 text-xs">积分余额</p>
            <p className="text-white text-xl font-bold flex items-center gap-1">
              <Coins className="w-4 h-4 text-amber-300" />
              {credits}
            </p>
          </div>
          <div className="text-center">
            <p className="text-white/70 text-xs">推荐人数</p>
            <p className="text-white text-xl font-bold flex items-center gap-1">
              <Users className="w-4 h-4 text-amber-300" />
              {referralCount}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tier Cards ────────────────────────────────── */}
      <div className="relative -mt-8 space-y-4 mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">会员方案</h2>
        {TIER_ORDER.map((tierKey) => {
          const tier = tiers[tierKey];
          if (!tier) return null;
          const style = TIER_STYLES[tierKey] || TIER_STYLES.free;
          const TierIcon = style.icon;
          const isCurrentTier = currentTier === tierKey;
          const isVip = tierKey === "vip";

          return (
            <Card
              key={tierKey}
              className={`relative overflow-hidden border ${style.border} ${
                isVip
                  ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-lg shadow-amber-500/10"
                  : "bg-card"
              } ${isCurrentTier ? "ring-2 ring-amber-400/60" : ""}`}
            >
              {isVip && (
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 via-transparent to-yellow-400/5 pointer-events-none" />
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${style.gradient}`}>
                      <TierIcon className={`w-4 h-4 ${isVip ? "text-amber-400" : "text-foreground"}`} />
                    </div>
                    <CardTitle className={`text-base ${isVip ? "text-amber-400" : ""}`}>
                      {tier.label}
                    </CardTitle>
                    {isCurrentTier && (
                      <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-400">
                        当前
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    {tier.priceMonthly.cny > 0 ? (
                      <>
                        <span className={`text-lg font-bold ${isVip ? "text-amber-400" : ""}`}>
                          ¥{tier.priceMonthly.cny}
                        </span>
                        <span className="text-xs text-muted-foreground">/月</span>
                        <p className="text-[10px] text-muted-foreground">${tier.priceMonthly.usd}/mo</p>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">免费</span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {FEATURE_LABELS.map((feat) => (
                  <div key={feat.key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{feat.label}</span>
                    {renderFeatureValue(tier, feat)}
                  </div>
                ))}

                {!isCurrentTier && tierKey !== "free" && (
                  <Button
                    className={`w-full mt-3 ${
                      isVip
                        ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:from-amber-500 hover:to-yellow-600 font-semibold"
                        : ""
                    }`}
                    variant={isVip ? "default" : "outline"}
                    size="sm"
                    disabled={subscribeMutation.isPending}
                    onClick={() => subscribeMutation.mutate(tierKey)}
                  >
                    {subscribeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-1" />
                    )}
                    {tierKey === currentTier ? "已订阅" : "立即订阅"}
                  </Button>
                )}
                {isCurrentTier && tierKey !== "free" && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-amber-400/70">当前方案</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Referral Section ──────────────────────────── */}
      <Card className="mb-4 border-amber-700/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-base">邀请好友</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* My referral code */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">我的邀请码</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 font-mono text-sm tracking-wider">
                {referralCode || "---"}
              </div>
              <Button variant="outline" size="icon" onClick={copyReferralCode} disabled={!referralCode}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              已邀请 <span className="text-amber-400 font-medium">{referralCount}</span> 人
            </p>
          </div>

          {/* Enter someone else's code */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">输入好友邀请码</p>
            <div className="flex items-center gap-2">
              <Input
                placeholder="请输入邀请码"
                value={referralInput}
                onChange={(e) => setReferralInput(e.target.value)}
                className="flex-1 font-mono tracking-wider"
              />
              <Button
                variant="default"
                size="sm"
                disabled={!referralInput.trim() || referralMutation.isPending}
                onClick={() => referralMutation.mutate(referralInput.trim())}
              >
                {referralMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "兑换"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Credits Section ───────────────────────────── */}
      <Card className="mb-6 border-amber-700/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-base">积分充值</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
            <span className="text-sm text-muted-foreground">当前积分</span>
            <span className="text-lg font-bold text-amber-400">{credits}</span>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">选择充值数量</p>
            <div className="grid grid-cols-4 gap-2">
              {[10, 50, 100, 500].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setCreditAmount(amount)}
                  className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                    creditAmount === amount
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
            disabled={buyCreditsMutation.isPending}
            onClick={() => buyCreditsMutation.mutate(creditAmount)}
          >
            {buyCreditsMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Coins className="w-4 h-4 mr-1" />
            )}
            充值 {creditAmount} 积分
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
