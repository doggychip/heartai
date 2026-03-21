import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Share2 } from "lucide-react";
import { ShareModal } from "./ShareModal";

interface RadarDim {
  score: number;
  label: string;
  desc: string;
}

interface CompatResult {
  person1: { name: string; element: string; bazi: string };
  person2: { name: string; element: string; bazi: string };
  totalScore: number;
  radar: {
    bond: RadarDim;
    passion: RadarDim;
    fun: RadarDim;
    intimacy: RadarDim;
    sync: RadarDim;
  };
  chemistry: string;
  destinyType: string;
  strengths: string[];
  challenges: string[];
  growthAdvice: string;
}

interface CompatShareCardProps {
  result: CompatResult;
}

const COMPAT_DIMS = [
  { key: "bond" as const, label: "\u7f81\u7eca", color: "#F59E0B" },       // 羁绊
  { key: "passion" as const, label: "\u6fc0\u60c5", color: "#EF4444" },     // 激情
  { key: "fun" as const, label: "\u73a9\u4e50", color: "#22C55E" },         // 玩乐
  { key: "intimacy" as const, label: "\u4eb2\u5bc6", color: "#EC4899" },    // 亲密
  { key: "sync" as const, label: "\u9ed8\u5951", color: "#6366F1" },        // 默契
];

function CompatScoreCircle({ score }: { score: number }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: 128, height: 128 }}>
      {/* Heart-shaped glow */}
      <div
        className="absolute inset-[-20px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(236,72,153,0.2) 0%, rgba(99,102,241,0.1) 50%, transparent 70%)",
        }}
      />
      <svg width={128} height={128} viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="64" cy="64" r={r}
          fill="none"
          stroke="url(#compat-arc-grad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 64 64)"
        />
        <defs>
          <linearGradient id="compat-arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-black leading-none"
          style={{
            fontSize: 40,
            color: "#FFFFFF",
            textShadow: "0 2px 12px rgba(236,72,153,0.4)",
          }}
        >
          {score}
        </span>
        <span className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          {"\u7f18\u5206\u6307\u6570"}
        </span>
      </div>
    </div>
  );
}

