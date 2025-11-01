import { disposableEmailDomains } from "../data/disposableEmails";
import { spamKeywords, profanityWords } from "../data/contentFilters";

// Enhanced disposable email patterns
const disposableEmailPatterns = [
  /^temp.*@/i,
  /^throw.*@/i,
  /^fake.*@/i,
  /^spam.*@/i,
  /^test.*@/i,
  /^\d+@/i, // emails starting with numbers
  /^[a-z]{1,3}@/i, // very short usernames
];

// Common bot email patterns
const botEmailPatterns = [
  /^[a-z]+\d{4,}@/i, // letters followed by many numbers
  /^test\d+@/i,
  /^user\d+@/i,
  /^admin\d+@/i,
];

export const validateEmailDomain = (email: string): boolean => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  // Check against known disposable domains
  if (disposableEmailDomains.includes(domain)) return false;
  
  // Check against disposable patterns
  if (disposableEmailPatterns.some(pattern => pattern.test(email))) return false;
  
  // Check against bot patterns
  if (botEmailPatterns.some(pattern => pattern.test(email))) return false;
  
  return true;
};

export const calculateContentEntropy = (text: string): number => {
  const charFreq: Record<string, number> = {};
  
  for (const char of text.toLowerCase()) {
    charFreq[char] = (charFreq[char] || 0) + 1;
  }
  
  let entropy = 0;
  const textLength = text.length;
  
  for (const freq of Object.values(charFreq)) {
    const probability = freq / textLength;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
};

export const detectGibberish = (text: string): boolean => {
  // Check for excessive repeated characters
  const repeatedChars = /(.)\1{4,}/g;
  if (repeatedChars.test(text)) return true;
  
  // Check for random character sequences
  const randomPatterns = [
    /[qwrtypsdfghjklzxcvbnm]{8,}/i, // consecutive consonants
    /[aeiou]{5,}/i, // excessive vowels
    /\d{10,}/, // long number sequences
  ];
  
  if (randomPatterns.some(pattern => pattern.test(text))) return true;
  
  // Check entropy (too low = repetitive, too high = random)
  const entropy = calculateContentEntropy(text);
  return entropy < 2 || entropy > 6;
};

export const validateContent = (content: string): boolean => {
  const lowerContent = content.toLowerCase();
  
  // Existing checks
  const hasSpam = spamKeywords.some(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
  
  const hasProfanity = profanityWords.some(word => 
    lowerContent.includes(word.toLowerCase())
  );
  
  const urlCount = (content.match(/https?:\/\/|www\./gi) || []).length;
  const hasExcessiveUrls = urlCount > 2;
  
  // New enhanced checks
  const isGibberish = detectGibberish(content);
  
  // Check for AI-generated patterns
  const aiPatterns = [
    /as an ai|i'm an ai|artificial intelligence/i,
    /i don't have personal/i,
    /i cannot provide/i,
    /i'm not able to/i,
  ];
  const hasAiPatterns = aiPatterns.some(pattern => pattern.test(content));
  
  // Check for template-like text
  const templatePatterns = [
    /lorem ipsum/i,
    /placeholder.*text/i,
    /sample.*content/i,
    /\[.*\]/g, // brackets indicating placeholders
  ];
  const hasTemplateText = templatePatterns.some(pattern => pattern.test(content));
  
  return !hasSpam && !hasProfanity && !hasExcessiveUrls && !isGibberish && 
         !hasAiPatterns && !hasTemplateText;
};

export const detectSuspiciousPatterns = (formData: any): {
  isSuspicious: boolean;
  reasons: string[];
  score: number;
} => {
  const reasons: string[] = [];
  let score = 0;
  
  // Check for filled honeypots
  if (formData.website && formData.website.length > 0) {
    score += 100; // Immediate bot detection
    reasons.push('Honeypot field filled');
  }
  
  // Check email patterns
  if (!validateEmailDomain(formData.email)) {
    score += 30;
    reasons.push('Suspicious email domain');
  }
  
  // Check content quality
  if (!validateContent(formData.reason || '')) {
    score += 25;
    reasons.push('Poor content quality');
  }
  
  // Check form timing (from hidden field)
  const formLoadedAt = formData.form_loaded_at ? parseInt(formData.form_loaded_at) : 0;
  const currentTime = Date.now();
  const timeSpent = currentTime - formLoadedAt;
  
  if (timeSpent < 10000) { // Less than 10 seconds
    score += 40;
    reasons.push('Form completed too quickly');
  }
  
  // Check for identical field values (lazy bot behavior)
  const fields = [formData.full_name, formData.email, formData.referrer];
  const uniqueFields = new Set(fields.filter(f => f && f.length > 0));
  if (fields.length > 0 && uniqueFields.size === 1) {
    score += 35;
    reasons.push('Identical field values detected');
  }
  
  return {
    isSuspicious: score >= 50,
    reasons,
    score,
  };
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
