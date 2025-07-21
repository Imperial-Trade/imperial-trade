
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradeJournalEntry } from "@/api/entities";
import { supabase } from "@/integrations/supabase/client";
import { UploadFile, InvokeLLM } from "@/api/integrations";
import { Calendar, BarChart3, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import TradingJournalApp from "./TradingJournalApp";
import JournalFormCard from "../trading/JournalFormCard";
import JournalAnalytics from "../trading/JournalAnalytics";
import JournalLogList from "../trading/JournalLogList";
import { compressImage, validateImageFile } from "@/utils/imageCompression";
import { toast } from "sonner";
import { ComplianceNotice, EducationalBadge } from "@/components/compliance/ComplianceNotice";

interface JournalEntry {
  id: string;
  asset_ticker: string;
  pnl: number;
  notes?: string;
  trade_date: string;
  ai_positive_feedback?: string;
  screenshot_url?: string;
}

export default function TradingJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("log");

  // Memoize stable functions
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

  const handleDelete = useCallback(async (entryId: string) => {
    try {
      await TradeJournalEntry.delete(entryId);
      loadEntries();
    } catch (error) {
      console.error("Error deleting educational entry:", error);
    }
  }, [loadEntries]);

  const handleSubmit = useCallback(async (data: {
    asset_ticker: string;
    pnl: string;
    notes: string;
    screenshotFile?: File;
  }) => {
    setIsSubmitting(true);
    
    // Core educational data - this will always be saved
    const pnlValue = parseFloat(data.pnl);
    const educationalData = {
      asset_ticker: data.asset_ticker,
      pnl: pnlValue,
      notes: data.notes,
      trade_date: new Date().toISOString(),
      screenshot_url: "",
      ai_positive_feedback: ""
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to save your educational entry");
        return;
      }

      // Optional: Handle screenshot upload with compression
      if (data.screenshotFile) {
        try {
          const validationError = validateImageFile(data.screenshotFile);
          if (validationError) {
            toast.error(validationError);
            // Continue without screenshot - don't block the educational entry save
          } else {
            toast.info("Compressing educational image...");
            const compressedFile = await compressImage(data.screenshotFile, {
              maxWidth: 1920,
              maxHeight: 1080,
              quality: 0.8,
              maxFileSize: 2 * 1024 * 1024 // 2MB
            });
            
            toast.info("Uploading educational screenshot...");
            const { file_url } = await UploadFile({ file: compressedFile });
            educationalData.screenshot_url = file_url;
            toast.success("Educational screenshot uploaded successfully");
          }
        } catch (uploadError) {
          console.error("Educational screenshot upload failed:", uploadError);
          toast.error("Educational screenshot upload failed, but entry will still be saved");
          // Continue without screenshot - don't block the educational entry save
        }
      }

      // Enhanced educational coaching analysis
      try {
        const setupOutcome = pnlValue >= 0 ? "educational positive" : "learning opportunity";
        const educationalCoachingPrompt = `
          EDUCATIONAL ENTRY LOGGED: ${data.asset_ticker} with learning result of $${pnlValue}
          
          EDUCATIONAL DETAILS:
          - Asset: ${data.asset_ticker}
          - Learning Result: $${pnlValue} (${setupOutcome} example)
          - Educational Notes: "${data.notes}"
          - Educational Screenshot: ${educationalData.screenshot_url ? "Provided" : "Not provided"}
          
          Please provide comprehensive educational coaching feedback following the 5-part learning structure:
          1. Celebrate the effort to log this educational entry
          2. Recognize any learning patterns, consistency, or educational milestones
          3. Provide constructive educational insights about the setup analysis
          4. Reinforce their developing educational trader identity
          5. Encourage continued learning growth and consistency in education
          
          Focus on educational value, learning opportunities, and skill development.
        `;
        
        toast.info("Getting personalized educational coaching feedback...");
        const aiResult = await InvokeLLM({
          prompt: educationalCoachingPrompt,
          file_urls: educationalData.screenshot_url ? [educationalData.screenshot_url] : [],
          user_id: user.id // Pass user_id for enhanced educational coaching context
        });
        educationalData.ai_positive_feedback = aiResult;
        toast.success("Personalized educational coaching feedback generated!");
      } catch (aiError) {
        console.error("Educational coaching analysis failed:", aiError);
        toast.error("Educational coaching failed, but entry will still be saved");
        // Continue without AI feedback - don't block the educational entry save
      }

      // Save the educational entry (this should always work)
      await TradeJournalEntry.create(educationalData, user.id);
      toast.success("Educational entry saved successfully!");
      loadEntries();

    } catch (error) {
      console.error("Error submitting educational journal entry:", error);
      toast.error("Failed to save educational entry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [loadEntries]);

  // Effects
  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);
  
  useEffect(() => {
    if (userProfile) {
      loadEntries();
    }
  }, [userProfile, loadEntries]);

  // Memoized tab content components
  const LogTab = useMemo(() => 
    <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="space-y-6">
      <ComplianceNotice type="educational" size="sm" />
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
      <ComplianceNotice type="hypothetical" size="sm" />
      <JournalAnalytics entries={entries} />
    </motion.div>, [entries]);

  return <div className={`min-h-screen p-6 transition-all duration-700 ${activeTab === 'advanced' ? 'bg-transparent' : 'bg-gradient-to-br from-background via-background to-muted/20'}`}>
      <div className={`mx-auto transition-all duration-500 ${activeTab === 'advanced' ? 'max-w-full px-4' : 'max-w-6xl'}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full grid-cols-3 transition-all duration-500 ${activeTab === 'advanced' ? 'bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl' : 'bg-card'}`}>
            <TabsTrigger value="log" className={`flex items-center gap-2 transition-all duration-300 ${activeTab === 'advanced' ? 'text-white/80 hover:text-white hover:bg-white/10 data-[state=active]:bg-white/20 data-[state=active]:text-white' : ''}`}>
              <Calendar className="w-4 h-4" />
              Educational Log
            </TabsTrigger>
            <TabsTrigger value="analytics" className={`flex items-center gap-2 transition-all duration-300 ${activeTab === 'advanced' ? 'text-white/80 hover:text-white hover:bg-white/10 data-[state=active]:bg-white/20 data-[state=active]:text-white' : ''}`}>
              <BarChart3 className="w-4 h-4" />
              Educational Analytics
            </TabsTrigger>
            <TabsTrigger value="advanced" className={`flex items-center gap-2 transition-all duration-300 ${activeTab === 'advanced' ? 'text-white hover:text-white hover:bg-white/10 data-[state=active]:bg-gradient-to-r data-[state=active]:from-white/30 data-[state=active]:to-white/20 data-[state=active]:text-white data-[state=active]:shadow-lg' : ''}`}>
              <Sparkles className="w-4 h-4" />
              <span className={`font-semibold ${activeTab === 'advanced' ? 'text-white' : 'bg-gradient-to-r from-secondary via-primary to-accent bg-clip-text text-transparent'}`}>
                Advanced Educational Journal
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
