import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import AuthPage from "@/pages/auth";
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
import NotFound from "@/pages/not-found";

function AuthenticatedRoutes() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <AppShell>
      <Switch>
        <Route path="/" component={ChatPage} />
        <Route path="/assessments" component={AssessmentsPage} />
        <Route path="/assessments/:slug" component={AssessmentTakePage} />
        <Route path="/assessment-results/:id" component={AssessmentResultPage} />
        <Route path="/assessment-history" component={AssessmentHistoryPage} />
        <Route path="/journal" component={JournalPage} />
        <Route path="/community" component={CommunityPage} />
        <Route path="/community/:id" component={PostDetailPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/agents" component={AgentsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function AppRouter() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/auth">
        {user ? <Redirect to="/" /> : <AuthPage />}
      </Route>
      <Route>
        <AuthenticatedRoutes />
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
