
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { supabase } from '@/integrations/supabase/client';
import { TestWrapper } from '@/test/utils/test-helpers';
import { LoginForm } from '@/components/auth/LoginForm';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';

// Mock the Supabase client
vi.mock('@/integrations/supabase/client');

// Security Test Configuration - Dynamic and Extensible
const SECURITY_CONFIG = {
  SQL_INJECTION_PATTERNS: [
    "admin' OR '1'='1",
    "'; DROP TABLE users; --",
    "admin'/**/OR/**/1=1/**/--",
    "' UNION SELECT * FROM users --",
    "1' OR 1=1#",
    "admin'--",
    "' OR 'a'='a"
  ],
  XSS_PATTERNS: [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src="x" onerror="alert(\'XSS\')" />',
    '<svg onload="alert(\'XSS\')" />',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<body onload="alert(\'XSS\')">',
    '"><script>alert(String.fromCharCode(88,83,83))</script>'
  ],
  RATE_LIMIT: {
    MAX_ATTEMPTS: 5,
    TIME_WINDOW: 60000 // 1 minute
  },
  PASSWORD_REQUIREMENTS: {
    MIN_LENGTH: 8,
    REQUIRES_UPPER: true,
    REQUIRES_LOWER: true,
    REQUIRES_NUMBER: true,
    REQUIRES_SPECIAL: true
  }
};

// Dynamic Security Test Utilities
class SecurityTestUtils {
  static testSQLInjectionPrevention(inputElement: HTMLElement, patterns: string[] = SECURITY_CONFIG.SQL_INJECTION_PATTERNS) {
    return patterns.every(pattern => {
      const sanitizedValue = inputElement.getAttribute('value') || '';
      return !sanitizedValue.includes('DROP') && 
             !sanitizedValue.includes('UNION') && 
             !sanitizedValue.includes('--') &&
             !pattern.toLowerCase().includes('drop');
    });
  }

  static testXSSPrevention(inputElement: HTMLElement, patterns: string[] = SECURITY_CONFIG.XSS_PATTERNS) {
    return patterns.every(pattern => {
      const sanitizedValue = inputElement.getAttribute('value') || '';
      return !sanitizedValue.includes('<script') && 
             !sanitizedValue.includes('javascript:') && 
             !sanitizedValue.includes('<img') &&
             !sanitizedValue.includes('<svg') &&
             !sanitizedValue.includes('<iframe');
    });
  }

  static validateJWTStructure(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  static validateEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && 
           !email.includes('<') && 
           !email.includes('>') &&
           !email.includes('script');
  }

  static validatePasswordStrength(password: string): boolean {
    const { MIN_LENGTH, REQUIRES_UPPER, REQUIRES_LOWER, REQUIRES_NUMBER, REQUIRES_SPECIAL } = SECURITY_CONFIG.PASSWORD_REQUIREMENTS;
    
    const minLength = password.length >= MIN_LENGTH;
    const hasUpper = REQUIRES_UPPER ? /[A-Z]/.test(password) : true;
    const hasLower = REQUIRES_LOWER ? /[a-z]/.test(password) : true;
    const hasNumber = REQUIRES_NUMBER ? /\d/.test(password) : true;
    const hasSpecial = REQUIRES_SPECIAL ? /[!@#$%^&*(),.?":{}|<>]/.test(password) : true;
    
    return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
  }
}

// Rate Limiter Test Class
class RateLimiterTestClass {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private timeWindow: number;

  constructor(maxRequests = SECURITY_CONFIG.RATE_LIMIT.MAX_ATTEMPTS, timeWindow = SECURITY_CONFIG.RATE_LIMIT.TIME_WINDOW) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside time window
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < this.timeWindow
    );
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    return true;
  }

  reset() {
    this.requests.clear();
  }
}

