import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LandingLayout from "./layouts/LandingLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import Landing from "./landing-page/Landing";
import Home from "./dashboard/Home";
import Education from "./dashboard/Education";
import Live from "./dashboard/Live";
import Forum from "./dashboard/Forum";
import About from "./landing-page/About";
import IBPartnership from "./landing-page/IBPartnership";
import AdvancedTools from "./dashboard/AdvancedTools";
import MyProgress from "./dashboard/MyProgress";
import AthenaTest from "./dashboard/AthenaTest";
import AdminPanel from "./dashboard/AdminPanel";
import AccountRequest from "./AccountRequest";
import AccessPortal from "./AccessPortal";
import Settings from "./dashboard/Settings";
import SignalStream from "./dashboard/SignalStream";
import Features from "./landing-page/Features";

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
              <AthenaTest />
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
