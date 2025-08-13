import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Bell,
  AlertTriangle,
  Check,
} from "lucide-react";

interface AnalyticsData {
  date: string;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_failed: number;
  delivery_rate: number;
  open_rate: number;
  avg_delivery_time_seconds: number;
  platform_breakdown: Record<string, number>;
  error_breakdown: Record<string, number>;
}

interface DailyStats {
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_failed: number;
  delivery_rate: number;
  open_rate: number;
  active_users: number;
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088fe"];

export const NotificationAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [timeRange, setTimeRange] = useState("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      // Load analytics data
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("notification_analytics")
        .select("*")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (analyticsError) throw analyticsError;

      // Transform and calculate missing fields
      const transformedData = (analyticsData || []).map((item) => ({
        ...item,
        delivery_rate:
          item.total_sent > 0
            ? (item.total_delivered / item.total_sent) * 100
            : 0,
        open_rate:
          item.total_delivered > 0
            ? (item.total_opened / item.total_delivered) * 100
            : 0,
        platform_breakdown: item.platform_breakdown as Record<string, number>,
        error_breakdown: item.error_breakdown as Record<string, number>,
      }));

      setAnalytics(transformedData);

      // Calculate daily stats (today's data)
      const today = new Date().toISOString().split("T")[0];
      const todayData = analyticsData?.find((d) => d.date === today);

      if (todayData) {
        const deliveryRate =
          todayData.total_sent > 0
            ? (todayData.total_delivered / todayData.total_sent) * 100
            : 0;
        const openRate =
          todayData.total_delivered > 0
            ? (todayData.total_opened / todayData.total_delivered) * 100
            : 0;

        setDailyStats({
          total_sent: todayData.total_sent,
          total_delivered: todayData.total_delivered,
          total_opened: todayData.total_opened,
          total_failed: todayData.total_failed,
          delivery_rate: deliveryRate,
          open_rate: openRate,
          active_users: 0, // Could be calculated from user_notification_preferences
        });
      }
    } catch (error) {
      logger.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDeliveryRate = (rate: number) => `${rate.toFixed(1)}%`;
  const formatNumber = (num: number) => num.toLocaleString();

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous)
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (current < previous)
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    return null;
  };

  const platformData = dailyStats
    ? Object.entries(
        analytics[analytics.length - 1]?.platform_breakdown || {}
      ).map(([platform, count]) => ({
        name: platform,
        value: count,
      }))
    : [];

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse bg-muted h-48 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Notification Analytics</h3>
          <p className="text-muted-foreground">
            Performance metrics and delivery insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadAnalytics}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {dailyStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Sent Today
                  </p>
                  <p className="text-2xl font-bold">
                    {formatNumber(dailyStats.total_sent)}
                  </p>
                </div>
                <Bell className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Delivery Rate
                  </p>
                  <p className="text-2xl font-bold">
                    {formatDeliveryRate(dailyStats.delivery_rate)}
                  </p>
                </div>
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Open Rate
                  </p>
                  <p className="text-2xl font-bold">
                    {formatDeliveryRate(dailyStats.open_rate)}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Failed
                  </p>
                  <p className="text-2xl font-bold">
                    {formatNumber(dailyStats.total_failed)}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delivery Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total_sent"
                stroke="#8884d8"
                name="Sent"
              />
              <Line
                type="monotone"
                dataKey="total_delivered"
                stroke="#82ca9d"
                name="Delivered"
              />
              <Line
                type="monotone"
                dataKey="total_opened"
                stroke="#ffc658"
                name="Opened"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {platformData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="delivery_rate"
                  fill="#82ca9d"
                  name="Delivery Rate %"
                />
                <Bar dataKey="open_rate" fill="#ffc658" name="Open Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics
              .slice(-7)
              .reverse()
              .map((day, index) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">{day.date}</div>
                    <Badge
                      variant={
                        day.delivery_rate >= 95
                          ? "default"
                          : day.delivery_rate >= 90
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {formatDeliveryRate(day.delivery_rate)} delivery
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatNumber(day.total_sent)} sent</span>
                    <span>{formatNumber(day.total_delivered)} delivered</span>
                    <span>{formatNumber(day.total_opened)} opened</span>
                    {day.total_failed > 0 && (
                      <span className="text-red-500">
                        {formatNumber(day.total_failed)} failed
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
