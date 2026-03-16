import { useState, useEffect } from "react";

// ─── Constants ────────────────────────────────────────
const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 天干 + 四维卦 positioned between 地支 at their traditional compass locations
const TIANGAN_BAGUA = [
  { char: '癸', angle: 15 },
  { char: '艮', angle: 45 },
  { char: '甲', angle: 75 },
  { char: '乙', angle: 105 },
  { char: '巽', angle: 135 },
  { char: '丙', angle: 165 },
  { char: '丁', angle: 195 },
  { char: '坤', angle: 225 },
  { char: '庚', angle: 255 },
  { char: '辛', angle: 285 },
  { char: '乾', angle: 315 },
  { char: '壬', angle: 345 },
];

// Bagua center symbol (simplified octagon pattern)
const BAGUA_LINES = [
  [1, 1, 1], // ☰ 乾
  [0, 1, 0], // ☲ 离
  [1, 0, 1], // ☵ 坎
  [0, 0, 0], // ☷ 坤
];

interface LuopanClockProps {
  luckHours?: number[];
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function LuopanClock({ luckHours }: LuopanClockProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  // Clock hand angles (0° = top/12 o'clock, clockwise)
  const secondAngle = seconds * 6;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const hourAngle = (hours % 12) * 30 + minutes * 0.5;

  // SVG dimensions — viewBox centered at 200,200 with radius ~190
  const CX = 200;
  const CY = 200;

  // Ring radii (from outside to inside)
  const R_OUTER = 188;        // outer edge
  const R_HOUR_RING = 180;    // 24-hour markers
  const R_LUCK_RING = 162;    // 吉/凶 text
  const R_LUCK_INNER = 148;   // inner edge of luck ring
  const R_TIANGAN = 132;      // 天干/八卦 labels
  const R_DIZHI = 108;        // 地支 characters
  const R_DIZHI_INNER = 82;   // inner edge of dizhi ring
  const R_BAGUA_OUTER = 78;   // bagua center area
  const R_CENTER = 30;        // center piece

  // Derive current 时辰 index: 子时 = 23:00-01:00
  const shichenIndex = Math.floor(((hours + 1) % 24) / 2);

  return (
    <div className="w-full max-w-[380px] mx-auto aspect-square">
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full"
        style={{ fontFamily: "'Noto Serif SC', 'Songti SC', 'SimSun', serif" }}
      >
        {/* Background */}
        <circle cx={CX} cy={CY} r={R_OUTER} fill="#FFF9F0" stroke="#E8D5B5" strokeWidth="1.5" />

        {/* ─── Outermost Ring: 24-hour markers ─── */}
        <circle cx={CX} cy={CY} r={R_HOUR_RING} fill="none" stroke="#D4C4A8" strokeWidth="0.5" />
        {Array.from({ length: 24 }, (_, i) => {
          const angle = i * 15;
          const p = polarToXY(CX, CY, R_HOUR_RING + 2, angle);
          const pInner = polarToXY(CX, CY, R_HOUR_RING - 4, angle);
          return (
            <g key={`h24-${i}`}>
              <line
                x1={pInner.x} y1={pInner.y}
                x2={p.x} y2={p.y}
                stroke="#A09080" strokeWidth={i % 2 === 0 ? "1" : "0.5"}
              />
              <text
                x={polarToXY(CX, CY, R_OUTER - 3, angle).x}
                y={polarToXY(CX, CY, R_OUTER - 3, angle).y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="7"
                fill="#9A8A7A"
                transform={`rotate(${angle}, ${polarToXY(CX, CY, R_OUTER - 3, angle).x}, ${polarToXY(CX, CY, R_OUTER - 3, angle).y})`}
              >
                {i}
              </text>
            </g>
          );
        })}

        {/* ─── Divider lines for 12 时辰 sectors ─── */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = i * 30;
          const pOuter = polarToXY(CX, CY, R_HOUR_RING - 4, angle);
          const pInner = polarToXY(CX, CY, R_DIZHI_INNER, angle);
          return (
            <line
              key={`div-${i}`}
              x1={pOuter.x} y1={pOuter.y}
              x2={pInner.x} y2={pInner.y}
              stroke="#D4C4A8"
              strokeWidth="0.5"
            />
          );
        })}

        {/* ─── 吉/凶 Ring ─── */}
        <circle cx={CX} cy={CY} r={R_LUCK_RING + 8} fill="none" stroke="#D4C4A8" strokeWidth="0.3" />
        <circle cx={CX} cy={CY} r={R_LUCK_INNER} fill="none" stroke="#D4C4A8" strokeWidth="0.5" />
        {DIZHI.map((_, i) => {
          const angle = i * 30; // center of each 时辰 sector
          const isLucky = luckHours ? luckHours[i] === 1 : false;
          const pos = polarToXY(CX, CY, R_LUCK_RING, angle);
          return (
            <text
              key={`luck-${i}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fontWeight="700"
              fill={isLucky ? '#4CAF50' : '#E57373'}
            >
              {isLucky ? '吉' : '凶'}
            </text>
          );
        })}

        {/* ─── 天干/八卦 Ring ─── */}
        <circle cx={CX} cy={CY} r={R_TIANGAN + 8} fill="none" stroke="#D4C4A8" strokeWidth="0.3" />
        {TIANGAN_BAGUA.map(({ char, angle }) => {
          const pos = polarToXY(CX, CY, R_TIANGAN, angle);
          return (
            <text
              key={`tg-${char}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fill="#6B5B4B"
            >
              {char}
            </text>
          );
        })}

        {/* ─── 地支 Ring ─── */}
        <circle cx={CX} cy={CY} r={R_DIZHI + 18} fill="none" stroke="#D4C4A8" strokeWidth="0.5" />
        <circle cx={CX} cy={CY} r={R_DIZHI_INNER} fill="none" stroke="#D4C4A8" strokeWidth="0.5" />
        {DIZHI.map((char, i) => {
          const angle = i * 30;
          const pos = polarToXY(CX, CY, R_DIZHI, angle);
          const isCurrent = i === shichenIndex;
          return (
            <text
              key={`dz-${char}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={isCurrent ? "22" : "19"}
              fontWeight="900"
              fill={isCurrent ? '#8B4513' : '#3E2C1C'}
              opacity={isCurrent ? 1 : 0.85}
            >
              {char}
            </text>
          );
        })}

        {/* ─── Center Bagua Symbol ─── */}
        <circle cx={CX} cy={CY} r={R_BAGUA_OUTER} fill="#FFF9F0" stroke="#D4C4A8" strokeWidth="0.5" />

        {/* Simplified bagua octagon pattern */}
        {BAGUA_LINES.map((lines, ring) => {
          const r = R_CENTER + 14 + ring * 10;
          return lines.map((solid, j) => {
            const startAngle = -90 + j * 120;
            const endAngle = startAngle + 80;
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            if (solid) {
              // Solid line arc
              return (
                <path
                  key={`bg-${ring}-${j}`}
                  d={`M ${CX + r * Math.cos(startRad)} ${CY + r * Math.sin(startRad)} A ${r} ${r} 0 0 1 ${CX + r * Math.cos(endRad)} ${CY + r * Math.sin(endRad)}`}
                  fill="none"
                  stroke="#8B7355"
                  strokeWidth="2.5"
                  opacity="0.4"
                />
              );
            } else {
              // Broken line arc (two segments with gap)
              const midRad = ((startAngle + endAngle) / 2 * Math.PI) / 180;
              const gap = 0.08;
              return (
                <g key={`bg-${ring}-${j}`}>
                  <path
                    d={`M ${CX + r * Math.cos(startRad)} ${CY + r * Math.sin(startRad)} A ${r} ${r} 0 0 1 ${CX + r * Math.cos(midRad - gap)} ${CY + r * Math.sin(midRad - gap)}`}
                    fill="none"
                    stroke="#8B7355"
                    strokeWidth="2.5"
                    opacity="0.4"
                  />
                  <path
                    d={`M ${CX + r * Math.cos(midRad + gap)} ${CY + r * Math.sin(midRad + gap)} A ${r} ${r} 0 0 1 ${CX + r * Math.cos(endRad)} ${CY + r * Math.sin(endRad)}`}
                    fill="none"
                    stroke="#8B7355"
                    strokeWidth="2.5"
                    opacity="0.4"
                  />
                </g>
              );
            }
          });
        })}

        {/* Yin-yang center */}
        <circle cx={CX} cy={CY} r={R_CENTER} fill="#FFF9F0" stroke="#8B7355" strokeWidth="1" opacity="0.6" />
        {/* Simplified yin-yang */}
        <path
          d={`M ${CX} ${CY - R_CENTER} A ${R_CENTER} ${R_CENTER} 0 0 1 ${CX} ${CY + R_CENTER} A ${R_CENTER / 2} ${R_CENTER / 2} 0 0 0 ${CX} ${CY} A ${R_CENTER / 2} ${R_CENTER / 2} 0 0 1 ${CX} ${CY - R_CENTER}`}
          fill="#3E2C1C"
          opacity="0.15"
        />
        <circle cx={CX} cy={CY - R_CENTER / 2} r={3} fill="#3E2C1C" opacity="0.2" />
        <circle cx={CX} cy={CY + R_CENTER / 2} r={3} fill="#FFF9F0" stroke="#3E2C1C" strokeWidth="0.5" opacity="0.3" />

        {/* ─── Clock Hands ─── */}
        {/* Hour hand */}
        <line
          x1={CX}
          y1={CY}
          x2={polarToXY(CX, CY, 55, hourAngle).x}
          y2={polarToXY(CX, CY, 55, hourAngle).y}
          stroke="#3E2C1C"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Minute hand */}
        <line
          x1={CX}
          y1={CY}
          x2={polarToXY(CX, CY, 72, minuteAngle).x}
          y2={polarToXY(CX, CY, 72, minuteAngle).y}
          stroke="#3E2C1C"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Second hand */}
        <line
          x1={CX}
          y1={CY + 12}
          x2={polarToXY(CX, CY, 78, secondAngle).x}
          y2={polarToXY(CX, CY, 78, secondAngle).y}
          stroke="#C0392B"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
        {/* Center cap */}
        <circle cx={CX} cy={CY} r="4" fill="#3E2C1C" />
        <circle cx={CX} cy={CY} r="2" fill="#FFF9F0" />

        {/* ─── Current 时辰 highlight arc ─── */}
        {(() => {
          const startAngle = shichenIndex * 30 - 15;
          const endAngle = startAngle + 30;
          const r = R_LUCK_INNER + 1;
          const startRad = ((startAngle - 90) * Math.PI) / 180;
          const endRad = ((endAngle - 90) * Math.PI) / 180;
          return (
            <path
              d={`M ${CX + r * Math.cos(startRad)} ${CY + r * Math.sin(startRad)} A ${r} ${r} 0 0 1 ${CX + r * Math.cos(endRad)} ${CY + r * Math.sin(endRad)}`}
              fill="none"
              stroke="#DAA520"
              strokeWidth="2"
              opacity="0.5"
            />
          );
        })()}
      </svg>
    </div>
  );
}
