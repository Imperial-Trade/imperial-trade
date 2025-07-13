
import React from 'react';
import { Outlet } from 'react-router-dom';
import AppBar from '@/components/layout/AppBar';

const LandingLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppBar />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
};

export default LandingLayout;
