import React from 'react';
import { Search, Filter, TrendingUp, Users, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSignalTheme } from '@/hooks/useSignalTheme';

interface FilterState {
  search: string;
  status: string;
  tradeType: string;
  educator: string;
  selectedEducators: string[];
}

interface SignalStreamBottomNavProps {
  filters: FilterState;
  onOpenSheet: (type: 'search' | 'status' | 'tradeType' | 'educator' | 'notifications') => void;
  educatorOptions: Array<{ id: string; name: string }>;
  unreadNotifications?: number;
  onBellClick?: () => void;
}

const navItems = [
  {
    name: 'Search',
    icon: Search,
    type: 'search' as const,
  },
  {
    name: 'Status',
    icon: Filter,
    type: 'status' as const,
  },
  {
    name: 'Types',
    icon: TrendingUp,
    type: 'tradeType' as const,
  },
  {
    name: 'Educator',
    icon: Users,
    type: 'educator' as const,
  },
];

export const SignalStreamBottomNav: React.FC<SignalStreamBottomNavProps> = ({
  filters,
  onOpenSheet,
  educatorOptions,
  unreadNotifications = 0,
  onBellClick,
}) => {
  const { colors } = useSignalTheme();

  const isActive = (type: string) => {
    switch (type) {
      case 'search':
        return filters.search !== '';
      case 'status':
        return filters.status !== 'all' && filters.status !== '';
      case 'tradeType':
        return filters.tradeType !== 'all' && filters.tradeType !== '';
      case 'educator':
        return filters.educator !== 'all' && filters.educator !== '';
      case 'notifications':
        return false;
      default:
        return false;
    }
  };

  // Filter out educator if only 1 option available
  const visibleItems = navItems.filter(
    (item) => item.type !== 'educator' || educatorOptions.length > 1
  );

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 glass-dark border-t border-white/10 z-[100] pb-safe bottom-nav-fixed"
      style={{
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      }}
    >
      <div className="flex justify-around items-center py-2">
        {/* Notification Bell */}
        <button
          onClick={() => onOpenSheet('notifications')}
          className="flex flex-col items-center gap-1 p-2 min-w-[70px] min-h-[56px] justify-center transition-all rounded-lg text-gray-400 hover:text-gray-300 hover:bg-white/5 relative"
        >
          <Bell className="w-6 h-6" />
          {unreadNotifications > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute top-1 right-4 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center animate-bounce bg-red-500 border-2 border-background"
            >
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </Badge>
          )}
          <span className="text-xs font-medium">Alerts</span>
        </button>

        {visibleItems.map((item) => {
          const active = isActive(item.type);
          return (
            <button
              key={item.type}
              onClick={() => onOpenSheet(item.type)}
              className={`flex flex-col items-center gap-1 p-2 min-w-[70px] min-h-[56px] justify-center transition-all rounded-lg ${
                active
                  ? 'glass-emerald border-emerald-primary/20'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
              }`}
              style={active ? {
                color: colors.accent.primary,
              } : undefined}
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
      </div>
    </nav>
  );
};
