
import { BaseEntityDto } from './common';

// Account Request DTOs
export interface AccountRequestDto extends BaseEntityDto {
  full_name: string;
  email: string;
  phone_number?: string;
  vt_market_account_number?: string;
  referrer?: string;
  account_type: 'user' | 'admin';
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  rejection_reason?: string;
  social_id?: string;
  social_provider?: 'google' | 'facebook' | 'twitter';
  username?: string;
  website?: string;
}

// Audit Log DTOs
export interface AuditLogDto extends BaseEntityDto {
  admin_email: string;
  action: string;
  target_entity: string;
  target_id: string;
  details?: Record<string, unknown>;
}
