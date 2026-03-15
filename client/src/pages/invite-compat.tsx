import { useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Heart, Sparkles, Users, ArrowRight, LogIn, UserPlus, Share2, Copy } from "lucide-react";

// ─── Invite Landing Page (public-ish, for invited person) ───
export default function InviteCompatPage() {
  const [, params] = useRoute("/invite/compat/:userId");
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [inviterName, setInviterName] = useState<string>("");
  const [inviterElement, setInviterElement] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const inviterId = params?.userId;

  // Fetch inviter info
  useEffect(() => {
    if (!inviterId) return;
    (async () => {
      try {
        const res = await apiRequest("GET", `/api/invite/compat-info/${inviterId}`);
        const data = await res.json();
        setInviterName(data.nickname || "观星用户");
        setInviterElement(data.element || "");
      } catch {
        setInviterName("观星用户");
      } finally {
        setLoading(false);
      }
    })();
  }, [inviterId]);

  // If user is already logged in, go directly to compatibility with pre-filled inviter
  const handleGoCompat = () => {
    // Store inviter ID in URL param for the compatibility page to pick up
    setLocation(`/compatibility?invite=${inviterId}`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="invite-loading">
        <div className="text-center space-y-3">
          <Sparkles className="w-8 h-8 text-pink-500 animate-pulse mx-auto" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" data-testid="invite-compat-page">
      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-4 pt-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
            <Heart className="w-10 h-10 text-pink-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {inviterName} 邀请你来测缘分
            </h1>
            {inviterElement && (
              <Badge variant="secondary" className="mt-2 text-xs">
                {inviterElement}命
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            通过AI五维分析，探索你们之间的缘分契合度<br />
            看看你们的默契度、激情值、趣味性会有多高？
          </p>
        </div>

        {/* Preview radar mock */}
        <Card className="bg-gradient-to-br from-pink-500/5 via-rose-500/5 to-purple-500/5 border-pink-500/20">
          <CardContent className="py-6">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-1">
                  <span className="text-lg">💫</span>
                </div>
                <span className="text-xs font-medium">{inviterName}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Heart className="w-6 h-6 text-pink-500" />
                <span className="text-[10px] text-pink-500 font-medium">× 缘分雷达 ×</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-1">
                  <span className="text-lg">✨</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground">你</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        {user ? (
          <Button
            className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 h-12 text-base"
            onClick={handleGoCompat}
            data-testid="button-invite-go-compat"
          >
            <Users className="w-5 h-5 mr-2" /> 开始缘分分析
          </Button>
        ) : (
          <div className="space-y-3">
            <Link href={`/auth?redirect=/invite/compat/${inviterId}`}>
              <Button
                className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 h-12 text-base"
                data-testid="button-invite-register"
              >
                <UserPlus className="w-5 h-5 mr-2" /> 注册并测缘分
              </Button>
            </Link>
            <Link href={`/auth?redirect=/invite/compat/${inviterId}`}>
              <Button variant="outline" className="w-full h-10" data-testid="button-invite-login">
                <LogIn className="w-4 h-4 mr-2" /> 已有账号，登录
              </Button>
            </Link>
          </div>
        )}

        {/* How it works */}
        <Card>
          <CardContent className="py-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">分析维度</p>
            {[
              { emoji: "💞", label: "默契度 Bond", desc: "心意相通，灵魂共鸣" },
              { emoji: "🔥", label: "激情值 Passion", desc: "热情火花，吸引力指数" },
              { emoji: "🎮", label: "趣味性 Fun", desc: "日常互动的开心指数" },
              { emoji: "🌙", label: "亲密度 Intimacy", desc: "信任深度，安全感" },
              { emoji: "🔄", label: "同步率 Sync", desc: "价值观和生活节奏契合" },
            ].map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-base">{d.emoji}</span>
                <div>
                  <span className="text-xs font-medium">{d.label}</span>
                  <p className="text-[10px] text-muted-foreground">{d.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="text-[10px] text-center text-muted-foreground">
          ⚠️ 免责声明：融合八字合婚与心理学分析，仅供娱乐参考。
        </p>
      </div>
    </div>
  );
}

// ─── Invite Button for Compatibility Result Page ─────────────
export function InviteCompatButton() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCopied, setShowCopied] = useState(false);

  if (!user) return null;

  const inviteUrl = `${window.location.origin}${window.location.pathname}#/invite/compat/${user.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `来观星测测我们的缘分吧！🦉💕 ${inviteUrl}`
      );
      toast({ title: "已复制", description: "邀请链接已复制到剪贴板" });
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch {
      toast({ title: "复制失败", description: "请手动复制链接", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "来测测我们的缘分 - 观星",
          text: "来观星测测我们的缘分吧！AI五维分析你们的默契度、激情值、趣味性💕",
          url: inviteUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className="flex-1 border-pink-500/30 text-pink-500 hover:bg-pink-500/10"
        onClick={handleCopy}
        data-testid="button-invite-copy"
      >
        <Copy className="w-3.5 h-3.5 mr-1" />
        {showCopied ? "已复制" : "复制链接"}
      </Button>
      <Button
        size="sm"
        className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
        onClick={handleShare}
        data-testid="button-invite-share"
      >
        <Share2 className="w-3.5 h-3.5 mr-1" /> 邀请TA来合盘
      </Button>
    </div>
  );
}
