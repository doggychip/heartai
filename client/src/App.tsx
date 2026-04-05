import { lazy, Suspense } from "react";
import { Switch, Route, Router, Redirect, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import PageLoading from "@/components/PageLoading";
import AppShell from "@/components/AppShell";

// ─── Eager-loaded (critical path) ────────────────────────────
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";

// ─── Lazy-loaded pages ───────────────────────────────────────
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const GuestDashboard = lazy(() => import("@/pages/guest-dashboard"));
const FortunePage = lazy(() => import("@/pages/fortune"));
const ZodiacPage = lazy(() => import("@/pages/zodiac"));
const MBTIPage = lazy(() => import("@/pages/mbti"));
const ChatPage = lazy(() => import("@/pages/chat"));
const AssessmentsPage = lazy(() => import("@/pages/assessments"));
const AssessmentTakePage = lazy(() => import("@/pages/assessment-take"));
const AssessmentResultPage = lazy(() => import("@/pages/assessment-result"));
const AssessmentHistoryPage = lazy(() => import("@/pages/assessment-history"));
const JournalPage = lazy(() => import("@/pages/journal"));
const CommunityPage = lazy(() => import("@/pages/community"));
const PostDetailPage = lazy(() => import("@/pages/post-detail"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const AgentsPage = lazy(() => import("@/pages/agents"));
const AgentProfilePage = lazy(() => import("@/pages/agent-profile"));
const EmotionInsightsPage = lazy(() => import("@/pages/emotion-insights"));
const CulturePage = lazy(() => import("@/pages/culture"));
const BaziPage = lazy(() => import("@/pages/bazi"));
const TarotPage = lazy(() => import("@/pages/tarot"));
const FengshuiPage = lazy(() => import("@/pages/fengshui"));
const HoroscopePage = lazy(() => import("@/pages/horoscope"));
const WisdomPage = lazy(() => import("@/pages/wisdom"));
const CompatibilityPage = lazy(() => import("@/pages/compatibility"));
const SoulmatePage = lazy(() => import("@/pages/soulmate"));
const AlmanacPage = lazy(() => import("@/pages/almanac"));
const NameScorePage = lazy(() => import("@/pages/name-score"));
const AvatarPage = lazy(() => import("@/pages/avatar"));
const AvatarPlazaPage = lazy(() => import("@/pages/avatar-plaza"));
const DreamPage = lazy(() => import("@/pages/dream"));
const QiuqianPage = lazy(() => import("@/pages/qiuqian"));
const ZejiPage = lazy(() => import("@/pages/zeji"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const AgentTeamPage = lazy(() => import("@/pages/agent-team"));
const DeveloperPage = lazy(() => import("@/pages/developer"));
const ClawHubPage = lazy(() => import("@/pages/clawhub"));
const InviteCompatPage = lazy(() => import("@/pages/invite-compat"));
const LifeCurvePage = lazy(() => import("@/pages/life-curve"));
const ActivitySummaryPage = lazy(() => import("@/pages/activity-summary"));
const EnneagramPage = lazy(() => import("@/pages/enneagram"));
const StarMansionPage = lazy(() => import("@/pages/star-mansion"));
const ZodiacDetailPage = lazy(() => import("@/pages/zodiac-detail"));
const NumerologyPage = lazy(() => import("@/pages/numerology"));
const ZiweiPage = lazy(() => import("@/pages/ziwei"));
const ChakraPage = lazy(() => import("@/pages/chakra"));
const HtpPage = lazy(() => import("@/pages/htp"));
const MayanPage = lazy(() => import("@/pages/mayan"));
const HumanDesignPage = lazy(() => import("@/pages/human-design"));
const ZhengyuPage = lazy(() => import("@/pages/zhengyu"));
const SoulMatchPage = lazy(() => import("@/pages/soul-match"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const GroupChatPage = lazy(() => import("@/pages/group-chat"));
const LeaderboardPage = lazy(() => import("@/pages/leaderboard"));
const MatchingPage = lazy(() => import("@/pages/matching"));
const FriendsPage = lazy(() => import("@/pages/friends"));
const DmPage = lazy(() => import("@/pages/dm"));
const CommunityGuidelinesPage = lazy(() => import("@/pages/community-guidelines"));
const CryptoFortunePage = lazy(() => import("@/pages/crypto-fortune"));
const DailyLetterPage = lazy(() => import("@/pages/daily-letter"));
const MoodCheckinPage = lazy(() => import("@/pages/mood-checkin"));
const SharedResultPage = lazy(() => import("@/pages/shared-result"));
const PremiumPage = lazy(() => import("@/pages/premium"));
const ShopPage = lazy(() => import("@/pages/shop"));
const AiPortraitPage = lazy(() => import("@/pages/ai-portrait"));
const ReferralPage = lazy(() => import("@/pages/referral"));
const FeatureGate = lazy(() => import("@/components/FeatureGate"));

// Feature descriptions for gate interstitials
const GATED_FEATURE_INFO: Record<string, { name: string; desc: string }> = {
  "/chat": { name: "AI对话", desc: "与观星AI深度对话，获取个性化的情感支持和命理解读。" },
  "/fortune": { name: "今日运势", desc: "基于你的八字命盘，生成每日专属运势分析和建议。" },
  "/bazi": { name: "八字排盘", desc: "完整的八字命理分析，解读你的先天命格和运势走向。" },
  "/tarot": { name: "塔罗占卜", desc: "AI塔罗牌占卜，为你的问题提供直觉洞察和指引。" },
  "/fengshui": { name: "风水评估", desc: "智能风水分析，优化你的居住和工作环境。" },
  "/compatibility": { name: "缘分合盘", desc: "双人八字合盘分析，深入了解感情契合度。" },
  "/soulmate": { name: "正缘画像", desc: "基于命理推算你的正缘特征，描绘理想伴侣画像。" },
  "/life-curve": { name: "人生运势曲线", desc: "纵览一生运势起伏，把握关键转折时机。" },
  "/zodiac": { name: "星座解读", desc: "深度星座性格分析和星盘解读。" },
  "/mbti": { name: "MBTI人格", desc: "MBTI人格测试与深度解读。" },
  "/journal": { name: "情绪日记", desc: "记录每日情绪，AI帮你分析情感变化趋势。" },
  "/assessments": { name: "心理测评", desc: "专业心理量表测评，深入了解自己。" },
  "/avatar": { name: "AI分身", desc: "创建你的AI分身，让它在社区中代替你互动。" },
  "/settings": { name: "设置", desc: "管理你的账户和个性化设置。" },
  "/daily-letter": { name: "观星日报", desc: "AI分身每日为你生成个性化命理日报，星象解读与生活指引。" },
  "/mood": { name: "情绪签到", desc: "每日情绪签到，获得命理AI的温暖回应和五行洞察。" },
  "/soul-match": { name: "灵魂匹配", desc: "25道深度人格问题，9维Big Five+Jungian分析，发现你的灵魂共振者。" },
};

function AuthenticatedRoutes() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <AppShell>
      <Suspense fallback={<PageLoading />}>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/fortune" component={FortunePage} />
          <Route path="/zodiac" component={ZodiacPage} />
          <Route path="/mbti" component={MBTIPage} />
          <Route path="/chat" component={ChatPage} />
          <Route path="/assessments" component={AssessmentsPage} />
          <Route path="/assessments/:slug" component={AssessmentTakePage} />
          <Route path="/assessment-results/:id" component={AssessmentResultPage} />
          <Route path="/assessment-history" component={AssessmentHistoryPage} />
          <Route path="/journal" component={JournalPage} />
          <Route path="/community" component={CommunityPage} />
          <Route path="/community/:id" component={PostDetailPage} />
          <Route path="/emotion-insights" component={EmotionInsightsPage} />
          <Route path="/culture" component={CulturePage} />
          <Route path="/bazi" component={BaziPage} />
          <Route path="/tarot" component={TarotPage} />
          <Route path="/fengshui" component={FengshuiPage} />
          <Route path="/horoscope" component={HoroscopePage} />
          <Route path="/wisdom" component={WisdomPage} />
          <Route path="/compatibility" component={CompatibilityPage} />
          <Route path="/soulmate" component={SoulmatePage} />
          <Route path="/almanac" component={AlmanacPage} />
          <Route path="/name-score" component={NameScorePage} />
          <Route path="/avatar" component={AvatarPage} />
          <Route path="/avatar-plaza" component={AvatarPlazaPage} />
          <Route path="/dream" component={DreamPage} />
          <Route path="/qiuqian" component={QiuqianPage} />
          <Route path="/zeji" component={ZejiPage} />
          <Route path="/profile/:id" component={ProfilePage} />
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/agents" component={AgentsPage} />
          <Route path="/agents/:id" component={AgentProfilePage} />
          <Route path="/agent-team" component={AgentTeamPage} />
          <Route path="/developer" component={DeveloperPage} />
          <Route path="/clawhub" component={ClawHubPage} />
          <Route path="/life-curve" component={LifeCurvePage} />
          <Route path="/activity" component={ActivitySummaryPage} />
          <Route path="/share/:id" component={SharedResultPage} />
          <Route path="/invite/compat/:userId" component={InviteCompatPage} />
          <Route path="/discover/enneagram" component={EnneagramPage} />
          <Route path="/discover/star-mansion" component={StarMansionPage} />
          <Route path="/discover/zodiac" component={ZodiacDetailPage} />
          <Route path="/discover/numerology" component={NumerologyPage} />
          <Route path="/discover/ziwei" component={ZiweiPage} />
          <Route path="/discover/chakra" component={ChakraPage} />
          <Route path="/discover/htp" component={HtpPage} />
          <Route path="/discover/mayan" component={MayanPage} />
          <Route path="/discover/human-design" component={HumanDesignPage} />
          <Route path="/group-chat" component={GroupChatPage} />
          <Route path="/leaderboard" component={LeaderboardPage} />
          <Route path="/matching" component={MatchingPage} />
          <Route path="/soul-match" component={SoulMatchPage} />
          <Route path="/friends" component={FriendsPage} />
          <Route path="/dm/:friendId" component={DmPage} />
          <Route path="/community-guidelines" component={CommunityGuidelinesPage} />
          <Route path="/discover/zhengyu" component={ZhengyuPage} />
          <Route path="/crypto" component={CryptoFortunePage} />
          <Route path="/daily-letter" component={DailyLetterPage} />
          <Route path="/mood" component={MoodCheckinPage} />
          <Route path="/premium" component={PremiumPage} />
          <Route path="/shop" component={ShopPage} />
          <Route path="/ai-portrait" component={AiPortraitPage} />
          <Route path="/referral" component={ReferralPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AppShell>
  );
}

// Protected routes that require login — guests see a modal instead of silent redirect
const GUEST_PROTECTED_ROUTES = [
  "/zodiac", "/mbti", "/compatibility", "/life-curve",
  "/soulmate", "/share-card", "/invite-compat",
  "/fortune", "/assessments", "/journal",
  "/settings", "/notifications", "/profile", "/agent-team",
  "/horoscope", "/emotion-insights", "/avatar", "/avatar-plaza",
  "/fengshui", "/wisdom", "/developer", "/clawhub", "/activity",
  "/group-chat", "/leaderboard", "/matching", "/friends", "/dm",
  "/daily-letter", "/mood", "/soul-match",
];

function GuestAuthModal() {
  const { logout } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-xl max-w-sm mx-4 p-6 space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-lg font-bold">该功能需要登录才能使用</h2>
        <p className="text-sm text-muted-foreground">登录后即可解锁全部功能，体验更完整的观星之旅</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-border hover:bg-accent transition-colors"
          >
            返回首页
          </button>
          <button
            onClick={() => { logout(); navigate("/auth"); }}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            去登录
          </button>
        </div>
      </div>
    </div>
  );
}

function GuestFeatureGate({ path }: { path: string }) {
  const info = GATED_FEATURE_INFO[path] || { name: "此功能", desc: "注册后即可使用全部功能。" };
  return (
    <Suspense fallback={<PageLoading />}>
      <FeatureGate featureName={info.name} featureDescription={info.desc} />
    </Suspense>
  );
}

function GuestRoutes() {
  return (
    <AppShell>
      <Suspense fallback={<PageLoading />}>
        <Switch>
          <Route path="/" component={GuestDashboard} />
          <Route path="/community" component={CommunityPage} />
          <Route path="/chat" component={ChatPage} />
          <Route path="/community/:id" component={PostDetailPage} />
          <Route path="/agents" component={AgentsPage} />
          <Route path="/agents/:id" component={AgentProfilePage} />
          <Route path="/culture" component={CulturePage} />
          <Route path="/almanac" component={AlmanacPage} />
          <Route path="/name-score" component={NameScorePage} />
          <Route path="/horoscope" component={HoroscopePage} />
          <Route path="/bazi" component={BaziPage} />
          <Route path="/tarot" component={TarotPage} />
          <Route path="/qiuqian" component={QiuqianPage} />
          <Route path="/zeji" component={ZejiPage} />
          <Route path="/dream" component={DreamPage} />
          <Route path="/invite/compat/:userId" component={InviteCompatPage} />
          <Route path="/discover/enneagram" component={EnneagramPage} />
          <Route path="/discover/star-mansion" component={StarMansionPage} />
          <Route path="/discover/zodiac" component={ZodiacDetailPage} />
          <Route path="/discover/numerology" component={NumerologyPage} />
          <Route path="/discover/ziwei" component={ZiweiPage} />
          <Route path="/discover/chakra" component={ChakraPage} />
          <Route path="/discover/htp" component={HtpPage} />
          <Route path="/discover/mayan" component={MayanPage} />
          <Route path="/discover/human-design" component={HumanDesignPage} />
          <Route path="/discover/zhengyu" component={ZhengyuPage} />
          <Route path="/crypto" component={CryptoFortunePage} />
          <Route path="/community-guidelines" component={CommunityGuidelinesPage} />
          {/* Gated routes show feature gate interstitial instead of auth modal */}
          {GUEST_PROTECTED_ROUTES.map((path) => (
            <Route key={path} path={path}>
              {() => <GuestFeatureGate path={path} />}
            </Route>
          ))}
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </Suspense>
      <GuestBanner />
    </AppShell>
  );
}

// Lazy-load GuestBanner since it's only needed for guest sessions
import GuestBanner from "@/components/GuestBanner";

function AppRouter() {
  const { user, isGuest } = useAuth();

  return (
    <Switch>
      <Route path="/auth">
        {user ? <Redirect to="/" /> : isGuest ? <Redirect to="/" /> : <AuthPage />}
      </Route>
      <Route>
        {isGuest ? <GuestRoutes /> : <AuthenticatedRoutes />}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <ErrorBoundary>
            <Router hook={useHashLocation}>
              <AppRouter />
            </Router>
          </ErrorBoundary>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
