
import { describe, it, expect } from 'vitest';
import { 
  adminUserUpdateSchema, 
  createUserSchema,
  type AdminUserUpdate,
  type CreateUserData 
} from '@/lib/validations/adminUserSchema';
import { loginSchema } from '@/lib/validations/loginSchema';
import { accountRequestSchema } from '@/lib/validations/accountRequestSchema';

describe('Validation Schemas', () => {
  describe('adminUserUpdateSchema', () => {
    it('validates valid admin user update data', () => {
      const validData: AdminUserUpdate = {
        display_name: 'John Doe',
        user_type: 'member',
        access_level: 'user',
        account_status: 'active'
      };

      const result = adminUserUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid user_type', () => {
      const invalidData = {
        display_name: 'John Doe',
        user_type: 'invalid_type',
        access_level: 'user',
        account_status: 'active'
      };

      const result = adminUserUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects empty display_name', () => {
      const invalidData = {
        display_name: '',
        user_type: 'member',
        access_level: 'user',
        account_status: 'active'
      };

      const result = adminUserUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('validates optional phone_number', () => {
      const validData = {
        display_name: 'John Doe',
        user_type: 'member',
        access_level: 'user',
        account_status: 'active',
        phone_number: '+1234567890'
      };

      const result = adminUserUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid phone_number format', () => {
      const invalidData = {
        display_name: 'John Doe',
        user_type: 'member',
        access_level: 'user',
        account_status: 'active',
        phone_number: 'invalid-phone'
      };

      const result = adminUserUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('validates valid create user data', () => {
      const validData: CreateUserData = {
        email: 'test@example.com',
        password: 'password123',
        display_name: 'Test User',
        user_type: 'member',
        access_level: 'user',
        role: 'user'
      };

      const result = createUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
        display_name: 'Test User',
        user_type: 'member',
        access_level: 'user',
        role: 'user'
      };

      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123',
        display_name: 'Test User',
        user_type: 'member',
        access_level: 'user',
        role: 'user'
      };

      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('validates valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        honeypot: ''
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
        honeypot: ''
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
        honeypot: ''
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects honeypot spam', () => {
      const spamData = {
        email: 'test@example.com',
        password: 'password123',
        honeypot: 'spam-content'
      };

      const result = loginSchema.safeParse(spamData);
      expect(result.success).toBe(false);
    });
  });

  describe('accountRequestSchema', () => {
    it('validates valid account request data', () => {
      const validData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        accountType: 'member',
        honeypot: ''
      };

      const result = accountRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email format', () => {
      const invalidData = {
        fullName: 'John Doe',
        email: 'invalid-email',
        accountType: 'member',
        honeypot: ''
      };

      const result = accountRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects empty full name', () => {
      const invalidData = {
        fullName: '',
        email: 'john@example.com',
        accountType: 'member',
        honeypot: ''
      };

      const result = accountRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('validates optional fields', () => {
      const validData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        accountType: 'educator',
        phoneNumber: '+1234567890',
        website: 'https://example.com',
        vtMarketAccountNumber: 'VT123456',
        reason: 'I want to share my trading expertise',
        honeypot: ''
      };

      const result = accountRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
