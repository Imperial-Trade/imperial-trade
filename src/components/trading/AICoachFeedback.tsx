
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Target, AlertCircle, Lightbulb, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCoachInvocation } from '@/hooks/useCoachInvocation';
import { supabase } from '@/integrations/supabase/client';

interface AICoachFeedbackProps {
  journalEntryId: string;
  existingFeedback?: string;
}

interface CoachingAnalysis {
  execution_analysis: string;
  risk_management: string;
  strengths: string;
  improvements: string;
  recommendations: string;
  overall_score: number;
  key_insights: string[];
}

const AICoachFeedback: React.FC<AICoachFeedbackProps> = ({ 
  journalEntryId, 
  existingFeedback 
}) => {
  const [feedback, setFeedback] = useState<string>(existingFeedback || '');
  const [isRequesting, setIsRequesting] = useState(false);
  const [coachingAnalysis, setCoachingAnalysis] = useState<CoachingAnalysis | null>(null);
  const [pollCount, setPollCount] = useState(0);
  
  const { invokeCoach } = useCoachInvocation();

  // Sync with prop changes for optimistic updates
  useEffect(() => {
    if (existingFeedback !== undefined && existingFeedback !== feedback) {
      setFeedback(existingFeedback);
    }
  }, [existingFeedback, feedback]);

  // Parse coaching analysis from feedback string
  useEffect(() => {
    if (feedback && feedback.trim()) {
      try {
        // Try to parse as JSON first (new format)
        const parsed = JSON.parse(feedback);
        if (parsed.execution_analysis) {
          setCoachingAnalysis(parsed);
          return;
        }
      } catch {
        // Fallback: treat as plain text feedback
        setCoachingAnalysis({
          execution_analysis: feedback,
          risk_management: '',
          strengths: '',
          improvements: '',
          recommendations: '',
          overall_score: 7,
          key_insights: []
        });
      }
    }
  }, [feedback]);

  // Polling backup for cases where realtime doesn't work
  useEffect(() => {
    if (isRequesting && pollCount < 6) { // Poll for up to 30 seconds (6 * 5s)
      const timer = setTimeout(async () => {
        try {
          const { data: entry } = await supabase
            .from('trade_journal_entries')
            .select('ai_positive_feedback')
            .eq('id', journalEntryId)
            .single();

          if (entry?.ai_positive_feedback) {
            setFeedback(entry.ai_positive_feedback);
            setIsRequesting(false);
            setPollCount(0);
          } else {
            setPollCount(prev => prev + 1);
          }
        } catch (error) {
          console.error('Polling error:', error);
          setPollCount(prev => prev + 1);
        }
      }, 5000);

      return () => clearTimeout(timer);
    } else if (pollCount >= 6) {
      // Stop polling after 6 attempts
      setIsRequesting(false);
      setPollCount(0);
    }
  }, [isRequesting, pollCount, journalEntryId]);

  const handleRequestFeedback = async () => {
    setIsRequesting(true);
    setPollCount(0);
    
    try {
      const reply = await invokeCoach(journalEntryId);
      
      // Optimistic update - set feedback immediately if reply received
      if (reply) {
        setFeedback(reply);
        setIsRequesting(false);
      }
      // If no reply, polling will continue to check for updates
    } catch (error) {
      console.error('Coach invocation failed:', error);
      setIsRequesting(false);
    }
  };

  // If we have no feedback and aren't requesting, show the request button
  if (!feedback && !isRequesting) {
    return (
      <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">Get AI Coach Feedback</h3>
          <p className="text-muted-foreground mb-4">
            Let our AI coach analyze your trade and provide personalized insights to improve your trading.
          </p>
          <Button onClick={handleRequestFeedback} className="gap-2">
            <Sparkles className="w-4 h-4" />
            Analyze Trade
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show loading state while requesting
  if (isRequesting) {
    return (
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-6 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 mx-auto mb-4"
          >
            <Sparkles className="w-12 h-12 text-primary" />
          </motion.div>
          <h3 className="text-lg font-semibold mb-2">AI Coach is Analyzing...</h3>
          <p className="text-muted-foreground">
            Our AI is carefully reviewing your trade. This usually takes 10-15 seconds.
          </p>
          {pollCount > 2 && (
            <p className="text-sm text-muted-foreground mt-2">
              Still analyzing... ({pollCount * 5}s elapsed)
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show structured coaching analysis if available
  if (coachingAnalysis && coachingAnalysis.execution_analysis) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Coach Analysis
              <div className="ml-auto flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-normal">
                  Score: {coachingAnalysis.overall_score}/10
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Execution Analysis */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                <h4 className="font-semibold text-sm">Execution Analysis</h4>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {coachingAnalysis.execution_analysis}
              </p>
            </div>

            {/* Risk Management */}
            {coachingAnalysis.risk_management && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <h4 className="font-semibold text-sm">Risk Management</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {coachingAnalysis.risk_management}
                </p>
              </div>
            )}

            {/* Strengths */}
            {coachingAnalysis.strengths && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <h4 className="font-semibold text-sm">Strengths</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {coachingAnalysis.strengths}
                </p>
              </div>
            )}

            {/* Recommendations */}
            {coachingAnalysis.recommendations && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <h4 className="font-semibold text-sm">Recommendations</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {coachingAnalysis.recommendations}
                </p>
              </div>
            )}

            {/* Key Insights */}
            {coachingAnalysis.key_insights && coachingAnalysis.key_insights.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Key Insights
                </h4>
                <ul className="space-y-1 pl-6">
                  {coachingAnalysis.key_insights.map((insight, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-primary/10">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRequestFeedback}
                disabled={isRequesting}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Get Fresh Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Fallback for plain text feedback
  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Coach Feedback
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feedback}</p>
        <div className="pt-4 border-t border-primary/10 mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRequestFeedback}
            disabled={isRequesting}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Get Fresh Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AICoachFeedback;
