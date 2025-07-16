
import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from '@/types/common';

export interface AccountRequestData {
  id?: string;
  email: string;
  full_name: string;
  phone_number?: string;
  vt_market_account_number?: string;
  referrer?: string;
  account_type: 'user' | 'educator' | 'admin'; // Include admin to match database
  reason?: string;
  status?: 'pending' | 'approved' | 'rejected';
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
    console.log('🚀 Creating account request:', data);
    
    const { data: result, error } = await supabase
      .from('account_requests')
      .insert({
        email: data.email,
        full_name: data.full_name,
        phone_number: data.phone_number || null,
        vt_market_account_number: data.vt_market_account_number || null,
        referrer: data.referrer || null,
        account_type: data.account_type,
        reason: data.reason || null,
        website: data.website || null, // Honeypot field
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating account request:', error);
      throw error;
    }

    console.log('✅ Account request created successfully:', result);
    return result as AccountRequestData;
  }

  static async getByEmail(email: string): Promise<AccountRequestData | null> {
    console.log('🔍 Checking for existing account request:', email);
    
    const { data, error } = await supabase
      .from('account_requests')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching account request by email:', error);
      throw error;
    }

    console.log('✅ Account request found:', data);
    return data as AccountRequestData | null;
  }

  static async updateRejectedRequest(id: string, updateData: Partial<AccountRequestData>): Promise<AccountRequestData> {
    console.log('🔄 Updating rejected request:', id, updateData);
    
    // First, verify the request can be updated (must be rejected)
    const { data: existing, error: fetchError } = await supabase
      .from('account_requests')
      .select('status, rejection_reason, resubmission_count')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching request for update:', fetchError);
      throw fetchError;
    }

    if (existing.status !== 'rejected') {
      throw new Error('Only rejected requests can be updated');
    }

    // Prepare update data
    const updatePayload = {
      ...updateData,
      status: 'pending' as const,
      resubmission_count: (existing.resubmission_count || 0) + 1,
      last_resubmitted_at: new Date().toISOString(),
      original_rejection_reason: existing.rejection_reason,
      rejection_reason: null, // Clear current rejection reason
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from('account_requests')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating account request:', error);
      throw error;
    }

    console.log('✅ Account request updated successfully:', result);
    return result as AccountRequestData;
  }

  static async canBeUpdated(id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('account_requests')
      .select('status')
      .eq('id', id)
      .single();

    if (error || !data) return false;
    return data.status === 'rejected';
  }

  static async getAuditHistory(accountRequestId: string): Promise<AccountRequestAudit[]> {
    const { data, error } = await supabase
      .from('account_request_audit')
      .select('*')
      .eq('account_request_id', accountRequestId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching audit history:', error);
      throw error;
    }

    return (data || []) as AccountRequestAudit[];
  }

  static async list(): Promise<AccountRequestData[]> {
    const { data, error } = await supabase
      .from('account_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error listing account requests:', error);
      throw error;
    }

    return (data || []) as AccountRequestData[];
  }
}
