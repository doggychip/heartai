import html2canvas from "html2canvas";

/**
 * Capture a DOM element as a high-resolution PNG data URL using html2canvas.
 * Uses 2x pixel density for crisp output on retina screens.
 */
export async function captureCard(element: HTMLElement): Promise<string> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: false,
    allowTaint: false,
    backgroundColor: null,
    logging: false,
  });
  return canvas.toDataURL("image/png");
}

/**
 * Capture a DOM element as a Blob for sharing via native Web Share API.
 */
export async function captureCardBlob(element: HTMLElement): Promise<Blob | null> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: false,
    allowTaint: false,
    backgroundColor: null,
    logging: false,
  });
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/**
 * Download a data URL as a PNG file.
 */
export function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/** Score label mapping used across all cards */
export function getScoreLabel(score: number): string {
  if (score >= 90) return "\u5927\u5409"; // 大吉
  if (score >= 75) return "\u5409";       // 吉
  if (score >= 60) return "\u4e2d\u5409"; // 中吉
  if (score >= 40) return "\u5e73";       // 平
  return "\u51f6";                         // 凶
}

/** Five-element color mapping */
export const ELEMENT_COLORS: Record<string, string> = {
  "\u91d1": "#D4A843", // 金 gold
  "\u6728": "#22C55E", // 木 green
  "\u6c34": "#3B82F6", // 水 blue
  "\u706b": "#EF4444", // 火 red
  "\u571f": "#D97706", // 土 orange/brown
};

/** Five-element emoji mapping */
export const ELEMENT_EMOJI: Record<string, string> = {
  "\u91d1": "\ud83e\ude99", // 金 🪙
  "\u6728": "\ud83c\udf3f", // 木 🌿
  "\u6c34": "\ud83d\udca7", // 水 💧
  "\u706b": "\ud83d\udd25", // 火 🔥
  "\u571f": "\ud83e\udea8", // 土 🪨
};
