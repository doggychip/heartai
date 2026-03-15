/**
 * Deterministic SVG avatar generator for agents.
 * Produces unique, colorful geometric avatars based on name/seed.
 * No external API needed — pure SVG data URIs.
 */

// ─── Color palettes (curated, vibrant, good contrast with white icon) ───
const PALETTES = [
  ["#6366f1", "#818cf8"], // Indigo
  ["#8b5cf6", "#a78bfa"], // Violet
  ["#ec4899", "#f472b6"], // Pink
  ["#ef4444", "#f87171"], // Red
  ["#f97316", "#fb923c"], // Orange
  ["#eab308", "#facc15"], // Yellow
  ["#22c55e", "#4ade80"], // Green
  ["#14b8a6", "#2dd4bf"], // Teal
  ["#06b6d4", "#22d3ee"], // Cyan
  ["#3b82f6", "#60a5fa"], // Blue
  ["#a855f7", "#c084fc"], // Purple
  ["#d946ef", "#e879f9"], // Fuchsia
  ["#f43f5e", "#fb7185"], // Rose
  ["#0ea5e9", "#38bdf8"], // Sky
  ["#10b981", "#34d399"], // Emerald
];

// 五行 element → color override
const ELEMENT_COLORS: Record<string, [string, string]> = {
  "金": ["#d4a843", "#e8c252"],
  "木": ["#22a55e", "#3cc57a"],
  "水": ["#2563eb", "#4b8cf7"],
  "火": ["#e63946", "#f06070"],
  "土": ["#b87333", "#cc8844"],
};

// Simple hash from string to number
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Seeded random based on hash
function seeded(hash: number, index: number): number {
  const x = Math.sin(hash * 9301 + index * 49297 + 233280) * 49297;
  return x - Math.floor(x);
}

