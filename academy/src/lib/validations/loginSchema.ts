
import { z } from "zod";
import { sanitizeInput } from "./sanitization";
import { validateEmailDomain } from "./securityRules";

export const loginSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .max(254, "Email address too long")
    .toLowerCase()
    .transform(sanitizeInput)
    .refine(validateEmailDomain, {
      message: "Invalid email domain"
    }),

  password: z.string()
    .min(1, "Password is required")
    .max(128, "Password too long")
    .transform(sanitizeInput),
  
  // Honeypot field - should always be empty
  website: z.string().max(0, "Invalid submission").optional().default(""),
});

export type LoginFormData = z.infer<typeof loginSchema>;
