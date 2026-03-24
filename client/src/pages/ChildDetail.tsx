import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Link, useParams } from "wouter";
import SparkMap from "@/components/SparkMap";
import type { SparkScore } from "@/components/SparkMap";
import { DOMAINS } from "@/components/SparkMap";
import {
  ArrowLeft, Plus, Target, Calendar, Trophy, Clock,
  BookOpen, Palette, Users, Dumbbell, Lightbulb,
  Check, Play, Trash2, X,
  Star, Moon, Pencil, Heart, Sparkles, Brain,
  MessageCircle, TrendingUp
} from "lucide-react";

// --- Types ---
interface Child { id: string; name: string; birthDate: string | null; avatarColor: string | null; notes: string | null; }
interface Goal { id: string; childId: string; category: string; title: string; description: string | null; targetDate: string | null; status: string; progress: number; createdAt: string; }
interface ScheduleEntry { id: string; childId: string; dayOfWeek: number; startTime: string; endTime: string; activity: string; category: string | null; color: string | null; }
interface Milestone { id: string; childId: string; title: string; description: string | null; category: string | null; achievedDate: string | null; }
interface DailyLog { id: string; childId: string; date: string; mood: string | null; sleepHours: number | null; notes: string | null; highlights: string[] | null; }
interface LearningStory { id: string; childId: string; title: string; narrative: string; domains: string[]; photoUrl: string | null; date: string; }
interface SparkScoreEntry { id: string; childId: string; date: string; cognitive: number; language: number; socialEmotional: number; physical: number; creative: number; independence: number; notes: string | null; }
interface WeeklyReflection { id: string; childId: string; weekStart: string; proudestMoment: string | null; biggestChallenge: string | null; focusNextWeek: string | null; parentNotes: string | null; }

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const GOAL_CATEGORIES = [
  { value: "academic", label: "Academic", icon: BookOpen, color: "#3b82f6" },
  { value: "social", label: "Social", icon: Users, color: "#ec4899" },
  { value: "physical", label: "Physical", icon: Dumbbell, color: "#10b981" },
  { value: "creative", label: "Creative", icon: Palette, color: "#f59e0b" },
  { value: "life-skills", label: "Life Skills", icon: Lightbulb, color: "#8b5cf6" },
];

const SCHEDULE_CATEGORIES = [
  { value: "school", label: "School", color: "#3b82f6" },
  { value: "extracurricular", label: "Extra", color: "#8b5cf6" },
  { value: "play", label: "Play", color: "#10b981" },
  { value: "rest", label: "Rest", color: "#64748b" },
  { value: "meals", label: "Meals", color: "#f59e0b" },
  { value: "chores", label: "Chores", color: "#ef4444" },
];

const MOOD_OPTIONS = [
  { emoji: "\u{1F60A}", label: "Happy" },
  { emoji: "\u{1F60C}", label: "Calm" },
  { emoji: "\u{1F624}", label: "Frustrated" },
  { emoji: "\u{1F622}", label: "Sad" },
  { emoji: "\u{1F634}", label: "Tired" },
  { emoji: "\u{1F929}", label: "Excited" },
  { emoji: "\u{1F630}", label: "Anxious" },
  { emoji: "\u{1F970}", label: "Loving" },
];

