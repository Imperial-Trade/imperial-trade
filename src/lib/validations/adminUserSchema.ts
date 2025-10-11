
import { z } from 'zod';

export const adminUserUpdateSchema = z.object({
  display_name: z.string().max(100, 'Display name is too long').optional().nullable(),
  account_status: z.enum(['active', 'suspended', 'pending_verification', 'inactive'], {
    required_error: 'Account status is required',
    invalid_type_error: 'Invalid account status'
  }),
  phone_number: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '') ? null : val,
    z.string().regex(/^[\+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional().nullable()
  ),
});

// Partial update schema for single field updates
export const adminUserPartialUpdateSchema = z.object({
  display_name: z.string().max(100, 'Display name is too long').optional().nullable(),
  account_status: z.enum(['active', 'suspended', 'pending_verification', 'inactive'], {
    invalid_type_error: 'Invalid account status'
  }).optional(),
  phone_number: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '') ? null : val,
    z.string().regex(/^[\+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional().nullable()
  ),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().max(100, 'Display name is too long').optional().nullable(),
  role: z.enum(['admin', 'educator+', 'moderator', 'educator', 'user'], {
    required_error: 'Role is required',
    invalid_type_error: 'Invalid role selected'
  }).default('user'),
});

export type AdminUserUpdate = z.infer<typeof adminUserUpdateSchema>;
export type AdminUserPartialUpdate = z.infer<typeof adminUserPartialUpdateSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
