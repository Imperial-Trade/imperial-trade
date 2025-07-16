import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Upload, Camera, X, Plus, TrendingUp, AlertTriangle, Target, BarChart3, Zap, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
interface UploadedFile {
  name: string;
  url: string;
  type: string;
}

interface AnalysisResult {
  trade_score: string;
  verdict: string;
  entry_price: number;
  stop_loss: number;
  profit_target: number;
  risk_reward_ratio: number;
  ai_annotations: string[];
  improvement_suggestions: string[];
  strengths: string[];
  performance_metrics: {
    win_rate: number;
    avg_risk_reward: number;
    execution_quality: number;
  };
}
export default function TradeAnalyst() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState<'uploader' | 'analysis'>('uploader');
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Check if all files are images
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setError('Please upload only image files (PNG, JPG, JPEG)');
      return;
    }

    // Limit to 5 screenshots maximum
    if (uploadedFiles.length + files.length > 5) {
      setError('Maximum 5 screenshots allowed. Please remove some before adding more.');
      return;
    }
    try {
      setError('');

      // Mock file upload - create object URLs for preview
      const newFiles: UploadedFile[] = files.map(file => ({
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      setError('Failed to upload screenshots. Please try again.');
    }
  };
  const removeFile = (indexToRemove: number) => {
    const fileToRemove = uploadedFiles[indexToRemove];
    if (fileToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.url);
    }
    setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  const analyzeTradeHistory = async () => {
    if (uploadedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError('');
    try {
      // Mock analysis result with new format
      const mockResult: AnalysisResult = {
        trade_score: 'B+',
        verdict: 'This was a strong entry based on bullish divergence, but your risk-to-reward ratio could be improved.',
        entry_price: 1.0850,
        stop_loss: 1.0800,
        profit_target: 1.0950,
        risk_reward_ratio: 2.0,
        ai_annotations: [
          'Bullish divergence identified at support level',
          'Entry aligned with 4H trend reversal',
          'Volume confirmation present at breakout',
          'RSI oversold bounce pattern detected'
        ],
        improvement_suggestions: [
          'Consider placing stop loss below recent swing low at $1.0785 for better R/R of 3:1',
          'Wait for confirmation candle close above resistance for higher probability',
          'Risk size could be optimized - consider 1.5% account risk maximum'
        ],
        strengths: [
          'Excellent timing with market structure',
          'Good risk management discipline',
          'Proper trend alignment',
          'Clean technical setup identification'
        ],
        performance_metrics: {
          win_rate: 78,
          avg_risk_reward: 2.3,
          execution_quality: 85
        }
      };

      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      setAnalysisResult(mockResult);
      setCurrentView('analysis');
    } catch (error) {
      setError('Analysis failed. Please ensure your screenshots show trading data clearly.');
    }
    setIsAnalyzing(false);
  };

  const goBackToUploader = () => {
    setCurrentView('uploader');
    setAnalysisResult(null);
  };
  // Uploader View Component
  const UploaderView = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Hero Section */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 mb-6"
        >
          <Brain className="w-10 h-10 text-purple-400" />
        </motion.div>
        <h1 className="text-3xl font-bold text-foreground mb-3">Get Instant AI Feedback on Your Trade</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Drag & drop a screenshot of your chart, or click to upload. The AI will analyze your entry, exit, and setup.
        </p>
      </div>

      {/* Upload Area */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="relative border-2 border-dashed border-purple-500/30 rounded-2xl p-12 text-center bg-gradient-to-br from-purple-500/5 to-blue-500/5 hover:from-purple-500/10 hover:to-blue-500/10 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl blur-xl opacity-0 hover:opacity-100 transition-opacity duration-300" />
        <div className="relative">
          <Upload className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <div className="space-y-2 mb-6">
            <p className="text-xl font-semibold text-foreground">Upload Your Trading Screenshot</p>
            <p className="text-muted-foreground">Support for all major platforms: MT4, MT5, TradingView, cTrader, and more</p>
          </div>
          <input 
            type="file" 
            accept="image/*" 
            multiple 
            onChange={handleFileUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          />
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
            <Camera className="w-5 h-5 mr-2" />
            Select Screenshots
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Maximum 5 files • PNG, JPG, JPEG supported
          </p>
        </div>
      </motion.div>

      {/* Uploaded Files */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Uploaded Screenshots ({uploadedFiles.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadedFiles.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group"
                >
                  <div className="bg-card border border-border rounded-xl p-4 hover:border-purple-500/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">Screenshot {index + 1}</span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <img 
                      src={file.url} 
                      alt={`Trading screenshot ${index + 1}`} 
                      className="w-full h-32 object-cover rounded-lg border border-border" 
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            
            {uploadedFiles.length < 5 && (
              <div className="text-center">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
                  <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                    <Plus className="w-4 h-4 mr-2" />
                    Add More Screenshots
                  </Button>
                </label>
              </div>
            )}

            <Button 
              onClick={analyzeTradeHistory} 
              disabled={isAnalyzing} 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 text-lg"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3" />
                  Analyzing {uploadedFiles.length} Screenshot{uploadedFiles.length > 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <Brain className="w-6 h-6 mr-3" />
                  Analyze My Trade Performance
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Analyses */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Analyses</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">EUR/USD Analysis #{i}</p>
                  <p className="text-xs text-muted-foreground">2 hours ago • Grade: B+</p>
                </div>
                <Badge variant="outline" className="text-green-400 border-green-400/30">
                  Profitable
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Analysis View Component
  const AnalysisView = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Back Button */}
      <Button 
        onClick={goBackToUploader} 
        variant="ghost" 
        className="text-muted-foreground hover:text-foreground"
      >
        ← Back to Upload
      </Button>

      {/* The Verdict Card */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-2xl font-bold mb-4">
            {analysisResult?.trade_score}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">AI Trade Score: {analysisResult?.trade_score}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{analysisResult?.verdict}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Annotated Chart */}
        <Card className="lg:row-span-2">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-400" />
              Annotated Chart
            </h3>
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-4 h-80 flex items-center justify-center border border-purple-500/20">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <p className="text-muted-foreground">AI Overlays & Annotations</p>
                <p className="text-sm text-muted-foreground/70 mt-2">Chart analysis with AI-identified patterns</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <h4 className="font-semibold text-foreground">AI Identified:</h4>
              {analysisResult?.ai_annotations.map((annotation, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-muted-foreground">{annotation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400" />
              Key Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Entry Price:</span>
                <span className="font-mono text-foreground">${analysisResult?.entry_price}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Stop Loss:</span>
                <span className="font-mono text-red-400">${analysisResult?.stop_loss}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Profit Target:</span>
                <span className="font-mono text-green-400">${analysisResult?.profit_target}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-muted-foreground">Risk/Reward:</span>
                <span className="font-bold text-blue-400">{analysisResult?.risk_reward_ratio}:1</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-400">{analysisResult?.performance_metrics.win_rate}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{analysisResult?.performance_metrics.avg_risk_reward}</p>
                <p className="text-xs text-muted-foreground">Avg R:R</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{analysisResult?.performance_metrics.execution_quality}%</p>
                <p className="text-xs text-muted-foreground">Execution</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Improvement Suggestions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            Improvement Suggestions
          </h3>
          <div className="space-y-3">
            {analysisResult?.improvement_suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-muted-foreground">{suggestion}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-6xl mx-auto">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {currentView === 'uploader' ? (
            <UploaderView key="uploader" />
          ) : (
            <AnalysisView key="analysis" />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}