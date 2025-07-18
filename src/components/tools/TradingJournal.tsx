
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fetchedEntries = await TradeJournalEntry.list(user.id);
        setEntries(fetchedEntries);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error("Error loading journal entries:", error);
    }
    setIsLoading(false);
  }, []);

  const handleDelete = useCallback(async (entryId: string) => {
    try {
      await TradeJournalEntry.delete(entryId);
      loadEntries();
    } catch (error) {
      console.error("Error deleting entry:", error);
    }
  }, [loadEntries]);

  const handleSubmit = useCallback(async (data: {
    asset_ticker: string;
    pnl: string;
    notes: string;
    screenshotFile?: File;
  }) => {
    setIsSubmitting(true);

    try {
      let screenshot_url = "";
      if (data.screenshotFile) {
        const { file_url } = await UploadFile({ file: data.screenshotFile });
        screenshot_url = file_url;
      }

      const pnlValue = parseFloat(data.pnl);
      const tradeOutcome = pnlValue >= 0 ? "a winning trade" : "a losing trade";
      const aiPrompt = `
        You are a supportive trading coach. Analyze this ${tradeOutcome} of ${pnlValue} USD.
        User notes: "${data.notes}"
        
        Provide encouraging feedback (1-2 sentences) highlighting good practices or learning opportunities.
        Focus on process and discipline, not just results.
      `;

      const aiResult = await InvokeLLM({
        prompt: aiPrompt,
        file_urls: screenshot_url ? [screenshot_url] : [],
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await TradeJournalEntry.create(
          {
            ...data,
            pnl: pnlValue,
            trade_date: new Date().toISOString(),
            screenshot_url,
            ai_positive_feedback: aiResult,
          },
          user.id
        );
      }

      loadEntries();
    } catch (error) {
      console.error("Error submitting journal entry:", error);
      alert("Failed to save entry. Please try again.");
    }
    setIsSubmitting(false);
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
  const LogTab = useMemo(() => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <JournalFormCard onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      <JournalLogList 
        entries={entries} 
        isLoading={isLoading} 
        onDelete={handleDelete}
      />
    </motion.div>
  ), [handleSubmit, isSubmitting, entries, isLoading, handleDelete]);

  const AnalyticsTab = useMemo(() => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <JournalAnalytics entries={entries} />
    </motion.div>
  ), [entries]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-6xl mx-auto">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 bg-card">
            <TabsTrigger value="log" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Journal Log
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              AI Analytics
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="bg-gradient-to-r from-secondary via-primary to-accent bg-clip-text text-transparent font-semibold">
                Advanced Journal
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="mt-6">
            {LogTab}
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            {AnalyticsTab}
          </TabsContent>

          <TabsContent value="advanced" className="mt-6">
            <TradingJournalApp />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