function CompatCardContent({ result }: CompatShareCardProps) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 375,
        background: "linear-gradient(155deg, #1A0A2E 0%, #1E1050 30%, #2A0E3A 60%, #0D1B3C 100%)",
        fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
        padding: "28px 24px 24px",
      }}
    >
      {/* ── Star decorations ── */}
      {Array.from({ length: 35 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 2 + 0.5,
            height: Math.random() * 2 + 0.5,
            top: `${Math.random() * 50}%`,
            left: `${Math.random() * 100}%`,
            backgroundColor: `rgba(255,255,255,${Math.random() * 0.2 + 0.05})`,
          }}
        />
      ))}

      {/* Heart decoration glow top center */}
      <div
        className="absolute"
        style={{
          width: 200,
          height: 200,
          top: -60,
          left: "50%",
          marginLeft: -100,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 60%)",
        }}
      />

      {/* Purple glow bottom */}
      <div
        className="absolute"
        style={{
          width: 160,
          height: 160,
          bottom: 40,
          right: -40,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 60%)",
        }}
      />

      {/* ── Header ── */}
      <div className="relative text-center mb-5">
        <div className="flex items-center justify-center gap-1.5 mb-1.5">
          <span style={{ fontSize: 14 }}>{"\ud83e\udd89"}</span>
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>
            {"\u89c2\u661f \u00b7 \u7f18\u5206\u5408\u76d8"}
          </span>
        </div>
      </div>

      {/* ── Two People ── */}
      <div className="relative flex items-center justify-center gap-4 mb-5">
        {/* Person 1 */}
        <div className="text-center flex-1">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-1.5 flex items-center justify-center font-bold"
            style={{
              background: "linear-gradient(135deg, #EC489966, #F43F5E44)",
              color: "#F9A8D4",
              fontSize: 18,
              border: "1.5px solid rgba(236,72,153,0.3)",
            }}
          >
            {(result.person1.name || "\u7532")[0]}
          </div>
          <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
            {result.person1.name || "\u7532\u65b9"}
          </div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            {result.person1.element}{"\u547d"}
          </div>
        </div>

        {/* Heart connector */}
        <div className="flex flex-col items-center gap-0.5">
          <div
            className="text-lg"
            style={{
              filter: "drop-shadow(0 0 8px rgba(236,72,153,0.5))",
            }}
          >
            {"\u2764\ufe0f"}
          </div>
          <div
            className="w-12 h-[1px]"
            style={{ background: "linear-gradient(90deg, rgba(236,72,153,0.4), rgba(99,102,241,0.4))" }}
          />
        </div>

        {/* Person 2 */}
        <div className="text-center flex-1">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-1.5 flex items-center justify-center font-bold"
            style={{
              background: "linear-gradient(135deg, #6366F166, #818CF844)",
              color: "#A5B4FC",
              fontSize: 18,
              border: "1.5px solid rgba(99,102,241,0.3)",
            }}
          >
            {(result.person2.name || "\u4e59")[0]}
          </div>
          <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
            {result.person2.name || "\u4e59\u65b9"}
          </div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            {result.person2.element}{"\u547d"}
          </div>
        </div>
      </div>

      {/* ── Score circle ── */}
      <div className="relative flex flex-col items-center mb-3">
        <CompatScoreCircle score={result.totalScore} />
        <span
          className="text-xs font-medium mt-2 px-3 py-0.5 rounded-full"
          style={{
            backgroundColor: "rgba(236,72,153,0.12)",
            color: "#F9A8D4",
            border: "1px solid rgba(236,72,153,0.2)",
          }}
        >
          {result.destinyType}
        </span>
      </div>

      {/* ── Five dimension bars ── */}
      <div
        className="relative rounded-xl px-4 py-3 mb-4"
        style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        <div className="space-y-2">
          {COMPAT_DIMS.map((dim) => {
            const score = result.radar[dim.key]?.score || 0;
            return (
              <div key={dim.key} className="flex items-center gap-2">
                <span className="text-[11px] w-8 flex-shrink-0" style={{ color: dim.color }}>
                  {dim.label}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(score, 3)}%`,
                      background: `linear-gradient(90deg, ${dim.color}cc, ${dim.color})`,
                      boxShadow: `0 0 6px ${dim.color}44`,
                    }}
                  />
                </div>
                <span className="text-[10px] w-6 text-right" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {score}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Chemistry text ── */}
      {result.chemistry && (
        <div
          className="relative rounded-xl px-4 py-3 mb-4"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
        >
          <p
            className="text-xs leading-relaxed text-center"
            style={{
              color: "rgba(255,255,255,0.55)",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {result.chemistry}
          </p>
        </div>
      )}

      {/* ── Divider ── */}
      <div className="relative mb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

      {/* ── Footer: CTA + QR Code ── */}
      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <span style={{ fontSize: 12 }}>{"\ud83e\udd89"}</span>
            <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.8)" }}>
              {"\u89c2\u661f GuanXing"}
            </span>
          </div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            {"\u6765\u6d4b\u6d4b\u4f60\u4eec\u7684\u7f18\u5206"}
          </div>
        </div>
        <div className="rounded-lg overflow-hidden" style={{ padding: 4, backgroundColor: "rgba(255,255,255,0.95)" }}>
          <QRCodeSVG
            value="https://heartai.zeabur.app"
            size={60}
            level="M"
            bgColor="transparent"
            fgColor="#1A1050"
          />
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div className="relative text-center mt-3">
        <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.18)" }}>
          {"\u4ec5\u4f9b\u5a31\u4e50\u53c2\u8003 \u00b7 \u771f\u7231\u9700\u8981\u7528\u5fc3\u7ecf\u8425"}
        </span>
      </div>
    </div>
  );
}

/** Share button + modal for compatibility results */
export function CompatShareButton({ result }: CompatShareCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        data-testid="button-share-compat-card"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>{"\u5206\u4eab\u7f18\u5206\u62a5\u544a"}</span>
      </button>

      <ShareModal
        isOpen={open}
        onClose={() => setOpen(false)}
        filename={`\u89c2\u661f\u7f18\u5206-${result.person1.name}-${result.person2.name}`}
        shareText={`${result.person1.name}\u548c${result.person2.name}\u7684\u7f18\u5206\u6307\u6570 ${result.totalScore} \u5206\uff01\u6765\u6d4b\u6d4b\u4f60\u4eec\u7684\u7f18\u5206`}
      >
        <CompatCardContent result={result} />
      </ShareModal>
    </>
  );
}

export { CompatCardContent };
