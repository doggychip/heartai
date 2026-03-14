import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Save, Wifi, WifiOff, Eye, EyeOff, ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface OpenClawSettings {
  openclawWebhookUrl: string;
  openclawWebhookToken: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { isLoading } = useQuery<OpenClawSettings>({
    queryKey: ["/api/settings/openclaw"],
    select: (data) => {
      if (!initialized) {
        setUrl(data.openclawWebhookUrl);
        setToken(data.openclawWebhookToken);
        setInitialized(true);
      }
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/settings/openclaw", {
        openclawWebhookUrl: url,
        openclawWebhookToken: token,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/openclaw"] });
      toast({ title: "保存成功", description: "OpenClaw 配置已更新" });
    },
    onError: (err: any) => {
      toast({ title: "保存失败", description: err.message || "请检查输入", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/settings/openclaw/test");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "连接成功", description: "HeartAI 已成功连接到你的 OpenClaw" });
    },
    onError: (err: any) => {
      toast({ title: "连接失败", description: err.message || "请检查配置", variant: "destructive" });
    },
  });

  const hasConfig = url && token;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="settings-loading">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" data-testid="settings-page">
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-settings-title">设置</h1>
            <p className="text-sm text-muted-foreground">管理你的账户和集成配置</p>
          </div>
        </div>

        {/* OpenClaw Configuration */}
        <Card data-testid="card-openclaw-settings">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${hasConfig ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                <CardTitle className="text-base">OpenClaw 集成</CardTitle>
              </div>
              {hasConfig && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                  data-testid="button-test-connection"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Wifi className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  测试连接
                </Button>
              )}
            </div>
            <CardDescription>
              连接你自己的 OpenClaw 实例，将聊天记录、测评结果同步过去，并使用 OpenClaw 进行内容审核。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* How to get the values */}
            <div className="rounded-lg border border-border bg-accent/30 p-3 text-sm text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground">如何获取？</p>
              <p>1. 打开 OpenClaw Gateway 设置页面</p>
              <p>2. 找到 <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">Webhook URL</span> — 格式通常为 <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">https://你的域名:端口</span></p>
              <p>3. 找到或生成 <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">Webhook Token</span></p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://example.com:18789"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                data-testid="input-webhook-url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-token">Webhook Token</Label>
              <div className="relative">
                <Input
                  id="webhook-token"
                  type={showToken ? "text" : "password"}
                  placeholder="你的 OpenClaw webhook token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="pr-10"
                  data-testid="input-webhook-token"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowToken(!showToken)}
                  data-testid="button-toggle-token"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                data-testid="button-save-openclaw"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="w-4 h-4 mr-1.5" />
                )}
                保存配置
              </Button>
              {url && token && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setUrl("");
                    setToken("");
                    saveMutation.mutate();
                  }}
                  data-testid="button-clear-openclaw"
                >
                  <WifiOff className="w-3.5 h-3.5 mr-1.5" />
                  断开连接
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* What gets synced */}
        <Card data-testid="card-openclaw-info">
          <CardHeader>
            <CardTitle className="text-base">同步内容说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs">💬</span>
                </div>
                <div>
                  <p className="font-medium">聊天同步</p>
                  <p className="text-muted-foreground">每次 AI 对话后，聊天内容和情绪分析会同步到你的 OpenClaw</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs">📊</span>
                </div>
                <div>
                  <p className="font-medium">测评深度分析</p>
                  <p className="text-muted-foreground">完成心理测评后，OpenClaw 会生成更详细的分析报告</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs">🛡️</span>
                </div>
                <div>
                  <p className="font-medium">社区内容审核</p>
                  <p className="text-muted-foreground">社区发帖时，OpenClaw 会审核内容安全性</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
