import { useState } from "react";
import { Switch, Route, Router, Redirect, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import FortunePage from "@/pages/fortune";
import ZodiacPage from "@/pages/zodiac";
import MBTIPage from "@/pages/mbti";
import ChatPage from "@/pages/chat";
import AssessmentsPage from "@/pages/assessments";
import AssessmentTakePage from "@/pages/assessment-take";
import AssessmentResultPage from "@/pages/assessment-result";
import AssessmentHistoryPage from "@/pages/assessment-history";
import JournalPage from "@/pages/journal";
import CommunityPage from "@/pages/community";
import PostDetailPage from "@/pages/post-detail";
import SettingsPage from "@/pages/settings";
import AgentsPage from "@/pages/agents";
import AgentProfilePage from "@/pages/agent-profile";
import EmotionInsightsPage from "@/pages/emotion-insights";
import CulturePage from "@/pages/culture";
import BaziPage from "@/pages/bazi";
import TarotPage from "@/pages/tarot";
import FengshuiPage from "@/pages/fengshui";
import HoroscopePage from "@/pages/horoscope";
import WisdomPage from "@/pages/wisdom";
import CompatibilityPage from "@/pages/compatibility";
import SoulmatePage from "@/pages/soulmate";
import AlmanacPage from "@/pages/almanac";
import NameScorePage from "@/pages/name-score";
import AvatarPage from "@/pages/avatar";
import AvatarPlazaPage from "@/pages/avatar-plaza";
import DreamPage from "@/pages/dream";
import QiuqianPage from "@/pages/qiuqian";
import ZejiPage from "@/pages/zeji";
import ProfilePage from "@/pages/profile";
import NotificationsPage from "@/pages/notifications";
import AgentTeamPage from "@/pages/agent-team";
import DeveloperPage from "@/pages/developer";
import ClawHubPage from "@/pages/clawhub";
import InviteCompatPage from "@/pages/invite-compat";
import LifeCurvePage from "@/pages/life-curve";
import ActivitySummaryPage from "@/pages/activity-summary";
import EnneagramPage from "@/pages/enneagram";
import StarMansionPage from "@/pages/star-mansion";
import ZodiacDetailPage from "@/pages/zodiac-detail";
import NumerologyPage from "@/pages/numerology";
import ZiweiPage from "@/pages/ziwei";
import ChakraPage from "@/pages/chakra";
import HtpPage from "@/pages/htp";
import MayanPage from "@/pages/mayan";
import HumanDesignPage from "@/pages/human-design";
import ZhengyuPage from "@/pages/zhengyu";
import GroupChatPage from "@/pages/group-chat";
import LeaderboardPage from "@/pages/leaderboard";
import MatchingPage from "@/pages/matching";
import FriendsPage from "@/pages/friends";
import DmPage from "@/pages/dm";
import CommunityGuidelinesPage from "@/pages/community-guidelines";
import NotFound from "@/pages/not-found";

function AuthenticatedRoutes() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <AppShell>
      <Switch>
        <Route path="/" component={DashboardPage} />
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
        <Route path="/friends" component={FriendsPage} />
        <Route path="/dm/:friendId" component={DmPage} />
        <Route path="/community-guidelines" component={CommunityGuidelinesPage} />
        <Route path="/discover/zhengyu" component={ZhengyuPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

// Protected routes that require login — guests see a modal instead of silent redirect
const GUEST_PROTECTED_ROUTES = [
  "/zodiac", "/mbti", "/compatibility", "/life-curve",
  "/soulmate", "/share-card", "/invite-compat",
  "/fortune", "/chat", "/assessments", "/journal",
  "/settings", "/notifications", "/profile", "/agent-team",
  "/horoscope", "/emotion-insights", "/avatar", "/avatar-plaza",
  "/fengshui", "/wisdom", "/developer", "/clawhub", "/activity",
  "/group-chat", "/leaderboard", "/matching", "/friends", "/dm",
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

function GuestProtectedRedirect() {
  return <GuestAuthModal />;
}

function GuestRoutes() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/community" component={CommunityPage} />
        <Route path="/community/:id" component={PostDetailPage} />
        <Route path="/agents" component={AgentsPage} />
        <Route path="/agents/:id" component={AgentProfilePage} />
        <Route path="/culture" component={CulturePage} />
        <Route path="/almanac" component={AlmanacPage} />
        <Route path="/name-score" component={NameScorePage} />
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
        <Route path="/community-guidelines" component={CommunityGuidelinesPage} />
        {/* Protected routes show auth modal instead of silent redirect */}
        {GUEST_PROTECTED_ROUTES.map((path) => (
          <Route key={path} path={path} component={GuestProtectedRedirect} />
        ))}
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </AppShell>
  );
}

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
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
