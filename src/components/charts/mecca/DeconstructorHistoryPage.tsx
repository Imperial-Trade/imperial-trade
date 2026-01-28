import React, { useState, useEffect, useMemo } from 'react';
import { X, Brain, Award, Filter, Calendar, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AnalysisResult } from './DeconstructorPanel';
import { MeccaSpotlightCard } from './MeccaSpotlightCard';
import { neonColors } from './neonTheme';

interface DeconstructorHistoryPageProps {
  onClose: () => void;
  onSelectAnalysis: (analysis: AnalysisResult, photoUrl: string) => void;
  isDarkMode: boolean;
}

interface DeconstructorHistoryItem {
  id: string;
  photo_url: string;
  journal_entry_id?: string;
  analysis_result: AnalysisResult;
  created_at: string;
}

type Rating = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C' | 'D' | 'F';

const ratingConfig: Record<Rating, { color: string; bg: string; glow: string; border: string }> = {
  'A+': { color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)', glow: 'rgba(16, 185, 129, 0.5)', border: 'rgba(16, 185, 129, 0.4)' },
  'A': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.2)', glow: 'rgba(34, 197, 94, 0.5)', border: 'rgba(34, 197, 94, 0.4)' },
  'A-': { color: '#4ade80', bg: 'rgba(74, 222, 128, 0.2)', glow: 'rgba(74, 222, 128, 0.5)', border: 'rgba(74, 222, 128, 0.4)' },
  'B+': { color: '#84cc16', bg: 'rgba(132, 204, 22, 0.2)', glow: 'rgba(132, 204, 22, 0.5)', border: 'rgba(132, 204, 22, 0.4)' },
  'B': { color: '#a3e635', bg: 'rgba(163, 230, 53, 0.2)', glow: 'rgba(163, 230, 53, 0.5)', border: 'rgba(163, 230, 53, 0.4)' },
  'B-': { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.2)', glow: 'rgba(251, 191, 36, 0.5)', border: 'rgba(251, 191, 36, 0.4)' },
  'C': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', glow: 'rgba(245, 158, 11, 0.5)', border: 'rgba(245, 158, 11, 0.4)' },
  'D': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', glow: 'rgba(239, 68, 68, 0.5)', border: 'rgba(239, 68, 68, 0.4)' },
  'F': { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.2)', glow: 'rgba(220, 38, 38, 0.5)', border: 'rgba(220, 38, 38, 0.4)' },
};

