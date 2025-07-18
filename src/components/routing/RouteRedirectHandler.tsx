
import React, { useEffect } from 'react';
import { isProduction, getAcademyAppUrl, getOrderFlowAppUrl } from '@/utils/environment';

interface RouteRedirectHandlerProps {
  children: React.ReactNode;
  route: 'education' | 'forum';
}

export const RouteRedirectHandler: React.FC<RouteRedirectHandlerProps> = ({ children, route }) => {
  useEffect(() => {
    if (isProduction()) {
      const redirectUrl = route === 'education' ? getAcademyAppUrl() : getOrderFlowAppUrl();
      window.location.href = redirectUrl;
    }
  }, [route]);

  // In production, we're redirecting, so we can show a loading state
  // In development, render the children normally
  if (isProduction()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
