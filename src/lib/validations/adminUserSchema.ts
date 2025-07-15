
import { z } from 'zod';

export const adminUserUpdateSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(100, 'Display name is too long'),
  user_type: z.enum(['member', 'educator', 'admin'], {
    required_error: 'User type is required',
    invalid_type_error: 'Invalid user type'
  }),
  access_level: z.enum(['user', 'moderator', 'admin'], {
    required_error: 'Access level is required',
    invalid_type_error: 'Invalid access level'
  }),
  account_status: z.enum(['active', 'suspended', 'pending_verification', 'inactive'], {
    required_error: 'Account status is required',
    invalid_type_error: 'Invalid account status'
  }),
  phone_number: z.string().optional().refine(
    (val) => !val || /^[\+]?[\d\s\-\(\)]+$/.test(val),
    'Invalid phone number format'
  ),
  registration_source: z.enum(['direct', 'account_request', 'social', 'admin_created', 'invitation']).optional(),
  approved_at: z.string().optional(),
  approved_by: z.string().optional(),
});

// Partial update schema for single field updates
export const adminUserPartialUpdateSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(100, 'Display name is too long').optional(),
  user_type: z.enum(['member', 'educator', 'admin'], {
    invalid_type_error: 'Invalid user type'
  }).optional(),
  access_level: z.enum(['user', 'moderator', 'admin'], {
    invalid_type_error: 'Invalid access level'
  }).optional(),
  account_status: z.enum(['active', 'suspended', 'pending_verification', 'inactive'], {
    invalid_type_error: 'Invalid account status'
  }).optional(),
  phone_number: z.string().optional().refine(
    (val) => !val || /^[\+]?[\d\s\-\(\)]+$/.test(val),
    'Invalid phone number format'
  ),
  registration_source: z.enum(['direct', 'account_request', 'social', 'admin_created', 'invitation']).optional(),
  approved_at: z.string().optional(),
  approved_by: z.string().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().min(1, 'Display name is required').max(100, 'Display name is too long'),
  user_type: z.enum(['member', 'educator', 'admin']),
  access_level: z.enum(['user', 'moderator', 'admin']),
  role: z.string().default('user'),
});

export type AdminUserUpdate = z.infer<typeof adminUserUpdateSchema>;
export type AdminUserPartialUpdate = z.infer<typeof adminUserPartialUpdateSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
