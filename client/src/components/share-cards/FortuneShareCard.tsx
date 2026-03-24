import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Share2 } from "lucide-react";
import { ShareModal } from "./ShareModal";
import { useShareResult } from "@/hooks/use-share-result";
import { getScoreLabel } from "./share-utils";

interface FortuneData {
  totalScore: number;
  dimensions: { love: number; wealth: number; career: number; study: number; social: number };
  luckyColor: string;
  luckyNumber: number;
  luckyDirection: string;
  aiInsight: string;
  date: string;
  zodiac?: string;
}

interface FortuneShareCardProps {
  fortune: FortuneData;
  nickname: string;
  zodiac?: string;
  element?: string;
  lunarDate?: string;
}

const DIMS = [
  { key: "love" as const, label: "\u7231\u60c5", color: "#E8477A" },  // 爱情
  { key: "wealth" as const, label: "\u8d22\u8fd0", color: "#D4A843" }, // 财运
  { key: "career" as const, label: "\u4e8b\u4e1a", color: "#6366F1" }, // 事业
  { key: "study" as const, label: "\u5b66\u4e60", color: "#22C55E" },  // 学习
  { key: "social" as const, label: "\u4eba\u9645", color: "#A855F7" }, // 人际
];

function ScoreCircle({ score }: { score: number }) {
  const r = 62;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: 152, height: 152 }}>
      {/* Glow */}
      <div
        className="absolute inset-[-16px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(212,168,67,0.25) 0%, transparent 70%)",
        }}
      />
      <svg width={152} height={152} viewBox="0 0 152 152">
        {/* Track */}
        <circle cx="76" cy="76" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        {/* Progress arc */}
        <circle
          cx="76" cy="76" r={r}
          fill="none"
          stroke="url(#fortune-arc-grad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 76 76)"
        />
        <defs>
          <linearGradient id="fortune-arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-black leading-none"
          style={{
            fontSize: 48,
            color: "#FFFFFF",
            textShadow: "0 2px 12px rgba(245,158,11,0.4)",
          }}
        >
          {score}
        </span>
        <span className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          {"\u7efc\u5408\u8fd0\u52bf"}
        </span>
      </div>
    </div>
  );
}

function DimRing({ label, score, color }: { label: string; score: number; color: string }) {
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 50, height: 50 }}>
        <svg width={50} height={50} viewBox="0 0 50 50">
          <circle cx="25" cy="25" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
          <circle
            cx="25" cy="25" r={r}
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            transform="rotate(-90 25 25)"
            style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
    </div>
  );
}

