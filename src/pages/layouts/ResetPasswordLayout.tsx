import React from 'react';
import { Outlet } from 'react-router-dom';

const ResetPasswordLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Outlet />
    </div>
  );
};

export default ResetPasswordLayout;