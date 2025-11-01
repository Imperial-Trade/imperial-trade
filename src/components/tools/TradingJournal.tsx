import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Calendar, BarChart3, Sparkles } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TradeJournalEntry } from '@/api/entities';
import { compressImage } from '@/utils/imageUtils';
import JournalFormCard from '@/components/trading/JournalFormCard';
import JournalLogList from '@/components/trading/JournalLogList';
import JournalAnalytics from '@/components/trading/JournalAnalytics';
import { TradingJournalApp } from '@/components/tools/TradingJournalApp';
import MobileTradingJournal from '@/components/tools/MobileTradingJournal';
import { useTradeJournal } from '@/contexts/TradeJournalContext';
import { parseNumStrict, isNonEmpty } from '@/lib/utils';
import { TRADE_TYPES, coerceTradeType } from '@/constants/trading';
import { normalizeTradeDate, mapDbRowToEntry } from '@/features/trade-journal/normalizers';

const TradingJournal: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('log');
  
  // Use shared journal context
  const { entries, isLoading, addOptimisticEntry, updateOptimisticEntry, removeOptimisticEntry } = useTradeJournal();
  
  // Mobile detection
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Listen for journal tab change events from hamburger menu
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const { tab } = event.detail;
      // Map hamburger menu items to journal tabs
      const tabMap: Record<string, string> = {
        'overview': 'log',
        'analytics': 'analytics',
        'calendar': 'log',
        'ai': 'advanced',
        'history': 'log'
      };
      const mappedTab = tabMap[tab] || 'log';
      setActiveTab(mappedTab);
    };

    window.addEventListener('journal-tab-change', handleTabChange as EventListener);
    return () => {
      window.removeEventListener('journal-tab-change', handleTabChange as EventListener);
    };
  }, []);

  const loadUserProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserProfile(profile);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }, []);

  const handleDelete = useCallback(async (entryId: string) => {
    try {
      await TradeJournalEntry.delete(entryId);
      toast({
        title: 'Success',
        description: 'Journal entry deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete journal entry',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleSubmit = useCallback(async (data: any) => {
    if (!user) return;
    
    setIsSubmitting(true);
    console.log('📝 Starting journal entry submission:', data);
    
    // Generate temporary ID for optimistic updates
    const tempId = `temp-${Date.now()}`;
    
    try {
      // STRICT VALIDATION: Required P&L
      const pnl = parseNumStrict(data.pnl);
      if (pnl === null) {
        toast({
          title: 'Validation Error',
          description: 'P&L is required and must be a valid number',
          variant: 'destructive',
        });
        return;
      }

      // STRICT VALIDATION: Optional numeric fields (only validate if non-empty)
      const invalidFields: string[] = [];
      const entry_price = isNonEmpty(data.entry) ? parseNumStrict(data.entry) : null;
      const exit_price = isNonEmpty(data.exit) ? parseNumStrict(data.exit) : null;
      const position_size = isNonEmpty(data.size) ? parseNumStrict(data.size) : null;

      if (isNonEmpty(data.entry) && entry_price === null) invalidFields.push('Entry Price');
      if (isNonEmpty(data.exit) && exit_price === null) invalidFields.push('Exit Price');
      if (isNonEmpty(data.size) && position_size === null) invalidFields.push('Position Size');

      if (invalidFields.length > 0) {
        toast({
          title: 'Validation Error',
          description: `Invalid numeric values: ${invalidFields.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }

      // NORMALIZE trade_type and trade_date
      const trade_type = coerceTradeType(data.tradeType) || TRADE_TYPES[0]; // Default to 'Long'
      const trade_date = normalizeTradeDate(data.date || new Date());

      let screenshotUrls: string[] = [];
      
      // Handle image uploads if screenshots exist
      if (data.screenshotFiles && data.screenshotFiles.length > 0) {
        console.log('📤 Uploading screenshots:', data.screenshotFiles.length);
        
        const uploadPromises = data.screenshotFiles.map(async (file: File) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;
          
          // Compress image before upload
          const compressedFile = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.8
          });
          
          const { error: uploadError } = await supabase.storage
            .from('journal-charts')
            .upload(fileName, compressedFile);
          
          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload image: ${uploadError.message}`);
          }
          
          return fileName;
        });
        
        screenshotUrls = await Promise.all(uploadPromises);
        console.log('✅ Images uploaded successfully:', screenshotUrls);
      }

      // Create optimistic entry with validated, normalized data
      const optimisticEntry = {
        id: tempId,
        user_id: user.id,
        asset_ticker: data.asset_ticker || '',
        trade_type,
        pnl,
        entry_price,
        exit_price,
        position_size,
        trade_date,
        notes: data.notes || undefined,
        screenshot_url: undefined,
        screenshot_urls: screenshotUrls,
        ai_positive_feedback: undefined,
        coach_status: 'pending' as 'pending' | 'ready',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('✨ Adding optimistic entry via shared context:', optimisticEntry);
      addOptimisticEntry(optimisticEntry);

      // Create journal entry in database with validated, normalized data
      const entryToInsert = {
        user_id: user.id,
        asset_ticker: data.asset_ticker || '',
        trade_type,
        pnl,
        entry_price,
        exit_price,
        position_size,
        trade_date,
        notes: data.notes || null,
        screenshot_urls: screenshotUrls.length > 0 ? screenshotUrls : null,
      };

      console.log('💾 Inserting journal entry:', entryToInsert);
      
      const { data: newEntry, error: insertError } = await supabase
        .from('trade_journal_entries')
        .insert(entryToInsert)
        .select()
        .single();
      
      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Failed to save journal entry: ${insertError.message}`);
      }
      
      console.log('✅ Journal entry created:', newEntry);
      
      // Reconcile optimistic entry with real DB row using normalizer
      console.log('🔄 Updating optimistic entry with real DB data:', tempId, '->', newEntry.id);
      updateOptimisticEntry(tempId, mapDbRowToEntry(newEntry));
      
      // Trigger AI coaching analysis
      if (newEntry.id) {
        console.log('🤖 Triggering AI coaching analysis for entry:', newEntry.id);
        
        const { error: coachingError } = await supabase.functions.invoke('coach-agent', {
          body: { 
            event_type: "LOG_TRADE",
            user_id: user.id,
            journal_entry_id: newEntry.id
          }
        });
        
        if (coachingError) {
          console.error('AI coaching analysis error:', coachingError);
          // Don't throw error here as the entry was saved successfully
        } else {
          console.log('✅ AI coaching analysis triggered successfully');
        }
      }
      
      toast({
        title: 'Success',
        description: 'Journal entry saved successfully!',
      });
      
    } catch (error) {
      console.error('Error saving journal entry:', error);
      
      // Remove optimistic entry on error
      console.log('❌ Removing optimistic entry due to error:', tempId);
      removeOptimisticEntry(tempId);
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save journal entry',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, toast, addOptimisticEntry, updateOptimisticEntry, removeOptimisticEntry]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const LogTab = useMemo(() => 
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      <JournalFormCard onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      <JournalLogList entries={entries as any} isLoading={isLoading} onDelete={handleDelete} />
    </motion.div>, 
    [handleSubmit, isSubmitting, entries, isLoading, handleDelete]
  );
  
  const AnalyticsTab = useMemo(() => 
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      <JournalAnalytics entries={entries as any} />
    </motion.div>, 
    [entries]
  );

  // Mobile/Tablet optimized view
  if (isMobile || isTablet) {
    return (
      <MobileTradingJournal
        entries={entries as any}
        isSubmitting={isSubmitting}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        userProfile={userProfile}
      />
    );
  }

  // Desktop view
  return (
    <div className={`min-h-screen p-2 sm:p-4 lg:p-6 transition-all duration-700 ${activeTab === 'advanced' ? 'bg-transparent' : 'bg-gradient-to-br from-background via-background to-muted/20'}`}>
      <div className={`mx-auto transition-all duration-500 ${activeTab === 'advanced' ? 'max-w-full px-2 sm:px-4' : 'max-w-6xl'}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-6">
          <TabsList className={`grid w-full grid-cols-3 transition-all duration-500 ${activeTab === 'advanced' ? 'bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl' : 'bg-card'}`}>
            <TabsTrigger value="log" className={`flex items-center gap-1 sm:gap-2 transition-all duration-300 text-xs sm:text-sm min-h-[44px] ${activeTab === 'advanced' ? 'text-white/80 hover:text-white hover:bg-white/10 data-[state=active]:bg-white/20 data-[state=active]:text-white' : ''}`}>
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Educational</span> Log
            </TabsTrigger>
            <TabsTrigger value="analytics" className={`flex items-center gap-1 sm:gap-2 transition-all duration-300 text-xs sm:text-sm min-h-[44px] ${activeTab === 'advanced' ? 'text-white/80 hover:text-white hover:bg-white/10 data-[state=active]:bg-white/20 data-[state=active]:text-white' : ''}`}>
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Educational</span> Analytics
            </TabsTrigger>
            <TabsTrigger value="advanced" className={`flex items-center gap-1 sm:gap-2 transition-all duration-300 text-xs sm:text-sm min-h-[44px] ${activeTab === 'advanced' ? 'text-white hover:text-white hover:bg-white/10 data-[state=active]:bg-gradient-to-r data-[state=active]:from-white/30 data-[state=active]:to-white/20 data-[state=active]:text-white data-[state=active]:shadow-lg' : ''}`}>
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className={`font-semibold truncate ${activeTab === 'advanced' ? 'text-white' : 'bg-gradient-to-r from-secondary via-primary to-accent bg-clip-text text-transparent'}`}>
                <span className="hidden sm:inline">Advanced Educational</span> Journal
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="mt-6 relative z-10">
            <div className={activeTab === 'advanced' ? 'bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-2xl' : ''}>
              {LogTab}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6 relative z-10">
            <div className={activeTab === 'advanced' ? 'bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-2xl' : ''}>
              {AnalyticsTab}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="mt-6 relative z-10">
            <div className="p-6 focus:outline-none focus:border-transparent focus:ring-0 active:border-transparent bg-transparent rounded-sm">
              <TradingJournalApp />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TradingJournal;