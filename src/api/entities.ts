import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  updated_at?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
  email?: string;
  display_name?: string;
  trader_level?: string;
}

export class TradeJournalEntry {
  constructor(
    public id: string,
    public user_id: string,
    public asset_ticker: string,
    public pnl: number,
    public notes?: string,
    public trade_date?: string,
    public ai_positive_feedback?: string,
    public screenshot_url?: string,
    public trade_type?: "Long" | "Short",
    public entry_price?: number,
    public exit_price?: number,
    public position_size?: number,
    public created_at?: string,
    public updated_at?: string
  ) {}

  static async create(
    data: {
      asset_ticker: string;
      pnl: number;
      notes?: string;
      trade_date: string;
      screenshot_url?: string;
      ai_positive_feedback?: string;
      trade_type?: "Long" | "Short";
      entry_price?: number;
      exit_price?: number;
      position_size?: number;
    },
    user_id: string
  ): Promise<TradeJournalEntry> {
    const { data: result, error } = await supabase
      .from("trade_journal_entries")
      .insert([{
        user_id,
        asset_ticker: data.asset_ticker,
        pnl: data.pnl,
        notes: data.notes,
        trade_date: data.trade_date,
        screenshot_url: data.screenshot_url,
        ai_positive_feedback: data.ai_positive_feedback,
        trade_type: data.trade_type,
        entry_price: data.entry_price,
        exit_price: data.exit_price,
        position_size: data.position_size
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating trade journal entry:", error);
      throw new Error(`Failed to create trade journal entry: ${error.message}`);
    }

    return new TradeJournalEntry(
      result.id,
      result.user_id,
      result.asset_ticker,
      result.pnl,
      result.notes,
      result.trade_date,
      result.ai_positive_feedback,
      result.screenshot_url,
      result.trade_type,
      result.entry_price,
      result.exit_price,
      result.position_size,
      result.created_at,
      result.updated_at
    );
  }

  static async update(
    id: string,
    data: {
      asset_ticker?: string;
      pnl?: number;
      notes?: string;
      trade_date?: string;
      screenshot_url?: string;
      ai_positive_feedback?: string;
      trade_type?: "Long" | "Short";
      entry_price?: number;
      exit_price?: number;
      position_size?: number;
    }
  ): Promise<TradeJournalEntry> {
    const { data: result, error } = await supabase
      .from("trade_journal_entries")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating trade journal entry:", error);
      throw new Error(`Failed to update trade journal entry: ${error.message}`);
    }

    return new TradeJournalEntry(
      result.id,
      result.user_id,
      result.asset_ticker,
      result.pnl,
      result.notes,
      result.trade_date,
      result.ai_positive_feedback,
      result.screenshot_url,
      result.trade_type,
      result.entry_price,
      result.exit_price,
      result.position_size,
      result.created_at,
      result.updated_at
    );
  }

  static async list(user_id: string): Promise<TradeJournalEntry[]> {
    const { data, error } = await supabase
      .from("trade_journal_entries")
      .select("*")
      .eq("user_id", user_id)
      .order("trade_date", { ascending: false });

    if (error) {
      console.error("Error fetching trade journal entries:", error);
      throw new Error(`Failed to fetch trade journal entries: ${error.message}`);
    }

    return data.map(
      (entry) =>
        new TradeJournalEntry(
          entry.id,
          entry.user_id,
          entry.asset_ticker,
          entry.pnl,
          entry.notes,
          entry.trade_date,
          entry.ai_positive_feedback,
          entry.screenshot_url,
          entry.trade_type,
          entry.entry_price,
          entry.exit_price,
          entry.position_size,
          entry.created_at,
          entry.updated_at
        )
    );
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("trade_journal_entries")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting trade journal entry:", error);
      throw new Error(`Failed to delete trade journal entry: ${error.message}`);
    }
  }
}

export class EducationalModule {
  constructor(
    public id: string,
    public user_id: string,
    public module_name: string,
    public completed: boolean,
    public created_at?: string,
    public updated_at?: string
  ) {}

  static async list(user_id: string): Promise<EducationalModule[]> {
    const { data, error } = await supabase
      .from("educational_modules")
      .select("*")
      .eq("user_id", user_id);

    if (error) {
      console.error("Error fetching educational modules:", error);
      throw new Error(`Failed to fetch educational modules: ${error.message}`);
    }

    return data.map(
      (module) =>
        new EducationalModule(
          module.id,
          module.user_id,
          module.module_name,
          module.completed,
          module.created_at,
          module.updated_at
        )
    );
  }

  static async create(
    data: {
      module_name: string;
      completed: boolean;
    },
    user_id: string
  ): Promise<EducationalModule> {
    const { data: result, error } = await supabase
      .from("educational_modules")
      .insert([{ user_id, module_name: data.module_name, completed: data.completed }])
      .select()
      .single();

    if (error) {
      console.error("Error creating educational module:", error);
      throw new Error(`Failed to create educational module: ${error.message}`);
    }

    return new EducationalModule(
      result.id,
      result.user_id,
      result.module_name,
      result.completed,
      result.created_at,
      result.updated_at
    );
  }

  static async update(
    id: string,
    data: {
      module_name?: string;
      completed?: boolean;
    }
  ): Promise<EducationalModule> {
    const { data: result, error } = await supabase
      .from("educational_modules")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating educational module:", error);
      throw new Error(`Failed to update educational module: ${error.message}`);
    }

    return new EducationalModule(
      result.id,
      result.user_id,
      result.module_name,
      result.completed,
      result.created_at,
      result.updated_at
    );
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("educational_modules")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting educational module:", error);
      throw new Error(`Failed to delete educational module: ${error.message}`);
    }
  }
}
