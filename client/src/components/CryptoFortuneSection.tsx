import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins } from "lucide-react";
import { Link } from "wouter";

interface CryptoFortuneToken {
  symbol: string;
  name: string;
  element: string;
  elementName: string;
  score: number;
  fortuneLevel: string;
  insight: string;
  relationship: string;
}

interface CryptoFortuneAllResponse {
  date: string;
  tianGan: string;
  diZhi: string;
  dayElement: string;
  tokens: CryptoFortuneToken[];
  disclaimer: string;
}

const ELEMENT_COLORS: Record<string, string> = {
  金: "#D4AF37",
  木: "#22C55E",
  水: "#3B82F6",
  火: "#EF4444",
  土: "#CA8A04",
};

const TOKEN_EMOJIS: Record<string, string> = {
  BTC: "₿",
  ETH: "Ξ",
  SOL: "◎",
  BNB: "◆",
  TON: "◇",
};

function CryptoScoreRing({
  score,
  color,
  size = 72,
}: {
  score: number;
  color: string;
  size?: number;
}) {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="5"
          opacity={0.4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: "stroke-dasharray 1.2s ease-out",
            filter: `drop-shadow(0 0 4px ${color}66)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-lg font-bold leading-none"
          style={{ color }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

function CryptoTokenCard({
  token,
  index,
}: {
  token: CryptoFortuneToken;
  index: number;
}) {
  const color = ELEMENT_COLORS[token.element] || "#D4AF37";
  const emoji = TOKEN_EMOJIS[token.symbol] || token.symbol[0];

  return (
    <div
      className="flex flex-col items-center gap-2 min-w-[120px] p-3 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-border transition-all"
      style={{
        animation: `fadeSlideUp 0.5s ease-out ${index * 0.1}s both`,
      }}
    >
      {/* Token icon */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md"
        style={{
          background: `linear-gradient(135deg, ${color}cc, ${color})`,
          boxShadow: `0 2px 8px ${color}44`,
        }}
      >
        {emoji}
      </div>

      {/* Token name + element */}
      <div className="text-center">
        <div className="text-xs font-semibold">{token.symbol}</div>
        <div
          className="text-[10px] font-medium"
          style={{ color }}
        >
          {token.element} · {token.elementName}
        </div>
      </div>

      {/* Score ring */}
      <CryptoScoreRing score={token.score} color={color} />

      {/* Fortune level */}
      <span
        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: `${color}18`,
          color,
        }}
      >
        {token.fortuneLevel}
      </span>

      {/* Brief insight */}
      <p className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2 px-1">
        {token.insight}
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 min-w-[120px]">
              <Skeleton className="w-9 h-9 rounded-full" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="w-[72px] h-[72px] rounded-full" />
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CryptoFortuneSection() {
  const { data, isLoading, isError } = useQuery<CryptoFortuneAllResponse>({
    queryKey: ["/api/crypto/fortune/all"],
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !data) return null;

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <Card data-testid="card-crypto-fortune">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              加密运势
            </CardTitle>
            <Link href="/crypto">
              <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                详细解读 →
              </span>
            </Link>
          </div>
          {data.tianGan && (
            <p className="text-[11px] text-muted-foreground">
              {data.tianGan}{data.diZhi}日 · 五行 × 加密货币能量
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent md:grid md:grid-cols-5 md:overflow-x-visible">
            {data.tokens.map((token, i) => (
              <CryptoTokenCard key={token.symbol} token={token} index={i} />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/60 text-center mt-3">
            {data.disclaimer}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
