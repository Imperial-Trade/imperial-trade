import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  Calculator,
  Brain,
  Search,
  Scale,
  ChevronRight,
  Sparkles,
  User,
  Bell,
  BarChart3,
  Settings,
  Shield,
  LogOut
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';

// Define the 6 trading arsenal tools
const tradingTools = [
  { 
    name: 'Trading Journal', 
    icon: BookOpen, 
    description: 'Log and analyze your trades with AI-powered feedback.',
    route: '/dashboard/advanced-tools?tool=journal'
  },
  { 
    name: 'Economic Calendar', 
    icon: Calendar, 
    description: 'Stay ahead of market-moving events and news releases.',
    route: '/dashboard/advanced-tools?tool=calendar'
  },
  { 
    name: 'Risk Calculator', 
    icon: Calculator, 
    description: 'Calculate position size, risk, and potential profit.',
    route: '/dashboard/advanced-tools?tool=calculator'
  },
  { 
    name: 'Trade Analyst', 
    icon: Brain, 
    description: 'Upload screenshots for deep performance analysis.',
    route: '/dashboard/advanced-tools?tool=analyst'
  },
  { 
    name: 'Opportunity Scanner', 
    icon: Search, 
    description: 'Scan markets for high-probability trading setups.',
    route: '/dashboard/advanced-tools?tool=scanner'
  },
  { 
    name: 'Risk Simulator', 
    icon: Scale,
    description: 'Simulate trade setups to assess risk before you enter.',
    route: '/dashboard/advanced-tools?tool=simulator'
  },
];

interface WidgetSidebarProps {
  className?: string;
}

