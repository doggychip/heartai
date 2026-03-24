import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { PageContainer } from "@/components/PageContainer";
import { Loader2, Eye, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  FortuneCardContent,
  TarotCardContent,
  BaziCardContent,
  CompatCardContent,
} from "@/components/share-cards";

const TYPE_LABELS: Record<string, { title: string; emoji: string; cta: string; path: string }> = {
  fortune: { title: "今日运势", emoji: "✨", cta: "测测我的运势", path: "/fortune" },
  tarot: { title: "塔罗占卜", emoji: "🃏", cta: "来一次占卜", path: "/tarot" },
  bazi: { title: "八字命盘", emoji: "🀄", cta: "排我的命盘", path: "/bazi" },
  compatibility: { title: "缘分合盘", emoji: "💕", cta: "测测我的缘分", path: "/compatibility" },
};

export default function SharedResultPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["shared-result", id],
    queryFn: async () => {
      const res = await fetch(`/api/share/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <div className="text-center py-20 space-y-4">
          <p className="text-4xl">🦉</p>
          <h2 className="text-lg font-semibold">分享内容不存在</h2>
          <p className="text-sm text-muted-foreground">该链接可能已过期或不存在</p>
          <Link href="/">
            <Button variant="outline" size="sm">返回首页</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const typeInfo = TYPE_LABELS[data.resultType] || TYPE_LABELS.fortune;
  const resultData = data.resultData;

  return (
    <div className="flex-1 overflow-y-auto" data-testid="shared-result-page">
      <PageContainer>
        {/* Meta info */}
        <div className="text-center mb-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{data.nickname}</span> 的{typeInfo.title}
          </p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {data.viewCount} 次查看
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(data.createdAt).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </div>

        {/* Card preview */}
        <div className="flex justify-center mb-6">
          <div className="rounded-xl overflow-hidden shadow-xl">
            {data.resultType === "fortune" && (
              <FortuneCardContent
                fortune={resultData.fortune || resultData}
                nickname={resultData.nickname || data.nickname}
                zodiac={resultData.zodiac}
                element={resultData.element}
                lunarDate={resultData.lunarDate}
              />
            )}
            {data.resultType === "tarot" && <TarotCardContent data={resultData} />}
            {data.resultType === "bazi" && <BaziCardContent data={resultData} />}
            {data.resultType === "compatibility" && <CompatCardContent result={resultData} />}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-3 pb-8">
          <Link href={typeInfo.path}>
            <Button className="bg-gradient-to-r from-violet-500 to-pink-500 text-white border-0 hover:from-violet-600 hover:to-pink-600">
              <ExternalLink className="w-4 h-4 mr-1.5" />
              {typeInfo.cta}
            </Button>
          </Link>
          <p className="text-[10px] text-muted-foreground">观星 GuanXing · 观星问道，遇见更好的自己</p>
        </div>
      </PageContainer>
    </div>
  );
}
