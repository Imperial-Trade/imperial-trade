
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Brain, FileImage, Loader2, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Target, BarChart3, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadFile, InvokeLLM } from '@/api/integrations';
import { toast } from 'sonner';
import { compressImage, validateImageFile } from '@/utils/imageCompression';
import { ComplianceNotice, EducationalBadge, HypotheticalBadge } from '@/components/compliance/ComplianceNotice';

interface AnalysisResult {
  overall_assessment: string;
  strengths: string[];
  areas_for_improvement: string[];
  specific_recommendations: string[];
  risk_management_score: number;
  execution_quality: number;
  market_timing: number;
  position_sizing: number;
  overall_score: number;
}

export default function TradeAnalyst() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [context, setContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file
    const validationError = validateImageFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    
    try {
      // Compress the image
      toast.info("Preparing image for educational analysis...");
      const compressedFile = await compressImage(selectedFile, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        maxFileSize: 2 * 1024 * 1024 // 2MB
      });

      setFile(compressedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(compressedFile);
      
      toast.success("Image prepared for educational analysis");
    } catch (error) {
      console.error('Image processing error:', error);
      setError('Failed to process image. Please try again.');
      toast.error("Failed to process image");
    }
  }, []);

  const analyzeSetup = async () => {
    if (!file) {
      setError('Please upload an educational screenshot first');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    
    try {
      toast.info("Uploading educational screenshot...");
      
      // Upload file
      const uploadResult = await UploadFile({ file });
      const imageUrl = uploadResult.file_url;
      
      toast.success("Screenshot uploaded successfully");
      toast.info("Analyzing educational setup...");

      // Create educational analysis prompt
      const educationalPrompt = `
        EDUCATIONAL SETUP ANALYSIS REQUEST
        
        Please analyze this hypothetical trading setup screenshot for educational purposes only.
        
        Additional Educational Context: "${context || 'No additional context provided'}"
        
        Please provide a comprehensive educational analysis with the following structure:
        
        1. EDUCATIONAL ASSESSMENT:
        Provide an overall educational assessment of this hypothetical setup, focusing on learning opportunities and educational value.
        
        2. EDUCATIONAL STRENGTHS (List 3-4 educational positives):
        - What educational concepts are demonstrated well?
        - What learning objectives are met in this example?
        - What hypothetical decision-making shows good educational principles?
        
        3. LEARNING OPPORTUNITIES (List 3-4 areas for educational improvement):
        - What educational concepts could be better demonstrated?
        - What learning gaps does this example reveal?
        - What educational improvements could enhance understanding?
        
        4. EDUCATIONAL RECOMMENDATIONS (List 3-4 specific learning actions):
        - Specific educational steps to improve understanding
        - Learning resources or concepts to study further
        - Educational exercises to practice these concepts
        
        5. EDUCATIONAL SCORING (Rate each area 1-10 for learning purposes):
        - Risk Management Learning: X/10
        - Execution Education: X/10  
        - Market Timing Concepts: X/10
        - Position Sizing Education: X/10
        - Overall Educational Value: X/10
        
        Remember: This is for educational analysis only. Focus on learning opportunities, educational concepts, and hypothetical examples. Do not provide specific trading advice.
        
        Please format your response as JSON with this exact structure:
        {
          "overall_assessment": "Educational assessment text...",
          "strengths": ["Educational strength 1", "Educational strength 2", "Educational strength 3"],
          "areas_for_improvement": ["Learning opportunity 1", "Learning opportunity 2", "Learning opportunity 3"],
          "specific_recommendations": ["Educational recommendation 1", "Educational recommendation 2", "Educational recommendation 3"],
          "risk_management_score": 8,
          "execution_quality": 7,
          "market_timing": 6,
          "position_sizing": 8,
          "overall_score": 7
        }
      `;

      // Get AI analysis
      const aiResponse = await InvokeLLM({
        prompt: educationalPrompt,
        file_urls: [imageUrl]
      });

      // Parse AI response
      let analysisResult: AnalysisResult;
      try {
        analysisResult = JSON.parse(aiResponse);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        throw new Error('Failed to parse educational analysis results');
      }

      setResult(analysisResult);
      toast.success("Educational analysis completed!");
      
    } catch (error) {
      console.error('Educational analysis error:', error);
      setError('Educational analysis failed. Please try again.');
      toast.error("Educational analysis failed");
    }
    
    setIsAnalyzing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreWidth = (score: number) => `${(score / 10) * 100}%`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Compliance Notice */}
        <ComplianceNotice type="educational" size="md" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Upload and Context */}
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-400" />
                  Educational Setup Learning Analyzer
                </CardTitle>
                <CardDescription>
                  Upload hypothetical setup screenshots for educational analysis and learning feedback
                </CardDescription>
                <div className="flex gap-2">
                  <EducationalBadge />
                  <HypotheticalBadge />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Upload */}
                <div className="space-y-4">
                  <Label>Educational Screenshot Upload</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload educational screenshot
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PNG, JPG up to 10MB (for educational purposes)
                      </span>
                    </label>
                  </div>
                  
                  {preview && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative"
                    >
                      <img
                        src={preview}
                        alt="Educational screenshot preview"
                        className="w-full h-48 object-cover rounded-lg border border-border"
                      />
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Educational Context */}
                <div className="space-y-2">
                  <Label htmlFor="context">Educational Context (Optional)</Label>
                  <Textarea
                    id="context"
                    placeholder="Provide additional educational context about this hypothetical setup for better learning analysis..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="min-h-[120px] bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Add educational context to help focus the learning analysis
                  </p>
                </div>

                {/* Analyze Button */}
                <Button 
                  onClick={analyzeSetup} 
                  disabled={!file || isAnalyzing}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing Educational Setup...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5 mr-2" />
                      Analyze Educational Setup
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
                  {/* Educational Assessment */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-400" />
                        Educational Assessment
                      </CardTitle>
                      <HypotheticalBadge />
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {result.overall_assessment}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Educational Scores */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        Educational Learning Scores
                      </CardTitle>
                      <EducationalBadge />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { label: 'Risk Management Learning', score: result.risk_management_score },
                        { label: 'Execution Education', score: result.execution_quality },
                        { label: 'Market Timing Concepts', score: result.market_timing },
                        { label: 'Position Sizing Education', score: result.position_sizing },
                        { label: 'Overall Educational Value', score: result.overall_score }
                      ].map((item, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-foreground">{item.label}</span>
                            <span className={`text-lg font-bold ${getScoreColor(item.score)}`}>
                              {item.score}/10
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <motion.div
                              className={`h-2 rounded-full ${item.score >= 8 ? 'bg-green-400' : item.score >= 6 ? 'bg-yellow-400' : 'bg-red-400'}`}
                              initial={{ width: 0 }}
                              animate={{ width: getScoreWidth(item.score) }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                            />
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground italic mt-4">
                        Educational scores for learning assessment only
                      </p>
                    </CardContent>
                  </Card>

                  {/* Educational Strengths */}
                  <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        Educational Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Learning Opportunities */}
                  <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-yellow-400" />
                        Learning Opportunities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.areas_for_improvement.map((area, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{area}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Educational Recommendations */}
                  <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-blue-400" />
                        Educational Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.specific_recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <Brain className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-8 text-center">
                    <FileImage className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">Ready for Educational Analysis</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload a hypothetical setup screenshot to get comprehensive educational feedback and learning insights
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
