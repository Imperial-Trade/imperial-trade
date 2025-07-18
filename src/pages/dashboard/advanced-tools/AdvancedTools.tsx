
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Calculator,
  Brain,
  Search,
  Scale,
  ChevronLeft,
  Wrench,
  Sparkles,
  ChevronRight,
  MousePointerClick,
  Home,
  TrendingUp,
  GraduationCap,
  Users,
  Settings,
  BarChart3,
  Bell,
  Video,
  User,
  Shield,
  LogOut,
  Signal,
  Zap
} from 'lucide-react';

import { ThemeToggle } from '@/components/theme/ThemeToggle';

import TradingJournal from '@/components/tools/TradingJournal';
import EconomicCalendar from '@/components/tools/EconomicCalendar';
import RiskCalculator from '@/components/tools/RiskCalculator';
import TradeAnalyst from '@/components/ai/TradeAnalyst';
import OpportunityScanner from '@/components/ai/OpportunityScanner';
import RiskSimulator from '@/components/ai/RiskSimulator';

const navItems = [
  { 
    name: 'Home', 
    icon: Home, 
    path: '/dashboard/home',
    description: 'Dashboard overview and quick access to key metrics.'
  },
  { 
    name: 'Signals', 
    icon: Signal, 
    path: '/dashboard/signals',
    description: 'Live trading signals from verified educators.'
  },
  { 
    name: 'Education', 
    icon: GraduationCap, 
    path: '/dashboard/education',
    description: 'Video courses and trading education content.'
  },
  { 
    name: 'Live Sessions', 
    icon: Video, 
    path: '/dashboard/live-sessions',
    description: 'Join live trading sessions and webinars.'
  },
  { 
    name: 'Community', 
    icon: Users, 
    path: '/dashboard/community',
    description: 'Connect with traders and share insights.'
  },
  { 
    name: 'Tools', 
    icon: Zap, 
    path: '/dashboard/advanced-tools',
    description: 'Advanced trading tools and calculators.'
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
      case 'Home':
        return (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-blue-900 dark:from-blue-100 dark:to-slate-50 rounded-lg overflow-hidden">
            <div className="p-2 h-full flex flex-col justify-center items-center">
              <div className="w-8 h-8 bg-blue-400 dark:bg-blue-600 rounded-lg flex items-center justify-center mb-2">
                <Home className="w-4 h-4 text-white dark:text-blue-100" />
              </div>
              <div className="flex gap-1">
                <div className="w-1 h-2 bg-blue-300 dark:bg-blue-700 rounded"></div>
                <div className="w-1 h-3 bg-blue-400 dark:bg-blue-800 rounded"></div>
                <div className="w-1 h-2 bg-blue-200 dark:bg-blue-600 rounded"></div>
              </div>
            </div>
          </div>
        );
      
      case 'Signals':
        return (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-green-900 dark:from-green-100 dark:to-slate-50 rounded-lg overflow-hidden">
            <div className="p-2 h-full">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-green-300 dark:bg-green-700 rounded-full animate-pulse"></div>
                  <div className="h-1 bg-green-200 dark:bg-green-600 rounded flex-1"></div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-green-400 dark:bg-green-800 rounded-full animate-pulse delay-100"></div>
                  <div className="h-1 bg-green-300 dark:bg-green-700 rounded flex-1"></div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-green-500 dark:bg-green-900 rounded-full animate-pulse delay-200"></div>
                  <div className="h-1 bg-green-400 dark:bg-green-800 rounded flex-1"></div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'Education':
        return (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-purple-900 dark:from-purple-100 dark:to-slate-50 rounded-lg overflow-hidden">
            <div className="p-2 h-full flex flex-col justify-center items-center">
              <div className="w-6 h-4 bg-purple-300 dark:bg-purple-700 rounded mb-1"></div>
              <div className="space-y-1 w-full">
                <div className="h-1 bg-purple-200 dark:bg-purple-600 rounded w-3/4 mx-auto"></div>
                <div className="h-1 bg-purple-300 dark:bg-purple-700 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          </div>
        );
      
      case 'Live Sessions':
        return (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-red-900 dark:from-red-100 dark:to-slate-50 rounded-lg overflow-hidden">
            <div className="p-2 h-full flex items-center justify-center">
              <div className="relative">
                <div className="w-6 h-4 bg-red-300 dark:bg-red-700 rounded"></div>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 dark:bg-red-900 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        );
      
      case 'Community':
        return (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-orange-900 dark:from-orange-100 dark:to-slate-50 rounded-lg overflow-hidden">
            <div className="p-2 h-full flex items-center justify-center">
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-orange-300 dark:bg-orange-700 rounded-full"></div>
                <div className="w-3 h-3 bg-orange-400 dark:bg-orange-800 rounded-full"></div>
                <div className="w-3 h-3 bg-orange-200 dark:bg-orange-600 rounded-full"></div>
              </div>
            </div>
          </div>
        );
      
      case 'Tools':
        return (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-yellow-900 dark:from-yellow-100 dark:to-slate-50 rounded-lg overflow-hidden">
            <div className="p-2 h-full flex flex-col justify-center items-center">
              <div className="w-6 h-6 border-2 border-yellow-300 dark:border-yellow-700 rounded flex items-center justify-center mb-1">
                <Zap className="w-3 h-3 text-yellow-200 dark:text-yellow-800" />
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

export default function AdvancedTools() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Apple Today View Style Sidebar */}
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

          {/* Navigation Widget Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Home - Large Widget */}
            <NavWidget navItem={navItems[0]} size="large" />
            
            {/* Signals */}
            <NavWidget navItem={navItems[1]} size="small" />
            
            {/* Education */}
            <NavWidget navItem={navItems[2]} size="small" />
            
            {/* Live Sessions - Medium Widget */}
            <NavWidget navItem={navItems[3]} size="medium" />
            
            {/* Community */}
            <NavWidget navItem={navItems[4]} size="small" />
            
            {/* Tools */}
            <NavWidget navItem={navItems[5]} size="small" />
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

      {/* Main Content */}
      <motion.div 
        className="flex-1 p-6"
        animate={{ 
          marginLeft: 320 
        }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Welcome Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center h-full text-center p-8"
        >
          <div className="relative mb-6">
            <div className="absolute -inset-2 bg-primary/10 rounded-full animate-ping"></div>
            <div className="relative p-5 bg-background rounded-full border border-border">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to the Trading Dashboard</h2>
          <p className="text-muted-foreground max-w-md">
            Select a section from the sidebar to navigate through your trading platform. Access signals, education, tools, and more.
          </p>
          <div className="flex items-center gap-2 mt-6 text-muted-foreground">
            <MousePointerClick className="w-5 h-5" />
            <span>Click any widget in the sidebar to navigate</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
