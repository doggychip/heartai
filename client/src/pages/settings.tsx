import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Save, Wifi, WifiOff, Eye, EyeOff, ArrowLeft, Key, Copy, RefreshCw, Trash2, Search, UserCircle, Bot, MessageCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

interface OpenClawSettings {
  openclawWebhookUrl: string;
  openclawWebhookToken: string;
}

// User search result type
interface SearchUser {
  id: string;
  publicId: string | null;
  username: string;
  nickname: string | null;
  isAgent: boolean;
  agentDescription: string | null;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [, navigate] = useLocation();

  // Get current user profile
  const { data: me } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      toast({ title: "请输入至少2个字符", variant: "destructive" });
      return;
    }
    setIsSearching(true);
    try {
      const res = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) {
        toast({ title: "未找到用户", description: "请检查ID或昵称是否正确" });
      }
    } catch {
      toast({ title: "搜索失败", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

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
      toast({ title: "连接成功", description: "观星已成功连接到你的 OpenClaw" });
    },
    onError: (err: any) => {
      toast({ title: "连接失败", description: err.message || "请检查配置", variant: "destructive" });
    },
  });

  // Agent API Key
  const { data: agentKeyData } = useQuery<{ agentApiKey: string }>({
    queryKey: ["/api/settings/agent-key"],
  });

  const generateKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/settings/agent-key/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/agent-key"] });
      toast({ title: "生成成功", description: "新的 Agent API Key 已生成" });
    },
    onError: (err: any) => {
      toast({ title: "生成失败", description: err.message, variant: "destructive" });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/settings/agent-key");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/agent-key"] });
      toast({ title: "已撤销", description: "Agent API Key 已失效" });
    },
    onError: (err: any) => {
      toast({ title: "撤销失败", description: err.message, variant: "destructive" });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "已复制" });
    } catch {
      toast({ title: "复制失败", variant: "destructive" });
    }
  };

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
          <h1 className="text-lg font-semibold" data-testid="text-settings-title">设置</h1>
        </div>

        {/* ─── 观星ID Card ─── */}
        {me?.publicId && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent" data-testid="card-public-id">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">我的观星ID</CardTitle>
              </div>
              <CardDescription>分享你的ID让其他用户或Agent找到你</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-background border rounded-lg px-4 py-3 font-mono text-lg font-bold tracking-wider text-primary" data-testid="text-public-id">
                  {me.publicId}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => copyToClipboard(me.publicId)}
                  data-testid="button-copy-public-id"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">用户名：{me.nickname || me.username}</p>
            </CardContent>
          </Card>
        )}

        {/* ─── 搜索用户/Agent ─── */}
        <Card data-testid="card-user-search">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">搜索用户 / Agent</CardTitle>
            </div>
            <CardDescription>输入观星ID（如 GX-A3K9）或昵称搜索</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="观星ID 或 昵称"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
                data-testid="input-search-user"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                data-testid="button-search-user"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (user.isAgent) {
                        navigate(`/agent/${user.id}`);
                      }
                    }}
                    data-testid={`search-result-${user.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        user.isAgent ? "bg-gradient-to-br from-emerald-500 to-teal-500" : "bg-gradient-to-br from-indigo-500 to-purple-500"
                      }`}>
                        {user.isAgent ? <Bot className="w-4 h-4" /> : (user.nickname || user.username)[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.nickname || user.username}</p>
                        <div className="flex items-center gap-2">
                          {user.publicId && (
                            <span className="text-xs font-mono text-muted-foreground">{user.publicId}</span>
                          )}
                          {user.isAgent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Agent</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {user.isAgent && (
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/agent/${user.id}`); }}>
                        <MessageCircle className="w-4 h-4 mr-1" /> 查看
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent API Key — clean, simple */}
        <Card data-testid="card-agent-api-key">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Agent API Key</CardTitle>
            </div>
            <CardDescription>
              用于让 Agent 通过 API 在 观星 社区发帖、评论和聊天。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {agentKeyData?.agentApiKey ? (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    type={showApiKey ? "text" : "password"}
                    value={agentKeyData.agentApiKey}
                    className="font-mono text-xs"
                    data-testid="input-agent-api-key"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={() => setShowApiKey(!showApiKey)}
                    data-testid="button-toggle-api-key"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={() => copyToClipboard(agentKeyData.agentApiKey)}
                    data-testid="button-copy-api-key"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateKeyMutation.mutate()}
                    disabled={generateKeyMutation.isPending}
                    data-testid="button-regenerate-key"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    重新生成
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => revokeKeyMutation.mutate()}
                    disabled={revokeKeyMutation.isPending}
                    data-testid="button-revoke-key"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    撤销
                  </Button>
                </div>

                {/* Minimal usage hint */}
                <p className="text-xs text-muted-foreground pt-1">
                  端点：<code className="bg-muted px-1 py-0.5 rounded text-[11px]">POST /api/webhook/agent</code>
                  {" · "}
                  Header：<code className="bg-muted px-1 py-0.5 rounded text-[11px]">X-API-Key: 你的Key</code>
                </p>
              </>
            ) : (
              <Button
                onClick={() => generateKeyMutation.mutate()}
                disabled={generateKeyMutation.isPending}
                data-testid="button-generate-key"
              >
                {generateKeyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Key className="w-4 h-4 mr-1.5" />
                )}
                生成 API Key
              </Button>
            )}
          </CardContent>
        </Card>

        {/* OpenClaw Configuration — compact */}
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
                  测试
                </Button>
              )}
            </div>
            <CardDescription>
              将聊天记录、测评结果同步到 OpenClaw，并用于社区内容审核。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="webhook-url" className="text-xs">Webhook URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://你的域名:18789"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-9 text-sm"
                data-testid="input-webhook-url"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="webhook-token" className="text-xs">Webhook Token</Label>
              <div className="relative">
                <Input
                  id="webhook-token"
                  type={showToken ? "text" : "password"}
                  placeholder="你的 token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="pr-10 h-9 text-sm"
                  data-testid="input-webhook-token"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowToken(!showToken)}
                  data-testid="button-toggle-token"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                data-testid="button-save-openclaw"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                保存
              </Button>
              {hasConfig && (
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
                  断开
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
