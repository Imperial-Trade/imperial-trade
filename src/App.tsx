// 🔔 App Entry Point - Build: 2025-11-15-REACT-FIX-FINAL (useMemo fix + Sonner removal)
import React, { useEffect, createElement, Suspense } from 'react';
import { lazyWithRetry } from '@/utils/lazyWithRetry';
import { installGlobalChunkErrorHandler } from '@/utils/globalErrorHandler';
import { isBuildStale, clearStaleCache, logBuildInfo } from '@/utils/buildInfo';
import { detectAndFixReactDuplication } from '@/utils/reactDuplicationDetector';
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationStoreProvider } from "@/contexts/NotificationStoreContext";
import { WelcomeProvider } from "@/contexts/WelcomeContext";
import { NotificationPromptProvider } from "@/contexts/NotificationPromptContext";
import { SignalRealtimeProvider } from "@/contexts/SignalRealtimeContext";
import { SharedRealtimeProvider } from "@/contexts/SharedRealtimeContext";
import { OptimizedWebSocketPriceProvider } from "@/contexts/OptimizedWebSocketPriceContext";
import { GlobalPreviewControlProvider } from "@/contexts/GlobalPreviewControlContext";
import { RouteBasedEconomicProvider } from "@/contexts/RouteBasedEconomicProvider";
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
import { TradeJournalProvider } from "@/contexts/TradeJournalContext";
import { Toaster } from "@/components/ui/sonner";

import { GlobalWelcomeOverlay } from "@/components/ui/GlobalWelcomeOverlay";
import { initializeAppState } from "@/utils/appStateCleanup";
import { isDevToolsEnabled } from "@/utils/featureFlags";
import { verifyServiceWorkerSafety } from "@/utils/serviceWorkerVerification";
import ModernNotificationSystem from "@/components/notifications/ModernNotificationSystem";
import { capacitorNotificationService } from "@/services/CapacitorNotificationService";
import { smartCacheUpdate } from "@/utils/cacheManager";

// Auth Components
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";

// Layout Components
import LandingLayout from "@/pages/layouts/LandingLayout";
import ResetPasswordLayout from "@/pages/layouts/ResetPasswordLayout";
import Layout from "@/components/Layout";

// Landing Pages - Lazy Loaded with Retry
const Landing = lazyWithRetry(() => import("@/pages/landing-page/landing/Landing"));
const About = lazyWithRetry(() => import("@/pages/landing-page/about/About"));
const Features = lazyWithRetry(() => import("@/pages/landing-page/features/Features"));
const IBPartnership = lazyWithRetry(() => import("@/pages/landing-page/ib-partnership/IBPartnership"));
const AdvancedToolsPage = lazyWithRetry(() => import("@/pages/landing-page/advanced-tools/AdvancedToolsPage"));
const SignalsPage = lazyWithRetry(() => import("@/pages/landing-page/signals/SignalsPage"));
const EducationPage = lazyWithRetry(() => import("@/pages/landing-page/education/EducationPage"));
const LiveSessionsPage = lazyWithRetry(() => import("@/pages/landing-page/live-sessions/LiveSessionsPage"));
const CommunityForumPage = lazyWithRetry(() => import("@/pages/landing-page/community-forum/CommunityForumPage"));
const IBPartnershipPage = lazyWithRetry(() => import("@/pages/landing-page/ib-partnership-page/IBPartnershipPage"));
const ImperialPartnership = lazyWithRetry(() => import("@/pages/landing-page/imperial-partnership/ImperialPartnership"));
const Signin = lazyWithRetry(() => import("@/pages/landing-page/signin/Signin"));
const ResetPasswordPage = lazyWithRetry(() => import("@/pages/reset-password/ResetPasswordPage"));
const DisclaimersPage = lazyWithRetry(() => import("@/pages/legal/DisclaimersPage"));
const TermsPage = lazyWithRetry(() => import("@/pages/legal/TermsPage"));
const PrivacyPage = lazyWithRetry(() => import("@/pages/legal/PrivacyPage"));
const AccountRequest = lazyWithRetry(() => import("@/pages/landing-page/account-request/AccountRequest"));
const AccountRequestStatus = lazyWithRetry(() => import("@/pages/landing-page/account-request-status/AccountRequestStatus"));

