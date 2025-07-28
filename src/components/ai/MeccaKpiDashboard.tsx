import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Shield, Zap, Activity, DollarSign, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalysisResult {
  performance_metrics?: {
    win_rate?: number;
    total_pnl?: number;
    risk_score?: number;
    trades_analyzed?: number;
    profit_factor?: number;
    portfolio_value?: number;
  };
}

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

interface MeccaKpiDashboardProps {
  analysisResult?: AnalysisResult;
  isAnalyzing?: boolean;
}

export const MeccaKpiDashboard: React.FC<MeccaKpiDashboardProps> = ({ 
  analysisResult, 
  isAnalyzing = false 
}) => {

  // Extract metrics from screenshot analysis results
  const metrics = analysisResult?.performance_metrics;

  const kpiData = [
    {
      icon: Target,
      label: 'Win Rate',
      value: `${metrics?.win_rate || 0}%`,
      trend: (metrics?.win_rate || 0) >= 60 ? 'up' : (metrics?.win_rate || 0) < 40 ? 'down' : 'neutral',
      color: (metrics?.win_rate || 0) >= 60 ? 'emerald' : (metrics?.win_rate || 0) < 40 ? 'red' : 'violet',
      gradient: (metrics?.win_rate || 0) >= 60 ? 'from-emerald-500 to-green-600' : (metrics?.win_rate || 0) < 40 ? 'from-red-500 to-rose-600' : 'from-violet-500 to-purple-600'
    },
    {
      icon: DollarSign,
      label: 'Total P&L',
      value: `$${metrics?.total_pnl || 0}`,
      trend: (metrics?.total_pnl || 0) > 0 ? 'up' : (metrics?.total_pnl || 0) < 0 ? 'down' : 'neutral',
      color: (metrics?.total_pnl || 0) >= 0 ? 'emerald' : 'red',
      gradient: (metrics?.total_pnl || 0) >= 0 ? 'from-emerald-500 to-green-600' : 'from-red-500 to-rose-600'
    },
    {
      icon: Shield,
      label: 'Risk Score',
      value: `${metrics?.risk_score || 0}/10`,
      trend: (metrics?.risk_score || 0) <= 3 ? 'up' : (metrics?.risk_score || 0) >= 7 ? 'down' : 'neutral',
      color: (metrics?.risk_score || 0) <= 3 ? 'emerald' : (metrics?.risk_score || 0) >= 7 ? 'red' : 'amber',
      gradient: (metrics?.risk_score || 0) <= 3 ? 'from-emerald-500 to-green-600' : (metrics?.risk_score || 0) >= 7 ? 'from-red-500 to-rose-600' : 'from-amber-500 to-orange-600'
    },
    {
      icon: Activity,
      label: 'Trades Analyzed',
      value: (metrics?.trades_analyzed || 0).toString(),
      trend: 'neutral',
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      icon: Zap,
      label: 'Profit Factor',
      value: `${metrics?.profit_factor || 0}x`,
      trend: (metrics?.profit_factor || 0) > 1.5 ? 'up' : (metrics?.profit_factor || 0) < 1 ? 'down' : 'neutral',
      color: (metrics?.profit_factor || 0) > 1.5 ? 'emerald' : (metrics?.profit_factor || 0) < 1 ? 'red' : 'violet',
      gradient: (metrics?.profit_factor || 0) > 1.5 ? 'from-emerald-500 to-green-600' : (metrics?.profit_factor || 0) < 1 ? 'from-red-500 to-rose-600' : 'from-violet-500 to-purple-600'
    },
    {
      icon: BarChart3,
      label: 'Portfolio Value',
      value: `$${metrics?.portfolio_value || 0}`,
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
          isLoading={isAnalyzing}
        />
      ))}
    </motion.div>
  );
};