import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Zap } from 'lucide-react';

interface MarketImpactIndicatorProps {
  impact: 'high' | 'medium' | 'low';
  actual?: string;
  forecast?: string;
  className?: string;
}

const MarketImpactIndicator = memo(({ 
  impact, 
  actual, 
  forecast, 
  className = "" 
}: MarketImpactIndicatorProps) => {
  
  const getImpactConfig = (level: string) => {
    switch (level) {
      case 'high':
        return {
          color: 'text-red-400 bg-red-500/10 border-red-500/20',
          icon: <Zap className="w-4 h-4" />,
          text: 'Market Mover',
          description: 'Expect significant price movement'
        };
      case 'medium':
        return {
          color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
          icon: <AlertTriangle className="w-4 h-4" />,
          text: 'Moderate Impact',
          description: 'May cause noticeable movement'
        };
      case 'low':
        return {
          color: 'text-green-400 bg-green-500/10 border-green-500/20',
          icon: <TrendingUp className="w-4 h-4" />,
          text: 'Low Impact',
          description: 'Minimal market reaction expected'
        };
      default:
        return {
          color: 'text-muted-foreground bg-muted/10 border-border',
          icon: <TrendingUp className="w-4 h-4" />,
          text: 'Unknown',
          description: 'Impact level unclear'
        };
    }
  };

  const getSurpriseIndicator = () => {
    if (!actual || !forecast) return null;
    
    const actualNum = parseFloat(actual.replace(/[^0-9.-]/g, ''));
    const forecastNum = parseFloat(forecast.replace(/[^0-9.-]/g, ''));
    
    if (isNaN(actualNum) || isNaN(forecastNum)) return null;
    
    const diff = actualNum - forecastNum;
    const diffPercent = Math.abs(diff / forecastNum * 100);
    
    if (Math.abs(diff) < 0.01) {
      return {
        icon: <div className="w-4 h-4 rounded-full bg-blue-500/20 border-2 border-blue-400" />,
        text: 'As Expected',
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      };
    }
    
    const isBetter = diff > 0;
    const magnitude = diffPercent > 10 ? 'Big' : diffPercent > 5 ? 'Moderate' : 'Small';
    
    return {
      icon: isBetter ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
      text: `${magnitude} ${isBetter ? 'Beat' : 'Miss'}`,
      color: isBetter 
        ? 'text-green-400 bg-green-500/10 border-green-500/20' 
        : 'text-red-400 bg-red-500/10 border-red-500/20'
    };
  };

  const config = getImpactConfig(impact);
  const surprise = getSurpriseIndicator();

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Main Impact Indicator */}
      <Badge className={`${config.color} border flex items-center gap-2 px-3 py-1.5`}>
        {config.icon}
        <div className="flex flex-col items-start">
          <span className="text-xs font-semibold">{config.text}</span>
          <span className="text-xs opacity-80">{config.description}</span>
        </div>
      </Badge>

      {/* Surprise Indicator */}
      {surprise && (
        <Badge className={`${surprise.color} border flex items-center gap-2 px-3 py-1.5`}>
          {surprise.icon}
          <div className="flex flex-col items-start">
            <span className="text-xs font-semibold">{surprise.text}</span>
            <span className="text-xs opacity-80">vs forecast</span>
          </div>
        </Badge>
      )}
    </div>
  );
});

MarketImpactIndicator.displayName = 'MarketImpactIndicator';

export default MarketImpactIndicator;