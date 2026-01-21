import React from 'react';
import { X, TrendingUp, TrendingDown, Minus, Target, Shield, AlertTriangle, Zap, Brain, ChevronUp, ChevronDown, Info, Lightbulb } from 'lucide-react';
import { ProAnalysisResult } from './proAnalysisTypes';
import { neonColors } from './neonTheme';

// Green accent colors
const greenAccent = {
  primary: '#22c55e',
  light: '#4ade80',
  dark: '#16a34a',
};

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ProAnalysisResult | null;
  isLoading: boolean;
}

// Conviction Gauge Component (Semi-circle)
const ConvictionGauge: React.FC<{ grade: string; breakdown: { trendAlignment: number; volumeProfile: number; macroContext: number; technicalConfluence: number } }> = ({ grade, breakdown }) => {
  const gradeToAngle = (g: string): number => {
    const grades: Record<string, number> = {
      'A+': 170, 'A': 155, 'A-': 140,
      'B+': 125, 'B': 110, 'B-': 95,
      'C': 70, 'D': 45, 'F': 20,
    };
    return grades[g] || 90;
  };
  
  const angle = gradeToAngle(grade);
  const gradeColor = angle > 120 ? greenAccent.primary : angle > 70 ? '#f59e0b' : '#ef4444';
  
  const avgScore = Math.round((breakdown.trendAlignment + breakdown.volumeProfile + breakdown.macroContext + breakdown.technicalConfluence) / 4 * 10);
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 overflow-hidden">
        {/* Background arc */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-32 rounded-t-full"
          style={{ 
            background: `conic-gradient(from 180deg, ${neonColors.borderDefault} 0deg, ${neonColors.borderDefault} 180deg)`,
            clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)',
          }}
        />
        {/* Colored arc */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-32 rounded-t-full"
          style={{ 
            background: `conic-gradient(from 180deg, ${gradeColor} 0deg, ${gradeColor} ${angle}deg, transparent ${angle}deg)`,
            clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)',
          }}
        />
        {/* Needle */}
        <div 
          className="absolute bottom-0 left-1/2 w-0.5 h-12 origin-bottom"
          style={{ 
            background: 'white',
            transform: `translateX(-50%) rotate(${angle - 90}deg)`,
            boxShadow: '0 0 4px rgba(255,255,255,0.5)',
          }}
        />
        {/* Center dot */}
        <div 
          className="absolute bottom-0 left-1/2 w-3 h-3 rounded-full -translate-x-1/2 translate-y-1/2"
          style={{ background: 'white' }}
        />
      </div>
      <div className="text-2xl font-bold mt-2" style={{ color: gradeColor }}>{grade}</div>
      <div className="text-xs" style={{ color: neonColors.textMuted }}>Conviction Score: {avgScore}%</div>
    </div>
  );
};

