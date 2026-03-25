// Shared ScoreRing component — circular progress indicator for scores 0-100
// Previously duplicated across 6+ page files. Import from here instead.

interface ScoreRingProps {
  /** Score value 0-100 */
  score: number;
  /** Ring diameter in px (default 64) */
  size?: number;
  /** Optional label below the ring */
  label?: string;
  /** Override the auto color class (e.g. "text-blue-500") */
  color?: string;
  /** Stroke width (default 4) */
  strokeWidth?: number;
  /** Custom font size class for the score number */
  fontSize?: string;
}

export default function ScoreRing({
  score,
  size = 64,
  label,
  color,
  strokeWidth = 4,
  fontSize = "text-sm",
}: ScoreRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const scoreColor = color || (score >= 80 ? "text-green-500" : score >= 60 ? "text-amber-500" : "text-red-400");

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-muted/20"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className={scoreColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center font-bold ${fontSize} ${scoreColor}`}>
          {score}
        </div>
      </div>
      {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
    </div>
  );
}
