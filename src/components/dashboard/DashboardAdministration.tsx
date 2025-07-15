import React from 'react';
import { Settings, Users, FileText, Shield, Database, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DashboardAdministration() {
  const adminSections = [
    {
      title: "User Management",
      description: "Manage user accounts, roles, and permissions",
      icon: Users,
      color: "text-blue-500",
      items: ["View All Users", "Manage Roles", "User Activity"]
    },
    {
      title: "Content Management", 
      description: "Manage educational content and resources",
      icon: FileText,
      color: "text-green-500",
      items: ["Upload Videos", "Create Courses", "Manage Quizzes"]
    },
    {
      title: "Security & Compliance",
      description: "Monitor security and compliance settings", 
      icon: Shield,
      color: "text-red-500",
      items: ["Audit Logs", "Security Settings", "Compliance Reports"]
    },
    {
      title: "System Analytics",
      description: "View system performance and usage analytics",
      icon: TrendingUp,
      color: "text-purple-500", 
      items: ["User Analytics", "Performance Metrics", "Usage Reports"]
    },
    {
      title: "Database Management",
      description: "Manage database operations and backups",
      icon: Database,
      color: "text-orange-500",
      items: ["Backup Status", "Data Export", "System Health"]
    }
  ];

  const systemStats = [
    { label: "Total Users", value: "1,247", change: "+12%" },
    { label: "Active Sessions", value: "342", change: "+5%" }, 
    { label: "System Uptime", value: "99.9%", change: "Stable" },
    { label: "Storage Used", value: "68%", change: "+2%" }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Administration</h1>
          <p className="text-muted-foreground">System management and administrative controls</p>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {systemStats.map((stat, index) => (
          <Card key={index} className="border border-border/50 bg-background/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <Badge variant="secondary" className="text-xs mt-1">
                {stat.change}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admin Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section, index) => (
          <Card key={index} className="border border-border/50 bg-background/95 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <section.icon className={`h-5 w-5 ${section.color}`} />
                {section.title}
              </CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    {item}
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full">
                Manage
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Admin Activities */}
      <Card className="border border-border/50 bg-background/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Recent Administrative Activities</CardTitle>
          <CardDescription>Latest system administration actions and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">New user registration approved</p>
                  <p className="text-xs text-muted-foreground">john.doe@email.com - 2 hours ago</p>
                </div>
              </div>
              <Badge variant="secondary">User Management</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">System backup completed successfully</p>
                  <p className="text-xs text-muted-foreground">Database backup - 6 hours ago</p>
                </div>
              </div>
              <Badge variant="secondary">System</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">New course content uploaded</p>
                  <p className="text-xs text-muted-foreground">"Advanced Trading Strategies" - Yesterday</p>
                </div>
              </div>
              <Badge variant="secondary">Content</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}