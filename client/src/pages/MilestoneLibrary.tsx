import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft, Brain, MessageCircle, Heart, Dumbbell,
  Palette, Star, Check, ChevronDown, ChevronUp,
} from "lucide-react";

interface LibraryMilestone {
  id: string;
  ageMin: number;
  ageMax: number;
  domain: string;
  title: string;
  description: string | null;
}

const DOMAINS = [
  { value: "cognitive", label: "Cognitive", icon: Brain, color: "#3b82f6" },
  { value: "language", label: "Language", icon: MessageCircle, color: "#8b5cf6" },
  { value: "social-emotional", label: "Social-Emotional", icon: Heart, color: "#ec4899" },
  { value: "physical", label: "Physical", icon: Dumbbell, color: "#10b981" },
  { value: "creative", label: "Creative", icon: Palette, color: "#f59e0b" },
  { value: "independence", label: "Independence", icon: Star, color: "#ef4444" },
];

const AGE_GROUPS = [
  { min: 2, max: 3, label: "2-3 years" },
  { min: 3, max: 4, label: "3-4 years" },
  { min: 4, max: 5, label: "4-5 years" },
  { min: 5, max: 6, label: "5-6 years" },
  { min: 6, max: 7, label: "6-7 years" },
  { min: 7, max: 8, label: "7-8 years" },
  { min: 8, max: 10, label: "8-10 years" },
];

export default function MilestoneLibrary() {
  const [selectedAge, setSelectedAge] = useState<{ min: number; max: number } | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: milestones = [] } = useQuery<LibraryMilestone[]>({
    queryKey: ["/api/milestone-library"],
  });

  const filtered = milestones.filter(m => {
    if (selectedAge && (m.ageMin !== selectedAge.min || m.ageMax !== selectedAge.max)) return false;
    if (selectedDomain && m.domain !== selectedDomain) return false;
    return true;
  });

  // Group by age
  const grouped = AGE_GROUPS.map(ag => ({
    ...ag,
    milestones: filtered.filter(m => m.ageMin === ag.min && m.ageMax === ag.max),
  })).filter(g => g.milestones.length > 0);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-24">
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/">
              <button className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Milestone Library</h1>
              <p className="text-amber-100 text-xs">Age-based developmental milestones (ages 2-10)</p>
            </div>
          </div>

          {/* Age Filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedAge(null)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${!selectedAge ? "bg-white text-orange-600 font-medium" : "bg-white/15 hover:bg-white/25"}`}
            >All Ages</button>
            {AGE_GROUPS.map(ag => (
              <button
                key={ag.label}
                onClick={() => setSelectedAge(selectedAge?.min === ag.min ? null : ag)}
                className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${selectedAge?.min === ag.min ? "bg-white text-orange-600 font-medium" : "bg-white/15 hover:bg-white/25"}`}
              >{ag.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-2 space-y-4">
        {/* Domain Filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedDomain(null)}
            className={`text-xs px-2.5 py-1 rounded-full transition-all ${!selectedDomain ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}
          >All Domains</button>
          {DOMAINS.map(d => (
            <button
              key={d.value}
              onClick={() => setSelectedDomain(selectedDomain === d.value ? null : d.value)}
              className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 transition-all ${selectedDomain === d.value ? "text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}
              style={selectedDomain === d.value ? { backgroundColor: d.color } : {}}
            >
              <d.icon className="w-3 h-3" />{d.label}
            </button>
          ))}
        </div>

        {/* Grouped Milestones */}
        {grouped.map(group => (
          <div key={group.label}>
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
              <span className="text-lg">{"🧒"}</span>
              {group.label}
              <span className="text-xs text-gray-400 font-normal">({group.milestones.length} milestones)</span>
            </h3>
            <div className="space-y-1.5">
              {group.milestones.map(m => {
                const domain = DOMAINS.find(d => d.value === m.domain);
                const DIcon = domain?.icon || Star;
                const isExpanded = expandedId === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                    className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${domain?.color || "#8b5cf6"}15` }}>
                        <DIcon className="w-3.5 h-3.5" style={{ color: domain?.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{m.title}</p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${domain?.color}15`, color: domain?.color }}>{domain?.label}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                    </div>
                    {isExpanded && m.description && (
                      <p className="text-xs text-gray-500 mt-2 pl-10">{m.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No milestones match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