const DeconstructorHistoryPage: React.FC<DeconstructorHistoryPageProps> = ({
  onClose,
  onSelectAnalysis,
  isDarkMode,
}) => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<DeconstructorHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter state
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    rating: '' as Rating | '',
  });

  // Fetch analyses from database
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchAnalyses = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('deconstructor_analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('[DeconstructorHistoryPage] Error fetching analyses:', error);
        } else {
          setAnalyses(data || []);
        }
      } catch (err) {
        console.error('[DeconstructorHistoryPage] Exception fetching analyses:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyses();
  }, [user?.id]);

  // Filtered analyses
  const filteredAnalyses = useMemo(() => {
    return analyses.filter(item => {
      if (filters.rating && item.analysis_result.overall_rating !== filters.rating) {
        return false;
      }
      return true;
    });
  }, [analyses, filters]);

  const greenAccent = {
    primary: neonColors.emerald,
    dark: neonColors.emeraldDark,
    light: neonColors.emeraldLight,
    glow: neonColors.emeraldGlow,
    border: neonColors.borderEmerald,
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{
        background: isDarkMode ? '#050505' : '#F0F0F0',
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b shrink-0"
        style={{
          borderColor: neonColors.borderDefault,
          background: isDarkMode ? neonColors.bgPrimary : '#fff',
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${greenAccent.primary}20 0%, ${greenAccent.dark}10 100%)`,
              border: `2px solid ${greenAccent.border}`,
            }}
          >
            <Brain className="w-5 h-5" style={{ color: greenAccent.primary }} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold" style={{ color: neonColors.textPrimary }}>
              Deconstruction History
            </h2>
            <p className="text-[10px] sm:text-xs" style={{ color: neonColors.textMuted }}>
              {filteredAnalyses.length} analysis{filteredAnalyses.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="p-2 rounded-lg transition-all touch-manipulation"
            style={{
              background: showFilter ? greenAccent.bg : neonColors.bgGlass,
              border: `1px solid ${showFilter ? greenAccent.border : neonColors.borderDefault}`,
              color: neonColors.textPrimary,
              minWidth: '44px',
              minHeight: '44px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-all touch-manipulation"
            style={{
              background: neonColors.bgGlass,
              border: `1px solid ${neonColors.borderDefault}`,
              color: neonColors.textPrimary,
              minWidth: '44px',
              minHeight: '44px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilter && (
        <div 
          className="px-4 sm:px-5 py-3 border-b shrink-0"
          style={{
            borderColor: neonColors.borderDefault,
            background: neonColors.bgGlass,
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="text-[10px] sm:text-xs font-medium mb-1.5 block" style={{ color: neonColors.textMuted }}>
                Rating
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {(['', 'F', 'D', 'C', 'B-', 'B', 'B+', 'A-', 'A', 'A+'] as const).map(rating => (
                  <button
                    key={rating}
                    onClick={() => setFilters(prev => ({ ...prev, rating }))}
                    className="px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all touch-manipulation"
                    style={{
                      background: filters.rating === rating 
                        ? (rating === '' ? greenAccent.bg : ratingConfig[rating as Rating]?.bg)
                        : neonColors.bgSecondary,
                      border: `1px solid ${filters.rating === rating 
                        ? (rating === '' ? greenAccent.border : ratingConfig[rating as Rating]?.border)
                        : neonColors.borderDefault}`,
                      color: filters.rating === rating 
                        ? (rating === '' ? greenAccent.primary : ratingConfig[rating as Rating]?.color)
                        : neonColors.textSecondary,
                      minHeight: '28px',
                    }}
                  >
                    {rating || 'All'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{ borderColor: greenAccent.primary }} />
              <p className="text-sm" style={{ color: neonColors.textMuted }}>Loading history...</p>
            </div>
          </div>
        ) : filteredAnalyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                background: `linear-gradient(135deg, ${greenAccent.primary}20 0%, ${greenAccent.dark}10 100%)`,
                border: `2px solid ${greenAccent.border}`,
              }}
            >
              <ImageIcon className="w-8 h-8" style={{ color: greenAccent.primary }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: neonColors.textPrimary }}>
              No deconstructions yet
            </p>
            <p className="text-xs text-center max-w-xs" style={{ color: neonColors.textMuted }}>
              Start analyzing your trading screenshots to see them here
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-3">
            {filteredAnalyses.map((item) => {
              const rating = item.analysis_result.overall_rating;
              const config = rating ? ratingConfig[rating] : null;
              
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectAnalysis(item.analysis_result, item.photo_url)}
                  className="p-4 rounded-xl border cursor-pointer transition-all touch-manipulation"
                  style={{
                    background: neonColors.bgGlass,
                    borderColor: config?.border || neonColors.borderDefault,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border" style={{ borderColor: neonColors.borderDefault }}>
                      <img 
                        src={item.photo_url} 
                        alt="Deconstructed screenshot"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {rating && (
                          <div
                            className="inline-flex items-center gap-1 rounded-lg text-[10px] px-2 py-1 font-bold"
                            style={{
                              background: config.bg,
                              color: config.color,
                              border: `1px solid ${config.border}`,
                            }}
                          >
                            <Award className="w-3 h-3" />
                            {rating}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-[10px]" style={{ color: neonColors.textMuted }}>
                          <Calendar className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {item.analysis_result.rating_explanation && (
                        <p className="text-xs line-clamp-2" style={{ color: neonColors.textSecondary }}>
                          {item.analysis_result.rating_explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeconstructorHistoryPage;
