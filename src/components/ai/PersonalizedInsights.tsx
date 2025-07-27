import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Brain, TrendingUp, Target, Award, BarChart3, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface TradingProfile {
  trading_style: string;
  risk_tolerance: string;
  platform_detected: string;
  performance_benchmarks: any;
  learning_progress: any;
  preferred_assets: string[];
}

interface AnalysisHistory {
  platform_identified: string;
  patterns_detected: any;
  performance_metrics: any;
  created_at: string;
}

export const PersonalizedInsights: React.FC = () => {
  const { user } = useAuth();

  const { data: tradingProfile } = useQuery({
    queryKey: ['user-trading-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_trading_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as TradingProfile | null;
    },
    enabled: !!user?.id
  });

  const { data: analysisHistory } = useQuery({
    queryKey: ['analysis-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('screenshot_analysis_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as AnalysisHistory[];
    },
    enabled: !!user?.id
  });

  const getPersonalizationLevel = () => {
    if (!tradingProfile && !analysisHistory?.length) return 0;
    let level = 0;
    if (tradingProfile?.trading_style) level += 25;
    if (tradingProfile?.platform_detected) level += 25;
    if (analysisHistory && analysisHistory.length > 2) level += 25;
    if (analysisHistory && analysisHistory.length > 5) level += 25;
    return level;
  };

  const getTradingInsights = () => {
    if (!analysisHistory?.length) return [];
    
    const platforms = [...new Set(analysisHistory.map(h => h.platform_identified).filter(Boolean))];
    const recentPatterns = analysisHistory.slice(0, 3).map(h => h.patterns_detected).filter(Boolean);
    
    return [
      { icon: Eye, label: 'Platforms Used', value: platforms.join(', ') || 'Unknown' },
      { icon: BarChart3, label: 'Analysis Sessions', value: analysisHistory.length.toString() },
      { icon: TrendingUp, label: 'Recent Patterns', value: recentPatterns.length > 0 ? 'Active' : 'Building' }
    ];
  };

  const personalizationLevel = getPersonalizationLevel();
  const insights = getTradingInsights();

  return (
    <div className="space-y-6">
      {/* Personalization Status */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Personalization Level
          </CardTitle>
          <CardDescription>
            How well MECCA knows your trading style
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Learning Progress</span>
              <Badge variant={personalizationLevel > 75 ? "default" : "secondary"}>
                {personalizationLevel}%
              </Badge>
            </div>
            <Progress value={personalizationLevel} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {personalizationLevel < 25 && "Upload more screenshots to improve personalization"}
              {personalizationLevel >= 25 && personalizationLevel < 50 && "Getting to know your style..."}
              {personalizationLevel >= 50 && personalizationLevel < 75 && "Good understanding of your patterns"}
              {personalizationLevel >= 75 && "Highly personalized analysis ready"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trading Profile Summary */}
      {tradingProfile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Your Trading Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Trading Style</p>
                  <p className="font-medium">{tradingProfile.trading_style || 'Learning...'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Risk Tolerance</p>
                  <Badge variant="outline">{tradingProfile.risk_tolerance}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Platform</p>
                  <p className="font-medium">{tradingProfile.platform_detected || 'Various'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Preferred Assets</p>
                  <p className="font-medium">
                    {Array.isArray(tradingProfile.preferred_assets) && tradingProfile.preferred_assets.length > 0 
                      ? tradingProfile.preferred_assets.slice(0, 2).join(', ')
                      : 'Discovering...'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Analysis Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {insights.map((insight, index) => (
              <motion.div
                key={insight.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <insight.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{insight.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">{insight.value}</span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Enhance Your Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            {personalizationLevel < 50 && (
              <p>• Upload screenshots from different trading sessions</p>
            )}
            {!tradingProfile?.platform_detected && (
              <p>• Include clear platform interface in screenshots</p>
            )}
            {analysisHistory && analysisHistory.length < 3 && (
              <p>• Complete more analysis sessions for better insights</p>
            )}
            {personalizationLevel >= 75 && (
              <p>• Your AI coach is fully personalized! Keep uploading for continuous learning.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};