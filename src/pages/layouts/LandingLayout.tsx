
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppBar from '@/components/layout/AppBar';

const LandingLayout: React.FC = () => {
  const location = useLocation();
  const isAccountRequestPage = location.pathname === '/account-request';
  const isResetPasswordPage = location.pathname === '/reset-password';

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {!isResetPasswordPage && <AppBar />}
      <main className={isAccountRequestPage || isResetPasswordPage ? '' : 'pt-20'}>
        <Outlet />
      </main>
    </div>
  );
};

export default LandingLayout;
