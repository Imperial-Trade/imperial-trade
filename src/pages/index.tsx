import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LandingLayout from "./layouts/LandingLayout";
import DashboardLayout from "./layouts/DashboardLayout";
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
import LoginPage from "./landing-page/login/Login";

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
          path="/login"
          element={
            <LandingLayout>
              <LoginPage />
            </LandingLayout>
          }
        />

        {/* Dashboard Routes with Authentication */}
        <Route
          path="/dashboard/home"
          element={
            <DashboardLayout>
              <Home />
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/education"
          element={
            <DashboardLayout>
              <Education />
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/signals"
          element={
            <DashboardLayout>
              <SignalStream />
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/live"
          element={
            <DashboardLayout>
              <Live />
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/forum"
          element={
            <DashboardLayout>
              <Forum />
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/tools"
          element={
            <DashboardLayout>
              <AdvancedTools />
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/progress"
          element={
            <DashboardLayout>
              <MyProgress />
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/athena"
          element={
            <DashboardLayout>
              <AthenaTestPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <DashboardLayout>
              <AdminPanel />
            </DashboardLayout>
          }
        />
      </Routes>
    </Router>
  );
}
