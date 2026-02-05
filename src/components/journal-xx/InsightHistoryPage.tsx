import React, { useState, useEffect, useMemo } from 'react';
import { Home, Brain, TrendingUp, TrendingDown, Minus, Clock, Filter, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProAnalysisResult } from '@/components/charts/mecca/proAnalysisTypes';
import { MeccaSpotlightCard } from '@/components/charts/mecca/MeccaSpotlightCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InsightHistoryPageProps {
  onClose: () => void;
  onSelectAnalysis: (analysis: ProAnalysisResult) => void;
  isDarkMode: boolean;
}

interface AnalysisHistoryItem {
  id: string;
  symbol: string;
  timeframe: string;
  trading_style: string;
  current_price: number;
  analysis_result: ProAnalysisResult;
  created_at: string;
}

const InsightHistoryPage: React.FC<InsightHistoryPageProps> = ({
  onClose,
  onSelectAnalysis,
  isDarkMode,
}) => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter state
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    direction: '' as 'LONG' | 'SHORT' | 'NEUTRAL' | '',
    convictionGrade: '' as 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C' | 'D' | 'F' | '',
    symbol: '',
    tradingStyle: '',
    marketStructurePhase: '' as 'accumulation' | 'trending' | 'distribution' | 'reaccumulation' | 'ranging' | '',
    marketStructureCharacter: '' as 'CHOCH' | 'BOS' | 'RANGING' | 'CONSOLIDATION' | '',
  });

  // All available filter options (from database, not just loaded analyses)
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [allTradingStyles, setAllTradingStyles] = useState<string[]>([]);

  // Fetch all unique symbols and trading styles from database
  useEffect(() => {
    if (!user?.id) return;

    const fetchFilterOptions = async () => {
      try {
        // Fetch all unique symbols
        const { data: symbolsData, error: symbolsError } = await supabase
          .from('insight_xx_analyses')
          .select('symbol')
          .eq('user_id', user.id);

        if (!symbolsError && symbolsData) {
          const uniqueSymbols = Array.from(new Set(symbolsData.map(item => item.symbol))).sort();
          setAllSymbols(uniqueSymbols);
        }

        // Fetch all unique trading styles
        const { data: stylesData, error: stylesError } = await supabase
          .from('insight_xx_analyses')
          .select('trading_style')
          .eq('user_id', user.id);

        if (!stylesError && stylesData) {
          const uniqueStyles = Array.from(new Set(stylesData.map(item => item.trading_style))).sort();
          setAllTradingStyles(uniqueStyles);
        }
      } catch (err) {
        console.error('[InsightHistoryPage] Error fetching filter options:', err);
      }
    };

    fetchFilterOptions();
  }, [user?.id]);

  // Fetch analyses from database
  useEffect(() => {
    if (!user?.id) {
      console.log('[InsightHistoryPage] User not available, user:', user);
      setIsLoading(false);
      return;
    }

    const fetchAnalyses = async () => {
      setIsLoading(true);
      try {
        console.log('[InsightHistoryPage] Fetching analyses for user:', user.id);
        const { data, error } = await supabase
          .from('insight_xx_analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('[InsightHistoryPage] Error fetching analyses:', error);
          console.error('[InsightHistoryPage] Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
        } else {
          console.log('[InsightHistoryPage] Fetched analyses:', data?.length || 0, 'items');
          setAnalyses(data || []);
        }
      } catch (err) {
        console.error('[InsightHistoryPage] Exception fetching analyses:', err);
        if (err instanceof Error) {
          console.error('[InsightHistoryPage] Error message:', err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyses();
  }, [user?.id]);

  const getBias = (analysis: ProAnalysisResult): 'bullish' | 'bearish' | 'neutral' => {
    const direction = analysis.tradeSetup?.direction || 'NEUTRAL';
    if (direction === 'LONG') return 'bullish';
    if (direction === 'SHORT') return 'bearish';
    return 'neutral';
  };

  const getBiasColor = (bias: 'bullish' | 'bearish' | 'neutral') => {
    if (bias === 'bullish') return { bg: '#22c55e20', color: '#22c55e' };
    if (bias === 'bearish') return { bg: 'rgba(239,68,68,0.2)', color: '#ef4444' };
    return { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b' };
  };

  const getTradingStyleLabel = (style: string) => {
    const styles: Record<string, string> = {
      scalping: 'Scalping',
      intraday: 'Intraday',
      swing: 'Swing Trade',
      position: 'Position',
    };
    return styles[style] || style;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const greenAccent = {
    primary: '#22c55e',
    light: '#4ade80',
    dark: '#16a34a',
  };

  // 5 assets for Insight (same as main page)
  const INSIGHT_ASSETS = [
    { display: 'XAUUSD', internal: 'XAUUSD' },
    { display: 'BTCUSD', internal: 'BTCUSD' },
    { display: 'US30', internal: 'U30USD' },
    { display: 'NAS100', internal: 'NDXUSD' },
    { display: 'SPX', internal: 'SPXUSD' },
  ] as const;

  // Use only the 5 Insight assets for filtering
  const uniqueSymbols = useMemo(() => {
    return INSIGHT_ASSETS.map(a => a.internal);
  }, []);

  const uniqueTradingStyles = useMemo(() => {
    // Get all known trading styles
    const knownStyles = ['scalping', 'intraday', 'swing', 'position'];
    // Combine with styles from database
    const combined = new Set([...knownStyles, ...allTradingStyles, ...analyses.map(a => a.trading_style)]);
    return Array.from(combined).sort();
  }, [allTradingStyles, analyses]);

  const uniqueMarketStructurePhases = useMemo(() => {
    const phases = new Set(
      analyses
        .map(a => a.analysis_result?.marketStructure?.phase)
        .filter(Boolean) as string[]
    );
    return Array.from(phases).sort();
  }, [analyses]);

  const uniqueMarketStructureCharacters = useMemo(() => {
    const characters = new Set(
      analyses
        .map(a => a.analysis_result?.marketStructure?.character)
        .filter(Boolean) as string[]
    );
    return Array.from(characters).sort();
  }, [analyses]);

  // Filter analyses based on active filters
  const filteredAnalyses = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:219',message:'Filtering analyses',data:{totalAnalyses:analyses.length,activeFilters:filters,sampleItem:analyses[0]?{symbol:analyses[0].symbol,trading_style:analyses[0].trading_style,marketStructurePhase:analyses[0].analysis_result?.marketStructure?.phase,marketStructureCharacter:analyses[0].analysis_result?.marketStructure?.character}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    return analyses.filter(item => {
      const analysis = item.analysis_result;
      if (!analysis) return false;

      // Direction filter
      if (filters.direction && analysis.tradeSetup?.direction !== filters.direction) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:227',message:'Filtered out by direction',data:{filterDirection:filters.direction,itemDirection:analysis.tradeSetup?.direction},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return false;
      }

      // Conviction grade filter
      if (filters.convictionGrade && analysis.tradeSetup?.convictionGrade !== filters.convictionGrade) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:232',message:'Filtered out by conviction',data:{filterGrade:filters.convictionGrade,itemGrade:analysis.tradeSetup?.convictionGrade},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return false;
      }

      // Symbol filter - handle both display and internal symbols
      if (filters.symbol && filters.symbol !== 'all') {
        const asset = INSIGHT_ASSETS.find(a => a.internal === filters.symbol || a.display === filters.symbol);
        const expectedSymbol = asset ? asset.internal : filters.symbol;
        if (item.symbol !== expectedSymbol) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:240',message:'Filtered out by symbol',data:{filterSymbol:filters.symbol,expectedSymbol,itemSymbol:item.symbol,assetMatch:asset},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          return false;
        }
      }

      // Trading style filter
      if (filters.tradingStyle && filters.tradingStyle !== 'all') {
        if (item.trading_style !== filters.tradingStyle) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:247',message:'Filtered out by trading style',data:{filterStyle:filters.tradingStyle,itemStyle:item.trading_style},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          return false;
        }
      }

      // Market structure phase filter
      if (filters.marketStructurePhase && filters.marketStructurePhase !== 'all') {
        if (analysis.marketStructure?.phase !== filters.marketStructurePhase) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:254',message:'Filtered out by market structure phase',data:{filterPhase:filters.marketStructurePhase,itemPhase:analysis.marketStructure?.phase},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          return false;
        }
      }

      // Market structure character filter
      if (filters.marketStructureCharacter && filters.marketStructureCharacter !== 'all') {
        if (analysis.marketStructure?.character !== filters.marketStructureCharacter) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:261',message:'Filtered out by market structure character',data:{filterCharacter:filters.marketStructureCharacter,itemCharacter:analysis.marketStructure?.character},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          return false;
        }
      }

      return true;
    });
  }, [analyses, filters, INSIGHT_ASSETS]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => value !== '');
  }, [filters]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      direction: '',
      convictionGrade: '',
      symbol: '',
      tradingStyle: '',
      marketStructurePhase: '',
      marketStructureCharacter: '',
    });
  };

  // Prevent body scrolling when component is mounted
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalHeight = document.body.style.height;
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.height = originalHeight;
    };
  }, []);

  // Close filter dropdown when clicking outside (but not on SelectContent/SelectItem which use Portal)
  useEffect(() => {
    if (!showFilter) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is on any Radix Select element (they use Portal)
      // Check the event path/composedPath for Radix elements
      const path = event.composedPath ? event.composedPath() : [];
      const isRadixElement = path.some((el: any) => {
        if (!el || !el.getAttribute) return false;
        const attr = el.getAttribute('data-radix-select-content') || 
                     el.getAttribute('data-radix-select-item') ||
                     el.getAttribute('data-radix-select-trigger') ||
                     el.getAttribute('data-radix-popper-content-wrapper');
        return attr !== null;
      });
      
      if (isRadixElement) {
        return;
      }
      
      // Also check by class names that Radix uses
      if (target.closest('[data-radix-select-content]') || 
          target.closest('[data-radix-select-item]') ||
          target.closest('[data-radix-select-trigger]') ||
          target.closest('[data-radix-popper-content-wrapper]')) {
        return;
      }
      
      // Check if click is inside the filter dropdown panel itself (the absolute positioned div)
      // Find the filter container and check if click is inside its dropdown panel
      const filterContainer = target.closest('.filter-container');
      if (filterContainer) {
        // Get all children of filter-container
        const children = Array.from(filterContainer.children);
        // Find the dropdown panel (has classes: absolute, right-0, top-full)
        const dropdownPanel = children.find((child: any) => {
          if (!child.classList) return false;
          return child.classList.contains('absolute') && 
                 child.classList.contains('right-0') && 
                 child.classList.contains('top-full');
        });
        
        // If click is inside the dropdown panel, don't close
        if (dropdownPanel && dropdownPanel.contains(target)) {
          return;
        }
      }
      
      // Close filter for all other clicks (including "View Full Analysis" button, analysis cards, etc.)
      setShowFilter(false);
    };

    // Use a small delay to allow SelectContent to handle clicks first
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showFilter]);

  return (
    <>
      {/* Global styles to ensure SelectItems are clickable and smooth */}
      <style>{`
        [data-radix-select-item] {
          cursor: pointer !important;
          pointer-events: auto !important;
          transition: all 0.2s ease !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        [data-radix-select-item]:hover {
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)'} !important;
          transform: scale(1.02) !important;
        }
        [data-radix-select-item]:active {
          transform: scale(0.98) !important;
        }
        [data-radix-select-content] {
          pointer-events: auto !important;
          transition: all 0.2s ease !important;
        }
        [data-radix-select-trigger] {
          transition: all 0.2s ease !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        [data-radix-select-trigger]:active {
          transform: scale(0.98) !important;
        }
        /* Ensure smooth scrolling */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
      
      <div 
        className="w-full h-full flex flex-col overflow-hidden" 
        style={{ 
          background: 'transparent',
          height: '100%',
          maxHeight: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 md:px-6 py-1.5 border-b" style={{ borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}>
        <h2 className="text-base md:text-lg font-bold" style={{ color: isDarkMode ? '#fff' : '#1f2937' }}>
          Analysis History
          {hasActiveFilters && (
            <span className="ml-2 text-xs font-normal" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
              ({filteredAnalyses.length} of {analyses.length})
            </span>
          )}
        </h2>
        
        {/* Home and Filter Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: isDarkMode ? '#fff' : '#1f2937' }}
          >
            <Home className="w-4 h-4" />
          </button>
          <div className="relative filter-container">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors relative"
              style={{ color: isDarkMode ? '#fff' : '#1f2937' }}
            >
              <Filter className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full" style={{ background: greenAccent.primary }} />
              )}
            </button>

          {/* Filter Dropdown */}
          {showFilter && (
            <>
              {/* Backdrop - closes filter when clicking anywhere outside the dropdown panel */}
              <div
                className="fixed inset-0"
                onMouseDown={(e) => {
                  const target = e.target as HTMLElement;
                  
                  // Don't close if clicking on SelectContent (it uses Portal)
                  const path = e.nativeEvent.composedPath ? e.nativeEvent.composedPath() : [];
                  const isRadixElement = path.some((el: any) => {
                    if (!el || !el.getAttribute) return false;
                    return el.getAttribute('data-radix-select-content') !== null ||
                           el.getAttribute('data-radix-select-item') !== null ||
                           el.getAttribute('data-radix-select-trigger') !== null ||
                           el.getAttribute('data-radix-popper-content-wrapper') !== null;
                  });
                  
                  if (isRadixElement || 
                      target.closest('[data-radix-select-content]') || 
                      target.closest('[data-radix-select-item]') ||
                      target.closest('[data-radix-select-trigger]')) {
                    return;
                  }
                  
                  // Check if click is inside the filter dropdown panel
                  const filterContainer = target.closest('.filter-container');
                  if (filterContainer) {
                    const children = Array.from(filterContainer.children);
                    const dropdownPanel = children.find((child: any) => {
                      if (!child.classList) return false;
                      return child.classList.contains('absolute') && 
                             child.classList.contains('right-0') && 
                             child.classList.contains('top-full');
                    });
                    if (dropdownPanel && dropdownPanel.contains(target)) {
                      return; // Don't close if clicking inside dropdown panel
                    }
                  }
                  
                  // Close filter for all other clicks
                  setShowFilter(false);
                }}
                style={{ 
                  background: 'transparent',
                  zIndex: 10, // Behind sidebar (z-105) and sidebar backdrop (z-80)
                }}
              />
              
              {/* Dropdown - Behind sidebar (sidebar is z-105) */}
              <div
                className="absolute right-0 top-full mt-2 w-72 rounded-lg shadow-xl border"
                style={{
                  // Glassmorphism effect (same as ProAnalysisModal)
                  background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(30px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  boxShadow: isDarkMode 
                    ? '0 8px 24px 0 rgba(0, 0, 0, 0.3)'
                    : '0 8px 24px 0 rgba(0, 0, 0, 0.08)',
                  zIndex: 20, // Behind sidebar (z-105) and sidebar backdrop (z-80)
                }}
              >
              <div className="p-4 border-b" style={{ borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold" style={{ color: isDarkMode ? '#fff' : '#1f2937' }}>
                    Filter Analyses
                  </h3>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors"
                      style={{ color: greenAccent.primary }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {/* Direction Filter */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    Direction
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(['LONG', 'SHORT', 'NEUTRAL'] as const).map(dir => (
                      <button
                        key={dir}
                        onClick={() => setFilters(prev => ({ ...prev, direction: prev.direction === dir ? '' : dir }))}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={{
                          background: filters.direction === dir
                            ? (dir === 'LONG' ? '#22c55e20' : dir === 'SHORT' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)')
                            : isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                          color: filters.direction === dir
                            ? (dir === 'LONG' ? '#22c55e' : dir === 'SHORT' ? '#ef4444' : '#f59e0b')
                            : (isDarkMode ? '#9ca3af' : '#6b7280'),
                          border: filters.direction === dir
                            ? `1px solid ${dir === 'LONG' ? '#22c55e' : dir === 'SHORT' ? '#ef4444' : '#f59e0b'}`
                            : `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                        }}
                      >
                        {dir}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conviction Grade Filter */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    Conviction Grade
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C', 'D', 'F'] as const).map(grade => (
                      <button
                        key={grade}
                        onClick={() => setFilters(prev => ({ ...prev, convictionGrade: prev.convictionGrade === grade ? '' : grade }))}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={{
                          background: filters.convictionGrade === grade
                            ? `${greenAccent.primary}20`
                            : isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                          color: filters.convictionGrade === grade
                            ? greenAccent.primary
                            : (isDarkMode ? '#9ca3af' : '#6b7280'),
                          border: filters.convictionGrade === grade
                            ? `1px solid ${greenAccent.primary}`
                            : `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                        }}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Symbol Filter */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    Asset
                  </label>
                  <Select
                    value={filters.symbol ? filters.symbol : 'all'}
                    onValueChange={(value) => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:496',message:'Asset filter onValueChange called',data:{value,currentFilter:filters.symbol,willSetTo:value === 'all' ? '' : value},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'B'})}).catch(()=>{});
                      // #endregion
                      console.log('[Filter] Asset selected:', value);
                      const newSymbol = value === 'all' ? '' : value;
                      setFilters(prev => {
                        const newFilters = { ...prev, symbol: newSymbol };
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:503',message:'Asset filter state updated',data:{oldSymbol:prev.symbol,newSymbol:newFilters.symbol,allFilters:newFilters},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'B'})}).catch(()=>{});
                        // #endregion
                        return newFilters;
                      });
                    }}
                    onOpenChange={(open) => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:512',message:'Asset Select open state changed',data:{open,currentValue:filters.symbol},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'B'})}).catch(()=>{});
                      // #endregion
                    }}
                  >
                    <SelectTrigger
                      className="w-full text-xs h-9 px-3 py-2 cursor-pointer"
                      style={{
                        // Glassmorphism effect (same as dropdown container)
                        background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(30px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                        color: isDarkMode ? '#ffffff' : '#1f2937',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        pointerEvents: 'auto',
                        userSelect: 'none',
                      }}
                    >
                      <SelectValue placeholder="All Assets" />
                    </SelectTrigger>
                    <SelectContent
                      className="cursor-pointer"
                      style={{
                        // Glassmorphism effect (same as dropdown container)
                        background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(30px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        boxShadow: isDarkMode 
                          ? '0 8px 24px 0 rgba(0, 0, 0, 0.3)'
                          : '0 8px 24px 0 rgba(0, 0, 0, 0.08)',
                        zIndex: 20, // Behind sidebar (z-105)
                        pointerEvents: 'auto',
                      }}
                      onPointerDownOutside={(e) => {
                        // Prevent closing filter when clicking outside SelectContent but inside filter container
                        const target = e.target as HTMLElement;
                        if (target.closest('.filter-container')) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      onInteractOutside={(e) => {
                        // Prevent closing filter when interacting outside SelectContent but inside filter container
                        const target = e.target as HTMLElement;
                        if (target.closest('.filter-container')) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      onEscapeKeyDown={(e) => {
                        // Don't close filter when pressing escape on SelectContent
                        e.preventDefault();
                      }}
                    >
                      <SelectItem
                        value="all"
                        className="cursor-pointer"
                        style={{
                          // Glassmorphism effect (same as dropdown container)
                          background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                          backdropFilter: 'blur(30px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                          color: isDarkMode ? '#ffffff' : '#1f2937',
                          pointerEvents: 'auto',
                          cursor: 'pointer',
                        }}
                      >
                        All Assets
                      </SelectItem>
                      {INSIGHT_ASSETS.map(({ display, internal }) => (
                        <SelectItem
                          key={internal}
                          value={internal}
                          className="cursor-pointer"
                          style={{
                            // Glassmorphism effect (same as dropdown container)
                            background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                            backdropFilter: 'blur(30px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                            color: isDarkMode ? '#ffffff' : '#1f2937',
                            pointerEvents: 'auto',
                            cursor: 'pointer',
                          }}
                        >
                          {display}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Trading Style Filter */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    Trading Style
                  </label>
                  <Select
                    value={filters.tradingStyle ? filters.tradingStyle : 'all'}
                    onValueChange={(value) => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:584',message:'Trading style filter changed',data:{value,currentFilter:filters.tradingStyle,willSetTo:value === 'all' ? '' : value},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'C'})}).catch(()=>{});
                      // #endregion
                      console.log('[Filter] Trading style selected:', value);
                      const newStyle = value === 'all' ? '' : value;
                      setFilters(prev => {
                        const newFilters = { ...prev, tradingStyle: newStyle };
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:591',message:'Trading style filter state updated',data:{oldStyle:prev.tradingStyle,newStyle:newFilters.tradingStyle},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'C'})}).catch(()=>{});
                        // #endregion
                        return newFilters;
                      });
                    }}
                  >
                    <SelectTrigger
                      className="w-full text-xs h-9 px-3 py-2"
                      style={{
                        // Glassmorphism effect (same as dropdown container)
                        background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(30px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                        color: isDarkMode ? '#ffffff' : '#1f2937',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <SelectValue placeholder="All Styles" />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        // Glassmorphism effect (same as dropdown container)
                        background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(30px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        boxShadow: isDarkMode 
                          ? '0 8px 24px 0 rgba(0, 0, 0, 0.3)'
                          : '0 8px 24px 0 rgba(0, 0, 0, 0.08)',
                        zIndex: 20, // Behind sidebar (z-105)
                        pointerEvents: 'auto',
                      }}
                      onPointerDownOutside={(e) => {
                        // Prevent closing filter when clicking outside SelectContent but inside filter container
                        const target = e.target as HTMLElement;
                        if (target.closest('.filter-container')) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      onInteractOutside={(e) => {
                        // Prevent closing filter when interacting outside SelectContent but inside filter container
                        const target = e.target as HTMLElement;
                        if (target.closest('.filter-container')) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      onEscapeKeyDown={(e) => {
                        // Don't close filter when pressing escape on SelectContent
                        e.preventDefault();
                      }}
                    >
                      <SelectItem
                        value="all"
                        className="cursor-pointer"
                        style={{
                          // Glassmorphism effect (same as dropdown container)
                          background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                          backdropFilter: 'blur(30px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                          color: isDarkMode ? '#ffffff' : '#1f2937',
                          pointerEvents: 'auto',
                          cursor: 'pointer',
                        }}
                      >
                        All Styles
                      </SelectItem>
                      {uniqueTradingStyles.map(style => (
                        <SelectItem
                          key={style}
                          value={style}
                          className="cursor-pointer"
                          style={{
                            // Glassmorphism effect (same as dropdown container)
                            background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                            backdropFilter: 'blur(30px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                            color: isDarkMode ? '#ffffff' : '#1f2937',
                            pointerEvents: 'auto',
                            cursor: 'pointer',
                          }}
                        >
                          {getTradingStyleLabel(style)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Market Structure Phase Filter */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    Market Structure Phase
                  </label>
                  <Select
                    value={filters.marketStructurePhase ? filters.marketStructurePhase : 'all'}
                    onValueChange={(value) => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:665',message:'Market structure phase filter changed',data:{value,currentFilter:filters.marketStructurePhase,willSetTo:value === 'all' ? '' : value},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'D'})}).catch(()=>{});
                      // #endregion
                      console.log('[Filter] Market structure phase selected:', value);
                      const newPhase = value === 'all' ? '' : value as any;
                      setFilters(prev => {
                        const newFilters = { ...prev, marketStructurePhase: newPhase };
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:672',message:'Market structure phase filter state updated',data:{oldPhase:prev.marketStructurePhase,newPhase:newFilters.marketStructurePhase},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'D'})}).catch(()=>{});
                        // #endregion
                        return newFilters;
                      });
                    }}
                  >
                    <SelectTrigger
                      className="w-full text-xs h-9 px-3 py-2"
                      style={{
                        // Glassmorphism effect (same as dropdown container)
                        background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(30px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                        color: isDarkMode ? '#ffffff' : '#1f2937',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <SelectValue placeholder="All Phases" />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        // Glassmorphism effect (same as dropdown container)
                        background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(30px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        boxShadow: isDarkMode 
                          ? '0 8px 24px 0 rgba(0, 0, 0, 0.3)'
                          : '0 8px 24px 0 rgba(0, 0, 0, 0.08)',
                        zIndex: 20, // Behind sidebar (z-105)
                        pointerEvents: 'auto',
                      }}
                      onPointerDownOutside={(e) => {
                        // Prevent closing filter when clicking outside SelectContent but inside filter container
                        const target = e.target as HTMLElement;
                        if (target.closest('.filter-container')) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      onInteractOutside={(e) => {
                        // Prevent closing filter when interacting outside SelectContent but inside filter container
                        const target = e.target as HTMLElement;
                        if (target.closest('.filter-container')) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      onEscapeKeyDown={(e) => {
                        // Don't close filter when pressing escape on SelectContent
                        e.preventDefault();
                      }}
                    >
                      <SelectItem
                        value="all"
                        className="cursor-pointer"
                        style={{
                          // Glassmorphism effect (same as dropdown container)
                          background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                          backdropFilter: 'blur(30px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                          color: isDarkMode ? '#ffffff' : '#1f2937',
                          pointerEvents: 'auto',
                          cursor: 'pointer',
                        }}
                      >
                        All Phases
                      </SelectItem>
                      {uniqueMarketStructurePhases.map(phase => (
                        <SelectItem
                          key={phase}
                          value={phase}
                          className="cursor-pointer"
                          style={{
                            // Glassmorphism effect (same as dropdown container)
                            background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                            backdropFilter: 'blur(30px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                            color: isDarkMode ? '#ffffff' : '#1f2937',
                            pointerEvents: 'auto',
                            cursor: 'pointer',
                          }}
                        >
                          {phase.charAt(0).toUpperCase() + phase.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Market Structure Character Filter */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    Market Structure Character
                  </label>
                  <Select
                    value={filters.marketStructureCharacter ? filters.marketStructureCharacter : 'all'}
                    onValueChange={(value) => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:746',message:'Market structure character filter changed',data:{value,currentFilter:filters.marketStructureCharacter,willSetTo:value === 'all' ? '' : value},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'E'})}).catch(()=>{});
                      // #endregion
                      console.log('[Filter] Market structure character selected:', value);
                      const newCharacter = value === 'all' ? '' : value as any;
                      setFilters(prev => {
                        const newFilters = { ...prev, marketStructureCharacter: newCharacter };
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:753',message:'Market structure character filter state updated',data:{oldCharacter:prev.marketStructureCharacter,newCharacter:newFilters.marketStructureCharacter},timestamp:Date.now(),sessionId:'debug-session',runId:'filter-debug',hypothesisId:'E'})}).catch(()=>{});
                        // #endregion
                        return newFilters;
                      });
                    }}
                  >
                    <SelectTrigger
                      className="w-full text-xs h-9 px-3 py-2"
                      style={{
                        // Glassmorphism effect (same as dropdown container)
                        background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(30px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                        color: isDarkMode ? '#ffffff' : '#1f2937',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <SelectValue placeholder="All Characters" />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        // Glassmorphism effect (same as dropdown container)
                        background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(30px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        boxShadow: isDarkMode 
                          ? '0 8px 24px 0 rgba(0, 0, 0, 0.3)'
                          : '0 8px 24px 0 rgba(0, 0, 0, 0.08)',
                        zIndex: 20, // Behind sidebar (z-105)
                        pointerEvents: 'auto',
                      }}
                      onPointerDownOutside={(e) => {
                        // Prevent closing filter when clicking outside SelectContent but inside filter container
                        const target = e.target as HTMLElement;
                        if (target.closest('.filter-container')) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      onInteractOutside={(e) => {
                        // Prevent closing filter when interacting outside SelectContent but inside filter container
                        const target = e.target as HTMLElement;
                        if (target.closest('.filter-container')) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      onEscapeKeyDown={(e) => {
                        // Don't close filter when pressing escape on SelectContent
                        e.preventDefault();
                      }}
                    >
                      <SelectItem
                        value="all"
                        className="cursor-pointer"
                        style={{
                          // Glassmorphism effect (same as dropdown container)
                          background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                          backdropFilter: 'blur(30px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                          color: isDarkMode ? '#ffffff' : '#1f2937',
                          pointerEvents: 'auto',
                          cursor: 'pointer',
                        }}
                      >
                        All Characters
                      </SelectItem>
                      {uniqueMarketStructureCharacters.map(character => (
                        <SelectItem
                          key={character}
                          value={character}
                          className="cursor-pointer"
                          style={{
                            // Glassmorphism effect (same as dropdown container)
                            background: isDarkMode ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                            backdropFilter: 'blur(30px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                            color: isDarkMode ? '#ffffff' : '#1f2937',
                            pointerEvents: 'auto',
                            cursor: 'pointer',
                          }}
                        >
                          {character}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            </>
          )}
          </div>
        </div>
      </div>

      {/* Content - Scrollable - Edge to edge */}
      <div 
        className="flex-1 min-h-0"
        style={{
          height: 'calc(100% - max(4.5rem, calc(4.5rem + env(safe-area-inset-bottom, 0px))))', // Account for bottom nav (64px = 4rem) + tiny gap (0.5rem = 8px) + safe area
          maxHeight: 'calc(100% - max(4.5rem, calc(4.5rem + env(safe-area-inset-bottom, 0px))))',
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-64 px-4">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                Loading analyses...
              </p>
            </div>
          </div>
        ) : analyses.length === 0 ? (
          <div className="flex items-center justify-center h-64 px-4">
            <div className="text-center">
              <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }} />
              <p className="text-sm font-medium mb-2" style={{ color: isDarkMode ? '#fff' : '#1f2937' }}>
                No analyses yet
              </p>
              <p className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                Run your first analysis to see it here
              </p>
            </div>
          </div>
        ) : (
          <MeccaSpotlightCard
            variant="journal"
            className="w-full"
            isDarkMode={isDarkMode}
            noPadding={false}
            style={{
              borderRadius: '0',
              backgroundColor: 'transparent', // Match header background (transparent)
              height: '100%',
              maxHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden', // Prevent card from scrolling
            }}
          >
            <div 
              className="flex flex-col w-full gap-3 px-4" 
              style={{ 
                flex: '1 1 0',
                minHeight: 0,
                height: '100%',
                maxHeight: '100%',
                paddingBottom: '2rem',
                paddingTop: '1rem',
                overflowY: 'auto', // Only this div scrolls
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
                position: 'relative',
                scrollbarWidth: 'thin',
                scrollbarColor: isDarkMode ? 'rgba(255,255,255,0.2) transparent',
              }}
            >
              {filteredAnalyses.map((item, index) => {
                const analysis = item.analysis_result;
                
                // Validate analysis data
                if (!analysis) {
                  console.warn('[InsightHistoryPage] Analysis item missing analysis_result:', item);
                  return null;
                }
                
                const bias = getBias(analysis);
                const biasColors = getBiasColor(bias);
                const convictionGrade = analysis.tradeSetup?.convictionGrade || 'F';
                const executiveSummary = analysis.executiveSummary || 'No summary available';

                // Get grade color for thumbnail border
                const getGradeColor = (grade: string) => {
                  if (grade.startsWith('A')) return '#22c55e'; // Green
                  if (grade.startsWith('B')) return '#eab308'; // Gold/Yellow
                  if (grade.startsWith('C')) return '#f59e0b'; // Orange
                  return '#ef4444'; // Red for D/F
                };
                const gradeColor = getGradeColor(convictionGrade);

                return (
                  <div
                    key={item.id}
                    className="w-full flex gap-3"
                    style={{
                      background: isDarkMode ? '#050505' : '#F0F0F0', // Same monochrome color as page background
                      borderRadius: '0.75rem', // Rounded corners
                      padding: '1rem',
                    }}
                  >
                    {/* Thumbnail Image Section */}
                    <div className="flex-shrink-0">
                      <div
                        className="w-20 h-20 rounded-lg overflow-hidden relative"
                        style={{
                          border: `2px solid ${gradeColor}`,
                          background: isDarkMode ? '#1a1a1a' : '#e5e5e5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {/* Placeholder chart thumbnail - you can replace this with actual chart image if available */}
                        <div className="w-full h-full relative">
                          {/* Simple chart visualization placeholder */}
                          <svg width="100%" height="100%" viewBox="0 0 80 80" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id={`gradient-${item.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style={{ stopColor: gradeColor, stopOpacity: 0.3 }} />
                                <stop offset="100%" style={{ stopColor: gradeColor, stopOpacity: 0.1 }} />
                              </linearGradient>
                            </defs>
                            {/* Simple line chart representation */}
                            <polyline
                              points={`10,60 20,50 30,55 40,45 50,40 60,35 70,30`}
                              fill="none"
                              stroke={gradeColor}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <polygon
                              points={`10,60 20,50 30,55 40,45 50,40 60,35 70,30 70,80 10,80`}
                              fill={`url(#gradient-${item.id})`}
                            />
                          </svg>
                          {/* Grade badge overlay */}
                          <div
                            className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold"
                            style={{
                              background: gradeColor,
                              color: '#000',
                            }}
                          >
                            {convictionGrade}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 flex-shrink-0" style={{ color: greenAccent.primary }} />
                          <span className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                            {item.symbol} • {item.timeframe} • {getTradingStyleLabel(item.trading_style)}
                          </span>
                        </div>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                          style={{
                            background: biasColors.bg,
                            color: biasColors.color,
                          }}
                        >
                          {bias.toUpperCase()}
                        </span>
                      </div>

                      {/* Summary */}
                      <p className={`text-[10px] mb-2 leading-tight line-clamp-2 ${isDarkMode ? 'text-slate-300' : 'text-stone-700'}`}>
                        {executiveSummary}
                      </p>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 gap-1.5 mb-2">
                        <div>
                          <div className={`text-[8px] ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>Conviction</div>
                          <div className={`text-[10px] font-semibold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                            {convictionGrade}
                          </div>
                        </div>
                        <div>
                          <div className={`text-[8px] ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>Price</div>
                          <div className={`text-[10px] font-semibold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                            {item.current_price.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}>
                        <div className="flex items-center gap-1.5 text-[8px]" style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                        <button
                          className="text-[10px] font-medium flex-shrink-0"
                          style={{ color: greenAccent.primary }}
                          onClick={(e) => {
                            // #region agent log
                            fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:248',message:'Button clicked - View Full Analysis',data:{hasAnalysis:!!analysis,analysisKeys:analysis?Object.keys(analysis):[],hasTradeSetup:!!analysis?.tradeSetup,hasExecutiveSummary:!!analysis?.executiveSummary},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                            // #endregion
                            e.stopPropagation();
                            // #region agent log
                            fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InsightHistoryPage.tsx:252',message:'Calling onSelectAnalysis',data:{hasAnalysis:!!analysis,onSelectAnalysisType:typeof onSelectAnalysis},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                            // #endregion
                            onSelectAnalysis(analysis);
                          }}
                        >
                          View analysis →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </MeccaSpotlightCard>
        )}
      </div>
    </div>
    </>
  );
};

export default InsightHistoryPage;
