
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
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, trend, icon }) => (
  <Card className="glass-effect hover:shadow-2xl transition-all duration-300 border-0 animate-scale-in">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="text-primary p-2 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold imperial-gradient-text mb-2">{value}</div>
      {change && (
        <div className={`flex items-center text-sm font-medium ${
          trend === 'up' ? 'text-green-400' : 'text-red-400'
        }`}>
          {trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
          {change}
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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="animate-fade-in-up">
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              Welcome back, <span className="imperial-gradient-text">{user?.user_metadata?.display_name || user?.email?.split('@')[0]}</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Here's what's happening with your trading activity today.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-medium shadow-lg hover:shadow-xl transition-all">
              <Link to="/dashboard/new-signal">
                <Plus className="w-4 h-4 mr-2" />
                New Signal
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Signals"
            value="12"
            change="+2 from yesterday"
            trend="up"
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <StatCard
            title="Win Rate"
            value="68%"
            change="+5% from last week"
            trend="up"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            title="Total PnL"
            value="$2,458"
            change="+12% from last month"
            trend="up"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Followers"
            value="1,234"
            change="+18 new followers"
            trend="up"
            icon={<Users className="h-5 w-5" />}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="glass-effect hover:shadow-2xl transition-all duration-300 cursor-pointer group border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-full bg-gradient-to-r from-blue-400/20 to-blue-600/20">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                </div>
                Recent Signals
              </CardTitle>
              <CardDescription className="text-base">
                View and manage your latest trading signals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-blue-600 group-hover:text-white transition-all">
                <Link to="/dashboard/signals">
                  View Signals
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-effect hover:shadow-2xl transition-all duration-300 cursor-pointer group border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-full bg-gradient-to-r from-purple-400/20 to-purple-600/20">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                Community Forum
              </CardTitle>
              <CardDescription className="text-base">
                Connect with other traders and share insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-purple-600 group-hover:text-white transition-all">
                <Link to="/dashboard/forum">
                  Join Discussion
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-effect hover:shadow-2xl transition-all duration-300 cursor-pointer group border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-full bg-gradient-to-r from-green-400/20 to-green-600/20">
                  <Bell className="w-5 h-5 text-green-500" />
                </div>
                Live Sessions
              </CardTitle>
              <CardDescription className="text-base">
                Join upcoming educational sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full group-hover:bg-gradient-to-r group-hover:from-green-400 group-hover:to-green-600 group-hover:text-white transition-all">
                <Link to="/dashboard/live">
                  View Schedule
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Admin/Educator Specific Sections */}
        {(isAdmin || isEducator) && (
          <Card className="glass-effect border-0">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-xl">
                Management Tools
                <Badge className="bg-gradient-to-r from-orange-400 to-orange-600 text-white">
                  {isAdmin ? 'Admin' : 'Educator'}
                </Badge>
              </CardTitle>
              <CardDescription className="text-base">
                Access your management and administrative tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                {isAdmin && (
                  <Button variant="outline" asChild className="hover:bg-gradient-to-r hover:from-orange-400 hover:to-orange-600 hover:text-white transition-all">
                    <Link to="/dashboard/admin">Admin Panel</Link>
                  </Button>
                )}
                {(isAdmin || isEducator) && (
                  <Button variant="outline" asChild className="hover:bg-gradient-to-r hover:from-orange-400 hover:to-orange-600 hover:text-white transition-all">
                    <Link to="/dashboard/educator/signals">Manage Signals</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="glass-effect border-0">
          <CardHeader>
            <CardTitle className="text-xl">Recent Activity</CardTitle>
            <CardDescription className="text-base">
              Your latest trading activity and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl glass-effect">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <p className="font-medium">EUR/USD Long signal triggered</p>
                  <p className="text-sm text-muted-foreground">2 hours ago</p>
                </div>
                <Badge className="bg-green-500 text-white">+2.5%</Badge>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-xl glass-effect">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <p className="font-medium">New follower joined</p>
                  <p className="text-sm text-muted-foreground">4 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-xl glass-effect">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <p className="font-medium">GBP/JPY signal closed</p>
                  <p className="text-sm text-muted-foreground">6 hours ago</p>
                </div>
                <Badge variant="outline">-1.2%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
