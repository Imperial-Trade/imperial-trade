import Layout from "./Layout.jsx";

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

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    Education: Education,
    
    Live: Live,
    
    Forum: Forum,
    
    About: About,
    
    IBPartnership: IBPartnership,
    
    AdvancedTools: AdvancedTools,
    
    MyProgress: MyProgress,
    
    AthenaTest: AthenaTest,
    
    AdminPanel: AdminPanel,
    
    AccountRequest: AccountRequest,
    
    AccessPortal: AccessPortal,
    
    Settings: Settings,
    
    SignalStream: SignalStream,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Home />} />
                
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Education" element={<Education />} />
                
                <Route path="/Live" element={<Live />} />
                
                <Route path="/Forum" element={<Forum />} />
                
                <Route path="/About" element={<About />} />
                
                <Route path="/IBPartnership" element={<IBPartnership />} />
                
                <Route path="/AdvancedTools" element={<AdvancedTools />} />
                
                <Route path="/MyProgress" element={<MyProgress />} />
                
                <Route path="/AthenaTest" element={<AthenaTest />} />
                
                <Route path="/AdminPanel" element={<AdminPanel />} />
                
                <Route path="/AccountRequest" element={<AccountRequest />} />
                
                <Route path="/AccessPortal" element={<AccessPortal />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/SignalStream" element={<SignalStream />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}