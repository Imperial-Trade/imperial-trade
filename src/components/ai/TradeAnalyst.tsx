import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Brain, Upload, FileText, TrendingUp, AlertTriangle, Camera, X, Plus } from 'lucide-react';
import { hasProperty, isFile } from '@/lib/utils';

interface UploadedFile {
  name: string;
  url: string;
  type: string;
}

interface AnalysisResult {
  overall_analysis: string;
  screenshots_analyzed: number;
  total_trades_identified: number;
  overall_performance: string;
  consistency_analysis: string;
  key_insights: string[];
  risk_management_score: number;
  recommendations: string[];
  strengths: string[];
  areas_for_improvement: string[];
  performance_evolution: string;
}

export default function TradeAnalyst() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

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
      // Mock analysis result
      const mockResult: AnalysisResult = {
        overall_analysis: "Based on the uploaded screenshots, your trading shows a balanced approach with good risk management practices. Most trades appear to follow a consistent strategy.",
        screenshots_analyzed: uploadedFiles.length,
        total_trades_identified: Math.floor(Math.random() * 20) + 10,
        overall_performance: "Positive performance with consistent profit-taking and controlled losses",
        consistency_analysis: "Your trading approach shows good consistency across different time periods, with similar position sizing and risk management",
        key_insights: [
          "Strong adherence to stop-loss levels",
          "Consistent position sizing across trades",
          "Good profit-taking discipline",
          "Balanced mix of winning and losing trades"
        ],
        risk_management_score: Math.floor(Math.random() * 3) + 7,
        recommendations: [
          "Consider increasing position size on higher probability setups",
          "Track your win rate more systematically",
          "Consider using trailing stops on winning positions",
          "Document your trading rationale for each setup"
        ],
        strengths: [
          "Disciplined risk management",
          "Consistent trading approach",
          "Good emotional control visible in trade execution",
          "Appropriate position sizing"
        ],
        areas_for_improvement: [
          "Could optimize entry timing",
          "Consider diversifying across more instruments",
          "Track performance metrics more systematically"
        ],
        performance_evolution: "Your trading approach appears to be evolving positively with improved discipline over time"
      };

      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      setAnalysisResult(mockResult);
    } catch (error) {
      setError('Analysis failed. Please ensure your screenshots show trading data clearly.');
    }

    setIsAnalyzing(false);
  };

  return (
    <Card className="glass-effect">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full">
            <Brain className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <h1 className="font-apple font-bold text-4xl lg:text-5xl bg-gradient-to-r from-purple-400 via-blue-400 to-accent-gold bg-clip-text text-transparent leading-tight">
          AI Trade Analyst
        </h1>
        <p className="text-secondary text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
          Upload multiple screenshots of your trading platform for comprehensive AI analysis of your performance
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mock Mode Warning */}
        <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-accent-red mt-0.5" />
            <div>
              <h4 className="font-semibold text-accent-red mb-1">Demo Mode Active</h4>
              <p className="text-sm text-secondary">
                This is a demonstration version. Analysis results are simulated for testing purposes.
                <br />
                <span className="text-accent-red">Upload real screenshots to see the interface in action.</span>
              </p>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="border-2 border-dashed border-default rounded-lg p-6 text-center">
          <Camera className="w-12 h-12 text-secondary mx-auto mb-4" />
          <p className="text-secondary mb-2">Upload Screenshots of Your Trading Platform</p>
          <p className="text-sm text-secondary/70 mb-4">
            MT4, MT5, cTrader, TradingView, or any trading platform screenshots (Max 5 files)
          </p>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="bg-surface border-default text-primary"
          />
          <p className="text-xs text-secondary/50 mt-2">
            {uploadedFiles.length}/5 screenshots uploaded
          </p>
        </div>

        {/* Uploaded Files Display */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-primary">Uploaded Screenshots ({uploadedFiles.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="relative">
                  <div className="border border-default rounded-lg p-3 bg-surface/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-primary truncate">
                        Screenshot {index + 1}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0 text-accent-red hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <img 
                      src={file.url} 
                      alt={`Trading screenshot ${index + 1}`} 
                      className="w-full h-32 object-cover rounded border border-default"
                    />
                    <p className="text-xs text-secondary mt-1 truncate">{file.name}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {uploadedFiles.length < 5 && (
              <div className="text-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button variant="outline" className="border-default text-primary hover:bg-surface">
                    <Plus className="w-4 h-4 mr-2" />
                    Add More Screenshots
                  </Button>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Analyze Button */}
        <Button
          onClick={analyzeTradeHistory}
          disabled={uploadedFiles.length === 0 || isAnalyzing}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
              Analyzing {uploadedFiles.length} Screenshot{uploadedFiles.length > 1 ? 's' : ''}...
            </>
          ) : (
            <>
              <Brain className="w-5 h-5 mr-2" />
              Analyze My Trading Performance (Mock)
              {uploadedFiles.length > 0 && ` (${uploadedFiles.length} screenshots)`}
            </>
          )}
        </Button>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-accent-red rounded-lg">
            {error}
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-primary">Comprehensive Analysis Results (Mock Data)</h3>
            
            {/* Overall Analysis */}
            <Card className="bg-surface/50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Overall Analysis ({analysisResult.screenshots_analyzed} Screenshots)
                </h4>
                <p className="text-secondary">{analysisResult.overall_analysis}</p>
                <div className="flex gap-2 mt-2">
                  {analysisResult.total_trades_identified && (
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                      {analysisResult.total_trades_identified} total trades identified
                    </Badge>
                  )}
                  <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                    {analysisResult.screenshots_analyzed} screenshots analyzed
                  </Badge>
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                    Mock Analysis
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Performance Overview */}
            <Card className="bg-surface/50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-primary mb-2">Performance Overview</h4>
                <p className="text-secondary">{analysisResult.overall_performance}</p>
                {analysisResult.risk_management_score && (
                  <div className="mt-2">
                    <Badge className={`${
                      analysisResult.risk_management_score >= 8 ? 'bg-green-500/10 text-accent-green border-green-500/20' :
                      analysisResult.risk_management_score >= 6 ? 'bg-yellow-500/10 text-accent-gold border-yellow-500/20' :
                      'bg-red-500/10 text-accent-red border-red-500/20'
                    }`}>
                      Risk Management Score: {analysisResult.risk_management_score}/10
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Consistency Analysis */}
            {analysisResult.consistency_analysis && (
              <Card className="bg-surface/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-primary mb-2">Consistency Analysis</h4>
                  <p className="text-secondary">{analysisResult.consistency_analysis}</p>
                </CardContent>
              </Card>
            )}

            {/* Performance Evolution */}
            {analysisResult.performance_evolution && (
              <Card className="bg-surface/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-primary mb-2">Performance Evolution</h4>
                  <p className="text-secondary">{analysisResult.performance_evolution}</p>
                </CardContent>
              </Card>
            )}

            {/* Strengths */}
            {analysisResult.strengths && analysisResult.strengths.length > 0 && (
              <Card className="bg-surface/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-accent-green" />
                    What You're Doing Well
                  </h4>
                  <ul className="space-y-2">
                    {analysisResult.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 text-accent-green mt-1 flex-shrink-0" />
                        <span className="text-secondary">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Areas for Improvement */}
            {analysisResult.areas_for_improvement && analysisResult.areas_for_improvement.length > 0 && (
              <Card className="bg-surface/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent-gold" />
                    Areas for Improvement
                  </h4>
                  <ul className="space-y-2">
                    {analysisResult.areas_for_improvement.map((area, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-accent-gold mt-1 flex-shrink-0" />
                        <span className="text-secondary">{area}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Key Insights */}
            <Card className="bg-surface/50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-primary mb-2">Key Insights</h4>
                <ul className="space-y-2">
                  {analysisResult.key_insights?.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-accent-green mt-1 flex-shrink-0" />
                      <span className="text-secondary">{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="bg-surface/50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-primary mb-2">Recommendations</h4>
                <ul className="space-y-2">
                  {analysisResult.recommendations?.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-accent-gold mt-1 flex-shrink-0" />
                      <span className="text-secondary">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
