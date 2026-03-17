import { Card } from "@/components/ui/card";
import { ChevronRight, Home, Hexagon, CircleDot, Grid3X3 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useDiscoverOverlay } from "@/components/AppShell";

interface FeaturedCard {
  name: string;
  description: string;
  icon: any;
  path: string;
  gradient: string;
  iconBg: string;
}

const FEATURED: FeaturedCard[] = [
  {
    name: "风水评估",
    description: "AI 驱动的空间风水分析，优化你的生活与工作环境",
    icon: Home,
    path: "/fengshui",
    gradient: "from-emerald-500/30 via-teal-500/20 to-cyan-500/10",
    iconBg: "bg-emerald-500/20 text-emerald-400",
  },
  {
    name: "九型人格",
    description: "36 题深度测评，发现你的核心人格类型与成长方向",
    icon: Hexagon,
    path: "/discover/enneagram",
    gradient: "from-violet-500/30 via-purple-500/20 to-fuchsia-500/10",
    iconBg: "bg-violet-500/20 text-violet-400",
  },
  {
    name: "二十八星宿",
    description: "探索你的本命星宿，揭示古老星象中的命格密码",
    icon: CircleDot,
    path: "/discover/star-mansion",
    gradient: "from-amber-500/30 via-orange-500/20 to-yellow-500/10",
    iconBg: "bg-amber-500/20 text-amber-400",
  },
];

export default function DiscoverPage() {
  const [, navigate] = useLocation();
  const { openDiscover } = useDiscoverOverlay();

  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-xl font-bold">发现</h1>
        <p className="text-sm text-muted-foreground mt-1">
          探索精选功能，开启你的命理之旅
        </p>
      </div>

      {/* Featured cards */}
      <div className="space-y-4">
        {FEATURED.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.path}
              className={`relative overflow-hidden bg-gradient-to-br ${item.gradient} border-0 p-5 cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]`}
              onClick={() => navigate(item.path)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Discover More button */}
      <div
        className="flex items-center justify-center gap-3 py-4 px-5 rounded-2xl border border-border/50 bg-card/50 cursor-pointer hover:bg-accent/30 transition-colors active:scale-[0.98]"
        onClick={openDiscover}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Grid3X3 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <span className="font-semibold text-sm">发现更多</span>
          <p className="text-xs text-muted-foreground">浏览全部功能与测试</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </div>
  );
}
