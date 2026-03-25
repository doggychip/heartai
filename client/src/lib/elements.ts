// Shared Five Elements (五行) constants — used across bazi, culture, fortune, avatar, and other pages
// Import from here instead of redefining in each page component.

import { Mountain, TreePine, Droplets, Flame, CircleDot, type LucideIcon } from "lucide-react";

/** Text and background color classes for each element */
export const ELEMENT_COLORS: Record<string, { text: string; bg: string }> = {
  金: { text: "text-amber-400", bg: "bg-amber-400/15" },
  木: { text: "text-green-400", bg: "bg-green-400/15" },
  水: { text: "text-blue-400", bg: "bg-blue-400/15" },
  火: { text: "text-red-400", bg: "bg-red-400/15" },
  土: { text: "text-yellow-700 dark:text-yellow-600", bg: "bg-yellow-600/15" },
};

/** Solid background color class for bars/charts */
export const ELEMENT_BAR_COLORS: Record<string, string> = {
  金: "bg-amber-400",
  木: "bg-green-400",
  水: "bg-blue-400",
  火: "bg-red-400",
  土: "bg-yellow-600",
};

/** Lucide icon for each element */
export const ELEMENT_ICONS: Record<string, LucideIcon> = {
  金: Mountain,
  木: TreePine,
  水: Droplets,
  火: Flame,
  土: CircleDot,
};

/** Emoji for each element */
export const ELEMENT_EMOJI: Record<string, string> = {
  金: "✨",
  木: "🌿",
  水: "💧",
  火: "🔥",
  土: "🪨",
};

/** Personality style description for each element */
export const ELEMENT_STYLE: Record<string, string> = {
  金: "果断坚定，言简意赅",
  木: "温暖向上，富有生命力",
  水: "深邃灵活，善于变通",
  火: "热情洋溢，充满活力",
  土: "稳重踏实，包容大度",
};

/** Get element text color class, with fallback */
export function getElementColor(element: string): string {
  return ELEMENT_COLORS[element]?.text ?? "text-foreground";
}

/** Get element bg color class, with fallback */
export function getElementBg(element: string): string {
  return ELEMENT_COLORS[element]?.bg ?? "bg-muted/20";
}
