// Child Development Tracker — integrated into HeartAI with AI companion
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import SparkMap, { DOMAINS } from "@/components/SparkMap";
import type { SparkScore } from "@/components/SparkMap";
import {
  Plus, Baby, Target, Calendar, Trophy, BookOpen, Sparkles,
  Heart, Brain, MessageCircle, Palette, Dumbbell, Star,
  TrendingUp, Trash2, ChevronRight, Lightbulb, Wand2, X,
  Users, Pencil,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
interface Child { id: string; userId: string; name: string; birthDate: string | null; avatarColor: string | null; notes: string | null; }
interface Goal { id: string; childId: string; category: string; title: string; description: string | null; targetDate: string | null; status: string; progress: number; }
interface Milestone { id: string; childId: string; title: string; description: string | null; category: string | null; achievedDate: string | null; }
interface DailyLog { id: string; childId: string; date: string; mood: string | null; sleepHours: number | null; notes: string | null; highlights: string[] | null; }
interface LearningStory { id: string; childId: string; title: string; narrative: string; domains: string[]; date: string; }
interface SparkScoreEntry { id: string; childId: string; date: string; cognitive: number; language: number; socialEmotional: number; physical: number; creative: number; independence: number; }
interface WeeklyReflection { id: string; childId: string; weekStart: string; proudestMoment: string | null; biggestChallenge: string | null; focusNextWeek: string | null; parentNotes: string | null; }
interface Insight { id: string; childId: string; insightType: string; content: { title: string; body: string; suggestions: string[]; domain?: string }; isRead: boolean; agentId?: string; createdAt: string; }
interface MilestoneLib { id: string; ageMin: number; ageMax: number; domain: string; title: string; description: string | null; }

const DOMAIN_OPTIONS = [
  { value: "cognitive", label: "认知", icon: Brain, color: "#3b82f6" },
  { value: "language", label: "语言", icon: MessageCircle, color: "#8b5cf6" },
  { value: "social-emotional", label: "社交情感", icon: Heart, color: "#ec4899" },
  { value: "physical", label: "体能", icon: Dumbbell, color: "#10b981" },
  { value: "creative", label: "创意", icon: Palette, color: "#f59e0b" },
  { value: "independence", label: "独立性", icon: Star, color: "#ef4444" },
];

const MOOD_OPTIONS = [
  { emoji: "😊", label: "开心" }, { emoji: "😌", label: "平静" },
  { emoji: "😤", label: "烦躁" }, { emoji: "😢", label: "难过" },
  { emoji: "😴", label: "疲惫" }, { emoji: "🤩", label: "兴奋" },
  { emoji: "😰", label: "焦虑" }, { emoji: "🥰", label: "幸福" },
];

function getAge(birthDate: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const now = new Date();
  const y = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  const ay = m < 0 ? y - 1 : y;
  const am = m < 0 ? m + 12 : m;
  if (ay === 0) return `${am}个月`;
  if (am === 0) return `${ay}岁`;
  return `${ay}岁${am}个月`;
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ChildTrackerPage() {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBirth, setNewBirth] = useState("");
  const [newColor, setNewColor] = useState("#8b5cf6");

  const { data: kids = [] } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  const addChildMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/children", data);
      return res.json();
    },
    onSuccess: (child: Child) => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setSelectedChildId(child.id);
      setShowAddChild(false);
      setNewName(""); setNewBirth(""); setNewColor("#8b5cf6");
    },
  });

  const deleteChildMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/children/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setSelectedChildId(null);
    },
  });

  const selectedChild = kids.find(k => k.id === selectedChildId) || null;

  // If no child selected but we have kids, auto-select first
  if (!selectedChildId && kids.length > 0) {
    setSelectedChildId(kids[0].id);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Baby className="w-5 h-5 text-violet-500" /> 成长记录
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">记录每个孩子的成长旅程</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAddChild(true)}>
          <Plus className="w-4 h-4 mr-1" /> 添加孩子
        </Button>
      </div>

      {/* Add Child Form */}
      {showAddChild && (
        <Card className="p-4 space-y-3 border-violet-200 dark:border-violet-800">
          <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm" placeholder="孩子的名字" value={newName} onChange={e => setNewName(e.target.value)} />
          <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm" type="date" value={newBirth} onChange={e => setNewBirth(e.target.value)} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">颜色:</span>
            {["#8b5cf6", "#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#ef4444"].map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full border-2 ${newColor === c ? "border-foreground" : "border-transparent"}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddChild(false)}>取消</Button>
            <Button className="flex-1" disabled={!newName.trim() || addChildMut.isPending}
              onClick={() => addChildMut.mutate({ name: newName, birthDate: newBirth || null, avatarColor: newColor })}>
              保存
            </Button>
          </div>
        </Card>
      )}

      {/* Child Selector */}
      {kids.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {kids.map(kid => (
            <button key={kid.id} onClick={() => setSelectedChildId(kid.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all shrink-0 ${
                selectedChildId === kid.id ? "border-violet-500 bg-violet-500/5 shadow-sm" : "border-border hover:bg-accent"
              }`}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: kid.avatarColor || "#8b5cf6" }}>
                {getInitials(kid.name)}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{kid.name}</p>
                {kid.birthDate && <p className="text-[10px] text-muted-foreground">{getAge(kid.birthDate)}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No children state */}
      {kids.length === 0 && !showAddChild && (
        <Card className="p-8 text-center">
          <Baby className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">还没有记录孩子</p>
          <p className="text-xs text-muted-foreground mt-1">添加您的第一个孩子，开始记录成长之旅</p>
          <Button className="mt-4" onClick={() => setShowAddChild(true)}>
            <Plus className="w-4 h-4 mr-1" /> 添加孩子
          </Button>
        </Card>
      )}

      {/* Child Detail */}
      {selectedChild && <ChildPanel child={selectedChild} onDelete={() => deleteChildMut.mutate(selectedChild.id)} />}
    </div>
  );
}

// ─── Child Panel with Tabs ────────────────────────────────────
function ChildPanel({ child, onDelete }: { child: Child; onDelete: () => void }) {
  const childId = child.id;
  const themeColor = child.avatarColor || "#8b5cf6";

  const { data: stories = [] } = useQuery<LearningStory[]>({ queryKey: [`/api/children/${childId}/stories`] });
  const { data: sparkScores = [] } = useQuery<SparkScoreEntry[]>({ queryKey: [`/api/children/${childId}/spark-scores`] });
  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: [`/api/children/${childId}/goals`] });
  const { data: milestones = [] } = useQuery<Milestone[]>({ queryKey: [`/api/children/${childId}/milestones`] });
  const { data: logs = [] } = useQuery<DailyLog[]>({ queryKey: [`/api/children/${childId}/daily-log`] });
  const { data: reflections = [] } = useQuery<WeeklyReflection[]>({ queryKey: [`/api/children/${childId}/reflections`] });
  const { data: insights = [] } = useQuery<Insight[]>({ queryKey: [`/api/children/${childId}/insights`] });

  const latestSpark = sparkScores.length > 0 ? sparkScores[0] : null;
  const sparkData: SparkScore | null = latestSpark ? {
    cognitive: latestSpark.cognitive, language: latestSpark.language,
    socialEmotional: latestSpark.socialEmotional, physical: latestSpark.physical,
    creative: latestSpark.creative, independence: latestSpark.independence,
  } : null;

  return (
    <Tabs defaultValue="insights" className="space-y-4">
      <TabsList className="grid grid-cols-4 w-full">
        <TabsTrigger value="insights" className="text-xs gap-1"><Wand2 className="w-3 h-3" /> AI顾问</TabsTrigger>
        <TabsTrigger value="stories" className="text-xs gap-1"><BookOpen className="w-3 h-3" /> 故事</TabsTrigger>
        <TabsTrigger value="spark" className="text-xs gap-1"><Sparkles className="w-3 h-3" /> 画像</TabsTrigger>
        <TabsTrigger value="goals" className="text-xs gap-1"><Target className="w-3 h-3" /> 目标</TabsTrigger>
      </TabsList>

      {/* AI Insights Tab */}
      <TabsContent value="insights" className="space-y-4">
        <AICompanion childId={childId} childName={child.name} insights={insights} sparkData={sparkData} themeColor={themeColor} />
      </TabsContent>

      {/* Stories Tab */}
      <TabsContent value="stories" className="space-y-4">
        <StoriesPanel childId={childId} stories={stories} childName={child.name} themeColor={themeColor} />
      </TabsContent>

      {/* Spark Map Tab */}
      <TabsContent value="spark" className="space-y-4">
        <SparkPanel childId={childId} sparkScores={sparkScores} sparkData={sparkData} childName={child.name} themeColor={themeColor} />
      </TabsContent>

      {/* Goals Tab */}
      <TabsContent value="goals" className="space-y-4">
        <GoalsPanel childId={childId} goals={goals} milestones={milestones} themeColor={themeColor} />
      </TabsContent>
    </Tabs>
  );
}

// ─── AI Companion Panel ───────────────────────────────────────
function AICompanion({ childId, childName, insights, sparkData, themeColor }: {
  childId: string; childName: string; insights: Insight[]; sparkData: SparkScore | null; themeColor: string;
}) {
  const generateMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/children/${childId}/insights/generate`);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/insights`] }); },
  });

  const unreadInsights = insights.filter(i => !i.isRead);

  return (
    <div className="space-y-4">
      {/* AI Header */}
      <Card className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200 dark:border-violet-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center text-white shrink-0">
            <Wand2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">育儿顾问 AI</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              基于{childName}的成长数据，为您提供个性化发展洞察和活动建议
            </p>
            <Button size="sm" className="mt-2" onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
              <Lightbulb className="w-3.5 h-3.5 mr-1" />
              {generateMut.isPending ? "分析中..." : "生成新洞察"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Spark Overview */}
      {sparkData && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <h4 className="text-sm font-semibold">发展画像概览</h4>
          </div>
          <div className="flex justify-center">
            <SparkMap scores={sparkData} themeColor={themeColor} size={200} />
          </div>
        </Card>
      )}

      {/* Insights List */}
      {insights.length > 0 ? (
        <div className="space-y-3">
          {insights.map(insight => {
            const typeIcons: Record<string, any> = {
              activity_suggestion: Lightbulb,
              strength_analysis: TrendingUp,
              growth_opportunity: Target,
            };
            const typeLabels: Record<string, string> = {
              activity_suggestion: "活动建议",
              strength_analysis: "优势分析",
              growth_opportunity: "成长机会",
            };
            const typeColors: Record<string, string> = {
              activity_suggestion: "#3b82f6",
              strength_analysis: "#10b981",
              growth_opportunity: "#f59e0b",
            };
            const Icon = typeIcons[insight.insightType] || Lightbulb;
            const color = typeColors[insight.insightType] || "#8b5cf6";

            return (
              <Card key={insight.id} className={`p-4 ${!insight.isRead ? "border-violet-200 dark:border-violet-800" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: `${color}15`, color }}>
                        {typeLabels[insight.insightType] || insight.insightType}
                      </Badge>
                      {insight.agentId && <Badge variant="outline" className="text-[10px]">育儿顾问</Badge>}
                    </div>
                    <h4 className="font-medium text-sm mt-1">{insight.content.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.content.body}</p>
                    {insight.content.suggestions?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {insight.content.suggestions.map((s, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs">
                            <span className="text-violet-500 mt-0.5">✦</span>
                            <span className="text-muted-foreground">{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Lightbulb className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium">还没有 AI 洞察</p>
          <p className="text-xs text-muted-foreground mt-1">记录一些成长数据后，点击"生成新洞察"获取个性化建议</p>
        </Card>
      )}
    </div>
  );
}

// ─── Stories Panel ────────────────────────────────────────────
function StoriesPanel({ childId, stories, childName, themeColor }: {
  childId: string; stories: LearningStory[]; childName: string; themeColor: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [narrative, setNarrative] = useState("");
  const [domains, setDomains] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const addMut = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", `/api/children/${childId}/stories`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/stories`] }); setShowForm(false); setTitle(""); setNarrative(""); setDomains([]); },
  });
  const delMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/children/${childId}/stories/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/stories`] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">成长故事</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}><Plus className="w-3.5 h-3.5 mr-1" /> 新故事</Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3 border-violet-200 dark:border-violet-800">
          <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-medium" placeholder={`${childName}今天发生了什么？`} value={title} onChange={e => setTitle(e.target.value)} />
          <textarea className="w-full px-3 py-2 rounded-lg border bg-background text-sm min-h-[100px] resize-none" placeholder="讲述这个故事... 孩子做了什么？你观察到了什么？为什么这个时刻有意义？" value={narrative} onChange={e => setNarrative(e.target.value)} />
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">发展领域</p>
            <div className="flex flex-wrap gap-1.5">
              {DOMAIN_OPTIONS.map(d => (
                <button key={d.value} onClick={() => setDomains(prev => prev.includes(d.value) ? prev.filter(x => x !== d.value) : [...prev, d.value])}
                  className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 transition-all ${domains.includes(d.value) ? "text-white" : "bg-accent text-muted-foreground"}`}
                  style={domains.includes(d.value) ? { backgroundColor: d.color } : {}}>
                  <d.icon className="w-3 h-3" />{d.label}
                </button>
              ))}
            </div>
          </div>
          <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>取消</Button>
            <Button className="flex-1" disabled={!title || !narrative || addMut.isPending}
              onClick={() => addMut.mutate({ title, narrative, domains, date })}>保存故事</Button>
          </div>
        </Card>
      )}

      {stories.length === 0 && !showForm ? (
        <Card className="p-8 text-center">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium">还没有故事</p>
          <p className="text-xs text-muted-foreground mt-1">记录{childName}展现成长、好奇心或韧性的时刻</p>
        </Card>
      ) : (
        stories.map(story => (
          <Card key={story.id} className="overflow-hidden">
            <div className="h-1" style={{ backgroundColor: themeColor }} />
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-sm">{story.title}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(story.date).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}</p>
                </div>
                <button onClick={() => delMut.mutate(story.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{story.narrative}</p>
              {story.domains.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {story.domains.map(d => {
                    const dom = DOMAIN_OPTIONS.find(o => o.value === d);
                    return dom ? <Badge key={d} className="text-[10px] text-white" style={{ backgroundColor: dom.color }}>{dom.label}</Badge> : null;
                  })}
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Spark Map Panel ──────────────────────────────────────────
function SparkPanel({ childId, sparkScores, sparkData, childName, themeColor }: {
  childId: string; sparkScores: SparkScoreEntry[]; sparkData: SparkScore | null; childName: string; themeColor: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [scores, setScores] = useState({ cognitive: 5, language: 5, socialEmotional: 5, physical: 5, creative: 5, independence: 5 });

  const addMut = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", `/api/children/${childId}/spark-scores`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/spark-scores`] }); setShowForm(false); },
  });

  const prevSpark = sparkScores.length >= 2 ? sparkScores[1] : null;
  const prevData: SparkScore | null = prevSpark ? {
    cognitive: prevSpark.cognitive, language: prevSpark.language, socialEmotional: prevSpark.socialEmotional,
    physical: prevSpark.physical, creative: prevSpark.creative, independence: prevSpark.independence,
  } : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">发展画像</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}><TrendingUp className="w-3.5 h-3.5 mr-1" /> 更新</Button>
      </div>

      <Card className="p-4 flex justify-center">
        {sparkData ? (
          <SparkMap scores={sparkData} themeColor={themeColor}
            childName={sparkScores[0] ? new Date(sparkScores[0].date).toLocaleDateString("zh-CN", { month: "short" }) : undefined}
            compareScores={prevData}
            compareName={prevSpark ? `${new Date(prevSpark.date).toLocaleDateString("zh-CN", { month: "short" })} (上次)` : undefined}
            compareColor="#94a3b8" />
        ) : (
          <div className="text-center py-8 text-muted-foreground/50">
            <Sparkles className="w-10 h-10 mx-auto mb-3" />
            <p className="text-sm font-medium">还没有评分</p>
            <p className="text-xs mt-1">为{childName}的六大领域打分，生成发展画像</p>
          </div>
        )}
      </Card>

      {showForm && (
        <Card className="p-4 space-y-4 border-violet-200 dark:border-violet-800">
          <p className="text-xs text-muted-foreground">为每个领域打分 1-10。这不是成绩，而是{childName}当前的成长画像。</p>
          {DOMAINS.map(d => {
            const key = d.key as keyof typeof scores;
            return (
              <div key={d.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium" style={{ color: d.color }}>{d.label}</span>
                  <span className="text-xs font-bold" style={{ color: d.color }}>{scores[key]}</span>
                </div>
                <Slider min={1} max={10} step={1} value={[scores[key]]}
                  onValueChange={([v]) => setScores({ ...scores, [key]: v })}
                  className="w-full" />
                <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5"><span>萌芽</span><span>发展</span><span>强势</span></div>
              </div>
            );
          })}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>取消</Button>
            <Button className="flex-1" disabled={addMut.isPending}
              onClick={() => addMut.mutate({ ...scores, date: new Date().toISOString().split("T")[0] })}>保存画像</Button>
          </div>
        </Card>
      )}

      {sparkScores.length > 0 && (
        <div>
          <h4 className="font-semibold text-xs text-muted-foreground mb-2">历史记录</h4>
          <div className="space-y-2">
            {sparkScores.map(s => (
              <Card key={s.id} className="p-3">
                <p className="text-xs font-medium mb-1.5">{new Date(s.date).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}</p>
                <div className="grid grid-cols-6 gap-1">
                  {DOMAINS.map(d => (
                    <div key={d.key} className="text-center">
                      <div className="text-sm font-bold" style={{ color: d.color }}>{(s as any)[d.key] || 0}</div>
                      <div className="text-[8px] text-muted-foreground">{d.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Goals Panel ──────────────────────────────────────────────
function GoalsPanel({ childId, goals, milestones, themeColor }: {
  childId: string; goals: Goal[]; milestones: Milestone[]; themeColor: string;
}) {
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState("academic");
  const [showMsForm, setShowMsForm] = useState(false);
  const [msTitle, setMsTitle] = useState("");

  const CATEGORIES = [
    { value: "academic", label: "学业", color: "#3b82f6" },
    { value: "social", label: "社交", color: "#ec4899" },
    { value: "physical", label: "体能", color: "#10b981" },
    { value: "creative", label: "创意", color: "#f59e0b" },
    { value: "life-skills", label: "生活技能", color: "#8b5cf6" },
  ];

  const addGoalMut = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", `/api/children/${childId}/goals`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/goals`] }); setShowGoalForm(false); setGoalTitle(""); },
  });

  const updateGoalMut = useMutation({
    mutationFn: async ({ goalId, ...data }: any) => { const res = await apiRequest("PATCH", `/api/children/${childId}/goals/${goalId}`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/goals`] }); },
  });

  const addMsMut = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", `/api/children/${childId}/milestones`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/milestones`] }); setShowMsForm(false); setMsTitle(""); },
  });

  const activeGoals = goals.filter(g => g.status === "active");
  const completedGoals = goals.filter(g => g.status === "completed");

  return (
    <div className="space-y-4">
      {/* Goals Section */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-1.5"><Target className="w-4 h-4" /> 目标 ({activeGoals.length})</h3>
        <Button size="sm" variant="outline" onClick={() => setShowGoalForm(!showGoalForm)}><Plus className="w-3.5 h-3.5 mr-1" /> 新目标</Button>
      </div>

      {showGoalForm && (
        <Card className="p-4 space-y-3 border-violet-200 dark:border-violet-800">
          <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm" placeholder="目标名称" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} />
          <div className="flex gap-1.5">
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setGoalCategory(c.value)}
                className={`text-xs px-2.5 py-1 rounded-full ${goalCategory === c.value ? "text-white" : "bg-accent text-muted-foreground"}`}
                style={goalCategory === c.value ? { backgroundColor: c.color } : {}}>{c.label}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowGoalForm(false)}>取消</Button>
            <Button className="flex-1" disabled={!goalTitle || addGoalMut.isPending}
              onClick={() => addGoalMut.mutate({ category: goalCategory, title: goalTitle })}>保存</Button>
          </div>
        </Card>
      )}

      {activeGoals.map(goal => {
        const cat = CATEGORIES.find(c => c.value === goal.category);
        return (
          <Card key={goal.id} className="p-3">
            <div className="flex items-center gap-3">
              <Badge className="text-[10px] text-white shrink-0" style={{ backgroundColor: cat?.color }}>{cat?.label}</Badge>
              <span className="text-sm font-medium flex-1">{goal.title}</span>
              <Button size="sm" variant="ghost" className="text-xs"
                onClick={() => updateGoalMut.mutate({ goalId: goal.id, status: "completed" })}>
                完成 ✓
              </Button>
            </div>
          </Card>
        );
      })}

      {/* Milestones Section */}
      <div className="flex items-center justify-between mt-6">
        <h3 className="font-semibold text-sm flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-500" /> 里程碑 ({milestones.length})</h3>
        <Button size="sm" variant="outline" onClick={() => setShowMsForm(!showMsForm)}><Plus className="w-3.5 h-3.5 mr-1" /> 新里程碑</Button>
      </div>

      {showMsForm && (
        <Card className="p-4 space-y-3 border-amber-200 dark:border-amber-800">
          <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm" placeholder="里程碑名称" value={msTitle} onChange={e => setMsTitle(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowMsForm(false)}>取消</Button>
            <Button className="flex-1" disabled={!msTitle || addMsMut.isPending}
              onClick={() => addMsMut.mutate({ title: msTitle, achievedDate: new Date().toISOString().split("T")[0] })}>保存</Button>
          </div>
        </Card>
      )}

      {milestones.length > 0 ? milestones.map(ms => (
        <Card key={ms.id} className="p-3 flex items-center gap-3">
          <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{ms.title}</p>
            {ms.achievedDate && <p className="text-[10px] text-muted-foreground">{new Date(ms.achievedDate).toLocaleDateString("zh-CN")}</p>}
          </div>
        </Card>
      )) : !showMsForm && (
        <Card className="p-6 text-center text-muted-foreground/50">
          <Trophy className="w-8 h-8 mx-auto mb-2" />
          <p className="text-xs">记录孩子达成的里程碑</p>
        </Card>
      )}
    </div>
  );
}
