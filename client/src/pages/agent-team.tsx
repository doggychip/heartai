import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Brain,
  Sparkles,
  TrendingUp,
  Radar,
  Cpu,
  Activity,
  Zap,
  BarChart3,
  Network,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  MessageSquare,
  Loader2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────
interface AgentMember {
  agentKey: string;
  name: string;
  role: string;
  domain: string;
  description: string;
  icon: string;
  color: string;
  totalCalls: number;
  totalTokens: number;
  avgLatencyMs: number;
  lastActiveAt: string | null;
  isActive: boolean;
}

interface TopologyData {
  orchestrator: AgentMember;
  specialists: AgentMember[];
  connections: Array<{ from: string; to: string; label: string }>;
}

interface StatsData {
  totalDispatches: number;
  todayDispatches: number;
  totalEvents: number;
  avgLatency: number;
  agentUsage: Array<{ agentKey: string; name: string; calls: number; tokens: number }>;
  recentEvents: Array<{
    id: string;
    eventType: string;
    publisherAgent: string;
    subscriberAgents: string;
    status: string;
    resultSummary: string | null;
    createdAt: string;
  }>;
  recentDispatches: Array<{
    id: string;
    userMessage: string;
    intentClassified: string;
    dispatchedTo: string;
    responsePreview: string | null;
    tokensUsed: number;
    latencyMs: number;
    success: boolean;
    createdAt: string;
  }>;
}

interface OrchestratorResponse {
  response: string;
  agent: { key: string; name: string; icon: string; color: string; domain: string };
  classification: { intent: string; confidence: number; reason: string };
  latencyMs: number;
  tokensUsed: number;
}

// ─── Icon Map ───────────────────────────────────────────────
const ICON_MAP: Record<string, any> = {
  Brain, Sparkles, TrendingUp, Radar, Cpu,
};

function AgentIcon({ icon, className }: { icon: string; className?: string }) {
  const IconComponent = ICON_MAP[icon] || Brain;
  return <IconComponent className={className} />;
}

