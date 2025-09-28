import React from 'react';
import { NavigationProvider } from '../components/navigation/NavigationProvider';
import { SharedHeader } from '../components/navigation/SharedHeader';
import { AppSidebar } from '../components/navigation/AppSidebar';
import { 
  Home,
  GraduationCap,
  BookOpen,
  Video,
  Award,
  TrendingUp,
} from "lucide-react";

// Academy-specific navigation configuration
const academyNavigationItems = [
  { to: "/dashboard/home", icon: Home, label: "Dashboard" },
  { to: "/dashboard/courses", icon: GraduationCap, label: "Courses" },
  { to: "/dashboard/library", icon: BookOpen, label: "Library" },
  { to: "/dashboard/videos", icon: Video, label: "Video Lessons" },
  { to: "/dashboard/certificates", icon: Award, label: "Certificates" },
  { to: "/dashboard/progress", icon: TrendingUp, label: "My Progress" },
];

interface AcademyLayoutProps {
  children: React.ReactNode;
  user?: any;
  onLogout?: () => void;
}

export function AcademyLayout({ children, user, onLogout }: AcademyLayoutProps) {
  return (
    <NavigationProvider>
      <div className="min-h-screen flex w-full">
        <SharedHeader 
          baseUrl="/academy" 
          user={user}
          onLogout={onLogout}
        />
        
        <div className="flex min-h-screen w-full">
          <AppSidebar 
            user={user}
            navigationItems={academyNavigationItems}
          />
          
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </NavigationProvider>
  );
}