
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Activity,
  Brain
} from 'lucide-react';

interface AdaptiveRateLimitStatusProps {
  trustScore: number;
  riskCategory: string;
  threatLevel: string;
  attemptsLeft: number;
  requiresCaptcha: boolean;
  additionalVerification: boolean;
  systemLoad?: any;
  isAdapting: boolean;
  statusMessage: string;
}

export const AdaptiveRateLimitStatus: React.FC<AdaptiveRateLimitStatusProps> = ({
  trustScore,
  riskCategory,
  threatLevel,
  attemptsLeft,
  requiresCaptcha,
  additionalVerification,
  systemLoad,
  isAdapting,
  statusMessage,
}) => {
  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getThreatLevelBadge = (level: string) => {
    const variants = {
      low: 'bg-green-500/10 text-green-400 border-green-500/20',
      medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    
    return (
      <Badge className={`${variants[level as keyof typeof variants]} font-medium`}>
        {level.toUpperCase()}
      </Badge>
    );
  };

  const getRiskCategoryIcon = (category: string) => {
    switch (category) {
      case 'trusted':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'risky':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'suspicious':
        return <Shield className="w-4 h-4 text-orange-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" />
            <span className="text-white font-medium">Smart Security Status</span>
            {isAdapting && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />
            )}
          </div>
          {getThreatLevelBadge(threatLevel)}
        </div>

        {/* Status Message */}
        <div className="p-3 rounded-md bg-gray-800/50 border border-gray-600/30">
          <p className="text-gray-300 text-sm">{statusMessage}</p>
        </div>

        {/* Trust Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Trust Score</span>
            <span className={`font-bold ${getTrustScoreColor(trustScore)}`}>
              {trustScore}/100
            </span>
          </div>
          <Progress 
            value={trustScore} 
            className="h-2 bg-gray-700"
          />
        </div>

        {/* Risk Category & Attempts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {getRiskCategoryIcon(riskCategory)}
              <span className="text-gray-300 text-sm">Risk Level</span>
            </div>
            <p className="text-white font-medium capitalize">{riskCategory}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300 text-sm">Attempts Left</span>
            </div>
            <p className="text-white font-medium">{attemptsLeft}</p>
          </div>
        </div>

        {/* Security Features */}
        {(requiresCaptcha || additionalVerification) && (
          <div className="space-y-2">
            <h4 className="text-gray-300 text-sm font-medium">Required Verification</h4>
            <div className="flex flex-wrap gap-2">
              {requiresCaptcha && (
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                  CAPTCHA Required
                </Badge>
              )}
              {additionalVerification && (
                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                  Additional Verification
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* System Load Indicator */}
        {systemLoad && (
          <div className="space-y-2 pt-2 border-t border-gray-700/50">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">System Load</span>
              <div className="flex items-center gap-1">
                {systemLoad.cpuUsage > 80 ? (
                  <TrendingUp className="w-3 h-3 text-red-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-green-400" />
                )}
                <span className="text-gray-400 text-xs">
                  {Math.round(systemLoad.cpuUsage)}% CPU
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Adaptive Features Notice */}
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-700/50">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Adaptive security: Limits adjust based on behavior and threat level</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
