import { supabase } from "@/integrations/supabase/client";
import { ApiResponse } from "@/types/common";
import { serverRateLimitService } from "@/services/ServerRateLimitService";
import { LEGAL_VERSION } from "@/lib/constants/legal";

export interface AccountRequestData {
  id?: string;
  email: string;
  full_name: string;
  phone_number?: string;
  vt_market_account_number?: string;
  referrer?: string;
  account_type: "user" | "educator" | "admin"; // Include admin to match database
  reason?: string;
  status?: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  original_rejection_reason?: string;
  resubmission_count?: number;
  last_resubmitted_at?: string;
  created_at?: string;
  updated_at?: string;
  website?: string; // Honeypot field
}

export interface AccountRequestAudit {
  id: string;
  account_request_id: string;
  changed_fields?: any;
  old_values?: any;
  new_values?: any;
  changed_by: string;
  change_type: string; // Use string instead of strict union to match database
  notes?: string;
  created_at: string;
}

export class AccountRequest {
  static async create(data: AccountRequestData): Promise<AccountRequestData> {
    logger.log("🚀 Creating account request:", data);

    const normalizedEmail = data.email.toLowerCase().trim();

    // Best-effort duplicate check (validation only - no rate limiting)
    try {
      const existingRequest = await this.getByEmail(normalizedEmail);
      if (existingRequest) {
        throw new Error(
          "An account request with this email already exists. Please click the 'Check Request Status' button below to view or update your request."
        );
      }
    } catch (e) {
      logger.warn("getByEmail pre-check failed, proceeding with insert:", e);
    }

    // Check server-side rate limiting ONLY before actual submission
    const rateLimitCheck = await serverRateLimitService.checkEmailRateLimit(
      normalizedEmail
    );
    if (!rateLimitCheck.allowed) {
      const retryAfterHours = Math.ceil(
        (new Date(rateLimitCheck.resetTime).getTime() - Date.now()) /
          (1000 * 60 * 60)
      );
      throw new Error(
        `You've reached the limit of 3 account requests per day. Please try again in ${retryAfterHours} hours, or use 'Check Request Status' if you've already submitted a request.`
      );
    }

    // Also check IP-based rate limiting
    const clientIP = serverRateLimitService.getClientIP();
    const ipRateLimitCheck = await serverRateLimitService.checkIPRateLimit(
      clientIP
    );
    if (!ipRateLimitCheck.allowed) {
      const retryAfterMinutes = Math.ceil(
        (new Date(ipRateLimitCheck.resetTime).getTime() - Date.now()) /
          (1000 * 60)
      );
      throw new Error(
        `Too many requests from your location. Please try again in ${retryAfterMinutes} minutes.`
      );
    }

    // Include legal acceptance fields
    const insertPayload: any = {
      email: normalizedEmail,
      full_name: data.full_name,
      phone_number: data.phone_number || null,
      vt_market_account_number: data.vt_market_account_number || null,
      referrer: data.referrer || null,
      account_type: data.account_type,
      reason: data.reason || null,
      website: data.website || null, // Honeypot field
      legal_accepted: true,
      legal_accepted_at: new Date().toISOString(),
      legal_version: LEGAL_VERSION,
    };

    // Insert without selecting (avoids RLS SELECT issues for unauthenticated users)
    const { error: insertError } = await supabase
      .from("account_requests")
      .insert(insertPayload);

    if (insertError) {
      logger.error("❌ Error creating account request:", insertError);
      const msg = insertError.message?.toLowerCase() || "";
      if (
        msg.includes("account_requests_email_unique") ||
        msg.includes("duplicate key") ||
        (insertError as any).code === "23505"
      ) {
        throw new Error(
          "An account request with this email already exists. Please click the 'Check Request Status' button below to view or update your request."
        );
      }
      throw insertError;
    }

    // Fetch the created record via edge function (public-safe)
    let fetched: AccountRequestData | null = null;
    try {
      const response = await supabase.functions.invoke(
        "check-account-request-status",
        {
          body: { email: normalizedEmail },
        }
      );
      if (!response.error) {
        fetched = (response.data as any)?.request ?? null;
      } else {
        logger.warn(
          "check-account-request-status returned error:",
          response.error
        );
      }
    } catch (err) {
      logger.warn(
        "Failed to fetch created account request via edge function:",
        err
      );
    }

    // Fire admin notifications (non-blocking)
    supabase.functions
      .invoke("account-request-notifications", {
        body: {
          type: "new_request",
          requestId: fetched?.id,
          userEmail: normalizedEmail,
          userName: data.full_name,
        },
      })
      .then(({ data, error }) => {
        logger.log("Admin notification (new_request) invoked:", {
          data,
          error,
        });
      });

    logger.log("✅ Account request created successfully");
    return (fetched || insertPayload) as AccountRequestData;
  }

