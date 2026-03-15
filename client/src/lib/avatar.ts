// ─── Organic Avatar Generator ────────────────────────────────
// Generates beautiful, unique SVG avatars with organic shapes,
// flowing gradients, and natural motifs instead of robotic faces.

const PALETTES: [string, string, string][] = [
  // Warm sunset
  ["#f97316", "#ec4899", "#fbbf24"],
  // Ocean depths
  ["#0ea5e9", "#6366f1", "#22d3ee"],
  // Forest mist
  ["#22c55e", "#14b8a6", "#86efac"],
  // Aurora
  ["#8b5cf6", "#06b6d4", "#a78bfa"],
  // Cherry blossom
  ["#f43f5e", "#fb7185", "#fda4af"],
  // Golden hour
  ["#f59e0b", "#d97706", "#fcd34d"],
  // Twilight
  ["#7c3aed", "#ec4899", "#c084fc"],
  // Jade
  ["#059669", "#10b981", "#6ee7b7"],
  // Coral reef
  ["#f472b6", "#fb923c", "#fca5a5"],
  // Storm
  ["#3b82f6", "#1d4ed8", "#93c5fd"],
  // Earth
  ["#b45309", "#92400e", "#d97706"],
  // Nebula
  ["#d946ef", "#8b5cf6", "#e879f9"],
];

