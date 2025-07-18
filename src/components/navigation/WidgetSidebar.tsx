import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Calculator,
  TrendingUp,
  Search,
  Shield as ShieldIcon,
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
    description: 'Log and analyze your trades with AI-powered feedback.',
    color: 'blue'
  },
  { 
    name: 'Economic Calendar', 
    icon: Calendar, 
    description: 'Stay ahead of market-moving events and news releases.',
    color: 'green'
  },
  { 
    name: 'Risk Calculator', 
    icon: Calculator, 
    description: 'Calculate position size, risk, and potential profit.',
    color: 'purple'
  },
  { 
    name: 'Trade Analyst', 
    icon: TrendingUp, 
    description: 'Upload screenshots for deep performance analysis.',
    color: 'red'
  },
  { 
    name: 'Opportunity Scanner', 
    icon: Search, 
    description: 'Scan markets for high-probability trading setups.',
    color: 'orange'
  },
  { 
    name: 'Risk Simulator', 
    icon: ShieldIcon, 
    description: 'Simulate trade setups to assess risk before you enter.',
    color: 'yellow'
  },
];

const ToolWidget = ({ toolItem, size = 'small' }) => {
  const Icon = toolItem.icon;
  
  const sizeClasses = {
    small: 'col-span-1 h-28',
    medium: 'col-span-2 h-28',
    large: 'col-span-2 h-36'
  };

  const getColorClasses = (color) => {
    switch (color) {
      case 'blue':
        return {
          gradient: 'from-slate-800 to-blue-900 dark:from-blue-100 dark:to-slate-50',
          icon: 'bg-blue-400 dark:bg-blue-600',
          accent: 'bg-blue-300 dark:bg-blue-700'
        };
      case 'green':
        return {
          gradient: 'from-slate-800 to-green-900 dark:from-green-100 dark:to-slate-50',
          icon: 'bg-green-400 dark:bg-green-600',
          accent: 'bg-green-300 dark:bg-green-700'
        };
      case 'purple':
        return {
          gradient: 'from-slate-800 to-purple-900 dark:from-purple-100 dark:to-slate-50',
          icon: 'bg-purple-400 dark:bg-purple-600',
          accent: 'bg-purple-300 dark:bg-purple-700'
        };
      case 'red':
        return {
          gradient: 'from-slate-800 to-red-900 dark:from-red-100 dark:to-slate-50',
          icon: 'bg-red-400 dark:bg-red-600',
          accent: 'bg-red-300 dark:bg-red-700'
        };
      case 'orange':
        return {
          gradient: 'from-slate-800 to-orange-900 dark:from-orange-100 dark:to-slate-50',
          icon: 'bg-orange-400 dark:bg-orange-600',
          accent: 'bg-orange-300 dark:bg-orange-700'
        };
      case 'yellow':
        return {
          gradient: 'from-slate-800 to-yellow-900 dark:from-yellow-100 dark:to-slate-50',
          icon: 'bg-yellow-400 dark:bg-yellow-600',
          accent: 'bg-yellow-300 dark:bg-yellow-700'
        };
      default:
        return {
          gradient: 'from-slate-800 to-gray-900 dark:from-gray-100 dark:to-slate-50',
          icon: 'bg-gray-400 dark:bg-gray-600',
          accent: 'bg-gray-300 dark:bg-gray-700'
        };
    }
  };

  const renderWidgetContent = () => {
    const colors = getColorClasses(toolItem.color);
    
    return (
      <div className={`w-full h-full bg-gradient-to-br ${colors.gradient} rounded-lg overflow-hidden`}>
        <div className="p-2 h-full flex flex-col justify-center items-center">
          <div className={`w-8 h-8 ${colors.icon} rounded-lg flex items-center justify-center mb-2`}>
            <Icon className="w-4 h-4 text-white dark:text-blue-100" />
          </div>
          <div className="flex gap-1">
            <div className={`w-1 h-2 ${colors.accent} rounded`}></div>
            <div className={`w-1 h-3 ${colors.icon} rounded`}></div>
            <div className={`w-1 h-2 ${colors.accent} rounded opacity-70`}></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} bg-black dark:bg-white backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-gray-200/20 dark:border-gray-700/30 transition-all duration-300 hover:shadow-md hover:scale-[1.02]`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex flex-col h-full gap-2">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-medium text-xs leading-tight text-white dark:text-black">
            {toolItem.name}
          </h3>
        </div>
        <div className="flex-1 min-h-0">
          {renderWidgetContent()}
        </div>
      </div>
    </motion.div>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Tools</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Advanced Trading Suite</p>
        </div>

        {/* Advanced Tools Widget Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Trading Journal - Large Widget */}
          <ToolWidget toolItem={toolItems[0]} size="large" />
          
          {/* Economic Calendar */}
          <ToolWidget toolItem={toolItems[1]} size="small" />
          
          {/* Risk Calculator */}
          <ToolWidget toolItem={toolItems[2]} size="small" />
          
          {/* Trade Analyst - Medium Widget */}
          <ToolWidget toolItem={toolItems[3]} size="medium" />
          
          {/* Opportunity Scanner */}
          <ToolWidget toolItem={toolItems[4]} size="small" />
          
          {/* Risk Simulator */}
          <ToolWidget toolItem={toolItems[5]} size="small" />
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