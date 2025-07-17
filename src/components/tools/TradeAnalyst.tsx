import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Camera, FileImage, AlertCircle, CheckCircle } from 'lucide-react';

const TradeAnalyst: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setAnalysisResult(null);
    }
  };

  const analyzeScreenshot = () => {
    if (!uploadedFile) return;
    
    setIsAnalyzing(true);
    
    // Mock analysis - replace with actual AI analysis
    setTimeout(() => {
      setAnalysisResult(`
**Trade Analysis Results:**

**Technical Analysis:**
- Trend: Bullish momentum with strong support at $150
- RSI: Overbought at 72, suggesting potential pullback
- Volume: Above average, confirming price movement

**Risk Assessment:**
- Risk/Reward Ratio: 1:2.5 (Favorable)
- Entry Point: Current level shows good risk management
- Stop Loss: Recommended at $148.50

**Recommendations:**
- Consider partial profit taking at resistance level
- Monitor for volume confirmation on breakout
- Adjust position size based on volatility

**Performance Score: 8.2/10**
      `);
      setIsAnalyzing(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
          Trade Analyst
        </h2>
        <p className="text-muted-foreground">
          Upload screenshots for deep performance analysis and AI-powered insights.
        </p>
      </div>

      {/* Upload Section */}
      <Card className="border-dashed border-2 border-primary/20 hover:border-primary/40 transition-colors">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-full flex items-center justify-center">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Upload Screenshots of Your Trading Platform</h3>
              <p className="text-muted-foreground text-sm">
                Support for PNG, JPG, and JPEG files up to 10MB
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="screenshot-upload"
              />
              <label
                htmlFor="screenshot-upload"
                className="cursor-pointer flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Choose File
              </label>
              
              {uploadedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileImage className="h-4 w-4" />
                  {uploadedFile.name}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Button */}
      {uploadedFile && (
        <div className="text-center">
          <Button
            onClick={analyzeScreenshot}
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white px-8 py-3 rounded-lg font-semibold"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing Performance...
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Analyze My Trading Performance (Mock)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <Card className="border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-semibold">Analysis Complete</h3>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                {analysisResult}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notice */}
      <Card className="bg-amber-500/10 border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-300 mb-1">Demo Version</p>
              <p className="text-amber-600 dark:text-amber-400">
                This is a demonstration version. Analysis results are simulated for testing purposes.
                Upload screenshots to see the interface in action.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeAnalyst;