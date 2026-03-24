import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { Link, useParams } from "wouter";
import {
  ArrowLeft, Plus, Target, Calendar, Trophy, Clock,
  BookOpen, Palette, Users, Dumbbell, Lightbulb,
  Check, Pause, Play, Trash2, X, ChevronDown, ChevronUp,
  Star, Moon, Sun, Pencil
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
interface Child {
  id: string;
  name: string;
  birthDate: string | null;
  avatarColor: string | null;
  notes: string | null;
}

interface Goal {
  id: string;
  childId: string;
  category: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: string;
  progress: number;
  createdAt: string;
}

interface ScheduleEntry {
  id: string;
  childId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  activity: string;
  category: string | null;
  color: string | null;
}

interface Milestone {
  id: string;
  childId: string;
  title: string;
  description: string | null;
  category: string | null;
  achievedDate: string | null;
}

interface DailyLog {
  id: string;
  childId: string;
  date: string;
  mood: string | null;
  sleepHours: number | null;
  notes: string | null;
  highlights: string[] | null;
}

// ─── Constants ────────────────────────────────────────────────
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
  { emoji: "😊", label: "Happy" },
  { emoji: "😌", label: "Calm" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😴", label: "Tired" },
  { emoji: "🤩", label: "Excited" },
  { emoji: "😰", label: "Anxious" },
  { emoji: "🥰", label: "Loving" },
];

function getAge(birthDate: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const adjustedMonths = months < 0 ? months + 12 : months;
  const adjustedYears = months < 0 ? years - 1 : years;
  if (adjustedYears === 0) return `${adjustedMonths} months`;
  if (adjustedMonths === 0) return `${adjustedYears} years`;
  return `${adjustedYears}y ${adjustedMonths}m`;
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

type TabType = "schedule" | "goals" | "milestones" | "daily-log";

export default function ChildDetailPage() {
  const { childId } = useParams<{ childId: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("schedule");
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  // ─── Data Fetching ────────────────────────────────────────
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

  if (!child) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const themeColor = child.avatarColor || "#8b5cf6";
  const tabs: { key: TabType; label: string; icon: any; count?: number }[] = [
    { key: "schedule", label: "Schedule", icon: Calendar, count: schedule.length },
    { key: "goals", label: "Goals", icon: Target, count: goals.filter(g => g.status === "active").length },
    { key: "milestones", label: "Milestones", icon: Trophy, count: milestones.length },
    { key: "daily-log", label: "Daily Log", icon: Star, count: dailyLogs.length },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div
        className="px-4 pt-3 pb-5"
        style={{ background: `linear-gradient(135deg, ${themeColor}15, ${themeColor}05)` }}
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/child-tracker">
              <button className="p-2 rounded-xl hover:bg-accent transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <h1 className="text-lg font-bold">{child.name}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: themeColor }}
            >
              {getInitials(child.name)}
            </div>
            <div>
              {child.birthDate && (
                <p className="text-sm text-muted-foreground">Age: {getAge(child.birthDate)}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                  {goals.filter(g => g.status === "active").length} active goals
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                  {milestones.length} milestones
                </span>
              </div>
              {child.notes && (
                <p className="text-xs text-muted-foreground mt-1">{child.notes}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all border-b-2 ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {activeTab === "schedule" && (
          <ScheduleTab
            childId={childId!}
            schedule={schedule}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            themeColor={themeColor}
          />
        )}
        {activeTab === "goals" && (
          <GoalsTab childId={childId!} goals={goals} themeColor={themeColor} />
        )}
        {activeTab === "milestones" && (
          <MilestonesTab childId={childId!} milestones={milestones} themeColor={themeColor} />
        )}
        {activeTab === "daily-log" && (
          <DailyLogTab childId={childId!} dailyLogs={dailyLogs} themeColor={themeColor} childName={child.name} />
        )}
      </div>
    </div>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────
function ScheduleTab({
  childId, schedule, selectedDay, setSelectedDay, themeColor,
}: {
  childId: string;
  schedule: ScheduleEntry[];
  selectedDay: number;
  setSelectedDay: (d: number) => void;
  themeColor: string;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formActivity, setFormActivity] = useState("");
  const [formStart, setFormStart] = useState("08:00");
  const [formEnd, setFormEnd] = useState("09:00");
  const [formCategory, setFormCategory] = useState("school");

  const daySchedule = schedule.filter(s => s.dayOfWeek === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/children/${childId}/schedule`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/schedule`] });
      setShowForm(false);
      setFormActivity("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      await apiRequest("DELETE", `/api/children/${childId}/schedule/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/schedule`] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formActivity.trim()) return;
    const cat = SCHEDULE_CATEGORIES.find(c => c.value === formCategory);
    addMutation.mutate({
      dayOfWeek: selectedDay,
      startTime: formStart,
      endTime: formEnd,
      activity: formActivity,
      category: formCategory,
      color: cat?.color || null,
    });
  }

  return (
    <div className="space-y-4">
      {/* Day Selector */}
      <div className="flex gap-1">
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setSelectedDay(i)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
              selectedDay === i
                ? "text-white shadow-sm"
                : "text-muted-foreground hover:bg-accent"
            }`}
            style={selectedDay === i ? { backgroundColor: themeColor } : {}}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{FULL_DAYS[selectedDay]}'s Schedule</h3>
        <Button size="sm" variant="outline" className="rounded-xl gap-1 text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="p-3">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                placeholder="Activity name"
                value={formActivity}
                onChange={e => setFormActivity(e.target.value)}
                required
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Start</label>
                  <Input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">End</label>
                  <Input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SCHEDULE_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormCategory(cat.value)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                      formCategory === cat.value
                        ? "text-white"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                    style={formCategory === cat.value ? { backgroundColor: cat.color } : {}}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 rounded-xl" disabled={addMutation.isPending}>
                  Add
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Schedule List */}
      {daySchedule.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
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
              <Card key={entry.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    <div className="w-1 shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{entry.activity}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                          </span>
                          {cat && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: color }}
                            >
                              {cat.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(entry.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Goals Tab ────────────────────────────────────────────────
function GoalsTab({
  childId, goals, themeColor,
}: {
  childId: string;
  goals: Goal[];
  themeColor: string;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("academic");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/children/${childId}/goals`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/goals`] });
      setShowForm(false);
      setFormTitle("");
      setFormDescription("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ goalId, ...data }: { goalId: string; [key: string]: any }) => {
      const res = await apiRequest("PATCH", `/api/children/${childId}/goals/${goalId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/goals`] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (goalId: string) => {
      await apiRequest("DELETE", `/api/children/${childId}/goals/${goalId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/goals`] });
    },
  });

  const filteredGoals = goals.filter(g => {
    if (filter === "all") return true;
    return g.status === filter;
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) return;
    addMutation.mutate({
      category: formCategory,
      title: formTitle,
      description: formDescription || null,
      targetDate: formTargetDate || null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["active", "completed", "all"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="rounded-xl gap-1 text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" /> New Goal
        </Button>
      </div>

      {/* Add Goal Form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="p-3">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                placeholder="Goal title"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                required
              />
              <Input
                placeholder="Description (optional)"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5">
                {GOAL_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormCategory(cat.value)}
                    className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 transition-all ${
                      formCategory === cat.value
                        ? "text-white"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                    style={formCategory === cat.value ? { backgroundColor: cat.color } : {}}
                  >
                    <cat.icon className="w-3 h-3" />
                    {cat.label}
                  </button>
                ))}
              </div>
              <Input
                type="date"
                value={formTargetDate}
                onChange={e => setFormTargetDate(e.target.value)}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 rounded-xl" disabled={addMutation.isPending}>
                  Create Goal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No {filter !== "all" ? filter : ""} goals yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredGoals.map(goal => {
            const cat = GOAL_CATEGORIES.find(c => c.value === goal.category);
            const CatIcon = cat?.icon || Target;
            return (
              <Card key={goal.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: `${cat?.color || themeColor}20` }}
                    >
                      <CatIcon className="w-4 h-4" style={{ color: cat?.color || themeColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium text-sm ${goal.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                          {goal.title}
                        </h4>
                        <div className="flex gap-1">
                          {goal.status === "active" && (
                            <button
                              onClick={() => updateMutation.mutate({ goalId: goal.id, status: "completed", progress: 100 })}
                              className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-950/20 text-muted-foreground hover:text-green-500 transition-colors"
                              title="Mark complete"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {goal.status === "completed" && (
                            <button
                              onClick={() => updateMutation.mutate({ goalId: goal.id, status: "active", progress: 50 })}
                              className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/20 text-muted-foreground hover:text-blue-500 transition-colors"
                              title="Reactivate"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteMutation.mutate(goal.id)}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {goal.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
                      )}
                      {goal.targetDate && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </p>
                      )}

                      {/* Progress Bar */}
                      {goal.status === "active" && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${goal.progress}%`,
                                  backgroundColor: cat?.color || themeColor,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium w-8 text-right">{goal.progress}%</span>
                          </div>
                          <div className="flex gap-1 mt-1.5">
                            {[0, 25, 50, 75, 100].map(p => (
                              <button
                                key={p}
                                onClick={() => updateMutation.mutate({ goalId: goal.id, progress: p })}
                                className={`text-[10px] px-1.5 py-0.5 rounded transition-all ${
                                  goal.progress === p
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-accent"
                                }`}
                              >
                                {p}%
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Milestones Tab ───────────────────────────────────────────
function MilestonesTab({
  childId, milestones, themeColor,
}: {
  childId: string;
  milestones: Milestone[];
  themeColor: string;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("academic");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/children/${childId}/milestones`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/milestones`] });
      setShowForm(false);
      setFormTitle("");
      setFormDescription("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/children/${childId}/milestones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/milestones`] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Achievements & Milestones</h3>
        <Button size="sm" variant="outline" className="rounded-xl gap-1 text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="p-3">
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!formTitle.trim()) return;
              addMutation.mutate({
                title: formTitle,
                description: formDescription || null,
                category: formCategory,
                achievedDate: formDate,
              });
            }} className="space-y-3">
              <Input
                placeholder="Milestone title (e.g., 'First chapter book read')"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                required
              />
              <Input
                placeholder="Description (optional)"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5">
                {GOAL_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormCategory(cat.value)}
                    className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 transition-all ${
                      formCategory === cat.value
                        ? "text-white"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                    style={formCategory === cat.value ? { backgroundColor: cat.color } : {}}
                  >
                    <cat.icon className="w-3 h-3" />
                    {cat.label}
                  </button>
                ))}
              </div>
              <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 rounded-xl" disabled={addMutation.isPending}>Add Milestone</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {milestones.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No milestones recorded yet</p>
          <p className="text-xs mt-1">Celebrate achievements big and small!</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-muted" />

          <div className="space-y-3">
            {milestones.map(milestone => {
              const cat = GOAL_CATEGORIES.find(c => c.value === milestone.category);
              return (
                <div key={milestone.id} className="relative pl-10">
                  <div
                    className="absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 border-background"
                    style={{ backgroundColor: cat?.color || themeColor }}
                  />
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{milestone.title}</h4>
                          {milestone.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{milestone.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {milestone.achievedDate && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(milestone.achievedDate).toLocaleDateString()}
                              </span>
                            )}
                            {cat && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: cat.color }}
                              >
                                {cat.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteMutation.mutate(milestone.id)}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Daily Log Tab ────────────────────────────────────────────
function DailyLogTab({
  childId, dailyLogs, themeColor, childName,
}: {
  childId: string;
  dailyLogs: DailyLog[];
  themeColor: string;
  childName: string;
}) {
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
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/children/${childId}/daily-log`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/children/${childId}/daily-log`] });
      setShowForm(false);
      setFormMood("");
      setFormSleep("");
      setFormNotes("");
      setFormHighlights([]);
    },
  });

  function addHighlight() {
    if (formHighlight.trim()) {
      setFormHighlights([...formHighlights, formHighlight.trim()]);
      setFormHighlight("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Daily Log</h3>
        <Button size="sm" variant="outline" className="rounded-xl gap-1 text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" /> Log Today
        </Button>
      </div>

      {/* Today's Quick Status */}
      {todayLog && !showForm && (
        <Card style={{ borderColor: `${themeColor}40` }}>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Today</p>
            <div className="flex items-center gap-3">
              {todayLog.mood && <span className="text-2xl">{todayLog.mood}</span>}
              {todayLog.sleepHours && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Moon className="w-3 h-3" /> {todayLog.sleepHours}h sleep
                </span>
              )}
            </div>
            {todayLog.notes && <p className="text-xs text-muted-foreground mt-1">{todayLog.notes}</p>}
          </CardContent>
        </Card>
      )}

      {/* Add Log Form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="p-3">
            <form onSubmit={(e) => {
              e.preventDefault();
              addMutation.mutate({
                date: formDate,
                mood: formMood || null,
                sleepHours: formSleep ? parseInt(formSleep) : null,
                notes: formNotes || null,
                highlights: formHighlights.length > 0 ? formHighlights : null,
              });
            }} className="space-y-3">
              <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />

              <div>
                <p className="text-xs text-muted-foreground mb-1.5">{childName}'s Mood</p>
                <div className="flex flex-wrap gap-1.5">
                  {MOOD_OPTIONS.map(m => (
                    <button
                      key={m.emoji}
                      type="button"
                      onClick={() => setFormMood(m.emoji)}
                      className={`text-xl p-1.5 rounded-lg transition-all ${
                        formMood === m.emoji
                          ? "bg-primary/10 ring-2 ring-primary scale-110"
                          : "hover:bg-accent"
                      }`}
                      title={m.label}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Sleep (hours)</p>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  placeholder="e.g., 10"
                  value={formSleep}
                  onChange={e => setFormSleep(e.target.value)}
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Highlights</p>
                <div className="flex gap-1.5">
                  <Input
                    placeholder="Add a highlight..."
                    value={formHighlight}
                    onChange={e => setFormHighlight(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addHighlight(); } }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addHighlight}>+</Button>
                </div>
                {formHighlights.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {formHighlights.map((h, i) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                        {h}
                        <button type="button" onClick={() => setFormHighlights(formHighlights.filter((_, j) => j !== i))}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Input
                placeholder="Notes about the day..."
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
              />

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 rounded-xl" disabled={addMutation.isPending}>Save Log</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Log History */}
      {dailyLogs.length === 0 && !showForm ? (
        <div className="text-center py-10 text-muted-foreground">
          <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No daily logs yet</p>
          <p className="text-xs mt-1">Start tracking {childName}'s days</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dailyLogs.map(log => (
            <Card key={log.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {log.mood && <span className="text-lg">{log.mood}</span>}
                    <span className="text-sm font-medium">
                      {new Date(log.date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric"
                      })}
                    </span>
                  </div>
                  {log.sleepHours && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Moon className="w-3 h-3" /> {log.sleepHours}h
                    </span>
                  )}
                </div>
                {log.notes && <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>}
                {log.highlights && Array.isArray(log.highlights) && log.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(log.highlights as string[]).map((h, i) => (
                      <span key={i} className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full">
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
