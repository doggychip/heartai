import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Share2, Download, Copy, X, Sparkles } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────
interface FortuneData {
  totalScore: number;
  dimensions: { love: number; wealth: number; career: number; study: number; social: number };
  luckyColor: string;
  luckyNumber: number;
  luckyDirection: string;
  aiInsight: string;
  date: string;
  isPersonalized?: boolean;
}

interface DashboardData {
  dailyQian: { number: number; title: string; poem: string; rank: string } | null;
}

const DIMENSION_CONFIG = [
  { key: "love" as const, label: "爱情", color: "hsl(330, 55%, 55%)" },
  { key: "wealth" as const, label: "财富", color: "hsl(35, 85%, 55%)" },
  { key: "career" as const, label: "事业", color: "hsl(235, 65%, 55%)" },
  { key: "study" as const, label: "学习", color: "hsl(160, 50%, 45%)" },
  { key: "social" as const, label: "人际", color: "hsl(280, 50%, 55%)" },
];

const getScoreLabel = (s: number) => {
  if (s >= 90) return "大吉";
  if (s >= 75) return "吉";
  if (s >= 60) return "中吉";
  if (s >= 40) return "平";
  return "凶";
};

// ─── Canvas Share Card Generator ─────────────────────────────
function drawShareCard(
  canvas: HTMLCanvasElement,
  fortune: FortuneData,
  qian: DashboardData["dailyQian"],
  nickname: string
) {
  const W = 750;
  const H = 1200;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ─── Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#1a103d");
  bgGrad.addColorStop(0.4, "#1e1252");
  bgGrad.addColorStop(1, "#0f1a3a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Decorative dots (stars)
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H * 0.5;
    const r = Math.random() * 1.5 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3 + 0.1})`;
    ctx.fill();
  }

  // ─── Logo & Title
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 30px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🦉 观星", W / 2, 60);

  // Date
  const dateStr = fortune.date || new Date().toISOString().split("T")[0];
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "16px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(dateStr, W / 2, 95);

  // ─── Nickname
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "18px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(`${nickname || "观星用户"} 的今日运势`, W / 2, 140);

  // ─── Total Score Circle
  const cx = W / 2, cy = 270, outerR = 85;
  // Glow
  const glowGrad = ctx.createRadialGradient(cx, cy, outerR * 0.5, cx, cy, outerR * 1.3);
  glowGrad.addColorStop(0, "rgba(253,186,116,0.2)");
  glowGrad.addColorStop(1, "rgba(253,186,116,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(cx - outerR * 1.5, cy - outerR * 1.5, outerR * 3, outerR * 3);

  // Background circle
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();

  // Progress arc
  ctx.beginPath();
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (Math.PI * 2 * fortune.totalScore) / 100;
  ctx.arc(cx, cy, outerR, startAngle, endAngle);
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  const arcGrad = ctx.createLinearGradient(cx - outerR, cy, cx + outerR, cy);
  arcGrad.addColorStop(0, "#f59e0b");
  arcGrad.addColorStop(1, "#ec4899");
  ctx.strokeStyle = arcGrad;
  ctx.stroke();

  // Score number
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 56px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${fortune.totalScore}`, cx, cy + 10);

  // Score label
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "18px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(getScoreLabel(fortune.totalScore), cx, cy + 40);

  // ─── Five Dimension Rings
  const dimY = 420;
  const dimSpacing = W / 6;
  DIMENSION_CONFIG.forEach((dim, i) => {
    const dx = dimSpacing + i * dimSpacing;
    const r = 30;
    const score = fortune.dimensions[dim.key];

    // Ring background
    ctx.beginPath();
    ctx.arc(dx, dimY, r, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.stroke();

    // Ring progress
    ctx.beginPath();
    const dimStartAngle = -Math.PI / 2;
    const dimEndAngle = dimStartAngle + (Math.PI * 2 * score) / 100;
    ctx.arc(dx, dimY, r, dimStartAngle, dimEndAngle);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = dim.color;
    ctx.stroke();

    // Score inside
    ctx.fillStyle = dim.color;
    ctx.font = "bold 18px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${score}`, dx, dimY + 6);

    // Label below
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "13px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillText(dim.label, dx, dimY + r + 22);
  });

  // ─── AI Insight
  if (fortune.aiInsight) {
    const insightY = 510;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, 50, insightY, W - 100, 80, 16);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "15px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    const lines = wrapText(ctx, fortune.aiInsight, W - 140);
    lines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, W / 2, insightY + 30 + i * 24);
    });
  }

  // ─── Lucky Info Row
  const luckyY = 620;
  const luckyItems: string[] = [];
  if (fortune.luckyColor) luckyItems.push(`🎨 ${fortune.luckyColor}`);
  if (fortune.luckyNumber > 0) luckyItems.push(`🔢 ${fortune.luckyNumber}`);
  if (fortune.luckyDirection) luckyItems.push(`🧭 ${fortune.luckyDirection}`);

  if (luckyItems.length > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, 50, luckyY, W - 100, 50, 12);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "15px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(luckyItems.join("    "), W / 2, luckyY + 32);
  }

  // ─── Daily Qian
  if (qian) {
    const qianY = 700;
    // Decorative frame
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundRect(ctx, 60, qianY, W - 120, 140, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(253,186,116,0.3)";
    ctx.lineWidth = 1;
    roundRect(ctx, 60, qianY, W - 120, 140, 16);
    ctx.stroke();

    // Qian number/title
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 18px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`📜 每日一签 · 第${qian.number}签 · ${qian.title}`, W / 2, qianY + 35);

    // Rank
    ctx.fillStyle = "rgba(253,186,116,0.7)";
    ctx.font = "14px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillText(`【${qian.rank}】`, W / 2, qianY + 60);

    // Poem
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "italic 15px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    const poemLines = wrapText(ctx, qian.poem, W - 180);
    poemLines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, W / 2, qianY + 90 + i * 22);
    });
  }

  // ─── Divider
  const divY = 870;
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, divY);
  ctx.lineTo(W - 80, divY);
  ctx.stroke();

  // ─── CTA
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "bold 22px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🦉 来观星，看看你的今日运势", W / 2, 920);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "15px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("heartai.zeabur.app", W / 2, 955);

  // ─── QR placeholder hint
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, W / 2 - 55, 985, 110, 110, 12);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "12px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("扫码查看", W / 2, 1050);

  // ─── Footer disclaimer
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = "11px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("仅供娱乐参考 · 真实人生靠自己经营", W / 2, 1150);
  ctx.fillText("Powered by 观星 GuanXing", W / 2, 1175);
}

