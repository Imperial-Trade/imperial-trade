import React, { useState, useRef, useCallback, useEffect, useMemo, createContext, useContext } from 'react';
import { Upload, Brain, X, Sparkles, CheckCircle2, AlertTriangle, Lightbulb, TrendingUp, Shield, Target, Loader2, Award, Filter, Link2, Calendar, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AnalyzeSetup, UploadFile } from '@/api/integrations';
import { MeccaSpotlightCard } from './MeccaSpotlightCard';
import { neonColors } from './neonTheme';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Context for sharing DeconstructorPanel state
interface DeconstructorContextType {
  fileInputRef: React.RefObject<HTMLInputElement>;
  galleryPhotos: GalleryPhoto[];
  isAnalyzing: boolean;
  handleDeconstruct: (photo: GalleryPhoto) => Promise<void>;
  panelContent?: React.ReactNode;
}

export const DeconstructorContext = createContext<DeconstructorContextType | null>(null);

export const useDeconstructor = () => {
  const context = useContext(DeconstructorContext);
  if (!context) throw new Error('useDeconstructor must be used within DeconstructorProvider');
  return context;
};

// Rating type
type Rating = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C' | 'D' | 'F';

// Gallery Photo interface
interface GalleryPhoto {
  id: string;
  url: string;
  journalEntryId?: string;
  tradeDate?: string;
  asset?: string;
  pnl?: number;
  notes?: string;
  isAnalyzed: boolean;
  rating?: Rating;
  ratingExplanation?: string;
  analysisResult?: AnalysisResult;
  thumbnailUrl?: string;
  source: 'upload' | 'journal';
  storagePath?: string; // For signed URL generation
}

// Analysis Result interface (updated with rating)
interface AnalysisResult {
  overall_rating?: Rating;
  rating_explanation?: string;
  overall_analysis?: string;
  screenshot_analysis?: {
    images_processed?: number;
    platform_detected?: string;
    data_quality?: string;
    visible_timeframe?: string;
    account_type?: string;
  };
  extracted_metrics?: {
    account_balance?: string;
    equity?: string;
    total_pnl?: string;
    win_rate?: string;
    win_count?: string;
    loss_count?: string;
    largest_win?: string;
    largest_loss?: string;
    position_sizes?: string;
  };
  visual_patterns?: {
    chart_patterns_seen?: string[];
    support_resistance?: string[];
    trend_direction?: string;
    entry_quality?: string;
    exit_timing?: string;
  };
  risk_assessment?: {
    risk_score?: string | number;
    position_sizing?: string;
    stop_losses?: string;
    leverage_usage?: string;
  };
  trader_behavior?: {
    experience_level?: string;
    discipline_signs?: string[];
    warning_signs?: string[];
    emotional_indicators?: string[];
  };
  performance_metrics?: {
    win_rate?: number;
    total_pnl?: number;
    risk_score?: number;
    trades_analyzed?: number;
  };
  strengths?: string[];
  improvements?: string[];
  recommendations?: string[];
  key_insights?: string[];
}

interface DeconstructorPanelProps {
  isDarkMode?: boolean;
}

// Rating configuration
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

