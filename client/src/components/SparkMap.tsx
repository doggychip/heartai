// SVG Radar Chart for child development domains
const DOMAINS = [
  { key: 'cognitive', label: 'Cognitive', color: '#3b82f6' },
  { key: 'language', label: 'Language', color: '#8b5cf6' },
  { key: 'socialEmotional', label: 'Social', color: '#ec4899' },
  { key: 'physical', label: 'Physical', color: '#10b981' },
  { key: 'creative', label: 'Creative', color: '#f59e0b' },
  { key: 'independence', label: 'Independence', color: '#ef4444' },
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
  size = 280,
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
  const maxR = size / 2 - 40;
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
        {/* Grid circles */}
        {levels.map(level => {
          const r = (level / 10) * maxR;
          const points = DOMAINS.map((_, i) => {
            const { x, y } = polarToCartesian(cx, cy, r, i * angleStep);
            return `${x},${y}`;
          }).join(' ');
          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
            />
          );
        })}

        {/* Axis lines */}
        {DOMAINS.map((_, i) => {
          const { x, y } = polarToCartesian(cx, cy, maxR, i * angleStep);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
            />
          );
        })}

        {/* Compare data polygon (behind) */}
        {compareScores && (
          <polygon
            points={getPolygonPoints(compareScores)}
            fill={compareColor || '#94a3b8'}
            fillOpacity={0.15}
            stroke={compareColor || '#94a3b8'}
            strokeWidth={1.5}
            strokeOpacity={0.5}
            strokeDasharray="4 2"
          />
        )}

        {/* Data polygon */}
        {scores && (
          <polygon
            points={getPolygonPoints(scores)}
            fill={themeColor}
            fillOpacity={0.2}
            stroke={themeColor}
            strokeWidth={2}
          />
        )}

        {/* Data points */}
        {scores && DOMAINS.map((d, i) => {
          const val = (scores as any)[d.key] || 0;
          const r = (val / 10) * maxR;
          const { x, y } = polarToCartesian(cx, cy, r, i * angleStep);
          return (
            <circle
              key={d.key}
              cx={x}
              cy={y}
              r={4}
              fill={themeColor}
              stroke="white"
              strokeWidth={2}
            />
          );
        })}

        {/* Labels */}
        {DOMAINS.map((d, i) => {
          const { x, y } = polarToCartesian(cx, cy, maxR + 22, i * angleStep);
          return (
            <text
              key={d.key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] fill-gray-500"
              fontWeight={500}
            >
              {d.label}
            </text>
          );
        })}

        {/* Score labels on data points */}
        {scores && DOMAINS.map((d, i) => {
          const val = (scores as any)[d.key] || 0;
          if (val === 0) return null;
          const r = (val / 10) * maxR + 14;
          const { x, y } = polarToCartesian(cx, cy, r, i * angleStep);
          return (
            <text
              key={`score-${d.key}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[9px] font-bold"
              fill={themeColor}
            >
              {val}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      {(childName || compareName) && (
        <div className="flex items-center gap-4 mt-1">
          {childName && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
              <span className="text-[10px] text-gray-500 font-medium">{childName}</span>
            </div>
          )}
          {compareName && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: compareColor || '#94a3b8' }} />
              <span className="text-[10px] text-gray-500 font-medium">{compareName}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { DOMAINS };
export type { SparkScore };
