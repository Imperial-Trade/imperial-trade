
import { memo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppBar from '@/components/layout/AppBar';

const LandingLayout = () => {
  const location = useLocation();
  const isAccountRequestPage = location.pathname === '/account-request';

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AppBar />
      <main className={isAccountRequestPage ? '' : 'pt-20'}>
        <Outlet />
      </main>
    </div>
  );
};

export default LandingLayout;
