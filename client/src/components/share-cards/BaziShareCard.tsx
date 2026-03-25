import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Share2 } from "lucide-react";
import { ShareModal } from "./ShareModal";
import { useShareResult } from "@/hooks/use-share-result";
import { ELEMENT_COLORS, ELEMENT_EMOJI } from "./share-utils";

interface Pillar {
  name: string;
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
  nayin: string;
  shiShen: string;
}

interface BaziShareData {
  fullBazi: string;
  dayMaster: string;
  dayMasterElement: string;
  zodiac: string;
  constellation: string;
  pillars: Pillar[];
  elementCount: Record<string, number>;
  classicalQuote?: { text: string; source: string };
}

const PILLAR_LABELS = ["年柱", "月柱", "日柱", "时柱"];
const ELEMENT_NAMES = ["金", "木", "水", "火", "土"];

function PillarColumn({ pillar, label, isDayPillar }: { pillar: Pillar; label: string; isDayPillar: boolean }) {
  const stemColor = ELEMENT_COLORS[pillar.stemElement] || "#9CA3AF";
  const branchColor = ELEMENT_COLORS[pillar.branchElement] || "#9CA3AF";

  return (
    <div className="flex flex-col items-center" style={{ width: 72 }}>
      {/* Pillar label */}
      <span className="text-[9px] mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
        {label}
      </span>
      {/* Shi Shen */}
      <span className="text-[9px] mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
        {pillar.shiShen}
      </span>
      {/* Stem */}
      <div
        className="flex items-center justify-center rounded-lg mb-1"
        style={{
          width: 44,
          height: 44,
          background: `linear-gradient(145deg, ${stemColor}22, ${stemColor}11)`,
          border: `1.5px solid ${stemColor}44`,
          boxShadow: isDayPillar ? `0 0 12px ${stemColor}33` : undefined,
        }}
      >
        <span className="font-bold" style={{ fontSize: 20, color: stemColor }}>
          {pillar.stem}
        </span>
      </div>
      {/* Branch */}
      <div
        className="flex items-center justify-center rounded-lg mb-1"
        style={{
          width: 44,
          height: 44,
          background: `linear-gradient(145deg, ${branchColor}22, ${branchColor}11)`,
          border: `1.5px solid ${branchColor}44`,
        }}
      >
        <span className="font-bold" style={{ fontSize: 20, color: branchColor }}>
          {pillar.branch}
        </span>
      </div>
      {/* Nayin */}
      <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
        {pillar.nayin}
      </span>
    </div>
  );
}

function BaziCardContent({ data }: { data: BaziShareData }) {
  const totalElements = Object.values(data.elementCount).reduce((a, b) => a + b, 0) || 1;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 375,
        background: "linear-gradient(155deg, #0D0D1E 0%, #151030 30%, #1A0A28 60%, #0A0F26 100%)",
        fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
        padding: "28px 24px 24px",
      }}
    >
      {/* Star decorations */}
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

      {/* Amber glow top */}
      <div
        className="absolute"
        style={{
          width: 200,
          height: 200,
          top: -60,
          left: "50%",
          marginLeft: -100,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(217,119,6,0.1) 0%, transparent 60%)",
        }}
      />

      {/* Header */}
      <div className="relative text-center mb-5">
        <div className="flex items-center justify-center gap-1.5 mb-1.5">
          <span style={{ fontSize: 14 }}>🦉</span>
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>
            观星 · 八字命盘
          </span>
        </div>
        {/* Full Bazi */}
        <div
          className="text-lg font-bold tracking-widest mt-2"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          {data.fullBazi}
        </div>
        {/* Meta badges */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${ELEMENT_COLORS[data.dayMasterElement] || "#6366F1"}22`,
              color: ELEMENT_COLORS[data.dayMasterElement] || "#6366F1",
              border: `1px solid ${ELEMENT_COLORS[data.dayMasterElement] || "#6366F1"}33`,
            }}
          >
            {data.dayMaster} · {data.dayMasterElement}命
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            {data.zodiac} · {data.constellation}
          </span>
        </div>
      </div>

      {/* Four Pillars */}
      <div className="relative flex items-start justify-center gap-2 mb-5">
        {data.pillars.slice(0, 4).map((pillar, i) => (
          <PillarColumn
            key={i}
            pillar={pillar}
            label={PILLAR_LABELS[i]}
            isDayPillar={i === 2}
          />
        ))}
      </div>

      {/* Five Elements Distribution */}
      <div
        className="relative rounded-xl px-4 py-3 mb-4"
        style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-center gap-1.5 mb-2.5">
          <span style={{ fontSize: 12 }}>☯️</span>
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            五行分布
          </span>
        </div>
        <div className="space-y-1.5">
          {ELEMENT_NAMES.map((el) => {
            const count = data.elementCount[el] || 0;
            const pct = Math.round((count / totalElements) * 100);
            const color = ELEMENT_COLORS[el] || "#9CA3AF";
            return (
              <div key={el} className="flex items-center gap-2">
                <span className="text-[11px] w-6 flex-shrink-0" style={{ color }}>
                  {ELEMENT_EMOJI[el]}
                </span>
                <span className="text-[11px] w-4 flex-shrink-0" style={{ color }}>
                  {el}
                </span>
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(pct, 3)}%`,
                      background: `linear-gradient(90deg, ${color}cc, ${color})`,
                      boxShadow: `0 0 6px ${color}44`,
                    }}
                  />
                </div>
                <span className="text-[10px] w-4 text-right" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Classical Quote */}
      {data.classicalQuote && (
        <div
          className="relative rounded-xl px-4 py-3 mb-4 text-center"
          style={{ backgroundColor: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.1)" }}
        >
          <p
            className="text-xs italic leading-relaxed"
            style={{
              color: "rgba(255,255,255,0.5)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            "{data.classicalQuote.text}"
          </p>
          <span className="text-[9px]" style={{ color: "rgba(217,119,6,0.5)" }}>
            — {data.classicalQuote.source}
          </span>
        </div>
      )}

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
            来看看你的八字命盘
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
          仅供娱乐参考 · 命运掌握在自己手中
        </span>
      </div>
    </div>
  );
}

/** Share button + modal for bazi results */
export function BaziShareButton({ data }: { data: BaziShareData }) {
  const [open, setOpen] = useState(false);
  const { createShareLink } = useShareResult();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        data-testid="button-share-bazi-card"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>分享命盘</span>
      </button>

      <ShareModal
        isOpen={open}
        onClose={() => setOpen(false)}
        filename={`观星八字-${data.fullBazi}`}
        shareText={`我的八字：${data.fullBazi}（${data.dayMasterElement}命 · ${data.zodiac} · ${data.constellation}）。来看看你的命盘！`}
        onCopyLink={() => createShareLink("bazi", data)}
      >
        <BaziCardContent data={data} />
      </ShareModal>
    </>
  );
}

export { BaziCardContent };
