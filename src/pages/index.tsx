
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from './Layout';
import LandingLayout from '@/components/layouts/LandingLayout';

// Import all page components
import Home from './dashboard/home/Home';
import Education from './dashboard/education/Education';
import SignalStream from './dashboard/signal-stream/SignalStream';
import Live from './dashboard/live/Live';
import Forum from './dashboard/forum/Forum';
import IBPartnership from './landing-page/ib-partnership/IBPartnership';
import AdvancedTools from './dashboard/advanced-tools/AdvancedTools';
import MyProgress from './dashboard/my-progress/MyProgress';
import AthenaTest from './dashboard/athena/AthenaTest';
import AdminPanel from './dashboard/admin-panel/AdminPanel';
import AccountRequest from './landing-page/account-request/AccountRequest';
import AccessPortal from './landing-page/access-portal/AccessPortal';
import Settings from './dashboard/settings/Settings';
import About from './landing-page/about/About';
import Login from './landing-page/login/Login';
import AccountRequestStatusPage from './landing-page/account-request-status/AccountRequestStatus';
import Landing from './landing-page/landing/Landing';

const pages = [
  {
    path: "/",
    element: <LandingLayout><Landing /></LandingLayout>,
    name: "Landing"
  },
  {
    path: "/dashboard",
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
    element: <LandingLayout><About /></LandingLayout>,
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
