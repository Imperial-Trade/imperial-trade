import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Brain, TrendingUp, AlertTriangle, Lightbulb, Star, Download, Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface AgentOutput {
  id: string;
  agent_name: string;
  output_text: string;
  user_readable_text: string | null;
  created_at: string;
  metadata: any;
}

interface AnalysisViewerProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AgentOutput | null;
}

export const MeccaAnalysisViewer: React.FC<AnalysisViewerProps> = ({
  isOpen,
  onClose,
  analysis
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!analysis) return null;

  let parsedData;
  try {
    parsedData = typeof analysis.output_text === 'string' 
      ? JSON.parse(analysis.output_text) 
      : analysis.output_text;
  } catch (error) {
    parsedData = {
      strengths: ['Analysis data format error'],
      improvements: ['Unable to parse analysis'],
      recommendations: ['Please try running the analysis again'],
      key_insights: ['Data parsing error occurred']
    };
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportAnalysis = () => {
    const dataStr = JSON.stringify(parsedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mecca-analysis-${analysis.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const shareAnalysis = () => {
    if (navigator.share) {
      navigator.share({
        title: 'MECCA Trading Analysis',
        text: `Trading Analysis from ${formatDate(analysis.created_at)}`,
        url: window.location.href
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 bg-background/95 backdrop-blur-xl border-violet-200/30">
        <DialogHeader className="px-6 py-4 border-b border-border/50 bg-card/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Brain className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  MECCA Analysis Report
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(analysis.created_at)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    ID: {analysis.id.slice(0, 8)}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={exportAnalysis}>
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={shareAnalysis}>
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="mx-6 mt-4 grid w-full grid-cols-4 bg-muted/50">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="strengths" className="text-xs sm:text-sm">Strengths</TabsTrigger>
              <TabsTrigger value="improvements" className="text-xs sm:text-sm">Areas to Improve</TabsTrigger>
              <TabsTrigger value="recommendations" className="text-xs sm:text-sm">Recommendations</TabsTrigger>
            </TabsList>

            <div className="flex-1 px-6 pb-6">
              <ScrollArea className="h-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="pt-4"
                  >
                    <TabsContent value="overview" className="mt-0 space-y-4">
                      <Card className="p-4 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-200/30">
                        <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                          <Brain className="w-4 h-4 text-violet-500" />
                          Analysis Summary
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {parsedData.overall_analysis || 
                           analysis.user_readable_text ||
                           'This analysis provides insights into your trading performance based on the uploaded screenshots and trading data.'}
                        </p>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="p-4">
                          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                            <Star className="w-4 h-4 text-emerald-500" />
                            Key Insights
                          </h4>
                          <div className="space-y-2">
                            {(parsedData.key_insights || []).slice(0, 3).map((insight: string, index: number) => (
                              <div key={index} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                                <p className="text-xs text-muted-foreground">{insight}</p>
                              </div>
                            ))}
                          </div>
                        </Card>

                        <Card className="p-4">
                          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            Performance Highlights
                          </h4>
                          <div className="space-y-2">
                            {parsedData.performance_metrics && Object.entries(parsedData.performance_metrics).slice(0, 3).map(([key, value]: [string, any], index: number) => (
                              <div key={index} className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground capitalize">
                                  {key.replace(/_/g, ' ')}:
                                </span>
                                <span className="text-xs font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="strengths" className="mt-0">
                      <div className="space-y-3">
                        {(parsedData.strengths || []).map((strength: string, index: number) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className="p-4 border-emerald-200/30 bg-emerald-50/30">
                              <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                                  <Star className="w-4 h-4 text-emerald-500" />
                                </div>
                                <p className="text-sm leading-relaxed">{strength}</p>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="improvements" className="mt-0">
                      <div className="space-y-3">
                        {(parsedData.improvements || []).map((improvement: string, index: number) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className="p-4 border-amber-200/30 bg-amber-50/30">
                              <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-lg bg-amber-500/10">
                                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                                </div>
                                <p className="text-sm leading-relaxed">{improvement}</p>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="recommendations" className="mt-0">
                      <div className="space-y-3">
                        {(parsedData.recommendations || []).map((recommendation: string, index: number) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className="p-4 border-blue-200/30 bg-blue-50/30">
                              <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-lg bg-blue-500/10">
                                  <Lightbulb className="w-4 h-4 text-blue-500" />
                                </div>
                                <p className="text-sm leading-relaxed">{recommendation}</p>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>
              </ScrollArea>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};