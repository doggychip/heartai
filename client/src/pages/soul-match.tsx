import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, Sparkles, Users, UserPlus, Check, MessageCircle,
  Loader2, ChevronRight, X, Zap, Heart, Brain, Compass, Eye, Flame,
  Sun, Moon,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface QuestionOption { t: string; s: Record<string, number>; }
interface Question { id: number; cat: string; q: string; o: QuestionOption[]; }
interface TraitBar { left: string; right: string; pct: number; color: string; }
interface SoulProfile {
  scores: Record<string, number>;
  archetype: string; archetypeName: string; archetypeEmoji: string;
  archetypeColor: string; archetypeDescription: string;
  traitBars: TraitBar[]; interests: string[]; displayName: string;
}
interface SoulMatchResult {
  userId: string; nickname: string; avatarUrl: string | null;
  archetype: string; archetypeName: string; archetypeEmoji: string;
  archetypeColor: string; matchScore: number; matchReasons: string[];
  interests: string[]; bio?: string; isAi: boolean;
}

// ═══════════════════════════════════════════════════════════════
// DECORATIVE STARS (subtle, uses currentColor for theme compat)
// ═══════════════════════════════════════════════════════════════

function FloatingStars() {
  const stars = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      i, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`, size: `${Math.random() * 2 + 1}px`,
    })), []
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-30">
      {stars.map(s => (
        <div key={s.i} className="absolute rounded-full bg-primary animate-[soul-twinkle_3s_ease-in-out_infinite]"
          style={{ left: s.left, top: s.top, animationDelay: s.delay, width: s.size, height: s.size }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PERSONALITY RADAR CHART (pure SVG, no deps)
// ═══════════════════════════════════════════════════════════════

function PersonalityRadar({ bars }: { bars: TraitBar[] }) {
  const SIZE = 180;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const MAX_R = 72;
  const n = bars.length;

  // angle for each axis, starting from top (−90°)
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, r: number) => ({
    x: CX + r * Math.cos(angle(i)),
    y: CY + r * Math.sin(angle(i)),
  });

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1].map(f =>
    Array.from({ length: n }, (_, i) => pt(i, f * MAX_R))
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ") + " Z"
  );

  // User polygon
  const userPts = bars.map((bar, i) => pt(i, (bar.pct / 100) * MAX_R));
  const polyline = userPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ") + " Z";

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block">
      <defs>
        <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C5CFC" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FF6B9D" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {/* Grid rings */}
      {rings.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
      ))}
      {/* Axis spokes */}
      {bars.map((_, i) => {
        const outer = pt(i, MAX_R);
        return <line key={i} x1={CX} y1={CY} x2={outer.x} y2={outer.y} stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />;
      })}
      {/* User polygon fill */}
      <path d={polyline} fill="url(#radarGrad)" stroke="#7C5CFC" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Dots at each vertex */}
      {userPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={bars[i].color} stroke="white" strokeWidth="1.5" />
      ))}
      {/* Axis labels */}
      {bars.map((bar, i) => {
        const label = bar.pct >= 50 ? bar.right : bar.left;
        const labelPt = pt(i, MAX_R + 16);
        return (
          <text key={i} x={labelPt.x} y={labelPt.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fill="currentColor" opacity="0.55" fontWeight="500">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// MATCH NETWORK GRAPH (pure SVG force simulation, no D3)
// ═══════════════════════════════════════════════════════════════

interface NetNode {
  id: string; x: number; y: number; vx: number; vy: number;
  color: string; emoji: string; label: string; score: number; isMe: boolean;
}

function MatchNetwork({ matches, myColor, myEmoji }: {
  matches: SoulMatchResult[]; myColor: string; myEmoji: string;
}) {
  const W = 300; const H = 300; const CX = W / 2; const CY = H / 2;
  const [selected, setSelected] = useState<string | null>(null);
  const frameRef = useRef<number>(0);
  const nodesRef = useRef<NetNode[]>([]);
  const [positions, setPositions] = useState<{ x: number; y: number }[]>([]);

  const limited = useMemo(() => matches.slice(0, 14), [matches]);

  useEffect(() => {
    // Build nodes: center = me, others arranged in spiral
    const nodes: NetNode[] = [
      { id: "me", x: CX, y: CY, vx: 0, vy: 0, color: myColor, emoji: myEmoji, label: "你", score: 100, isMe: true },
      ...limited.map((m, i) => {
        const angle = (i / limited.length) * Math.PI * 2 - Math.PI / 2;
        const r = 70 + (i % 3) * 25;
        return {
          id: m.userId, x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle),
          vx: 0, vy: 0, color: m.archetypeColor, emoji: m.archetypeEmoji,
          label: m.nickname, score: m.matchScore, isMe: false,
        };
      }),
    ];
    nodesRef.current = nodes;
    setPositions(nodes.map(n => ({ x: n.x, y: n.y })));

    let tick = 0;
    const simulate = () => {
      const s = nodesRef.current;
      const n = s.length;

      // Repulsion between all node pairs
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = s[j].x - s[i].x || 0.1;
          const dy = s[j].y - s[i].y || 0.1;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = Math.min(600 / (dist * dist), 15);
          if (!s[i].isMe) { s[i].vx -= (dx / dist) * f; s[i].vy -= (dy / dist) * f; }
          if (!s[j].isMe) { s[j].vx += (dx / dist) * f; s[j].vy += (dy / dist) * f; }
        }
      }

      // Spring: each match attracted toward center, distance scaled by score
      for (let i = 1; i < n; i++) {
        const dx = s[i].x - CX;
        const dy = s[i].y - CY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = 50 + (1 - s[i].score / 100) * 90;
        const f = (dist - target) * 0.04;
        s[i].vx -= (dx / dist) * f;
        s[i].vy -= (dy / dist) * f;
      }

      // Integrate + damp + clamp
      for (let i = 1; i < n; i++) {
        s[i].vx *= 0.82; s[i].vy *= 0.82;
        s[i].x = Math.max(18, Math.min(W - 18, s[i].x + s[i].vx));
        s[i].y = Math.max(18, Math.min(H - 18, s[i].y + s[i].vy));
      }

      tick++;
      setPositions(s.map(node => ({ x: node.x, y: node.y })));
      if (tick < 180) frameRef.current = requestAnimationFrame(simulate);
    };

    frameRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [limited, myColor, myEmoji]);

  const nodes = nodesRef.current;
  if (positions.length === 0 || nodes.length === 0) return null;

  const selectedMatch = selected ? limited.find(m => m.userId === selected) : null;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ height: H }}>
        <defs>
          <radialGradient id="netBg" cx="50%" cy="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.04" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CY} r={W / 2} fill="url(#netBg)" />
        {/* Edges from center to each match */}
        {positions.slice(1).map((pos, i) => (
          <line key={i}
            x1={positions[0].x} y1={positions[0].y} x2={pos.x} y2={pos.y}
            stroke={nodes[i + 1]?.color || "#888"}
            strokeOpacity={0.15 + (nodes[i + 1]?.score || 50) / 200}
            strokeWidth={0.5 + (nodes[i + 1]?.score || 50) / 80}
          />
        ))}
        {/* Nodes */}
        {nodes.map((node, i) => {
          const pos = positions[i];
          if (!pos) return null;
          const r = node.isMe ? 18 : 11 + ((node.score - 50) / 50) * 5;
          const isSelected = selected === node.id;
          return (
            <g key={node.id} style={{ cursor: node.isMe ? "default" : "pointer" }}
              onClick={() => !node.isMe && setSelected(isSelected ? null : node.id)}>
              {/* Glow ring on selected */}
              {isSelected && <circle cx={pos.x} cy={pos.y} r={r + 6} fill={node.color} opacity="0.2" />}
              {/* Soft halo */}
              <circle cx={pos.x} cy={pos.y} r={r + 3} fill={node.color} opacity="0.12" />
              <circle cx={pos.x} cy={pos.y} r={r} fill={node.color} opacity={isSelected ? 1 : 0.82}
                stroke={isSelected ? "white" : "none"} strokeWidth="1.5" />
              <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
                fontSize={node.isMe ? "11" : "10"} style={{ pointerEvents: "none", userSelect: "none" }}>
                {node.emoji || "✦"}
              </text>
              {!node.isMe && (
                <text x={pos.x} y={pos.y + r + 9} textAnchor="middle"
                  fontSize="7.5" fill="currentColor" opacity="0.55" style={{ pointerEvents: "none" }}>
                  {node.label.slice(0, 4)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {/* Info panel for selected node */}
      {selectedMatch && (
        <div className="mx-1 mt-1 p-3 bg-muted/60 rounded-xl text-center animate-in fade-in duration-150">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-lg">{selectedMatch.archetypeEmoji}</span>
            <span className="text-sm font-semibold">{selectedMatch.nickname}</span>
            <span className="text-[10px] text-muted-foreground">{selectedMatch.archetypeName}</span>
          </div>
          <p className="text-xs font-bold bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">
            {selectedMatch.matchScore}% 共鸣
          </p>
          {selectedMatch.matchReasons.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1">{selectedMatch.matchReasons.join(" · ")}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCORE RING SVG
// ═══════════════════════════════════════════════════════════════

function ScoreRing({ score, size = 50 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-muted" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="3" strokeLinecap="round"
          stroke="url(#soulScoreGrad)" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
        <defs>
          <linearGradient id="soulScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C5CFC" />
            <stop offset="100%" stopColor="#FF6B9D" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-xs font-black bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">
        {score}%
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY ICONS + LABELS
// ═══════════════════════════════════════════════════════════════

const CAT_ICONS: Record<string, React.ReactNode> = {
  energy: <Zap className="w-3.5 h-3.5" />,
  emotion: <Heart className="w-3.5 h-3.5" />,
  thinking: <Brain className="w-3.5 h-3.5" />,
  lifestyle: <Sun className="w-3.5 h-3.5" />,
  values: <Flame className="w-3.5 h-3.5" />,
  social: <Users className="w-3.5 h-3.5" />,
  dreams: <Moon className="w-3.5 h-3.5" />,
  identity: <Eye className="w-3.5 h-3.5" />,
};

const CAT_LABELS: Record<string, string> = {
  energy: "ENERGY", emotion: "EMOTION", thinking: "THINKING",
  lifestyle: "LIFESTYLE", values: "VALUES", social: "SOCIAL",
  dreams: "DREAMS", identity: "IDENTITY",
};

const ANALYSIS_STEPS = [
  "采集人格维度数据", "计算 Big Five 光谱", "匹配 Jungian 原型",
  "运行兼容性算法", "生成灵魂档案",
];

// ═══════════════════════════════════════════════════════════════
// INLINE STYLES (animations only — colors use Tailwind/shadcn)
// ═══════════════════════════════════════════════════════════════

const SOUL_CSS = `
@keyframes soul-twinkle { 0%,100%{opacity:.15} 50%{opacity:.8} }
@keyframes soul-fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
@keyframes soul-slideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
@keyframes soul-optPop { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
@keyframes soul-barGrow { from{width:0} }
@keyframes soul-pulse { 0%,100%{transform:scale(1);opacity:.8} 50%{transform:scale(1.06);opacity:1} }
@keyframes soul-ring { to{transform:rotate(360deg)} }
.soul-fadeUp { animation: soul-fadeUp .5s ease both; }
.soul-slideIn { animation: soul-slideIn .3s ease both; }
.soul-optPop { animation: soul-optPop .25s ease both; }
.soul-barGrow { animation: soul-barGrow .8s cubic-bezier(.25,.46,.45,.94) both; }
`;

// ═══════════════════════════════════════════════════════════════
// 25 QUESTIONS
// ═══════════════════════════════════════════════════════════════

const Q: Question[] = [
  { id: 1, cat: "energy", q: "周末早上醒来，你的第一反应是？", o: [
    { t: "约朋友出去探索新地方！", s: { E: 4, O: 2 } },
    { t: "先看看手机，再决定要不要出门", s: { E: 1, N: 1 } },
    { t: "终于可以一个人安静待着了", s: { E: -3, Ti: 2 } },
    { t: "列个今天要做的事情清单", s: { C: 3, Ti: 1 } },
  ]},
  { id: 2, cat: "energy", q: "在一个不认识人的派对上，你会？", o: [
    { t: "主动搭讪，认识新朋友", s: { E: 4, O: 2, A: 1 } },
    { t: "找个角落观察大家的互动", s: { E: -2, Ni: 3 } },
    { t: "找到一个人深聊整晚", s: { E: -1, Fi: 3 } },
    { t: "找借口尽快离开", s: { E: -4, N: 2 } },
  ]},
  { id: 3, cat: "energy", q: "连续社交三天后，你的状态是？", o: [
    { t: "精力充沛，还想继续！", s: { E: 4, A: 1 } },
    { t: "开心但需要一个安静的晚上恢复", s: { E: 1, N: 1 } },
    { t: "已经完全耗尽，需要独处充电", s: { E: -4, N: 2 } },
    { t: "取决于和谁社交，有些人给我能量", s: { E: 0, Fi: 2, Ni: 1 } },
  ]},
  { id: 4, cat: "emotion", q: "朋友突然哭了，你会？", o: [
    { t: "立刻抱住TA，什么都不说", s: { Fi: 3, A: 3 } },
    { t: "问清楚发生了什么，帮TA分析解决", s: { Ti: 3, C: 1 } },
    { t: "默默陪着，等TA准备好了再说", s: { Fi: 2, E: -1 } },
    { t: "带TA去吃好吃的转移注意力", s: { Se: 2, A: 2, E: 1 } },
  ]},
  { id: 5, cat: "emotion", q: "看一部很悲伤的电影时，你？", o: [
    { t: "控制不住地哭得稀里哗啦", s: { Fi: 4, N: 2 } },
    { t: "感动但不太会外露情绪", s: { Fi: 1, Ti: 1, E: -1 } },
    { t: "更关注剧情逻辑和演技", s: { Ti: 3, O: 1 } },
    { t: "会想到自己类似的经历而触动", s: { Fi: 3, Ni: 2 } },
  ]},
  { id: 6, cat: "emotion", q: "你的情绪波动频率？", o: [
    { t: "像过山车，起伏很大", s: { N: 4, Fi: 2 } },
    { t: "偶尔波动，大部分时候平稳", s: { N: 1, C: 1 } },
    { t: "非常稳定，很少有大起大落", s: { N: -3, Ti: 1, C: 2 } },
    { t: "表面平静，内心其实很丰富", s: { N: 2, E: -2, Fi: 2 } },
  ]},
  { id: 7, cat: "thinking", q: "做一个重要决定时，你更依赖？", o: [
    { t: "直觉和内心的感受", s: { Ni: 3, Fi: 2 } },
    { t: "详细的数据分析和利弊对比", s: { Ti: 4, C: 2 } },
    { t: "询问信任的人的意见", s: { A: 2, E: 1, Fi: 1 } },
    { t: "先行动再调整，做了才知道", s: { Se: 3, O: 1, C: -1 } },
  ]},
  { id: 8, cat: "thinking", q: "你更擅长哪种思维方式？", o: [
    { t: "发散联想——从一个点想到无数可能", s: { Ni: 4, O: 3 } },
    { t: "逻辑推理——一步一步得出结论", s: { Ti: 4, C: 1 } },
    { t: "共情理解——站在别人角度感受", s: { Fi: 3, A: 2 } },
    { t: "实际操作——动手试比空想强", s: { Se: 3, C: 1 } },
  ]},
  { id: 9, cat: "thinking", q: "遇到一个完全陌生的领域，你？", o: [
    { t: "兴奋！立刻想深入了解", s: { O: 4, Ni: 2 } },
    { t: "有点焦虑，先做大量功课", s: { C: 2, N: 2, Ti: 1 } },
    { t: "找个这领域的人带我入门", s: { A: 1, E: 1, Se: 1 } },
    { t: "看看有没有实际用处再说", s: { Se: 2, Ti: 1, C: 1 } },
  ]},
  { id: 10, cat: "lifestyle", q: "计划好的旅行突然被取消，你？", o: [
    { t: "太好了！可以自由安排了", s: { O: 2, C: -2, Se: 1 } },
    { t: "有点失落，但马上做新计划", s: { C: 3, N: -1 } },
    { t: "很沮丧，需要时间消化情绪", s: { N: 3, Fi: 2 } },
    { t: "无所谓，反正还有别的事做", s: { N: -2, Se: 1 } },
  ]},
  { id: 11, cat: "lifestyle", q: "你的房间通常是什么样的？", o: [
    { t: "井井有条，东西都有固定位置", s: { C: 4 } },
    { t: "创意混乱，但我知道东西在哪", s: { O: 2, C: -2 } },
    { t: "看心情，偶尔大扫除一次", s: { C: -1, N: 1 } },
    { t: "极简风，越少东西越好", s: { Ti: 1, C: 1, E: -1 } },
  ]},
  { id: 12, cat: "lifestyle", q: "截止日期临近，你的工作方式？", o: [
    { t: "早就做完了，现在在检查", s: { C: 4, N: -1 } },
    { t: "按计划推进，不慌不忙", s: { C: 3, Ti: 1 } },
    { t: "在压力下爆发，最后一刻完成", s: { C: -2, O: 1, N: 2 } },
    { t: "视情况，如果感兴趣会提前完成", s: { Fi: 1, O: 1 } },
  ]},
  { id: 13, cat: "values", q: "你更欣赏哪种人？", o: [
    { t: "才华横溢、思想深邃的天才", s: { Ni: 2, O: 3 } },
    { t: "温暖善良、让人如沐春风的人", s: { Fi: 1, A: 3 } },
    { t: "意志坚定、说到做到的实干家", s: { C: 3, Ti: 1 } },
    { t: "自由不羁、活出自我的冒险家", s: { O: 3, Se: 2, C: -1 } },
  ]},
  { id: 14, cat: "values", q: "如果只能选一个，你最看重？", o: [
    { t: "真实——做最真实的自己", s: { Fi: 4, O: 1 } },
    { t: "成就——实现有意义的目标", s: { C: 3, Ti: 2 } },
    { t: "连接——和重要的人深度联结", s: { A: 3, Fi: 2, E: 1 } },
    { t: "自由——不被任何东西束缚", s: { O: 3, C: -2, Se: 1 } },
  ]},
  { id: 15, cat: "values", q: "你觉得人生最大的遗憾会是？", o: [
    { t: "没有勇气追求真正想要的", s: { Fi: 3, O: 2 } },
    { t: "没有好好珍惜身边的人", s: { A: 3, Fi: 2 } },
    { t: "没有达成自己设定的目标", s: { C: 3, Ti: 1 } },
    { t: "活得太安全，没有冒过险", s: { O: 3, Se: 2 } },
  ]},
  { id: 16, cat: "social", q: "和朋友意见不合时，你通常？", o: [
    { t: "据理力争，真理越辩越明", s: { Ti: 3, E: 1, A: -1 } },
    { t: "先退一步，认真想想对方的道理", s: { A: 3, Fi: 1 } },
    { t: "各自保留意见，不伤和气", s: { A: 2, E: -1 } },
    { t: "用幽默化解尴尬", s: { E: 2, O: 1, A: 1 } },
  ]},
  { id: 17, cat: "social", q: "你在团队中通常扮演什么角色？", o: [
    { t: "领导者——提出方向带着大家走", s: { E: 3, C: 2, Ti: 1 } },
    { t: "协调者——确保每个人都被听到", s: { A: 3, Fi: 2, E: 1 } },
    { t: "创意者——提出别人想不到的点子", s: { O: 4, Ni: 2 } },
    { t: "执行者——把想法变成现实", s: { C: 3, Se: 2 } },
  ]},
  { id: 18, cat: "social", q: "你理想中的友谊是？", o: [
    { t: "无话不谈，什么都能分享", s: { E: 2, Fi: 2, A: 2 } },
    { t: "互相独立，但关键时刻在", s: { E: -1, C: 1, Ti: 1 } },
    { t: "一起冒险，创造疯狂回忆", s: { O: 2, Se: 2, E: 1 } },
    { t: "灵魂共鸣，不用说太多就懂", s: { Ni: 3, Fi: 2, E: -1 } },
  ]},
  { id: 19, cat: "dreams", q: "如果可以拥有一种超能力？", o: [
    { t: "读心术——理解每个人的真实想法", s: { Fi: 2, Ni: 3 } },
    { t: "时间暂停——做完所有想做的事", s: { C: 2, Se: 1, Ti: 1 } },
    { t: "瞬间移动——自由去任何地方", s: { O: 3, Se: 2 } },
    { t: "超级智慧——解开宇宙的终极秘密", s: { Ti: 3, Ni: 3 } },
  ]},
  { id: 20, cat: "dreams", q: "你做白日梦时，最常想什么？", o: [
    { t: "幻想完全不同的人生可能性", s: { Ni: 4, O: 3 } },
    { t: "回味过去美好的记忆细节", s: { Se: 2, Fi: 2 } },
    { t: "规划未来要达成的目标和步骤", s: { C: 3, Ti: 2 } },
    { t: "想象和在乎的人一起的场景", s: { Fi: 3, A: 2 } },
  ]},
  { id: 21, cat: "identity", q: "深夜一个人时，你最常做什么？", o: [
    { t: "刷社交媒体，看看大家在干嘛", s: { E: 2, Se: 1 } },
    { t: "思考人生，想些深刻的问题", s: { Ni: 3, E: -1, O: 1 } },
    { t: "追剧/打游戏，享受放松时光", s: { Se: 2, N: -1 } },
    { t: "写日记或整理自己的想法", s: { Fi: 3, C: 1, E: -1 } },
  ]},
  { id: 22, cat: "identity", q: "你觉得了解一个人最好的方式？", o: [
    { t: "和TA一起经历一件困难的事", s: { Se: 2, C: 1, A: 1 } },
    { t: "深夜长谈，聊彼此的内心世界", s: { Fi: 3, Ni: 2, E: -1 } },
    { t: "观察TA怎么对待服务员和陌生人", s: { Ti: 2, Ni: 2, A: 1 } },
    { t: "一起旅行，24小时相处", s: { Se: 2, E: 2, O: 1 } },
  ]},
  { id: 23, cat: "identity", q: "你如何处理压力？", o: [
    { t: "运动或做些身体力行的事", s: { Se: 3, E: 1, N: -1 } },
    { t: "找人倾诉或寻求支持", s: { E: 2, A: 2, Fi: 1 } },
    { t: "独处安静地思考和恢复", s: { E: -3, Ni: 2, Ti: 1 } },
    { t: "投入工作或兴趣来转移注意力", s: { C: 2, Se: 1 } },
  ]},
  { id: 24, cat: "identity", q: "别人对你最常见的评价是？", o: [
    { t: "你想得真深 / 你好有想法", s: { Ni: 3, O: 2 } },
    { t: "你人真好 / 跟你在一起很舒服", s: { A: 3, Fi: 1 } },
    { t: "你太靠谱了 / 什么都安排得好", s: { C: 3, Ti: 1 } },
    { t: "你好有趣 / 跟你在一起不无聊", s: { E: 2, O: 2, Se: 1 } },
  ]},
  { id: 25, cat: "identity", q: "选一个词形容你内心最深处的渴望：", o: [
    { t: "被理解", s: { Fi: 4, Ni: 2, N: 1 } },
    { t: "被需要", s: { A: 3, C: 1, Fi: 1 } },
    { t: "自由", s: { O: 4, C: -2, Se: 1 } },
    { t: "意义", s: { Ni: 4, Ti: 1, Fi: 1 } },
  ]},
];

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

type Stage = "welcome" | "quiz" | "analyzing" | "profile" | "friends";

export default function SoulMatchPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [stage, setStage] = useState<Stage>("welcome");
  const [qi, setQi] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [profile, setProfile] = useState<SoulProfile | null>(null);
  const [friendTab, setFriendTab] = useState<"real" | "ai">("real");
  const [viewMode, setViewMode] = useState<"list" | "graph">("list");
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [analysisStep, setAnalysisStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  // Queries
  const { data: existingProfile } = useQuery<{ profile: SoulProfile | null }>({
    queryKey: ["/api/soul-match/profile"], enabled: !!user,
  });
  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/soul-match/count"],
  });
  const { data: matchData, isLoading: matchLoading } = useQuery<{
    realMatches: SoulMatchResult[]; aiMatches: SoulMatchResult[]; totalProfiles: number;
  }>({
    queryKey: ["/api/soul-match/matches"],
    enabled: stage === "friends" && !!user,
  });

  const saveProfile = useMutation({
    mutationFn: async (data: { scores: Record<string, number>; interests: string[]; displayName: string }) => {
      const resp = await apiRequest("POST", "/api/soul-match/profile", data);
      return resp.json();
    },
    onSuccess: (data) => {
      setProfile(data.profile);
      queryClient.invalidateQueries({ queryKey: ["/api/soul-match/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/soul-match/matches"] });
    },
  });

  useEffect(() => {
    if (existingProfile?.profile) {
      setProfile(existingProfile.profile);
      setScores(existingProfile.profile.scores);
      setInterests(existingProfile.profile.interests || []);
      setStage("profile");
    }
  }, [existingProfile]);

  const answer = (option: QuestionOption, idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const newScores = { ...scores };
    for (const [k, v] of Object.entries(option.s)) {
      newScores[k] = (newScores[k] || 0) + v;
    }
    setScores(newScores);
    setTimeout(() => {
      setSelected(null);
      if (qi < Q.length - 1) {
        setTransitioning(true);
        setTimeout(() => { setQi(qi + 1); setTransitioning(false); }, 200);
      } else {
        setStage("analyzing");
        runAnalysis(newScores);
      }
    }, 350);
  };

  const runAnalysis = async (finalScores: Record<string, number>) => {
    for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 500));
      setAnalysisStep(i + 1);
    }
    await new Promise(r => setTimeout(r, 300));
    saveProfile.mutate({
      scores: finalScores, interests: [],
      displayName: user?.nickname || user?.username || "灵魂旅者",
    });
    setStage("profile");
  };

  const addInterest = () => {
    const v = interestInput.trim();
    if (v && !interests.includes(v)) setInterests(prev => [...prev, v]);
    setInterestInput("");
  };
  const removeInterest = (idx: number) => setInterests(prev => prev.filter((_, i) => i !== idx));
  const updateInterestsOnServer = () => {
    if (profile) saveProfile.mutate({ scores: profile.scores, interests, displayName: profile.displayName });
  };

  const profileCount = countData?.count || matchData?.totalProfiles || 0;

  return (
    <>
      <style>{SOUL_CSS}</style>
      <div className="flex-1 overflow-y-auto bg-background">

        {/* ═══ WELCOME ═══ */}
        {stage === "welcome" && (
          <>
            {/* Header gradient — matches app pattern (qiuqian, matching, etc.) */}
            <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500 dark:from-violet-800 dark:via-purple-800 dark:to-pink-700 px-4 pt-6 pb-24 overflow-hidden">
              <FloatingStars />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <Link href="/"><button className="text-white/70 hover:text-white"><ArrowLeft className="w-5 h-5" /></button></Link>
                  <Sparkles className="w-5 h-5 text-white" />
                  <h1 className="text-lg font-bold text-white">灵魂匹配</h1>
                </div>
                <p className="text-white/60 text-xs">25 道深度问题 · 9 维人格分析 · 12 种灵魂原型</p>
              </div>
            </div>

            <div className="relative -mt-16 px-4 pb-8 soul-fadeUp">
              <Card className="border-0 shadow-xl">
                <CardContent className="p-6 text-center">
                  {/* Pulsing orb */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 mx-auto mb-5 shadow-[0_0_40px_rgba(124,92,252,.3)]"
                    style={{ animation: "soul-pulse 4s ease-in-out infinite" }} />

                  <h2 className="text-xl font-bold mb-2">发现你的灵魂原型</h2>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                    通过 Big Five + Jungian 人格模型<br />找到与你灵魂共振的人
                  </p>

                  {profileCount > 0 && (
                    <div className="flex justify-center gap-6 mb-5 text-xs text-muted-foreground">
                      <div><span className="text-lg font-black text-primary block">{profileCount}</span>灵魂已入驻</div>
                      <div><span className="text-lg font-black text-primary block">12</span>种原型</div>
                      <div><span className="text-lg font-black text-primary block">9</span>维分析</div>
                    </div>
                  )}

                  <Button size="lg" className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white shadow-lg"
                    onClick={() => setStage("quiz")}>
                    开始探索灵魂 <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* ═══ QUIZ ═══ */}
        {stage === "quiz" && (() => {
          const question = Q[qi];
          const progress = ((qi + 1) / Q.length) * 100;
          return (
            <div className={`px-4 py-5 transition-all duration-200 ${transitioning ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}>
              {/* Progress */}
              <div className="h-1 bg-muted rounded-full overflow-hidden mb-1.5">
                <div className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-400"
                  style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground tracking-wider mb-7">
                <span className="flex items-center gap-1.5">
                  {CAT_ICONS[question.cat]}
                  {CAT_LABELS[question.cat] || question.cat.toUpperCase()}
                </span>
                <span>{qi + 1}/{Q.length}</span>
              </div>

              <h2 className="text-xl font-bold leading-relaxed mb-6 soul-fadeUp">{question.q}</h2>

              <div className="space-y-2.5">
                {question.o.map((opt, i) => (
                  <button key={`${qi}-${i}`}
                    onClick={() => answer(opt, i)}
                    disabled={selected !== null}
                    className={`soul-optPop w-full text-left px-4 py-[15px] rounded-xl border text-sm leading-relaxed transition-all duration-200
                      ${selected === i
                        ? "bg-primary/10 border-primary/40 translate-x-1 scale-[1.01]"
                        : "bg-card border-border hover:bg-accent hover:border-primary/20 hover:translate-x-[3px]"
                      }`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    {opt.t}
                  </button>
                ))}
              </div>

              {qi > 0 && (
                <button onClick={() => { setQi(qi - 1); setSelected(null); }}
                  className="mt-4 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  <ArrowLeft className="w-3 h-3" /> 上一题
                </button>
              )}
            </div>
          );
        })()}

        {/* ═══ ANALYZING ═══ */}
        {stage === "analyzing" && (
          <div className="soul-fadeUp min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
            {/* Spinning ring */}
            <div className="w-20 h-20 rounded-full border-2 border-transparent mb-6"
              style={{ borderTopColor: "#7C5CFC", borderRightColor: "#FF6B9D", animation: "soul-ring 1.5s linear infinite" }} />
            <p className="text-sm text-muted-foreground mb-5">正在解读你的灵魂密码...</p>
            <div className="space-y-2 w-full max-w-xs">
              {ANALYSIS_STEPS.map((step, i) => (
                <div key={i} className={`text-xs flex items-center gap-2 transition-all duration-300 ${
                  analysisStep > i ? "text-emerald-500" : "text-muted-foreground/30"
                }`}>
                  <span>{analysisStep > i ? "✓" : "○"}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ PROFILE ═══ */}
        {stage === "profile" && profile && (
          <div className="soul-fadeUp px-4 py-5 pb-8">
            {/* Archetype header */}
            <div className="text-center mb-6 pt-2">
              <span className="text-5xl block mb-3">{profile.archetypeEmoji}</span>
              <h2 className="text-2xl font-black mb-1.5" style={{ color: profile.archetypeColor }}>
                {profile.archetypeName}
              </h2>
              <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {profile.archetypeDescription}
              </p>
            </div>

            {/* Radar chart */}
            <Card className="mb-3 border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-[11px] text-muted-foreground tracking-[2px] uppercase mb-3">人格雷达图</h3>
                <PersonalityRadar bars={profile.traitBars} />
              </CardContent>
            </Card>

            {/* Trait bars */}
            <Card className="mb-3 border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-[11px] text-muted-foreground tracking-[2px] uppercase mb-4">人格光谱 · 6 维分析</h3>
                <div className="space-y-3">
                  {profile.traitBars.map((bar, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">{bar.left}</span>
                        <span className="font-bold text-[10px]" style={{ color: bar.color }}>{bar.pct}%</span>
                        <span className="text-muted-foreground">{bar.right}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full soul-barGrow"
                          style={{ width: `${bar.pct}%`, background: bar.color, animationDelay: `${i * 120}ms` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Interests */}
            <Card className="mb-3 border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-[11px] text-muted-foreground tracking-[2px] uppercase mb-3">兴趣标签</h3>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {interests.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs gap-1">
                      {tag}
                      <button onClick={() => removeInterest(i)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                    placeholder="如：摄影、读书、编程...  按回车添加"
                    value={interestInput}
                    onChange={e => setInterestInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addInterest(); } }} />
                  <Button size="sm" variant="outline" onClick={addInterest}>添加</Button>
                </div>
                {interests.length > 0 && interests.join(",") !== (profile.interests || []).join(",") && (
                  <Button size="sm" className="mt-2 w-full" onClick={updateInterestsOnServer} disabled={saveProfile.isPending}>
                    {saveProfile.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                    保存兴趣标签
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <Button className="flex-[2] bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white"
                onClick={() => { queryClient.invalidateQueries({ queryKey: ["/api/soul-match/matches"] }); setStage("friends"); }}>
                <Users className="w-4 h-4 mr-1" /> 找灵魂伙伴
              </Button>
              <Button variant="outline" onClick={() => { setStage("quiz"); setQi(0); setScores({}); setProfile(null); }}>
                重新测试
              </Button>
            </div>
          </div>
        )}

        {/* ═══ FRIENDS ═══ */}
        {stage === "friends" && (() => {
          const realMatches = matchData?.realMatches || [];
          const aiMatches = matchData?.aiMatches || [];
          const currentMatches = friendTab === "real" ? realMatches : aiMatches;
          return (
            <div className="soul-fadeUp px-4 py-5 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-5 h-5" /> 灵魂匹配
                  </h2>
                  <p className="text-xs text-muted-foreground">9 维 · 兴趣 · 互补性 · 复合算法</p>
                </div>
                {/* View mode toggle */}
                <div className="flex gap-0.5 p-0.5 bg-muted rounded-lg">
                  <button onClick={() => setViewMode("list")}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === "list" ? "bg-background shadow text-primary" : "text-muted-foreground"}`}>
                    列表
                  </button>
                  <button onClick={() => setViewMode("graph")}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === "graph" ? "bg-background shadow text-primary" : "text-muted-foreground"}`}>
                    星图
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
                {(["real", "ai"] as const).map(tab => (
                  <button key={tab}
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                      friendTab === tab ? "bg-background shadow text-primary" : "text-muted-foreground"
                    }`}
                    onClick={() => setFriendTab(tab)}>
                    {tab === "real" ? "🌐 真实用户" : "🤖 AI 灵魂"}
                  </button>
                ))}
              </div>

              {/* Graph view */}
              {viewMode === "graph" && !matchLoading && currentMatches.length > 0 && profile && (
                <Card className="mb-3 border-0 shadow-sm">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground text-center mb-2">点击节点查看详情 · 高共鸣者距中心更近</p>
                    <MatchNetwork
                      matches={currentMatches}
                      myColor={profile.archetypeColor}
                      myEmoji={profile.archetypeEmoji}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Cards (list view) */}
              {viewMode === "list" && matchLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}</div>
              ) : viewMode === "list" && currentMatches.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <div className="text-3xl mb-2">🌌</div>
                    <p className="text-sm text-muted-foreground mb-1">暂无其他用户</p>
                    <p className="text-xs text-muted-foreground">邀请朋友来测试，发现灵魂共鸣！</p>
                  </CardContent>
                </Card>
              ) : viewMode === "list" ? (
                <div className="space-y-3">
                  {currentMatches.map((match, idx) => (
                    <Card key={match.userId} className="soul-slideIn border-0 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all"
                      style={{ animationDelay: `${idx * 80}ms` }}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                            style={{ background: `linear-gradient(135deg, ${match.archetypeColor}15, ${match.archetypeColor}35)` }}>
                            {match.archetypeEmoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">{match.nickname}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{match.archetypeName}</div>
                          </div>
                          <ScoreRing score={match.matchScore} />
                        </div>

                        {match.bio && <p className="text-xs text-muted-foreground leading-relaxed mb-2">{match.bio}</p>}

                        {match.interests.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {match.interests.map((tag, j) => (
                              <Badge key={j} variant="secondary" className="text-[10px] h-5">{tag}</Badge>
                            ))}
                          </div>
                        )}

                        {match.matchReasons.length > 0 && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 italic mt-1">
                            ✦ {match.matchReasons.join(" · ")}
                          </p>
                        )}

                        {!match.isAi && (
                          <div className="mt-2 flex justify-end gap-2">
                            <Link href={`/dm/${match.userId}?ice=${encodeURIComponent(match.matchReasons.slice(0, 2).join("、"))}`}>
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                <MessageCircle className="w-3 h-3" /> 发起对话
                              </Button>
                            </Link>
                            <FriendButton userId={match.userId} score={match.matchScore} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}

              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setStage("profile")}>
                  <ArrowLeft className="w-3 h-3 mr-1" /> 我的档案
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Fallback */}
        {!["welcome", "quiz", "analyzing", "profile", "friends"].includes(stage) && (
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// FRIEND REQUEST BUTTON
// ═══════════════════════════════════════════════════════════════

function FriendButton({ userId, score }: { userId: string; score: number }) {
  const [status, setStatus] = useState<"idle" | "pending" | "sent">("idle");
  const { data: friendStatus } = useQuery<{ status: string }>({ queryKey: ["/api/friends/status", userId] });
  const sendRequest = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", "/api/friends/request", { targetUserId: userId, compatibilityScore: score });
      return resp.json();
    },
    onSuccess: () => setStatus("sent"),
    onError: () => setStatus("idle"),
  });
  const currentStatus = friendStatus?.status || "none";

  if (currentStatus === "accepted") {
    return (
      <Link href={`/dm/${userId}`}>
        <button className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-[11px] font-medium">
          <MessageCircle className="w-3 h-3" /> 私聊
        </button>
      </Link>
    );
  }
  if (currentStatus === "pending" || status === "sent") {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[11px]">
        <Check className="w-3 h-3" /> 已申请
      </span>
    );
  }
  return (
    <button onClick={(e) => { e.stopPropagation(); setStatus("pending"); sendRequest.mutate(); }}
      disabled={sendRequest.isPending}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[11px] font-medium shadow-sm hover:shadow transition-all disabled:opacity-50">
      {sendRequest.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
      加好友
    </button>
  );
}
