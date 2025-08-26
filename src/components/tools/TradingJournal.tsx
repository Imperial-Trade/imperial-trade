
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradeJournalEntry } from "@/api/entities";
import { supabase } from "@/integrations/supabase/client";
import { UploadFile } from "@/api/integrations";
import { Calendar, BarChart3, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import TradingJournalApp from "./TradingJournalApp";
import MobileTradingJournal from "./MobileTradingJournal";
import JournalFormCard from "../trading/JournalFormCard";
import JournalAnalytics from "../trading/JournalAnalytics";
import JournalLogList from "../trading/JournalLogList";
import { compressImage, validateImageFile } from "@/utils/imageCompression";
import { toast } from "sonner";


export default function TradingJournal() {
  const [entries, setEntries] = useState<TradeJournalEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("log");
  
  // Mobile detection
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const loadUserProfile = useCallback(async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data: profile
        } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profile) {
          setUserProfile(profile);
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  }, []);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const fetchedEntries = await TradeJournalEntry.list(user.id);
        setEntries(fetchedEntries);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error("Error loading educational journal entries:", error);
    }
    setIsLoading(false);
  }, []);

  // Get current user state
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  }, []);

  const handleDelete = useCallback(async (entryId: string) => {
    try {
      await TradeJournalEntry.delete(entryId);
      loadEntries();
    } catch (error) {
      console.error("Error deleting educational entry:", error);
    }
  }, [loadEntries]);

  const handleSubmit = useCallback(async (entryData: any) => {
    if (!user) return;
    
    setIsSubmitting(true);
    console.log('📝 Starting journal entry submission:', entryData);
    
    try {
      let imageUrls: string[] = [];
      
      // Handle image uploads if screenshots exist
      if (entryData.screenshotFiles && entryData.screenshotFiles.length > 0) {
        console.log('📤 Uploading screenshots:', entryData.screenshotFiles.length);
        
        const uploadPromises = entryData.screenshotFiles.map(async (file: File) => {
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
        
        imageUrls = await Promise.all(uploadPromises);
        console.log('✅ Images uploaded successfully:', imageUrls);
      }
      
      // Create journal entry with metadata
      const entryToInsert = {
        user_id: user?.id || '',
        asset_ticker: entryData.asset_ticker,
        pnl: parseFloat(entryData.pnl),
        notes: entryData.notes,
        trade_date: new Date().toISOString(),
        screenshot_urls: imageUrls.length > 0 ? imageUrls : null,
        created_at: new Date().toISOString(),
      };
      
      console.log('💾 Inserting journal entry:', entryToInsert);
      
      // Optimistically add entry to local state with uploaded images
      const optimisticEntry = {
        ...entryToInsert,
        id: `temp-${Date.now()}`, // Temporary ID
        ai_positive_feedback: null,
        ai_improvement_feedback: null
      };
      
      console.log('⚡ Adding optimistic entry to state:', optimisticEntry);
      setEntries(prev => [optimisticEntry, ...prev]);
      
      const { data: newEntry, error: insertError } = await supabase
        .from('trade_journal_entries')
        .insert(entryToInsert)
        .select()
        .single();
      
      if (insertError) {
        console.error('Insert error:', insertError);
        // Remove optimistic entry on error
        setEntries(prev => prev.filter(entry => entry.id !== optimisticEntry.id));
        throw new Error(`Failed to save journal entry: ${insertError.message}`);
      }
      
      console.log('✅ Journal entry created:', newEntry);
      
      // Replace optimistic entry with real entry
      setEntries(prev => prev.map(entry => 
        entry.id === optimisticEntry.id ? newEntry : entry
      ));
      
      // Trigger AI coaching analysis
      if (newEntry.id) {
        console.log('🤖 Triggering AI coaching analysis for entry:', newEntry.id);
        
        const { error: coachingError } = await supabase.functions.invoke('ai-coaching-analysis', {
          body: { 
            entryId: newEntry.id, 
            userId: user?.id || '',
            entryData: newEntry
          }
        });
        
        if (coachingError) {
          console.error('AI coaching analysis error:', coachingError);
          // Don't throw error here as the entry was saved successfully
        } else {
          console.log('✅ AI coaching analysis triggered successfully');
        }
      }
      
      toast.success('Journal entry saved successfully!');
      
    } catch (error) {
      console.error('Error saving journal entry:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save journal entry'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [loadEntries]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);
  
  useEffect(() => {
    if (userProfile) {
      loadEntries();
    }
  }, [userProfile, loadEntries]);

  // Set up realtime subscription for trade journal entries
  useEffect(() => {
    if (!userProfile) return;

    console.log('🔄 Setting up realtime subscription for trade_journal_entries');
    
    const channel = supabase
      .channel('trade-journal-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'trade_journal_entries',
          filter: `user_id=eq.${userProfile.id}`
        },
        (payload) => {
          console.log('🔔 Realtime update received:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newEntry = payload.new as any;
            console.log('➕ New entry via realtime:', newEntry);
            setEntries(prev => {
              // Check if entry already exists (avoid duplicates from optimistic updates)
              const exists = prev.some(entry => entry.id === newEntry.id);
              if (exists) {
                return prev.map(entry => entry.id === newEntry.id ? newEntry : entry);
              }
              return [newEntry, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedEntry = payload.new as any;
            console.log('📝 Updated entry via realtime:', updatedEntry);
            setEntries(prev => prev.map(entry => 
              entry.id === updatedEntry.id ? updatedEntry : entry
            ));
          } else if (payload.eventType === 'DELETE') {
            const deletedEntry = payload.old as any;
            console.log('🗑️ Deleted entry via realtime:', deletedEntry);
            setEntries(prev => prev.filter(entry => entry.id !== deletedEntry.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Realtime subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [userProfile]);

  const LogTab = useMemo(() => 
    <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="space-y-6">
      
      <JournalFormCard onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      <JournalLogList entries={entries} isLoading={isLoading} onDelete={handleDelete} />
    </motion.div>, [handleSubmit, isSubmitting, entries, isLoading, handleDelete]);
  
  const AnalyticsTab = useMemo(() => 
    <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="space-y-6">
      
      <JournalAnalytics entries={entries} />
    </motion.div>, [entries]);

  // Mobile/Tablet optimized view
  if (isMobile || isTablet) {
    return (
      <MobileTradingJournal
        entries={entries}
        isSubmitting={isSubmitting}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        userProfile={userProfile}
      />
    );
  }

  // Desktop view
  return <div className={`min-h-screen p-2 sm:p-4 lg:p-6 transition-all duration-700 ${activeTab === 'advanced' ? 'bg-transparent' : 'bg-gradient-to-br from-background via-background to-muted/20'}`}>
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
    </div>;
}
