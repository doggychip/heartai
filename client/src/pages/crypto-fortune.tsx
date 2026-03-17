import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Coins,
  Sparkles,
  Clock,
  Lightbulb,
  Share2,
  Loader2,
  Download,
  Copy,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────
interface CryptoFortuneResult {
  token: string;
  element: string;
  tianGan: string;
  diZhi: string;
  dayElement: string;
  interaction: string;
  score: number;
  fortuneLevel: string;
  insight: string;
  luckyHours: string[];
  advice: string;
  quote: string;
  disclaimer: string;
  date: string;
}

// ─── Token Config ──────────────────────────────────────
const TOKENS = [
  { symbol: "BTC", name: "Bitcoin", element: "金", emoji: "₿", color: "#f7931a" },
  { symbol: "ETH", name: "Ethereum", element: "水", emoji: "Ξ", color: "#627eea" },
  { symbol: "SOL", name: "Solana", element: "火", emoji: "◎", color: "#9945ff" },
  { symbol: "BNB", name: "BNB", element: "土", emoji: "◆", color: "#f3ba2f" },
  { symbol: "TON", name: "Toncoin", element: "木", emoji: "◇", color: "#0098ea" },
  { symbol: "DOGE", name: "Dogecoin", element: "火", emoji: "Ð", color: "#c3a634" },
];

const ELEMENT_COLORS: Record<string, string> = {
  金: "#fbbf24", 木: "#22c55e", 水: "#3b82f6", 火: "#ef4444", 土: "#a16207",
};

const FORTUNE_COLORS: Record<string, string> = {
  大吉: "#fbbf24", 吉: "#22c55e", 中吉: "#3b82f6", 平: "#9ca3af", 小凶: "#f97316", 凶: "#ef4444",
};

