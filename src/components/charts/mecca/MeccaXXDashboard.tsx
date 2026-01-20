import React, { useState, useCallback, useEffect } from 'react';
import { Brain, Key, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { TradingViewWidget } from '../TradingViewWidget';
import MarketTickerBar from './MarketTickerBar';
import NewsCalendar from './NewsCalendar';
import AIAnalysisPanel from './AIAnalysisPanel';
import SessionTimeline from './SessionTimeline';
import TimeframeSelector from './TimeframeSelector';
import { neonColors, neonCardStyle, neonAnimations } from './neonTheme';

// Green/black abstract organic texture background for glass cards
const bgImageUrl = 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2029&auto=format&fit=crop';

// Glassmorphism card with background image (for API Key & API Key Status)
const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`relative rounded-2xl overflow-hidden ${className}`}
    style={{
      border: `1px solid ${neonColors.neonGreen}20`,
      boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 20px ${neonColors.neonGreenGlow}`,
    }}
  >
    <div className="absolute inset-0 z-0" style={{ backgroundImage: `url(${bgImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.3 }} />
    <div className="absolute inset-0 z-[1]" style={{ background: 'rgba(10, 15, 13, 0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }} />
    <div className="relative z-[2]">{children}</div>
  </div>
);

// Hook to detect screen size
const useResponsive = () => {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  useEffect(() => {
    const checkSize = () => {
      if (window.innerWidth < 768) {
        setScreenSize('mobile');
      } else if (window.innerWidth < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  
  return {
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop',
    screenSize,
  };
};

interface AnalysisResult {
  insight: string;
  support: { price: number; label: string }[];
  resistance: { price: number; label: string }[];
  patterns: { type: string; description: string }[];
  bias: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

const MeccaXXDashboard: React.FC = () => {
  // State
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('1h');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);

  // Responsive hook
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // Live price hook
  const { livePrice } = useOptimizedLivePrice(symbol, { debounceMs: 100 });

  // Calculate chart height based on screen size
  const getChartHeight = () => {
    if (isMobile) return 300;
    if (isTablet) return 400;
    return 500;
  };

  // API Key handlers
  const handleSetApiKey = useCallback(() => {
    if (apiKey.trim().length > 20) {
      setIsApiKeySet(true);
      setError(null);
    } else {
      setError('Please enter a valid Gemini API key');
    }
  }, [apiKey]);

  const handleClearApiKey = useCallback(() => {
    setApiKey('');
    setIsApiKeySet(false);
    setAnalysis(null);
    setError(null);
  }, []);

  // Analysis handler
  const analyzeSetup = useCallback(async () => {
    if (!isApiKeySet) {
      setError('Please set your API key first');
      return;
    }

    const currentPriceValue = livePrice && livePrice > 0 ? livePrice : 0;

    if (!currentPriceValue || currentPriceValue <= 0) {
      setError('Waiting for live price data...');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const highPrice = currentPriceValue * 1.01;
      const lowPrice = currentPriceValue * 0.99;

      const prompt = `You are a professional technical analyst. Analyze ${symbol} on the ${timeframe} timeframe and provide trading insights.

CURRENT LIVE PRICE: ${currentPriceValue.toFixed(2)} (This is the REAL-TIME price right now)
Approximate High: ${highPrice.toFixed(2)}
Approximate Low: ${lowPrice.toFixed(2)}

Based on your knowledge of ${symbol} price action and common technical levels, respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "insight": "Brief 2-3 sentence market analysis based on current price ${currentPriceValue.toFixed(2)}",
  "support": [{ "price": <number below ${currentPriceValue.toFixed(2)}>, "label": "S1" }, { "price": <number below S1>, "label": "S2" }],
  "resistance": [{ "price": <number above ${currentPriceValue.toFixed(2)}>, "label": "R1" }, { "price": <number above R1>, "label": "R2" }],
  "patterns": [{ "type": "pattern name", "description": "brief description" }],
  "bias": "bullish" or "bearish" or "neutral",
  "confidence": <number 0-100>
}

CRITICAL RULES:
- The current live price is EXACTLY ${currentPriceValue.toFixed(2)} - use this for all calculations
- Support prices MUST be BELOW ${currentPriceValue.toFixed(2)}
- Resistance prices MUST be ABOVE ${currentPriceValue.toFixed(2)}
- Identify 2-3 key S/R levels based on round numbers and typical price action for ${symbol}
- Be concise and actionable`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `API request failed (${response.status})`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      let jsonText = text;
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        const rawJsonMatch = text.match(/\{[\s\S]*\}/);
        if (rawJsonMatch) {
          jsonText = rawJsonMatch[0];
        }
      }

      if (!jsonText || !jsonText.includes('{')) {
        throw new Error('Invalid response format from Gemini');
      }

      const result: AnalysisResult = JSON.parse(jsonText);

      if (!result.insight || !Array.isArray(result.support) || !Array.isArray(result.resistance)) {
        throw new Error('Incomplete analysis response');
      }

      result.support = result.support
        .filter((s) => typeof s.price === 'number' && s.price > 0 && s.price < currentPriceValue)
        .slice(0, 3);

      result.resistance = result.resistance
        .filter((r) => typeof r.price === 'number' && r.price > 0 && r.price > currentPriceValue)
        .slice(0, 3);

      setAnalysis(result);
    } catch (err) {
      console.error('Analysis error:', err);
      setError((err as Error).message || 'Failed to analyze setup');
    } finally {
      setIsAnalyzing(false);
    }
  }, [isApiKeySet, symbol, timeframe, apiKey, livePrice]);

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: neonColors.bgPrimary }}
    >
      {/* Inject animations */}
      <style>{neonAnimations}</style>

      {/* Market Ticker */}
      <MarketTickerBar selectedSymbol={symbol} onSelectSymbol={setSymbol} />

      {/* Main Content - Scrollable on mobile */}
      <div className={`flex-1 flex flex-col lg:flex-row gap-3 p-3 ${isMobile ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {/* Left Sidebar - News Calendar (Hidden on mobile/tablet) */}
        {isDesktop && (
          <div className="w-64 shrink-0 h-full">
            <NewsCalendar />
          </div>
        )}

        {/* Center - Chart */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Timeframe Selector & Price Header */}
          <div
            className="flex items-center justify-between px-3 md:px-4 py-2 rounded-xl"
            style={{
              background: neonColors.bgCard,
              border: `1px solid ${neonColors.borderDefault}`,
            }}
          >
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-xs md:text-sm font-bold" style={{ color: neonColors.neonGreenLight }}>
                {symbol}
              </span>
              <span className="text-xs hidden sm:inline" style={{ color: neonColors.textDim }}>
                |
              </span>
              <span className="text-base md:text-lg font-mono font-bold" style={{ color: neonColors.textPrimary }}>
                {livePrice
                  ? livePrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '---'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TimeframeSelector selectedTimeframe={timeframe} onSelect={setTimeframe} />
              {/* AI Button for mobile - toggles AI panel */}
              {!isDesktop && (
                <button
                  onClick={() => setShowAIPanel(!showAIPanel)}
                  className="p-2 rounded-lg transition-all"
                  style={{
                    background: showAIPanel 
                      ? `linear-gradient(135deg, ${neonColors.neonGreen} 0%, ${neonColors.neonGreenDark} 100%)`
                      : neonColors.bgSecondary,
                    border: `1px solid ${showAIPanel ? neonColors.neonGreen : neonColors.borderDefault}`,
                    boxShadow: showAIPanel ? `0 0 15px ${neonColors.neonGreenGlow}` : 'none',
                  }}
                >
                  <Brain className="w-4 h-4" style={{ color: showAIPanel ? '#000' : neonColors.textPrimary }} />
                </button>
              )}
            </div>
          </div>

          {/* TradingView Chart */}
          <div 
            className="rounded-2xl overflow-hidden" 
            style={{
              ...neonCardStyle,
              height: isMobile ? '300px' : isTablet ? '400px' : 'auto',
              flex: isDesktop ? 1 : 'none',
              minHeight: isMobile ? '300px' : isTablet ? '400px' : '450px',
            }}
          >
            <TradingViewWidget
              symbol={symbol}
              timeframe={timeframe}
              height={getChartHeight()}
              isDarkMode={true}
              className="h-full w-full"
            />
          </div>

          {/* Session Timeline - Hidden on mobile to save space */}
          {!isMobile && <SessionTimeline />}
        </div>

        {/* Right Sidebar - AI Analysis (Desktop: always visible, Mobile/Tablet: toggle) */}
        {(isDesktop || showAIPanel) && (
          <div className={`${isDesktop ? 'w-72' : 'w-full'} flex flex-col gap-3 shrink-0 ${!isDesktop ? 'mt-3' : ''}`}>
            {/* API Key Card */}
            {!isApiKeySet ? (
              <GlassCard>
                <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, ${neonColors.neonGreen} 0%, ${neonColors.neonGreenDark} 100%)`,
                      boxShadow: `0 0 15px ${neonColors.neonGreenGlow}`,
                    }}
                  >
                    <Key className="w-4 h-4 text-black" />
                  </div>
                  <h3 className="font-semibold text-sm" style={{ color: neonColors.textPrimary }}>
                    Gemini API Key
                  </h3>
                </div>
                <p className="text-xs mb-3" style={{ color: neonColors.textDim }}>
                  Enter your Google Gemini API key to enable AI analysis.
                </p>
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIza..."
                      className="w-full px-3 py-2 pr-10 rounded-lg text-sm"
                      style={{
                        background: neonColors.bgSecondary,
                        border: `1px solid ${neonColors.borderDefault}`,
                        color: neonColors.textPrimary,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      style={{ color: neonColors.textMuted }}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={handleSetApiKey}
                    className="px-4 py-2 rounded-lg text-sm font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${neonColors.neonGreen} 0%, ${neonColors.neonGreenDark} 100%)`,
                      color: '#000',
                      boxShadow: `0 0 15px ${neonColors.neonGreenGlow}`,
                    }}
                  >
                    Set
                  </button>
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-xs mt-2" style={{ color: neonColors.negative }}>
                    <AlertCircle className="w-3 h-3" />
                    {error}
                  </div>
                )}
                <p className="text-[10px] mt-2" style={{ color: neonColors.textDim }}>
                  Get your free API key at{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: neonColors.neonGreen }}
                  >
                    Google AI Studio
                  </a>
                </p>
                </div>
              </GlassCard>
            ) : (
              <>
                {/* API Key Status */}
                <GlassCard className="rounded-xl">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" style={{ color: neonColors.neonGreen }} />
                      <span className="text-xs" style={{ color: neonColors.textSecondary }}>
                        API Key Set
                      </span>
                    </div>
                    <button
                      onClick={handleClearApiKey}
                      className="text-xs"
                      style={{ color: neonColors.textDim }}
                    >
                      Change
                    </button>
                  </div>
                </GlassCard>

                {/* Analyze Button */}
                <button
                  onClick={analyzeSetup}
                  disabled={isAnalyzing || !livePrice}
                  className="w-full py-3 md:py-4 rounded-xl text-sm md:text-base font-bold flex items-center justify-center gap-2 transition-all duration-200"
                  style={{
                    background: isAnalyzing
                      ? neonColors.bgSecondary
                      : `linear-gradient(135deg, ${neonColors.neonGreen} 0%, ${neonColors.neonGreenDark} 100%)`,
                    color: isAnalyzing ? neonColors.textMuted : '#000',
                    boxShadow: isAnalyzing ? 'none' : `0 0 25px ${neonColors.neonGreenGlow}`,
                    opacity: !livePrice ? 0.5 : 1,
                    cursor: isAnalyzing || !livePrice ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 md:w-5 md:h-5" />
                      Analyze Setup
                    </>
                  )}
                </button>
              </>
            )}

            {/* AI Analysis Panel */}
            <div className={`${isDesktop ? 'flex-1 min-h-0' : ''} overflow-hidden`}>
              <AIAnalysisPanel
                analysis={analysis}
                currentPrice={livePrice}
                isAnalyzing={isAnalyzing}
                error={isApiKeySet ? error : null}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Bottom padding for safe area */}
      {isMobile && <div className="h-20 shrink-0" />}
    </div>
  );
};

export default MeccaXXDashboard;
