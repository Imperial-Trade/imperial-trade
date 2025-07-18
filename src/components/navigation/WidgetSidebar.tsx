import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Calculator,
  TrendingUp,
  Search,
  Target,
  User,
  Bell,
  BarChart3,
  Settings,
  Shield,
  LogOut
} from 'lucide-react';

import { ThemeToggle } from '@/components/theme/ThemeToggle';

const toolItems = [
  { 
    name: 'Trading Journal', 
    icon: BookOpen, 
    description: 'Log and analyze your trading performance',
    path: '/dashboard/advanced-tools'
  },
  { 
    name: 'Economic Calendar', 
    icon: Calendar, 
    description: 'Track important market events',
    path: '/dashboard/advanced-tools'
  },
  { 
    name: 'Risk Calculator', 
    icon: Calculator, 
    description: 'Calculate position sizes and risk',
    path: '/dashboard/advanced-tools'
  },
  { 
    name: 'Trade Analyst', 
    icon: TrendingUp, 
    description: 'Analyze market trends and patterns',
    path: '/dashboard/advanced-tools'
  },
  { 
    name: 'Opportunity Scanner', 
    icon: Search, 
    description: 'Scan for trading opportunities',
    path: '/dashboard/advanced-tools'
  },
  { 
    name: 'Risk Simulator', 
    icon: Target, 
    description: 'Simulate trading scenarios',
    path: '/dashboard/advanced-tools'
  },
];

const NavWidget = ({ navItem, size = 'small' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const Icon = navItem.icon;
  const isActive = location.pathname === navItem.path;
  
  const sizeClasses = {
    small: 'col-span-1 h-28',
    medium: 'col-span-2 h-28',
    large: 'col-span-2 h-36'
  };

  const renderWidgetContent = () => {
    switch (navItem.name) {
      case 'Trading Journal':
        return (
          <div className="w-full h-full bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg overflow-hidden border border-yellow-200/40 dark:border-yellow-700/40">
            <div className="p-3 h-full">
              {/* Colored dots like macOS traffic lights */}
              <div className="flex gap-1 mb-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              </div>
              {/* Progress bars */}
              <div className="space-y-2">
                <div className="h-1.5 bg-blue-500 rounded-full w-3/4"></div>
                <div className="h-1.5 bg-gray-600 rounded-full w-1/2"></div>
                <div className="h-1.5 bg-green-500 rounded-full w-5/6"></div>
              </div>
            </div>
          </div>
        );
      
      case 'Economic Calendar':
        return (
          <div className="w-full h-full bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg overflow-hidden border border-purple-200/40 dark:border-purple-700/40">
            <div className="p-2 h-full">
              {/* Calendar grid */}
              <div className="grid grid-cols-4 gap-1 h-full">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={`w-full h-3 rounded ${
                    i === 5 ? 'bg-purple-600' : i === 9 ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}></div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'Risk Calculator':
        return (
          <div className="w-full h-full bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg overflow-hidden border border-green-200/40 dark:border-green-700/40">
            <div className="p-2 h-full flex items-center justify-center">
              <div className="relative">
                <div className="w-8 h-8 border-2 border-green-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-green-600">%</span>
                </div>
                {/* Decorative elements */}
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-3 bg-green-400 rounded"></div>
                <div className="absolute -bottom-1 left-0 w-1 h-2 bg-green-300 rounded"></div>
                <div className="absolute -bottom-1 right-0 w-1 h-2 bg-green-300 rounded"></div>
              </div>
            </div>
          </div>
        );
      
      case 'Trade Analyst':
        return (
          <div className="w-full h-full bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg overflow-hidden border border-orange-200/40 dark:border-orange-700/40">
            <div className="p-3 h-full">
              {/* Chart-like elements */}
              <div className="flex items-end h-full gap-1">
                <div className="w-4 h-1 bg-orange-400 rounded"></div>
                <div className="w-1 h-1 bg-orange-300 rounded"></div>
                <div className="flex-1"></div>
                {/* Target/crosshair icon */}
                <div className="relative mb-2">
                  <div className="w-4 h-4 border-2 border-dashed border-orange-600 rounded"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1 h-1 bg-orange-600 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'Opportunity Scanner':
        return (
          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg overflow-hidden border border-blue-200/40 dark:border-blue-700/40">
            <div className="p-2 h-full flex flex-col justify-center">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-cyan-500 rounded-full"></div>
                  <div className="h-1 bg-cyan-400 rounded flex-1"></div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                  <div className="h-1 bg-blue-400 rounded w-3/4"></div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                  <div className="h-1 bg-blue-500 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'Risk Simulator':
        return (
          <div className="w-full h-full bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-lg overflow-hidden border border-pink-200/40 dark:border-pink-700/40">
            <div className="p-2 h-full flex items-center justify-center">
              <div className="relative">
                <div className="w-6 h-6 border-3 border-rose-300 rounded-full"></div>
                <div className="absolute inset-1 w-4 h-4 bg-rose-600 rounded-full"></div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <Icon className="w-6 h-6 text-gray-400 dark:text-gray-600" />
          </div>
        );
    }
  };

  return (
    <motion.button
      onClick={() => navigate(navItem.path)}
      className={`${sizeClasses[size]} bg-black dark:bg-white backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-gray-200/20 dark:border-gray-700/30 transition-all duration-300 hover:shadow-md hover:scale-[1.02] ${
        isActive ? 'ring-2 ring-primary/50 shadow-lg' : ''
      }`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex flex-col h-full gap-2">
        <div className="flex items-start justify-between mb-1">
          <h3 className={`font-medium text-xs leading-tight ${isActive ? 'text-primary' : 'text-white dark:text-black'}`}>
            {navItem.name}
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

export function WidgetSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  return (
    <motion.aside
      className="fixed left-0 top-0 h-full z-40 bg-transparent overflow-y-auto"
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

        {/* Trading Tools Widget Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Trading Journal - Large Widget */}
          <NavWidget navItem={toolItems[0]} size="large" />
          
          {/* Economic Calendar */}
          <NavWidget navItem={toolItems[1]} size="small" />
          
          {/* Risk Calculator */}
          <NavWidget navItem={toolItems[2]} size="small" />
          
          {/* Trade Analyst - Medium Widget */}
          <NavWidget navItem={toolItems[3]} size="medium" />
          
          {/* Opportunity Scanner */}
          <NavWidget navItem={toolItems[4]} size="small" />
          
          {/* Risk Simulator */}
          <NavWidget navItem={toolItems[5]} size="small" />
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
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-white dark:text-black text-sm font-medium">Jacob Estayo</div>
                  <div className="text-gray-400 dark:text-gray-600 text-xs">Admin</div>
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
          <AnimatePresence>
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
                      navigate('/dashboard/progress');
                    }}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-700 dark:hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    <BarChart3 className="w-4 h-4 text-white dark:text-black" />
                    <span className="text-white dark:text-black text-sm">My Progress</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      navigate('/dashboard/administration');
                    }}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-700 dark:hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4 text-white dark:text-black" />
                    <span className="text-white dark:text-black text-sm">Administration</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      navigate('/dashboard/admin-panel');
                    }}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-700 dark:hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    <Shield className="w-4 h-4 text-white dark:text-black" />
                    <span className="text-white dark:text-black text-sm">Admin Panel</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      // Add logout functionality here
                      console.log('Logout clicked');
                    }}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-red-600 dark:hover:bg-red-500 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-red-400 dark:text-red-600" />
                    <span className="text-red-400 dark:text-red-600 text-sm">Logout</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}