// ─── Helpers
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const chars = text.split("");
  const lines: string[] = [];
  let currentLine = "";
  for (const char of chars) {
    const testLine = currentLine + char;
    if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ─── Share Card Modal Component ──────────────────────────────
export function ShareCardModal({
  isOpen,
  onClose,
  fortune,
  qian,
  nickname,
}: {
  isOpen: boolean;
  onClose: () => void;
  fortune: FortuneData;
  qian: DashboardData["dailyQian"];
  nickname: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState<string>("");

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      drawShareCard(canvasRef.current, fortune, qian, nickname);
      setImageUrl(canvasRef.current.toDataURL("image/png"));
    }
  }, [isOpen, fortune, qian, nickname]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `观星运势-${fortune.date || "today"}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
    toast({ title: "已保存", description: "图片已下载到本地" });
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/`;
    try {
      await navigator.clipboard.writeText(`我在观星的今日运势 ${fortune.totalScore} 分！快来看看你的 👉 ${url}`);
      toast({ title: "已复制", description: "分享文案已复制到剪贴板" });
    } catch {
      toast({ title: "复制失败", description: "请手动复制链接", variant: "destructive" });
    }
  };

  const handleShareImage = async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current!.toBlob(resolve, "image/png")
      );
      if (blob && navigator.share) {
        const file = new File([blob], `观星运势-${fortune.date}.png`, { type: "image/png" });
        await navigator.share({
          title: "我的今日运势 - 观星",
          text: `我在观星的今日运势 ${fortune.totalScore} 分！快来看看你的`,
          files: [file],
        });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="relative max-w-sm w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition"
          onClick={onClose}
          data-testid="button-close-share"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Canvas preview */}
        <div className="overflow-y-auto rounded-xl" style={{ maxHeight: "70vh" }}>
          <canvas
            ref={canvasRef}
            className="w-full rounded-xl"
            data-testid="canvas-share-card"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={handleCopyLink}
            data-testid="button-share-copy"
          >
            <Copy className="w-4 h-4 mr-1.5" /> 复制链接
          </Button>
          <Button
            variant="outline"
            className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={handleDownload}
            data-testid="button-share-download"
          >
            <Download className="w-4 h-4 mr-1.5" /> 保存图片
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white border-0"
            onClick={handleShareImage}
            data-testid="button-share-native"
          >
            <Share2 className="w-4 h-4 mr-1.5" /> 分享
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Share Button for Dashboard ──────────────────────────────
export function ShareFortuneButton({
  fortune,
  qian,
  nickname,
}: {
  fortune: FortuneData;
  qian: DashboardData["dailyQian"];
  nickname: string;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        data-testid="button-share-fortune"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>分享</span>
      </button>

      <ShareCardModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        fortune={fortune}
        qian={qian}
        nickname={nickname}
      />
    </>
  );
}
