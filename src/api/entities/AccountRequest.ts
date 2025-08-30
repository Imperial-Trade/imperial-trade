
import { supabase } from '@/integrations/supabase/client';
import { serverRateLimitService } from '@/services/ServerRateLimitService';

export interface AccountRequestData {
  id?: string;
  email: string;
  full_name: string;
  phone_number?: string | null;
  vt_market_account_number: string;
  referrer?: string | null;
  account_type: 'user' | 'educator';
  reason?: string | null;
  website?: string; // Honeypot field
  status?: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
  approved_at?: string | null;
  approved_by?: string | null;
  rejection_reason?: string | null;
  resubmission_count?: number;
  original_rejection_reason?: string | null;
}

export interface AccountRequestResponse {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  vt_market_account_number: string;
  referrer: string | null;
  account_type: 'user' | 'educator';
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  resubmission_count?: number;
  original_rejection_reason?: string | null;
}

export interface AccountRequestAudit {
  id: string;
  request_id: string;
  change_type: string;
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  notes: string | null;
  created_at: string;
  created_by: string;
}

export class AccountRequest {
  static async create(data: AccountRequestData): Promise<AccountRequestResponse> {
    console.log('🚀 Starting account request creation process');
    console.log('📧 Email:', data.email);
    console.log('👤 Account type:', data.account_type);

    try {
      // STEP 1: Check if request already exists (most user-friendly first)
      console.log('🔍 Step 1: Checking for existing request...');
      const { data: existingRequest, error: existingError } = await supabase
        .from('account_requests')
        .select('id, status, email, created_at, updated_at')
        .eq('email', data.email.toLowerCase().trim())
        .single();

      if (existingRequest && !existingError) {
        console.log('⚠️ Existing request found:', existingRequest);
        
        const timeSinceCreation = Date.now() - new Date(existingRequest.created_at).getTime();
        const hoursSinceCreation = Math.floor(timeSinceCreation / (1000 * 60 * 60));
        
        // If request exists and is recent, provide helpful guidance
        if (existingRequest.status === 'pending') {
          throw new Error(`You already have a pending account request submitted ${hoursSinceCreation > 0 ? hoursSinceCreation + ' hours' : 'recently'} ago. Please check the status page for updates or wait for admin review.`);
        } else if (existingRequest.status === 'approved') {
          throw new Error('Your account request has already been approved. Please check your email for login instructions or contact support.');
        } else if (existingRequest.status === 'rejected') {
          // Allow resubmission for rejected requests older than 24 hours
          const timeSinceRejection = Date.now() - new Date(existingRequest.updated_at).getTime();
          if (timeSinceRejection < 24 * 60 * 60 * 1000) {
            throw new Error('Your previous request was rejected. You can resubmit after 24 hours or contact support for assistance.');
          }
          console.log('✅ Rejected request is old enough, allowing resubmission');
        }
      }

      // STEP 2: IP-based rate limiting (more permissive)
      console.log('🔍 Step 2: Checking IP rate limits...');
      const clientIP = serverRateLimitService.getClientIP();
      const ipRateLimit = await serverRateLimitService.checkIPRateLimit(clientIP);
      
      if (!ipRateLimit.allowed) {
        const resetTime = new Date(ipRateLimit.resetTime);
        const minutesUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60));
        throw new Error(`Too many account requests from your location. Please try again in ${minutesUntilReset} minutes.`);
      }
      
      console.log('✅ IP rate limit check passed, attempts remaining:', ipRateLimit.attemptsRemaining);

      // STEP 3: Email-based rate limiting (most restrictive, but now more permissive)
      console.log('🔍 Step 3: Checking email rate limits...');
      const emailRateLimit = await serverRateLimitService.checkEmailRateLimit(data.email);
      
      if (!emailRateLimit.allowed) {
        const resetTime = new Date(emailRateLimit.resetTime);
        const hoursUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60 * 60));
        throw new Error(`You've reached the maximum number of account requests (3 per day). Please try again in ${hoursUntilReset} hours or contact support if you need assistance.`);
      }
      
      console.log('✅ Email rate limit check passed, attempts remaining:', emailRateLimit.attemptsRemaining);

      // STEP 4: Create the new request
      console.log('🔄 Step 4: Creating new account request...');
      
      const requestPayload = {
        email: data.email.toLowerCase().trim(),
        full_name: data.full_name.trim(),
        phone_number: data.phone_number?.trim() || null,
        vt_market_account_number: data.vt_market_account_number.trim(),
        referrer: data.referrer?.trim() || null,
        account_type: data.account_type,
        reason: data.reason?.trim() || null,
        status: 'pending' as const,
      };

      console.log('📤 Submitting payload:', requestPayload);

      const { data: newRequest, error: createError } = await supabase
        .from('account_requests')
        .insert([requestPayload])
        .select()
        .single();

      if (createError) {
        console.error('❌ Database error:', createError);
        
        // Handle specific database errors
        if (createError.code === '23505') { // Unique constraint violation
          throw new Error('An account request with this email already exists. Please check the status page.');
        } else if (createError.message?.includes('account_type')) {
          throw new Error('Invalid account type selected. Please refresh the page and try again.');
        } else {
          throw new Error('Failed to submit account request. Please check all fields and try again.');
        }
      }

      if (!newRequest) {
        throw new Error('Failed to create account request. Please try again.');
      }

      console.log('🎉 Account request created successfully:', newRequest.id);
      return newRequest as AccountRequestResponse;

    } catch (error) {
      console.error('💥 Account request creation failed:', error);
      
      // Re-throw with context if it's our custom error
      if (error instanceof Error) {
        throw error;
      }
      
      // Generic fallback error
      throw new Error('An unexpected error occurred while processing your request. Please try again later.');
    }
  }

  static async getByEmail(email: string): Promise<AccountRequestResponse | null> {
    try {
      const { data, error } = await supabase
        .from('account_requests')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as AccountRequestResponse | null;
    } catch (error) {
      console.error('Error fetching account request:', error);
      return null;
    }
  }

  static async updateStatus(
    id: string, 
    status: 'approved' | 'rejected', 
    approvedBy?: string,
    rejectionReason?: string
  ): Promise<AccountRequestResponse> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = approvedBy;
    } else if (status === 'rejected') {
      updateData.rejection_reason = rejectionReason;
    }

    const { data, error } = await supabase
      .from('account_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as AccountRequestResponse;
  }

  static async updateRejectedRequest(id: string, updateData: Partial<AccountRequestData>): Promise<AccountRequestResponse> {
    const payload = {
      full_name: updateData.full_name?.trim(),
      phone_number: updateData.phone_number?.trim() || null,
      vt_market_account_number: updateData.vt_market_account_number?.trim(),
      referrer: updateData.referrer?.trim() || null,
      account_type: updateData.account_type,
      reason: updateData.reason?.trim() || null,
      status: 'pending' as const,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('account_requests')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as AccountRequestResponse;
  }
}
