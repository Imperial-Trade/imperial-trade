
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { useVoiceRecognition } from '@/components/layout/VoiceRecognition';

interface LayoutProps {
  children: React.ReactNode;
  currentPageName: string;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPageName }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isListening, toggleVoiceRecognition } = useVoiceRecognition();

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initializeUser();
  }, []);

  const getUserAccessLevel = () => {
    if (!user) return 'free';
    return (user.user_metadata?.access_level as string) || 'free';
  };

  const getAccessLevelDisplay = (level: string) => {
    const levels = {
      free: { label: 'Free', color: 'bg-gray-500' },
      user: { label: 'Member', color: 'bg-blue-500' },
      admin: { label: 'Admin', color: 'bg-red-500' }
    };
    return levels[level as keyof typeof levels] || levels.free;
  };

  const menuItems = [
    { title: 'Home', url: '/', accessLevel: 'free' },
    { title: 'Education', url: '/Education', accessLevel: 'user' },
    { title: 'Signal Stream', url: '/SignalStream', accessLevel: 'user' },
    { title: 'Live Sessions', url: '/Live', accessLevel: 'user' },
    { title: 'Forum', url: '/Forum', accessLevel: 'user' },
    { title: 'IB Partnership', url: '/IBPartnership', accessLevel: 'free' },
    { title: 'Advanced Tools', url: '/AdvancedTools', accessLevel: 'user' },
    { title: 'My Progress', url: '/MyProgress', accessLevel: 'user' },
    { title: 'Athena AI', url: '/AthenaTest', accessLevel: 'user' },
    { title: 'Admin Panel', url: '/AdminPanel', accessLevel: 'admin' },
    { title: 'Account Request', url: '/AccountRequest', accessLevel: 'free' },
    { title: 'Access Portal', url: '/AccessPortal', accessLevel: 'free' },
    { title: 'Settings', url: '/Settings', accessLevel: 'user' },
    { title: 'About', url: '/About', accessLevel: 'free' },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    const userLevel = getUserAccessLevel();
    if (item.accessLevel === 'free') return true;
    if (item.accessLevel === 'user' && (userLevel === 'user' || userLevel === 'admin')) return true;
    if (item.accessLevel === 'admin' && userLevel === 'admin') return true;
    return false;
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      <Header
        user={user}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isListening={isListening}
        toggleVoiceRecognition={toggleVoiceRecognition}
        getUserAccessLevel={getUserAccessLevel}
        getAccessLevelDisplay={getAccessLevelDisplay}
      />

      <div className="flex pt-16">
        <Sidebar
          user={user}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          currentPageName={currentPageName}
          filteredMenuItems={filteredMenuItems}
          getUserAccessLevel={getUserAccessLevel}
          getAccessLevelDisplay={getAccessLevelDisplay}
        />

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
