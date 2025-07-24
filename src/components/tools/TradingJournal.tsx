
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradeJournalEntry } from "@/api/entities";
import { supabase } from "@/integrations/supabase/client";
import { UploadFile } from "@/api/integrations";
import { Calendar, BarChart3, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import TradingJournalApp from "./TradingJournalApp";
import JournalFormCard from "../trading/JournalFormCard";
import JournalAnalytics from "../trading/JournalAnalytics";
import JournalLogList from "../trading/JournalLogList";
import { compressImage, validateImageFile } from "@/utils/imageCompression";
import { toast } from "sonner";
import { ComplianceNotice, EducationalBadge } from "@/components/compliance/ComplianceNotice";

export default function TradingJournal() {
  const [entries, setEntries] = useState<TradeJournalEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("log");

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

      console.log("TradingJournal.handleSubmit - User authenticated:", user.id);

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

      // Save the educational entry first (this should always work)
      console.log("TradingJournal.handleSubmit - Creating journal entry with data:", educationalData);
      const createdEntry = await TradeJournalEntry.create(educationalData, user.id);
      console.log("TradingJournal.handleSubmit - Created journal entry:", createdEntry);
      toast.success("Educational entry saved successfully!");

      // Enhanced educational coaching analysis using coach-agent
      try {
        toast.info("Getting personalized educational coaching feedback...");
        
        console.log("TradingJournal.handleSubmit - Invoking coach-agent with payload:", {
          event_type: "LOG_TRADE",
          user_id: user.id,
          journal_entry_id: createdEntry.id
        });

        const { data: coachResponse, error: coachError } = await supabase.functions.invoke('coach-agent', {
          body: {
            event_type: "LOG_TRADE",
            user_id: user.id,
            journal_entry_id: createdEntry.id
          }
        });

        console.log("TradingJournal.handleSubmit - Coach-agent response:", coachResponse);
        console.log("TradingJournal.handleSubmit - Coach-agent error:", coachError);

        if (coachError) {
          console.error("TradingJournal.handleSubmit - Coach agent error:", coachError);
          toast.error("Educational coaching failed, but entry was saved");
        } else if (coachResponse && coachResponse.reply) {
          console.log("TradingJournal.handleSubmit - Coach feedback generated successfully");
          
          if (coachResponse.warning) {
            toast.warning(coachResponse.warning);
          } else {
            toast.success("Personalized educational coaching feedback generated!");
          }
        } else {
          console.warn("TradingJournal.handleSubmit - Coach response does not contain expected reply field:", coachResponse);
          toast.warning("Coaching feedback format unexpected, but entry was saved");
        }
      } catch (aiError) {
        console.error("TradingJournal.handleSubmit - Educational coaching analysis failed:", aiError);
        console.error("TradingJournal.handleSubmit - AI error details:", {
          name: aiError.name,
          message: aiError.message,
          stack: aiError.stack
        });
        toast.error("Educational coaching failed, but entry was saved");
        // Continue - don't block since the educational entry is already saved
      }

      // Reload entries to show the updated data (including AI feedback if successful)
      console.log("TradingJournal.handleSubmit - Reloading entries...");
      loadEntries();

    } catch (error) {
      console.error("TradingJournal.handleSubmit - Error submitting educational journal entry:", error);
      console.error("TradingJournal.handleSubmit - Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      toast.error("Failed to save educational entry. Please try again.");
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
