import { memo } from 'react';
import { Outlet } from 'react-router-dom';

const ResetPasswordLayout = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Outlet />
    </div>
  );
};

export default ResetPasswordLayout;