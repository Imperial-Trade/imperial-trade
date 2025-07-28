import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Shield, Zap, Activity, DollarSign, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTradingMetrics } from '@/hooks/useTradingMetrics';
import { Skeleton } from '@/components/ui/skeleton';

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'emerald' | 'red' | 'violet' | 'blue' | 'amber';
  gradient?: string;
  isLoading?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ 
  icon: Icon, 
  label, 
  value, 
  trend = 'neutral', 
  color = 'violet',
  gradient = 'from-violet-500 to-purple-600',
  isLoading 
}) => {
  if (isLoading) {
    return (
      <Card className="p-3 sm:p-4 bg-card/60 backdrop-blur-sm border-border/30">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </Card>
    );
  }

  const colorClasses = {
    emerald: 'text-emerald-500 bg-emerald-500/10',
    red: 'text-red-500 bg-red-500/10',
    violet: 'text-violet-500 bg-violet-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
    amber: 'text-amber-500 bg-amber-500/10'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className="h-full"
    >
      <Card className="p-3 sm:p-4 h-full bg-card/60 backdrop-blur-sm border-border/30 hover:border-violet-300/50 transition-all duration-300 group">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
                <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
              {trend !== 'neutral' && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  {trend === 'up' ? (
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-1 leading-tight">
              {label}
            </p>
            <p className={`font-bold text-sm sm:text-lg bg-gradient-to-r ${gradient} bg-clip-text text-transparent group-hover:scale-105 transition-transform`}>
              {value}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export const MeccaKpiDashboard: React.FC = () => {
  const { data: metrics, isLoading, error } = useTradingMetrics();

  if (error) {
    return (
      <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/30">
        <p className="text-sm text-muted-foreground text-center">
          Unable to load trading metrics. Please try again.
        </p>
      </Card>
    );
  }

  const kpiData = [
    {
      icon: Target,
      label: 'Win Rate',
      value: `${metrics?.winRate || 0}%`,
      trend: (metrics?.winRate || 0) >= 60 ? 'up' : (metrics?.winRate || 0) < 40 ? 'down' : 'neutral',
      color: (metrics?.winRate || 0) >= 60 ? 'emerald' : (metrics?.winRate || 0) < 40 ? 'red' : 'violet',
      gradient: (metrics?.winRate || 0) >= 60 ? 'from-emerald-500 to-green-600' : (metrics?.winRate || 0) < 40 ? 'from-red-500 to-rose-600' : 'from-violet-500 to-purple-600'
    },
    {
      icon: DollarSign,
      label: 'Total P&L',
      value: `$${metrics?.totalPnL || 0}`,
      trend: (metrics?.totalPnL || 0) > 0 ? 'up' : (metrics?.totalPnL || 0) < 0 ? 'down' : 'neutral',
      color: (metrics?.totalPnL || 0) >= 0 ? 'emerald' : 'red',
      gradient: (metrics?.totalPnL || 0) >= 0 ? 'from-emerald-500 to-green-600' : 'from-red-500 to-rose-600'
    },
    {
      icon: Shield,
      label: 'Risk Score',
      value: `${metrics?.riskScore || 0}/10`,
      trend: (metrics?.riskScore || 0) <= 3 ? 'up' : (metrics?.riskScore || 0) >= 7 ? 'down' : 'neutral',
      color: (metrics?.riskScore || 0) <= 3 ? 'emerald' : (metrics?.riskScore || 0) >= 7 ? 'red' : 'amber',
      gradient: (metrics?.riskScore || 0) <= 3 ? 'from-emerald-500 to-green-600' : (metrics?.riskScore || 0) >= 7 ? 'from-red-500 to-rose-600' : 'from-amber-500 to-orange-600'
    },
    {
      icon: Activity,
      label: 'Total Trades',
      value: (metrics?.totalTrades || 0).toString(),
      trend: 'neutral',
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      icon: Zap,
      label: 'Profit Factor',
      value: `${metrics?.profitFactor || 0}x`,
      trend: (metrics?.profitFactor || 0) > 1.5 ? 'up' : (metrics?.profitFactor || 0) < 1 ? 'down' : 'neutral',
      color: (metrics?.profitFactor || 0) > 1.5 ? 'emerald' : (metrics?.profitFactor || 0) < 1 ? 'red' : 'violet',
      gradient: (metrics?.profitFactor || 0) > 1.5 ? 'from-emerald-500 to-green-600' : (metrics?.profitFactor || 0) < 1 ? 'from-red-500 to-rose-600' : 'from-violet-500 to-purple-600'
    },
    {
      icon: BarChart3,
      label: 'Portfolio Value',
      value: `$${metrics?.portfolioValue || 0}`,
      trend: 'neutral',
      color: 'violet',
      gradient: 'from-violet-500 to-purple-600'
    }
  ] as const;

  return (
    <motion.div 
      className="mecca-kpi-grid"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      {kpiData.map((kpi, index) => (
        <KpiCard
          key={kpi.label}
          icon={kpi.icon}
          label={kpi.label}
          value={kpi.value}
          trend={kpi.trend}
          color={kpi.color}
          gradient={kpi.gradient}
          isLoading={isLoading}
        />
      ))}
    </motion.div>
  );
};