import React from 'react';
import { BookOpen, Calculator, Brain } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MobileBottomNavProps {
  activeTool: { name: string; icon: any };
  onToolChange: (toolName: string) => void;
}

const navItems = [
  {
    name: 'Journal',
    icon: BookOpen,
    toolName: 'Educational Journal',
  },
  {
    name: 'MECCA',
    icon: Brain,
    toolName: 'MECCA',
  },
  {
    name: 'Risk Calc',
    icon: Calculator,
    toolName: 'Educational Calculator',
  },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTool, onToolChange }) => {
  const { user, profile } = useAuth();

  if (!user) return null;

  const isActive = (toolName: string) => activeTool.name === toolName;

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 glass-dark border-t border-white/10 z-[100] pb-safe bottom-nav-fixed"
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => {
          const active = isActive(item.toolName);
          return (
            <button
              key={item.name}
              onClick={() => onToolChange(item.toolName)}
              className={`flex flex-col items-center gap-1 p-2 min-w-[70px] min-h-[56px] justify-center transition-all rounded-lg ${
                active
                  ? 'glass-emerald text-emerald-primary'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <item.icon 
                className={`w-6 h-6 ${active ? 'fill-emerald-primary/20 drop-shadow-lg' : ''}`} 
              />
              <span className={`text-xs ${active ? 'font-bold' : 'font-medium'}`}>
                {item.name}
              </span>
            </button>
          );
        })}

        {/* Profile Display - Non-clickable */}
        <div className="flex flex-col items-center gap-1 p-2 min-w-[70px] min-h-[56px] justify-center">
          <Avatar className="h-7 w-7 border-2 border-white/20">
            <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name || 'User'} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-gray-400">Profile</span>
        </div>
      </div>
    </nav>
  );
};