// ─── Shape generators ───
function generateFace(h: number): string {
  // Generate a cute robot/avatar face
  const eyeStyle = h % 4;
  const mouthStyle = h % 3;
  const hasAntenna = h % 3 === 0;
  const hasEars = h % 2 === 0;
  
  let svg = '';
  
  // Head shape variations
  const headShapes = [
    // Rounded square
    `<rect x="24" y="22" width="52" height="52" rx="16" fill="white" opacity="0.2"/>`,
    // Circle
    `<circle cx="50" cy="48" r="26" fill="white" opacity="0.2"/>`,
    // Rounded rectangle (taller)
    `<rect x="26" y="18" width="48" height="56" rx="18" fill="white" opacity="0.2"/>`,
    // Rounded rectangle (wider)
    `<rect x="20" y="24" width="60" height="48" rx="14" fill="white" opacity="0.2"/>`,
  ];
  svg += headShapes[h % headShapes.length];
  
  // Eyes
  const eyeY = 42;
  switch (eyeStyle) {
    case 0: // Round eyes
      svg += `<circle cx="40" cy="${eyeY}" r="4.5" fill="white"/>`;
      svg += `<circle cx="60" cy="${eyeY}" r="4.5" fill="white"/>`;
      svg += `<circle cx="41.5" cy="${eyeY - 0.5}" r="1.8" fill="rgba(0,0,0,0.5)"/>`;
      svg += `<circle cx="61.5" cy="${eyeY - 0.5}" r="1.8" fill="rgba(0,0,0,0.5)"/>`;
      break;
    case 1: // Dot eyes
      svg += `<circle cx="40" cy="${eyeY}" r="3" fill="white"/>`;
      svg += `<circle cx="60" cy="${eyeY}" r="3" fill="white"/>`;
      break;
    case 2: // Line eyes (happy squint)
      svg += `<path d="M36 ${eyeY} Q40 ${eyeY - 4} 44 ${eyeY}" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
      svg += `<path d="M56 ${eyeY} Q60 ${eyeY - 4} 64 ${eyeY}" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
      break;
    case 3: // Star eyes
      svg += `<text x="40" y="${eyeY + 4}" text-anchor="middle" fill="white" font-size="10">✦</text>`;
      svg += `<text x="60" y="${eyeY + 4}" text-anchor="middle" fill="white" font-size="10">✦</text>`;
      break;
  }
  
  // Mouth
  const mouthY = 56;
  switch (mouthStyle) {
    case 0: // Smile
      svg += `<path d="M43 ${mouthY} Q50 ${mouthY + 6} 57 ${mouthY}" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      break;
    case 1: // Small o
      svg += `<circle cx="50" cy="${mouthY + 2}" r="3" fill="white" opacity="0.6"/>`;
      break;
    case 2: // Dash
      svg += `<line x1="44" y1="${mouthY + 2}" x2="56" y2="${mouthY + 2}" stroke="white" stroke-width="2" stroke-linecap="round"/>`;
      break;
  }
  
  // Antenna
  if (hasAntenna) {
    svg += `<line x1="50" y1="22" x2="50" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/>`;
    svg += `<circle cx="50" cy="10" r="3" fill="white" opacity="0.8"/>`;
  }
  
  // Ears / side decorations
  if (hasEars) {
    svg += `<circle cx="20" cy="44" r="5" fill="white" opacity="0.2"/>`;
    svg += `<circle cx="80" cy="44" r="5" fill="white" opacity="0.2"/>`;
  }
  
  // Blush marks (cute touch)
  if (h % 5 === 0) {
    svg += `<circle cx="34" cy="52" r="4" fill="white" opacity="0.15"/>`;
    svg += `<circle cx="66" cy="52" r="4" fill="white" opacity="0.15"/>`;
  }
  
  return svg;
}

function generatePattern(h: number): string {
  const patternType = h % 6;
  let svg = '';
  
  switch (patternType) {
    case 0: // Dots
      for (let i = 0; i < 5; i++) {
        const x = 10 + seeded(h, i * 2) * 80;
        const y = 10 + seeded(h, i * 2 + 1) * 80;
        const r = 2 + seeded(h, i + 10) * 4;
        svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="white" opacity="0.08"/>`;
      }
      break;
    case 1: // Diagonal lines
      svg += `<line x1="0" y1="100" x2="100" y2="0" stroke="white" stroke-width="0.5" opacity="0.1"/>`;
      svg += `<line x1="20" y1="100" x2="100" y2="20" stroke="white" stroke-width="0.5" opacity="0.06"/>`;
      break;
    case 2: // Corner accent
      svg += `<circle cx="0" cy="0" r="30" fill="white" opacity="0.06"/>`;
      svg += `<circle cx="100" cy="100" r="20" fill="white" opacity="0.06"/>`;
      break;
    case 3: // Subtle grid
      svg += `<rect x="0" y="80" width="100" height="20" fill="white" opacity="0.04"/>`;
      break;
    case 4: // Stars
      svg += `<text x="85" y="18" fill="white" opacity="0.12" font-size="12">✦</text>`;
      svg += `<text x="10" y="90" fill="white" opacity="0.08" font-size="8">✦</text>`;
      break;
    case 5: // Clean (no pattern)
      break;
  }
  
  return svg;
}

/**
 * Generate a unique SVG avatar for an agent.
 * @param name - Agent name/nickname
 * @param element - 五行 element (金木水火土) for color theming
 * @param seed - Optional extra seed for more variation
 * @returns SVG data URI string
 */
export function generateAgentAvatar(name: string, element?: string, seed?: string): string {
  const fullSeed = `${name}${seed || ''}`;
  const h = hashStr(fullSeed);
  
  // Pick colors
  let colors: [string, string];
  if (element && ELEMENT_COLORS[element]) {
    colors = ELEMENT_COLORS[element];
  } else {
    colors = PALETTES[h % PALETTES.length];
  }
  
  const face = generateFace(h);
  const pattern = generatePattern(h >> 4);
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors[1]}"/>
      <stop offset="100%" style="stop-color:${colors[0]}"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#bg)"/>
  ${pattern}
  ${face}
</svg>`;
  
  // Return as data URI
  const encoded = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}
