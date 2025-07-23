import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Brain, FileImage, Loader2, CheckCircle, AlertCircle, X, Plus, BarChart3, Lightbulb, TrendingUp, Target, Users, Award, Camera, RefreshCw, Clock, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyzeSetup, UploadFile } from '@/api/integrations';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ComplianceNotice, EducationalBadge, HypotheticalBadge } from '@/components/compliance/ComplianceNotice';
import { validateImageFile, compressImage } from '@/utils/imageCompression';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface AnalysisResult {
  overall_performance?: {
    summary?: string;
    screenshots_analyzed?: number;
    trades_analyzed?: number;
    risk_score?: string;
    confidence_level?: string;
  };
  performance_metrics?: {
    win_rate?: string;
    profit_factor?: string;
    risk_reward_ratio?: string;
    max_drawdown?: string;
    execution_quality?: string;
  };
  visual_analysis?: {
    chart_patterns_identified?: string[];
    technical_indicators_used?: string[];
    setup_quality?: string;
    entry_timing?: string;
    exit_strategy?: string;
  };
  key_insights?: string[];
  strengths?: string[];
  improvements?: string[];
  recommendations?: string[];
  performance_evolution?: {
    trend?: string;
    progression_summary?: string;
  };
}

interface UploadedFile {
  file: File;
  url: string;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

interface AgentOutput {
  id: string;
  created_at: string;
  output_text: string;
  metadata: any;
}

export default function TradeAnalyst() {
  const [currentView, setCurrentView] = useState<'upload' | 'results' | 'history'>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [rawResult, setRawResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AgentOutput | null>(null);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch analysis history
  const { data: analysisHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['analysis-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('agent_outputs')
        .select('*')
        .eq('user_id', user.id)
        .eq('agent_name', 'Deconstructor')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleFileSelect = useCallback(async (files: FileList) => {
    const maxFiles = 5;
    const currentCount = uploadedFiles.length;
    
    if (currentCount >= maxFiles) {
      toast.error(`Maximum ${maxFiles} screenshots allowed`);
      return;
    }

    const newFiles = Array.from(files).slice(0, maxFiles - currentCount);
    
    for (const file of newFiles) {
      const validationError = validateImageFile(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }

      const preview = URL.createObjectURL(file);
      const fileData: UploadedFile = {
        file,
        url: '',
        preview,
        uploading: true,
        uploaded: false
      };

      setUploadedFiles(prev => [...prev, fileData]);

      try {
        const compressedFile = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8
        });

        const { file_url } = await UploadFile({ file: compressedFile });
        
        setUploadedFiles(prev => prev.map(f => 
          f.preview === preview 
            ? { ...f, url: file_url, uploading: false, uploaded: true }
            : f
        ));

        toast.success('Screenshot uploaded successfully');
      } catch (error) {
        console.error('Upload error:', error);
        setUploadedFiles(prev => prev.map(f => 
          f.preview === preview 
            ? { ...f, uploading: false, uploaded: false, error: 'Upload failed' }
            : f
        ));
        toast.error('Failed to upload screenshot');
      }
    }
  }, [uploadedFiles]);

  const removeFile = useCallback((preview: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.preview === preview);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.preview !== preview);
    });
  }, []);

  const analyzeTradePerformance = async (isRetry = false) => {
    if (!user) {
      setError('Please sign in to access educational analysis');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    
    try {
      const uploadedFileUrls = uploadedFiles
        .filter(f => f.uploaded && f.url)
        .map(f => f.url);

      console.log('Starting analysis with files:', uploadedFileUrls);
      
      if (uploadedFileUrls.length === 0) {
        toast.info("Analyzing your trading journal data...");
      } else {
        toast.info(`Analyzing your trading patterns with ${uploadedFileUrls.length} screenshot(s)...`);
      }

      const analysisResult = await AnalyzeSetup({ 
        user_id: user.id, 
        file_urls: uploadedFileUrls 
      });

      console.log('Analysis result received:', analysisResult);
      setRawResult(analysisResult);

      try {
        const parsedResult = JSON.parse(analysisResult);
        setResult(parsedResult);
        console.log('Analysis result parsed successfully:', parsedResult);
      } catch (parseError) {
        console.error('Failed to parse analysis result as JSON:', parseError);
        setResult({
          overall_performance: {
            summary: analysisResult.substring(0, 300) + (analysisResult.length > 300 ? '...' : ''),
            screenshots_analyzed: uploadedFileUrls.length,
            trades_analyzed: 0,
            risk_score: 'Unknown',
            confidence_level: 'N/A'
          },
          key_insights: ['Raw analysis result available in complete analysis section'],
          recommendations: ['Review the complete analysis below for detailed insights']
        });
      }

      setCurrentView('results');
      setRetryCount(0);
      toast.success("Educational pattern analysis completed!");
      
    } catch (error) {
      console.error('Educational analysis error:', error);
      const errorMessage = error.message || 'Educational analysis failed. Please try again.';
      setError(errorMessage);
      
      if (isRetry) {
        setRetryCount(prev => prev + 1);
        toast.error(`Analysis failed (Attempt ${retryCount + 1}): ${errorMessage}`);
      } else {
        toast.error("Educational analysis failed");
      }
    }
    
    setIsAnalyzing(false);
  };

  const viewHistoryItem = (item: AgentOutput) => {
    setSelectedHistoryItem(item);
    setRawResult(item.output_text);
    
    try {
      const parsedResult = JSON.parse(item.output_text);
      setResult(parsedResult);
    } catch (parseError) {
      setResult({
        overall_performance: {
          summary: item.output_text.substring(0, 300) + (item.output_text.length > 300 ? '...' : ''),
          screenshots_analyzed: item.metadata?.screenshots_analyzed || 0,
          trades_analyzed: item.metadata?.trades_analyzed || 0,
          risk_score: 'Unknown',
          confidence_level: 'N/A'
        },
        key_insights: ['Raw analysis result available in complete analysis section'],
        recommendations: ['Review the complete analysis below for detailed insights']
      });
    }
    
    setCurrentView('results');
  };

  const backToUpload = () => {
    setCurrentView('upload');
    setResult(null);
    setRawResult(null);
    setError('');
    setRetryCount(0);
    setSelectedHistoryItem(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderUploadView = () => (
    <div className="space-y-8">
      {/* Main Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
            <Brain className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Educational Trading Pattern Analysis
            </h1>
            <p className="text-muted-foreground mt-1">
              Professional trading performance analysis powered by advanced AI
            </p>
          </div>
        </div>
        
        <div className="flex justify-center gap-2">
          <EducationalBadge />
          <HypotheticalBadge />
        </div>
      </div>

      {/* Upload Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-400" />
            Upload Trading Screenshots
          </CardTitle>
          <CardDescription>
            Upload up to 5 trading screenshots for comprehensive visual analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Area */}
          <div 
            className="border-2 border-dashed border-purple-500/30 rounded-xl p-12 text-center hover:border-purple-500/50 transition-colors cursor-pointer bg-gradient-to-br from-purple-500/5 to-blue-500/5"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-purple-500/20 border border-purple-500/30">
                <Upload className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <p className="text-xl font-semibold mb-2">Drop screenshots here or click to upload</p>
                <p className="text-muted-foreground">
                  PNG, JPG, JPEG up to 10MB each • Maximum 5 files
                </p>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            className="hidden"
          />

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Uploaded Screenshots ({uploadedFiles.length}/5)</h3>
                {uploadedFiles.length < 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add More
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {uploadedFiles.map((file, index) => (
                  <div key={file.preview} className="relative">
                    <div className="aspect-video bg-background rounded-lg border border-border overflow-hidden">
                      <img
                        src={file.preview}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <button
                      onClick={() => removeFile(file.preview)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="absolute bottom-2 right-2">
                      {file.uploading && (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      )}
                      {file.uploaded && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {file.error && (
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Button */}
          <Button 
            onClick={() => analyzeTradePerformance(false)} 
            disabled={!user || isAnalyzing}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 text-lg font-semibold"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing Trading Performance...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5 mr-2" />
                Analyze Trading Performance
              </>
            )}
          </Button>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Analysis Failed</span>
              </div>
              <p className="text-sm mb-3">{error}</p>
              {retryCount < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analyzeTradePerformance(true)}
                  disabled={isAnalyzing}
                  className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again {retryCount > 0 && `(${retryCount}/3)`}
                </Button>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Recent Analyses */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Recent Analyses
          </CardTitle>
          <CardDescription>
            View your previous trading pattern analyses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : analysisHistory && analysisHistory.length > 0 ? (
            <div className="space-y-3">
              {analysisHistory.map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-background rounded-lg border border-border hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                      <BarChart3 className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Analysis from {formatDate(item.created_at)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(item.metadata as any)?.screenshots_analyzed || 0} screenshots • {(item.metadata as any)?.trades_analyzed || 0} trades
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewHistoryItem(item)}
                    className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No previous analyses found</p>
              <p className="text-sm">Upload screenshots to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderResultsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Educational Analysis Results
          </h2>
          {selectedHistoryItem && (
            <p className="text-sm text-muted-foreground mt-1">
              Analysis from {formatDate(selectedHistoryItem.created_at)}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={backToUpload} className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
          <Camera className="w-4 h-4 mr-2" />
          Back to Upload
        </Button>
      </div>

      {result?.overall_performance && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{result.overall_performance.screenshots_analyzed || 0}</div>
                <div className="text-sm text-muted-foreground">Screenshots</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{result.overall_performance.trades_analyzed || 0}</div>
                <div className="text-sm text-muted-foreground">Trades</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{result.overall_performance.risk_score || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">Risk Level</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{result.overall_performance.confidence_level || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">Confidence</div>
              </div>
            </div>
            {result.overall_performance.summary && (
              <p className="mt-4 text-muted-foreground">{result.overall_performance.summary}</p>
            )}
          </CardContent>
        </Card>
      )}

      {result?.performance_metrics && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(result.performance_metrics).map(([key, value]) => (
                <div key={key} className="p-3 bg-background rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground mb-1">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div className="text-lg font-semibold text-purple-400">{value || 'N/A'}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result?.strengths && result.strengths.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Your Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.strengths.map((strength, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result?.improvements && result.improvements.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.improvements.map((improvement, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{improvement}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result?.recommendations && result.recommendations.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-400" />
              Actionable Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-sm">{recommendation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {rawResult && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              Complete Analysis
            </CardTitle>
            <HypotheticalBadge />
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div 
                className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: rawResult.replace(/\n/g, '<br/>') }}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground italic">
                Educational analysis for learning purposes only • Generated by AI pattern recognition
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-500/5 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <ComplianceNotice type="educational" size="md" />
        
        <AnimatePresence mode="wait">
          {currentView === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {renderUploadView()}
            </motion.div>
          )}
          
          {currentView === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderResultsView()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
