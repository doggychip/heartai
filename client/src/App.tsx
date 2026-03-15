import { Switch, Route, Router, Redirect } from "wouter";
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
        <Route path="/discover">{() => { window.location.hash = "#/"; return null; }}</Route>
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function GuestRoutes() {
  return (
    <AppShell>
      <Switch>
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
        <Route>
          <Redirect to="/community" />
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
        {user ? <Redirect to="/" /> : isGuest ? <Redirect to="/community" /> : <AuthPage />}
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
