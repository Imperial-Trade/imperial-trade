import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { X, Eye, EyeOff } from 'lucide-react';

export const DevAuthBanner: React.FC = () => {
  const { user, session, profile, loading } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  // Only show in development mode and when there are auth issues
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    const hasAuthIssue = (!user && !loading) || (user && !session) || loading;
    setIsVisible(isDev && hasAuthIssue);
  }, [user, session, loading]);

  if (!isVisible) return null;

  const authStatus = loading 
    ? 'Loading...' 
    : user 
      ? session 
        ? 'Authenticated' 
        : 'User without session'
      : 'Not authenticated';

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-100 dark:bg-yellow-900 border-b border-yellow-300 dark:border-yellow-700">
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-yellow-800 dark:text-yellow-200">
            DEV AUTH STATUS: {authStatus}
          </span>
          
          {!isMinimized && (
            <div className="flex gap-4 text-xs text-yellow-700 dark:text-yellow-300">
              <span>User: {user?.id ? 'Yes' : 'No'}</span>
              <span>Session: {session ? 'Yes' : 'No'}</span>
              <span>Profile: {profile ? 'Yes' : 'No'}</span>
              <span>Loading: {loading ? 'Yes' : 'No'}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded"
          >
            {isMinimized ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <div className="px-4 pb-2 text-xs text-yellow-700 dark:text-yellow-300">
          <div className="flex gap-4">
            <button onClick={() => localStorage.clear()}>Clear localStorage</button>
            <button onClick={() => window.location.reload()}>Refresh</button>
            <button onClick={() => window.location.href = '/signin'}>Go to Sign In</button>
          </div>
        </div>
      )}
    </div>
  );
};