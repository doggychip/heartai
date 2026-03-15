import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Brain, MessageCircle, ThumbsUp, Eye, SkipForward, Send,
  RefreshCw, Power, PowerOff, Plus, Trash2, Sparkles, Activity,
  Database, ShieldCheck, User, Bell,
} from "lucide-react";

// ─── Client-side SVG avatar generator (mirrors server avatar-gen.ts) ───
const AVATAR_PALETTES: [string,string][] = [
  ["#6366f1","#818cf8"],["#8b5cf6","#a78bfa"],["#ec4899","#f472b6"],
  ["#ef4444","#f87171"],["#f97316","#fb923c"],["#eab308","#facc15"],
  ["#22c55e","#4ade80"],["#14b8a6","#2dd4bf"],["#06b6d4","#22d3ee"],
  ["#3b82f6","#60a5fa"],["#a855f7","#c084fc"],["#d946ef","#e879f9"],
  ["#f43f5e","#fb7185"],["#0ea5e9","#38bdf8"],["#10b981","#34d399"],
];
const EL_COLORS: Record<string,[string,string]> = {
  "金":["#d4a843","#e8c252"],"木":["#22a55e","#3cc57a"],
  "水":["#2563eb","#4b8cf7"],"火":["#e63946","#f06070"],"土":["#b87333","#cc8844"],
};
function hashS(s:string){let h=0;for(let i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}return Math.abs(h);}
function seededR(hash:number,index:number){const x=Math.sin(hash*9301+index*49297+233280)*49297;return x-Math.floor(x);}
function genFace(h:number){
  const ey=h%4,mo=h%3,ant=h%3===0,ear=h%2===0;
  let s='';
  const heads=[`<rect x="24" y="22" width="52" height="52" rx="16" fill="white" opacity="0.2"/>`,
    `<circle cx="50" cy="48" r="26" fill="white" opacity="0.2"/>`,
    `<rect x="26" y="18" width="48" height="56" rx="18" fill="white" opacity="0.2"/>`,
    `<rect x="20" y="24" width="60" height="48" rx="14" fill="white" opacity="0.2"/>`];
  s+=heads[h%heads.length];
  const Y=42;
  if(ey===0){s+=`<circle cx="40" cy="${Y}" r="4.5" fill="white"/><circle cx="60" cy="${Y}" r="4.5" fill="white"/><circle cx="41.5" cy="${Y-0.5}" r="1.8" fill="rgba(0,0,0,0.5)"/><circle cx="61.5" cy="${Y-0.5}" r="1.8" fill="rgba(0,0,0,0.5)"/>`;}
  else if(ey===1){s+=`<circle cx="40" cy="${Y}" r="3" fill="white"/><circle cx="60" cy="${Y}" r="3" fill="white"/>`;}
  else if(ey===2){s+=`<path d="M36 ${Y} Q40 ${Y-4} 44 ${Y}" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M56 ${Y} Q60 ${Y-4} 64 ${Y}" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;}
  else{s+=`<text x="40" y="${Y+4}" text-anchor="middle" fill="white" font-size="10">✦</text><text x="60" y="${Y+4}" text-anchor="middle" fill="white" font-size="10">✦</text>`;}
  const mY=56;
  if(mo===0)s+=`<path d="M43 ${mY} Q50 ${mY+6} 57 ${mY}" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  else if(mo===1)s+=`<circle cx="50" cy="${mY+2}" r="3" fill="white" opacity="0.6"/>`;
  else s+=`<line x1="44" y1="${mY+2}" x2="56" y2="${mY+2}" stroke="white" stroke-width="2" stroke-linecap="round"/>`;
  if(ant){s+=`<line x1="50" y1="22" x2="50" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="50" cy="10" r="3" fill="white" opacity="0.8"/>`;}
  if(ear){s+=`<circle cx="20" cy="44" r="5" fill="white" opacity="0.2"/><circle cx="80" cy="44" r="5" fill="white" opacity="0.2"/>`;}
  if(h%5===0){s+=`<circle cx="34" cy="52" r="4" fill="white" opacity="0.15"/><circle cx="66" cy="52" r="4" fill="white" opacity="0.15"/>`;}
  return s;
}
function genPattern(h:number){
  const p=h%6;let s='';
  if(p===0){for(let i=0;i<5;i++){s+=`<circle cx="${(10+seededR(h,i*2)*80).toFixed(1)}" cy="${(10+seededR(h,i*2+1)*80).toFixed(1)}" r="${(2+seededR(h,i+10)*4).toFixed(1)}" fill="white" opacity="0.08"/>`;}
  }else if(p===1){s+=`<line x1="0" y1="100" x2="100" y2="0" stroke="white" stroke-width="0.5" opacity="0.1"/><line x1="20" y1="100" x2="100" y2="20" stroke="white" stroke-width="0.5" opacity="0.06"/>`;}
  else if(p===2){s+=`<circle cx="0" cy="0" r="30" fill="white" opacity="0.06"/><circle cx="100" cy="100" r="20" fill="white" opacity="0.06"/>`;}
  else if(p===3){s+=`<rect x="0" y="80" width="100" height="20" fill="white" opacity="0.04"/>`;}
  else if(p===4){s+=`<text x="85" y="18" fill="white" opacity="0.12" font-size="12">✦</text><text x="10" y="90" fill="white" opacity="0.08" font-size="8">✦</text>`;}
  return s;
}
function clientAvatarSvg(name:string,element?:string|null){
  const h=hashS(`${name}`);
  const colors=element&&EL_COLORS[element]?EL_COLORS[element]:AVATAR_PALETTES[h%AVATAR_PALETTES.length];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${colors[1]}"/><stop offset="100%" style="stop-color:${colors[0]}"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#bg)"/>${genPattern(h>>4)}${genFace(h)}</svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

const ELEMENT_EMOJI: Record<string, string> = { '金': '✨', '木': '🌿', '水': '💧', '火': '🔥', '土': '⛰️' };
const ELEMENT_STYLE: Record<string, string> = {
  '金': '果断坚定，言简意赅',
  '木': '温暖向上，关注成长',
  '水': '深邃灵动，富有哲思',
  '火': '热情奔放，充满感染力',
  '土': '沉稳包容，踏实可靠',
};

// ── Sync Rate Ring ────────────────────────────────────────
function SyncRateRing({ rate, size = 80 }: { rate: number; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 70 ? '#22c55e' : rate >= 40 ? '#eab308' : '#94a3b8';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" className="text-muted/20" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{rate}%</span>
      </div>
    </div>
  );
}

// ── Sync Breakdown ────────────────────────────────────────
function SyncBreakdown({ breakdown }: { breakdown: { memory: number; activity: number; approval: number; personality: number } }) {
  const items = [
    { label: '记忆丰富度', value: breakdown.memory, max: 30, icon: <Database className="w-3.5 h-3.5" /> },
    { label: '互动活跃度', value: breakdown.activity, max: 25, icon: <Activity className="w-3.5 h-3.5" /> },
    { label: '行为认可率', value: breakdown.approval, max: 25, icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { label: '人格完整度', value: breakdown.personality, max: 20, icon: <User className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-muted-foreground">{item.icon}</span>
          <span className="text-[11px] text-muted-foreground w-20 shrink-0">{item.label}</span>
          <Progress value={(item.value / item.max) * 100} className="flex-1 h-1.5" />
          <span className="text-[10px] text-muted-foreground w-10 text-right">{item.value}/{item.max}</span>
        </div>
      ))}
    </div>
  );
}

// ── Memory Slot Indicator ─────────────────────────────────
function MemorySlotBar({ used, total }: { used: number; total: number }) {
  const pct = (used / total) * 100;
  const color = pct >= 90 ? 'text-red-500' : pct >= 70 ? 'text-yellow-500' : 'text-primary';
  return (
    <div className="flex items-center gap-2">
      <Database className={`w-3.5 h-3.5 ${color}`} />
      <Progress value={pct} className="flex-1 h-1.5" />
      <span className={`text-[11px] font-medium ${color}`}>{used}/{total}</span>
    </div>
  );
}

function AvatarSetup({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [sliderPraise, setSliderPraise] = useState(50);
  const [sliderSerious, setSliderSerious] = useState(50);
  const [sliderWarm, setSliderWarm] = useState(50);
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/avatar", { name, bio, sliderPraise, sliderSerious, sliderWarm });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/avatar"] });
      toast({ title: "分身创建成功", description: "你的AI分身已激活" });
      onCreated();
    },
    onError: () => toast({ title: "创建失败", variant: "destructive" }),
  });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Zap className="w-12 h-12 mx-auto text-primary" />
        <h2 className="text-xl font-bold">创建你的 AI 分身</h2>
        <p className="text-muted-foreground text-sm">
          你的分身会学习你的风格，自动在社区浏览、点赞、评论。
          五行命格作为性格底色，你可以用滑块微调。
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div>
            <label className="text-sm font-medium mb-1 block">分身名称</label>
            <Input placeholder="给你的分身起个名字" value={name} onChange={e => setName(e.target.value)} maxLength={20} data-testid="avatar-name-input" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">简介</label>
            <Textarea placeholder="简单介绍你自己，分身会学习这些信息" value={bio} onChange={e => setBio(e.target.value)} maxLength={200} rows={3} data-testid="avatar-bio-input" />
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-medium flex items-center gap-2"><Sparkles className="w-4 h-4" /> 性格调节</h3>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>🔥 锐评</span><span>💖 夸夸</span>
              </div>
              <Slider value={[sliderPraise]} onValueChange={v => setSliderPraise(v[0])} min={0} max={100} step={1} data-testid="slider-praise" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>🎭 抽象</span><span>📐 正经</span>
              </div>
              <Slider value={[sliderSerious]} onValueChange={v => setSliderSerious(v[0])} min={0} max={100} step={1} data-testid="slider-serious" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>🧊 高冷</span><span>🌟 显眼</span>
              </div>
              <Slider value={[sliderWarm]} onValueChange={v => setSliderWarm(v[0])} min={0} max={100} step={1} data-testid="slider-warm" />
            </div>
          </div>

          <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending} data-testid="create-avatar-btn">
            {createMutation.isPending ? "创建中..." : "激活分身 ⚡"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AvatarDashboard({ avatar, memories, recentActions }: { avatar: any; memories: any[]; recentActions: any[] }) {
  const { toast } = useToast();
  const [memCategory, setMemCategory] = useState("interest");
  const [memContent, setMemContent] = useState("");
  const [chatTargetId, setChatTargetId] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string; content: string}[]>([]);

  // Daily summary (includes all-time stats)
  const { data: summary } = useQuery({
    queryKey: ["/api/avatar/daily-summary"],
    queryFn: () => apiRequest("GET", "/api/avatar/daily-summary").then(r => r.json()),
    refetchInterval: 60000, // Refresh every minute to catch auto-browse updates
  });

  // Actions
  const { data: actions } = useQuery({
    queryKey: ["/api/avatar/actions"],
    queryFn: () => apiRequest("GET", "/api/avatar/actions").then(r => r.json()),
    refetchInterval: 60000,
  });

  // Notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/avatar/notifications"],
    queryFn: () => apiRequest("GET", "/api/avatar/notifications").then(r => r.json()),
    refetchInterval: 30000, // Check notifications every 30 seconds
  });

  const markReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/avatar/notifications/read"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/avatar/notifications"] }),
  });

  // Browse trigger
  const browseMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/avatar/browse").then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/avatar/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/avatar/daily-summary"] });
      toast({ title: "浏览完成", description: data.message });
    },
    onError: () => toast({ title: "浏览失败", variant: "destructive" }),
  });

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/avatar/toggle").then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/avatar"] });
      toast({ title: avatar.isActive ? "分身已暂停" : "分身已激活" });
    },
  });

  // Add memory
  const addMemMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/avatar/memories", { category: memCategory, content: memContent, weight: 5 }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/avatar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/avatar/daily-summary"] });
      setMemContent("");
      toast({ title: "记忆已添加" });
    },
  });

  // Delete memory
  const delMemMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/avatar/memories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/avatar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/avatar/daily-summary"] });
    },
  });

  // Prune memories
  const pruneMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/avatar/memories/prune").then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/avatar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/avatar/daily-summary"] });
      toast({ title: `已清理 ${data.pruned} 条低权重记忆`, description: `剩余 ${data.remaining} 条` });
    },
  });

  // Chat with avatar
  const chatMutation = useMutation({
    mutationFn: async () => {
      if (!chatTargetId.trim()) throw new Error("请输入用户ID");
      const resp = await apiRequest("POST", `/api/avatar/${chatTargetId}/chat`, { message: chatMessage });
      return resp.json();
    },
    onSuccess: (data) => {
      setChatHistory(prev => [
        ...prev,
        { role: "visitor", content: chatMessage },
        { role: "avatar", content: data.reply },
      ]);
      setChatMessage("");
    },
    onError: (e: any) => {
      console.error("Avatar chat error:", e);
      // Show inline fallback instead of blocking toast
      setChatHistory(prev => [...prev,
        { role: "avatar", content: "分身现在有点忙，稍后再试试吧～" },
      ]);
    },
  });

  // Approve action
  const approveMutation = useMutation({
    mutationFn: (params: { id: string; approved: boolean }) =>
      apiRequest("POST", `/api/avatar/actions/${params.id}/approve`, { approved: params.approved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/avatar/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/avatar/daily-summary"] });
    },
  });

  const actionList = actions || recentActions;
  const syncRate = summary?.syncRate ?? 0;

  return (
    <div className="space-y-4 overflow-hidden">
      {/* Header card with sync rate */}
      <Card className="border-primary/20 overflow-hidden">
        <CardContent className="pt-4 px-3">
          <div className="flex items-center gap-3">
            <img src={clientAvatarSvg(avatar.name, avatar.element)} alt={avatar.name}
              className="w-12 h-12 rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base truncate">{avatar.name}</h2>
                <Badge variant={avatar.isActive ? "default" : "secondary"} className="text-[10px] shrink-0">
                  {avatar.isActive ? "运行中" : "已暂停"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {avatar.element ? `${ELEMENT_EMOJI[avatar.element]} ${avatar.element} — ${ELEMENT_STYLE[avatar.element] || ''}` : '你的AI分身'}
              </p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <div className="relative">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markReadMutation.mutate()} data-testid="notification-bell">
                  <Bell className="w-4 h-4" />
                </Button>
                {(summary?.unreadNotifications || 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {summary.unreadNotifications}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleMutation.mutate()} data-testid="toggle-avatar-btn">
                {avatar.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          {avatar.bio && <p className="text-sm text-muted-foreground mt-2">{avatar.bio}</p>}
          
          {/* Sync rate + daily stats */}
          <div className="mt-3">
            <div className="flex items-center gap-3 mb-2">
              <SyncRateRing rate={syncRate} size={56} />
              <div className="text-[11px] text-muted-foreground">
                同步率 — 分身与你的契合程度
              </div>
            </div>
            <div className="flex gap-1.5 text-center">
              {[
                { val: summary?.stats?.totalBrowsed || 0, label: '浏览' },
                { val: summary?.stats?.likes || 0, label: '点赞' },
                { val: summary?.stats?.comments || 0, label: '评论' },
                { val: summary?.memorySlots?.used || 0, label: '记忆' },
              ].map(s => (
                <div key={s.label} className="flex-1 bg-muted/50 rounded p-1.5">
                  <div className="text-xs font-bold">{s.val}</div>
                  <div className="text-[9px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sync breakdown */}
          {summary?.syncBreakdown && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
              <SyncBreakdown breakdown={summary.syncBreakdown} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="w-full flex h-9">
          <TabsTrigger value="activity" className="flex-1 text-xs px-1" data-testid="tab-activity">动态</TabsTrigger>
          <TabsTrigger value="memory" className="flex-1 text-xs px-1" data-testid="tab-memory">记忆</TabsTrigger>
          <TabsTrigger value="chat" className="flex-1 text-xs px-1" data-testid="tab-chat">对话</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 text-xs px-1" data-testid="tab-settings">设置</TabsTrigger>
        </TabsList>

        {/* Activity feed */}
        <TabsContent value="activity" className="space-y-3">
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={() => browseMutation.mutate()} disabled={browseMutation.isPending || !avatar.isActive} data-testid="browse-btn">
              <RefreshCw className={`w-4 h-4 mr-2 ${browseMutation.isPending ? 'animate-spin' : ''}`} />
              {browseMutation.isPending ? "浏览中..." : "让分身浏览社区"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">分身每 30 分钟自动浏览一次，也可以手动触发</p>

          {/* Notifications */}
          {notifications.length > 0 && (
            <Card className="border-orange-500/20 bg-orange-500/5">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-medium">分身通知</span>
                  {notifications.filter((n: any) => !n.read).length > 0 && (
                    <Badge variant="destructive" className="text-[9px] h-4">
                      {notifications.filter((n: any) => !n.read).length} 新
                    </Badge>
                  )}
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {notifications.slice(0, 5).map((n: any, i: number) => (
                    <p key={i} className={`text-[11px] ${n.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                      {n.type === 'chat' ? '💬' : n.type === 'auto_browse' ? '🤖' : '🔔'} {n.message}
                      <span className="text-muted-foreground ml-1">{new Date(n.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inner thoughts */}
          {summary?.thoughts?.length > 0 && (
            <Card className="border-dashed">
              <CardHeader className="py-2 px-4"><CardTitle className="text-sm">💭 今日内心OS</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3">
                {summary.thoughts.map((t: string, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground italic">"{t}"</p>
                ))}
              </CardContent>
            </Card>
          )}

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {(actionList || []).map((a: any) => (
                <Card key={a.id} className="border-muted">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {a.actionType === 'like' && <ThumbsUp className="w-4 h-4 text-pink-500" />}
                        {a.actionType === 'comment' && <MessageCircle className="w-4 h-4 text-blue-500" />}
                        {a.actionType === 'browse' && <Eye className="w-4 h-4 text-gray-500" />}
                        {a.actionType === 'skip' && <SkipForward className="w-4 h-4 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">
                            {a.actionType === 'like' && '点赞'}
                            {a.actionType === 'comment' && '评论'}
                            {a.actionType === 'skip' && '跳过'}
                          </span>
                          {a.isApproved === null && a.actionType === 'comment' && (
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-[10px]">待审核</Badge>
                              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-green-600"
                                onClick={() => approveMutation.mutate({ id: a.id, approved: true })}>
                                ✓
                              </Button>
                              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-red-500"
                                onClick={() => approveMutation.mutate({ id: a.id, approved: false })}>
                                ✗
                              </Button>
                            </div>
                          )}
                          {a.isApproved === true && <Badge variant="secondary" className="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">已认可</Badge>}
                          {a.isApproved === false && <Badge variant="secondary" className="text-[9px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">已拒绝</Badge>}
                          <span className="text-[10px] text-muted-foreground ml-auto">{new Date(a.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {a.post && <p className="text-xs text-muted-foreground truncate mt-0.5">📄 {a.post.content}</p>}
                        {a.content && <p className="text-xs mt-1 bg-muted/50 rounded p-1.5">💬 {a.content}</p>}
                        {a.innerThought && <p className="text-[10px] text-muted-foreground italic mt-0.5">💭 {a.innerThought}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!actionList || actionList.length === 0) && (
                <div className="text-center text-muted-foreground text-sm py-10">
                  分身还没有任何活动，点击上方按钮让它浏览社区吧
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Memory tab with slot management */}
        <TabsContent value="memory" className="space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-3">
              {/* Memory slot indicator */}
              {summary?.memorySlots && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">记忆槽位</p>
                    {summary.memorySlots.used > 100 && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-orange-600" onClick={() => pruneMutation.mutate()}>
                        清理低权重记忆
                      </Button>
                    )}
                  </div>
                  <MemorySlotBar used={summary.memorySlots.used} total={summary.memorySlots.total} />
                </div>
              )}

              <p className="text-xs text-muted-foreground">告诉分身关于你的事，它会学习并融入互动风格中。每条记忆可设置权重(1-10)。</p>
              <div className="flex gap-2">
                <select value={memCategory} onChange={e => setMemCategory(e.target.value)} className="text-xs border rounded px-2 py-1 bg-background" data-testid="mem-category-select">
                  <option value="interest">兴趣爱好</option>
                  <option value="style">表达风格</option>
                  <option value="opinion">观点立场</option>
                  <option value="fact">个人事实</option>
                  <option value="preference">偏好习惯</option>
                </select>
                <Input placeholder="输入记忆内容..." value={memContent} onChange={e => setMemContent(e.target.value)} className="flex-1 text-sm" data-testid="mem-content-input" />
                <Button size="icon" variant="outline" onClick={() => addMemMutation.mutate()} disabled={!memContent.trim() || addMemMutation.isPending} data-testid="add-mem-btn">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="h-[350px]">
            <div className="space-y-1.5">
              {(memories || []).map((m: any) => (
                <Card key={m.id} className="border-muted">
                  <CardContent className="py-2 px-3 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0">{m.category}</Badge>
                    <p className="text-xs flex-1">{m.content}</p>
                    <span className="text-[9px] text-muted-foreground shrink-0">w:{m.weight}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => delMemMutation.mutate(m.id)} data-testid={`del-mem-${m.id}`}>
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {(!memories || memories.length === 0) && (
                <div className="text-center text-muted-foreground text-sm py-10">
                  还没有记忆，添加一些让分身更了解你吧
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Chat tab — chat with others' avatars */}
        <TabsContent value="chat" className="space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs text-muted-foreground">输入用户ID，和他们的AI分身对话。也可以去分身广场直接发起对话。</p>
              <div className="flex gap-2">
                <Input placeholder="目标用户ID" value={chatTargetId} onChange={e => setChatTargetId(e.target.value)} className="flex-1 text-sm" data-testid="chat-target-input" />
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="h-[280px]">
            <div className="space-y-2 px-1">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'visitor' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'visitor'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}>
                    {msg.role === 'avatar' && <Badge variant="outline" className="text-[9px] mb-1 border-blue-400 text-blue-600 dark:text-blue-400">AI 分身</Badge>}
                    <p className="text-xs">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Input placeholder="说点什么..." value={chatMessage} onChange={e => setChatMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && chatMessage.trim()) chatMutation.mutate(); }}
              className="flex-1" data-testid="chat-msg-input" />
            <Button size="icon" onClick={() => chatMutation.mutate()} disabled={!chatMessage.trim() || chatMutation.isPending} data-testid="chat-send-btn">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </TabsContent>

        {/* Settings tab */}
        <TabsContent value="settings" className="space-y-3">
          <AvatarSettings avatar={avatar} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AvatarSettings({ avatar }: { avatar: any }) {
  const [name, setName] = useState(avatar.name);
  const [bio, setBio] = useState(avatar.bio || "");
  const [sliderPraise, setSliderPraise] = useState(avatar.sliderPraise);
  const [sliderSerious, setSliderSerious] = useState(avatar.sliderSerious);
  const [sliderWarm, setSliderWarm] = useState(avatar.sliderWarm);
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/avatar", { name, bio, sliderPraise, sliderSerious, sliderWarm }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/avatar"] });
      toast({ title: "分身设置已更新" });
    },
  });

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">分身名称</label>
          <Input value={name} onChange={e => setName(e.target.value)} maxLength={20} data-testid="settings-name-input" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">简介</label>
          <Textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={200} rows={2} data-testid="settings-bio-input" />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">性格调节</h3>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground"><span>🔥 锐评</span><span>💖 夸夸</span></div>
            <Slider value={[sliderPraise]} onValueChange={v => setSliderPraise(v[0])} min={0} max={100} step={1} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground"><span>🎭 抽象</span><span>📐 正经</span></div>
            <Slider value={[sliderSerious]} onValueChange={v => setSliderSerious(v[0])} min={0} max={100} step={1} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground"><span>🧊 高冷</span><span>🌟 显眼</span></div>
            <Slider value={[sliderWarm]} onValueChange={v => setSliderWarm(v[0])} min={0} max={100} step={1} />
          </div>
        </div>

        <Button className="w-full" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} data-testid="update-avatar-btn">
          {updateMutation.isPending ? "保存中..." : "保存设置"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AvatarPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/avatar"],
    queryFn: () => apiRequest("GET", "/api/avatar").then(r => r.json()),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!data || !data.avatar) {
    return <AvatarSetup onCreated={() => queryClient.invalidateQueries({ queryKey: ["/api/avatar"] })} />;
  }

  return (
    <div className="max-w-lg mx-auto pb-20 px-3 overflow-x-hidden">
      <AvatarDashboard avatar={data.avatar} memories={data.memories || []} recentActions={data.recentActions || []} />
    </div>
  );
}
