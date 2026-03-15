import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  Heart,
  Briefcase,
  Coins,
  Users,
  Sparkles,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";

interface ZodiacResult {
  sunSign: string;
  sunSignEmoji: string;
  moonSign: string | null;
  moonSignEmoji: string | null;
  risingSign: string | null;
  risingSignEmoji: string | null;
  rarityLabel: string;
  rarityPercent: string;
  dimensions: {
    love: { score: number; text: string };
    career: { score: number; text: string };
    wealth: { score: number; text: string };
    social: { score: number; text: string };
  };
  personality: string;
  element: string;
  quality: string;
  rulingPlanet: string;
  aiInsight: string;
}

const ZODIAC_SIGNS = [
  "白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座",
  "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座",
];

const ZODIAC_EMOJIS: Record<string, string> = {
  "白羊座": "♈", "金牛座": "♉", "双子座": "♊", "巨蟹座": "♋",
  "狮子座": "♌", "处女座": "♍", "天秤座": "♎", "天蝎座": "♏",
  "射手座": "♐", "摩羯座": "♑", "水瓶座": "♒", "双鱼座": "♓",
};

const DIM_CONFIG = [
  { key: "love" as const, label: "爱情", icon: Heart, color: "hsl(330, 55%, 55%)" },
  { key: "career" as const, label: "事业", icon: Briefcase, color: "hsl(235, 65%, 55%)" },
  { key: "wealth" as const, label: "财富", icon: Coins, color: "hsl(35, 85%, 55%)" },
  { key: "social" as const, label: "人际", icon: Users, color: "hsl(160, 50%, 45%)" },
];

function SignCard({ label, sign, emoji }: { label: string; sign: string; emoji: string }) {
  return (
    <div className="text-center space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/10">
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="font-semibold text-sm">{sign}</p>
      </div>
    </div>
  );
}

export default function ZodiacPage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [birthday, setBirthday] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [result, setResult] = useState<ZodiacResult | null>(null);

  // Auto-populate from user profile
  useEffect(() => {
    if (user?.birthDate) setBirthday(user.birthDate);
  }, [user?.birthDate]);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/zodiac/analyze", {
        birthday,
        birthTime: birthTime || undefined,
        birthPlace: birthPlace || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      // Auto-save birth date and zodiac sign to profile
      if (user && birthday) {
        const profileData: any = { birthDate: birthday };
        if (data.sunSign) profileData.zodiacSign = data.sunSign;
        updateProfile(profileData).catch(() => {});
      }
    },
    onError: (err: Error) => {
      toast({ title: "分析失败", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex-1 overflow-y-auto" data-testid="zodiac-page">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            星座解读
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            输入你的生日，解锁专属星座分析
          </p>
        </div>

        {/* Input Form */}
        <Card data-testid="card-zodiac-form">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                出生日期
              </Label>
              <Input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                data-testid="input-birthday"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  出生时间 (可选)
                </Label>
                <Input
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  data-testid="input-birthtime"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  出生城市 (可选)
                </Label>
                <Input
                  placeholder="如：北京"
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  data-testid="input-birthplace"
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => analyzeMutation.mutate()}
              disabled={!birthday || analyzeMutation.isPending}
              data-testid="button-analyze-zodiac"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  AI 分析中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  开始解读
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Loading state */}
        {analyzeMutation.isPending && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        )}

        {/* Results */}
        {result && !analyzeMutation.isPending && (
          <div className="space-y-5 animate-message-in">
            {/* Sign Cards: Sun / Moon / Rising */}
            <div className={`grid gap-3 ${result.moonSign ? "grid-cols-3" : "grid-cols-1"}`}>
              <SignCard label="太阳星座 ☉" sign={result.sunSign} emoji={result.sunSignEmoji || ZODIAC_EMOJIS[result.sunSign] || "⭐"} />
              {result.moonSign && (
                <SignCard label="月亮星座 ☽" sign={result.moonSign} emoji={result.moonSignEmoji || ZODIAC_EMOJIS[result.moonSign] || "🌙"} />
              )}
              {result.risingSign && (
                <SignCard label="上升星座 ↑" sign={result.risingSign} emoji={result.risingSignEmoji || ZODIAC_EMOJIS[result.risingSign] || "🌅"} />
              )}
            </div>

            {/* Rarity Badge */}
            <div className="flex items-center justify-center">
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 px-3 py-1">
                <Sparkles className="w-3 h-3 mr-1.5" />
                {result.rarityLabel} · 仅 {result.rarityPercent} 的人拥有此配置
              </Badge>
            </div>

            {/* Basic Info */}
            <Card>
              <CardContent className="pt-5">
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">元素</p>
                    <p className="font-medium mt-0.5">{result.element}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">模式</p>
                    <p className="font-medium mt-0.5">{result.quality}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">守护星</p>
                    <p className="font-medium mt-0.5">{result.rulingPlanet}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personality */}
            <Card data-testid="card-zodiac-personality">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">性格特质</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground/80">{result.personality}</p>
              </CardContent>
            </Card>

            {/* 4 Dimensions */}
            <Card data-testid="card-zodiac-dimensions">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">四维分析</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {DIM_CONFIG.map((dim) => {
                  const d = result.dimensions[dim.key];
                  return (
                    <div key={dim.key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <dim.icon className="w-4 h-4" style={{ color: dim.color }} />
                          <span className="text-sm font-medium">{dim.label}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: dim.color }}>
                          {d.score}/100
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${d.score}%`, backgroundColor: dim.color }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{d.text}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* AI Insight */}
            <Card className="bg-primary/5 border-primary/10" data-testid="card-zodiac-insight">
              <CardContent className="py-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Star className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">AI 深度解读</p>
                    <p className="text-sm leading-relaxed text-foreground/80">{result.aiInsight}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
