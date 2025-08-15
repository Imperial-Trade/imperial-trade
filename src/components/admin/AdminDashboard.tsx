
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  MessageSquare, 
  AlertTriangle, 
  TrendingUp,
  Database,
  Shield,
  Activity,
  Settings
} from 'lucide-react';


interface AdminStatProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const AdminStat: React.FC<AdminStatProps> = ({ title, value, description, icon, trend }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {trend && (
        <div className={`text-xs mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {trend.isPositive ? '↗' : '↘'} {trend.value}
        </div>
      )}
    </CardContent>
  </Card>
);

export const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Admin Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdminStat
          title="Total Users"
          value={1247}
          description="Active platform users"
          icon={<Users className="h-4 w-4" />}
          trend={{ value: '+12% from last month', isPositive: true }}
        />
        <AdminStat
          title="Account Requests"
          value={23}
          description="Pending approval"
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={{ value: '+5 new today', isPositive: true }}
        />
        <AdminStat
          title="Active Signals"
          value={89}
          description="Currently active"
          icon={<TrendingUp className="h-4 w-4" />}
          trend={{ value: '+8% this week', isPositive: true }}
        />
        <AdminStat
          title="System Health"
          value="99.9%"
          description="Uptime this month"
          icon={<Activity className="h-4 w-4" />}
          trend={{ value: 'All systems operational', isPositive: true }}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user accounts, roles, and permissions
                </CardDescription>
              </div>
              
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active Users:</span>
                <Badge variant="secondary">1,247</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Suspended:</span>
                <Badge variant="destructive">3</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Educators:</span>
                <Badge variant="outline">45</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Content Moderation
            </CardTitle>
            <CardDescription>
              Review and moderate forum posts and signals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Flagged Posts:</span>
                <Badge variant="destructive">7</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pending Review:</span>
                <Badge variant="secondary">12</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Auto-Approved:</span>
                <Badge variant="outline">156</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security & Monitoring
            </CardTitle>
            <CardDescription>
              System security and performance monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Rate Limits:</span>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Failed Logins:</span>
                <Badge variant="secondary">23</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>API Health:</span>
                <Badge variant="outline">Good</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Admin Activity</CardTitle>
          <CardDescription>
            Latest administrative actions and system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg border">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">User account approved</p>
                <p className="text-xs text-muted-foreground">john.doe@example.com - 2 hours ago</p>
              </div>
              <Badge variant="secondary">User</Badge>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-lg border">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Forum post flagged for review</p>
                <p className="text-xs text-muted-foreground">Trading Strategy Discussion - 4 hours ago</p>
              </div>
              <Badge variant="outline">Content</Badge>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-lg border">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">System backup completed</p>
                <p className="text-xs text-muted-foreground">Database backup - 6 hours ago</p>
              </div>
              <Badge variant="outline">System</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
