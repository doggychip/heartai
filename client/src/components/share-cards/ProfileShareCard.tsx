import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Share2 } from "lucide-react";
import { ShareModal } from "./ShareModal";
import { ELEMENT_COLORS } from "./share-utils";

interface ProfileShareCardProps {
  nickname: string;
  zodiac?: string;
  mbtiType?: string;
  element?: string;
  dayMaster?: string;
  traits?: string[];
  elementCounts?: Record<string, number>;
}

const ELEMENTS_ORDER = ["\u91d1", "\u6728", "\u6c34", "\u706b", "\u571f"]; // 金木水火土
const ELEMENT_LABELS: Record<string, string> = {
  "\u91d1": "Gold",
  "\u6728": "Wood",
  "\u6c34": "Water",
  "\u706b": "Fire",
  "\u571f": "Earth",
};

/** Zodiac sign to symbol */
const ZODIAC_SYMBOLS: Record<string, string> = {
  "\u767d\u7f8a\u5ea7": "\u2648",
  "\u91d1\u725b\u5ea7": "\u2649",
  "\u53cc\u5b50\u5ea7": "\u264a",
  "\u5de8\u87f9\u5ea7": "\u264b",
  "\u72ee\u5b50\u5ea7": "\u264c",
  "\u5904\u5973\u5ea7": "\u264d",
  "\u5929\u79e4\u5ea7": "\u264e",
  "\u5929\u874e\u5ea7": "\u264f",
  "\u5c04\u624b\u5ea7": "\u2650",
  "\u6469\u7faf\u5ea7": "\u2651",
  "\u6c34\u74f6\u5ea7": "\u2652",
  "\u53cc\u9c7c\u5ea7": "\u2653",
};

function ProfileCardContent({
  nickname,
  zodiac,
  mbtiType,
  element,
  dayMaster,
  traits,
  elementCounts,
}: ProfileShareCardProps) {
  const maxCount = elementCounts
    ? Math.max(...Object.values(elementCounts), 1)
    : 1;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 375,
        background: "linear-gradient(145deg, #0F0B2E 0%, #151040 40%, #0E1830 100%)",
        fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
        padding: "28px 24px 24px",
      }}
    >
      {/* ── Star decorations ── */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 2 + 0.5,
            height: Math.random() * 2 + 0.5,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            backgroundColor: `rgba(255,255,255,${Math.random() * 0.15 + 0.03})`,
          }}
        />
      ))}

      {/* Decorative gold line top */}
      <div
        className="absolute top-0 left-6 right-6"
        style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(212,168,67,0.3), transparent)" }}
      />

      {/* ── Header: Logo ── */}
      <div className="relative flex items-center justify-between mb-6">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 14 }}>{"\ud83e\udd89"}</span>
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>
            {"\u89c2\u661f \u00b7 \u547d\u683c\u540d\u7247"}
          </span>
        </div>
        <div className="text-[10px]" style={{ color: "rgba(212,168,67,0.5)" }}>
          DESTINY PROFILE
        </div>
      </div>

      {/* ── Nickname + Zodiac ── */}
      <div className="relative text-center mb-5">
        <h2
          className="font-bold mb-2"
          style={{
            fontSize: 26,
            color: "#FFFFFF",
            letterSpacing: 3,
            textShadow: "0 2px 12px rgba(99,102,241,0.3)",
          }}
        >
          {nickname || "\u89c2\u661f\u7528\u6237"}
        </h2>
        {zodiac && (
          <div className="flex items-center justify-center gap-2">
            <span style={{ fontSize: 20, color: "rgba(212,168,67,0.8)" }}>
              {ZODIAC_SYMBOLS[zodiac] || "\u2728"}
            </span>
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              {zodiac}
            </span>
          </div>
        )}
      </div>

      {/* ── Info badges row ── */}
      <div className="relative flex items-center justify-center gap-2 flex-wrap mb-5">
        {mbtiType && (
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{
              backgroundColor: "rgba(99,102,241,0.15)",
              color: "#818CF8",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            {mbtiType}
          </span>
        )}
        {element && (
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{
              backgroundColor: `${ELEMENT_COLORS[element] || "#D4A843"}15`,
              color: ELEMENT_COLORS[element] || "#D4A843",
              border: `1px solid ${ELEMENT_COLORS[element] || "#D4A843"}33`,
            }}
          >
            {element}{"\u547d"}
          </span>
        )}
        {dayMaster && (
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{
              backgroundColor: "rgba(212,168,67,0.12)",
              color: "#D4A843",
              border: "1px solid rgba(212,168,67,0.2)",
            }}
          >
            {dayMaster}
          </span>
        )}
      </div>

      {/* ── Five Element Distribution ── */}
      {elementCounts && Object.keys(elementCounts).length > 0 && (
        <div
          className="relative rounded-xl px-4 py-3.5 mb-4"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
        >
          <div className="text-[10px] font-medium mb-3" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>
            {"\u4e94\u884c\u5206\u5e03"}
          </div>
          <div className="space-y-2">
            {ELEMENTS_ORDER.map((el) => {
              const count = elementCounts[el] || 0;
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const elColor = ELEMENT_COLORS[el] || "#D4A843";
              return (
                <div key={el} className="flex items-center gap-2">
                  <span className="text-xs w-4 text-center" style={{ color: elColor }}>
                    {el}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(pct, 4)}%`,
                        backgroundColor: elColor,
                        boxShadow: `0 0 8px ${elColor}44`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] w-4 text-right" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Personality Traits ── */}
      {traits && traits.length > 0 && (
        <div className="relative flex items-center justify-center gap-1.5 flex-wrap mb-5">
          {traits.slice(0, 5).map((trait, i) => (
            <span
              key={i}
              className="text-[11px] px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {trait}
            </span>
          ))}
        </div>
      )}

      {/* ── Gold decorative line ── */}
      <div className="relative mb-4" style={{ borderTop: "1px solid rgba(212,168,67,0.15)" }} />

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
            {"\u6765\u89c2\u661f\uff0c\u53d1\u73b0\u4f60\u7684\u547d\u683c"}
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

      {/* Bottom gold line */}
      <div
        className="absolute bottom-0 left-6 right-6"
        style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(212,168,67,0.3), transparent)" }}
      />
    </div>
  );
}

/** Share button + modal for destiny profile */
export function ProfileShareButton(props: ProfileShareCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        data-testid="button-share-profile-card"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>{"\u5206\u4eab\u6211\u7684\u547d\u683c"}</span>
      </button>

      <ShareModal
        isOpen={open}
        onClose={() => setOpen(false)}
        filename={`\u89c2\u661f\u547d\u683c-${props.nickname || "profile"}`}
        shareText={`\u6211\u7684\u89c2\u661f\u547d\u683c\u540d\u7247\uff01\u6765\u770b\u770b\u4f60\u7684`}
      >
        <ProfileCardContent {...props} />
      </ShareModal>
    </>
  );
}

export { ProfileCardContent };