// ─── Topology Visualization ─────────────────────────────────
function TopologyView({ data }: { data: TopologyData }) {
  const { orchestrator, specialists, connections } = data;

  return (
    <div className="relative" data-testid="topology-view">
      {/* Orchestrator (center) */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-2 border-purple-500/30 flex flex-col items-center justify-center gap-1 shadow-lg shadow-purple-500/5">
            <AgentIcon icon={orchestrator.icon} className="w-8 h-8 text-purple-400" />
            <span className="text-[10px] font-medium text-purple-300">{orchestrator.name}</span>
          </div>
          {/* Pulse ring */}
          <div className="absolute -inset-1 rounded-2xl border border-purple-500/20 animate-pulse" />
        </div>
      </div>

      {/* Connection lines indicator */}
      <div className="flex justify-center mb-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Network className="w-3 h-3" />
          <span>意图路由</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>

      {/* Specialists (row) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {specialists.map((agent) => {
          const conn = connections.find(c => c.to === agent.agentKey && c.from === "main");
          const eventConns = connections.filter(c => c.to === agent.agentKey && c.from !== "main");
          return (
            <div key={agent.agentKey} className="relative group" data-testid={`agent-node-${agent.agentKey}`}>
              <div className={`p-3 rounded-xl border transition-all duration-200 ${
                agent.isActive
                  ? "bg-card/80 border-border/60 hover:border-primary/30 hover:shadow-md"
                  : "bg-muted/30 border-border/30 opacity-60"
              }`}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getAgentGradient(agent.agentKey)} flex items-center justify-center`}>
                    <AgentIcon icon={agent.icon} className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{agent.name}</div>
                    <Badge variant="outline" className="text-[9px] px-1.5 mt-1">{agent.domain}</Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-0.5 w-full">
                    <div className="flex justify-between">
                      <span>调用</span>
                      <span className="font-mono">{agent.totalCalls}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>延迟</span>
                      <span className="font-mono">{agent.avgLatencyMs}ms</span>
                    </div>
                  </div>
                </div>
                {/* Event connections */}
                {eventConns.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                    {eventConns.map((ec, i) => (
                      <div key={i} className="text-[9px] text-muted-foreground flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-amber-400" />
                        <span className="truncate">{ec.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {agent.isActive && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getAgentGradient(key: string): string {
  const gradients: Record<string, string> = {
    main: "from-purple-600 to-purple-800",
    stella: "from-amber-500 to-orange-600",
    prediction: "from-blue-500 to-indigo-600",
    market: "from-green-500 to-emerald-600",
    tech: "from-cyan-500 to-teal-600",
  };
  return gradients[key] || "from-gray-500 to-gray-600";
}

// ─── Event Flow Log ─────────────────────────────────────────
function EventLog({ events }: { events: StatsData["recentEvents"] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Zap className="w-6 h-6 mx-auto mb-2 opacity-40" />
        暂无事件流记录
        <div className="text-xs mt-1">Agent 之间的协作事件将在这里显示</div>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="event-log">
      {events.map((event) => {
        const subscribers = JSON.parse(event.subscriberAgents || "[]");
        return (
          <div key={event.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/30">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
              event.status === "completed" ? "bg-green-500/10 text-green-400" :
              event.status === "failed" ? "bg-red-500/10 text-red-400" :
              "bg-amber-500/10 text-amber-400"
            }`}>
              {event.status === "completed" ? <CheckCircle2 className="w-4 h-4" /> :
               event.status === "failed" ? <AlertCircle className="w-4 h-4" /> :
               <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[9px]">{event.eventType}</Badge>
                <span className="text-[10px] text-muted-foreground">
                  {event.publisherAgent} → [{subscribers.join(", ")}]
                </span>
              </div>
              {event.resultSummary && (
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.resultSummary}</div>
              )}
              <div className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {new Date(event.createdAt).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Dispatch Log ───────────────────────────────────────────
function DispatchLog({ dispatches }: { dispatches: StatsData["recentDispatches"] }) {
  if (dispatches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
        暂无调度记录
        <div className="text-xs mt-1">使用下方输入框尝试 Agent 编排对话</div>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="dispatch-log">
      {dispatches.map((d) => (
        <div key={d.id} className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <Badge className={`text-[9px] ${getIntentColor(d.intentClassified)}`}>
                {d.intentClassified}
              </Badge>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <Badge variant="outline" className="text-[9px]">{d.dispatchedTo}</Badge>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{d.latencyMs}ms</span>
              <span>{d.tokensUsed}tok</span>
            </div>
          </div>
          <div className="text-xs line-clamp-1">{d.userMessage}</div>
          {d.responsePreview && (
            <div className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{d.responsePreview}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function getIntentColor(intent: string): string {
  const colors: Record<string, string> = {
    "命理": "bg-amber-500/15 text-amber-400 border-amber-500/30",
    "运势": "bg-blue-500/15 text-blue-400 border-blue-500/30",
    "社区": "bg-green-500/15 text-green-400 border-green-500/30",
    "对话": "bg-purple-500/15 text-purple-400 border-purple-500/30",
    "技术": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  };
  return colors[intent] || "bg-muted";
}

// ─── Orchestrator Chat Test ─────────────────────────────────
function OrchestratorChat() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<OrchestratorResponse | null>(null);
  const { toast } = useToast();

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/orchestrator/chat", { message });
      return res.json();
    },
    onSuccess: (data: OrchestratorResponse) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/agent-team/stats"] });
    },
    onError: () => {
      toast({ title: "发送失败", variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;
    chatMutation.mutate(input.trim());
    setInput("");
  };

  return (
    <div className="space-y-3" data-testid="orchestrator-chat">
      <div className="flex gap-2">
        <input
          data-testid="input-orchestrator-msg"
          className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          placeholder="输入消息测试 Agent 编排（如：帮我看看今日运势）"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button
          data-testid="button-send-orchestrator"
          size="sm"
          onClick={handleSend}
          disabled={chatMutation.isPending || !input.trim()}
        >
          {chatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {result && (
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center bg-gradient-to-br ${getAgentGradient(result.agent.key)}`}>
              <AgentIcon icon={result.agent.icon} className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-xs font-semibold">{result.agent.name}</span>
              <span className="text-[10px] text-muted-foreground ml-2">
                {result.classification.intent} · {Math.round(result.classification.confidence * 100)}% · {result.latencyMs}ms
              </span>
            </div>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{result.response}</div>
          <div className="text-[10px] text-muted-foreground">
            路由原因: {result.classification.reason} · {result.tokensUsed} tokens
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function AgentTeamPage() {
  const topologyQuery = useQuery<TopologyData>({
    queryKey: ["/api/agent-team/topology"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/agent-team/topology");
      return res.json();
    },
  });

  const statsQuery = useQuery<StatsData>({
    queryKey: ["/api/agent-team/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/agent-team/stats");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const stats = statsQuery.data;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20" data-testid="page-agent-team">
      {/* Header */}
      <div className="px-1">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Network className="w-5 h-5 text-purple-400" />
          Agent Team 编排中心
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          多智能体协作 · 意图路由 · 事件驱动
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "总调度", value: stats?.totalDispatches ?? 0, icon: Activity, color: "text-purple-400" },
          { label: "今日", value: stats?.todayDispatches ?? 0, icon: Zap, color: "text-amber-400" },
          { label: "事件", value: stats?.totalEvents ?? 0, icon: Network, color: "text-blue-400" },
          { label: "延迟", value: `${stats?.avgLatency ?? 0}ms`, icon: Clock, color: "text-green-400" },
        ].map((s, i) => (
          <Card key={i} className="border-border/40">
            <CardContent className="p-3 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <div className="text-lg font-bold font-mono">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Topology */}
      <Card className="border-border/40">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Network className="w-4 h-4 text-purple-400" />
            团队拓扑
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {topologyQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-24 mx-auto rounded-2xl" />
              <div className="grid grid-cols-4 gap-3">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            </div>
          ) : topologyQuery.data ? (
            <TopologyView data={topologyQuery.data} />
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground">加载失败</div>
          )}
        </CardContent>
      </Card>

      {/* Agent Usage Chart */}
      {stats && stats.agentUsage.length > 0 && (
        <Card className="border-border/40">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Agent 使用统计
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {stats.agentUsage.map((agent) => {
                const maxCalls = Math.max(...stats.agentUsage.map(a => a.calls), 1);
                const pct = Math.round((agent.calls / maxCalls) * 100);
                return (
                  <div key={agent.agentKey} className="flex items-center gap-3" data-testid={`usage-${agent.agentKey}`}>
                    <div className="w-20 text-xs font-medium truncate">{agent.name}</div>
                    <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${getAgentGradient(agent.agentKey)} transition-all duration-500`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <div className="w-16 text-right text-[10px] text-muted-foreground font-mono">
                      {agent.calls}次 · {(agent.tokens / 1000).toFixed(1)}k
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orchestrator Chat Test */}
      <Card className="border-border/40">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            编排对话测试
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <OrchestratorChat />
        </CardContent>
      </Card>

      {/* Tabs: Dispatch Log + Event Log */}
      <Tabs defaultValue="dispatch">
        <TabsList className="w-full">
          <TabsTrigger value="dispatch" className="flex-1 text-xs">
            <MessageSquare className="w-3 h-3 mr-1" />
            调度日志
          </TabsTrigger>
          <TabsTrigger value="events" className="flex-1 text-xs">
            <Zap className="w-3 h-3 mr-1" />
            事件流
          </TabsTrigger>
        </TabsList>
        <TabsContent value="dispatch">
          <Card className="border-border/40 mt-2">
            <CardContent className="p-3">
              {statsQuery.isLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
              ) : (
                <DispatchLog dispatches={stats?.recentDispatches ?? []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="events">
          <Card className="border-border/40 mt-2">
            <CardContent className="p-3">
              {statsQuery.isLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
              ) : (
                <EventLog events={stats?.recentEvents ?? []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