function getAge(birthDate: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const am = months < 0 ? months + 12 : months;
  const ay = months < 0 ? years - 1 : years;
  if (ay === 0) return `${am} months`;
  if (am === 0) return `${ay} years`;
  return `${ay}y ${am}m`;
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

type TabType = "stories" | "spark" | "schedule" | "goals" | "milestones" | "daily-log" | "reflections";

export default function ChildDetail() {
  const { childId } = useParams<{ childId: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("stories");
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  const { data: children = [] } = useQuery<Child[]>({ queryKey: ["/api/children"] });
  const child = children.find(c => c.id === childId);

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: [`/api/children/${childId}/goals`],
    enabled: !!childId,
  });

  const { data: schedule = [] } = useQuery<ScheduleEntry[]>({
    queryKey: [`/api/children/${childId}/schedule`],
    enabled: !!childId,
  });

  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: [`/api/children/${childId}/milestones`],
    enabled: !!childId,
  });

  const { data: dailyLogs = [] } = useQuery<DailyLog[]>({
    queryKey: [`/api/children/${childId}/daily-log`],
    enabled: !!childId,
  });

  const { data: stories = [] } = useQuery<LearningStory[]>({
    queryKey: [`/api/children/${childId}/stories`],
    enabled: !!childId,
  });

  const { data: sparkScores = [] } = useQuery<SparkScoreEntry[]>({
    queryKey: [`/api/children/${childId}/spark-scores`],
    enabled: !!childId,
  });

  const { data: reflections = [] } = useQuery<WeeklyReflection[]>({
    queryKey: [`/api/children/${childId}/reflections`],
    enabled: !!childId,
  });

  if (!child) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const themeColor = child.avatarColor || "#8b5cf6";
  const latestSpark = sparkScores.length > 0 ? sparkScores[0] : null;
  const tabs: { key: TabType; label: string; icon: any; count?: number }[] = [
    { key: "stories", label: "Stories", icon: BookOpen, count: stories.length },
    { key: "spark", label: "Spark", icon: Sparkles },
    { key: "schedule", label: "Schedule", icon: Calendar, count: schedule.length },
    { key: "goals", label: "Goals", icon: Target, count: goals.filter(g => g.status === "active").length },
    { key: "milestones", label: "Milestones", icon: Trophy, count: milestones.length },
    { key: "daily-log", label: "Log", icon: Star, count: dailyLogs.length },
    { key: "reflections", label: "Reflect", icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-3 pb-5" style={{ background: `linear-gradient(135deg, ${themeColor}15, ${themeColor}05)` }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/">
              <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <h1 className="text-lg font-bold">{child.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: themeColor }}>
              {getInitials(child.name)}
            </div>
            <div>
              {child.birthDate && <p className="text-sm text-gray-500">Age: {getAge(child.birthDate)}</p>}
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">{goals.filter(g => g.status === "active").length} active goals</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">{milestones.length} milestones</span>
              </div>
              {child.notes && <p className="text-xs text-gray-500 mt-1">{child.notes}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-950/95 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all border-b-2 ${
                activeTab === tab.key
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {activeTab === "stories" && <StoriesTab childId={childId!} stories={stories} themeColor={themeColor} childName={child.name} />}
        {activeTab === "spark" && <SparkTab childId={childId!} sparkScores={sparkScores} latestSpark={latestSpark} themeColor={themeColor} childName={child.name} />}
        {activeTab === "schedule" && <ScheduleTab childId={childId!} schedule={schedule} selectedDay={selectedDay} setSelectedDay={setSelectedDay} themeColor={themeColor} />}
        {activeTab === "goals" && <GoalsTab childId={childId!} goals={goals} themeColor={themeColor} />}
        {activeTab === "milestones" && <MilestonesTab childId={childId!} milestones={milestones} themeColor={themeColor} />}
        {activeTab === "daily-log" && <DailyLogTab childId={childId!} dailyLogs={dailyLogs} themeColor={themeColor} childName={child.name} />}
        {activeTab === "reflections" && <ReflectionsTab childId={childId!} reflections={reflections} themeColor={themeColor} childName={child.name} />}
      </div>
    </div>
  );
}

// --- Schedule Tab ---
function ScheduleTab({ childId, schedule, selectedDay, setSelectedDay, themeColor }: { childId: string; schedule: ScheduleEntry[]; selectedDay: number; setSelectedDay: (d: number) => void; themeColor: string; }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formActivity, setFormActivity] = useState("");
  const [formStart, setFormStart] = useState("08:00");
  const [formEnd, setFormEnd] = useState("09:00");
  const [formCategory, setFormCategory] = useState("school");

  const daySchedule = schedule.filter(s => s.dayOfWeek === selectedDay).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const addMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", `/api/children/${childId}/schedule`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/schedule`] }); setShowForm(false); setFormActivity(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => { await apiRequest("DELETE", `/api/children/${childId}/schedule/${entryId}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/schedule`] }); },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formActivity.trim()) return;
    const cat = SCHEDULE_CATEGORIES.find(c => c.value === formCategory);
    addMutation.mutate({ dayOfWeek: selectedDay, startTime: formStart, endTime: formEnd, activity: formActivity, category: formCategory, color: cat?.color || null });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {DAYS.map((day, i) => (
          <button key={day} onClick={() => setSelectedDay(i)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${selectedDay === i ? "text-white shadow-sm" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
            style={selectedDay === i ? { backgroundColor: themeColor } : {}}
          >{day}</button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{FULL_DAYS[selectedDay]}'s Schedule</h3>
        <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800 p-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" placeholder="Activity name" value={formActivity} onChange={e => setFormActivity(e.target.value)} required />
            <div className="flex gap-2">
              <div className="flex-1"><label className="text-xs text-gray-500">Start</label><input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" type="time" value={formStart} onChange={e => setFormStart(e.target.value)} /></div>
              <div className="flex-1"><label className="text-xs text-gray-500">End</label><input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} /></div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SCHEDULE_CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => setFormCategory(cat.value)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-all ${formCategory === cat.value ? "text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200"}`}
                  style={formCategory === cat.value ? { backgroundColor: cat.color } : {}}
                >{cat.label}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-sm disabled:opacity-50" disabled={addMutation.isPending}>Add</button>
            </div>
          </form>
        </div>
      )}

      {daySchedule.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No activities scheduled</p>
          <p className="text-xs mt-1">Tap "Add" to create a schedule entry</p>
        </div>
      ) : (
        <div className="space-y-2">
          {daySchedule.map(entry => {
            const cat = SCHEDULE_CATEGORIES.find(c => c.value === entry.category);
            const color = entry.color || cat?.color || "#64748b";
            return (
              <div key={entry.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="flex items-stretch">
                  <div className="w-1 shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{entry.activity}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(entry.startTime)} - {formatTime(entry.endTime)}</span>
                        {cat && <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>{cat.label}</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteMutation.mutate(entry.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Goals Tab ---
function GoalsTab({ childId, goals, themeColor }: { childId: string; goals: Goal[]; themeColor: string; }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("academic");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");

  const addMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", `/api/children/${childId}/goals`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/goals`] }); queryClient.invalidateQueries({ queryKey: ["/api/children/dashboard/stats"] }); setShowForm(false); setFormTitle(""); setFormDescription(""); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ goalId, ...data }: { goalId: string; [key: string]: any }) => { const res = await apiRequest("PATCH", `/api/children/${childId}/goals/${goalId}`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/goals`] }); queryClient.invalidateQueries({ queryKey: ["/api/children/dashboard/stats"] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (goalId: string) => { await apiRequest("DELETE", `/api/children/${childId}/goals/${goalId}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/goals`] }); queryClient.invalidateQueries({ queryKey: ["/api/children/dashboard/stats"] }); },
  });

  const filteredGoals = goals.filter(g => filter === "all" ? true : g.status === filter);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) return;
    addMutation.mutate({ category: formCategory, title: formTitle, description: formDescription || null, targetDate: formTargetDate || null });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["active", "completed", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all ${filter === f ? "bg-violet-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200"}`}
            >{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" /> New Goal
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800 p-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" placeholder="Goal title" value={formTitle} onChange={e => setFormTitle(e.target.value)} required />
            <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" placeholder="Description (optional)" value={formDescription} onChange={e => setFormDescription(e.target.value)} />
            <div className="flex flex-wrap gap-1.5">
              {GOAL_CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => setFormCategory(cat.value)}
                  className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 transition-all ${formCategory === cat.value ? "text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}
                  style={formCategory === cat.value ? { backgroundColor: cat.color } : {}}
                ><cat.icon className="w-3 h-3" />{cat.label}</button>
              ))}
            </div>
            <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" type="date" value={formTargetDate} onChange={e => setFormTargetDate(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-sm disabled:opacity-50" disabled={addMutation.isPending}>Create Goal</button>
            </div>
          </form>
        </div>
      )}

      {filteredGoals.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No {filter !== "all" ? filter : ""} goals yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredGoals.map(goal => {
            const cat = GOAL_CATEGORIES.find(c => c.value === goal.category);
            const CatIcon = cat?.icon || Target;
            return (
              <div key={goal.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${cat?.color || themeColor}20` }}>
                    <CatIcon className="w-4 h-4" style={{ color: cat?.color || themeColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-medium text-sm ${goal.status === "completed" ? "line-through text-gray-400" : ""}`}>{goal.title}</h4>
                      <div className="flex gap-1">
                        {goal.status === "active" && (
                          <button onClick={() => updateMutation.mutate({ goalId: goal.id, status: "completed", progress: 100 })} className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-950/20 text-gray-400 hover:text-green-500" title="Mark complete"><Check className="w-3.5 h-3.5" /></button>
                        )}
                        {goal.status === "completed" && (
                          <button onClick={() => updateMutation.mutate({ goalId: goal.id, status: "active", progress: 50 })} className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/20 text-gray-400 hover:text-blue-500" title="Reactivate"><Play className="w-3.5 h-3.5" /></button>
                        )}
                        <button onClick={() => deleteMutation.mutate(goal.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    {goal.description && <p className="text-xs text-gray-500 mt-0.5">{goal.description}</p>}
                    {goal.targetDate && <p className="text-xs text-gray-500 mt-0.5">Target: {new Date(goal.targetDate).toLocaleDateString()}</p>}
                    {goal.status === "active" && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${goal.progress}%`, backgroundColor: cat?.color || themeColor }} />
                          </div>
                          <span className="text-xs font-medium w-8 text-right">{goal.progress}%</span>
                        </div>
                        <div className="flex gap-1 mt-1.5">
                          {[0, 25, 50, 75, 100].map(p => (
                            <button key={p} onClick={() => updateMutation.mutate({ goalId: goal.id, progress: p })}
                              className={`text-[10px] px-1.5 py-0.5 rounded transition-all ${goal.progress === p ? "bg-violet-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200"}`}
                            >{p}%</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Milestones Tab ---
function MilestonesTab({ childId, milestones, themeColor }: { childId: string; milestones: Milestone[]; themeColor: string; }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("academic");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);

  const addMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", `/api/children/${childId}/milestones`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/milestones`] }); queryClient.invalidateQueries({ queryKey: ["/api/children/dashboard/stats"] }); setShowForm(false); setFormTitle(""); setFormDescription(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/children/${childId}/milestones/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/milestones`] }); queryClient.invalidateQueries({ queryKey: ["/api/children/dashboard/stats"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Achievements & Milestones</h3>
        <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800 p-3">
          <form onSubmit={(e) => { e.preventDefault(); if (!formTitle.trim()) return; addMutation.mutate({ title: formTitle, description: formDescription || null, category: formCategory, achievedDate: formDate }); }} className="space-y-3">
            <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" placeholder="Milestone title (e.g., 'First chapter book read')" value={formTitle} onChange={e => setFormTitle(e.target.value)} required />
            <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" placeholder="Description (optional)" value={formDescription} onChange={e => setFormDescription(e.target.value)} />
            <div className="flex flex-wrap gap-1.5">
              {GOAL_CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => setFormCategory(cat.value)}
                  className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 transition-all ${formCategory === cat.value ? "text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}
                  style={formCategory === cat.value ? { backgroundColor: cat.color } : {}}
                ><cat.icon className="w-3 h-3" />{cat.label}</button>
              ))}
            </div>
            <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-sm disabled:opacity-50" disabled={addMutation.isPending}>Add Milestone</button>
            </div>
          </form>
        </div>
      )}

      {milestones.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No milestones recorded yet</p>
          <p className="text-xs mt-1">Celebrate achievements big and small!</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-3">
            {milestones.map(milestone => {
              const cat = GOAL_CATEGORIES.find(c => c.value === milestone.category);
              return (
                <div key={milestone.id} className="relative pl-10">
                  <div className="absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 border-white dark:border-gray-950" style={{ backgroundColor: cat?.color || themeColor }} />
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{milestone.title}</h4>
                        {milestone.description && <p className="text-xs text-gray-500 mt-0.5">{milestone.description}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          {milestone.achievedDate && <span className="text-xs text-gray-500">{new Date(milestone.achievedDate).toLocaleDateString()}</span>}
                          {cat && <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: cat.color }}>{cat.label}</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteMutation.mutate(milestone.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Daily Log Tab ---
function DailyLogTab({ childId, dailyLogs, themeColor, childName }: { childId: string; dailyLogs: DailyLog[]; themeColor: string; childName: string; }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [formDate, setFormDate] = useState(today);
  const [formMood, setFormMood] = useState("");
  const [formSleep, setFormSleep] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formHighlight, setFormHighlight] = useState("");
  const [formHighlights, setFormHighlights] = useState<string[]>([]);

  const todayLog = dailyLogs.find(l => l.date === today);

  const addMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", `/api/children/${childId}/daily-log`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/daily-log`] }); queryClient.invalidateQueries({ queryKey: ["/api/children/dashboard/stats"] }); setShowForm(false); setFormMood(""); setFormSleep(""); setFormNotes(""); setFormHighlights([]); },
  });

  function addHighlight() {
    if (formHighlight.trim()) { setFormHighlights([...formHighlights, formHighlight.trim()]); setFormHighlight(""); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Daily Log</h3>
        <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" /> Log Today
        </button>
      </div>

      {todayLog && !showForm && (
        <div className="rounded-2xl border p-3" style={{ borderColor: `${themeColor}40` }}>
          <p className="text-xs font-medium text-gray-500 mb-1">Today</p>
          <div className="flex items-center gap-3">
            {todayLog.mood && <span className="text-2xl">{todayLog.mood}</span>}
            {todayLog.sleepHours && <span className="text-xs text-gray-500 flex items-center gap-1"><Moon className="w-3 h-3" /> {todayLog.sleepHours}h sleep</span>}
          </div>
          {todayLog.notes && <p className="text-xs text-gray-500 mt-1">{todayLog.notes}</p>}
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800 p-3">
          <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate({ date: formDate, mood: formMood || null, sleepHours: formSleep ? parseInt(formSleep) : null, notes: formNotes || null, highlights: formHighlights.length > 0 ? formHighlights : null }); }} className="space-y-3">
            <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
            <div>
              <p className="text-xs text-gray-500 mb-1.5">{childName}'s Mood</p>
              <div className="flex flex-wrap gap-1.5">
                {MOOD_OPTIONS.map(m => (
                  <button key={m.emoji} type="button" onClick={() => setFormMood(m.emoji)}
                    className={`text-xl p-1.5 rounded-lg transition-all ${formMood === m.emoji ? "bg-violet-100 dark:bg-violet-900/30 ring-2 ring-violet-500 scale-110" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                    title={m.label}
                  >{m.emoji}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Sleep (hours)</p>
              <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" type="number" min="0" max="24" placeholder="e.g., 10" value={formSleep} onChange={e => setFormSleep(e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Highlights</p>
              <div className="flex gap-1.5">
                <input className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" placeholder="Add a highlight..." value={formHighlight} onChange={e => setFormHighlight(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addHighlight(); } }} />
                <button type="button" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm" onClick={addHighlight}>+</button>
              </div>
              {formHighlights.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {formHighlights.map((h, i) => (
                    <span key={i} className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      {h}
                      <button type="button" onClick={() => setFormHighlights(formHighlights.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" placeholder="Notes about the day..." value={formNotes} onChange={e => setFormNotes(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-sm disabled:opacity-50" disabled={addMutation.isPending}>Save Log</button>
            </div>
          </form>
        </div>
      )}

      {dailyLogs.length === 0 && !showForm ? (
        <div className="text-center py-10 text-gray-400">
          <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No daily logs yet</p>
          <p className="text-xs mt-1">Start tracking {childName}'s days</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dailyLogs.map(log => (
            <div key={log.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {log.mood && <span className="text-lg">{log.mood}</span>}
                  <span className="text-sm font-medium">{new Date(log.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                </div>
                {log.sleepHours && <span className="text-xs text-gray-500 flex items-center gap-1"><Moon className="w-3 h-3" /> {log.sleepHours}h</span>}
              </div>
              {log.notes && <p className="text-xs text-gray-500 mt-1">{log.notes}</p>}
              {log.highlights && Array.isArray(log.highlights) && log.highlights.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(log.highlights as string[]).map((h, i) => (
                    <span key={i} className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full">{h}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Learning Stories Tab ---
const DOMAIN_OPTIONS = [
  { value: "cognitive", label: "Cognitive", icon: Brain, color: "#3b82f6" },
  { value: "language", label: "Language", icon: MessageCircle, color: "#8b5cf6" },
  { value: "social-emotional", label: "Social-Emotional", icon: Heart, color: "#ec4899" },
  { value: "physical", label: "Physical", icon: Dumbbell, color: "#10b981" },
  { value: "creative", label: "Creative", icon: Palette, color: "#f59e0b" },
  { value: "independence", label: "Independence", icon: Star, color: "#ef4444" },
];

function StoriesTab({ childId, stories, themeColor, childName }: { childId: string; stories: LearningStory[]; themeColor: string; childName: string; }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formNarrative, setFormNarrative] = useState("");
  const [formDomains, setFormDomains] = useState<string[]>([]);
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);

  const addMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", `/api/children/${childId}/stories`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/stories`] }); setShowForm(false); setFormTitle(""); setFormNarrative(""); setFormDomains([]); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/children/${childId}/stories/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/stories`] }); },
  });

  function toggleDomain(d: string) {
    setFormDomains(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Learning Stories</h3>
          <p className="text-[10px] text-gray-500">Capture moments of growth and discovery</p>
        </div>
        <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" /> New Story
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800 p-4 space-y-3">
          <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium" placeholder={`What happened with ${childName} today?`} value={formTitle} onChange={e => setFormTitle(e.target.value)} required />
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm min-h-[120px] resize-none"
            placeholder={`Tell the story... What did ${childName} do? What did you observe? Why was this moment meaningful?`}
            value={formNarrative}
            onChange={e => setFormNarrative(e.target.value)}
          />
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Development domains</p>
            <div className="flex flex-wrap gap-1.5">
              {DOMAIN_OPTIONS.map(d => (
                <button key={d.value} type="button" onClick={() => toggleDomain(d.value)}
                  className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 transition-all ${formDomains.includes(d.value) ? "text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}
                  style={formDomains.includes(d.value) ? { backgroundColor: d.color } : {}}
                ><d.icon className="w-3 h-3" />{d.label}</button>
              ))}
            </div>
          </div>
          <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button
              onClick={() => { if (formTitle && formNarrative) addMutation.mutate({ title: formTitle, narrative: formNarrative, domains: formDomains, date: formDate }); }}
              className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-sm disabled:opacity-50"
              disabled={!formTitle || !formNarrative || addMutation.isPending}
            >Save Story</button>
          </div>
        </div>
      )}

      {stories.length === 0 && !showForm ? (
        <div className="text-center py-12 text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No stories yet</p>
          <p className="text-xs mt-1 max-w-[250px] mx-auto">Capture a moment when {childName} showed growth, curiosity, resilience, or joy.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stories.map(story => (
            <div key={story.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="h-1" style={{ backgroundColor: themeColor }} />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">{story.title}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">{new Date(story.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <button onClick={() => deleteMutation.mutate(story.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 leading-relaxed whitespace-pre-wrap">{story.narrative}</p>
                {story.domains.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {story.domains.map(d => {
                      const domain = DOMAIN_OPTIONS.find(o => o.value === d);
                      return domain ? (
                        <span key={d} className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: domain.color }}>{domain.label}</span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Spark Map Tab ---
function SparkTab({ childId, sparkScores, latestSpark, themeColor, childName }: {
  childId: string; sparkScores: SparkScoreEntry[]; latestSpark: SparkScoreEntry | null; themeColor: string; childName: string;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formScores, setFormScores] = useState({ cognitive: 5, language: 5, socialEmotional: 5, physical: 5, creative: 5, independence: 5 });

  const addMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", `/api/children/${childId}/spark-scores`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/spark-scores`] }); setShowForm(false); },
  });

  const sparkData: SparkScore | null = latestSpark ? {
    cognitive: latestSpark.cognitive,
    language: latestSpark.language,
    socialEmotional: latestSpark.socialEmotional,
    physical: latestSpark.physical,
    creative: latestSpark.creative,
    independence: latestSpark.independence,
  } : null;

  const prevSpark = sparkScores.length >= 2 ? sparkScores[1] : null;
  const prevData: SparkScore | null = prevSpark ? {
    cognitive: prevSpark.cognitive, language: prevSpark.language, socialEmotional: prevSpark.socialEmotional,
    physical: prevSpark.physical, creative: prevSpark.creative, independence: prevSpark.independence,
  } : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Spark Map</h3>
          <p className="text-[10px] text-gray-500">A portrait of {childName}'s growth across 6 domains</p>
        </div>
        <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setShowForm(!showForm)}>
          <TrendingUp className="w-3.5 h-3.5" /> Update
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex justify-center">
        {sparkData ? (
          <SparkMap
            scores={sparkData}
            themeColor={themeColor}
            childName={latestSpark ? new Date(latestSpark.date).toLocaleDateString("en-US", { month: "short" }) : undefined}
            compareScores={prevData}
            compareName={prevSpark ? `${new Date(prevSpark.date).toLocaleDateString("en-US", { month: "short" })} (prev)` : undefined}
            compareColor="#94a3b8"
          />
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No spark scores yet</p>
            <p className="text-xs mt-1">Rate {childName}'s development to see the portrait</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800 p-4 space-y-4">
          <p className="text-xs text-gray-500">Rate each domain 1-10. Not a grade -- a portrait of where {childName} is right now.</p>
          {DOMAINS.map(d => {
            const key = d.key as keyof typeof formScores;
            return (
              <div key={d.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: d.color }}>{d.label}</span>
                  <span className="text-xs font-bold" style={{ color: d.color }}>{formScores[key]}</span>
                </div>
                <input type="range" min={1} max={10} value={formScores[key]}
                  onChange={e => setFormScores({ ...formScores, [key]: parseInt(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ accentColor: d.color }} />
                <div className="flex justify-between text-[9px] text-gray-400 mt-0.5"><span>Emerging</span><span>Developing</span><span>Strong</span></div>
              </div>
            );
          })}
          <div className="flex gap-2">
            <button type="button" className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button onClick={() => addMutation.mutate({ ...formScores, date: new Date().toISOString().split("T")[0] })}
              className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-sm disabled:opacity-50" disabled={addMutation.isPending}>Save Spark Map</button>
          </div>
        </div>
      )}

      {sparkScores.length > 0 && (
        <div>
          <h4 className="font-semibold text-xs text-gray-500 mb-2">History</h4>
          <div className="space-y-2">
            {sparkScores.map(s => (
              <div key={s.id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-xs font-medium mb-1.5">{new Date(s.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                <div className="grid grid-cols-6 gap-1">
                  {DOMAINS.map(d => (
                    <div key={d.key} className="text-center">
                      <div className="text-sm font-bold" style={{ color: d.color }}>{(s as any)[d.key] || 0}</div>
                      <div className="text-[8px] text-gray-400">{d.label.slice(0, 4)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Weekly Reflections Tab ---
function ReflectionsTab({ childId, reflections, themeColor, childName }: {
  childId: string; reflections: WeeklyReflection[]; themeColor: string; childName: string;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [proudest, setProudest] = useState("");
  const [challenge, setChallenge] = useState("");
  const [focus, setFocus] = useState("");
  const [parentNotes, setParentNotes] = useState("");

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekStart = monday.toISOString().split("T")[0];
  const thisWeekReflection = reflections.find(r => r.weekStart === weekStart);

  const addMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", `/api/children/${childId}/reflections`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/reflections`] }); setShowForm(false); setProudest(""); setChallenge(""); setFocus(""); setParentNotes(""); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Weekly Reflections</h3>
          <p className="text-[10px] text-gray-500">Pause. Reflect. Be intentional.</p>
        </div>
        {!thisWeekReflection && (
          <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setShowForm(!showForm)}>
            <Pencil className="w-3.5 h-3.5" /> This Week
          </button>
        )}
      </div>

      {!thisWeekReflection && !showForm && (
        <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 p-5 text-center">
          <Heart className="w-8 h-8 mx-auto mb-2 text-violet-400" />
          <p className="text-sm font-medium">Sunday Reflection</p>
          <p className="text-xs text-gray-500 mt-1 max-w-[280px] mx-auto">
            What was {childName}'s proudest moment this week? What challenged them? What do you want to focus on next week?
          </p>
          <button onClick={() => setShowForm(true)} className="mt-3 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 transition-colors">
            Write This Week's Reflection
          </button>
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800 p-4 space-y-4">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#10b981" }}>Proudest Moment</p>
            <p className="text-[10px] text-gray-500 mb-1.5">What moment made you most proud of {childName} this week?</p>
            <textarea className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm min-h-[60px] resize-none" value={proudest} onChange={e => setProudest(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#f59e0b" }}>Biggest Challenge</p>
            <p className="text-[10px] text-gray-500 mb-1.5">What was hardest for {childName} this week?</p>
            <textarea className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm min-h-[60px] resize-none" value={challenge} onChange={e => setChallenge(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#3b82f6" }}>Focus Next Week</p>
            <p className="text-[10px] text-gray-500 mb-1.5">What's one thing you want to focus on?</p>
            <textarea className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm min-h-[60px] resize-none" value={focus} onChange={e => setFocus(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-medium mb-1 text-gray-500">Personal Notes</p>
            <textarea className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm min-h-[40px] resize-none" value={parentNotes} onChange={e => setParentNotes(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button type="button" className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button onClick={() => addMutation.mutate({ weekStart, proudestMoment: proudest, biggestChallenge: challenge, focusNextWeek: focus, parentNotes })}
              className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-sm disabled:opacity-50" disabled={addMutation.isPending}>Save Reflection</button>
          </div>
        </div>
      )}

      {reflections.length > 0 && (
        <div className="space-y-3">
          {reflections.map(r => (
            <div key={r.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Week of {new Date(r.weekStart + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}</p>
              {r.proudestMoment && (<div className="mb-2"><p className="text-[10px] font-medium" style={{ color: "#10b981" }}>Proudest Moment</p><p className="text-sm text-gray-700 dark:text-gray-300">{r.proudestMoment}</p></div>)}
              {r.biggestChallenge && (<div className="mb-2"><p className="text-[10px] font-medium" style={{ color: "#f59e0b" }}>Challenge</p><p className="text-sm text-gray-700 dark:text-gray-300">{r.biggestChallenge}</p></div>)}
              {r.focusNextWeek && (<div className="mb-2"><p className="text-[10px] font-medium" style={{ color: "#3b82f6" }}>Focus</p><p className="text-sm text-gray-700 dark:text-gray-300">{r.focusNextWeek}</p></div>)}
              {r.parentNotes && <p className="text-xs text-gray-500 italic mt-1">{r.parentNotes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
