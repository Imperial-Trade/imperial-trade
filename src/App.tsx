import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { XeonStreamOptInModal } from "@/components/xeon-stream/XeonStreamOptInModal";
import { WelcomeProvider } from "@/contexts/WelcomeContext";
import { SignalRealtimeProvider } from "@/contexts/SignalRealtimeContext";
import { WebSocketPriceProvider } from "@/contexts/WebSocketPriceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AutoRecoveryProvider } from "@/contexts/AutoRecoveryContext";
import { NavigationGuard } from "@/components/routing/NavigationGuard";
import { RouteErrorBoundary } from "@/components/error-boundary/RouteErrorBoundary";
import Forum from "@/pages/dashboard/forum/Forum";
import { RouteRedirectHandler } from "@/components/routing/RouteRedirectHandler";

// Layout Components
import LandingLayout from "@/pages/layouts/LandingLayout";
import Layout from "@/components/Layout";

// Landing Pages
import Landing from "@/pages/landing-page/landing/Landing";
import About from "@/pages/landing-page/about/About";
import Features from "@/pages/landing-page/features/Features";
import IBPartnership from "@/pages/landing-page/ib-partnership/IBPartnership";
import AdvancedToolsPage from "@/pages/landing-page/advanced-tools/AdvancedToolsPage";
import SignalsPage from "@/pages/landing-page/signals/SignalsPage";
import EducationPage from "@/pages/landing-page/education/EducationPage";
import LiveSessionsPage from "@/pages/landing-page/live-sessions/LiveSessionsPage";
import CommunityForumPage from "@/pages/landing-page/community-forum/CommunityForumPage";
import IBPartnershipPage from "@/pages/landing-page/ib-partnership-page/IBPartnershipPage";
import ImperialPartnership from "@/pages/landing-page/imperial-partnership/ImperialPartnership";
import Signin from "@/pages/landing-page/signin/Signin";
import ResetPasswordPage from "@/pages/reset-password/ResetPasswordPage";
import DisclaimersPage from "@/pages/legal/DisclaimersPage";
import PrivacyPolicyPage from "@/pages/legal/PrivacyPolicyPage";
import TermsOfUsePage from "@/pages/legal/TermsOfUsePage";
import AccountRequest from "@/pages/landing-page/account-request/AccountRequest";
import AccountRequestStatus from "@/pages/landing-page/account-request-status/AccountRequestStatus";

// Dashboard Pages
import Home from "@/pages/dashboard/home/Home";
import Live from "@/pages/dashboard/live/Live";
import SignalStream from "@/pages/dashboard/signal-stream/SignalStream";
import NewSignalPage from "@/pages/dashboard/new-signal/NewSignalPage";
import Education from "@/pages/dashboard/education/Education";
import AdvancedTools from "@/pages/dashboard/advanced-tools/AdvancedTools";
import MyProgress from "@/pages/dashboard/my-progress/MyProgress";
import Progress from "@/pages/dashboard/progress/Progress";
import Administration from "@/pages/dashboard/administration/Administration";
import Settings from "@/pages/dashboard/settings/Settings";
import AdminPanel from "@/pages/dashboard/admin-panel/AdminPanel";
import AthenaTest from "@/pages/dashboard/athena/AthenaTest";
import DevTests from "@/pages/dashboard/dev-tests/DevTests";
import { PriceStreamingDashboard } from "@/components/admin/PriceStreamingDashboard";

// Educator Pages
import EducatorSignalManagement from "@/pages/dashboard/educator/EducatorSignalManagement";

// Other Components
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import AccessDenied from "@/components/AccessDenied";
import NotFound from "@/pages/NotFound";
import PostHogPageViewTracker from "./posthog/PostHogPageViewTracker";

