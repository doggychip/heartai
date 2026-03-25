import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Share2 } from "lucide-react";
import { ShareModal } from "./ShareModal";
import { useShareResult } from "@/hooks/use-share-result";

interface TarotCard {
  name: string;
  emoji: string;
  reversed: boolean;
  position: string;
  interpretation: string;
}

interface TarotShareData {
  question: string;
  spread: string;
  cards: TarotCard[];
  overall: string;
  advice: string;
}

const SPREAD_LABELS: Record<string, string> = {
  single: "单牌指引",
  three: "三牌阵",
  cross: "十字牌阵",
};

function TarotCardMini({ card }: { card: TarotCard }) {
  return (
    <div className="flex flex-col items-center" style={{ width: 80 }}>
      {/* Card face */}
      <div
        className="relative flex flex-col items-center justify-center rounded-xl mb-1.5"
        style={{
          width: 68,
          height: 96,
          background: "linear-gradient(145deg, rgba(139,92,246,0.2) 0%, rgba(99,102,241,0.15) 50%, rgba(236,72,153,0.12) 100%)",
          border: "1px solid rgba(139,92,246,0.3)",
          boxShadow: "0 4px 16px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <span style={{ fontSize: 28, lineHeight: 1 }}>{card.emoji}</span>
        {card.reversed && (
          <div
            className="absolute -top-1.5 -right-1.5 text-[8px] font-bold px-1 py-0.5 rounded"
            style={{
              backgroundColor: "rgba(239,68,68,0.8)",
              color: "white",
            }}
          >
            逆
          </div>
        )}
      </div>
      {/* Position label */}
      <span className="text-[9px] font-medium mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
        {card.position}
      </span>
      {/* Card name */}
      <span
        className="text-[10px] font-medium text-center leading-tight"
        style={{ color: "rgba(255,255,255,0.75)" }}
      >
        {card.name}
      </span>
    </div>
  );
}

function TarotCardContent({ data }: { data: TarotShareData }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 375,
        background: "linear-gradient(155deg, #0D0A1E 0%, #1A1040 30%, #1E0A30 60%, #0A0F2E 100%)",
        fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
        padding: "28px 24px 24px",
      }}
    >
      {/* Star decorations */}
      {Array.from({ length: 40 }).map((_, i) => (
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

      {/* Purple glow top */}
      <div
        className="absolute"
        style={{
          width: 240,
          height: 240,
          top: -80,
          left: "50%",
          marginLeft: -120,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 60%)",
        }}
      />

      {/* Pink glow bottom-right */}
      <div
        className="absolute"
        style={{
          width: 160,
          height: 160,
          bottom: 60,
          right: -40,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 60%)",
        }}
      />

      {/* Header */}
      <div className="relative text-center mb-5">
        <div className="flex items-center justify-center gap-1.5 mb-1.5">
          <span style={{ fontSize: 14 }}>🦉</span>
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>
            观星 · 塔罗占卜
          </span>
        </div>
        <div className="text-[10px]" style={{ color: "rgba(139,92,246,0.6)" }}>
          {SPREAD_LABELS[data.spread] || data.spread}
        </div>
      </div>

      {/* Question */}
      {data.question && (
        <div
          className="relative rounded-xl px-4 py-2.5 mb-5 text-center"
          style={{ backgroundColor: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}
        >
          <p className="text-xs italic" style={{ color: "rgba(255,255,255,0.55)" }}>
            "{data.question}"
          </p>
        </div>
      )}

      {/* Cards display */}
      <div className="relative flex items-start justify-center gap-2 mb-5 flex-wrap">
        {data.cards.map((card, i) => (
          <TarotCardMini key={i} card={card} />
        ))}
      </div>

      {/* Overall reading */}
      <div
        className="relative rounded-xl px-4 py-3 mb-3"
        style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <span style={{ fontSize: 12 }}>📖</span>
          <span className="text-[11px] font-medium" style={{ color: "rgba(139,92,246,0.7)" }}>
            综合解读
          </span>
        </div>
        <p
          className="text-xs leading-relaxed"
          style={{
            color: "rgba(255,255,255,0.55)",
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {data.overall}
        </p>
      </div>

      {/* Advice */}
      <div
        className="relative rounded-xl px-4 py-3 mb-4"
        style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <span style={{ fontSize: 12 }}>💡</span>
          <span className="text-[11px] font-medium" style={{ color: "rgba(245,158,11,0.7)" }}>
            行动建议
          </span>
        </div>
        <p
          className="text-xs leading-relaxed"
          style={{
            color: "rgba(255,255,255,0.55)",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {data.advice}
        </p>
      </div>

      {/* Divider */}
      <div className="relative mb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

      {/* Footer */}
      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <span style={{ fontSize: 12 }}>🦉</span>
            <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.8)" }}>
              观星 GuanXing
            </span>
          </div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            来测测你的塔罗指引
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

      {/* Disclaimer */}
      <div className="relative text-center mt-3">
        <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.18)" }}>
          仅供娱乐参考 · 人生由自己掌握
        </span>
      </div>
    </div>
  );
}

/** Share button + modal for tarot results */
export function TarotShareButton({ data }: { data: TarotShareData }) {
  const [open, setOpen] = useState(false);
  const { createShareLink } = useShareResult();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        data-testid="button-share-tarot-card"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>分享牌阵</span>
      </button>

      <ShareModal
        isOpen={open}
        onClose={() => setOpen(false)}
        filename={`观星塔罗-${data.spread}`}
        shareText={`我用观星抽了一组塔罗牌：${data.cards.map((c) => c.emoji + c.name).join("、")}。来测测你的运势！`}
        onCopyLink={() => createShareLink("tarot", data)}
      >
        <TarotCardContent data={data} />
      </ShareModal>
    </>
  );
}

export { TarotCardContent };
