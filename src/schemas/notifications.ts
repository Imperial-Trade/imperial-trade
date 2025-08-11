
import { z } from 'zod';

export const UserNotificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.string().default('system'),
  title: z.string(),
  message: z.string(),
  is_read: z.boolean().default(false),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  link_url: z.string().url().nullable().optional(),
  source: z.string().nullable().optional(),
  metadata: z.record(z.any()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export type UserNotification = z.infer<typeof UserNotificationSchema>;