// Dashboard Pages - Lazy Loaded with Retry
const Home = lazyWithRetry(() => import("@/pages/dashboard/home/Home"));
const Live = lazyWithRetry(() => import("@/pages/dashboard/live/Live"));
const SignalStreamOptimized = lazyWithRetry(() => import("@/components/dashboard/SignalStreamOptimized"));
const NewSignalPage = lazyWithRetry(() => import("@/pages/dashboard/new-signal/NewSignalPage"));
const Education = lazyWithRetry(() => import("@/pages/dashboard/education/Education"));
const Forum = lazyWithRetry(() => import("@/pages/dashboard/forum/Forum"));
const AdvancedTools = lazyWithRetry(() => import("@/pages/dashboard/advanced-tools/AdvancedTools"));
const AdminTools = lazyWithRetry(() => import("@/pages/dashboard/advanced-tools/AdminTools"));
const MyProgress = lazyWithRetry(() => import("@/pages/dashboard/my-progress/MyProgress"));
const Progress = lazyWithRetry(() => import("@/pages/dashboard/progress/Progress"));
const Settings = lazyWithRetry(() => import("@/pages/dashboard/settings/Settings"));
const AdminPanel = lazyWithRetry(() => import("@/pages/dashboard/admin-panel/AdminPanel"));
const AthenaTest = lazyWithRetry(() => import("@/pages/dashboard/athena/AthenaTest"));
const DevTests = lazyWithRetry(() => import("@/pages/dashboard/dev-tests/DevTests"));
const PriceTestingPage = lazyWithRetry(() => import("@/pages/dashboard/dev-tests/PriceTestingPage"));

// Tools Pages - Lazy Loaded with Retry
const JournalXXPage = lazyWithRetry(() => import("@/pages/tools-journal/JournalXX"));
const JournalXXProPage = lazyWithRetry(() => import("@/pages/tools-journal/JournalXXPro"));

// Educator Pages - Lazy Loaded with Retry
const EducatorSignalManagement = lazyWithRetry(() => import("@/pages/dashboard/educator/EducatorSignalManagement"));

