import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface TestCard {
  name: string;
  description: string;
  emoji: string;
  path: string;
  gradient: string;
}

const TESTS: TestCard[] = [
  {
    name: "九型人格",
    description: "36题发现你的人格类型",
    emoji: "🔮",
    path: "/discover/enneagram",
    gradient: "from-violet-500/20 to-purple-500/20",
  },
  {
    name: "二十八星宿",
    description: "探索你的本命星宿",
    emoji: "⭐",
    path: "/discover/star-mansion",
    gradient: "from-indigo-500/20 to-blue-500/20",
  },
  {
    name: "生肖详解",
    description: "深入解读你的生肖命格",
    emoji: "🐲",
    path: "/discover/zodiac",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    name: "灵数分析",
    description: "揭示你的生命数字密码",
    emoji: "🔢",
    path: "/discover/numerology",
    gradient: "from-cyan-500/20 to-teal-500/20",
  },
  {
    name: "紫微斗数",
    description: "最精密的命盘推算系统",
    emoji: "🌟",
    path: "/discover/ziwei",
    gradient: "from-rose-500/20 to-pink-500/20",
  },
];

export default function DiscoverPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-lg font-bold">玄学探索</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        通过古老智慧与 AI 分析，探索你的命格密码
      </p>

      <div className="grid grid-cols-1 gap-3">
        {TESTS.map((test) => (
          <Card
            key={test.path}
            className={`bg-gradient-to-br ${test.gradient} border-0 p-4 cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]`}
            onClick={() => navigate(test.path)}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-background/30 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">{test.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{test.name}</h3>
                <p className="text-sm text-muted-foreground">{test.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
