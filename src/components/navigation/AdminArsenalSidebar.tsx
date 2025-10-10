import { useState, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserCog, 
  TrendingUp, 
  Bell, 
  Activity, 
  Timer, 
  Zap, 
  Sliders, 
  BarChart3,
  X,
  Settings,
  Shield
} from 'lucide-react';
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';

interface AdminTool {
  name: string;
  icon: any;
  description: string;
  route: string;
}

const adminTools: AdminTool[] = [
  {
    name: "Account Requests",
    icon: Users,
    description: "Review and approve new account applications",
    route: "/dashboard/advanced-tools?admin=requests",
  },
  {
    name: "User Management",
    icon: UserCog,
    description: "Manage user roles, permissions, and status",
    route: "/dashboard/advanced-tools?admin=users",
  },
  {
    name: "Trading Signals",
    icon: TrendingUp,
    description: "Monitor and manage all trading signals",
    route: "/dashboard/advanced-tools?admin=signals",
  },
  {
    name: "Notifications",
    icon: Bell,
    description: "Send system-wide notifications and alerts",
    route: "/dashboard/advanced-tools?admin=notifications",
  },
  {
    name: "System Monitor",
    icon: Activity,
    description: "Real-time system health and performance",
    route: "/dashboard/advanced-tools?admin=monitor",
  },
  {
    name: "Rate Limits",
    icon: Timer,
    description: "Configure API rate limits and throttling",
    route: "/dashboard/advanced-tools?admin=limits",
  },
  {
    name: "Diagnostics",
    icon: Zap,
    description: "System diagnostics and troubleshooting",
    route: "/dashboard/advanced-tools?admin=diagnostics",
  },
  {
    name: "Optimization",
    icon: Sliders,
    description: "Performance optimization and tuning",
    route: "/dashboard/advanced-tools?admin=optimization",
  },
  {
    name: "Monitoring",
    icon: BarChart3,
    description: "Analytics and monitoring dashboards",
    route: "/dashboard/advanced-tools?admin=monitoring",
  },
  {
    name: "Admin Settings",
    icon: Settings,
    description: "Configure admin preferences and settings",
    route: "/dashboard/advanced-tools?admin=settings",
  },
];

const AdminToolWidget = ({ tool }: { tool: AdminTool }) => {
  const Icon = tool.icon;
  const navigate = useNavigate();
  
  return (
    <motion.button
      onClick={() => navigate(tool.route)}
      className="col-span-1 h-28 bg-background/50 backdrop-blur-md rounded-xl p-3 shadow-lg border border-border hover:border-primary/50 transition-all"
      whileHover={{
        y: -4,
        scale: 1.03,
      }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="flex flex-col h-full gap-2">
        <div className="flex items-start justify-between">
          <h3 className="font-medium text-xs leading-tight text-foreground">
            {tool.name}
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Icon className="w-8 h-8 text-primary" />
        </div>
      </div>
    </motion.button>
  );
};

export function AdminArsenalSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { isAdmin, isEducatorPlus } = useAuthorizationAware();
  const canAccessAdmin = isAdmin || isEducatorPlus;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcut: Alt+A
  useEffect(() => {
    if (!canAccessAdmin) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canAccessAdmin]);
  
  if (!canAccessAdmin) return null;
  
  const dragThreshold = isMobile ? 100 : 140;
  const sidebarWidth = isMobile ? window.innerWidth * 0.9 : 320;
  
  const handleDragEnd = (event: any, info: PanInfo) => {
    const { offset, velocity } = info;
    
    // Opening gesture: drag LEFT (negative x)
    if (!isOpen) {
      const shouldOpen = offset.x < -dragThreshold || velocity.x < -500;
      if (shouldOpen) {
        setIsOpen(true);
        if ('vibrate' in navigator) {
          navigator.vibrate(20);
        }
      }
    }
    // Closing gesture: drag RIGHT (positive x)
    else {
      const shouldClose = offset.x > dragThreshold || velocity.x > 500;
      if (shouldClose) {
        setIsOpen(false);
        if ('vibrate' in navigator) {
          navigator.vibrate(15);
        }
      }
    }
    
    setIsDragging(false);
  };
  
  return (
    <>
      {/* Handle/Tab - visible when closed */}
      {!isOpen && (
        <motion.button
          className="fixed right-0 top-[calc(50vh+2.5rem)] -translate-y-1/2 z-[60] cursor-pointer"
          onClick={() => setIsOpen(true)}
          whileHover={{ opacity: 0.9 }}
          whileTap={{ opacity: 0.7 }}
        >
          <div 
            className="bg-primary/20 backdrop-blur-md px-2 py-6 rounded-l-lg border-l border-t border-b border-border hover:bg-primary/30 transition-colors"
            style={{ writingMode: 'vertical-rl' }}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="font-bold tracking-wider text-sm">ADMIN</span>
            </div>
          </div>
        </motion.button>
      )}
      
      {/* Main Sidebar Panel */}
      <motion.aside
        className={`fixed right-0 top-20 h-[calc(100vh-5rem)] z-[60] bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl ${
          isMobile ? 'w-[90vw]' : 'w-80'
        }`}
        initial={{ x: "100%" }}
        animate={{ x: isOpen ? 0 : "100%" }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 25,
        }}
        drag="x"
        dragConstraints={{ left: -sidebarWidth, right: 0 }}
        dragElastic={0.2}
        dragMomentum={false}
        dragDirectionLock
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        <div className="p-4 h-full overflow-y-auto" style={{ touchAction: 'pan-y' }}>
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Arsenal</h1>
                <p className="text-sm text-muted-foreground">Control Panel</p>
              </div>
            </div>
            <motion.button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          </div>
          
          {/* Admin Tools Grid */}
          <div className="grid grid-cols-2 gap-3">
            {adminTools.map((tool) => (
              <AdminToolWidget key={tool.name} tool={tool} />
            ))}
          </div>
        </div>
      </motion.aside>
    </>
  );
}