// Other Components - Eager Load (small, always needed)
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
  console.log('🏗️ App component initializing...');

  // 🔍 Safety check: Ensure React is properly loaded
  if (!React || !useEffect) {
    console.error('❌ CRITICAL: React not properly loaded!', { React: !!React, useEffect: !!useEffect });
    throw new Error('React module failed to load - please refresh the page');
  }

  // Initialize app state on startup
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🔧 Initializing app state...');
      try {
        // Detect and fix React duplication FIRST
        const hasReactIssue = detectAndFixReactDuplication();
        if (hasReactIssue) {
          console.warn('⚠️ React duplication detected, reload in progress...');
          return; // Don't continue initialization if reloading
        }
        
        // Install global chunk error handler
        installGlobalChunkErrorHandler();
        
        // Log build info for debugging
        logBuildInfo();
        
        // ✅ STEP 1: Smart cache update (PROTECTS NOTIFICATIONS!)
        console.log('🛡️ Running smart cache update...');
        await smartCacheUpdate();
        
        // Check for stale build and clear caches if needed
        if (isBuildStale()) {
          console.log('🔄 Stale build detected, clearing caches...');
          await clearStaleCache();
          console.log('✅ Cache cleanup complete');
        }
        
        initializeAppState();
        verifyServiceWorkerSafety();
        
        // Initialize Capacitor notification service
        capacitorNotificationService.initialize();
        
        console.log('✅ App state initialized successfully');
      } catch (error) {
        console.error('❌ Error during app state initialization:', error);
      }
    };

    initializeApp();
  }, []);

  console.log('🚀 App: Rendering normal application flow...');

  // Normal app flow with all providers
  try {
    console.log('🌐 Rendering main application with all providers...');
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <RealtimeShutdownGuard />
            <VersionChecker />
            <CacheCleanerMount />
            {/* Sonner Toaster for admin actions - glassmorphism style, bottom-right on desktop, bottom-center on mobile */}
            <Toaster position="bottom-right" />
            <div className="app-router-wrapper flex-1 min-h-0 flex flex-col min-h-0 overflow-hidden">
          <BrowserRouter>
              <ScrollToTop />
              <AuthProvider>
                <NotificationStoreProvider>
                  <ModernNotificationSystem />
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
                                <RouteBasedEconomicProvider>
                                   <SignalRealtimeProvider>
                       <Suspense fallback={
                         <div className="min-h-screen flex items-center justify-center bg-background">
                           <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
                         </div>
                       }>
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

                        {/* Reset Password Route - Clean Layout */}
                        <Route
                          path="reset-password" 
                          element={<ResetPasswordLayout />}
                          errorElement={<RouteErrorBoundary />}
                        >
                          <Route index element={<ResetPasswordPage />} />
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
                    element={
                      <ProtectedRoute requiredRoles={['admin', 'educator', 'educator+']}>
                        <NewSignalPage />
                      </ProtectedRoute>
                    }
                  />
            <Route
              path="advanced-tools"
              element={<AdvancedTools />}
            />
            <Route
              path="journal-xx"
              element={
                <TradeJournalProvider>
                  <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                    <JournalXXPage />
                  </Suspense>
                </TradeJournalProvider>
              }
            />
            <Route
              path="journal-xx-pro"
              element={
                <TradeJournalProvider>
                  <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                    <JournalXXProPage />
                  </Suspense>
                </TradeJournalProvider>
              }
            />
            <Route
              path="admin-tools"
              element={<AdminTools />}
            />
                          <Route path="my-progress" element={<MyProgress />} />
                          <Route path="progress" element={<Progress />} />
                           <Route path="settings" element={<Settings />} />
                           <Route path="education" element={<Education />} />
                           <Route path="forum" element={<Forum />} />
                            {isDevToolsEnabled() && (
                               <>
                                 <Route path="athena" element={<AthenaTest />} />
                                 <Route path="dev-tests" element={<DevTests />} />
                                 <Route path="price-testing" element={<PriceTestingPage />} />
                                  <Route 
                                    path="realtime-cost-status" 
                                    element={
                                      <ProtectedRoute requiredRoles={['admin']}>
                          <div className="p-4">
                                  {createElement(
                                    lazyWithRetry(() => import("@/pages/debug/RealtimeCostStatus"))
                                  )}
                                </div>
                                      </ProtectedRoute>
                                    } 
                                  />
                               </>
                             )}

                          <Route
                            path="admin"
                            element={
                              <AdminRoute allowedRoles={['admin', 'moderator', 'educator', 'educator+']}>
                                <AdminPanel />
                              </AdminRoute>
                            }
                          />

                          <Route path="educator">
                            <Route
                              path="signals"
                              element={
                                <ProtectedRoute requiredRoles={['educator', 'educator+']}>
                                  <EducatorSignalManagement />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="analytics"
                              element={
                                <ProtectedRoute requiredRoles={['educator', 'educator+']}>
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
                                <ProtectedRoute requiredRoles={['educator', 'educator+']}>
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
                                <ProtectedRoute requiredRoles={['educator+']}>
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
                       </Suspense>
                                   </SignalRealtimeProvider>
                                </RouteBasedEconomicProvider>
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
              </NotificationStoreProvider>
            </AuthProvider>
          </BrowserRouter>
            </div>
          </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
  } catch (error) {
    console.error('❌ Critical error rendering main application:', error);
    
    // Ultimate fallback - simple app that works
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#1a1a1a', color: '#fff', minHeight: '100vh' }}>
        <h1 style={{ color: '#ff6b6b' }}>Trade Imperial - Loading Error</h1>
        <p>The application failed to load properly.</p>
        <p><strong>Error:</strong> {error instanceof Error ? error.message : String(error)}</p>
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer', marginRight: '10px' }}
          >
            Reload Page
          </button>
          <button 
            onClick={() => window.location.href = '/signin'} 
            style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            Go to Sign In
          </button>
        </div>
        <details style={{ marginTop: '20px' }}>
          <summary style={{ cursor: 'pointer', color: '#ffc107' }}>Technical Details</summary>
          <pre style={{ background: '#2a2a2a', padding: '10px', marginTop: '10px', overflow: 'auto' }}>
            {error instanceof Error ? error.stack : 'No stack trace available'}
          </pre>
        </details>
      </div>
    );
  }
}

export default App;