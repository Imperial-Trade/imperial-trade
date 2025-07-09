
import React from 'react';
import AppBar from '@/components/layout/AppBar';

interface LandingLayoutProps {
  children: React.ReactNode;
}

const LandingLayout: React.FC<LandingLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <AppBar />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};

export default LandingLayout;