import { setupNotificationClickHandler } from "@/utils/notificationHandlers";
import NotificationSystem from "@/components/notifications/NotificationSystem";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";
import NotificationSetupManager from "@/components/notifications/NotificationSetupManager";
import InAppNotificationSystem from "@/components/notifications/InAppNotificationSystem";
import OneSignalInitializer from "@/components/integrations/OneSignalInitializer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  // Setup notification click handler on app initialization
  React.useEffect(() => {
    setupNotificationClickHandler();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
            <BrowserRouter>
              <PostHogPageViewTracker />
              <ScrollToTop />
                <AuthProvider>
                  <OneSignalInitializer>
                    <NotificationsProvider>
                      <AutoRecoveryProvider>
                         <WelcomeProvider>
                           <NavigationGuard>
                             <SignalRealtimeProvider>
                               <WebSocketPriceProvider>
                                  <NotificationSystem />
                                  <NotificationsPanel />
                                  <NotificationSetupManager />
                                  <InAppNotificationSystem />
                           <Routes>
                           {/* Landing Routes */}
                           <Route
                             path="/"
                             element={<LandingLayout />}
                             errorElement={<RouteErrorBoundary />}
                           >
                             <Route index element={<Landing />} />
                             <Route path="about" element={<About />} />
                             <Route path="features" element={<Features />} />
                             <Route
                               path="advanced-tools"
                               element={<AdvancedToolsPage />}
                             />
                             <Route path="signals" element={<SignalsPage />} />
                             <Route path="education" element={<EducationPage />} />
                             <Route
                               path="live-sessions"
                               element={<LiveSessionsPage />}
                             />
                             <Route
                               path="community-forum"
                               element={<CommunityForumPage />}
                             />
  <Route
                               path="ib-partnership"
                               element={<ImperialPartnership />}
                             />
                             <Route
                               path="ib-partnership-new"
                               element={<ImperialPartnership />}
                             />
                             <Route
                               path="imperial-partnership"
                               element={<ImperialPartnership />}
                             />
                              <Route path="signin" element={<Signin />} />
                              <Route path="reset-password" element={<ResetPasswordPage />} />
                              <Route path="legal/disclaimers" element={<DisclaimersPage />} />
                              <Route path="legal/privacy" element={<PrivacyPolicyPage />} />
                              <Route path="legal/terms" element={<TermsOfUsePage />} />
                              <Route
                                path="account-request"
                                element={<AccountRequest />}
                              />
                              <Route
                                path="account-request-status"
                                element={<AccountRequestStatus />}
                              />
                           </Route>

                           {/* Dashboard Routes */}
                           <Route
                             path="/dashboard"
                             element={
                               <ProtectedRoute>
                                 <Layout>
                                   <div></div>
                                 </Layout>
                               </ProtectedRoute>
                             }
                             errorElement={<RouteErrorBoundary />}
                           >
                             <Route
                               index
                               element={<Navigate to="/dashboard/home" replace />}
                             />
                             <Route path="home" element={<Home />} />
                             <Route path="live" element={<Live />} />
                             <Route
                               path="signal-stream"
                               element={<SignalStream />}
                             />
                             <Route
                               path="new-signal"
                               element={<NewSignalPage />}
                             />
                             <Route
                               path="education"
                               element={
                                 <RouteRedirectHandler route="education">
                                   <Education />
                                 </RouteRedirectHandler>
                               }
                             />
                             <Route
                               path="forum"
                               element={
                                 <RouteRedirectHandler route="forum">
                                   <Forum />
                                 </RouteRedirectHandler>
                               }
                             />
                             <Route
                               path="advanced-tools"
                               element={<AdvancedTools />}
                             />
                             <Route path="my-progress" element={<MyProgress />} />
                             <Route path="progress" element={<Progress />} />
                             <Route path="settings" element={<Settings />} />
                             <Route path="athena" element={<AthenaTest />} />
                             <Route path="dev-tests" element={<DevTests />} />

                             <Route
                               path="administration"
                               element={
                                 <ProtectedRoute requiredAccessLevel="admin">
                                   <Administration />
                                 </ProtectedRoute>
                               }
                             />

                             <Route
                               path="admin"
                               element={
                                 <ProtectedRoute requiredAccessLevel="admin">
                                   <AdminPanel />
                                 </ProtectedRoute>
                               }
                             />

                             <Route
                               path="admin/price-streaming"
                               element={
                                 <ProtectedRoute requiredAccessLevel="admin">
                                   <PriceStreamingDashboard />
                                 </ProtectedRoute>
                               }
                             />

                             <Route path="educator">
                               <Route
                                 path="signals"
                                 element={
                                   <ProtectedRoute
                                     requiredUserType={["educator", "ib_partner"]}
                                   >
                                     <EducatorSignalManagement />
                                   </ProtectedRoute>
                                 }
                               />
                               <Route
                                 path="analytics"
                                 element={
                                   <ProtectedRoute
                                     requiredUserType={["educator", "ib_partner"]}
                                   >
                                     <div className="p-6">
                                       <h1 className="text-2xl font-bold">
                                         Performance Analytics
                                       </h1>
                                       <p className="text-secondary">
                                         Coming soon...
                                       </p>
                                     </div>
                                   </ProtectedRoute>
                                 }
                               />
                               <Route
                                 path="followers"
                                 element={
                                   <ProtectedRoute
                                     requiredUserType={["educator", "ib_partner"]}
                                   >
                                     <div className="p-6">
                                       <h1 className="text-2xl font-bold">
                                         Followers & Engagement
                                       </h1>
                                       <p className="text-secondary">
                                         Coming soon...
                                       </p>
                                     </div>
                                   </ProtectedRoute>
                                 }
                               />
                               <Route
                                 path="ib-dashboard"
                                 element={
                                   <ProtectedRoute
                                     requiredUserType={["ib_partner"]}
                                   >
                                     <div className="p-6">
                                       <h1 className="text-2xl font-bold">
                                         IB Partner Dashboard
                                       </h1>
                                       <p className="text-secondary">
                                         Coming soon...
                                       </p>
                                     </div>
                                   </ProtectedRoute>
                                 }
                               />
                             </Route>
                           </Route>

                           {/* Error Routes */}
                           <Route
                             path="/access-denied"
                             element={<AccessDenied />}
                           />
                           <Route path="*" element={<NotFound />} />
                           </Routes>
                               </WebSocketPriceProvider>
                             </SignalRealtimeProvider>
                           </NavigationGuard>
                        </WelcomeProvider>
                      </AutoRecoveryProvider>
                    </NotificationsProvider>
                  </OneSignalInitializer>
                </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
