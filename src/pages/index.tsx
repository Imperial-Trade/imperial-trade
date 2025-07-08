
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import LandingLayout from "./layouts/LandingLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Landing from "./landing-page/landing/Landing";
import Home from "./dashboard/home/Home";
import Live from "./dashboard/live/Live";
import Forum from "./dashboard/forum/Forum";
import About from "./landing-page/about/About";
import IBPartnership from "./landing-page/ib-partnership/IBPartnership";
import AdminPanel from "./dashboard/admin-panel/AdminPanel";
import AccountRequest from "./landing-page/account-request/AccountRequest";
import AccountRequestStatus from "./landing-page/account-request-status/AccountRequestStatus";
import Settings from "./dashboard/settings/Settings";
import SignalStream from "./dashboard/signal-stream/SignalStream";
import Features from "./landing-page/features/Features";
import AdvancedTools from "./dashboard/advanced-tools/AdvancedTools";
import AthenaTestPage from "./dashboard/athena/AthenaTest";
import Education from "./dashboard/education/Education";
import MyProgress from "./dashboard/my-progress/MyProgress";
import SigninPage from "./landing-page/signin/Signin";
import NotFound from "./NotFound";

export default function Pages() {
  return (
    <Router>
      <Routes>
        {/* Public Routes with Landing Layout */}
        <Route
          path="/"
          element={
            <LandingLayout>
              <Landing />
            </LandingLayout>
          }
        />
        <Route
          path="/about"
          element={
            <LandingLayout>
              <About />
            </LandingLayout>
          }
        />
        <Route
          path="/partnership"
          element={
            <LandingLayout>
              <IBPartnership />
            </LandingLayout>
          }
        />
        <Route
          path="/features"
          element={
            <LandingLayout>
              <Features />
            </LandingLayout>
          }
        />
        <Route
          path="/account-request"
          element={
            <LandingLayout>
              <AccountRequest />
            </LandingLayout>
          }
        />
        <Route
          path="/account-request-status"
          element={
            <LandingLayout>
              <AccountRequestStatus />
            </LandingLayout>
          }
        />
        <Route
          path="/signin"
          element={
            <LandingLayout>
              <SigninPage />
            </LandingLayout>
          }
        />

        {/* Dashboard redirect - redirect /dashboard to /dashboard/home */}
        <Route
          path="/dashboard"
          element={<Navigate to="/dashboard/home" replace />}
        />

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard/home"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Home />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/education"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Education />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/signals"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SignalStream />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/live"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Live />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/forum"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Forum />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/tools"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AdvancedTools />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/progress"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <MyProgress />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/athena"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AthenaTestPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <DashboardLayout>
                <AdminPanel />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
