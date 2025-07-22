
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Brain, FileImage, Loader2, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Target, BarChart3, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyzeSetup } from '@/api/integrations';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ComplianceNotice, EducationalBadge, HypotheticalBadge } from '@/components/compliance/ComplianceNotice';

export default function TradeAnalyst() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const analyzeSetup = async () => {
    if (!user) {
      setError('Please sign in to access educational analysis');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    
    try {
      toast.info("Analyzing your trading patterns for educational insights...");

      // Call the deconstructor agent for pattern analysis
      const analysisResult = await AnalyzeSetup({ user_id: user.id });

      setResult(analysisResult);
      toast.success("Educational pattern analysis completed!");
      
    } catch (error) {
      console.error('Educational analysis error:', error);
      setError('Educational analysis failed. Please try again.');
      toast.error("Educational analysis failed");
    }
    
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Compliance Notice */}
        <ComplianceNotice type="educational" size="md" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Analysis Controls */}
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-400" />
                  Educational Trading Pattern Analyzer
                </CardTitle>
                <CardDescription>
                  Analyze your trading journal for educational patterns and learning insights using AI-powered analysis
                </CardDescription>
                <div className="flex gap-2">
                  <EducationalBadge />
                  <HypotheticalBadge />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Analysis Description */}
                <div className="space-y-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-400 mb-2">What This Analysis Provides:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Performance metrics and statistical analysis</li>
                      <li>• Behavioral pattern identification</li>
                      <li>• Educational blindspot detection</li>
                      <li>• Objective data-driven insights</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <h3 className="text-sm font-medium text-yellow-400 mb-2">Requirements:</h3>
                    <p className="text-sm text-muted-foreground">
                      You need to have trade journal entries to analyze. The system will review your recent trading activity for educational patterns.
                    </p>
                  </div>
                </div>

                {/* Analyze Button */}
                <Button 
                  onClick={analyzeSetup} 
                  disabled={!user || isAnalyzing}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing Trading Patterns...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5 mr-2" />
                      Analyze Trading Patterns
                    </>
                  )}
                </Button>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-6">
            <AnimatePresence>
              {result ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Educational Analysis Results */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-400" />
                        Educational Pattern Analysis
                      </CardTitle>
                      <HypotheticalBadge />
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div 
                          className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br/>') }}
                        />
                      </div>
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground italic">
                          Educational analysis for learning purposes only • Generated by AI pattern recognition
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">Ready for Pattern Analysis</h3>
                    <p className="text-muted-foreground mb-4">
                      Analyze your trading journal entries to identify educational patterns, behavioral insights, and learning opportunities
                    </p>
                    <div className="flex justify-center gap-2">
                      <EducationalBadge />
                      <HypotheticalBadge />
                    </div>
                  </CardContent>
                </Card>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
