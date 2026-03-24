import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  ArrowLeft, Plus, Baby, Target, Calendar, Trophy,
  ChevronRight, Pencil, Trash2, X
} from "lucide-react";

interface Child {
  id: string;
  name: string;
  birthDate: string | null;
  avatarColor: string | null;
  notes: string | null;
  createdAt: string;
}

interface ChildGoal {
  id: string;
  childId: string;
  category: string;
  title: string;
  status: string;
  progress: number;
}

const AVATAR_COLORS = [
  "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#ef4444", "#06b6d4", "#f97316",
];

function getAge(birthDate: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const adjustedMonths = months < 0 ? months + 12 : months;
  const adjustedYears = months < 0 ? years - 1 : years;
  if (adjustedYears === 0) return `${adjustedMonths}mo`;
  if (adjustedMonths === 0) return `${adjustedYears}y`;
  return `${adjustedYears}y ${adjustedMonths}mo`;
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ChildTrackerPage() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [formName, setFormName] = useState("");
  const [formBirthDate, setFormBirthDate] = useState("");
  const [formColor, setFormColor] = useState(AVATAR_COLORS[0]);
  const [formNotes, setFormNotes] = useState("");

  const { data: children = [], isLoading } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  // Fetch goals for all children to show summary counts
  const { data: allGoals = {} } = useQuery<Record<string, ChildGoal[]>>({
    queryKey: ["/api/children/all-goals-summary"],
    queryFn: async () => {
      const goalMap: Record<string, ChildGoal[]> = {};
      for (const child of children) {
        try {
          const res = await apiRequest("GET", `/api/children/${child.id}/goals`);
          goalMap[child.id] = await res.json();
        } catch { goalMap[child.id] = []; }
      }
      return goalMap;
    },
    enabled: children.length > 0,
  });

  const addChildMutation = useMutation({
    mutationFn: async (data: { name: string; birthDate: string; avatarColor: string; notes: string }) => {
      const res = await apiRequest("POST", "/api/children", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      resetForm();
    },
  });

  const updateChildMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; birthDate: string; avatarColor: string; notes: string }) => {
      const res = await apiRequest("PATCH", `/api/children/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      resetForm();
    },
  });

  const deleteChildMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/children/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
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

  const charlotte = children.find(c => c.name.toLowerCase().includes("charlotte"));
  const annabelle = children.find(c => c.name.toLowerCase().includes("annabelle"));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="p-2 rounded-xl hover:bg-accent transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-bold">Child Development</h1>
              <p className="text-xs text-muted-foreground">Track growth, goals & schedules</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="rounded-xl gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Child
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Add/Edit Form */}
        {showAddForm && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">
                  {editingChild ? `Edit ${editingChild.name}` : "Add a Child"}
                </h3>
                <button onClick={resetForm} className="p-1 rounded hover:bg-accent">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  placeholder="Child's name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
                <Input
                  type="date"
                  placeholder="Birth date"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Theme Color</p>
                  <div className="flex gap-2">
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-7 h-7 rounded-full transition-all ${formColor === color ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : "hover:scale-105"}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormColor(color)}
                      />
                    ))}
                  </div>
                </div>
                <Input
                  placeholder="Notes (optional)"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
                <Button
                  type="submit"
                  className="w-full rounded-xl"
                  disabled={addChildMutation.isPending || updateChildMutation.isPending}
                >
                  {editingChild ? "Save Changes" : "Add Child"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i}><CardContent className="p-4 h-24 animate-pulse bg-muted/30" /></Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && children.length === 0 && !showAddForm && (
          <div className="text-center py-16 space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Baby className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Start Tracking Development</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Add Charlotte and Annabelle to begin tracking their learning, goals, and daily schedules.
              </p>
            </div>
            <Button onClick={() => setShowAddForm(true)} className="rounded-xl gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Child
            </Button>
          </div>
        )}

        {/* Children List */}
        {children.map((child) => {
          const goals = allGoals[child.id] || [];
          const activeGoals = goals.filter(g => g.status === "active");
          const completedGoals = goals.filter(g => g.status === "completed");
          const avgProgress = activeGoals.length > 0
            ? Math.round(activeGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / activeGoals.length)
            : 0;

          return (
            <Link key={child.id} href={`/child/${child.id}`}>
              <Card className="hover:border-primary/30 transition-all cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                      style={{ backgroundColor: child.avatarColor || "#8b5cf6" }}
                    >
                      {getInitials(child.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-base">{child.name}</h3>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      {child.birthDate && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Age: {getAge(child.birthDate)}
                        </p>
                      )}

                      {/* Stats Row */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Target className="w-3.5 h-3.5 text-blue-500" />
                          <span>{activeGoals.length} active goals</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          <span>{completedGoals.length} completed</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {activeGoals.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Avg Progress</span>
                            <span className="font-medium">{avgProgress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${avgProgress}%`,
                                backgroundColor: child.avatarColor || "#8b5cf6",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditForm(child); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-accent"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Remove ${child.name}? This will delete all their data.`)) {
                          deleteChildMutation.mutate(child.id);
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {/* Quick Start Hint */}
        {!isLoading && children.length > 0 && children.length < 2 && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full border-2 border-dashed border-muted-foreground/20 rounded-2xl p-6 text-center hover:border-primary/30 hover:bg-primary/5 transition-all"
          >
            <Plus className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Add another child</p>
          </button>
        )}
      </div>
    </div>
  );
}
