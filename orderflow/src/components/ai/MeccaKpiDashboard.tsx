import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Shield, Zap, Activity, DollarSign, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalysisResult {
  screenshot_urls?: string[];
  platform_identified?: string;
  timeframe_detected?: string;
  user_feedback_score?: number;
  extracted_data?: {
    account_balance?: string;
    equity?: string;
    total_pnl?: string;
  };
  trading_style_indicators?: {
    warning_signs?: string[];
    discipline_signs?: string[];
    experience_level?: string;
  };
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
      icon: Activity,
      label: 'Screenshots Analyzed',
      value: (analysisResult?.screenshot_urls?.length || 0).toString(),
      trend: 'neutral',
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      icon: BarChart3,
      label: 'Platform Detected',
      value: analysisResult?.platform_identified || 'Unknown',
      trend: 'neutral',
      color: 'violet',
      gradient: 'from-violet-500 to-purple-600'
    },
    {
      icon: Target,
      label: 'Analysis Quality',
      value: analysisResult?.user_feedback_score ? `${analysisResult.user_feedback_score}/5` : 'Pending',
      trend: 'neutral',
      color: 'emerald',
      gradient: 'from-emerald-500 to-green-600'
    },
    {
      icon: DollarSign,
      label: 'Visual Balance',
      value: analysisResult?.extracted_data?.account_balance ? `$${analysisResult.extracted_data.account_balance}` : 'N/A',
      trend: 'neutral',
      color: 'amber',
      gradient: 'from-amber-500 to-orange-600'
    },
    {
      icon: Shield,
      label: 'Risk Indicators',
      value: (analysisResult?.trading_style_indicators?.warning_signs?.length || 0).toString(),
      trend: (analysisResult?.trading_style_indicators?.warning_signs?.length || 0) === 0 ? 'up' : 'down',
      color: (analysisResult?.trading_style_indicators?.warning_signs?.length || 0) === 0 ? 'emerald' : 'red',
      gradient: (analysisResult?.trading_style_indicators?.warning_signs?.length || 0) === 0 ? 'from-emerald-500 to-green-600' : 'from-red-500 to-rose-600'
    },
    {
      icon: Zap,
      label: 'Timeframe Coverage',
      value: analysisResult?.timeframe_detected || 'Unknown',
      trend: 'neutral',
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-600'
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