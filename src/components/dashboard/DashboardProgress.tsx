import React from 'react';
import { BarChart3, Trophy, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function DashboardProgress() {
  const progressStats = [
    {
      title: "Trading Course Progress",
      description: "Complete educational pathways",
      progress: 65,
      icon: Target,
      color: "text-blue-500"
    },
    {
      title: "Monthly Performance",
      description: "Trading accuracy this month",
      progress: 78,
      icon: TrendingUp,
      color: "text-green-500"
    },
    {
      title: "Risk Management",
      description: "Risk control adherence",
      progress: 92,
      icon: Trophy,
      color: "text-yellow-500"
    }
  ];

  const achievements = [
    { name: "First Trade", earned: true },
    { name: "Educational Progress", earned: true },
    { name: "Risk Management", earned: true },
    { name: "Consistency King", earned: false },
    { name: "Elite Trader", earned: false }
  ];

  return (
    <div className="min-h-screen bg-background overflow-y-auto pt-0 lg:pt-20 pb-20 md:pb-6">
      <div className="container mx-auto p-2 sm:p-6 space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Progress</h1>
          <p className="text-muted-foreground">Track your trading journey and achievements</p>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {progressStats.map((stat, index) => (
          <Card key={index} className="border border-border/50 bg-background/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.progress}%</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
              <Progress value={stat.progress} className="mt-3" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Achievements Section */}
      <Card className="border border-border/50 bg-background/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Achievements
          </CardTitle>
          <CardDescription>Your trading milestones and accomplishments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {achievements.map((achievement, index) => (
              <div key={index} className="text-center space-y-2">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                  achievement.earned 
                    ? 'bg-yellow-500/20 border-2 border-yellow-500/50' 
                    : 'bg-muted border-2 border-border'
                }`}>
                  <Trophy className={`h-8 w-8 ${
                    achievement.earned ? 'text-yellow-500' : 'text-muted-foreground'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{achievement.name}</p>
                  <Badge variant={achievement.earned ? "default" : "secondary"} className="text-xs">
                    {achievement.earned ? "Earned" : "Locked"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border border-border/50 bg-background/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest trading and learning activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Completed "Risk Management Basics"</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Educational analysis on EURUSD</p>
                <p className="text-xs text-muted-foreground">Yesterday</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Achieved "Risk Management" badge</p>
                <p className="text-xs text-muted-foreground">3 days ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}