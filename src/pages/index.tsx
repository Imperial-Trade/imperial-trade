
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingLayout from "./layouts/LandingLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import Landing from "./Landing";
import Home from "./Home";
import Education from "./Education";
import Live from "./Live";
import Forum from "./Forum";
import About from "./About";
import IBPartnership from "./IBPartnership";
import AdvancedTools from "./AdvancedTools";
import MyProgress from "./MyProgress";
import AthenaTest from "./AthenaTest";
import AdminPanel from "./AdminPanel";
import AccountRequest from "./AccountRequest";
import AccessPortal from "./AccessPortal";
import Settings from "./Settings";
import SignalStream from "./SignalStream";

export default function Pages() {
    return (
        <Router>
            <Routes>
                {/* Public Routes with Landing Layout */}
                <Route path="/" element={
                    <LandingLayout>
                        <Landing />
                    </LandingLayout>
                } />
                <Route path="/about" element={
                    <LandingLayout>
                        <About />
                    </LandingLayout>
                } />
                <Route path="/partnership" element={
                    <LandingLayout>
                        <IBPartnership />
                    </LandingLayout>
                } />
                <Route path="/access-portal" element={
                    <LandingLayout>
                        <AccessPortal />
                    </LandingLayout>
                } />
                <Route path="/account-request" element={
                    <LandingLayout>
                        <AccountRequest />
                    </LandingLayout>
                } />

                {/* Dashboard Routes with Authentication */}
                <Route path="/dashboard/home" element={
                    <DashboardLayout>
                        <Home />
                    </DashboardLayout>
                } />
                <Route path="/dashboard/education" element={
                    <DashboardLayout>
                        <Education />
                    </DashboardLayout>
                } />
                <Route path="/dashboard/signals" element={
                    <DashboardLayout>
                        <SignalStream />
                    </DashboardLayout>
                } />
                <Route path="/dashboard/live" element={
                    <DashboardLayout>
                        <Live />
                    </DashboardLayout>
                } />
                <Route path="/dashboard/forum" element={
                    <DashboardLayout>
                        <Forum />
                    </DashboardLayout>
                } />
                <Route path="/dashboard/tools" element={
                    <DashboardLayout>
                        <AdvancedTools />
                    </DashboardLayout>
                } />
                <Route path="/dashboard/progress" element={
                    <DashboardLayout>
                        <MyProgress />
                    </DashboardLayout>
                } />
                <Route path="/dashboard/athena" element={
                    <DashboardLayout>
                        <AthenaTest />
                    </DashboardLayout>
                } />
                <Route path="/dashboard/settings" element={
                    <DashboardLayout>
                        <Settings />
                    </DashboardLayout>
                } />
                <Route path="/dashboard/admin" element={
                    <DashboardLayout>
                        <AdminPanel />
                    </DashboardLayout>
                } />

                {/* Legacy routes - redirect to dashboard */}
                <Route path="/Home" element={
                    <DashboardLayout>
                        <Home />
                    </DashboardLayout>
                } />
                <Route path="/Education" element={
                    <DashboardLayout>
                        <Education />
                    </DashboardLayout>
                } />
                <Route path="/Live" element={
                    <DashboardLayout>
                        <Live />
                    </DashboardLayout>
                } />
                <Route path="/Forum" element={
                    <DashboardLayout>
                        <Forum />
                    </DashboardLayout>
                } />
                <Route path="/About" element={
                    <LandingLayout>
                        <About />
                    </LandingLayout>
                } />
                <Route path="/IBPartnership" element={
                    <LandingLayout>
                        <IBPartnership />
                    </LandingLayout>
                } />
                <Route path="/AdvancedTools" element={
                    <DashboardLayout>
                        <AdvancedTools />
                    </DashboardLayout>
                } />
                <Route path="/MyProgress" element={
                    <DashboardLayout>
                        <MyProgress />
                    </DashboardLayout>
                } />
                <Route path="/AthenaTest" element={
                    <DashboardLayout>
                        <AthenaTest />
                    </DashboardLayout>
                } />
                <Route path="/AdminPanel" element={
                    <DashboardLayout>
                        <AdminPanel />
                    </DashboardLayout>
                } />
                <Route path="/AccountRequest" element={
                    <LandingLayout>
                        <AccountRequest />
                    </LandingLayout>
                } />
                <Route path="/AccessPortal" element={
                    <LandingLayout>
                        <AccessPortal />
                    </LandingLayout>
                } />
                <Route path="/Settings" element={
                    <DashboardLayout>
                        <Settings />
                    </DashboardLayout>
                } />
                <Route path="/SignalStream" element={
                    <DashboardLayout>
                        <SignalStream />
                    </DashboardLayout>
                } />
            </Routes>
        </Router>
    );
}