const EL_PALETTES: Record<string, [string, string, string]> = {
  "金": ["#d4a843", "#f5d87a", "#e8c252"],
  "木": ["#16a34a", "#22c55e", "#86efac"],
  "水": ["#2563eb", "#3b82f6", "#93c5fd"],
  "火": ["#dc2626", "#f43f5e", "#fca5a5"],
  "土": ["#b45309", "#d97706", "#fbbf24"],
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seeded(h: number, i: number): number {
  const x = Math.sin(h * 9301 + i * 49297 + 233280) * 49297;
  return x - Math.floor(x);
}

// Generate a layered organic blob shape
function blobPath(cx: number, cy: number, r: number, h: number, idx: number, points = 6): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2 * i) / points;
    const wobble = r * (0.75 + seeded(h, idx * 100 + i) * 0.5);
    pts.push([
      cx + Math.cos(angle) * wobble,
      cy + Math.sin(angle) * wobble,
    ]);
  }
  // Smooth cubic bezier through points
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    const cp1x = curr[0] + (next[0] - pts[(i - 1 + pts.length) % pts.length][0]) * 0.2;
    const cp1y = curr[1] + (next[1] - pts[(i - 1 + pts.length) % pts.length][1]) * 0.2;
    const cp2x = next[0] - (pts[(i + 2) % pts.length][0] - curr[0]) * 0.2;
    const cp2y = next[1] - (pts[(i + 2) % pts.length][1] - curr[1]) * 0.2;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next[0].toFixed(1)} ${next[1].toFixed(1)}`;
  }
  return d + " Z";
}

// Nature-inspired motifs
function generateMotif(h: number): string {
  const motifType = h % 8;
  let svg = '';

  if (motifType === 0) {
    // Flowing wave lines
    const y1 = 55 + seeded(h, 1) * 20;
    const y2 = 50 + seeded(h, 2) * 25;
    svg += `<path d="M 10 ${y1.toFixed(0)} Q 30 ${(y1 - 15).toFixed(0)}, 50 ${y1.toFixed(0)} T 90 ${y1.toFixed(0)}" stroke="white" stroke-width="1.5" fill="none" opacity="0.2" stroke-linecap="round"/>`;
    svg += `<path d="M 5 ${y2.toFixed(0)} Q 25 ${(y2 + 12).toFixed(0)}, 50 ${y2.toFixed(0)} T 95 ${y2.toFixed(0)}" stroke="white" stroke-width="1" fill="none" opacity="0.12" stroke-linecap="round"/>`;
  } else if (motifType === 1) {
    // Constellation dots with thin connecting lines
    const dots: [number, number][] = [];
    for (let i = 0; i < 5; i++) {
      dots.push([15 + seeded(h, i * 2) * 70, 15 + seeded(h, i * 2 + 1) * 70]);
    }
    for (let i = 0; i < dots.length - 1; i++) {
      svg += `<line x1="${dots[i][0].toFixed(1)}" y1="${dots[i][1].toFixed(1)}" x2="${dots[i + 1][0].toFixed(1)}" y2="${dots[i + 1][1].toFixed(1)}" stroke="white" stroke-width="0.5" opacity="0.15"/>`;
    }
    dots.forEach((d, i) => {
      const r = 1.2 + seeded(h, i + 20) * 1.8;
      svg += `<circle cx="${d[0].toFixed(1)}" cy="${d[1].toFixed(1)}" r="${r.toFixed(1)}" fill="white" opacity="${(0.2 + seeded(h, i + 30) * 0.3).toFixed(2)}"/>`;
    });
  } else if (motifType === 2) {
    // Crescent moon
    const mx = 65 + seeded(h, 1) * 15;
    const my = 25 + seeded(h, 2) * 10;
    svg += `<circle cx="${mx.toFixed(0)}" cy="${my.toFixed(0)}" r="12" fill="white" opacity="0.15"/>`;
    svg += `<circle cx="${(mx + 5).toFixed(0)}" cy="${(my - 3).toFixed(0)}" r="10" fill="currentColor" class="text-background" opacity="0.9"/>`;
    // Small stars
    for (let i = 0; i < 3; i++) {
      const sx = 15 + seeded(h, i * 3 + 10) * 45;
      const sy = 15 + seeded(h, i * 3 + 11) * 30;
      svg += `<circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="1" fill="white" opacity="0.3"/>`;
    }
  } else if (motifType === 3) {
    // Abstract mountain/landscape silhouette
    svg += `<path d="M 0 85 L 20 ${55 + seeded(h, 1) * 15} L 40 ${65 + seeded(h, 2) * 10} L 60 ${45 + seeded(h, 3) * 15} L 80 ${60 + seeded(h, 4) * 10} L 100 ${50 + seeded(h, 5) * 15} L 100 100 L 0 100 Z" fill="white" opacity="0.06"/>`;
    svg += `<path d="M 0 90 L 25 ${70 + seeded(h, 6) * 10} L 50 ${75 + seeded(h, 7) * 8} L 75 ${65 + seeded(h, 8) * 10} L 100 ${72 + seeded(h, 9) * 8} L 100 100 L 0 100 Z" fill="white" opacity="0.04"/>`;
  } else if (motifType === 4) {
    // Floating petals/leaves
    for (let i = 0; i < 4; i++) {
      const px = 15 + seeded(h, i * 4) * 70;
      const py = 15 + seeded(h, i * 4 + 1) * 70;
      const rot = seeded(h, i * 4 + 2) * 360;
      const scale = 0.6 + seeded(h, i * 4 + 3) * 0.8;
      svg += `<ellipse cx="${px.toFixed(0)}" cy="${py.toFixed(0)}" rx="${(6 * scale).toFixed(1)}" ry="${(3 * scale).toFixed(1)}" fill="white" opacity="${(0.08 + seeded(h, i + 50) * 0.1).toFixed(2)}" transform="rotate(${rot.toFixed(0)} ${px.toFixed(0)} ${py.toFixed(0)})"/>`;
    }
  } else if (motifType === 5) {
    // Concentric ripples
    const cx = 40 + seeded(h, 1) * 20;
    const cy = 40 + seeded(h, 2) * 20;
    for (let i = 1; i <= 3; i++) {
      svg += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${(i * 12).toFixed(0)}" fill="none" stroke="white" stroke-width="0.8" opacity="${(0.15 - i * 0.03).toFixed(2)}"/>`;
    }
  } else if (motifType === 6) {
    // Yin-yang inspired flowing curve
    svg += `<path d="M 50 15 C 75 15, 85 50, 50 50 C 15 50, 25 85, 50 85" stroke="white" stroke-width="1.5" fill="none" opacity="0.12" stroke-linecap="round"/>`;
    svg += `<circle cx="50" cy="32" r="3" fill="white" opacity="0.15"/>`;
    svg += `<circle cx="50" cy="68" r="3" fill="white" opacity="0.1"/>`;
  } else {
    // Geometric crystal facets
    const cx = 50 + seeded(h, 1) * 10 - 5;
    const cy = 45 + seeded(h, 2) * 10 - 5;
    svg += `<polygon points="${cx},${cy - 20} ${cx + 15},${cy} ${cx + 8},${cy + 18} ${cx - 8},${cy + 18} ${cx - 15},${cy}" fill="white" opacity="0.06"/>`;
    svg += `<polygon points="${cx},${cy - 20} ${cx + 15},${cy} ${cx},${cy + 5}" fill="white" opacity="0.04"/>`;
    svg += `<line x1="${cx}" y1="${cy - 20}" x2="${cx}" y2="${cy + 18}" stroke="white" stroke-width="0.5" opacity="0.1"/>`;
  }

  return svg;
}

