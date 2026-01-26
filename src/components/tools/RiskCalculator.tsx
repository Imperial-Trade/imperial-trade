
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { 
  Calculator, DollarSign, TrendingUp, Shield, Target, 
  Search, Percent, ArrowUpRight, ArrowDownRight, Sparkles,
  Crosshair, Scale, BarChart3, X, ChevronUp
} from 'lucide-react';
import { useAssetSearch } from '@/hooks/useAssetSearch';
import { calculatePositionSize, calculateRiskAmount, calculatePnL, formatLotSize, getLotSizeSpec } from '@/utils/lotSizing';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';

// Price Ticker Component
const PriceTicker: React.FC = () => {
  const goldPrice = useOptimizedLivePrice('XAUUSD', { debounceMs: 50 });
  const btcPrice = useOptimizedLivePrice('BTCUSD', { debounceMs: 50 });
  const us30Price = useOptimizedLivePrice('U30USD', { debounceMs: 50 });
  const spxPrice = useOptimizedLivePrice('SPXUSD', { debounceMs: 50 });
  const ndxPrice = useOptimizedLivePrice('NDXUSD', { debounceMs: 50 });
  
  const prevPricesRef = useRef<Record<string, number>>({});

  const formatTickerItem = (
    priceData: ReturnType<typeof useOptimizedLivePrice>, 
    label: string,
    symbol: string
  ) => {
    const price = priceData.price || 0;
    const prevPrice = prevPricesRef.current[symbol] || price;
    
    if (price > 0 && price !== prevPrice) {
      prevPricesRef.current[symbol] = price;
    }
    
    const isUp = price > prevPrice;
    const isDown = price < prevPrice;
    const direction = isUp ? 'up' : isDown ? 'down' : (priceData.change >= 0 ? 'up' : 'down');
    
    if (price === 0) return null;
    
    let formattedPrice: string;
    if (price >= 1000) {
      formattedPrice = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      formattedPrice = price.toFixed(2);
    }
    
    const isPriceUp = direction === 'up';
    
    return (
      <span key={label} className="text-[10px] font-medium transition-colors duration-300 flex items-center gap-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white/90">{formattedPrice}</span>
        <span className={isPriceUp ? "text-emerald-400" : "text-red-400"}>{isPriceUp ? "▲" : "▼"}</span>
      </span>
    );
  };

  const tickerItems = [
    formatTickerItem(goldPrice, 'GOLD', 'XAUUSD'),
    formatTickerItem(btcPrice, 'BTC', 'BTCUSD'),
    formatTickerItem(us30Price, 'US30', 'U30USD'),
    formatTickerItem(spxPrice, 'S&P500', 'SPXUSD'),
    formatTickerItem(ndxPrice, 'NAS100', 'NDXUSD')
  ].filter(Boolean);

  return (
    <div className="relative w-full overflow-hidden py-2">
      <div className="inline-flex items-center gap-6 whitespace-nowrap will-change-transform animate-ticker-scroll">
        <div className="inline-flex items-center gap-6 shrink-0">
          {tickerItems}
        </div>
        <div className="inline-flex items-center gap-6 shrink-0">
          {tickerItems}
        </div>
      </div>
      <style>{`
        @keyframes tickerScrollAnim {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker-scroll {
          animation: tickerScrollAnim 25s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default function RiskCalculator() {
  const [formData, setFormData] = useState({
    accountBalance: '',
    riskPercentage: [2],
    riskDollar: '',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    assetTicker: ''
  });
  
  const [riskType, setRiskType] = useState<'percentage' | 'dollar'>('percentage');
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [modalAnimating, setModalAnimating] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout>();

  // Open modal with animation
  const openModal = () => {
    setModalAnimating(true);
    setShowResultsModal(true);
    setTimeout(() => setModalAnimating(false), 50);
  };

  // Close modal with animation
  const closeModal = () => {
    setModalAnimating(true);
    setTimeout(() => {
      setShowResultsModal(false);
      setModalAnimating(false);
      setDragY(0);
    }, 400);
  };

  // Handle drag start
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
  };

  // Handle drag move
  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const delta = clientY - dragStartY.current;
    if (delta > 0) {
      setDragY(delta);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    if (dragY > 150) {
      closeModal();
    } else {
      setDragY(0);
    }
  };
  
  const { suggestions, saveRecentAsset } = useAssetSearch({ 
    query: formData.assetTicker,
    delay: 300 
  });
  
  const [results, setResults] = useState<any>(null);
  const [aiSanityCheck, setAiSanityCheck] = useState<any>(null);

  const handleAssetSelect = useCallback((asset: string) => {
    handleInputChange('assetTicker', asset);
    saveRecentAsset(asset);
    setShowAssetDropdown(false);
  }, [saveRecentAsset]);

  const handleAssetFocus = useCallback(() => {
    setShowAssetDropdown(true);
  }, []);

  const handleAssetBlur = useCallback(() => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setShowAssetDropdown(false);
    }, 300);
  }, []);

  const handleDropdownMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
  }, []);

  const getAssetBadge = useCallback((asset: string) => {
    if (['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD'].some(pair => asset.includes(pair.replace('/', '')))) 
      return { label: "FX", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
    if (['XAU/USD', 'XAG/USD', 'WTI/USD', 'BRENT/USD'].some(comm => asset.includes(comm.replace('/', '')))) 
      return { label: "Commodity", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (['SPX500', 'US30', 'NAS100', 'UK100', 'DAX30', 'JP225'].includes(asset)) 
      return { label: "Index", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
    if (asset.includes("USDT") || asset.includes("BTC")) 
      return { label: "Crypto", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
    return null;
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const canCalculate = formData.entryPrice && formData.stopLoss && formData.assetTicker &&
    ((riskType === 'percentage' && formData.accountBalance && formData.riskPercentage) ||
     (riskType === 'dollar' && formData.riskDollar));

  const handleCalculate = () => {
    if (!canCalculate) return;
    
    const { accountBalance, riskPercentage, riskDollar, entryPrice, stopLoss, takeProfit, assetTicker } = formData;
    
    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLoss);
    const tp = takeProfit ? parseFloat(takeProfit) : null;
    
    let riskAmount;
    if (riskType === 'percentage') {
      const balance = parseFloat(accountBalance);
      const risk = riskPercentage[0];
      riskAmount = balance * risk / 100;
    } else {
      riskAmount = parseFloat(riskDollar);
    }
    
    const positionSize = calculatePositionSize(riskAmount, entry, stop, assetTicker);
    const potentialLoss = calculateRiskAmount(entry, stop, positionSize, assetTicker);
    const potentialProfit = tp ? Math.abs(calculatePnL(entry, tp, positionSize, assetTicker)) : 0;
    const riskReward = potentialLoss > 0 ? potentialProfit / potentialLoss : 0;
    
    const spec = getLotSizeSpec(assetTicker);
    
    setResults({
      riskAmount: riskAmount.toFixed(2),
      positionSize: positionSize.toFixed(2),
      potentialLoss: potentialLoss.toFixed(2),
      potentialProfit: potentialProfit.toFixed(2),
      riskReward: riskReward.toFixed(2),
      assetType: spec.assetType,
      formattedLotSize: formatLotSize(positionSize, assetTicker)
    });

    const riskPercentageForAI = riskType === 'percentage' ? riskPercentage[0] : 
      (accountBalance ? (riskAmount / parseFloat(accountBalance)) * 100 : 0);
    generateEducationalSanityCheck(entry, stop, riskPercentageForAI, riskReward);
    
    // Show modal on mobile with animation
    openModal();
  };

  const generateEducationalSanityCheck = (entry: number, stop: number, risk: number, riskReward: number) => {
    const stopDistance = Math.abs((entry - stop) / entry * 100);
    let message = "";
    let type = "neutral";
    let confidence = 0;

    if (risk > 5) {
      message = "High risk detected. Consider reducing position size.";
      type = "warning";
      confidence = 95;
    } else if (stopDistance < 0.5) {
      message = "Tight stop loss may get triggered by noise.";
      type = "warning"; 
      confidence = 82;
    } else if (riskReward > 3) {
      message = "Excellent R:R ratio! Strong profit potential.";
      type = "positive";
      confidence = 88;
    } else if (riskReward < 1) {
      message = "Risk exceeds reward. Adjust your levels.";
      type = "negative";
      confidence = 90;
    } else {
      message = "Balanced setup with good parameters.";
      type = "positive";
      confidence = 75;
    }

    setAiSanityCheck({ message, type, confidence });
  };

  const isLong = formData.entryPrice && formData.stopLoss && parseFloat(formData.entryPrice) > parseFloat(formData.stopLoss);

  // Desktop auto-calculate on input change
  useEffect(() => {
    if (canCalculate && window.innerWidth >= 1024) {
      handleCalculate();
    }
  }, [formData, riskType]);

  return (
    <>
      {/* Mobile Layout - Fixed, no scroll */}
      <div className="lg:hidden flex flex-col h-full overflow-hidden">
        {/* Price Ticker - Above Trading Pair */}
        <div className="shrink-0 px-4 pt-2 border-b border-slate-800/30">
          <PriceTicker />
        </div>

        {/* Form Content - Scrollable area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Asset Selection */}
          <div className="relative">
            <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">Trading Pair</label>
            <div className="relative">
              <Input
                placeholder="Search (e.g., XAUUSD)"
                value={formData.assetTicker}
                onChange={e => handleInputChange('assetTicker', e.target.value.toUpperCase())}
                onFocus={handleAssetFocus}
                onBlur={handleAssetBlur}
                className="h-11 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl pl-4 pr-10 text-sm focus:border-emerald-500/50 transition-all"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            </div>

            {showAssetDropdown && suggestions && suggestions.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto"
                onMouseDown={handleDropdownMouseDown}
              >
                <div className="p-2">
                  {suggestions.map((asset) => {
                    const badge = getAssetBadge(asset);
                    return (
                      <button
                        key={asset}
                        type="button"
                        onClick={() => handleAssetSelect(asset)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium text-white text-sm">{asset}</span>
                        {badge && (
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${badge.color}`}>
                            {badge.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Risk Type Toggle - Compact */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/50 rounded-xl">
            <button
              onClick={() => setRiskType('percentage')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                riskType === 'percentage'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              Percentage
            </button>
            <button
              onClick={() => setRiskType('dollar')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                riskType === 'dollar'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Fixed $
            </button>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-2 gap-3">
            {riskType === 'percentage' ? (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                    <Input
                      type="number"
                      placeholder="10000"
                      value={formData.accountBalance}
                      onChange={e => handleInputChange('accountBalance', e.target.value)}
                      className="h-11 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 rounded-xl pl-7 text-sm focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Risk %</label>
                    <span className="text-sm font-bold text-emerald-400">{formData.riskPercentage[0]}%</span>
                  </div>
                  <div className="pt-3">
                    <Slider
                      value={formData.riskPercentage}
                      onValueChange={(value) => handleInputChange('riskPercentage', value)}
                      max={10}
                      min={0.1}
                      step={0.1}
                      className="w-full [&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:border-emerald-400 [&_[role=slider]]:w-4 [&_[role=slider]]:h-4"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="col-span-2 space-y-1.5">
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Risk Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <Input
                    type="number"
                    placeholder="200"
                    value={formData.riskDollar}
                    onChange={e => handleInputChange('riskDollar', e.target.value)}
                    className="h-11 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 rounded-xl pl-7 text-sm focus:border-emerald-500/50 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Entry Price</label>
              <div className="relative">
                <Crosshair className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input
                  type="number"
                  step="0.00001"
                  placeholder="1.0850"
                  value={formData.entryPrice}
                  onChange={e => handleInputChange('entryPrice', e.target.value)}
                  className="h-11 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 rounded-xl pl-9 text-sm focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Stop Loss</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-400/70" />
                <Input
                  type="number"
                  step="0.00001"
                  placeholder="1.0800"
                  value={formData.stopLoss}
                  onChange={e => handleInputChange('stopLoss', e.target.value)}
                  className="h-11 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 rounded-xl pl-9 text-sm focus:border-rose-500/50 transition-all"
                />
              </div>
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Take Profit <span className="text-slate-600">(Optional)</span></label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400/70" />
                <Input
                  type="number"
                  step="0.00001"
                  placeholder="1.0950"
                  value={formData.takeProfit}
                  onChange={e => handleInputChange('takeProfit', e.target.value)}
                  className="h-11 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 rounded-xl pl-9 text-sm focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Calculate Button */}
        <div className="shrink-0 p-4 pt-2 pb-6 border-t border-slate-800/50 bg-white dark:bg-[#0A0A0A]">
          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${
              canCalculate
                ? 'bg-white dark:bg-[#0A0A0A] border border-emerald-500/50 text-emerald-500 shadow-lg shadow-emerald-500/25 hover:border-emerald-500 hover:shadow-emerald-500/40 active:scale-[0.98]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Calculator className="w-5 h-5" />
            Calculate Position
          </button>
        </div>

        {/* Results Modal - Slides up from bottom */}
        {showResultsModal && (
          <div className="fixed inset-0 z-[9999]">
            {/* Backdrop - Transparent to see page behind */}
            <div 
              className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${modalAnimating ? 'opacity-0' : 'opacity-100'}`}
              onClick={closeModal}
            />
            
            {/* Modal Content - Just below the header */}
            <div 
              className={`absolute inset-x-0 bottom-0 bg-gradient-to-b from-slate-900 to-[#0a0a0a] rounded-t-3xl border-t border-slate-700/50 shadow-2xl overflow-hidden ${
                isDragging ? '' : 'transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]'
              } ${modalAnimating ? 'translate-y-full' : 'translate-y-0'}`}
              style={{ 
                top: '80px',
                transform: dragY > 0 ? `translateY(${dragY}px)` : undefined
              }}
            >
            {/* Drag Handle - Swipe down to close */}
            <div 
              className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
            >
              <div className={`w-12 h-1.5 rounded-full transition-colors ${isDragging ? 'bg-slate-400' : 'bg-slate-600'}`} />
            </div>

            {/* Price Ticker in Modal */}
            <div className="px-5 pb-2 border-b border-slate-800/30">
              <PriceTicker />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Position Analysis</h2>
                  <p className="text-xs text-slate-400">{formData.assetTicker}</p>
                </div>
              </div>
              <button
                onClick={() => setShowResultsModal(false)}
                className="p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {results && (
              <div className="px-5 pb-8 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 100px)' }}>
                {/* Main Position Size */}
                <div className="p-5 bg-gradient-to-br from-slate-800/80 to-slate-900/50 rounded-2xl border border-slate-700/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Position Size</span>
                    {isLong !== undefined && (
                      <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg ${
                        isLong 
                          ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                          : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                      }`}>
                        {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {isLong ? 'LONG' : 'SHORT'}
                      </span>
                    )}
                  </div>
                  <div className="text-4xl font-bold text-white mb-1">{results.positionSize}</div>
                  <div className="text-sm text-slate-400">{results.formattedLotSize}</div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-rose-500/10">
                        <DollarSign className="w-3.5 h-3.5 text-rose-400" />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 uppercase">At Risk</span>
                    </div>
                    <div className="text-xl font-bold text-rose-400">${results.riskAmount}</div>
                  </div>

                  {parseFloat(results.potentialProfit) > 0 && (
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 uppercase">Profit</span>
                      </div>
                      <div className="text-xl font-bold text-emerald-400">${results.potentialProfit}</div>
                    </div>
                  )}
                </div>

                {/* Risk Reward */}
                {parseFloat(results.riskReward) > 0 && (
                  <div className="p-5 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-2xl border border-amber-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <Target className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-xs font-medium text-slate-400 uppercase">Risk : Reward</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-400">1:{results.riskReward}</div>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-l-full transition-all duration-500"
                        style={{ width: `${100 / (1 + parseFloat(results.riskReward))}%` }}
                      />
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-r-full transition-all duration-500"
                        style={{ width: `${(parseFloat(results.riskReward) * 100) / (1 + parseFloat(results.riskReward))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                      <span>Risk</span>
                      <span>Reward</span>
                    </div>
                  </div>
                )}

                {/* AI Insight */}
                {aiSanityCheck && (
                  <div className={`p-4 rounded-xl border ${
                    aiSanityCheck.type === 'positive' 
                      ? 'bg-emerald-500/5 border-emerald-500/20' 
                      : aiSanityCheck.type === 'warning' 
                      ? 'bg-amber-500/5 border-amber-500/20' 
                      : 'bg-rose-500/5 border-rose-500/20'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        aiSanityCheck.type === 'positive' 
                          ? 'bg-emerald-500/10' 
                          : aiSanityCheck.type === 'warning' 
                          ? 'bg-amber-500/10' 
                          : 'bg-rose-500/10'
                      }`}>
                        <Sparkles className={`w-4 h-4 ${
                          aiSanityCheck.type === 'positive' 
                            ? 'text-emerald-400' 
                            : aiSanityCheck.type === 'warning' 
                            ? 'text-amber-400' 
                            : 'text-rose-400'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-300">AI Analysis</span>
                          <span className="text-[10px] text-slate-500">{aiSanityCheck.confidence}%</span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">{aiSanityCheck.message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Layout - Original grid layout */}
      <div className="hidden lg:block w-full max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Input Form */}
          <div className="col-span-2 space-y-5">
            {/* Asset Selection */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Trading Pair</label>
              <div className="relative">
                <Input
                  placeholder="Search asset (e.g., XAUUSD, EURUSD)"
                  value={formData.assetTicker}
                  onChange={e => handleInputChange('assetTicker', e.target.value.toUpperCase())}
                  onFocus={handleAssetFocus}
                  onBlur={handleAssetBlur}
                  className="h-12 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl pl-4 pr-10 text-base focus:border-emerald-500/50 transition-all"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              </div>

              {showAssetDropdown && suggestions && suggestions.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto"
                  onMouseDown={handleDropdownMouseDown}
                >
                  <div className="p-2">
                    {suggestions.map((asset) => {
                      const badge = getAssetBadge(asset);
                      return (
                        <button
                          key={asset}
                          type="button"
                          onClick={() => handleAssetSelect(asset)}
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                        >
                          <span className="font-medium text-white group-hover:text-emerald-400 transition-colors">{asset}</span>
                          {badge && (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${badge.color}`}>
                              {badge.label}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Risk Type Toggle */}
            <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-700/30">
              <div className="flex items-center gap-3 mb-4">
                <Scale className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-300">Risk Method</span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/50 rounded-lg">
                <button
                  onClick={() => setRiskType('percentage')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    riskType === 'percentage'
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <Percent className="w-4 h-4" />
                  Percentage
                </button>
                <button
                  onClick={() => setRiskType('dollar')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    riskType === 'dollar'
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Fixed Amount
                </button>
              </div>
            </div>

            {/* Input Fields Grid */}
            <div className="grid grid-cols-2 gap-4">
              {riskType === 'percentage' ? (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Account Balance</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                      <Input
                        type="number"
                        placeholder="10,000"
                        value={formData.accountBalance}
                        onChange={e => handleInputChange('accountBalance', e.target.value)}
                        className="h-12 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 rounded-xl pl-8 text-base focus:border-emerald-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Risk Per Trade</label>
                      <span className="text-lg font-bold text-emerald-400">{formData.riskPercentage[0]}%</span>
                    </div>
                    <div className="pt-2">
                      <Slider
                        value={formData.riskPercentage}
                        onValueChange={(value) => handleInputChange('riskPercentage', value)}
                        max={10}
                        min={0.1}
                        step={0.1}
                        className="w-full [&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:border-emerald-400"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                        <span>Conservative</span>
                        <span>Aggressive</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-span-2 space-y-2">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Risk Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                    <Input
                      type="number"
                      placeholder="200"
                      value={formData.riskDollar}
                      onChange={e => handleInputChange('riskDollar', e.target.value)}
                      className="h-12 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 rounded-xl pl-8 text-base focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Entry Price</label>
                <div className="relative">
                  <Crosshair className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="1.0850"
                    value={formData.entryPrice}
                    onChange={e => handleInputChange('entryPrice', e.target.value)}
                    className="h-12 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 rounded-xl pl-10 text-base focus:border-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Stop Loss</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400/70" />
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="1.0800"
                    value={formData.stopLoss}
                    onChange={e => handleInputChange('stopLoss', e.target.value)}
                    className="h-12 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 rounded-xl pl-10 text-base focus:border-rose-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="col-span-2 space-y-2">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Take Profit <span className="text-slate-600">(Optional)</span></label>
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/70" />
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="1.0950"
                    value={formData.takeProfit}
                    onChange={e => handleInputChange('takeProfit', e.target.value)}
                    className="h-12 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 rounded-xl pl-10 text-base focus:border-emerald-500/50 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-4">
            {results ? (
              <>
                <div className="p-5 bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-2xl border border-slate-700/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <BarChart3 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Position Size</span>
                    </div>
                    {isLong !== undefined && (
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
                        isLong 
                          ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                          : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                      }`}>
                        {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {isLong ? 'LONG' : 'SHORT'}
                      </span>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{results.positionSize}</div>
                  <div className="text-sm text-slate-400">{results.formattedLotSize}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-rose-500/10">
                        <DollarSign className="w-3 h-3 text-rose-400" />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 uppercase">At Risk</span>
                    </div>
                    <div className="text-lg font-bold text-rose-400">${results.riskAmount}</div>
                  </div>

                  {parseFloat(results.potentialProfit) > 0 && (
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10">
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 uppercase">Profit</span>
                      </div>
                      <div className="text-lg font-bold text-emerald-400">${results.potentialProfit}</div>
                    </div>
                  )}
                </div>

                {parseFloat(results.riskReward) > 0 && (
                  <div className="p-5 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-2xl border border-amber-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <Target className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Risk : Reward</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-400">1:{results.riskReward}</div>
                    </div>
                    <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-rose-500 rounded-l-full"
                        style={{ width: `${100 / (1 + parseFloat(results.riskReward))}%` }}
                      />
                      <div 
                        className="h-full bg-emerald-500 rounded-r-full"
                        style={{ width: `${(parseFloat(results.riskReward) * 100) / (1 + parseFloat(results.riskReward))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                      <span>Risk</span>
                      <span>Reward</span>
                    </div>
                  </div>
                )}

                {aiSanityCheck && (
                  <div className={`p-4 rounded-xl border backdrop-blur-sm ${
                    aiSanityCheck.type === 'positive' 
                      ? 'bg-emerald-500/5 border-emerald-500/20' 
                      : aiSanityCheck.type === 'warning' 
                      ? 'bg-amber-500/5 border-amber-500/20' 
                      : 'bg-rose-500/5 border-rose-500/20'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        aiSanityCheck.type === 'positive' 
                          ? 'bg-emerald-500/10' 
                          : aiSanityCheck.type === 'warning' 
                          ? 'bg-amber-500/10' 
                          : 'bg-rose-500/10'
                      }`}>
                        <Sparkles className={`w-4 h-4 ${
                          aiSanityCheck.type === 'positive' 
                            ? 'text-emerald-400' 
                            : aiSanityCheck.type === 'warning' 
                            ? 'text-amber-400' 
                            : 'text-rose-400'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-300">AI Analysis</span>
                          <span className="text-[10px] text-slate-500">{aiSanityCheck.confidence}%</span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">{aiSanityCheck.message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-6 bg-slate-900/30 rounded-2xl border border-dashed border-slate-700/50">
                <div className="p-4 rounded-2xl bg-slate-800/50 mb-4">
                  <Calculator className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-1">No Calculation Yet</h3>
                <p className="text-xs text-slate-500 text-center max-w-[200px]">
                  Fill in the parameters to see your position analysis
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
