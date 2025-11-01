
import DOMPurify from 'dompurify';
import { validateEmailDomain, validateContent } from '@/lib/validations/enhancedSecurityRules';

export class ValidationService {
  private static instance: ValidationService;

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: []
    });
  }

  validateEmail(email: string): { isValid: boolean; reason?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { isValid: false, reason: 'Invalid email format' };
    }

    if (!validateEmailDomain(email)) {
      return { isValid: false, reason: 'Email domain not allowed' };
    }

    return { isValid: true };
  }

  validateTextContent(content: string): { isValid: boolean; reason?: string } {
    if (!content || content.trim().length === 0) {
      return { isValid: false, reason: 'Content cannot be empty' };
    }

    if (content.length > 5000) {
      return { isValid: false, reason: 'Content too long (max 5000 characters)' };
    }

    if (!validateContent(content)) {
      return { isValid: false, reason: 'Content contains inappropriate material' };
    }

    return { isValid: true };
  }

  validatePhoneNumber(phone: string): { isValid: boolean; reason?: string } {
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    
    if (!phoneRegex.test(phone)) {
      return { isValid: false, reason: 'Invalid phone number format' };
    }

    return { isValid: true };
  }

  sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }
}

export const validationService = ValidationService.getInstance();
