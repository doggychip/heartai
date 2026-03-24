import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import SparkMap from "@/components/SparkMap";
import type { SparkScore } from "@/components/SparkMap";
import {
  ArrowLeft, Users, Target, Trophy, BookOpen, Sparkles,
} from "lucide-react";

interface Child { id: string; name: string; birthDate: string | null; avatarColor: string | null; notes: string | null; }
interface CompareData {
  child: Child;
  sparkScore: { cognitive: number; language: number; socialEmotional: number; physical: number; creative: number; independence: number } | null;
  storyCount: number;
  milestoneCount: number;
  activeGoals: number;
  completedGoals: number;
}
interface CompareResponse { children: Child[]; comparisons: CompareData[]; }

function getAge(birthDate: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const am = months < 0 ? months + 12 : months;
  const ay = months < 0 ? years - 1 : years;
  if (ay === 0) return `${am}m`;
  if (am === 0) return `${ay}y`;
  return `${ay}y ${am}m`;
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function SiblingPortraits() {
  const { data, isLoading } = useQuery<CompareResponse>({
    queryKey: ["/api/children/compare"],
  });

  const comparisons = data?.comparisons || [];

  // Get spark data for overlay comparison
  const child1 = comparisons[0];
  const child2 = comparisons[1];
  const spark1: SparkScore | null = child1?.sparkScore || null;
  const spark2: SparkScore | null = child2?.sparkScore || null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-24">
      <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-violet-600 text-white">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/">
              <button className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Sibling Portraits</h1>
              <p className="text-pink-100 text-xs">How they're different, not who's better</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-2 space-y-4">
        {isLoading && <div className="text-center py-12 text-gray-400">Loading...</div>}

        {!isLoading && comparisons.length < 2 && (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Add at least two children to see sibling portraits</p>
            <Link href="/">
              <button className="mt-3 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-medium">Go to Dashboard</button>
            </Link>
          </div>
        )}

        {comparisons.length >= 2 && (
          <>
            {/* Combined Spark Map */}
            {(spark1 || spark2) && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  <h3 className="font-semibold text-sm">Development Profiles</h3>
                </div>
                <div className="flex justify-center">
                  <SparkMap
                    scores={spark1}
                    themeColor={child1?.child.avatarColor || "#8b5cf6"}
                    childName={child1?.child.name.split(" ")[0]}
                    compareScores={spark2}
                    compareName={child2?.child.name.split(" ")[0]}
                    compareColor={child2?.child.avatarColor || "#ec4899"}
                    size={300}
                  />
                </div>
              </div>
            )}

            {/* Side by Side Cards */}
            <div className="grid grid-cols-2 gap-3">
              {comparisons.map(c => {
                const themeColor = c.child.avatarColor || "#8b5cf6";
                return (
                  <Link key={c.child.id} href={`/child/${c.child.id}`}>
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden cursor-pointer hover:shadow-md transition-all">
                      <div className="h-1.5" style={{ backgroundColor: themeColor }} />
                      <div className="p-4 text-center">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-2" style={{ backgroundColor: themeColor }}>
                          {getInitials(c.child.name)}
                        </div>
                        <h3 className="font-bold">{c.child.name}</h3>
                        {c.child.birthDate && <p className="text-xs text-gray-500">{getAge(c.child.birthDate)}</p>}

                        <div className="space-y-2 mt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 flex items-center gap-1"><Target className="w-3 h-3" /> Goals</span>
                            <span className="text-xs font-bold">{c.activeGoals} active</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 flex items-center gap-1"><Trophy className="w-3 h-3" /> Milestones</span>
                            <span className="text-xs font-bold">{c.milestoneCount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Stories</span>
                            <span className="text-xs font-bold">{c.storyCount}</span>
                          </div>
                        </div>

                        {/* Spark highlights */}
                        {c.sparkScore && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-[10px] text-gray-500 mb-1">Strongest domains</p>
                            {(() => {
                              const entries = Object.entries(c.sparkScore).filter(([k]) => k !== 'id' && k !== 'childId' && k !== 'date' && k !== 'notes');
                              const sorted = entries.sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 2);
                              const labels: Record<string, string> = { cognitive: "Cognitive", language: "Language", socialEmotional: "Social", physical: "Physical", creative: "Creative", independence: "Independence" };
                              return (
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {sorted.map(([k, v]) => (
                                    <span key={k} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${themeColor}15`, color: themeColor }}>
                                      {labels[k] || k}: {v as number}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Unique Strengths */}
            {spark1 && spark2 && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <h3 className="font-semibold text-sm mb-3">What makes each unique</h3>
                {comparisons.map(c => {
                  if (!c.sparkScore) return null;
                  const entries = Object.entries(c.sparkScore).filter(([k]) => !['id', 'childId', 'date', 'notes'].includes(k));
                  const best = entries.sort((a, b) => (b[1] as number) - (a[1] as number))[0];
                  const labels: Record<string, string> = { cognitive: "thinking and problem-solving", language: "communication and expression", socialEmotional: "empathy and social skills", physical: "movement and coordination", creative: "imagination and artistic expression", independence: "self-reliance and responsibility" };
                  return (
                    <div key={c.child.id} className="flex items-start gap-3 mb-3 last:mb-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: c.child.avatarColor || "#8b5cf6" }}>
                        {getInitials(c.child.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.child.name.split(" ")[0]}</p>
                        <p className="text-xs text-gray-500">Shines brightest in <strong>{labels[best[0]] || best[0]}</strong> ({best[1]}/10)</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
