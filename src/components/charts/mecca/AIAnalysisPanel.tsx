import React from 'react';
import { Brain, Target, TrendingUp, TrendingDown, Zap, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import BiasGauge from './BiasGauge';
import ConfidenceRing from './ConfidenceRing';
import { neonColors } from './neonTheme';

// Green/black abstract organic texture background
const bgImageUrl = 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2029&auto=format&fit=crop';

// Glassmorphism card wrapper with background image
const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`relative rounded-2xl overflow-hidden ${className}`}
    style={{
      border: `1px solid ${neonColors.neonGreen}20`,
      boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 20px ${neonColors.neonGreenGlow}`,
    }}
  >
    {/* Background Image Layer */}
    <div
      className="absolute inset-0 z-0"
      style={{
        backgroundImage: `url(${bgImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.3,
      }}
    />
    {/* Glassmorphism Overlay */}
    <div
      className="absolute inset-0 z-[1]"
      style={{
        background: 'rgba(10, 15, 13, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    />
    {/* Content */}
    <div className="relative z-[2] h-full flex flex-col">
      {children}
    </div>
  </div>
);

interface SupportResistance {
  price: number;
  label: string;
}

interface Pattern {
  type: string;
  description: string;
}

interface AnalysisResult {
  insight: string;
  support: SupportResistance[];
  resistance: SupportResistance[];
  patterns: Pattern[];
  bias: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

interface AIAnalysisPanelProps {
  analysis: AnalysisResult | null;
  currentPrice: number | null;
  isAnalyzing: boolean;
  error: string | null;
}

const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  analysis,
  currentPrice,
  isAnalyzing,
  error,
}) => {
  const formatPrice = (price: number) => {
    if (price > 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toFixed(price < 10 ? 4 : 2);
  };

  const getDistanceFromPrice = (levelPrice: number) => {
    if (!currentPrice) return 0;
    return ((levelPrice - currentPrice) / currentPrice) * 100;
  };

  // Loading state
  if (isAnalyzing) {
    return (
      <GlassCard className="h-full">
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-full animate-spin"
              style={{
                border: `3px solid ${neonColors.borderDefault}`,
                borderTopColor: neonColors.neonGreen,
              }}
            />
            <Brain
              className="absolute inset-0 m-auto w-8 h-8"
              style={{ color: neonColors.neonGreen }}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: neonColors.textPrimary }}>
              AI Analyzing...
            </p>
            <p className="text-xs mt-1" style={{ color: neonColors.textDim }}>
              Processing market data
            </p>
          </div>
          
          {/* Scanning effect */}
          <div
            className="w-full h-1 rounded-full overflow-hidden"
            style={{ background: neonColors.borderDefault }}
          >
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                width: '60%',
                background: `linear-gradient(90deg, transparent, ${neonColors.neonGreen}, transparent)`,
                animation: 'scanline 1.5s infinite',
              }}
            />
          </div>
        </div>
      </GlassCard>
    );
  }

  // Error state
  if (error) {
    return (
      <GlassCard className="h-full">
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
          <AlertTriangle className="w-12 h-12" style={{ color: neonColors.negative }} />
          <p className="text-sm text-center" style={{ color: neonColors.negative }}>
            {error}
          </p>
        </div>
      </GlassCard>
    );
  }

  // Empty state
  if (!analysis) {
    return (
      <GlassCard className="h-full">
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: neonColors.neonGreenSubtle,
              border: `1px solid ${neonColors.borderDefault}`,
            }}
          >
            <Brain className="w-10 h-10" style={{ color: neonColors.neonGreen }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: neonColors.textPrimary }}>
              AI Analysis Ready
            </p>
            <p className="text-xs mt-1" style={{ color: neonColors.textDim }}>
              Click "Analyze" to get AI-powered insights
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  // Analysis results
  return (
    <GlassCard className="h-full">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: `1px solid ${neonColors.borderDefault}` }}
      >
        <Zap className="w-4 h-4" style={{ color: neonColors.neonGreen }} />
        <span className="text-sm font-semibold" style={{ color: neonColors.textPrimary }}>
          AI Analysis
        </span>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Bias Gauge & Confidence */}
        <div className="flex items-center justify-around gap-4">
          <BiasGauge bias={analysis.bias} confidence={analysis.confidence} />
          <ConfidenceRing value={analysis.confidence} size={80} />
        </div>

        {/* Insight */}
        <div
          className="p-3 rounded-xl"
          style={{
            background: neonColors.neonGreenSubtle,
            border: `1px solid ${neonColors.borderDefault}`,
          }}
        >
          <p className="text-xs leading-relaxed" style={{ color: neonColors.textSecondary }}>
            {analysis.insight}
          </p>
        </div>

        {/* S/R Levels */}
        <div className="grid grid-cols-2 gap-3">
          {/* Support Levels */}
          <div
            className="p-3 rounded-xl"
            style={{
              background: 'rgba(34, 197, 94, 0.05)',
              border: `1px solid rgba(34, 197, 94, 0.2)`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <ChevronDown className="w-4 h-4" style={{ color: neonColors.positive }} />
              <span className="text-xs font-semibold" style={{ color: neonColors.positive }}>
                Support
              </span>
            </div>
            <div className="space-y-2">
              {analysis.support.length > 0 ? (
                analysis.support.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: neonColors.textDim }}>
                      {s.label}
                    </span>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold" style={{ color: neonColors.textPrimary }}>
                        {formatPrice(s.price)}
                      </span>
                      <span className="text-[9px] ml-1" style={{ color: neonColors.positive }}>
                        {getDistanceFromPrice(s.price).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-[10px]" style={{ color: neonColors.textDim }}>
                  No levels found
                </span>
              )}
            </div>
          </div>

          {/* Resistance Levels */}
          <div
            className="p-3 rounded-xl"
            style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: `1px solid rgba(239, 68, 68, 0.2)`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <ChevronUp className="w-4 h-4" style={{ color: neonColors.negative }} />
              <span className="text-xs font-semibold" style={{ color: neonColors.negative }}>
                Resistance
              </span>
            </div>
            <div className="space-y-2">
              {analysis.resistance.length > 0 ? (
                analysis.resistance.map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: neonColors.textDim }}>
                      {r.label}
                    </span>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold" style={{ color: neonColors.textPrimary }}>
                        {formatPrice(r.price)}
                      </span>
                      <span className="text-[9px] ml-1" style={{ color: neonColors.negative }}>
                        +{getDistanceFromPrice(r.price).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-[10px]" style={{ color: neonColors.textDim }}>
                  No levels found
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Patterns */}
        {analysis.patterns && analysis.patterns.length > 0 && (
          <div
            className="p-3 rounded-xl"
            style={{
              background: 'rgba(168, 85, 247, 0.05)',
              border: `1px solid rgba(168, 85, 247, 0.2)`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4" style={{ color: neonColors.neonPurple }} />
              <span className="text-xs font-semibold" style={{ color: neonColors.neonPurple }}>
                Patterns Detected
              </span>
            </div>
            <div className="space-y-2">
              {analysis.patterns.map((p, i) => (
                <div key={i}>
                  <span className="text-xs font-medium" style={{ color: neonColors.textPrimary }}>
                    {p.type}
                  </span>
                  <p className="text-[10px]" style={{ color: neonColors.textDim }}>
                    {p.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default AIAnalysisPanel;
