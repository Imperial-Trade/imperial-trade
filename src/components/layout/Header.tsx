
import React from 'react';
import { Crown, Menu, X, Mic, MicOff, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  user: User | null;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isListening: boolean;
  toggleVoiceRecognition: () => void;
  getUserAccessLevel: () => string;
  getAccessLevelDisplay: (level: string) => { label: string; color: string };
}

const Header: React.FC<HeaderProps> = ({
  user,
  sidebarOpen,
  setSidebarOpen,
  isListening,
  toggleVoiceRecognition,
  getUserAccessLevel,
  getAccessLevelDisplay
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-primary hover:text-primary/80 transition-colors lg:hidden"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
            IMPERIAL
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {user && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVoiceRecognition}
              className={`hidden md:flex ${isListening ? 'text-red-500' : 'text-muted-foreground'}`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Bell className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Badge className={`${getAccessLevelDisplay(getUserAccessLevel()).color} text-white`}>
                {getAccessLevelDisplay(getUserAccessLevel()).label}
              </Badge>
            </div>
          </>
        )}
        
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Market Open
        </div>
      </div>
    </header>
  );
};

export default Header;
