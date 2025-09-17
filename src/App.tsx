import React from 'react';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WelcomeProvider } from "@/contexts/WelcomeContext";
import { NotificationPromptProvider } from "@/contexts/NotificationPromptContext";
import { SignalRealtimeProvider } from "@/contexts/SignalRealtimeContext";
import { SharedRealtimeProvider } from "@/contexts/SharedRealtimeContext";
import { OptimizedWebSocketPriceProvider } from "@/contexts/OptimizedWebSocketPriceContext";
import { GlobalPreviewControlProvider } from "@/contexts/GlobalPreviewControlContext";
import { RealtimeHealthProvider } from "@/contexts/RealtimeHealthMonitor";
import { RealtimeConnectionManagerProvider } from "@/contexts/RealtimeConnectionManager";
import { TelemetryProvider } from "@/contexts/TelemetryContext";
import { RealtimeShutdownGuard } from "@/components/RealtimeShutdownGuard";
import { VersionChecker } from "@/components/VersionChecker";
import { CacheCleanerMount } from "@/hooks/useCacheCleaner";
import { SafeThemeProvider as ThemeProvider } from "@/contexts/SafeThemeProvider";
import { NavigationGuard } from "@/components/routing/NavigationGuard";
import { RouteErrorBoundary } from "@/components/error-boundary/RouteErrorBoundary";
import { ContextErrorBoundary } from "@/components/error-boundary/ContextErrorBoundary";
import { WebSocketErrorBoundary } from "@/components/error-boundary/WebSocketErrorBoundary";
import { AuthenticatedRedirect } from "@/components/routing/AuthenticatedRedirect";
import { GlobalWelcomeOverlay } from "@/components/ui/GlobalWelcomeOverlay";
import { initializeAppState } from "@/utils/appStateCleanup";
import { isDevToolsEnabled } from "@/utils/featureFlags";
import { verifyServiceWorkerSafety } from "@/utils/serviceWorkerVerification";

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
import TermsPage from "@/pages/legal/TermsPage";
import PrivacyPage from "@/pages/legal/PrivacyPage";
import AccountRequest from "@/pages/landing-page/account-request/AccountRequest";
import AccountRequestStatus from "@/pages/landing-page/account-request-status/AccountRequestStatus";

// Dashboard Pages
import Home from "@/pages/dashboard/home/Home";
import Live from "@/pages/dashboard/live/Live";
import SignalStreamOptimized from "@/components/dashboard/SignalStreamOptimized";
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
import PriceTestingPage from "@/pages/dashboard/dev-tests/PriceTestingPage";

// Educator Pages
import EducatorSignalManagement from "@/pages/dashboard/educator/EducatorSignalManagement";

// Other Components
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import AccessDenied from "@/components/AccessDenied";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  // Check for password reset flow BEFORE any providers load
  const isPasswordResetFlow = React.useMemo(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    
    // Check for recovery type in hash or search params
    const hashType = hashParams.get('type');
    const searchType = searchParams.get('type');
    
    // Check for various token formats
    const hasAccessToken = hashParams.has('access_token') || searchParams.has('access_token');
    const hasRefreshToken = hashParams.has('refresh_token') || searchParams.has('refresh_token');
    const hasTokenHash = hashParams.has('token_hash') || searchParams.has('token_hash');
    
    return hashType === 'recovery' || searchType === 'recovery' || hasAccessToken || hasRefreshToken || hasTokenHash;
  }, []);

  // Initialize app state on startup
  React.useEffect(() => {
    initializeAppState();
    verifyServiceWorkerSafety();
  }, []);

  // If password reset flow detected, render ONLY the reset page with minimal providers
  if (isPasswordResetFlow) {
    console.log('🔐 App: Password reset flow detected, rendering completely isolated reset page');
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="*" element={<Navigate to="/reset-password" replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  // Normal app flow with all providers
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RealtimeShutdownGuard />
        <VersionChecker />
        <CacheCleanerMount />
        <Sonner />
        <BrowserRouter>
            <ScrollToTop />
            <AuthProvider>
              <WelcomeProvider>
                <NotificationPromptProvider>
                  <NavigationGuard>
                     <RealtimeHealthProvider>
                       <RealtimeConnectionManagerProvider>
                         <TelemetryProvider>
                        <GlobalPreviewControlProvider>
                        <OptimizedWebSocketPriceProvider>
                        <WebSocketErrorBoundary>
                          <ContextErrorBoundary>
                            <SharedRealtimeProvider>
                              <SignalRealtimeProvider>
                      <Routes>
                        {/* Landing Routes */}
                        <Route
                          path="/"
                          element={<LandingLayout />}
                          errorElement={<RouteErrorBoundary />}
                        >
                          <Route index element={<AuthenticatedRedirect><Landing /></AuthenticatedRedirect>} />
                          <Route path="about" element={<AuthenticatedRedirect><About /></AuthenticatedRedirect>} />
                          <Route path="features" element={<AuthenticatedRedirect><Features /></AuthenticatedRedirect>} />
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
                           <Route path="legal/terms" element={<TermsPage />} />
                           <Route path="legal/privacy" element={<PrivacyPage />} />
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
                              <TooltipProvider>
                                <Layout>
                                  <div></div>
                                </Layout>
                              </TooltipProvider>
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
                            element={<SignalStreamOptimized />}
                          />
                          <Route
                            path="new-signal"
                            element={<NewSignalPage />}
                          />
                          <Route
                            path="advanced-tools"
                            element={<AdvancedTools />}
                          />
                          <Route path="my-progress" element={<MyProgress />} />
                          <Route path="progress" element={<Progress />} />
                           <Route path="settings" element={<Settings />} />
                            {isDevToolsEnabled() && (
                               <>
                                 <Route path="athena" element={<AthenaTest />} />
                                 <Route path="dev-tests" element={<DevTests />} />
                                 <Route path="price-testing" element={<PriceTestingPage />} />
                                 <Route 
                                   path="realtime-cost-status" 
                                   element={
                                     <ProtectedRoute requiredAccessLevel="admin">
                                       <div className="p-4">
                                         {React.createElement(
                                           React.lazy(() => import("@/pages/debug/RealtimeCostStatus"))
                                         )}
                                       </div>
                                     </ProtectedRoute>
                                   } 
                                 />
                               </>
                             )}

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
                              </SignalRealtimeProvider>
                            </SharedRealtimeProvider>
                          </ContextErrorBoundary>
                        </WebSocketErrorBoundary>
                        </OptimizedWebSocketPriceProvider>
                        </GlobalPreviewControlProvider>
                         </TelemetryProvider>
                       </RealtimeConnectionManagerProvider>
                     </RealtimeHealthProvider>
                  </NavigationGuard>
                </NotificationPromptProvider>
                {/* Global Welcome Animation - renders outside all layouts */}
                <GlobalWelcomeOverlay />
              </WelcomeProvider>
            </AuthProvider>
          </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
