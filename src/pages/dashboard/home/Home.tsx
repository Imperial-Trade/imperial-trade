
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WelcomeExperience } from '@/components/dashboard/WelcomeExperience';
import { useProfessionalToast } from '@/hooks/useProfessionalToast';
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  Bell,
  Target,
  BarChart3,
  Zap,
  Crown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const { celebrate } = useProfessionalToast();

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Check if user just completed registration
      const searchParams = new URLSearchParams(location.search);
      const fromRegistration = searchParams.get('welcome') === 'true';
      
      if (fromRegistration || (user && isRecentlyCreated(user.created_at))) {
        setIsNewUser(true);
        
        // Show immediate welcome toast
        setTimeout(() => {
          celebrate(
            "🎉 Account Created Successfully!",
            "Welcome to Imperial Trading - your premium trading journey begins now."
          );
        }, 500);
      }
    };

    getCurrentUser();
  }, [location, celebrate]);

  const isRecentlyCreated = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffInMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
    return diffInMinutes < 30; // Consider users new if created within last 30 minutes
  };

  const quickActions = [
    {
      title: 'Live Signals',
      description: 'Access real-time trading signals',
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      action: () => navigate('/dashboard/signal-stream')
    },
    {
      title: 'Learning Center',
      description: 'Expand your trading knowledge',
      icon: BookOpen,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      action: () => navigate('/dashboard/education')
    },
    {
      title: 'Live Trading',
      description: 'Join live trading sessions',
      icon: Target,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      action: () => navigate('/dashboard/live')
    },
    {
      title: 'Analytics',
      description: 'View your trading performance',
      icon: BarChart3,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      action: () => navigate('/dashboard/my-progress')
    }
  ];

  const stats = [
    { label: 'Active Signals', value: '12', change: '+3' },
    { label: 'Success Rate', value: '87%', change: '+2.3%' },
    { label: 'Community Members', value: '2.4K', change: '+156' },
    { label: 'Learning Modules', value: '24', change: '+4' }
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-8 p-6"
      >
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
              IMPERIAL TRADING
            </h1>
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
            </h2>
            <p className="text-muted-foreground">
              Your premium trading dashboard is ready. Let's make today profitable.
            </p>
          </motion.div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ y: -5 }}
            >
              <Card className="glass-effect border-border hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    </div>
                    <Badge variant="secondary" className="text-green-400 bg-green-400/10">
                      {stat.change}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-xl font-semibold text-foreground mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className="glass-effect border-border hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  onClick={action.action}
                >
                  <CardContent className="p-6">
                    <div className={`${action.bgColor} ${action.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-6 h-6" />
                    </div>
                    <h4 className="font-semibold text-foreground mb-2">{action.title}</h4>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="glass-effect border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { action: 'New signal: EUR/USD Long', time: '2 minutes ago', type: 'signal' },
                { action: 'Live session starting soon', time: '15 minutes ago', type: 'live' },
                { action: 'New educational content available', time: '1 hour ago', type: 'education' },
                { action: 'Weekly market analysis published', time: '2 hours ago', type: 'analysis' }
              ].map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'signal' ? 'bg-green-400' :
                      activity.type === 'live' ? 'bg-red-400' :
                      activity.type === 'education' ? 'bg-blue-400' : 'bg-purple-400'
                    }`} />
                    <span className="text-foreground">{activity.action}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{activity.time}</span>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Welcome Experience for New Users */}
      <WelcomeExperience user={user} isNewUser={isNewUser} />
    </>
  );
};

export default Home;
