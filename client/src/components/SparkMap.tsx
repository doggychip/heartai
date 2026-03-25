// SVG Radar Chart for child development domains
const DOMAINS = [
  { key: 'cognitive', label: '认知', color: '#3b82f6' },
  { key: 'language', label: '语言', color: '#8b5cf6' },
  { key: 'socialEmotional', label: '社交', color: '#ec4899' },
  { key: 'physical', label: '体能', color: '#10b981' },
  { key: 'creative', label: '创意', color: '#f59e0b' },
  { key: 'independence', label: '独立', color: '#ef4444' },
];

interface SparkScore {
  cognitive: number;
  language: number;
  socialEmotional: number;
  physical: number;
  creative: number;
  independence: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function SparkMap({
  scores,
  size = 260,
  themeColor = '#8b5cf6',
  childName,
  compareScores,
  compareName,
  compareColor,
}: {
  scores: SparkScore | null;
  size?: number;
  themeColor?: string;
  childName?: string;
  compareScores?: SparkScore | null;
  compareName?: string;
  compareColor?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 36;
  const levels = [2, 4, 6, 8, 10];
  const angleStep = 360 / DOMAINS.length;

  function getPolygonPoints(data: SparkScore): string {
    return DOMAINS.map((d, i) => {
      const val = (data as any)[d.key] || 0;
      const r = (val / 10) * maxR;
      const { x, y } = polarToCartesian(cx, cy, r, i * angleStep);
      return `${x},${y}`;
    }).join(' ');
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {levels.map(level => {
          const r = (level / 10) * maxR;
          const points = DOMAINS.map((_, i) => {
            const { x, y } = polarToCartesian(cx, cy, r, i * angleStep);
            return `${x},${y}`;
          }).join(' ');
          return <polygon key={level} points={points} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />;
        })}
        {DOMAINS.map((_, i) => {
          const { x, y } = polarToCartesian(cx, cy, maxR, i * angleStep);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />;
        })}
        {compareScores && (
          <polygon points={getPolygonPoints(compareScores)} fill={compareColor || '#94a3b8'} fillOpacity={0.12} stroke={compareColor || '#94a3b8'} strokeWidth={1.5} strokeOpacity={0.4} strokeDasharray="4 2" />
        )}
        {scores && (
          <polygon points={getPolygonPoints(scores)} fill={themeColor} fillOpacity={0.2} stroke={themeColor} strokeWidth={2} />
        )}
        {scores && DOMAINS.map((d, i) => {
          const val = (scores as any)[d.key] || 0;
          const r = (val / 10) * maxR;
          const { x, y } = polarToCartesian(cx, cy, r, i * angleStep);
          return <circle key={d.key} cx={x} cy={y} r={3.5} fill={themeColor} stroke="white" strokeWidth={2} />;
        })}
        {DOMAINS.map((d, i) => {
          const { x, y } = polarToCartesian(cx, cy, maxR + 20, i * angleStep);
          return <text key={d.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="text-[10px] fill-muted-foreground" fontWeight={500}>{d.label}</text>;
        })}
      </svg>
      {(childName || compareName) && (
        <div className="flex items-center gap-4 mt-1">
          {childName && <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} /><span className="text-[10px] text-muted-foreground font-medium">{childName}</span></div>}
          {compareName && <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: compareColor || '#94a3b8' }} /><span className="text-[10px] text-muted-foreground font-medium">{compareName}</span></div>}
        </div>
      )}
    </div>
  );
}

export { DOMAINS };
export type { SparkScore };