export function WidgetSidebar({ className = "" }: WidgetSidebarProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const { user, signOut } = useAuth();

  const handleToolClick = (tool: typeof tradingTools[0]) => {
    setActiveTool(tool.name);
    // Navigate to the tool
    window.location.href = tool.route;
  };

  const WidgetTool = ({ tool, size = 'small' }: { tool: typeof tradingTools[0], size?: 'small' | 'medium' | 'large' }) => {
    const Icon = tool.icon;
    const isActive = activeTool === tool.name;
    
    const sizeClasses = {
      small: 'col-span-1 h-28',
      medium: 'col-span-2 h-28',
      large: 'col-span-2 h-36'
    };

    const renderWidgetContent = () => {
      switch (tool.name) {
        case 'Trading Journal':
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-gray-900 dark:from-slate-100 dark:to-white rounded-lg overflow-hidden">
              <div className="p-2 h-full flex flex-col">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-2 h-2 bg-green-400 dark:bg-green-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-red-400 dark:bg-red-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-yellow-400 dark:bg-yellow-600 rounded-full"></div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 bg-blue-300 dark:bg-blue-800 rounded w-3/4"></div>
                  <div className="h-1.5 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-1.5 bg-green-300 dark:bg-green-800 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          );
        
        case 'Economic Calendar':
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-purple-900 dark:from-purple-100 dark:to-pink-50 rounded-lg overflow-hidden">
              <div className="p-2 h-full">
                <div className="grid grid-cols-7 gap-0.5 h-full">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className={`rounded-sm ${i === 5 ? 'bg-purple-300 dark:bg-purple-700' : i === 9 ? 'bg-red-300 dark:bg-red-700' : 'bg-gray-600 dark:bg-gray-300'}`}></div>
                  ))}
                </div>
              </div>
            </div>
          );
        
        case 'Risk Calculator':
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-emerald-900 dark:from-green-100 dark:to-emerald-50 rounded-lg overflow-hidden">
              <div className="p-2 h-full flex flex-col justify-center items-center">
                <div className="w-8 h-8 border-2 border-green-300 dark:border-green-700 rounded-full flex items-center justify-center mb-1">
                  <span className="text-xs font-bold text-green-200 dark:text-green-800">%</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-1 h-3 bg-green-300 dark:bg-green-700 rounded"></div>
                  <div className="w-1 h-4 bg-green-400 dark:bg-green-800 rounded"></div>
                  <div className="w-1 h-2 bg-green-200 dark:bg-green-600 rounded"></div>
                </div>
              </div>
            </div>
          );
        
        case 'Trade Analyst':
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-amber-900 dark:from-orange-100 dark:to-amber-50 rounded-lg overflow-hidden">
              <div className="p-2 h-full flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-3 h-2 bg-orange-300 dark:bg-orange-700 rounded"></div>
                  <div className="w-4 h-1 bg-orange-200 dark:bg-orange-600 rounded"></div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded flex items-center justify-center">
                    <Icon className="w-3 h-3 text-orange-200 dark:text-orange-800" />
                  </div>
                </div>
              </div>
            </div>
          );
        
        case 'Opportunity Scanner':
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-blue-900 dark:from-cyan-100 dark:to-blue-50 rounded-lg overflow-hidden">
              <div className="p-2 h-full">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-cyan-300 dark:bg-cyan-700 rounded-full animate-pulse"></div>
                    <div className="h-1 bg-cyan-200 dark:bg-cyan-600 rounded flex-1"></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-blue-300 dark:bg-blue-700 rounded-full animate-pulse delay-100"></div>
                    <div className="h-1 bg-blue-200 dark:bg-blue-600 rounded flex-1"></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-indigo-300 dark:bg-indigo-700 rounded-full animate-pulse delay-200"></div>
                    <div className="h-1 bg-indigo-200 dark:bg-indigo-600 rounded flex-1"></div>
                  </div>
                </div>
              </div>
            </div>
          );
        
        case 'Risk Simulator':
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-rose-900 dark:from-red-100 dark:to-rose-50 rounded-lg overflow-hidden">
              <div className="p-2 h-full flex items-center justify-center">
                <div className="relative">
                  <div className="w-8 h-8 border-2 border-red-300 dark:border-red-700 rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-red-400 dark:border-red-800 rounded-full animate-ping"></div>
                  <div className="absolute inset-2 bg-red-400 dark:bg-red-800 rounded-full"></div>
                </div>
              </div>
            </div>
          );
        
        default:
          return (
            <div className="w-full h-full bg-gray-800 dark:bg-gray-100 rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6 text-gray-300 dark:text-gray-600" />
            </div>
          );
      }
    };

    return (
      <motion.button
        onClick={() => handleToolClick(tool)}
        className={`${sizeClasses[size]} bg-black dark:bg-white backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-gray-200/20 dark:border-gray-700/30 transition-all duration-300 hover:shadow-md hover:scale-[1.02] ${
          isActive ? 'ring-2 ring-primary/50 shadow-lg' : ''
        }`}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex flex-col h-full gap-2">
          <div className="flex items-start justify-between mb-1">
            <h3 className={`font-medium text-xs leading-tight ${isActive ? 'text-primary' : 'text-white dark:text-black'}`}>
              {tool.name}
            </h3>
            {isActive && (
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
            )}
          </div>
          <div className="flex-1 min-h-0">
            {renderWidgetContent()}
          </div>
        </div>
      </motion.button>
    );
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].split('.').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <motion.aside
      className={`fixed left-0 top-0 h-full z-40 bg-transparent overflow-y-auto ${className}`}
      initial={false}
      animate={{
        width: 320,
      }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="p-4 h-full pt-20">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Today</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Trading Arsenal</p>
        </div>

        {/* Widget Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Trading Journal - Large Widget */}
          <WidgetTool tool={tradingTools[0]} size="large" />
          
          {/* Economic Calendar */}
          <WidgetTool tool={tradingTools[1]} size="small" />
          
          {/* Risk Calculator */}
          <WidgetTool tool={tradingTools[2]} size="small" />
          
          {/* Trade Analyst - Medium Widget */}
          <WidgetTool tool={tradingTools[3]} size="medium" />
          
          {/* Opportunity Scanner */}
          <WidgetTool tool={tradingTools[4]} size="small" />
          
          {/* Risk Simulator */}
          <WidgetTool tool={tradingTools[5]} size="small" />
        </div>

        {/* Profile and Controls Section */}
        <div className="mt-6 relative">
          <div className="bg-gray-800 dark:bg-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              {/* Profile Section */}
              <button 
                className="flex items-center gap-3 hover:bg-gray-700 dark:hover:bg-gray-300 rounded-lg p-2 -m-2 transition-colors"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {user?.email ? getInitials(user.email) : 'U'}
                  </span>
                </div>
                <div className="text-left">
                  <div className="text-white dark:text-black text-sm font-medium">
                    {user?.email?.split('@')[0] || 'User'}
                  </div>
                  <div className="text-gray-400 dark:text-gray-600 text-xs">
                    {user?.user_metadata?.access_level === 'admin' ? 'Administrator' : 'Member'}
                  </div>
                </div>
              </button>
              
              {/* Controls */}
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors">
                  <Bell className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                </button>
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 bg-gray-800 dark:bg-gray-200 rounded-2xl shadow-lg border border-gray-700 dark:border-gray-300 z-50"
            >
              <div className="p-2">
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    window.location.href = '/dashboard/my-progress';
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-700 dark:hover:bg-gray-300 rounded-lg transition-colors"
                >
                  <BarChart3 className="w-4 h-4 text-white dark:text-black" />
                  <span className="text-white dark:text-black text-sm">My Progress</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    window.location.href = '/dashboard/administration';
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-700 dark:hover:bg-gray-300 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4 text-white dark:text-black" />
                  <span className="text-white dark:text-black text-sm">Administration</span>
                </button>
                
                {user?.user_metadata?.access_level === 'admin' && (
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      window.location.href = '/dashboard/admin-panel';
                    }}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-700 dark:hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    <Shield className="w-4 h-4 text-white dark:text-black" />
                    <span className="text-white dark:text-black text-sm">Admin Panel</span>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-red-600 dark:hover:bg-red-400 rounded-lg transition-colors text-red-400 dark:text-red-600 hover:text-white dark:hover:text-white"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}