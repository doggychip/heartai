import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  Sparkles,
  RotateCcw,
  Heart,
  MapPin,
  Clock,
  Eye,
  MessageCircle,
  Star,
  Users,
  Compass,
} from "lucide-react";

interface SoulmateResult {
  userInfo: { birthDate: string; element: string; zodiacSign?: string; mbtiType?: string };
  title: string;
  personality: { traits: string[]; description: string };
  compatibility: { bestZodiac: string[]; bestMBTI: string[]; bestElement: string };
  interaction: { loveLanguage: string; dateStyle: string; conflictStyle: string };
  meetingGuide: { where: string[]; when: string; sign: string };
  message: string;
}

const ZODIAC_SIGNS = [
  "白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座",
  "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座",
];

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP",
];

export default function SoulmatePage() {
  const { toast } = useToast();
  const { user, updateProfile } = useAuth();
  const [birthDate, setBirthDate] = useState("");
  const [zodiacSign, setZodiacSign] = useState("");
  const [mbtiType, setMbtiType] = useState("");
  const [gender, setGender] = useState("");
  const [concerns, setConcerns] = useState("");
  const [result, setResult] = useState<SoulmateResult | null>(null);

  // Auto-populate from user profile
  useEffect(() => {
    if (user?.birthDate) setBirthDate(user.birthDate);
    if (user?.zodiacSign) setZodiacSign(user.zodiacSign);
    if (user?.mbtiType) setMbtiType(user.mbtiType);
  }, [user?.birthDate, user?.zodiacSign, user?.mbtiType]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/soulmate/portrait", {
        birthDate,
        zodiacSign: zodiacSign || undefined,
        mbtiType: mbtiType || undefined,
        gender: gender || undefined,
        concerns: concerns || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      // Auto-save to profile
      if (user && birthDate) {
        const profileData: any = { birthDate };
        if (zodiacSign) profileData.zodiacSign = zodiacSign;
        if (mbtiType) profileData.mbtiType = mbtiType;
        updateProfile(profileData).catch(() => {});
      }
    },
    onError: (err: Error) =>
      toast({ title: "分析失败", description: err.message, variant: "destructive" }),
  });

  const restart = () => setResult(null);

  // ─── Result View ─────
  if (result) {
    return (
      <div className="flex-1 overflow-y-auto" data-testid="soulmate-result-page">
        <div className="max-w-2xl mx-auto p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">灵魂伴侣画像</h1>
            <Button variant="outline" size="sm" onClick={restart} data-testid="button-soulmate-restart">
              <RotateCcw className="w-4 h-4 mr-1" /> 重新分析
            </Button>
          </div>

          {/* Hero - Soulmate Title */}
          <Card className="bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-purple-500/10 border-pink-500/20 overflow-hidden">
            <CardContent className="py-8 text-center relative">
              <div className="absolute inset-0 opacity-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Heart key={i} className="absolute text-pink-500" style={{
                    width: `${12 + i * 4}px`, height: `${12 + i * 4}px`,
                    left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%`,
                    opacity: 0.3 + i * 0.1,
                  }} />
                ))}
              </div>
              <Heart className="w-10 h-10 text-pink-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold">{result.title}</h2>
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                {result.userInfo.zodiacSign && (
                  <Badge variant="outline" className="text-[10px]">{result.userInfo.zodiacSign}</Badge>
                )}
                {result.userInfo.mbtiType && (
                  <Badge variant="outline" className="text-[10px]">{result.userInfo.mbtiType}</Badge>
                )}
                <Badge variant="secondary" className="text-[10px]">{result.userInfo.element}命</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Personality Traits */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" /> Ta 的性格特质
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {result.personality.traits.map((trait, i) => (
                  <Badge key={i} className="text-xs bg-pink-500/10 text-pink-600 dark:text-pink-400 border-0">
                    {trait}
                  </Badge>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-foreground/80">{result.personality.description}</p>
            </CardContent>
          </Card>

          {/* Best Match */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> 最佳匹配
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">最配星座</p>
                <div className="flex gap-2">
                  {result.compatibility.bestZodiac.map((z, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{z}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">最配 MBTI</p>
                <div className="flex gap-2">
                  {result.compatibility.bestMBTI.map((m, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-mono">{m}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">最配五行</p>
                <Badge className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0">
                  {result.compatibility.bestElement}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Interaction Style */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-pink-500" /> 相处模式
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-accent/30">
                <p className="text-[10px] text-muted-foreground mb-1">爱的语言</p>
                <p className="text-sm font-medium">{result.interaction.loveLanguage}</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/30">
                <p className="text-[10px] text-muted-foreground mb-1">理想约会</p>
                <p className="text-sm text-foreground/80">{result.interaction.dateStyle}</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/30">
                <p className="text-[10px] text-muted-foreground mb-1">冲突处理</p>
                <p className="text-sm text-foreground/80">{result.interaction.conflictStyle}</p>
              </div>
            </CardContent>
          </Card>

          {/* Meeting Guide */}
          <Card className="bg-gradient-to-br from-violet-500/5 to-pink-500/5 border-violet-500/15">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Compass className="w-4 h-4 text-violet-500" /> 相遇指南
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">可能相遇的地方</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {result.meetingGuide.where.map((w, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{w}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">相遇时间</p>
                  <p className="text-sm font-medium mt-0.5">{result.meetingGuide.when}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">缘分征兆</p>
                  <p className="text-sm text-foreground/80 mt-0.5">{result.meetingGuide.sign}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message */}
          <Card className="border-pink-500/20">
            <CardContent className="py-5 text-center">
              <Heart className="w-5 h-5 text-pink-500 mx-auto mb-2" />
              <p className="text-sm leading-relaxed text-foreground/80 italic">
                「{result.message}」
              </p>
            </CardContent>
          </Card>

          <div className="border-t border-border pt-3">
            <p className="text-[10px] text-center text-muted-foreground">
              ⚠️ 免责声明：灵魂伴侣画像仅供娱乐和自我探索参考，不构成任何现实建议。每段缘分都值得珍惜。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Input Form ─────
  return (
    <div className="flex-1 overflow-y-auto" data-testid="soulmate-page">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            灵魂伴侣画像
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI 根据你的命理与性格，描绘命中注定的 Ta
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">出生日期 *</label>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                data-testid="input-soulmate-birthdate"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">星座 (选填)</label>
                <Select value={zodiacSign} onValueChange={setZodiacSign}>
                  <SelectTrigger data-testid="select-soulmate-zodiac">
                    <SelectValue placeholder="选择星座" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZODIAC_SIGNS.map((z) => (
                      <SelectItem key={z} value={z}>{z}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">MBTI (选填)</label>
                <Select value={mbtiType} onValueChange={setMbtiType}>
                  <SelectTrigger data-testid="select-soulmate-mbti">
                    <SelectValue placeholder="选择MBTI" />
                  </SelectTrigger>
                  <SelectContent>
                    {MBTI_TYPES.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">性别 (选填)</label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger data-testid="select-soulmate-gender">
                  <SelectValue placeholder="选择性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男</SelectItem>
                  <SelectItem value="female">女</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">对理想伴侣的期望 (选填)</label>
              <Textarea
                placeholder="例：希望对方有幽默感，能一起旅行..."
                value={concerns}
                onChange={(e) => setConcerns(e.target.value)}
                rows={2}
                className="resize-none"
                data-testid="input-soulmate-concerns"
              />
            </div>

            <Button
              className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
              disabled={!birthDate || mutation.isPending}
              onClick={() => mutation.mutate()}
              data-testid="button-soulmate-submit"
            >
              {mutation.isPending ? (
                <><Sparkles className="w-4 h-4 mr-2 animate-spin" /> 正在描绘灵魂伴侣...</>
              ) : (
                <><Heart className="w-4 h-4 mr-2" /> 生成灵魂伴侣画像</>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="border-t border-border pt-3">
          <p className="text-[10px] text-center text-muted-foreground">
            ⚠️ 免责声明：融合八字命理、星座学与心理学，仅供娱乐和自我探索参考。
          </p>
        </div>
      </div>
    </div>
  );
}
