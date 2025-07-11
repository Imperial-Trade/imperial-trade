
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
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <div className={`flex items-center text-xs ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0]}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your trading activity today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/dashboard/new-signal">
              <Plus className="w-4 h-4 mr-2" />
              New Signal
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Signals"
          value="12"
          change="+2 from yesterday"
          trend="up"
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatCard
          title="Win Rate"
          value="68%"
          change="+5% from last week"
          trend="up"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="Total PnL"
          value="$2,458"
          change="+12% from last month"
          trend="up"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Followers"
          value="1,234"
          change="+18 new followers"
          trend="up"
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Recent Signals
            </CardTitle>
            <CardDescription>
              View and manage your latest trading signals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link to="/dashboard/signals">
                View Signals
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Community Forum
            </CardTitle>
            <CardDescription>
              Connect with other traders and share insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link to="/dashboard/forum">
                Join Discussion
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Live Sessions
            </CardTitle>
            <CardDescription>
              Join upcoming educational sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Management Tools
              <Badge variant="secondary">
                {isAdmin ? 'Admin' : 'Educator'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Access your management and administrative tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {isAdmin && (
                <Button variant="outline" asChild>
                  <Link to="/dashboard/admin">Admin Panel</Link>
                </Button>
              )}
              {(isAdmin || isEducator) && (
                <Button variant="outline" asChild>
                  <Link to="/dashboard/educator/signals">Manage Signals</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest trading activity and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg border">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">EUR/USD Long signal triggered</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
              <Badge variant="secondary">+2.5%</Badge>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-lg border">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New follower joined</p>
                <p className="text-xs text-muted-foreground">4 hours ago</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-lg border">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">GBP/JPY signal closed</p>
                <p className="text-xs text-muted-foreground">6 hours ago</p>
              </div>
              <Badge variant="outline">-1.2%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