export const DeconstructorPanel: React.FC<DeconstructorPanelProps & { children?: (context: DeconstructorContextType) => React.ReactNode }> = ({ isDarkMode = true, children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Gallery state
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [isLinkedToJournal, setIsLinkedToJournal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDeconstructed, setFilterDeconstructed] = useState<'all' | 'deconstructed' | 'not-deconstructed'>('all');
  const [filterRating, setFilterRating] = useState<Rating | 'all'>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'journal' | 'upload'>('all');
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [insightStream, setInsightStream] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [modalAnimating, setModalAnimating] = useState(false);
  const [showPreloader, setShowPreloader] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStartY = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insightIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  const greenAccent = {
    primary: neonColors.emerald,
    dark: neonColors.emeraldDark,
    light: neonColors.emeraldLight,
    glow: neonColors.emeraldGlow,
    border: neonColors.borderEmerald,
  };

  // Load saved analyses from database
  const loadSavedPhotos = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('deconstructor_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Update gallery photos with analysis results
        setGalleryPhotos(prev => prev.map(photo => {
          const analysis = data.find(a => a.photo_url === photo.url);
          if (analysis && analysis.analysis_result) {
            const result = analysis.analysis_result as AnalysisResult;
            return {
              ...photo,
              isAnalyzed: true,
              rating: result.overall_rating,
              ratingExplanation: result.rating_explanation,
              analysisResult: result,
            };
          }
          return photo;
        }));
      }
    } catch (error) {
      console.error('Error loading saved analyses:', error);
    }
  }, [user?.id]);

  // Fetch journal photos
  const fetchJournalPhotos = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: entries, error } = await supabase
        .from('trade_journal_entries')
        .select('id, trade_date, asset_ticker, pnl, notes, screenshot_urls')
        .eq('user_id', user.id)
        .not('screenshot_urls', 'is', null)
        .order('trade_date', { ascending: false });

      if (error) throw error;

      if (entries && entries.length > 0) {
        const newPhotos: GalleryPhoto[] = [];
        
        for (const entry of entries) {
          if (entry.screenshot_urls && Array.isArray(entry.screenshot_urls) && entry.screenshot_urls.length > 0) {
            // Create signed URLs for private bucket
            const storagePaths = entry.screenshot_urls.filter((path: string) => 
              path && typeof path === 'string' && !path.startsWith('http')
            );
            
            if (storagePaths.length > 0) {
              const { data: signedUrls, error: urlError } = await supabase.storage
                .from('journal-charts')
                .createSignedUrls(storagePaths, 86400); // 24 hour expiry

              if (!urlError && signedUrls) {
                signedUrls.forEach((item, index) => {
                  const photoUrl = item.signedUrl || (item as any)['signedURL'] || '';
                  if (photoUrl) {
                    newPhotos.push({
                      id: `${entry.id}-${index}`,
                      url: photoUrl,
                      journalEntryId: entry.id,
                      tradeDate: entry.trade_date,
                      asset: entry.asset_ticker,
                      pnl: entry.pnl,
                      notes: entry.notes,
                      isAnalyzed: false,
                      source: 'journal',
                      storagePath: storagePaths[index],
                    });
                  }
                });
              }
            }
          }
        }

        // Merge with existing photos, avoiding duplicates
        setGalleryPhotos(prev => {
          const existingUrls = new Set(prev.map(p => p.storagePath || p.url));
          const uniqueNewPhotos = newPhotos.filter(p => 
            !existingUrls.has(p.storagePath || p.url)
          );
          return [...prev, ...uniqueNewPhotos];
        });

        // Load saved analyses after fetching photos
        await loadSavedPhotos();
      }
    } catch (error) {
      console.error('Error fetching journal photos:', error);
      toast({
        title: "Error",
        description: "Failed to fetch journal photos",
        variant: "destructive"
      });
    }
  }, [user?.id, loadSavedPhotos, toast]);

  // Check if journal is linked on mount
  useEffect(() => {
    if (user?.id) {
      const linked = localStorage.getItem(`deconstructor_linked_journal_${user.id}`) === 'true';
      setIsLinkedToJournal(linked);
      if (linked) {
        fetchJournalPhotos();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Real-time subscription to journal entries
  useEffect(() => {
    if (!user?.id || !isLinkedToJournal) return;

    const channel = supabase
      .channel('deconstructor-journal-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_journal_entries',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Journal entry changed:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Fetch new photos when journal entry is added/updated
            fetchJournalPhotos();
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLinkedToJournal]);

  // Link to Journal XX
  const handleLinkJournal = useCallback(() => {
    if (!user?.id) return;
    
    setIsLinkedToJournal(true);
    localStorage.setItem(`deconstructor_linked_journal_${user.id}`, 'true');
    fetchJournalPhotos();
    
    toast({
      title: "Linked to Journal XX",
      description: "Journal photos will now appear in the gallery",
    });
  }, [user?.id, fetchJournalPhotos, toast]);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    if (!user?.id) {
      toast({
        title: "Login Required",
        description: "Please log in to upload photos",
        variant: "destructive"
      });
      return;
    }

    const fileArray = Array.from(files).slice(0, 10);
    const newPhotos: GalleryPhoto[] = [];

    for (const file of fileArray) {
      try {
        const uploadResult = await UploadFile({ file, userId: user.id });
        if (uploadResult.file_url) {
          newPhotos.push({
            id: `upload-${Date.now()}-${Math.random()}`,
            url: uploadResult.file_url,
            isAnalyzed: false,
            source: 'upload',
          });
        }
      } catch (error: any) {
        console.error('Upload error:', error);
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive"
        });
      }
    }

    setGalleryPhotos(prev => [...prev, ...newPhotos]);
  }, [user?.id, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Insight stream simulation (must be defined before handleDeconstruct)
  const addInsight = useCallback((insight: string) => {
    setInsightStream(prev => [...prev, insight]);
  }, []);

  const simulateAnalysisStream = useCallback(() => {
    const insights = [
      "🔍 Initializing MECCA neural analysis...",
      "📊 Scanning uploaded trading screenshots...",
      "💹 Extracting trade entry and exit points...",
      "📈 Calculating profit/loss ratios...",
      "⚖️ Analyzing risk management patterns...",
      "🎯 Identifying trading strengths...",
      "⚠️ Detecting improvement areas...",
      "🧠 Generating personalized recommendations...",
      "✨ Analysis complete - insights ready!"
    ];
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < insights.length) {
        addInsight(insights[currentIndex]);
        setAnalysisProgress((currentIndex + 1) / insights.length * 100);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 800);
    insightIntervalRef.current = interval;
    return () => {
      if (interval) clearInterval(interval);
      if (insightIntervalRef.current) clearInterval(insightIntervalRef.current);
    };
  }, [addInsight]);

  // Handle deconstruct
  const handleDeconstruct = useCallback(async (photo: GalleryPhoto) => {
    if (!user?.id || isAnalyzing) return;

    setShowPreloader(true);
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setInsightStream([]);
    setAnalysisResult(null);

    await new Promise(resolve => setTimeout(resolve, 800));

    const cleanup = simulateAnalysisStream();

    try {
      addInsight("🚀 Starting MECCA analysis engine...");
      addInsight("🧠 Analyzing with personalized AI intelligence...");

      const userApiKey = typeof window !== 'undefined' 
        ? localStorage.getItem('gemini_api_key') || null
        : null;

      const result = await AnalyzeSetup({
        user_id: user.id,
        file_urls: [photo.url],
        analysis_context: {},
        api_key: userApiKey
      });

      addInsight("📊 Processing trading patterns and performance metrics...");

      if (!result) {
        throw new Error('Analysis returned no results');
      }

      let parsedResult: any;
      try {
        parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (parseError: any) {
        throw new Error(`Failed to parse analysis results: ${parseError?.message}`);
      }

      const validatedResult: AnalysisResult = {
        overall_rating: parsedResult.overall_rating,
        rating_explanation: parsedResult.rating_explanation,
        overall_analysis: parsedResult.overall_analysis || "Analysis completed successfully.",
        screenshot_analysis: parsedResult.screenshot_analysis || {
          images_processed: 1,
          platform_detected: "Unknown",
          data_quality: "good",
        },
        extracted_metrics: parsedResult.extracted_metrics || {},
        visual_patterns: parsedResult.visual_patterns || {},
        risk_assessment: parsedResult.risk_assessment || {},
        trader_behavior: parsedResult.trader_behavior || {},
        performance_metrics: parsedResult.performance_metrics || {},
        strengths: parsedResult.strengths || [],
        improvements: parsedResult.improvements || [],
        recommendations: parsedResult.recommendations || [],
        key_insights: parsedResult.key_insights || [],
      };

      // Save to database
      const { error: dbError } = await supabase
        .from('deconstructor_analyses')
        .upsert({
          user_id: user.id,
          photo_url: photo.url,
          journal_entry_id: photo.journalEntryId || null,
          analysis_result: validatedResult,
        }, {
          onConflict: 'user_id,photo_url'
        });

      if (dbError) {
        console.error('Error saving analysis:', dbError);
      }

      // Update photo state
      setGalleryPhotos(prev => prev.map(p => 
        p.id === photo.id 
          ? { ...p, isAnalyzed: true, rating: validatedResult.overall_rating, ratingExplanation: validatedResult.rating_explanation, analysisResult: validatedResult }
          : p
      ));

      await new Promise(resolve => setTimeout(resolve, 1000));
      addInsight("🎯 Analysis complete! Generating insights...");

      setShowPreloader(false);
      setAnalysisResult(validatedResult);
      setSelectedPhoto(null);

      await new Promise(resolve => setTimeout(resolve, 300));
      openModal();

      toast({
        title: "🎉 Analysis Complete!",
        description: `Rating: ${validatedResult.overall_rating || 'N/A'}`,
      });
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setShowPreloader(false);
      addInsight(`❌ Analysis failed: ${error.message}`);
      toast({
        title: "Analysis Failed",
        description: error.message || "There was an error analyzing the photo",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      cleanup();
    }
  }, [user?.id, isAnalyzing, addInsight, simulateAnalysisStream, toast]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return galleryPhotos.filter(photo => {
      // Deconstructed filter
      if (filterDeconstructed === 'deconstructed' && !photo.isAnalyzed) return false;
      if (filterDeconstructed === 'not-deconstructed' && photo.isAnalyzed) return false;

      // Rating filter
      if (filterRating !== 'all' && photo.rating !== filterRating) return false;

      // Source filter
      if (filterSource !== 'all' && photo.source !== filterSource) return false;

      return true;
    });
  }, [galleryPhotos, filterDeconstructed, filterRating, filterSource]);

  // Group photos by journal entry (for +N display)
  const groupedPhotos = useMemo(() => {
    const groups = new Map<string, GalleryPhoto[]>();
    filteredPhotos.forEach(photo => {
      const key = photo.journalEntryId || photo.id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(photo);
    });
    return Array.from(groups.values());
  }, [filteredPhotos]);

  // Modal handlers
  const openModal = () => {
    setModalAnimating(true);
    setShowResultsModal(true);
    setTimeout(() => setModalAnimating(false), 50);
  };

  const closeModal = () => {
    setModalAnimating(true);
    setTimeout(() => {
      setShowResultsModal(false);
      setModalAnimating(false);
      setDragY(0);
    }, 400);
  };

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const delta = clientY - dragStartY.current;
    if (delta > 0) {
      setDragY(delta);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (dragY > 150) {
      closeModal();
    } else {
      setDragY(0);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (insightIntervalRef.current) {
        clearInterval(insightIntervalRef.current);
      }
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  // Rating badge component
  const RatingBadge: React.FC<{ rating: Rating; size?: 'sm' | 'md' | 'lg' }> = ({ rating, size = 'md' }) => {
    const config = ratingConfig[rating];
    const sizeClasses = {
      sm: 'text-[8px] px-1.5 py-0.5',
      md: 'text-[10px] px-2 py-1',
      lg: 'text-xs px-3 py-1.5',
    };
    
    return (
      <div
        className={`inline-flex items-center gap-1 rounded-lg font-bold ${sizeClasses[size]}`}
        style={{
          background: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`,
          boxShadow: `0 0 8px ${config.glow}`,
        }}
      >
        <Award className="w-2.5 h-2.5" />
        {rating}
      </div>
    );
  };

  // Debug: Log when component renders
  useEffect(() => {
    console.log('🎨 DeconstructorPanel: New Gallery UI loaded v2.0', {
      galleryPhotos: galleryPhotos.length,
      filteredPhotos: filteredPhotos.length,
      isLinkedToJournal,
      showFilters,
      timestamp: new Date().toISOString()
    });
  }, [galleryPhotos.length, filteredPhotos.length, isLinkedToJournal, showFilters]);

  // Split into content and provider - content goes inside spotlight card, provider wraps everything
  // Define panelContent BEFORE contextValue to avoid initialization error
  const panelContent = (
    <>
      <div className="h-full flex flex-col min-h-0 overflow-y-auto relative z-10" style={{ 
        padding: 0,
      }}>
          {/* Animated Deconstructor Symbol - Only visible when no photos */}
          {galleryPhotos.length === 0 && !isAnalyzing && (
            <div className="relative flex items-center justify-center flex-1 min-h-0 w-full h-full" style={{ padding: '2rem' }}>
                {/* Pulsing outer ring */}
                <div 
                  className="absolute rounded-full border-2"
                  style={{
                    width: '200px',
                    height: '200px',
                    borderColor: greenAccent.primary,
                    opacity: 0.3,
                    animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    boxShadow: `0 0 40px ${greenAccent.glow}`,
                  }}
                />
                {/* Rotating middle ring */}
                <div 
                  className="absolute rounded-full border-2"
                  style={{
                    width: '160px',
                    height: '160px',
                    borderColor: greenAccent.primary,
                    opacity: 0.5,
                    animation: 'rotate-slow 4s linear infinite',
                    boxShadow: `0 0 30px ${greenAccent.glow}`,
                  }}
                />
                {/* Pulsing inner symbol container */}
                <div 
                  className="relative w-32 h-32 rounded-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${greenAccent.primary}20 0%, ${greenAccent.dark}10 100%)`,
                    border: `3px solid ${greenAccent.primary}`,
                    animation: 'pulse-symbol 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    boxShadow: `0 0 40px ${greenAccent.glow}, inset 0 0 20px ${greenAccent.glow}40`,
                  }}
                >
                  {/* Animated Brain/Deconstructor Symbol */}
                  <Brain 
                    className="w-16 h-16"
                    style={{ 
                      color: greenAccent.primary,
                      animation: 'brain-think 1.5s ease-in-out infinite',
                      filter: `drop-shadow(0 0 8px ${greenAccent.glow})`,
                    }} 
                  />
                </div>
            </div>
          )}

          {/* Photo Gallery Grid - Only shows when photos exist */}
          {galleryPhotos.length > 0 && (
            <>
              {/* Header - NEW GALLERY UI v2.0 */}
              <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 w-full">
            <div className="flex items-center gap-2 sm:gap-3">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${greenAccent.primary}20 0%, ${greenAccent.dark}10 100%)`,
                  border: `2px solid ${greenAccent.border}`,
                  boxShadow: `0 0 20px ${greenAccent.glow}`
                }}
              >
                <Brain className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: greenAccent.primary }} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold truncate" style={{ color: neonColors.textPrimary }}>
                  Trading Screenshot Analyzer
                </h2>
                <p className="text-[10px] sm:text-xs" style={{ color: neonColors.textMuted }}>
                  {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''} in gallery
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isLinkedToJournal && (
                <button
                  onClick={handleLinkJournal}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all touch-manipulation"
                  style={{
                    background: neonColors.bgGlass,
                    border: `1px solid ${neonColors.borderDefault}`,
                    color: neonColors.textPrimary,
                    minHeight: '44px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" />
                    Link Journal
                  </span>
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 rounded-lg transition-all touch-manipulation"
                style={{
                  background: showFilters ? greenAccent.bg : neonColors.bgGlass,
                  border: `1px solid ${showFilters ? greenAccent.border : neonColors.borderDefault}`,
                  color: neonColors.textPrimary,
                  minWidth: '44px',
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mb-4 sm:mb-5 p-3 sm:p-4 rounded-xl border" style={{ 
              background: neonColors.bgGlass, 
              borderColor: neonColors.borderDefault 
            }}>
              <div className="space-y-3">
                {/* Analysis Status Filter */}
                <div>
                  <label className="text-[10px] sm:text-xs font-medium mb-1.5 block" style={{ color: neonColors.textMuted }}>
                    Analysis Status
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(['all', 'deconstructed', 'not-deconstructed'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setFilterDeconstructed(status)}
                        className="px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all touch-manipulation"
                        style={{
                          background: filterDeconstructed === status ? greenAccent.bg : neonColors.bgSecondary,
                          border: `1px solid ${filterDeconstructed === status ? greenAccent.border : neonColors.borderDefault}`,
                          color: filterDeconstructed === status ? greenAccent.primary : neonColors.textSecondary,
                          minHeight: '32px',
                        }}
                      >
                        {status === 'all' ? 'All' : status === 'deconstructed' ? 'Analyzed' : 'Not Analyzed'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="text-[10px] sm:text-xs font-medium mb-1.5 block" style={{ color: neonColors.textMuted }}>
                    Rating (F to A+)
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['all', 'F', 'D', 'C', 'B-', 'B', 'B+', 'A-', 'A', 'A+'] as const).map(rating => (
                      <button
                        key={rating}
                        onClick={() => setFilterRating(rating)}
                        className="px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all touch-manipulation"
                        style={{
                          background: filterRating === rating 
                            ? (rating === 'all' ? greenAccent.bg : ratingConfig[rating as Rating]?.bg)
                            : neonColors.bgSecondary,
                          border: `1px solid ${filterRating === rating 
                            ? (rating === 'all' ? greenAccent.border : ratingConfig[rating as Rating]?.border)
                            : neonColors.borderDefault}`,
                          color: filterRating === rating 
                            ? (rating === 'all' ? greenAccent.primary : ratingConfig[rating as Rating]?.color)
                            : neonColors.textSecondary,
                          minHeight: '28px',
                        }}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source Filter */}
                <div>
                  <label className="text-[10px] sm:text-xs font-medium mb-1.5 block" style={{ color: neonColors.textMuted }}>
                    Source
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(['all', 'journal', 'upload'] as const).map(source => (
                      <button
                        key={source}
                        onClick={() => setFilterSource(source)}
                        className="px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all touch-manipulation"
                        style={{
                          background: filterSource === source ? greenAccent.bg : neonColors.bgSecondary,
                          border: `1px solid ${filterSource === source ? greenAccent.border : neonColors.borderDefault}`,
                          color: filterSource === source ? greenAccent.primary : neonColors.textSecondary,
                          minHeight: '32px',
                        }}
                      >
                        {source === 'all' ? 'All' : source === 'journal' ? 'Journal' : 'Upload'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Zone */}
          {!isAnalyzing && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-4 sm:p-6 md:p-8 text-center cursor-pointer transition-all mb-4 sm:mb-5 md:mb-6 touch-manipulation"
              style={{
                borderColor: neonColors.borderDefault,
                background: neonColors.bgGlass,
                minHeight: '120px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div className="flex flex-col items-center gap-2 sm:gap-3">
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-1 sm:mb-2"
                  style={{
                    background: `linear-gradient(135deg, ${greenAccent.primary}20 0%, ${greenAccent.dark}10 100%)`,
                    border: `2px solid ${greenAccent.border}`,
                  }}
                >
                  <Upload className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" style={{ color: greenAccent.primary }} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium mb-0.5 sm:mb-1" style={{ color: neonColors.textPrimary }}>
                    Drop screenshots or tap to upload
                  </p>
                  <p className="text-[10px] sm:text-xs" style={{ color: neonColors.textMuted }}>
                    Up to 10 files, max 10MB each
                  </p>
                </div>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleFileUpload(e.target.files);
              }
            }}
          />

          {/* Photo Gallery Grid */}
          {filteredPhotos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {groupedPhotos.map((group, groupIndex) => {
                const firstPhoto = group[0];
                const remainingCount = group.length - 1;
                
                return (
                  <div
                    key={firstPhoto.id}
                    className="relative group cursor-pointer"
                    onClick={() => setSelectedPhoto(firstPhoto)}
                  >
                    <div 
                      className="relative aspect-square rounded-2xl overflow-hidden border"
                      style={{ 
                        borderColor: neonColors.borderDefault,
                        transform: 'scale(1)',
                        transition: 'transform 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (window.innerWidth >= 768) {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <img 
                        src={firstPhoto.url} 
                        alt="Gallery photo"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      
                      {/* Rating Badge */}
                      {firstPhoto.rating && (
                        <div className="absolute top-2 left-2 z-10">
                          <RatingBadge rating={firstPhoto.rating} size="sm" />
                        </div>
                      )}
                      
                      {/* Analyzed Checkmark */}
                      {firstPhoto.isAnalyzed && (
                        <div 
                          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center z-10"
                          style={{
                            background: `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)`,
                            boxShadow: `0 0 8px ${greenAccent.glow}`,
                          }}
                        >
                          <CheckCircle2 className="w-3 h-3 text-black" />
                        </div>
                      )}
                      
                      {/* Source Badge */}
                      <div className="absolute bottom-2 left-2 z-10">
                        <div 
                          className="px-1.5 py-0.5 rounded text-[8px] font-medium"
                          style={{
                            background: firstPhoto.source === 'journal' 
                              ? 'rgba(59, 130, 246, 0.8)' 
                              : 'rgba(139, 92, 246, 0.8)',
                            color: '#fff',
                          }}
                        >
                          {firstPhoto.source === 'journal' ? 'Journal' : 'Upload'}
                        </div>
                      </div>
                      
                      {/* Remaining Count Badge */}
                      {remainingCount > 0 && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center z-10"
                          style={{
                            background: 'rgba(0, 0, 0, 0.6)',
                          }}
                        >
                          <div 
                            className="text-lg sm:text-xl font-bold"
                            style={{ color: '#fff' }}
                          >
                            +{remainingCount}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
            </>
          )}

          {/* Preloader */}
          {showPreloader && (
            <div 
              className="fixed inset-0 z-[9998] flex items-center justify-center"
              style={{
                background: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                padding: 'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)',
              }}
            >
              <div className="flex flex-col items-center gap-4 sm:gap-6 px-4">
                <div className="relative">
                  <div 
                    className="absolute inset-0 rounded-full -m-[30px] sm:-m-[40px]" 
                    style={{ 
                      border: `3px solid ${greenAccent.primary}`, 
                      opacity: 0.2, 
                      width: 'calc(100% + 60px)',
                      height: 'calc(100% + 60px)',
                      animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
                    }} 
                  />
                  <div 
                    className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center relative"
                    style={{ 
                      background: `linear-gradient(135deg, ${greenAccent.primary}20 0%, ${greenAccent.dark}10 100%)`, 
                      border: `3px solid ${greenAccent.primary}60`,
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      boxShadow: `0 0 40px ${greenAccent.primary}40`
                    }}
                  >
                    <Brain className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16" style={{ color: greenAccent.primary }} />
                  </div>
                </div>
                <div className="text-center space-y-1 sm:space-y-2">
                  <p className="font-semibold text-lg sm:text-xl" style={{ color: neonColors.textPrimary }}>
                    Initializing Analysis...
                  </p>
                  <p className="text-xs sm:text-sm" style={{ color: neonColors.textMuted }}>
                    Preparing MECCA AI engine
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading Animation */}
          {isAnalyzing && !showPreloader && (
            <div 
              className="fixed inset-0 z-[9998] flex items-center justify-center"
              style={{
                background: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                padding: 'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)',
              }}
            >
              <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-md px-4 sm:px-6">
                <div className="relative">
                  <svg className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke={neonColors.borderDefault}
                      strokeWidth="4"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke={greenAccent.primary}
                      strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 54}`}
                      strokeDashoffset={`${2 * Math.PI * 54 * (1 - analysisProgress / 100)}`}
                      strokeLinecap="round"
                      style={{
                        transition: 'stroke-dashoffset 0.3s ease',
                        filter: `drop-shadow(0 0 8px ${greenAccent.glow})`
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${greenAccent.primary}20 0%, ${greenAccent.dark}10 100%)`,
                        border: `2px solid ${greenAccent.border}`,
                      }}
                    >
                      <Brain className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 animate-pulse" style={{ color: greenAccent.primary }} />
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold mb-1" style={{ color: greenAccent.primary }}>
                    {Math.round(analysisProgress)}%
                  </p>
                  <p className="text-xs sm:text-sm" style={{ color: neonColors.textMuted }}>
                    Analyzing your screenshots...
                  </p>
                </div>
                <div 
                  className="w-full rounded-xl border p-3 sm:p-4 space-y-2 max-h-40 sm:max-h-48 overflow-y-auto custom-scrollbar"
                  style={{
                    background: neonColors.bgGlass,
                    borderColor: neonColors.borderDefault,
                  }}
                >
                  {insightStream.length === 0 ? (
                    <div className="text-center py-3 sm:py-4">
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-2 animate-spin" style={{ color: greenAccent.primary }} />
                      <p className="text-[10px] sm:text-xs" style={{ color: neonColors.textMuted }}>
                        AI insights will appear here during analysis
                      </p>
                    </div>
                  ) : (
                    insightStream.map((insight, index) => (
                      <div
                        key={index}
                        className="text-[10px] sm:text-xs p-1.5 sm:p-2 rounded-lg animate-fade-in"
                        style={{
                          background: index === insightStream.length - 1 
                            ? `linear-gradient(135deg, ${greenAccent.primary}10 0%, ${greenAccent.dark}05 100%)`
                            : 'transparent',
                          color: neonColors.textSecondary,
                          animation: 'fadeInUp 0.3s ease-out',
                          animationDelay: `${index * 0.1}s`,
                        }}
                      >
                        {insight}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Full-Screen Photo View */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="relative mb-4">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors touch-manipulation"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <img 
                src={selectedPhoto.url} 
                alt="Selected photo"
                className="w-full rounded-2xl"
                style={{ maxHeight: '60vh', objectFit: 'contain' }}
              />
            </div>
            
            {/* Trade Details Card */}
            {(selectedPhoto.asset || selectedPhoto.pnl !== undefined || selectedPhoto.tradeDate || selectedPhoto.notes) && (
              <div className="p-4 sm:p-5 rounded-xl border mb-4" style={{
                background: neonColors.bgGlass,
                borderColor: neonColors.borderDefault,
              }}>
                <h3 className="text-sm sm:text-base font-semibold mb-3" style={{ color: neonColors.textPrimary }}>
                  Trade Details
                </h3>
                <div className="space-y-2">
                  {selectedPhoto.asset && (
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm" style={{ color: neonColors.textMuted }}>Asset:</span>
                      <span className="text-xs sm:text-sm font-medium" style={{ color: neonColors.textPrimary }}>{selectedPhoto.asset}</span>
                    </div>
                  )}
                  {selectedPhoto.pnl !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm" style={{ color: neonColors.textMuted }}>P&L:</span>
                      <span className={`text-xs sm:text-sm font-medium ${selectedPhoto.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {selectedPhoto.pnl >= 0 ? '+' : ''}{selectedPhoto.pnl.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {selectedPhoto.tradeDate && (
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm" style={{ color: neonColors.textMuted }}>Date:</span>
                      <span className="text-xs sm:text-sm font-medium" style={{ color: neonColors.textPrimary }}>
                        {new Date(selectedPhoto.tradeDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedPhoto.rating && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm" style={{ color: neonColors.textMuted }}>Rating:</span>
                      <RatingBadge rating={selectedPhoto.rating} size="md" />
                    </div>
                  )}
                  {selectedPhoto.ratingExplanation && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: neonColors.borderDefault }}>
                      <p className="text-[10px] sm:text-xs" style={{ color: neonColors.textSecondary }}>
                        {selectedPhoto.ratingExplanation}
                      </p>
                    </div>
                  )}
                  {selectedPhoto.notes && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: neonColors.borderDefault }}>
                      <p className="text-[10px] sm:text-xs" style={{ color: neonColors.textSecondary }}>
                        {selectedPhoto.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Deconstruct Button */}
            <button
              onClick={() => {
                if (selectedPhoto.isAnalyzed && selectedPhoto.analysisResult) {
                  setAnalysisResult(selectedPhoto.analysisResult);
                  setSelectedPhoto(null);
                  openModal();
                } else {
                  handleDeconstruct(selectedPhoto);
                }
              }}
              disabled={isAnalyzing}
              className="w-full py-3 sm:py-4 rounded-xl font-semibold text-xs sm:text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              style={{
                background: `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)`,
                color: '#000',
                boxShadow: `0 0 20px ${greenAccent.glow}`,
                minHeight: '44px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span className="flex items-center justify-center gap-2">
                {selectedPhoto.isAnalyzed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>View Analysis Results</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Deconstruct Trades</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && analysisResult && (
        <div className="fixed inset-0 z-[9999]">
          <div 
            className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${modalAnimating ? 'opacity-0' : 'opacity-100'}`}
            onClick={closeModal}
          />
          
          <div 
            className={`absolute inset-x-0 bottom-0 rounded-t-3xl border-t shadow-2xl overflow-hidden ${
              isDragging ? '' : 'transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]'
            } ${modalAnimating ? 'translate-y-full' : 'translate-y-0'}`}
            style={{ 
              top: typeof window !== 'undefined' && window.innerWidth < 768 ? '72px' : '80px',
              background: `linear-gradient(to bottom, ${neonColors.bgSecondary}, ${neonColors.bgPrimary})`,
              borderColor: neonColors.borderDefault,
              transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
              animation: modalAnimating ? 'none' : 'slideUpModal 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
              height: typeof window !== 'undefined' && window.innerWidth < 768
                ? `calc(100% - 72px - env(safe-area-inset-bottom, 0px))`
                : `calc(100% - 80px)`,
              maxHeight: typeof window !== 'undefined' && window.innerWidth < 768
                ? `calc(100% - 72px - env(safe-area-inset-bottom, 0px))`
                : `calc(100% - 80px)`,
            }}
          >
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
              <div 
                className={`w-12 h-1.5 rounded-full transition-colors ${isDragging ? 'bg-slate-400' : 'bg-slate-600'}`} 
              />
            </div>

            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b" style={{ borderColor: neonColors.borderDefault }}>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div 
                  className="p-1.5 sm:p-2 rounded-xl flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${greenAccent.primary}20 0%, ${greenAccent.dark}10 100%)`,
                    border: `1px solid ${greenAccent.border}`
                  }}
                >
                  <Brain className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: greenAccent.primary }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-sm sm:text-base font-bold truncate" style={{ color: neonColors.textPrimary }}>
                      Analysis Results
                    </h2>
                    {analysisResult.overall_rating && (
                      <RatingBadge rating={analysisResult.overall_rating} size="sm" />
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs truncate" style={{ color: neonColors.textMuted }}>
                    {analysisResult.screenshot_analysis?.images_processed || 1} screenshot(s) analyzed
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-full transition-colors flex-shrink-0 touch-manipulation"
                style={{ 
                  background: neonColors.bgGlass,
                  color: neonColors.textMuted,
                  minWidth: '44px',
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent'
                }}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div 
              className="px-4 sm:px-5 pb-6 sm:pb-8 space-y-3 sm:space-y-4 overflow-y-auto custom-scrollbar"
              style={{ 
                maxHeight: typeof window !== 'undefined' && window.innerWidth < 768
                  ? 'calc(100vh - 200px)'
                  : 'calc(85vh - 100px)',
                paddingBottom: 'max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom, 0px)))'
              }}
            >
              {/* Rating Explanation */}
              {analysisResult.rating_explanation && (
                <div className="p-3 sm:p-4 rounded-xl border animate-fade-in" style={{
                  background: analysisResult.overall_rating 
                    ? ratingConfig[analysisResult.overall_rating]?.bg 
                    : neonColors.bgGlass,
                  borderColor: analysisResult.overall_rating 
                    ? ratingConfig[analysisResult.overall_rating]?.border 
                    : neonColors.borderDefault,
                }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4" style={{ 
                      color: analysisResult.overall_rating 
                        ? ratingConfig[analysisResult.overall_rating]?.color 
                        : neonColors.textPrimary 
                    }} />
                    <h3 className="text-xs sm:text-sm font-semibold" style={{ color: neonColors.textPrimary }}>
                      Rating Explanation
                    </h3>
                  </div>
                  <p className="text-[10px] sm:text-xs leading-relaxed" style={{ color: neonColors.textSecondary }}>
                    {analysisResult.rating_explanation}
                  </p>
                </div>
              )}

              {/* Metrics Cards */}
              {analysisResult.extracted_metrics && (
                <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3 sm:pt-4">
                  {analysisResult.extracted_metrics.win_rate && (
                    <div 
                      className="p-3 sm:p-4 rounded-xl border animate-fade-in"
                      style={{
                        background: neonColors.bgGlass,
                        borderColor: neonColors.borderDefault,
                        animation: 'fadeInUp 0.4s ease-out'
                      }}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: greenAccent.primary }} />
                        <span className="text-[9px] sm:text-[10px] font-medium uppercase" style={{ color: neonColors.textMuted }}>
                          Win Rate
                        </span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold" style={{ color: neonColors.textPrimary }}>
                        {(() => {
                          const winRate = analysisResult.performance_metrics?.win_rate 
                            || (typeof analysisResult.extracted_metrics.win_rate === 'number' 
                              ? analysisResult.extracted_metrics.win_rate 
                              : (typeof analysisResult.extracted_metrics.win_rate === 'string' && !isNaN(parseFloat(analysisResult.extracted_metrics.win_rate)))
                                ? parseFloat(analysisResult.extracted_metrics.win_rate)
                                : null);
                          
                          if (winRate !== null && typeof winRate === 'number') {
                            return `${winRate.toFixed(1)}%`;
                          }
                          const winRateStr = analysisResult.extracted_metrics.win_rate;
                          if (winRateStr && !winRateStr.includes('calculated from data') && !winRateStr.includes('Unable to calculate')) {
                            return winRateStr;
                          }
                          return 'N/A';
                        })()}
                      </div>
                    </div>
                  )}
                  
                  {analysisResult.risk_assessment?.risk_score && (
                    <div 
                      className="p-3 sm:p-4 rounded-xl border animate-fade-in"
                      style={{
                        background: neonColors.bgGlass,
                        borderColor: neonColors.borderDefault,
                        animation: 'fadeInUp 0.4s ease-out 0.1s both'
                      }}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: greenAccent.primary }} />
                        <span className="text-[9px] sm:text-[10px] font-medium uppercase" style={{ color: neonColors.textMuted }}>
                          Risk Score
                        </span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold" style={{ color: neonColors.textPrimary }}>
                        {(() => {
                          const riskScore = analysisResult.performance_metrics?.risk_score 
                            || (typeof analysisResult.risk_assessment?.risk_score === 'number' 
                              ? analysisResult.risk_assessment.risk_score 
                              : (typeof analysisResult.risk_assessment?.risk_score === 'string' && !isNaN(parseFloat(analysisResult.risk_assessment.risk_score)))
                                ? parseFloat(analysisResult.risk_assessment.risk_score)
                                : null);
                          
                          if (riskScore !== null && typeof riskScore === 'number') {
                            return `${riskScore}/10`;
                          }
                          const riskScoreStr = analysisResult.risk_assessment?.risk_score?.toString();
                          if (riskScoreStr && !riskScoreStr.includes('Assessment complete') && !riskScoreStr.includes('N/A')) {
                            return `${riskScoreStr}/10`;
                          }
                          return 'N/A';
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Strengths */}
              {analysisResult.strengths && analysisResult.strengths.length > 0 && (
                <div 
                  className="p-3 sm:p-4 rounded-xl border animate-fade-in"
                  style={{
                    background: `linear-gradient(135deg, ${greenAccent.primary}10 0%, ${greenAccent.dark}05 100%)`,
                    borderColor: greenAccent.border,
                    animation: 'fadeInUp 0.4s ease-out 0.2s both'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: greenAccent.primary }} />
                    <h3 className="text-xs sm:text-sm font-semibold" style={{ color: neonColors.textPrimary }}>
                      Strengths
                    </h3>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    {analysisResult.strengths.map((strength, index) => (
                      <div 
                        key={index} 
                        className="text-[10px] sm:text-xs animate-fade-in leading-relaxed"
                        style={{ 
                          color: neonColors.textSecondary,
                          animation: `fadeInUp 0.3s ease-out ${0.3 + index * 0.05}s both`
                        }}
                      >
                        • {strength}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvements */}
              {analysisResult.improvements && analysisResult.improvements.length > 0 && (
                <div 
                  className="p-3 sm:p-4 rounded-xl border animate-fade-in"
                  style={{
                    background: `linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)`,
                    borderColor: 'rgba(245, 158, 11, 0.2)',
                    animation: 'fadeInUp 0.4s ease-out 0.3s both'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#f59e0b' }} />
                    <h3 className="text-xs sm:text-sm font-semibold" style={{ color: neonColors.textPrimary }}>
                      Areas for Improvement
                    </h3>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    {analysisResult.improvements.map((improvement, index) => (
                      <div 
                        key={index} 
                        className="text-[10px] sm:text-xs animate-fade-in leading-relaxed"
                        style={{ 
                          color: neonColors.textSecondary,
                          animation: `fadeInUp 0.3s ease-out ${0.4 + index * 0.05}s both`
                        }}
                      >
                        • {improvement}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                <div 
                  className="p-3 sm:p-4 rounded-xl border animate-fade-in"
                  style={{
                    background: `linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)`,
                    borderColor: 'rgba(168, 85, 247, 0.2)',
                    animation: 'fadeInUp 0.4s ease-out 0.4s both'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#a855f7' }} />
                    <h3 className="text-xs sm:text-sm font-semibold" style={{ color: neonColors.textPrimary }}>
                      Recommendations
                    </h3>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    {analysisResult.recommendations.map((rec, index) => (
                      <div 
                        key={index} 
                        className="text-[10px] sm:text-xs animate-fade-in leading-relaxed"
                        style={{ 
                          color: neonColors.textSecondary,
                          animation: `fadeInUp 0.3s ease-out ${0.5 + index * 0.05}s both`
                        }}
                      >
                        • {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Insights */}
              {analysisResult.key_insights && analysisResult.key_insights.length > 0 && (
                <div 
                  className="p-3 sm:p-4 rounded-xl border animate-fade-in"
                  style={{
                    background: neonColors.bgGlass,
                    borderColor: neonColors.borderDefault,
                    animation: 'fadeInUp 0.4s ease-out 0.5s both'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: greenAccent.primary }} />
                    <h3 className="text-xs sm:text-sm font-semibold" style={{ color: neonColors.textPrimary }}>
                      Key Insights
                    </h3>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    {analysisResult.key_insights.map((insight, index) => (
                      <div 
                        key={index} 
                        className="text-[10px] sm:text-xs animate-fade-in leading-relaxed"
                        style={{ 
                          color: neonColors.textSecondary,
                          animation: `fadeInUp 0.3s ease-out ${0.6 + index * 0.05}s both`
                        }}
                      >
                        • {insight}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideUpModal {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes pulse-ring {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.1;
          }
        }
        @keyframes rotate-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse-symbol {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 40px ${greenAccent.glow}, inset 0 0 20px ${greenAccent.glow}40;
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 0 60px ${greenAccent.glow}, inset 0 0 30px ${greenAccent.glow}60;
          }
        }
        @keyframes brain-think {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          25% {
            transform: scale(1.05) rotate(-2deg);
            opacity: 0.9;
          }
          50% {
            transform: scale(1.1) rotate(0deg);
            opacity: 1;
          }
          75% {
            transform: scale(1.05) rotate(2deg);
            opacity: 0.9;
          }
        }
        .animate-fade-in {
          animation: fadeInUp 0.4s ease-out;
        }
      `}</style>
      
      {/* Export fileInputRef and galleryPhotos for external buttons */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFileUpload(e.target.files);
          }
        }}
        id="deconstructor-file-input"
      />
    </>
  );

  // Create context value AFTER panelContent is defined
  const contextValue: DeconstructorContextType = useMemo(() => ({
    fileInputRef,
    galleryPhotos,
    isAnalyzing,
    handleDeconstruct,
    panelContent,
  }), [galleryPhotos, isAnalyzing, handleDeconstruct, panelContent]);

  return (
    <DeconstructorContext.Provider value={contextValue}>
      {children ? children({ ...contextValue, panelContent }) : panelContent}
    </DeconstructorContext.Provider>
  );
};

// Export panel content as a separate component that uses context
// This component should be used within DeconstructorPanel's children render prop
export const DeconstructorPanelContent: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = true }) => {
  const context = useContext(DeconstructorContext);
  
  if (!context) {
    console.error('DeconstructorPanelContent must be used within DeconstructorPanel');
    return null;
  }

  // Render the panelContent from context
  return <>{context.panelContent}</>;
};

// Export buttons component to be rendered outside spotlight card
export const DeconstructorButtons: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = true }) => {
  const context = useContext(DeconstructorContext);
  if (!context) {
    console.warn('DeconstructorButtons: Context not available');
    return null;
  }
  
  const { fileInputRef, galleryPhotos, isAnalyzing, handleDeconstruct } = context;
  
  const greenAccent = {
    primary: neonColors.emerald,
    dark: neonColors.emeraldDark,
    glow: neonColors.emeraldGlow,
  };

  if (galleryPhotos.length > 0 || isAnalyzing) return null;

  const handleAddImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      console.warn('DeconstructorButtons: fileInputRef not available');
    }
  };

  const handleDeconstructClick = () => {
    if (galleryPhotos.length > 0) {
      handleDeconstruct(galleryPhotos[0]);
    }
  };

  return (
    <div className="w-full px-4 sm:px-5 md:px-6 space-y-3 shrink-0" style={{
      paddingTop: '0.75rem',
    }}>
      {/* ADD IMAGE Button */}
      <button
        onClick={handleAddImage}
        className="w-full py-3 rounded-xl font-medium text-sm transition-all touch-manipulation"
        style={{
          background: 'transparent',
          border: `2px solid ${greenAccent.primary}`,
          color: greenAccent.primary,
          boxShadow: `0 0 15px ${greenAccent.glow}40`,
          minHeight: '48px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        ADD IMAGE
      </button>
      
      {/* DECONSTRUCT Button */}
      <button
        onClick={handleDeconstructClick}
        disabled={galleryPhotos.length === 0}
        className="w-full py-4 rounded-xl font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        style={{
          background: `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)`,
          color: '#000',
          boxShadow: `0 0 25px ${greenAccent.glow}`,
          minHeight: '56px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        DECONSTRUCT
      </button>
    </div>
  );
};

// Wrapper component that provides context and renders both panel and buttons
export const DeconstructorWithButtons: React.FC<{ isDarkMode?: boolean; children?: (context: DeconstructorContextType) => React.ReactNode }> = ({ isDarkMode = true, children }) => {
  // This will be a wrapper that uses DeconstructorPanel's context
  // For now, we'll render DeconstructorPanel which provides the context
  return <DeconstructorPanel isDarkMode={isDarkMode} />;
};
