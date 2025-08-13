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
      .insert([
        {
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
          position_size: data.position_size,
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error("Error creating trade journal entry:", error);
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
    logger.log("TradeJournalEntry.update - Starting update for ID:", id);
    logger.log("TradeJournalEntry.update - Data to update:", data);

    try {
      // Check authentication first
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      logger.log("TradeJournalEntry.update - Current user:", user?.id);

      if (authError) {
        logger.error("TradeJournalEntry.update - Auth error:", authError);
        throw new Error(`Authentication error: ${authError.message}`);
      }

      if (!user) {
        logger.error("TradeJournalEntry.update - No authenticated user");
        throw new Error("No authenticated user found");
      }

      // Check if the entry exists and belongs to the user
      const { data: existingEntry, error: fetchError } = await supabase
        .from("trade_journal_entries")
        .select("id, user_id")
        .eq("id", id)
        .single();

      if (fetchError) {
        logger.error(
          "TradeJournalEntry.update - Error fetching existing entry:",
          fetchError
        );
        throw new Error(
          `Failed to fetch existing entry: ${fetchError.message}`
        );
      }

      if (!existingEntry) {
        logger.error("TradeJournalEntry.update - Entry not found with ID:", id);
        throw new Error("Journal entry not found");
      }

      if (existingEntry.user_id !== user.id) {
        logger.error(
          "TradeJournalEntry.update - User mismatch. Entry user:",
          existingEntry.user_id,
          "Current user:",
          user.id
        );
        throw new Error("Unauthorized: Entry belongs to different user");
      }

      logger.log("TradeJournalEntry.update - Performing update...");

      // Perform the update
      const { data: result, error } = await supabase
        .from("trade_journal_entries")
        .update(data)
        .eq("id", id)
        .eq("user_id", user.id) // Extra security check
        .select()
        .single();

      if (error) {
        logger.error("TradeJournalEntry.update - Update error:", error);
        logger.error("TradeJournalEntry.update - Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(
          `Failed to update trade journal entry: ${error.message}`
        );
      }

      if (!result) {
        logger.error(
          "TradeJournalEntry.update - No result returned from update"
        );
        throw new Error("Update operation completed but no data returned");
      }

      logger.log("TradeJournalEntry.update - Update successful:", result);

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
    } catch (error) {
      logger.error("TradeJournalEntry.update - Caught error:", error);
      throw error;
    }
  }

  static async list(user_id: string): Promise<TradeJournalEntry[]> {
    const { data, error } = await supabase
      .from("trade_journal_entries")
      .select("*")
      .eq("user_id", user_id)
      .order("trade_date", { ascending: false });

    if (error) {
      logger.error("Error fetching trade journal entries:", error);
      throw new Error(
        `Failed to fetch trade journal entries: ${error.message}`
      );
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
      logger.error("Error deleting trade journal entry:", error);
      throw new Error(`Failed to delete trade journal entry: ${error.message}`);
    }
  }
}

export class User {
  constructor(
    public id: string,
    public email: string,
    public full_name?: string
  ) {}

  static async me(): Promise<User | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("real_name")
      .eq("id", user.id)
      .single();

    return new User(user.id, user.email || "", profile?.real_name);
  }
}

export class AccountRequest {
  constructor(
    public id: string,
    public full_name: string,
    public email: string,
    public account_type: string,
    public status: string,
    public created_at?: string,
    public updated_at?: string,
    public reason?: string,
    public rejection_reason?: string,
    public resubmission_count?: number
  ) {}

  static async list(): Promise<AccountRequest[]> {
    const { data, error } = await supabase
      .from("account_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch account requests: ${error.message}`);
    }

    return data.map(
      (req) =>
        new AccountRequest(
          req.id,
          req.full_name,
          req.email,
          req.account_type,
          req.status,
          req.created_at,
          req.updated_at,
          req.reason,
          req.rejection_reason,
          req.resubmission_count
        )
    );
  }
}

export class AuditLog {
  constructor(
    public id: string,
    public admin_email: string,
    public action: string,
    public target_entity: string,
    public target_id: string,
    public details?: any,
    public created_at?: string
  ) {}

  static async create(data: {
    admin_email: string;
    action: string;
    target_entity: string;
    target_id: string;
    details?: any;
  }): Promise<AuditLog> {
    const { data: result, error } = await supabase
      .from("audit_logs")
      .insert([data])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create audit log: ${error.message}`);
    }

    return new AuditLog(
      result.id,
      result.admin_email,
      result.action,
      result.target_entity,
      result.target_id,
      result.details,
      result.created_at
    );
  }
}

export class AthenaInteraction {
  constructor(
    public id: string,
    public user_id: string,
    public user_email: string,
    public prompt: string,
    public response: string,
    public context?: string,
    public feedback_score?: number,
    public interaction_time?: string,
    public created_at?: string,
    public updated_at?: string
  ) {}

  static async create(data: {
    user_id: string;
    user_email: string;
    prompt: string;
    response: string;
    context?: string;
    feedback_score?: number;
  }): Promise<AthenaInteraction> {
    const { data: result, error } = await supabase
      .from("athena_interactions")
      .insert([
        {
          ...data,
          interaction_time: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create Athena interaction: ${error.message}`);
    }

    return new AthenaInteraction(
      result.id,
      result.user_id,
      result.user_email,
      result.prompt,
      result.response,
      result.context,
      result.feedback_score,
      result.interaction_time,
      result.created_at,
      result.updated_at
    );
  }
}