// ─── Share Card Drawing ────────────────────────────────
function drawCryptoShareCard(canvas: HTMLCanvasElement, result: CryptoFortuneResult) {
  const ctx = canvas.getContext("2d")!;
  const W = 750, H = 1050;
  canvas.width = W;
  canvas.height = H;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0f0b1e");
  bg.addColorStop(0.5, "#1a1145");
  bg.addColorStop(1, "#0d1b2a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Stars
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3 + 0.1})`;
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H * 0.6, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Header
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("加密运势 Crypto Fortune", W / 2, 55);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText(result.date, W / 2, 85);

  // Token + Element
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px system-ui, sans-serif";
  ctx.fillText(result.token, W / 2, 150);

  const elemColor = ELEMENT_COLORS[result.element] || "#fbbf24";
  ctx.fillStyle = elemColor;
  ctx.font = "bold 24px system-ui, sans-serif";
  ctx.fillText(`五行属${result.element}`, W / 2, 185);

  // Score ring
  const cx = W / 2, cy = 300, r = 85;
  // Glow
  const glow = ctx.createRadialGradient(cx, cy, r - 20, cx, cy, r + 30);
  glow.addColorStop(0, "rgba(251,191,36,0.15)");
  glow.addColorStop(1, "rgba(251,191,36,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r - 30, cy - r - 30, (r + 30) * 2, (r + 30) * 2);

  // Background circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 8;
  ctx.stroke();

  // Score arc
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (Math.PI * 2 * Math.min(result.score, 100)) / 100;
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = FORTUNE_COLORS[result.fortuneLevel] || "#fbbf24";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.stroke();

  // Score number
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 56px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(result.score), cx, cy + 18);

  // Fortune level
  ctx.fillStyle = FORTUNE_COLORS[result.fortuneLevel] || "#fbbf24";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText(result.fortuneLevel, cx, cy + 50);

  // Bazi info
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText(`今日 ${result.tianGan}${result.diZhi} · ${result.interaction}`, cx, cy + r + 40);

  // Insight box
  const boxY = 470;
  const boxPad = 40;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(ctx, boxPad, boxY, W - boxPad * 2, 160, 16);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "18px system-ui, sans-serif";
  ctx.textAlign = "left";
  const lines = wrapText(ctx, result.insight, W - boxPad * 2 - 40);
  lines.slice(0, 5).forEach((line, i) => {
    ctx.fillText(line, boxPad + 20, boxY + 35 + i * 28);
  });

  // Lucky hours
  const hoursY = 660;
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("幸运时辰", cx, hoursY);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText(result.luckyHours.join("  ·  "), cx, hoursY + 30);

  // Advice
  const advY = 730;
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.fillText("今日建议", cx, advY);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText(result.advice, cx, advY + 30);

  // Quote
  if (result.quote) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "italic 15px system-ui, sans-serif";
    ctx.fillText(`"${result.quote}"`, cx, 810);
  }

  // Disclaimer
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(result.disclaimer, cx, 870);

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("观星 GuanXing · heartai.zeabur.app", cx, H - 40);
}

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
  const lines: string[] = [];
  let current = "";
  for (const char of text) {
    const test = current + char;
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─── Page Component ────────────────────────────────────
export default function CryptoFortunePage() {
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [customToken, setCustomToken] = useState("");
  const [result, setResult] = useState<CryptoFortuneResult | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", "/api/crypto/fortune", { token });
      return res.json() as Promise<CryptoFortuneResult>;
    },
    onSuccess: (data) => setResult(data),
    onError: () => toast({ title: "生成失败", description: "请稍后重试", variant: "destructive" }),
  });

  const handleGenerate = () => {
    const token = selectedToken || customToken.trim().toUpperCase();
    if (!token) return;
    setResult(null);
    mutation.mutate(token);
  };

  const handleShare = () => {
    if (!result || !canvasRef.current) return;
    drawCryptoShareCard(canvasRef.current, result);
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      try {
        navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast({ title: "已复制到剪贴板", description: "可以直接粘贴分享" });
      } catch {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `crypto-fortune-${result.token}-${result.date}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "已下载图片" });
      }
    }, "image/png");
  };

  const handleDownload = () => {
    if (!result || !canvasRef.current) return;
    drawCryptoShareCard(canvasRef.current, result);
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crypto-fortune-${result.token}-${result.date}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const scorePercent = result ? Math.min(result.score, 100) : 0;
  const circumference = 2 * Math.PI * 50;
  const strokeDashoffset = circumference - (circumference * scorePercent) / 100;

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Cosmic header */}
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 px-4 pt-6 pb-14 overflow-hidden">
        <div className="absolute top-[-40px] right-[-30px] w-48 h-48 rounded-full bg-amber-500/5" />
        <div className="absolute bottom-[-20px] left-[15%] w-32 h-32 rounded-full bg-purple-500/5" />
        <div className="absolute top-6 right-10 w-2 h-2 rounded-full bg-amber-300/60" />
        <div className="absolute top-14 right-20 w-1.5 h-1.5 rounded-full bg-white/40" />
        <div className="absolute top-20 left-8 w-1 h-1 rounded-full bg-amber-200/40" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-5 h-5 text-amber-400" />
            <h1 className="text-white text-lg font-bold">加密运势</h1>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
              Crypto Fortune
            </Badge>
          </div>
          <p className="text-white/60 text-sm">五行 × 加密货币 · 今日市场能量解读</p>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-8 px-4 pb-6 flex flex-col gap-5">

        {/* Token selector */}
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              选择代币
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {TOKENS.map((t) => {
                const isSelected = selectedToken === t.symbol;
                return (
                  <button
                    key={t.symbol}
                    onClick={() => { setSelectedToken(isSelected ? null : t.symbol); setCustomToken(""); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all border-2 ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 shadow-md scale-105"
                        : "border-transparent bg-muted/50 hover:bg-muted hover:scale-102"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: `linear-gradient(135deg, ${t.color}cc, ${t.color})` }}
                    >
                      {t.emoji}
                    </div>
                    <span className="text-xs font-semibold">{t.symbol}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {t.element}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom input */}
            <div className="flex gap-2">
              <Input
                placeholder="其他代币 (如 XRP, ADA...)"
                value={customToken}
                onChange={(e) => { setCustomToken(e.target.value.toUpperCase()); setSelectedToken(null); }}
                className="flex-1 text-sm"
                maxLength={10}
              />
              <Button
                onClick={handleGenerate}
                disabled={mutation.isPending || (!selectedToken && !customToken.trim())}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6"
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    测算
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading animation */}
        {mutation.isPending && (
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-2 border-amber-500/30 animate-ping" />
                <div className="absolute inset-2 rounded-full border-2 border-purple-500/30 animate-ping" style={{ animationDelay: "0.3s" }} />
                <div className="absolute inset-4 rounded-full border-2 border-blue-500/30 animate-ping" style={{ animationDelay: "0.6s" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">正在感应五行能量场...</p>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && !mutation.isPending && (
          <>
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/50 to-indigo-950/50 dark:from-slate-900 dark:to-indigo-950">
              <CardContent className="p-5">
                {/* Token + Element */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${TOKENS.find(t => t.symbol === result.token)?.color || "#fbbf24"}cc, ${TOKENS.find(t => t.symbol === result.token)?.color || "#fbbf24"})`,
                      }}
                    >
                      {TOKENS.find(t => t.symbol === result.token)?.emoji || result.token[0]}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{result.token}</h3>
                      <Badge
                        className="text-[10px] border-0"
                        style={{
                          background: `${ELEMENT_COLORS[result.element]}22`,
                          color: ELEMENT_COLORS[result.element],
                        }}
                      >
                        五行属{result.element}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{result.tianGan}{result.diZhi}日</div>
                    <div>{result.interaction}</div>
                  </div>
                </div>

                {/* Score ring */}
                <div className="flex items-center justify-center my-4">
                  <div className="relative w-[130px] h-[130px]">
                    <div
                      className="absolute inset-[-8px] rounded-full opacity-20 blur-lg"
                      style={{ background: FORTUNE_COLORS[result.fortuneLevel] || "#fbbf24" }}
                    />
                    <svg className="w-full h-full -rotate-90 relative" viewBox="0 0 120 120">
                      <defs>
                        <linearGradient id="crypto-score-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fbbf24" />
                          <stop offset="100%" stopColor={FORTUNE_COLORS[result.fortuneLevel] || "#fbbf24"} />
                        </linearGradient>
                      </defs>
                      <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/15" />
                      <circle
                        cx="60" cy="60" r="50"
                        fill="none" stroke="url(#crypto-score-grad)"
                        strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-[1.5s] ease-out"
                        style={{ filter: `drop-shadow(0 0 6px ${FORTUNE_COLORS[result.fortuneLevel] || "#fbbf24"}88)` }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black">{result.score}</span>
                      <span
                        className="text-sm font-bold mt-0.5"
                        style={{ color: FORTUNE_COLORS[result.fortuneLevel] || "#fbbf24" }}
                      >
                        {result.fortuneLevel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Insight */}
                <div className="bg-white/5 dark:bg-white/5 rounded-xl p-4 mb-4">
                  <p className="text-sm leading-relaxed text-foreground/80">{result.insight}</p>
                </div>

                {/* Lucky hours */}
                {result.luckyHours.length > 0 && (
                  <div className="flex items-start gap-2 mb-3">
                    <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-amber-400">幸运时辰</span>
                      <p className="text-sm text-foreground/70">{result.luckyHours.join(" · ")}</p>
                    </div>
                  </div>
                )}

                {/* Advice */}
                <div className="flex items-start gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-amber-400">今日建议</span>
                    <p className="text-sm text-foreground/70">{result.advice}</p>
                  </div>
                </div>

                {/* Quote */}
                {result.quote && (
                  <p className="text-xs text-muted-foreground italic text-center mt-3 mb-2">
                    "{result.quote}"
                  </p>
                )}

                {/* Share buttons */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={handleShare}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    复制图片
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={handleDownload}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    下载分享卡
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <div className="text-center text-[11px] text-muted-foreground px-4">
              <p>{result.disclaimer}</p>
            </div>
          </>
        )}

        {/* Info card when no result */}
        {!result && !mutation.isPending && (
          <Card className="border-0 shadow-sm rounded-2xl bg-muted/30">
            <CardContent className="p-5 text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400/20 to-purple-400/20 flex items-center justify-center mx-auto mb-3">
                <Coins className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="font-semibold text-sm mb-1">五行 × 加密货币</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                基于今日天干地支五行生克，<br />
                解读加密货币的能量走势。<br />
                选择代币，感应五行能量场。
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-3">
                仅供娱乐，非投资建议
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hidden canvas for share card */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
