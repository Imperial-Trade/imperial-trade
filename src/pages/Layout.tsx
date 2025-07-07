
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Crown, Menu, X, Mic, MicOff, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LayoutProps {
  children: React.ReactNode;
  currentPageName: string;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPageName }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initializeUser();
  }, []);

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'en-US';
        
        recognitionInstance.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          console.log('Voice command:', transcript);
          // Handle voice commands here
        };
        
        recognitionInstance.onerror = () => {
          setIsListening(false);
        };
        
        recognitionInstance.onend = () => {
          setIsListening(false);
        };
        
        setRecognition(recognitionInstance);
      }
    }
  }, []);

  const toggleVoiceRecognition = () => {
    if (!recognition) return;
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const getUserAccessLevel = () => {
    if (!user) return 'free';
    return user.access_level || 'free';
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Header */}
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

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className={`fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-40 w-64 bg-surface/95 backdrop-blur-xl border-r border-border/50 transform transition-transform duration-300 ease-in-out pt-16 lg:pt-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6">
            {user && (
              <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-amber-300/10 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-amber-300 flex items-center justify-center text-white font-bold">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-primary">
                      {user.email || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getAccessLevelDisplay(getUserAccessLevel()).label} Access
                    </p>
                  </div>
                </div>
              </div>
            )}

            <nav className="space-y-2">
              {filteredMenuItems.map((item) => (
                <a
                  key={item.title}
                  href={item.url}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    currentPageName.toLowerCase() === item.title.toLowerCase().replace(/\s+/g, '')
                      ? "bg-primary/20 text-primary border border-primary/30 shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <span className="font-medium">{item.title}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-30 lg:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
