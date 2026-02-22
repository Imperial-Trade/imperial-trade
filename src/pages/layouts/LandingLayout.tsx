
import { memo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppBar from '@/components/layout/AppBar';

const LandingLayout = () => {
  const location = useLocation();
  const isAccountRequestPage = location.pathname === '/account-request';

  return (
    <div className="h-screen min-h-screen bg-background overflow-x-hidden flex flex-col">
      <AppBar />
      <main className={`flex-1 min-h-0 overflow-y-auto ${isAccountRequestPage ? '' : 'pt-20'}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default LandingLayout;
