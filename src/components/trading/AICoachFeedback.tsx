import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Star, TrendingUp, Target, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import { CoachingAnalysis, AiCoachFeedback } from '@/api/client/types';
import { tradeJournalEntry } from '@/api/client/operations/TradeJournalEntry';

interface AICoachFeedbackProps {
  entryId: string;
  onFeedbackReceived?: (feedback: AiCoachFeedback) => void;
}

export function AICoachFeedback({ entryId, onFeedbackReceived }: AICoachFeedbackProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<AiCoachFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetCoaching = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await tradeJournalEntry.getCoachFeedback(entryId);
      
      if (result.success) {
        setFeedback(result.feedback);
        onFeedbackReceived?.(result.feedback);
      } else {
        setError(result.error || 'Failed to get AI coaching');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const analysis = feedback?.coaching_analysis as CoachingAnalysis;

  return (
    <div className="space-y-4">
      {!feedback && (
        <Button 
          onClick={handleGetCoaching}
          disabled={isLoading}
          className="w-full"
          variant="outline"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting AI Coach Analysis...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Get AI Coach Feedback
            </>
          )}
        </Button>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {feedback && analysis && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5" />
                <span>AI Coach Analysis</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Badge className={`${getScoreColor(analysis.overall_score)} text-white`}>
                  <Star className="w-3 h-3 mr-1" />
                  {analysis.overall_score}/10
                </Badge>
                <Badge variant="secondary">
                  {feedback.model_used}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Execution Analysis */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <h4 className="font-medium">Execution Analysis</h4>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.execution_analysis}</p>
            </div>

            <Separator />

            {/* Risk Management */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <h4 className="font-medium">Risk Management</h4>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.risk_management}</p>
            </div>

            <Separator />

            {/* Strengths */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <h4 className="font-medium">Strengths</h4>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.strengths}</p>
            </div>

            <Separator />

            {/* Areas for Improvement */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Lightbulb className="w-4 h-4 text-blue-500" />
                <h4 className="font-medium">Areas for Improvement</h4>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.improvements}</p>
            </div>

            <Separator />

            {/* Recommendations */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-4 h-4 text-purple-500" />
                <h4 className="font-medium">Recommendations</h4>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.recommendations}</p>
            </div>

            {/* Key Insights */}
            {analysis.key_insights && analysis.key_insights.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Key Insights</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.key_insights.map((insight, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {insight}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="text-xs text-muted-foreground mt-4">
              Generated on {new Date(feedback.created_at).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}