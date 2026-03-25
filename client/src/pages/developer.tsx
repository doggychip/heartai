import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Code, Key, Plus, Copy, RefreshCcw, Trash2, ExternalLink,
  Activity, Clock, Zap, ChevronRight, Eye, EyeOff,
  Shield, Check, AlertCircle, BarChart3, ArrowLeft,
} from "lucide-react";

const PERMISSION_OPTIONS = [
  { key: "bazi", label: "八字命理", icon: "📅" },
  { key: "fortune", label: "每日运势", icon: "🔮" },
  { key: "qiuqian", label: "求签问卦", icon: "🔥" },
  { key: "almanac", label: "黄历查询", icon: "📋" },
  { key: "zodiac", label: "星座解读", icon: "⭐" },
  { key: "fengshui", label: "风水评估", icon: "🏠" },
  { key: "dream", label: "梦境解析", icon: "🌙" },
  { key: "tarot", label: "塔罗占卜", icon: "🃏" },
  { key: "name_score", label: "姓名打分", icon: "✏️" },
  { key: "compatibility", label: "缘分配对", icon: "❤️" },
];

export default function DeveloperPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Fetch apps
  const { data: apps = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/developer/apps"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/developer/apps");
      return res.json();
    },
    enabled: !!user,
  });

  if (selectedAppId) {
    return <AppDetail appId={selectedAppId} onBack={() => setSelectedAppId(null)} />;
  }

  if (showCreate) {
    return <CreateApp onClose={() => setShowCreate(false)} />;
  }

  return (
    <PageContainer width="wide" className="flex-1 space-y-6">
      {/* Header */}
      <PageHeader
        icon={Code}
        title="开发者中心"
        description="创建应用、获取 API Key，调用观星命理 Webhook API"
        actions={
          <Button
            onClick={() => setShowCreate(true)}
            size="sm"
            disabled={apps.length >= 5}
            data-testid="button-create-app"
          >
            <Plus className="w-4 h-4 mr-1" />
            创建应用
          </Button>
        }
      />

      {/* Quick Start Guide */}
      <Card className="p-4 bg-primary/5 border-primary/10">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          快速开始
        </h3>
        <div className="text-xs text-muted-foreground space-y-1.5">
          <p>1. 创建应用 → 获取 <code className="px-1 py-0.5 bg-muted rounded text-foreground">gx_sk_</code> 开头的 API Key</p>
          <p>2. 选择需要的 Skill 权限（八字、运势、求签等）</p>
          <p>3. 使用 Bearer Token 认证调用 <code className="px-1 py-0.5 bg-muted rounded text-foreground">/api/v1/</code> 端点</p>
        </div>
        <div className="mt-3 p-3 bg-background rounded-lg border text-xs font-mono overflow-x-auto">
          <pre className="text-muted-foreground">{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/bazi \\
  -H "Authorization: Bearer gx_sk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"birthDate":"1995-03-15","birthHour":14}'`}</pre>
        </div>
      </Card>

      {/* Apps List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-1/3 mb-2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </Card>
          ))}
        </div>
      ) : apps.length === 0 ? (
        <Card className="p-8 text-center">
          <Code className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">还没有创建应用</p>
          <p className="text-xs text-muted-foreground mt-1">创建你的第一个应用，开始使用观星 API</p>
          <Button className="mt-4" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" />
            创建第一个应用
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {apps.map((app: any) => {
            let perms: string[] = [];
            try { perms = JSON.parse(app.permissions); } catch {}
            return (
              <Card
                key={app.id}
                className="p-4 hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => setSelectedAppId(app.id)}
                data-testid={`card-app-${app.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{app.appName}</h3>
                      <Badge variant={app.isActive ? "default" : "secondary"} className="text-[10px] px-1.5">
                        {app.isActive ? "运行中" : "已停用"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {app.appDescription || "无描述"}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {app.totalCalls} 次调用
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {perms.length} 项权限
                      </span>
                      {app.lastUsedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          最近 {new Date(app.lastUsedAt).toLocaleDateString("zh-CN")}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

// ─── Create App Form ────────────────────────────────────────
function CreateApp({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [appName, setAppName] = useState("");
  const [appDescription, setAppDescription] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/developer/apps", {
        appName,
        appDescription: appDescription || undefined,
        permissions: selectedPerms,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developer/apps"] });
      toast({ title: "应用创建成功" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "创建失败", description: err.message, variant: "destructive" });
    },
  });

  const togglePerm = (key: string) => {
    setSelectedPerms(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <PageContainer className="flex-1 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold">创建新应用</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">应用名称</label>
          <Input
            value={appName}
            onChange={e => setAppName(e.target.value)}
            placeholder="e.g. 我的风水助手"
            maxLength={50}
            data-testid="input-app-name"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">描述（可选）</label>
          <Textarea
            value={appDescription}
            onChange={e => setAppDescription(e.target.value)}
            placeholder="简单描述你的应用用途"
            maxLength={500}
            rows={2}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">API 权限</label>
          <p className="text-xs text-muted-foreground mb-3">选择你的应用需要调用的 Skill</p>
          <div className="grid grid-cols-2 gap-2">
            {PERMISSION_OPTIONS.map(opt => {
              const selected = selectedPerms.includes(opt.key);
              return (
                <div
                  key={opt.key}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    selected ? "bg-primary/10 border-primary/30" : "hover:bg-accent/50"
                  }`}
                  onClick={() => togglePerm(opt.key)}
                  data-testid={`perm-${opt.key}`}
                >
                  <span className="text-sm">{opt.icon}</span>
                  <span className="text-sm flex-1">{opt.label}</span>
                  {selected && <Check className="w-4 h-4 text-primary" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!appName.trim() || selectedPerms.length === 0 || createMutation.isPending}
            className="flex-1"
            data-testid="button-submit-create"
          >
            {createMutation.isPending ? "创建中..." : "创建应用"}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

// ─── App Detail View ────────────────────────────────────────
function AppDetail({ appId, onBack }: { appId: string; onBack: () => void }) {
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);

  const { data: app, isLoading } = useQuery<any>({
    queryKey: ["/api/developer/apps", appId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/developer/apps/${appId}`);
      return res.json();
    },
  });

  const regenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/developer/apps/${appId}/regenerate-key`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developer/apps", appId] });
      toast({ title: "API Key 已重新生成" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/developer/apps/${appId}/toggle`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developer/apps", appId] });
      queryClient.invalidateQueries({ queryKey: ["/api/developer/apps"] });
      toast({ title: "状态已切换" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/developer/apps/${appId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developer/apps"] });
      toast({ title: "应用已删除" });
      onBack();
    },
  });

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).catch(() => {});
    toast({ title: "已复制到剪贴板" });
  };

  if (isLoading || !app) {
    return (
      <PageContainer width="wide" className="flex-1">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </PageContainer>
    );
  }

  let perms: string[] = [];
  try { perms = JSON.parse(app.permissions); } catch {}
  const maskedKey = showKey ? app.apiKey : app.apiKey.slice(0, 10) + "••••••••••••••••••••••";

  return (
    <PageContainer width="wide" className="flex-1 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold truncate">{app.appName}</h1>
        <Badge variant={app.isActive ? "default" : "secondary"} className="text-[10px]">
          {app.isActive ? "运行中" : "已停用"}
        </Badge>
      </div>

      {/* API Key */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Key className="w-4 h-4 text-primary" />
            API Key
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowKey(!showKey)}>
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyKey(app.apiKey)} data-testid="button-copy-key">
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <code className="text-xs block p-2 bg-muted rounded break-all font-mono" data-testid="text-api-key">
          {maskedKey}
        </code>
        <div className="flex items-center gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={() => regenMutation.mutate()} disabled={regenMutation.isPending}>
            <RefreshCcw className="w-3.5 h-3.5 mr-1" />
            重新生成
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate()}>
            {app.isActive ? "停用" : "启用"}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            删除
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-primary">{app.totalCalls}</p>
          <p className="text-[11px] text-muted-foreground">总调用次数</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-amber-500">{app.stats?.todayCalls || 0}</p>
          <p className="text-[11px] text-muted-foreground">今日调用</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-cyan-500">{app.stats?.avgLatency || 0}ms</p>
          <p className="text-[11px] text-muted-foreground">平均延迟</p>
        </Card>
      </div>

      {/* Permissions */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Shield className="w-4 h-4" />
          已授权 Skill
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {perms.map(p => {
            const opt = PERMISSION_OPTIONS.find(o => o.key === p);
            return (
              <Badge key={p} variant="outline" className="text-xs">
                {opt?.icon} {opt?.label || p}
              </Badge>
            );
          })}
        </div>
      </Card>

      {/* Recent Logs */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4" />
          最近调用日志
        </h3>
        {app.recentLogs && app.recentLogs.length > 0 ? (
          <div className="space-y-2">
            {app.recentLogs.map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 text-xs p-2 rounded bg-muted/50">
                <Badge variant={log.responseStatus === 200 ? "default" : "destructive"} className="text-[10px] w-10 text-center">
                  {log.responseStatus}
                </Badge>
                <span className="font-mono text-muted-foreground flex-1 truncate">{log.endpoint}</span>
                <span className="text-muted-foreground">{log.latencyMs}ms</span>
                <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString("zh-CN")}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">暂无调用记录</p>
        )}
      </Card>
    </PageContainer>
  );
}