// Direction Badge
const DirectionBadge: React.FC<{ direction: string }> = ({ direction }) => {
  const config = {
    LONG: { icon: TrendingUp, color: greenAccent.primary, bg: 'rgba(34, 197, 94, 0.15)' },
    SHORT: { icon: TrendingDown, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    NEUTRAL: { icon: Minus, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  }[direction] || { icon: Minus, color: neonColors.textMuted, bg: neonColors.bgSecondary };
  
  const Icon = config.icon;
  
  return (
    <div 
      className="flex items-center gap-2 px-4 py-2 rounded-xl"
      style={{ background: config.bg, border: `1px solid ${config.color}40` }}
    >
      <Icon className="w-5 h-5" style={{ color: config.color }} />
      <span className="font-bold" style={{ color: config.color }}>{direction}</span>
    </div>
  );
};

// Price Level Row
const PriceRow: React.FC<{ label: string; price: number; color: string; subtext?: string }> = ({ label, price, color, subtext }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-xs" style={{ color: neonColors.textMuted }}>{label}</span>
    <div className="text-right">
      <span className="text-sm font-mono font-bold" style={{ color }}>{price.toFixed(2)}</span>
      {subtext && <span className="text-[10px] ml-1" style={{ color: neonColors.textDim }}>{subtext}</span>}
    </div>
  </div>
);

// Section Card
const SectionCard: React.FC<{ title: string; icon: React.ElementType; iconColor: string; children: React.ReactNode }> = ({ title, icon: Icon, iconColor, children }) => (
  <div 
    className="rounded-xl p-3"
    style={{ background: neonColors.bgSecondary, border: `1px solid ${neonColors.borderDefault}` }}
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4" style={{ color: iconColor }} />
      <span className="text-xs font-semibold" style={{ color: neonColors.textPrimary }}>{title}</span>
    </div>
    {children}
  </div>
);

const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, analysis, isLoading }) => {
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-[101] animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: '85vh' }}
      >
        <div 
          className="mx-auto rounded-t-3xl overflow-hidden"
          style={{ 
            maxWidth: '1100px',
            background: 'linear-gradient(180deg, rgba(13, 13, 24, 0.98) 0%, rgba(10, 10, 18, 0.98) 100%)',
            border: `1px solid ${greenAccent.primary}30`,
            borderBottom: 'none',
            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 rounded-full" style={{ background: neonColors.borderDefault }} />
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b" style={{ borderColor: neonColors.borderDefault }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: `${greenAccent.primary}20` }}>
                <Brain className="w-5 h-5" style={{ color: greenAccent.primary }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: neonColors.textPrimary }}>AI Analysis</h2>
                {analysis && (
                  <p className="text-xs" style={{ color: neonColors.textMuted }}>
                    {analysis.symbol} • {analysis.timeframe} • {new Date(analysis.analyzedAt).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" style={{ color: neonColors.textMuted }} />
            </button>
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(85vh - 100px)' }}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="relative">
                  <div 
                    className="w-16 h-16 rounded-full animate-spin"
                    style={{ border: `3px solid ${neonColors.borderDefault}`, borderTopColor: greenAccent.primary }}
                  />
                  <Brain className="absolute inset-0 m-auto w-8 h-8" style={{ color: greenAccent.primary }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: neonColors.textPrimary }}>Analyzing Market Data...</p>
                  <p className="text-xs mt-1" style={{ color: neonColors.textDim }}>Calculating indicators & running AI</p>
                </div>
              </div>
            ) : analysis ? (
              <div className="space-y-4">
                {/* Top Row: Direction + Conviction */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex flex-col gap-2">
                    <DirectionBadge direction={analysis.tradeSetup.direction} />
                    <div 
                      className="px-3 py-1.5 rounded-lg text-xs"
                      style={{ 
                        background: analysis.marketStructure.character === 'BOS' ? 'rgba(34, 197, 94, 0.1)' : 
                                   analysis.marketStructure.character === 'CHOCH' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                        color: neonColors.textSecondary 
                      }}
                    >
                      {analysis.marketStructure.character} • {analysis.marketStructure.phase}
                    </div>
                  </div>
                  <ConvictionGauge grade={analysis.tradeSetup.convictionGrade} breakdown={analysis.tradeSetup.convictionBreakdown} />
                </div>
                
                {/* Executive Summary */}
                <div 
                  className="p-3 rounded-xl"
                  style={{ background: `${greenAccent.primary}10`, border: `1px solid ${greenAccent.primary}30` }}
                >
                  <p className="text-sm" style={{ color: neonColors.textPrimary }}>{analysis.executiveSummary}</p>
                </div>
                
                {/* Alpha Lead */}
                <div 
                  className="p-3 rounded-xl"
                  style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4" style={{ color: '#a855f7' }} />
                    <span className="text-xs font-semibold" style={{ color: '#a855f7' }}>Alpha Lead</span>
                  </div>
                  <p className="text-xs" style={{ color: neonColors.textSecondary }}>{analysis.alphaLead}</p>
                </div>
                
                {/* Trade Setup Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Targets */}
                  <SectionCard title="Trade Targets" icon={Target} iconColor={greenAccent.primary}>
                    <div className="space-y-1">
                      <PriceRow label="Entry Zone" price={analysis.tradeSetup.executionZone.min} color={neonColors.textPrimary} subtext={`- ${analysis.tradeSetup.executionZone.max.toFixed(2)}`} />
                      <PriceRow label={`TP1 (${analysis.tradeSetup.targets.tp1.rr})`} price={analysis.tradeSetup.targets.tp1.price} color={greenAccent.primary} />
                      <PriceRow label={`TP2 (${analysis.tradeSetup.targets.tp2.rr})`} price={analysis.tradeSetup.targets.tp2.price} color={greenAccent.light} />
                      <PriceRow label={`TP3 (${analysis.tradeSetup.targets.tp3.rr})`} price={analysis.tradeSetup.targets.tp3.price} color="#06b6d4" />
                    </div>
                  </SectionCard>
                  
                  {/* Risk Management */}
                  <SectionCard title="Risk Management" icon={Shield} iconColor="#f59e0b">
                    <div className="space-y-1">
                      <PriceRow label="Stop Loss" price={analysis.tradeSetup.stopLoss.price} color="#ef4444" />
                      <div className="py-1">
                        <p className="text-[10px]" style={{ color: neonColors.textDim }}>{analysis.tradeSetup.stopLoss.reasoning}</p>
                      </div>
                      <div className="flex justify-between text-xs pt-1" style={{ borderTop: `1px solid ${neonColors.borderDefault}` }}>
                        <span style={{ color: neonColors.textMuted }}>Risk:Reward</span>
                        <span className="font-bold" style={{ color: greenAccent.primary }}>{analysis.riskManagement.riskRewardRatio}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: neonColors.textMuted }}>ATR (14)</span>
                        <span className="font-mono" style={{ color: neonColors.textPrimary }}>{analysis.riskManagement.atr.toFixed(2)}</span>
                      </div>
                    </div>
                  </SectionCard>
                </div>
                
                {/* Support & Resistance */}
                <div className="grid grid-cols-2 gap-3">
                  <SectionCard title="Support Levels" icon={ChevronDown} iconColor={greenAccent.primary}>
                    <div className="space-y-1">
                      {analysis.support.map((s, i) => (
                        <PriceRow key={i} label={s.label} price={s.price} color={greenAccent.primary} />
                      ))}
                    </div>
                  </SectionCard>
                  
                  <SectionCard title="Resistance Levels" icon={ChevronUp} iconColor="#ef4444">
                    <div className="space-y-1">
                      {analysis.resistance.map((r, i) => (
                        <PriceRow key={i} label={r.label} price={r.price} color="#ef4444" />
                      ))}
                    </div>
                  </SectionCard>
                </div>
                
                {/* Devil's Advocate */}
                <div 
                  className="p-3 rounded-xl"
                  style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />
                    <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>Invalidation Scenario</span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: neonColors.textMuted }}>If price breaks:</span>
                    <span className="text-sm font-mono font-bold" style={{ color: '#ef4444' }}>{analysis.alternativeScenario.triggerPrice.toFixed(2)}</span>
                  </div>
                  <p className="text-xs" style={{ color: neonColors.textSecondary }}>{analysis.alternativeScenario.description}</p>
                </div>
                
                {/* Pro Tip & Educational Note */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div 
                    className="p-3 rounded-xl"
                    style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Lightbulb className="w-4 h-4" style={{ color: '#06b6d4' }} />
                      <span className="text-xs font-semibold" style={{ color: '#06b6d4' }}>Pro Tip</span>
                    </div>
                    <p className="text-xs" style={{ color: neonColors.textSecondary }}>{analysis.proTip}</p>
                  </div>
                  
                  <div 
                    className="p-3 rounded-xl"
                    style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Info className="w-4 h-4" style={{ color: '#a855f7' }} />
                      <span className="text-xs font-semibold" style={{ color: '#a855f7' }}>Educational Note</span>
                    </div>
                    <p className="text-xs" style={{ color: neonColors.textSecondary }}>{analysis.educationalNote}</p>
                  </div>
                </div>
                
                {/* Disclaimer */}
                <div className="text-center pt-2">
                  <p className="text-[10px]" style={{ color: neonColors.textDim }}>
                    This analysis is for educational purposes only. Always do your own research and manage your risk.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p style={{ color: neonColors.textMuted }}>No analysis available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AnalysisModal;