// Generate a small character/symbol in the center
function generateCenterSymbol(h: number): string {
  const symbolType = h % 7;

  if (symbolType === 0) {
    // Stylized eye
    return `<ellipse cx="50" cy="50" rx="12" ry="8" fill="none" stroke="white" stroke-width="1.8" opacity="0.6"/>
      <circle cx="50" cy="50" r="3.5" fill="white" opacity="0.7"/>
      <circle cx="51" cy="49" r="1.2" fill="white" opacity="0.9"/>`;
  } else if (symbolType === 1) {
    // Abstract face - minimal/cute
    return `<circle cx="42" cy="45" r="2.5" fill="white" opacity="0.6"/>
      <circle cx="58" cy="45" r="2.5" fill="white" opacity="0.6"/>
      <path d="M 44 56 Q 50 62 56 56" stroke="white" stroke-width="1.8" fill="none" opacity="0.5" stroke-linecap="round"/>`;
  } else if (symbolType === 2) {
    // Lotus/flower
    return `<path d="M 50 38 Q 42 46 50 54" stroke="white" stroke-width="1.5" fill="white" opacity="0.15" stroke-linecap="round"/>
      <path d="M 50 38 Q 58 46 50 54" stroke="white" stroke-width="1.5" fill="white" opacity="0.12" stroke-linecap="round"/>
      <path d="M 50 36 Q 44 44 50 54" stroke="white" stroke-width="1.2" fill="white" opacity="0.08" stroke-linecap="round" transform="rotate(-25 50 46)"/>
      <path d="M 50 36 Q 56 44 50 54" stroke="white" stroke-width="1.2" fill="white" opacity="0.08" stroke-linecap="round" transform="rotate(25 50 46)"/>
      <circle cx="50" cy="46" r="2" fill="white" opacity="0.4"/>`;
  } else if (symbolType === 3) {
    // Simple kanji-inspired mark
    return `<line x1="40" y1="43" x2="60" y2="43" stroke="white" stroke-width="2" opacity="0.5" stroke-linecap="round"/>
      <line x1="50" y1="38" x2="50" y2="60" stroke="white" stroke-width="2" opacity="0.4" stroke-linecap="round"/>
      <path d="M 42 52 Q 50 58 58 52" stroke="white" stroke-width="1.5" fill="none" opacity="0.35" stroke-linecap="round"/>`;
  } else if (symbolType === 4) {
    // Diamond/gem
    return `<polygon points="50,35 62,48 50,63 38,48" fill="none" stroke="white" stroke-width="1.5" opacity="0.5"/>
      <line x1="38" y1="48" x2="62" y2="48" stroke="white" stroke-width="0.8" opacity="0.3"/>
      <line x1="50" y1="35" x2="44" y2="48" stroke="white" stroke-width="0.8" opacity="0.25"/>
      <line x1="50" y1="35" x2="56" y2="48" stroke="white" stroke-width="0.8" opacity="0.25"/>`;
  } else if (symbolType === 5) {
    // Cute animal face (cat-like)
    return `<path d="M 38 40 L 42 32 L 46 40" stroke="white" stroke-width="1.5" fill="white" opacity="0.15" stroke-linejoin="round"/>
      <path d="M 54 40 L 58 32 L 62 40" stroke="white" stroke-width="1.5" fill="white" opacity="0.15" stroke-linejoin="round"/>
      <circle cx="43" cy="47" r="2" fill="white" opacity="0.55"/>
      <circle cx="57" cy="47" r="2" fill="white" opacity="0.55"/>
      <ellipse cx="50" cy="52" rx="2" ry="1.5" fill="white" opacity="0.5"/>
      <path d="M 50 53.5 L 48 56" stroke="white" stroke-width="1" opacity="0.3" stroke-linecap="round"/>
      <path d="M 50 53.5 L 52 56" stroke="white" stroke-width="1" opacity="0.3" stroke-linecap="round"/>`;
  } else {
    // Abstract spiral
    return `<path d="M 50 42 C 56 42, 58 48, 54 50 C 50 52, 46 48, 48 46 C 50 44, 54 46, 52 48" stroke="white" stroke-width="1.5" fill="none" opacity="0.4" stroke-linecap="round"/>
      <circle cx="50" cy="55" r="1.5" fill="white" opacity="0.3"/>`;
  }
}

export function clientAvatarSvg(name: string, element?: string | null): string {
  const h = hash(name);
  const palette = element && EL_PALETTES[element]
    ? EL_PALETTES[element]
    : PALETTES[h % PALETTES.length];

  const [c1, c2, c3] = palette;
  const rotAngle = (seeded(h, 99) * 360).toFixed(0);

  // Build SVG with multiple layers
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${rotAngle} 0.5 0.5)">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="50%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c3}"/>
      </linearGradient>
      <radialGradient id="glow" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stop-color="white" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
        <stop offset="60%" stop-color="black" stop-opacity="0"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.25"/>
      </radialGradient>
    </defs>
    <rect width="100" height="100" rx="22" fill="url(#bg)"/>
    <rect width="100" height="100" rx="22" fill="url(#glow)"/>
    <path d="${blobPath(50, 50, 32, h, 0, 7)}" fill="white" opacity="0.07"/>
    <path d="${blobPath(30, 65, 22, h, 1, 5)}" fill="white" opacity="0.05"/>
    <path d="${blobPath(72, 35, 18, h, 2, 6)}" fill="white" opacity="0.04"/>
    ${generateMotif(h >> 2)}
    ${generateCenterSymbol(h >> 1)}
    <rect width="100" height="100" rx="22" fill="url(#vignette)"/>
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export { hash as hashString };
