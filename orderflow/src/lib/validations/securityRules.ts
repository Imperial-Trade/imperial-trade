
import { disposableEmailDomains } from "../data/disposableEmails";
import { spamKeywords, profanityWords } from "../data/contentFilters";

export const validateEmailDomain = (email: string): boolean => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  // Check against disposable email domains
  return !disposableEmailDomains.includes(domain);
};

export const validateContent = (content: string): boolean => {
  const lowerContent = content.toLowerCase();
  
  // Check for spam keywords
  const hasSpam = spamKeywords.some(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
  
  // Check for profanity
  const hasProfanity = profanityWords.some(word => 
    lowerContent.includes(word.toLowerCase())
  );
  
  // Check for excessive URLs (basic detection)
  const urlCount = (content.match(/https?:\/\/|www\./gi) || []).length;
  const hasExcessiveUrls = urlCount > 2;
  
  return !hasSpam && !hasProfanity && !hasExcessiveUrls;
};

export const validatePasswordStrength = (password: string): {
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length >= 12) score += 1;
  else feedback.push("Use at least 12 characters");
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Include lowercase letters");
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Include uppercase letters");
  
  if (/\d/.test(password)) score += 1;
  else feedback.push("Include numbers");
  
  if (/[@$!%*?&]/.test(password)) score += 1;
  else feedback.push("Include special characters");
  
  return { score, feedback };
};
