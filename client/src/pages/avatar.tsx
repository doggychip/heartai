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
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Brain, MessageCircle, ThumbsUp, Eye, SkipForward, Send,
  RefreshCw, Power, PowerOff, Plus, Trash2, Sparkles,
} from "lucide-react";

const ELEMENT_EMOJI: Record<string, string> = { '金': '✨', '木': '🌿', '水': '💧', '火': '🔥', '土': '⛰️' };
const ELEMENT_STYLE: Record<string, string> = {
  '金': '果断坚定，言简意赅',
  '木': '温暖向上，关注成长',
  '水': '深邃灵动，富有哲思',
  '火': '热情奔放，充满感染力',
  '土': '沉稳包容，踏实可靠',
};

function AvatarSetup({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [sliderPraise, setSliderPraise] = useState(50);
  const [sliderSerious, setSliderSerious] = useState(50);
  const [sliderWarm, setSliderWarm] = useState(50);
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/avatar", {
        method: "POST",
        body: JSON.stringify({ name, bio, sliderPraise, sliderSerious, sliderWarm }),
        headers: { "Content-Type": "application/json" },
      });
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

  // Daily summary
  const { data: summary } = useQuery({
    queryKey: ["/api/avatar/daily-summary"],
    queryFn: () => apiRequest("/api/avatar/daily-summary").then(r => r.json()),
  });

  // Actions
  const { data: actions, refetch: refetchActions } = useQuery({
    queryKey: ["/api/avatar/actions"],
    queryFn: () => apiRequest("/api/avatar/actions").then(r => r.json()),
  });

  // Browse trigger
  const browseMutation = useMutation({
    mutationFn: () => apiRequest("/api/avatar/browse", { method: "POST" }).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/avatar/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/avatar/daily-summary"] });
      toast({ title: "浏览完成", description: data.message });
    },
    onError: () => toast({ title: "浏览失败", variant: "destructive" }),
  });

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: () => apiRequest("/api/avatar/toggle", { method: "POST" }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/avatar"] });
      toast({ title: avatar.isActive ? "分身已暂停" : "分身已激活" });
    },
  });

  // Add memory
  const addMemMutation = useMutation({
    mutationFn: () => apiRequest("/api/avatar/memories", {
      method: "POST",
      body: JSON.stringify({ category: memCategory, content: memContent, weight: 5 }),
      headers: { "Content-Type": "application/json" },
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/avatar"] });
      setMemContent("");
      toast({ title: "记忆已添加" });
    },
  });

  // Delete memory
  const delMemMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/avatar/memories/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/avatar"] }),
  });

  // Chat with avatar
  const chatMutation = useMutation({
    mutationFn: async () => {
      if (!chatTargetId.trim()) throw new Error("请输入用户ID");
      const resp = await apiRequest(`/api/avatar/${chatTargetId}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: chatMessage }),
        headers: { "Content-Type": "application/json" },
      });
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
    onError: (e: any) => toast({ title: "对话失败", description: e.message, variant: "destructive" }),
  });

  const actionList = actions || recentActions;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                {avatar.element ? (ELEMENT_EMOJI[avatar.element] || '⚡') : '⚡'}
              </div>
              <div>
                <h2 className="font-bold text-lg">{avatar.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {avatar.element && <span>{ELEMENT_EMOJI[avatar.element]} {avatar.element} — {ELEMENT_STYLE[avatar.element] || ''}</span>}
                  {!avatar.element && '你的AI分身'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={avatar.isActive ? "default" : "secondary"}>
                {avatar.isActive ? "运行中" : "已暂停"}
              </Badge>
              <Button variant="ghost" size="icon" onClick={() => toggleMutation.mutate()} data-testid="toggle-avatar-btn">
                {avatar.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          {avatar.bio && <p className="text-sm text-muted-foreground mt-2">{avatar.bio}</p>}
          
          {/* Daily stats */}
          {summary && (
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <div className="bg-muted/50 rounded p-2">
                <div className="text-lg font-bold">{summary.stats?.totalBrowsed || 0}</div>
                <div className="text-[10px] text-muted-foreground">浏览</div>
              </div>
              <div className="bg-muted/50 rounded p-2">
                <div className="text-lg font-bold">{summary.stats?.likes || 0}</div>
                <div className="text-[10px] text-muted-foreground">点赞</div>
              </div>
              <div className="bg-muted/50 rounded p-2">
                <div className="text-lg font-bold">{summary.stats?.comments || 0}</div>
                <div className="text-[10px] text-muted-foreground">评论</div>
              </div>
              <div className="bg-muted/50 rounded p-2">
                <div className="text-lg font-bold">{summary.memoryCount || 0}</div>
                <div className="text-[10px] text-muted-foreground">记忆</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="activity" data-testid="tab-activity">动态</TabsTrigger>
          <TabsTrigger value="memory" data-testid="tab-memory">记忆</TabsTrigger>
          <TabsTrigger value="chat" data-testid="tab-chat">对话</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">设置</TabsTrigger>
        </TabsList>

        {/* Activity feed */}
        <TabsContent value="activity" className="space-y-3">
          <Button className="w-full" variant="outline" onClick={() => browseMutation.mutate()} disabled={browseMutation.isPending || !avatar.isActive} data-testid="browse-btn">
            <RefreshCw className={`w-4 h-4 mr-2 ${browseMutation.isPending ? 'animate-spin' : ''}`} />
            {browseMutation.isPending ? "浏览中..." : "让分身浏览社区"}
          </Button>

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
                            <Badge variant="outline" className="text-[10px]">待审核</Badge>
                          )}
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

        {/* Memory tab */}
        <TabsContent value="memory" className="space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs text-muted-foreground">告诉分身关于你的事，它会学习并融入互动风格中。</p>
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
              <p className="text-xs text-muted-foreground">输入用户ID，和他们的AI分身对话。</p>
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
                    {msg.role === 'avatar' && <Badge variant="outline" className="text-[9px] mb-1">AI 分身</Badge>}
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
    mutationFn: () => apiRequest("/api/avatar", {
      method: "POST",
      body: JSON.stringify({ name, bio, sliderPraise, sliderSerious, sliderWarm }),
      headers: { "Content-Type": "application/json" },
    }),
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
    queryFn: () => apiRequest("/api/avatar").then(r => r.json()),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!data || !data.avatar) {
    return <AvatarSetup onCreated={() => queryClient.invalidateQueries({ queryKey: ["/api/avatar"] })} />;
  }

  return (
    <div className="max-w-lg mx-auto pb-20">
      <AvatarDashboard avatar={data.avatar} memories={data.memories || []} recentActions={data.recentActions || []} />
    </div>
  );
}
