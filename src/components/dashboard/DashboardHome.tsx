
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Users, 
  Bell,
  Plus,
  ArrowRight,
  Activity,
  Target,
  Zap,
  Star,
  Award,
  Crown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { VideoBackground } from '@/components/account-request/VideoBackground';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, trend, icon }) => (
  <Card className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/20 hover:border-lightGreenHover dark:hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">{/* Green border on hover for light mode */}
    {/* Gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    
    <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        {title}
      </CardTitle>
      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
    </CardHeader>
    <CardContent className="relative">
      <div className="text-3xl font-bold tracking-tight mb-1 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
        {value}
      </div>
      {change && (
        <div className={`flex items-center text-sm font-medium ${
          trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {trend === 'up' ? (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>{change}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <TrendingDown className="w-4 h-4" />
              <span>{change}</span>
            </div>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.user_metadata?.access_level === 'admin';
  const isEducator = user?.user_metadata?.user_type === 'educator';

  return (
    <div className="relative min-h-screen">
      {/* Video Background */}
      <VideoBackground />
      
      {/* Hero Section with Heartfelt Welcome */}
      <div className="relative z-20 min-h-[60vh] flex items-center">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Welcome Message */}
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-bold text-white mb-4">
                Welcome Home,{' '}
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  {user?.user_metadata?.first_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Trader'}
                </span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                You've taken the brave step into the world of trading. Every expert was once a beginner, 
                and every champion was once a contender who refused to give up.
              </p>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 max-w-2xl mx-auto">
                <p className="text-lg text-white/95 italic leading-relaxed">
                  "Success in trading comes not from being right all the time, but from learning, 
                  adapting, and growing with every trade. Your journey starts here, and we're honored 
                  to be part of it."
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-white/80 font-medium">The Trading Elite Team</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button 
                asChild 
                size="lg" 
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-2xl hover:shadow-primary/25 transition-all duration-300 group border-0"
              >
                <Link to="/dashboard/new-signal">
                  <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  Start Your Journey
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 backdrop-blur-sm transition-all duration-300"
              >
                <Activity className="w-5 h-5 mr-2" />
                Explore Markets
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Stats Grid */}
      <div className="container mx-auto px-6 mb-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Signals"
            value="127"
            change="+15% from yesterday"
            trend="up"
            icon={<Target className="h-5 w-5" />}
          />
          <StatCard
            title="Win Rate"
            value="84.2%"
            change="+7.3% this week"
            trend="up"
            icon={<Award className="h-5 w-5" />}
          />
          <StatCard
            title="Total PnL"
            value="$47,892"
            change="+23.8% this month"
            trend="up"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Portfolio Value"
            value="$2.4M"
            change="+$127K today"
            trend="up"
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Advanced Trading Hub */}
      <div className="container mx-auto px-6 mb-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight mb-2">Trading Hub</h2>
          <p className="text-muted-foreground">Access your most important trading tools and insights</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/20 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">Signal Analytics</CardTitle>
                  <CardDescription className="text-sm">Real-time performance tracking</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-muted-foreground mb-4">Monitor your signals with advanced analytics and performance metrics.</p>
              <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <Link to="/dashboard/signal-stream">
                  View Analytics
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/20 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-green-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">Elite Community</CardTitle>
                  <CardDescription className="text-sm">Connect with top traders</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-muted-foreground mb-4">Join discussions with verified traders and industry experts.</p>
              <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <Link to="/dashboard/forum">
                  Join Community
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/20 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">Live Market</CardTitle>
                  <CardDescription className="text-sm">Professional trading sessions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-muted-foreground mb-4">Participate in live trading sessions with market experts.</p>
              <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <Link to="/dashboard/live">
                  Join Session
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Admin/Educator Premium Section */}
      {(isAdmin || isEducator) && (
        <div className="container mx-auto px-6 mb-12">
          <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-card/50 to-accent/5 backdrop-blur-sm border-primary/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl"></div>
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold">Premium Management Suite</CardTitle>
                    <CardDescription>Advanced tools for {isAdmin ? 'administrators' : 'educators'}</CardDescription>
                  </div>
                </div>
                <Badge 
                  variant="secondary" 
                  className="bg-primary/20 text-primary border-primary/30 px-3 py-1"
                >
                  {isAdmin ? 'Admin Access' : 'Educator Pro'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {isAdmin && (
                  <Button 
                    asChild 
                    variant="outline" 
                    className="justify-start h-auto p-4 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                  >
                    <Link to="/dashboard/admin">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Admin Panel</div>
                          <div className="text-xs text-muted-foreground">System management</div>
                        </div>
                      </div>
                    </Link>
                  </Button>
                )}
                {(isAdmin || isEducator) && (
                  <Button 
                    asChild 
                    variant="outline" 
                    className="justify-start h-auto p-4 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                  >
                    <Link to="/dashboard/educator/signals">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Target className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Signal Management</div>
                          <div className="text-xs text-muted-foreground">Create & manage signals</div>
                        </div>
                      </div>
                    </Link>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="justify-start h-auto p-4 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Star className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Analytics Dashboard</div>
                      <div className="text-xs text-muted-foreground">Performance insights</div>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Premium Activity Feed */}
      <div className="container mx-auto px-6">
        <Card className="relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/20">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary"></div>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Live Activity Feed
                </CardTitle>
                <CardDescription>Real-time updates from your trading ecosystem</CardDescription>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse"></div>
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="group flex items-center gap-4 p-4 rounded-xl border border-border/20 hover:border-green-500/30 hover:bg-green-500/5 transition-all duration-300">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                <div className="flex-1">
                  <p className="font-medium">BTC/USD Breakout Signal Executed</p>
                  <p className="text-sm text-muted-foreground">Position opened at $67,245 • Entry confirmed</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">+4.7%</Badge>
                  <span className="text-xs text-muted-foreground">2 min ago</span>
                </div>
              </div>
              
              <div className="group flex items-center gap-4 p-4 rounded-xl border border-border/20 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-300">
                <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></div>
                <div className="flex-1">
                  <p className="font-medium">Premium Member Joined Your Signals</p>
                  <p className="text-sm text-muted-foreground">@TraderPro_Alex started following your EUR/GBP analysis</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">New Follower</Badge>
                  <span className="text-xs text-muted-foreground">8 min ago</span>
                </div>
              </div>
              
              <div className="group flex items-center gap-4 p-4 rounded-xl border border-border/20 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all duration-300">
                <div className="w-3 h-3 bg-purple-500 rounded-full shadow-lg shadow-purple-500/50"></div>
                <div className="flex-1">
                  <p className="font-medium">AI Analysis Complete</p>
                  <p className="text-sm text-muted-foreground">Market sentiment analysis updated • 73% bullish across major pairs</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">AI Insights</Badge>
                  <span className="text-xs text-muted-foreground">15 min ago</span>
                </div>
              </div>

              <div className="group flex items-center gap-4 p-4 rounded-xl border border-border/20 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-300">
                <div className="w-3 h-3 bg-amber-500 rounded-full shadow-lg shadow-amber-500/50"></div>
                <div className="flex-1">
                  <p className="font-medium">Take Profit Triggered</p>
                  <p className="text-sm text-muted-foreground">EUR/USD Long position closed at TP2 level • 68 pips captured</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">+$2,847</Badge>
                  <span className="text-xs text-muted-foreground">1 hour ago</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
