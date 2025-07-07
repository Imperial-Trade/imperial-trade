import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Brain, Upload, FileText, TrendingUp, AlertTriangle, Camera, X, Plus } from 'lucide-react';
import { UploadFile, InvokeLLM } from '@/api/integrations';
import { TradeHistory } from '@/api/entities';

export default function TradeAnalyst() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
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
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await UploadFile({ file });
        return { name: file.name, url: file_url, type: file.type };
      });

      const newFiles = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      setError('Failed to upload screenshots. Please try again.');
    }
  };

  const removeFile = (indexToRemove) => {
    setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const analyzeTradeHistory = async () => {
    if (uploadedFiles.length === 0) return;

    setIsAnalyzing(true);
    setError('');

    try {
      const analysisPrompt = `
        You are an expert trading performance analyst. Analyze the uploaded trading platform screenshots and provide comprehensive, detailed insights.

        I have uploaded ${uploadedFiles.length} screenshot(s) of my trading platform. Please analyze ALL screenshots together to get a complete picture of my trading performance.

        Look for and analyze across all screenshots:
        1. Individual trade details (entry/exit prices, P&L, lot sizes, instruments)
        2. Overall win rate and profit/loss patterns across all visible trades
        3. Risk management consistency (position sizing, stop losses, risk-reward ratios)
        4. Trading instruments and market exposure diversity
        5. Time-based patterns if timestamps are visible across sessions
        6. Account balance progression and equity management
        7. Behavioral patterns and psychological insights
        8. Performance differences between different time periods or sessions
        9. Consistency in trading approach across different screenshots

        Provide specific observations from what you can see across ALL screenshots and give actionable recommendations for improvement.

        Focus on:
        - Overall trading performance summary across all screenshots
        - Consistency patterns between different sessions/periods
        - What they're doing well consistently
        - Areas for improvement based on multiple data points
        - Specific risk management suggestions
        - Position sizing recommendations
        - Market timing observations
        - Evolution or changes in trading approach if visible
      `;

      const fileUrls = uploadedFiles.map(file => file.url);

      const result = await InvokeLLM({
        prompt: analysisPrompt,
        file_urls: fileUrls,
        response_json_schema: {
          type: "object",
          properties: {
            overall_analysis: { type: "string" },
            screenshots_analyzed: { type: "number" },
            total_trades_identified: { type: "number" },
            overall_performance: { type: "string" },
            consistency_analysis: { type: "string" },
            key_insights: { type: "array", items: { type: "string" } },
            risk_management_score: { type: "number" },
            recommendations: { type: "array", items: { type: "string" } },
            strengths: { type: "array", items: { type: "string" } },
            areas_for_improvement: { type: "array", items: { type: "string" } },
            performance_evolution: { type: "string" }
          }
        }
      });

      // Save analysis to database with all file URLs
      await TradeHistory.create({
        file_url: JSON.stringify(fileUrls), // Store multiple URLs as JSON
        analysis_result: JSON.stringify(result),
        status: 'analyzed'
      });

      setAnalysisResult(result);
    } catch (error) {
      setError('Analysis failed. Please ensure your screenshots show trading data clearly.');
      await TradeHistory.create({
        file_url: JSON.stringify(uploadedFiles.map(f => f.url)),
        status: 'error'
      });
    }

    setIsAnalyzing(false);
  };

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-400" />
          AI Trade Analyst - "The Deconstructor"
        </CardTitle>
        <p className="text-secondary">
          Upload multiple screenshots of your trading platform for comprehensive AI analysis of your performance
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
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
              Analyze My Trading Performance
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
            <h3 className="text-xl font-semibold text-primary">Comprehensive Analysis Results</h3>
            
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