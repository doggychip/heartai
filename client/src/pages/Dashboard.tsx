import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Link } from "wouter";
import {
  ArrowLeft, Plus, Baby, Target, Calendar, Trophy, Clock,
  ChevronRight, Pencil, Trash2, X, BookOpen, Palette,
  Users, Dumbbell, Lightbulb, Moon,
  CheckCircle2, Activity,
} from "lucide-react";

// --- Types ---
interface Child {
  id: string;
  name: string;
  birthDate: string | null;
  avatarColor: string | null;
  notes: string | null;
  createdAt: string;
}

interface Goal {
  id: string;
  childId: string;
  category: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
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

interface ChildStat {
  child: Child;
  activeGoals: number;
  completedGoals: number;
  avgProgress: number;
  todaySchedule: ScheduleEntry[];
  recentMilestones: Milestone[];
  recentLogs: DailyLog[];
  goalsByCategory: Record<string, { active: number; completed: number }>;
  goals: Goal[];
}

interface DashboardData {
  children: Child[];
  totalActiveGoals: number;
  totalCompletedGoals: number;
  totalTodayActivities: number;
  totalMilestones: number;
  childStats: ChildStat[];
}

// --- Constants ---
const AVATAR_COLORS = [
  "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#ef4444", "#06b6d4", "#f97316",
];

const GOAL_CATEGORIES: Record<string, { label: string; icon: any; color: string }> = {
  academic: { label: "Academic", icon: BookOpen, color: "#3b82f6" },
  social: { label: "Social", icon: Users, color: "#ec4899" },
  physical: { label: "Physical", icon: Dumbbell, color: "#10b981" },
  creative: { label: "Creative", icon: Palette, color: "#f59e0b" },
  "life-skills": { label: "Life Skills", icon: Lightbulb, color: "#8b5cf6" },
};

const SCHEDULE_COLORS: Record<string, string> = {
  school: "#3b82f6", extracurricular: "#8b5cf6", play: "#10b981",
  rest: "#64748b", meals: "#f59e0b", chores: "#ef4444",
};

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

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [formName, setFormName] = useState("");
  const [formBirthDate, setFormBirthDate] = useState("");
  const [formColor, setFormColor] = useState(AVATAR_COLORS[0]);
  const [formNotes, setFormNotes] = useState("");

  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/children/dashboard/stats"],
  });

  const addChildMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/children", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/children/dashboard/stats"] });
      resetForm();
    },
  });

  const updateChildMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/children/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/children/dashboard/stats"] });
      resetForm();
    },
  });

  const deleteChildMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/children/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/children/dashboard/stats"] });
    },
  });

  function resetForm() {
    setShowAddForm(false);
    setEditingChild(null);
    setFormName("");
    setFormBirthDate("");
    setFormColor(AVATAR_COLORS[0]);
    setFormNotes("");
  }

  function openEditForm(child: Child) {
    setEditingChild(child);
    setFormName(child.name);
    setFormBirthDate(child.birthDate || "");
    setFormColor(child.avatarColor || AVATAR_COLORS[0]);
    setFormNotes(child.notes || "");
    setShowAddForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    const data = { name: formName, birthDate: formBirthDate, avatarColor: formColor, notes: formNotes };
    if (editingChild) {
      updateChildMutation.mutate({ id: editingChild.id, ...data });
    } else {
      addChildMutation.mutate(data);
    }
  }

  const children = dashboard?.children || [];
  const childStats = dashboard?.childStats || [];
  const today = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-24">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold">Development Tracker</h1>
              <p className="text-violet-200 text-xs">
                {dayNames[today.getDay()]}, {today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <button
              onClick={() => { resetForm(); setShowAddForm(true); }}
              className="flex items-center gap-1 text-sm px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Child
            </button>
          </div>

          {/* Quick Stats */}
          {dashboard && children.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <Target className="w-5 h-5 mx-auto mb-1 text-violet-200" />
                <p className="text-xl font-bold">{dashboard.totalActiveGoals}</p>
                <p className="text-[10px] text-violet-200">Active Goals</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-300" />
                <p className="text-xl font-bold">{dashboard.totalCompletedGoals}</p>
                <p className="text-[10px] text-violet-200">Completed</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-300" />
                <p className="text-xl font-bold">{dashboard.totalTodayActivities}</p>
                <p className="text-[10px] text-violet-200">Today's Tasks</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-300" />
                <p className="text-xl font-bold">{dashboard.totalMilestones}</p>
                <p className="text-[10px] text-violet-200">Milestones</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-3 space-y-4">
        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="border border-violet-200 bg-violet-50/50 dark:bg-violet-950/20 shadow-lg rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">
                {editingChild ? `Edit ${editingChild.name}` : "Add a Child"}
              </h3>
              <button onClick={resetForm} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" placeholder="Child's name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" type="date" value={formBirthDate} onChange={(e) => setFormBirthDate(e.target.value)} />
              <div>
                <p className="text-xs text-gray-500 mb-2">Theme Color</p>
                <div className="flex gap-2">
                  {AVATAR_COLORS.map((color) => (
                    <button key={color} type="button"
                      className={`w-7 h-7 rounded-full transition-all ${formColor === color ? "ring-2 ring-offset-2 ring-violet-500 scale-110" : "hover:scale-105"}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormColor(color)}
                    />
                  ))}
                </div>
              </div>
              <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" placeholder="Notes (optional)" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
              <button type="submit" className="w-full py-2 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-700 transition-colors disabled:opacity-50"
                disabled={addChildMutation.isPending || updateChildMutation.isPending}>
                {editingChild ? "Save Changes" : "Add Child"}
              </button>
            </form>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 h-32 animate-pulse bg-gray-100 dark:bg-gray-900" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && children.length === 0 && !showAddForm && (
          <div className="text-center py-16 space-y-4">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mx-auto shadow-sm">
              <Baby className="w-12 h-12 text-violet-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Welcome to the Dashboard</h2>
              <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
                Add your children to start tracking their learning development, goals, and daily schedules.
              </p>
            </div>
            <button onClick={() => setShowAddForm(true)} className="px-6 py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors inline-flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add Your First Child
            </button>
          </div>
        )}

        {/* Today's Schedule (Combined) */}
        {childStats.length > 0 && childStats.some(cs => cs.todaySchedule.length > 0) && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Today's Schedule</h3>
                <p className="text-[10px] text-gray-500">{dayNames[today.getDay()]}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {childStats.flatMap(cs =>
                cs.todaySchedule.map(entry => ({
                  ...entry,
                  childName: cs.child.name,
                  childColor: cs.child.avatarColor || "#8b5cf6",
                }))
              )
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((entry) => {
                const color = entry.color || SCHEDULE_COLORS[entry.category || ""] || "#64748b";
                return (
                  <div key={entry.id} className="flex items-center gap-3 py-1.5">
                    <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.activity}</p>
                      <p className="text-[10px] text-gray-500">
                        {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                      </p>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full text-white shrink-0"
                      style={{ backgroundColor: entry.childColor }}
                    >
                      {entry.childName.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Per-Child Sections */}
        {childStats.map((cs) => {
          const { child } = cs;
          const themeColor = child.avatarColor || "#8b5cf6";

          return (
            <div key={child.id} className="space-y-3">
              {/* Child Header Card */}
              <Link href={`/child/${child.id}`}>
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden cursor-pointer group hover:shadow-md transition-all">
                  <div className="h-1.5" style={{ backgroundColor: themeColor }} />
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm"
                        style={{ backgroundColor: themeColor }}
                      >
                        {getInitials(child.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-lg">{child.name}</h3>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        {child.birthDate && (
                          <p className="text-sm text-gray-500">Age: {getAge(child.birthDate)}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${themeColor}15`, color: themeColor }}>
                            {cs.activeGoals} goals
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                            {cs.recentMilestones.length} milestones
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">
                            {cs.completedGoals} done
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditForm(child); }}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          if (confirm(`Remove ${child.name}? This will delete all their data.`)) {
                            deleteChildMutation.mutate(child.id);
                          }
                        }}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                      <Link href={`/child/${child.id}`}>
                        <span
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs hover:opacity-80 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ml-auto font-medium"
                          style={{ color: themeColor }}
                        >
                          View Details <ChevronRight className="w-3 h-3" />
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Goal Progress Overview */}
              {cs.activeGoals > 0 && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4" style={{ color: themeColor }} />
                    <h4 className="font-semibold text-sm">Goal Progress</h4>
                    <span className="text-xs text-gray-500 ml-auto">{cs.avgProgress}% avg</span>
                  </div>
                  <div className="space-y-2.5">
                    {cs.goals.slice(0, 4).map(goal => {
                      const cat = GOAL_CATEGORIES[goal.category];
                      const CatIcon = cat?.icon || Target;
                      return (
                        <div key={goal.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CatIcon className="w-3.5 h-3.5" style={{ color: cat?.color || themeColor }} />
                              <span className="text-xs font-medium truncate max-w-[180px]">{goal.title}</span>
                            </div>
                            <span className="text-xs font-semibold" style={{ color: cat?.color || themeColor }}>
                              {goal.progress}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${goal.progress}%`, backgroundColor: cat?.color || themeColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Category Breakdown */}
                  {Object.keys(cs.goalsByCategory).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      {Object.entries(cs.goalsByCategory).map(([cat, counts]) => {
                        const catInfo = GOAL_CATEGORIES[cat];
                        if (!catInfo) return null;
                        const CatIcon = catInfo.icon;
                        return (
                          <div key={cat} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full"
                            style={{ backgroundColor: `${catInfo.color}10`, color: catInfo.color }}>
                            <CatIcon className="w-3 h-3" />
                            <span className="font-medium">{catInfo.label}</span>
                            <span className="opacity-70">{counts.active}a / {counts.completed}c</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Recent Mood & Log */}
              {cs.recentLogs.length > 0 && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-pink-500" />
                    <h4 className="font-semibold text-sm">Recent Days</h4>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {cs.recentLogs.slice(0, 7).map(log => {
                      const d = new Date(log.date + "T00:00:00");
                      const isToday = log.date === today.toISOString().split("T")[0];
                      return (
                        <div
                          key={log.id}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl min-w-[60px] ${
                            isToday ? "bg-violet-50 dark:bg-violet-950/20 ring-1 ring-violet-200 dark:ring-violet-800" : "bg-gray-50 dark:bg-gray-900"
                          }`}
                        >
                          <span className="text-[10px] text-gray-500 font-medium">
                            {d.toLocaleDateString("en-US", { weekday: "short" })}
                          </span>
                          <span className="text-xl">{log.mood || "---"}</span>
                          {log.sleepHours && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                              <Moon className="w-2.5 h-2.5" />{log.sleepHours}h
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {cs.recentLogs[0]?.highlights && Array.isArray(cs.recentLogs[0].highlights) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(cs.recentLogs[0].highlights as string[]).slice(0, 3).map((h, i) => (
                        <span key={i} className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">{h}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recent Milestones */}
              {cs.recentMilestones.length > 0 && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <h4 className="font-semibold text-sm">Recent Milestones</h4>
                  </div>
                  <div className="space-y-2">
                    {cs.recentMilestones.slice(0, 3).map(m => {
                      const cat = GOAL_CATEGORIES[m.category || ""];
                      return (
                        <div key={m.id} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat?.color || themeColor }} />
                          <span className="text-xs font-medium flex-1 truncate">{m.title}</span>
                          {m.achievedDate && (
                            <span className="text-[10px] text-gray-500 shrink-0">
                              {new Date(m.achievedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add another child hint */}
        {!isLoading && children.length > 0 && children.length < 2 && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-violet-300 hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-all"
          >
            <Plus className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Add another child</p>
          </button>
        )}
      </div>
    </div>
  );
}
