import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

interface Guideline {
  icon: string;
  title: string;
  description: string;
}

export default function CommunityGuidelinesPage() {
  const { data } = useQuery<{ guidelines: Guideline[] }>({
    queryKey: ["/api/community/guidelines"],
  });

  const guidelines = data?.guidelines || [
    { icon: '💝', title: '真诚分享', description: '分享真实感受和经历，用心交流' },
    { icon: '🤝', title: '友好互动', description: '尊重每位社区成员，以善意对待他人' },
    { icon: '✨', title: '正向引导', description: '传递积极正面的能量，互相鼓励' },
    { icon: '🎭', title: '娱乐为主', description: '命理仅供参考，不替代专业建议' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 dark:from-emerald-700 dark:via-teal-700 dark:to-cyan-700 px-4 pt-6 pb-14">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-white" />
          <h1 className="text-lg font-bold text-white">社区公约</h1>
        </div>
        <p className="text-white/70 text-xs">温暖友善，共同成长</p>
      </div>

      <div className="relative -mt-8 px-4 pb-6 space-y-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              欢迎来到观星社区！这里是一个温暖的命理交流空间。为了让每个人都能愉快地交流，我们共同遵守以下公约：
            </p>

            <div className="space-y-4">
              {guidelines.map((g, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-lg flex-shrink-0">
                    {g.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{g.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                违反社区公约的内容可能会收到温馨提示。如果你发现不当内容，可以举报让我们一起维护社区氛围。
                感谢你的理解和支持！
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
