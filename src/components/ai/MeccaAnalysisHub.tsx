import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Brain, Zap, TrendingUp, Target, Shield, ChevronRight, Scan, Activity, Menu, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { AnalyzeSetup, UploadFile } from '@/api/integrations';
import './MeccaResponsive.css';

interface AnalysisResult {
  overall_analysis: string;
  performance_metrics: {
    win_rate: number;
    total_pnl: number;
    risk_score: number;
    trades_analyzed: number;
  };
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  key_insights: string[];
}

interface UploadedFile {
  file: File;
  preview: string;
  status: 'uploading' | 'uploaded' | 'error';
  progress: number;
}

interface AgentOutput {
  id: string;
  agent_name: string;
  output_text: string;
  user_readable_text: string | null;
  created_at: string;
  metadata: any;
}

const MeccaAnalysisHub: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [insightStream, setInsightStream] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('strengths');
  const [scanlinePosition, setScanlinePosition] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch analysis history
  const { data: analysisHistory = [] } = useQuery({
    queryKey: ['analysis-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('agent_outputs')
        .select('*')
        .eq('user_id', user.id)
        .eq('agent_name', 'deconstructor-agent')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as AgentOutput[];
    },
    enabled: !!user?.id,
  });

  const addInsight = useCallback((insight: string) => {
    setInsightStream(prev => [...prev, insight]);
  }, []);

  const simulateAnalysisStream = useCallback(() => {
    const insights = [
      "🔍 Initializing MECCA neural analysis...",
      "📊 Scanning uploaded trading screenshots...",
      "💹 Extracting trade entry and exit points...",
      "📈 Calculating profit/loss ratios...",
      "⚖️ Analyzing risk management patterns...",
      "🎯 Identifying trading strengths...",
      "⚠️ Detecting improvement areas...",
      "🧠 Generating personalized recommendations...",
      "✨ Analysis complete - insights ready!"
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < insights.length) {
        addInsight(insights[currentIndex]);
        setAnalysisProgress((currentIndex + 1) / insights.length * 100);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [addInsight]);

  const handleFileUpload = useCallback((files: FileList) => {
    const newFiles: UploadedFile[] = Array.from(files).slice(0, 5).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'uploading' as const,
      progress: 0
    }));

    setUploadedFiles(newFiles);

    // Simulate upload progress
    newFiles.forEach((_, index) => {
      const interval = setInterval(() => {
        setUploadedFiles(prev => prev.map((file, i) => 
          i === index ? { 
            ...file, 
            progress: Math.min(file.progress + 10, 100),
            status: file.progress >= 90 ? 'uploaded' : 'uploading'
          } : file
        ));
      }, 100);

      setTimeout(() => clearInterval(interval), 1000);
    });
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files uploaded",
        description: "Please upload at least one trading screenshot.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setInsightStream([]);
    setAnalysisResult(null);

    const cleanup = simulateAnalysisStream();

    try {
      // First upload files to get URLs
      const uploadPromises = uploadedFiles.map(async ({ file }) => {
        const uploadResult = await UploadFile({ file });
        return uploadResult.file_url;
      });

      const fileUrls = await Promise.all(uploadPromises);
      
      // Then analyze with the uploaded URLs
      const result = await AnalyzeSetup({
        user_id: user?.id,
        file_urls: fileUrls
      });
      
      // Parse the JSON result
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      setAnalysisResult(parsedResult);
      
      toast({
        title: "Analysis Complete!",
        description: "Your trading performance has been analyzed successfully.",
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing your trades. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      cleanup();
    }
  }, [uploadedFiles, toast, simulateAnalysisStream]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  // Neural brain animation component
  const NeuralBrain = () => (
    <motion.div
      className="relative w-16 h-16"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#a855f7', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#c084fc', stopOpacity: 0.6 }} />
            </linearGradient>
          </defs>
          <Brain className="w-full h-full fill-url(#brainGradient) stroke-violet-400" />
          {/* Neural connections */}
          {[...Array(6)].map((_, i) => (
            <motion.circle
              key={i}
              cx={20 + (i * 4)}
              cy={30 + Math.sin(i) * 8}
              r="1"
              fill="#8b5cf6"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                delay: i * 0.3,
                ease: "easeInOut"
              }}
            />
          ))}
        </svg>
      </motion.div>
      
      {/* Floating particles */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-violet-400 rounded-full"
          style={{
            left: `${20 + i * 20}%`,
            top: `${30 + i * 15}%`,
          }}
          animate={{
            y: [-10, 10, -10],
            x: [-5, 5, -5],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );

  return (
    <div className="mecca-hub">
      {/* Header */}
      <motion.div 
        className="mecca-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="mecca-neural-brain">
                <NeuralBrain />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold mecca-gradient-text">
                  MECCA Analysis Hub
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  AI-Powered Trading Performance Analysis
                </p>
              </div>
            </div>
            
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content - Responsive Layout */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="mecca-main-grid">
          
          {/* Left Panel - Evidence Viewer */}
          <motion.div
            className="mecca-left-panel space-y-4"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="mecca-panel mecca-glass">
              <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
                <span className="hidden sm:inline">Upload Evidence</span>
                <span className="sm:hidden">Upload</span>
              </h3>
              
              {/* Upload Zone */}
              <div
                className="mecca-upload-zone"
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-violet-500 mx-auto mb-2" />
                </motion.div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Drop screenshots or tap to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  Up to 5 files, max 10MB each
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
            </Card>

            {/* Uploaded Files Gallery */}
            {uploadedFiles.length > 0 && (
              <Card className="mecca-panel mecca-glass">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Scan className="w-4 h-4 text-violet-500" />
                  <span className="hidden sm:inline">Evidence Gallery</span>
                  <span className="sm:hidden">Gallery</span>
                </h4>
                <div className="mecca-file-gallery">
                  {uploadedFiles.map((file, index) => (
                    <motion.div
                      key={index}
                      className="relative rounded-lg overflow-hidden border border-violet-200/30"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <img
                        src={file.preview}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-12 sm:h-16 object-cover"
                      />
                      {isAnalyzing && (
                        <motion.div
                          className="absolute inset-0 bg-violet-500/20 flex items-center justify-center"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.5, delay: index * 0.2 }}
                        >
                          <Scan className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400 animate-pulse" />
                        </motion.div>
                      )}
                      <Badge 
                        variant={file.status === 'uploaded' ? 'default' : 'secondary'}
                        className="mecca-badge"
                      >
                        {file.status === 'uploaded' ? '✓' : '...'}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
                
                {uploadedFiles.every(f => f.status === 'uploaded') && !isAnalyzing && (
                  <Button 
                    onClick={handleAnalyze}
                    className="w-full mt-3 sm:mt-4 mecca-touch-button bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Analyze with MECCA</span>
                    <span className="sm:hidden">Analyze</span>
                  </Button>
                )}
              </Card>
            )}
          </motion.div>

          {/* Center Panel - Dashboard */}
          <motion.div
            className="mecca-center-panel space-y-4 sm:space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {analysisResult ? (
              <>
                {/* KPI Section */}
                <div className="mecca-kpi-grid">
                  {[
                    { label: 'Win Rate', value: `${analysisResult.performance_metrics.win_rate}%`, icon: TrendingUp, color: 'emerald' },
                    { label: 'Total P&L', value: `$${analysisResult.performance_metrics.total_pnl}`, icon: Target, color: analysisResult.performance_metrics.total_pnl >= 0 ? 'emerald' : 'red' },
                    { label: 'Risk Score', value: `${analysisResult.performance_metrics.risk_score}/10`, icon: Shield, color: 'violet' },
                    { label: 'Trades', value: analysisResult.performance_metrics.trades_analyzed.toString(), icon: Activity, color: 'blue' },
                  ].map((kpi, index) => (
                    <motion.div
                      key={kpi.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="mecca-panel mecca-glass p-3 sm:p-4 mecca-violet-glow">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`p-1.5 sm:p-2 rounded-lg bg-${kpi.color}-500/10`}>
                            <kpi.icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${kpi.color}-500`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{kpi.label}</p>
                            <motion.p 
                              className="text-sm sm:text-xl font-bold truncate"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.5 }}
                            >
                              {kpi.value}
                            </motion.p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Analysis Tabs */}
                <Card className="mecca-panel mecca-glass">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6">
                      <TabsTrigger value="strengths" className="data-[state=active]:bg-emerald-500/20 text-xs sm:text-sm">
                        <span className="hidden sm:inline">Strengths</span>
                        <span className="sm:hidden">✓</span>
                      </TabsTrigger>
                      <TabsTrigger value="improvements" className="data-[state=active]:bg-orange-500/20 text-xs sm:text-sm">
                        <span className="hidden sm:inline">Improvements</span>
                        <span className="sm:hidden">⚠</span>
                      </TabsTrigger>
                      <TabsTrigger value="recommendations" className="data-[state=active]:bg-violet-500/20 text-xs sm:text-sm">
                        <span className="hidden sm:inline">Recommendations</span>
                        <span className="sm:hidden">💡</span>
                      </TabsTrigger>
                    </TabsList>

                    <AnimatePresence mode="wait">
                      <TabsContent value="strengths">
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="mecca-tab-content"
                        >
                          {analysisResult.strengths.map((strength, index) => (
                            <motion.div
                              key={index}
                              className="mecca-analysis-card bg-emerald-50/50 border-emerald-200/30"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <p className="text-xs sm:text-sm text-emerald-800">{strength}</p>
                            </motion.div>
                          ))}
                        </motion.div>
                      </TabsContent>

                      <TabsContent value="improvements">
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="space-y-3"
                        >
                          {analysisResult.improvements.map((improvement, index) => (
                            <motion.div
                              key={index}
                              className="p-4 rounded-lg bg-orange-50/50 border border-orange-200/30"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <p className="text-sm text-orange-800">{improvement}</p>
                            </motion.div>
                          ))}
                        </motion.div>
                      </TabsContent>

                      <TabsContent value="recommendations">
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="space-y-3"
                        >
                          {analysisResult.recommendations.map((recommendation, index) => (
                            <motion.div
                              key={index}
                              className="p-4 rounded-lg bg-violet-50/50 border border-violet-200/30"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <p className="text-sm text-violet-800">{recommendation}</p>
                            </motion.div>
                          ))}
                        </motion.div>
                      </TabsContent>
                    </AnimatePresence>
                  </Tabs>
                </Card>
              </>
            ) : (
              <Card className="mecca-panel mecca-glass text-center p-6 sm:p-12">
                <div className="mecca-neural-brain mx-auto mb-4">
                  <NeuralBrain />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 mecca-gradient-text">Ready for Analysis</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Upload your trading screenshots and let MECCA analyze your performance with AI-powered insights.
                </p>
              </Card>
            )}
          </motion.div>

          {/* Right Panel - AI Insight Stream */}
          <motion.div
            className="mecca-right-panel space-y-4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="mecca-panel mecca-glass">
              <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
                <span className="hidden sm:inline">AI Insight Stream</span>
                <span className="sm:hidden">AI Stream</span>
              </h3>
              
              {/* Analysis Progress */}
              {isAnalyzing && (
                <div className="mb-3 sm:mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Processing</span>
                    <span className="text-xs sm:text-sm font-medium">{Math.round(analysisProgress)}%</span>
                  </div>
                  <Progress value={analysisProgress} className="mecca-progress" />
                </div>
              )}

              {/* Insight Stream */}
              <div className="mecca-insight-stream">
                <AnimatePresence>
                  {insightStream.map((insight, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-2 sm:p-3 rounded-lg bg-violet-50/30 border border-violet-200/20 text-xs sm:text-sm"
                    >
                      {insight}
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {!isAnalyzing && insightStream.length === 0 && (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground">
                    <Brain className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs sm:text-sm">AI insights will appear here during analysis</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Recent Analysis History */}
            {analysisHistory.length > 0 && (
              <Card className="mecca-panel mecca-glass">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-violet-500" />
                  <span className="hidden sm:inline">Recent Analysis</span>
                  <span className="sm:hidden">History</span>
                </h4>
                <div className="space-y-2">
                  {analysisHistory.slice(0, 3).map((analysis, index) => (
                    <motion.div
                      key={analysis.id}
                      className="p-2 sm:p-3 rounded-lg bg-muted/30 border border-muted-foreground/10 cursor-pointer hover:bg-muted/50 transition-colors mecca-touch-button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default MeccaAnalysisHub;