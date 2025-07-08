import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from './Layout';
import LandingLayout from '@/components/layouts/LandingLayout';

// Import all page components
import Home from './Home';
import Education from './Education';
import SignalStream from './SignalStream';
import Live from './Live';
import Forum from './Forum';
import IBPartnership from './IBPartnership';
import AdvancedTools from './AdvancedTools';
import MyProgress from './MyProgress';
import AthenaTest from './AthenaTest';
import AdminPanel from './AdminPanel';
import AccountRequest from './landing-page/account-request/AccountRequest';
import AccessPortal from './landing-page/access-portal/AccessPortal';
import Settings from './Settings';
import About from './About';
import Login from './landing-page/login/Login';
import AccountRequestStatusPage from './landing-page/account-request/AccountRequestStatus';

const pages = [
  {
    path: "/",
    element: <Layout currentPageName="Home"><Home /></Layout>,
    name: "Home"
  },
  {
    path: "/Education",
    element: <Layout currentPageName="Education"><Education /></Layout>,
    name: "Education"
  },
  {
    path: "/SignalStream",
    element: <Layout currentPageName="SignalStream"><SignalStream /></Layout>,
    name: "SignalStream"
  },
  {
    path: "/Live",
    element: <Layout currentPageName="Live"><Live /></Layout>,
    name: "Live"
  },
  {
    path: "/Forum",
    element: <Layout currentPageName="Forum"><Forum /></Layout>,
    name: "Forum"
  },
  {
    path: "/IBPartnership",
    element: <Layout currentPageName="IBPartnership"><IBPartnership /></Layout>,
    name: "IBPartnership"
  },
  {
    path: "/AdvancedTools",
    element: <Layout currentPageName="AdvancedTools"><AdvancedTools /></Layout>,
    name: "AdvancedTools"
  },
  {
    path: "/MyProgress",
    element: <Layout currentPageName="MyProgress"><MyProgress /></Layout>,
    name: "MyProgress"
  },
  {
    path: "/AthenaTest",
    element: <Layout currentPageName="Athena AI"><AthenaTest /></Layout>,
    name: "Athena AI"
  },
  {
    path: "/AdminPanel",
    element: <Layout currentPageName="AdminPanel"><AdminPanel /></Layout>,
    name: "AdminPanel"
  },
  {
    path: "/AccountRequest",
    element: <LandingLayout><AccountRequest /></LandingLayout>,
    name: "AccountRequest"
  },
  {
    path: "/account-request-status",
    element: <LandingLayout><AccountRequestStatusPage /></LandingLayout>,
    name: "AccountRequestStatus"
  },
  {
    path: "/AccessPortal",
    element: <LandingLayout><AccessPortal /></LandingLayout>,
    name: "AccessPortal"
  },
  {
    path: "/Settings",
    element: <Layout currentPageName="Settings"><Settings /></Layout>,
    name: "Settings"
  },
  {
    path: "/About",
    element: <Layout currentPageName="About"><About /></Layout>,
    name: "About"
  },
  {
    path: "/login",
    element: <LandingLayout><Login /></LandingLayout>,
    name: "Login"
  },
];

const router = createBrowserRouter(
  pages.map(page => ({
    path: page.path,
    element: page.element,
  }))
);

export default router;