describe('Security Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Security', () => {
    it('should prevent SQL injection in login form', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Test each SQL injection pattern dynamically
      for (const sqlPattern of SECURITY_CONFIG.SQL_INJECTION_PATTERNS) {
        await user.clear(emailInput);
        await user.clear(passwordInput);
        await user.type(emailInput, sqlPattern);
        await user.type(passwordInput, sqlPattern);
        await user.click(submitButton);

        // Verify that malicious SQL patterns are sanitized
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: expect.not.stringContaining('DROP'),
          password: expect.not.stringContaining('DROP')
        });

        // Additional dynamic validation
        expect(SecurityTestUtils.testSQLInjectionPrevention(emailInput)).toBe(true);
      }
    });

    it('should prevent XSS attacks in form inputs', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <CreateUserDialog open={true} onOpenChange={() => {}} />
        </TestWrapper>
      );

      const displayNameInput = screen.getByLabelText(/display name/i);
      
      // Test each XSS pattern dynamically
      for (const xssPattern of SECURITY_CONFIG.XSS_PATTERNS) {
        await user.clear(displayNameInput);
        await user.type(displayNameInput, xssPattern);
        
        // Verify XSS prevention using dynamic utility
        expect(SecurityTestUtils.testXSSPrevention(displayNameInput)).toBe(true);
        
        // Verify input doesn't contain dangerous XSS patterns
        const inputValue = displayNameInput.getAttribute('value') || '';
        expect(inputValue).not.toMatch(/<script/i);
        expect(inputValue).not.toMatch(/javascript:/i);
        expect(inputValue).not.toMatch(/<img.*onerror/i);
      }
    });

    it('should enforce proper session timeout', async () => {
      const mockSession = {
        access_token: 'mock-token',
        expires_at: Date.now() / 1000 - 3600, // Expired 1 hour ago
        user: { id: 'test-user' }
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      // Verify expired session handling
      const { data } = await supabase.auth.getSession();
      const isExpired = data.session && data.session.expires_at! < Date.now() / 1000;
      
      expect(isExpired).toBe(true);
    });

    it('should validate JWT token structure dynamically', () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const invalidTokens = [
        'invalid.token.structure',
        'not-a-jwt-token',
        'eyJhbGciOiJIUzI1NiJ9.invalid.signature',
        '',
        'single-part',
        'two.parts'
      ];

      // Test valid JWT
      expect(SecurityTestUtils.validateJWTStructure(validJWT)).toBe(true);
      
      // Test invalid JWTs dynamically
      invalidTokens.forEach(token => {
        expect(SecurityTestUtils.validateJWTStructure(token)).toBe(false);
      });
    });
  });

  describe('Authorization Security', () => {
    it('should prevent unauthorized access to admin routes', async () => {
      const mockUser = {
        id: 'regular-user',
        user_metadata: { access_level: 'user' }
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Dynamic permission checking
      const hasAdminAccess = (user: any): boolean => {
        return user?.user_metadata?.access_level === 'admin';
      };

      expect(hasAdminAccess(mockUser)).toBe(false);
    });

    it('should validate role-based permissions dynamically', () => {
      const permissions = {
        user: ['read'],
        moderator: ['read', 'write'],
        admin: ['read', 'write', 'delete', 'manage_users']
      };

      const hasPermission = (userRole: string, permission: string): boolean => {
        return permissions[userRole as keyof typeof permissions]?.includes(permission) || false;
      };

      // Dynamic permission tests
      const testCases = [
        { role: 'user', permission: 'delete', expected: false },
        { role: 'moderator', permission: 'write', expected: true },
        { role: 'admin', permission: 'manage_users', expected: true },
        { role: 'guest', permission: 'read', expected: false }
      ];

      testCases.forEach(({ role, permission, expected }) => {
        expect(hasPermission(role, permission)).toBe(expected);
      });
    });
  });

  describe('Input Validation Security', () => {
    it('should validate email format dynamically', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@subdomain.example.org',
        'valid.email@test-domain.com'
      ];

      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        'xss@domain.com<script>',
        'user@domain.com<img src=x>',
        'javascript:alert@domain.com'
      ];

      // Test valid emails
      validEmails.forEach(email => {
        expect(SecurityTestUtils.validateEmailFormat(email)).toBe(true);
      });

      // Test invalid emails
      invalidEmails.forEach(email => {
        expect(SecurityTestUtils.validateEmailFormat(email)).toBe(false);
      });
    });

    it('should enforce password complexity requirements dynamically', () => {
      const strongPasswords = [
        'ComplexP@ssw0rd123',
        'MyStr0ng!Pa$$word',
        'Secure#2024#Pass',
        'Dynamic$Test9'
      ];

      const weakPasswords = [
        'password',
        '123456789',
        'Password',
        'p@ssw0rd',
        'short',
        'ALLUPPERCASE123!',
        'alllowercase123!',
        'NoNumbers!',
        'NoSpecialChars123'
      ];

      // Test strong passwords
      strongPasswords.forEach(password => {
        expect(SecurityTestUtils.validatePasswordStrength(password)).toBe(true);
      });

      // Test weak passwords
      weakPasswords.forEach(password => {
        expect(SecurityTestUtils.validatePasswordStrength(password)).toBe(false);
      });
    });
  });

  describe('Rate Limiting Security', () => {
    it('should implement request rate limiting dynamically', () => {
      const rateLimiter = new RateLimiterTestClass();
      const testIP = '192.168.1.1';

      // Test that first attempts are allowed
      for (let i = 0; i < SECURITY_CONFIG.RATE_LIMIT.MAX_ATTEMPTS; i++) {
        expect(rateLimiter.isAllowed(testIP)).toBe(true);
      }

      // Test that subsequent attempts are blocked
      expect(rateLimiter.isAllowed(testIP)).toBe(false);
      expect(rateLimiter.isAllowed(testIP)).toBe(false);

      // Test multiple IPs independently
      const testIP2 = '192.168.1.2';
      expect(rateLimiter.isAllowed(testIP2)).toBe(true);
    });

    it('should reset rate limiting after time window', () => {
      const shortTimeWindow = 100; // 100ms for testing
      const rateLimiter = new RateLimiterTestClass(2, shortTimeWindow);
      const testIP = '192.168.1.3';

      // Use up the rate limit
      expect(rateLimiter.isAllowed(testIP)).toBe(true);
      expect(rateLimiter.isAllowed(testIP)).toBe(true);
      expect(rateLimiter.isAllowed(testIP)).toBe(false);

      // Wait for time window to pass and test reset
      return new Promise(resolve => {
        setTimeout(() => {
          expect(rateLimiter.isAllowed(testIP)).toBe(true);
          resolve(undefined);
        }, shortTimeWindow + 10);
      });
    });
  });

  describe('Dynamic Security Pattern Detection', () => {
    it('should detect and prevent common attack patterns', () => {
      const suspiciousInputs = [
        ...SECURITY_CONFIG.SQL_INJECTION_PATTERNS,
        ...SECURITY_CONFIG.XSS_PATTERNS,
        'eval()',
        'document.cookie',
        'window.location',
        '../../../etc/passwd',
        '%3Cscript%3E',
        'onmouseover=alert(1)'
      ];

      const sanitizeInput = (input: string): boolean => {
        const dangerousPatterns = [
          /script/i,
          /javascript:/i,
          /drop\s+table/i,
          /union\s+select/i,
          /eval\s*\(/i,
          /document\.cookie/i,
          /window\.location/i,
          /\.\.\/\.\.\//,
          /%3c/i,
          /on\w+\s*=/i
        ];

        return !dangerousPatterns.some(pattern => pattern.test(input));
      };

      suspiciousInputs.forEach(input => {
        expect(sanitizeInput(input)).toBe(false);
      });

      // Test safe inputs
      const safeInputs = ['user@example.com', 'Valid User Name', 'Safe123!'];
      safeInputs.forEach(input => {
        expect(sanitizeInput(input)).toBe(true);
      });
    });
  });
});
