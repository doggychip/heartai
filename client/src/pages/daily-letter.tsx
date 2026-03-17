import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { clientAvatarSvg } from "@/lib/avatar";
import { ArrowLeft, Settings } from "lucide-react";

interface LetterSection {
  icon: string;
  title: string;
  content: string;
}

interface DailyLetterData {
  id: string;
  date: string;
  greeting: string;
  sections: LetterSection[];
  signoff: string;
  generatedAt: string;
}

function LetterSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-amber-50/80 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        {/* Greeting skeleton */}
        <Skeleton className="h-6 w-32 mb-6" />
        {/* Sections skeleton */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="mb-6">
            <Skeleton className="h-5 w-40 mb-3" />
            <Skeleton className="h-4 w-full mb-1.5" />
            <Skeleton className="h-4 w-full mb-1.5" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
        {/* Signoff skeleton */}
        <Skeleton className="h-4 w-36 mt-8" />
      </div>
    </div>
  );
}

export default function DailyLetterPage() {
  const { user } = useAuth();

  const { data: letter, isLoading, error } = useQuery<DailyLetterData>({
    queryKey: ["/api/daily-letter"],
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 min
    retry: 1,
  });

  const userName = user?.nickname || user?.username || "用户";
  const avatarSrc = clientAvatarSvg("观星分身", "水");

  if (isLoading) {
    return <LetterSkeleton />;
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-amber-50/80 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-6">
            <Link href="/">
              <ArrowLeft className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </Link>
            <h1 className="text-lg font-semibold">观星日报</h1>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
              <span className="text-3xl">🌌</span>
              <p className="text-sm text-muted-foreground">日报生成遇到了一些问题，请稍后再试</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                重新加载
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!letter) return null;

  const noBirthData = !user?.birthDate;

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-amber-50/80 via-orange-50/30 to-stone-50/50 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-stone-950/20">
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Back button */}
        <div className="flex items-center gap-2 mb-5">
          <Link href="/">
            <ArrowLeft className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
          </Link>
          <h1 className="text-lg font-semibold">观星日报</h1>
          <span className="text-xs text-muted-foreground ml-auto">{letter.date}</span>
        </div>

        {/* Letter card */}
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white/80 dark:bg-card/90 backdrop-blur-sm">
          <CardContent className="p-5">

            {/* Avatar header */}
            <div className="flex items-center gap-3 mb-5">
              <img
                src={avatarSrc}
                alt="观星分身"
                className="w-11 h-11 rounded-full shadow-md ring-2 ring-amber-200/50 dark:ring-amber-800/30"
              />
              <div>
                <p className="text-sm font-semibold text-foreground/90">观星分身</p>
                <p className="text-[11px] text-muted-foreground">你的星空守望者 · 今晨观测报告</p>
              </div>
            </div>

            {/* Greeting */}
            <p className="text-base font-medium text-foreground/85 mb-5 animate-in fade-in duration-500">
              {letter.greeting}
            </p>

            {/* Sections */}
            {letter.sections.map((section: LetterSection, idx: number) => (
              <div
                key={idx}
                className="mb-5 last:mb-0 animate-in fade-in slide-in-from-bottom-2 duration-500"
                style={{ animationDelay: `${(idx + 1) * 150}ms`, animationFillMode: 'both' }}
              >
                {/* Section header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{section.icon}</span>
                  <h3 className="text-sm font-semibold text-foreground/80">{section.title}</h3>
                </div>
                {/* Section content */}
                <p className="text-[13px] leading-relaxed text-foreground/65 pl-7">
                  {section.content}
                </p>
                {/* Divider (except last) */}
                {idx < letter.sections.length - 1 && (
                  <div className="mt-4 border-t border-amber-200/30 dark:border-amber-800/20" />
                )}
              </div>
            ))}

            {/* Signoff */}
            <div
              className="mt-6 pt-4 border-t border-amber-200/40 dark:border-amber-800/20 animate-in fade-in duration-700"
              style={{ animationDelay: '750ms', animationFillMode: 'both' }}
            >
              <p className="text-[13px] text-foreground/50 whitespace-pre-line text-right italic">
                {letter.signoff}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* No birth data prompt */}
        {noBirthData && (
          <Card
            className="mt-4 border-0 shadow-sm rounded-xl bg-amber-50/60 dark:bg-amber-950/20 animate-in fade-in duration-500"
            style={{ animationDelay: '900ms', animationFillMode: 'both' }}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Settings className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground/70">补充出生日期，解锁个性化命理日报</p>
              </div>
              <Link href="/settings">
                <Button variant="outline" size="sm" className="text-xs h-7 px-2.5">
                  去设置
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Bottom spacer */}
        <div className="h-6" />
      </div>
    </div>
  );
}