/** The actual visual card rendered inside the modal, captured by html2canvas */
function FortuneCardContent({ fortune, nickname, zodiac, element, lunarDate }: FortuneShareCardProps) {
  const dateStr = fortune.date || new Date().toISOString().split("T")[0];
  const label = getScoreLabel(fortune.totalScore);
  const labelColor = fortune.totalScore >= 75 ? "#F59E0B" : fortune.totalScore >= 40 ? "#6366F1" : "#E8477A";

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 375,
        background: "linear-gradient(160deg, #0F0B2E 0%, #1A1050 35%, #0D1B3C 100%)",
        fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
        padding: "32px 24px 28px",
      }}
    >
      {/* ── Star decorations (CSS pseudo-elements via inline divs) ── */}
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 2.5 + 0.5,
            height: Math.random() * 2.5 + 0.5,
            top: `${Math.random() * 55}%`,
            left: `${Math.random() * 100}%`,
            backgroundColor: `rgba(255,255,255,${Math.random() * 0.25 + 0.05})`,
          }}
        />
      ))}

      {/* Cosmic glow orb top-right */}
      <div
        className="absolute"
        style={{
          width: 160,
          height: 160,
          top: -40,
          right: -40,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Cosmic glow orb bottom-left */}
      <div
        className="absolute"
        style={{
          width: 120,
          height: 120,
          bottom: 80,
          left: -30,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)",
        }}
      />

      {/* ── Header: Logo + Date ── */}
      <div className="relative text-center mb-6">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span style={{ fontSize: 18 }}>{"\ud83e\udd89"}</span>
          <span className="font-bold" style={{ fontSize: 18, color: "rgba(255,255,255,0.9)", letterSpacing: 2 }}>
            {"\u89c2\u661f"}
          </span>
        </div>
        <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          {dateStr}
          {lunarDate ? ` \u00b7 \u519c\u5386${lunarDate}` : ""}
        </div>
      </div>

      {/* ── User info ── */}
      <div className="relative text-center mb-5">
        <div className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          {nickname || "\u89c2\u661f\u7528\u6237"}{"\u7684\u4eca\u65e5\u8fd0\u52bf"}
        </div>
        {(zodiac || element) && (
          <div className="flex items-center justify-center gap-2 mt-1.5">
            {zodiac && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
              >
                {zodiac}
              </span>
            )}
            {element && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
              >
                {element}{"\u547d"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Score circle ── */}
      <div className="relative flex flex-col items-center mb-4">
        <ScoreCircle score={fortune.totalScore} />
        <span
          className="text-xs font-bold mt-2 px-3 py-0.5 rounded-full"
          style={{ backgroundColor: `${labelColor}22`, color: labelColor }}
        >
          {label}
        </span>
      </div>

      {/* ── Five dimension rings ── */}
      <div className="relative flex items-center justify-between px-2 mb-5">
        {DIMS.map((dim) => (
          <DimRing key={dim.key} label={dim.label} score={fortune.dimensions[dim.key]} color={dim.color} />
        ))}
      </div>

      {/* ── AI Insight ── */}
      {fortune.aiInsight && (
        <div
          className="relative rounded-xl px-4 py-3 mb-4"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          <p
            className="text-xs leading-relaxed text-center"
            style={{
              color: "rgba(255,255,255,0.6)",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {fortune.aiInsight}
          </p>
        </div>
      )}

      {/* ── Lucky info row ── */}
      <div
        className="relative flex items-center justify-center gap-5 rounded-lg px-3 py-2.5 mb-5"
        style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        {fortune.luckyColor && (
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
            {"\ud83c\udfa8"} {fortune.luckyColor}
          </span>
        )}
        {fortune.luckyNumber > 0 && (
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
            {"\ud83d\udd22"} {fortune.luckyNumber}
          </span>
        )}
        {fortune.luckyDirection && (
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
            {"\ud83e\udded"} {fortune.luckyDirection}
          </span>
        )}
      </div>

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
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            {"\u626b\u7801\u67e5\u770b\u4f60\u7684\u8fd0\u52bf"}
          </div>
        </div>
        <div className="rounded-lg overflow-hidden" style={{ padding: 4, backgroundColor: "rgba(255,255,255,0.95)" }}>
          <QRCodeSVG
            value="https://heartai.zeabur.app"
            size={64}
            level="M"
            bgColor="transparent"
            fgColor="#1A1050"
          />
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div className="relative text-center mt-4">
        <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          {"\u4ec5\u4f9b\u5a31\u4e50\u53c2\u8003 \u00b7 \u771f\u5b9e\u4eba\u751f\u9760\u81ea\u5df1\u7ecf\u8425"}
        </span>
      </div>
    </div>
  );
}

/** Share button + modal for daily fortune */
export function FortuneShareButton({
  fortune,
  nickname,
  zodiac,
  element,
  lunarDate,
}: FortuneShareCardProps) {
  const [open, setOpen] = useState(false);
  const { createShareLink } = useShareResult();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        data-testid="button-share-fortune-card"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>{"\u5206\u4eab"}</span>
      </button>

      <ShareModal
        isOpen={open}
        onClose={() => setOpen(false)}
        filename={`\u89c2\u661f\u8fd0\u52bf-${fortune.date || "today"}`}
        shareText={`\u6211\u5728\u89c2\u661f\u7684\u4eca\u65e5\u8fd0\u52bf ${fortune.totalScore} \u5206\uff01\u5feb\u6765\u770b\u770b\u4f60\u7684`}
        onCopyLink={() => createShareLink("fortune", { fortune, nickname, zodiac, element, lunarDate })}
      >
        <FortuneCardContent
          fortune={fortune}
          nickname={nickname}
          zodiac={zodiac}
          element={element}
          lunarDate={lunarDate}
        />
      </ShareModal>
    </>
  );
}

export { FortuneCardContent };