  static async getByEmail(email: string): Promise<AccountRequestData | null> {
    logger.log(
      "🔍 Checking for existing account request via edge function:",
      email
    );

    try {
      const { data, error } = await supabase.functions.invoke(
        "check-account-request-status",
        {
          body: { email: email.toLowerCase().trim() },
        }
      );

      if (error) {
        logger.warn(
          "❌ Error fetching account request by email (edge fn):",
          error
        );
        return null;
      }

      const req = (data as any)?.request ?? null;
      logger.log("✅ Account request (edge fn) found:", req);
      return req as AccountRequestData | null;
    } catch (err) {
      logger.warn("getByEmail failed:", err);
      return null;
    }
  }

  static async updateRejectedRequest(
    id: string,
    updateData: Partial<AccountRequestData>
  ): Promise<AccountRequestData> {
    logger.log("🔄 Updating rejected request:", id, updateData);

    // First, verify the request can be updated (must be rejected)
    const { data: existing, error: fetchError } = await supabase
      .from("account_requests")
      .select("status, rejection_reason, resubmission_count, email")
      .eq("id", id)
      .single();

    if (fetchError) {
      logger.error("❌ Error fetching request for update:", fetchError);
      throw fetchError;
    }

    if (existing.status !== "rejected") {
      throw new Error("Only rejected requests can be updated");
    }

    // Check rate limiting for resubmissions
    const rateLimitCheck = await serverRateLimitService.checkEmailRateLimit(
      existing.email
    );
    if (!rateLimitCheck.allowed) {
      const retryAfterHours = Math.ceil(
        (new Date(rateLimitCheck.resetTime).getTime() - Date.now()) /
          (1000 * 60 * 60)
      );
      throw new Error(
        `Too many resubmission attempts. Please try again in ${retryAfterHours} hours.`
      );
    }

    // Prepare update data
    const updatePayload = {
      ...updateData,
      status: "pending" as const,
      resubmission_count: (existing.resubmission_count || 0) + 1,
      last_resubmitted_at: new Date().toISOString(),
      original_rejection_reason: existing.rejection_reason,
      rejection_reason: null, // Clear current rejection reason
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from("account_requests")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("❌ Error updating account request:", error);
      throw error;
    }

    // Fire admin notifications (non-blocking)
    supabase.functions
      .invoke("account-request-notifications", {
        body: {
          type: "request_resubmitted",
          requestId: id,
          userEmail: (result as any).email,
          userName: (result as any).full_name,
        },
      })
      .then(({ data, error }) => {
        logger.log("Admin notification (request_resubmitted) invoked:", {
          data,
          error,
        });
      });

    return result as AccountRequestData;
  }

  static async canBeUpdated(id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("account_requests")
      .select("status")
      .eq("id", id)
      .single();

    if (error || !data) return false;
    return data.status === "rejected";
  }

  static async getAuditHistory(
    accountRequestId: string
  ): Promise<AccountRequestAudit[]> {
    const { data, error } = await supabase
      .from("account_request_audit")
      .select("*")
      .eq("account_request_id", accountRequestId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("❌ Error fetching audit history:", error);
      throw error;
    }

    return (data || []) as AccountRequestAudit[];
  }

  static async list(): Promise<AccountRequestData[]> {
    const { data, error } = await supabase
      .from("account_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("❌ Error listing account requests:", error);
      throw error;
    }

    return (data || []) as AccountRequestData[];
  }
}
