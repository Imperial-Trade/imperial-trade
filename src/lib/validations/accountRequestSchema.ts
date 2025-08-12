
import { z } from "zod";
import { LEGAL_VERSION } from "@/lib/constants/legal";

export const accountRequestSchema = z.object({
  full_name: z.string()
    .min(2, "Full name must be at least 2 characters")
    .max(50, "Full name must not exceed 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Full name can only contain letters, spaces, hyphens, and apostrophes"),
  
  email: z.string()
    .email("Please enter a valid email address")
    .max(254, "Email address too long")
    .toLowerCase(),

  phone_number: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must not exceed 15 digits")
    .regex(/^[\+]?[1-9][\d\s\-\(\)]{9,15}$/, "Please enter a valid phone number"),

  vt_market_account_number: z.string()
    .min(5, "VT Market Account Number must be at least 5 characters")
    .max(20, "VT Market Account Number must not exceed 20 characters")
    .regex(/^[A-Za-z0-9]+$/, "Account number can only contain letters and numbers"),

  referrer: z.string()
    .max(100, "Referrer name must not exceed 100 characters")
    .optional()
    .or(z.literal("")),
  
  account_type: z.enum(["user", "educator"], {
    errorMap: () => ({ message: "Please select a valid account type: Standard Member or Educator/IB Partner" })
  }),
  
  reason: z.string()
    .min(10, "Please provide at least 10 characters explaining why you want to join")
    .max(500, "Reason must not exceed 500 characters"),
  
  // Honeypot field - should always be empty
  website: z.string().max(0, "Invalid submission").optional().default(""),

  // Single combined legal acceptance (required)
  accept_legal: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Terms of Use and Privacy Policy." })
  }),
});

export type AccountRequestFormData = z.infer<typeof accountRequestSchema>;

// Password setup schema for approved users
export const passwordSetupSchema = z.object({
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain uppercase, lowercase, number, and special character")
    .refine(
      (password) => !["password", "123456", "qwerty"].includes(password.toLowerCase()),
      { message: "Password is too common" }
    ),
  
  confirmPassword: z.string(),

  // Single combined legal acceptance (required)
  accept_legal: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Terms of Use and Privacy Policy." })
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type PasswordSetupFormData = z.infer<typeof passwordSetupSchema>;

// Email validation schema for status checking
export const emailValidationSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .max(254, "Email address too long")
    .toLowerCase(),
});

export type EmailValidationFormData = z.infer<typeof emailValidationSchema>;
