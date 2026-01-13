interface SecurityAnalysis {
  score: number;
  isSuspicious: boolean;
  reasons: string[];
}

interface BehavioralAnalysis {
  suspiciousScore: number;
  reasons: string[];
}

interface AdaptiveRateLimitProfile {
  userId?: string;
  email: string;
  trustScore: number;
  submissionHistory: SubmissionAttempt[];
  riskFactors: RiskFactor[];
  adaptedLimits: AdaptedLimits;
  lastUpdated: number;
}

interface SubmissionAttempt {
  timestamp: number;
  success: boolean;
  securityScore: number;
  behavioralScore: number;
  source: 'manual' | 'automated' | 'suspicious';
}

interface RiskFactor {
  type: 'geographic' | 'temporal' | 'behavioral' | 'content' | 'network';
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: number;
  weight: number;
}

interface AdaptedLimits {
  maxAttempts: number;
  windowMs: number;
  progressiveDelays: number[];
  recoveryRate: number;
  requiresCaptcha: boolean;
  additionalVerification: boolean;
}

interface SystemLoad {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  requestRate: number;
  errorRate: number;
}

interface ThreatLevel {
  current: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  confidence: number;
  recommendedAction: 'allow' | 'throttle' | 'challenge' | 'block';
}

export class AdaptiveRateLimitService {
  private static instance: AdaptiveRateLimitService;
  private profiles: Map<string, AdaptiveRateLimitProfile> = new Map();
  private systemLoad: SystemLoad = {
    cpuUsage: 0,
    memoryUsage: 0,
    activeConnections: 0,
    requestRate: 0,
    errorRate: 0,
  };
  private currentThreatLevel: ThreatLevel = {
    current: 'low',
    factors: [],
    confidence: 0.8,
    recommendedAction: 'allow',
  };

  // Base configuration that gets adapted
  private baseConfig = {
    trusted: {
      maxAttempts: 10,
      windowMs: 15 * 60 * 1000, // 15 minutes
      progressiveDelays: [0, 5000, 15000, 30000, 60000],
      recoveryRate: 60 * 1000, // 1 minute
    },
    normal: {
      maxAttempts: 5,
      windowMs: 10 * 60 * 1000, // 10 minutes
      progressiveDelays: [0, 30000, 120000, 300000, 600000],
      recoveryRate: 2 * 60 * 1000, // 2 minutes
    },
    suspicious: {
      maxAttempts: 2,
      windowMs: 30 * 60 * 1000, // 30 minutes
      progressiveDelays: [0, 120000, 600000, 1800000, 3600000],
      recoveryRate: 10 * 60 * 1000, // 10 minutes
    },
    risky: {
      maxAttempts: 1,
      windowMs: 60 * 60 * 1000, // 1 hour
      progressiveDelays: [0, 600000, 1800000, 3600000, 7200000],
      recoveryRate: 30 * 60 * 1000, // 30 minutes
    },
  };

  static getInstance(): AdaptiveRateLimitService {
    if (!AdaptiveRateLimitService.instance) {
      AdaptiveRateLimitService.instance = new AdaptiveRateLimitService();
    }
    return AdaptiveRateLimitService.instance;
  }

  async getAdaptiveRateLimit(
    identifier: string,
    email: string,
    securityAnalysis: SecurityAnalysis,
    behavioralAnalysis: BehavioralAnalysis
  ): Promise<AdaptedLimits> {
    console.log('🧠 Calculating adaptive rate limits for:', identifier);

    // Get or create user profile
    let profile = this.profiles.get(identifier) || this.createNewProfile(email);
    
    // Update profile with current submission data
    profile = await this.updateProfile(profile, securityAnalysis, behavioralAnalysis);
    
    // Calculate trust score
    const trustScore = this.calculateTrustScore(profile);
    
    // Determine risk category
    const riskCategory = this.determineRiskCategory(trustScore, profile.riskFactors);
    
    // Apply system load and threat level adjustments
    const adaptedLimits = await this.applySystemAdjustments(riskCategory, profile);
    
    // Store updated profile
    profile.trustScore = trustScore;
    profile.adaptedLimits = adaptedLimits;
    profile.lastUpdated = Date.now();
    this.profiles.set(identifier, profile);
    
    console.log('🎯 Adaptive limits calculated:', {
      trustScore,
      riskCategory,
      adaptedLimits,
      systemLoad: this.systemLoad,
      threatLevel: this.currentThreatLevel.current,
    });
    
    return adaptedLimits;
  }

  private createNewProfile(email: string): AdaptiveRateLimitProfile {
    return {
      email,
      trustScore: 50, // Neutral starting point
      submissionHistory: [],
      riskFactors: [],
      adaptedLimits: { ...this.baseConfig.normal, requiresCaptcha: false, additionalVerification: false },
      lastUpdated: Date.now(),
    };
  }

  private async updateProfile(
    profile: AdaptiveRateLimitProfile,
    securityAnalysis: SecurityAnalysis,
    behavioralAnalysis: BehavioralAnalysis
  ): Promise<AdaptiveRateLimitProfile> {
    const now = Date.now();
    
    // Add current submission to history
    profile.submissionHistory.push({
      timestamp: now,
      success: false, // Will be updated after submission
      securityScore: securityAnalysis?.score || 0,
      behavioralScore: behavioralAnalysis?.suspiciousScore || 0,
      source: this.classifySubmissionSource(securityAnalysis, behavioralAnalysis),
    });
    
    // Keep only recent history (last 30 days)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    profile.submissionHistory = profile.submissionHistory.filter(
      attempt => attempt.timestamp > thirtyDaysAgo
    );
    
    // Add risk factors based on analysis
    const newRiskFactors = this.identifyRiskFactors(securityAnalysis, behavioralAnalysis);
    profile.riskFactors.push(...newRiskFactors);
    
    // Clean up old risk factors
    profile.riskFactors = profile.riskFactors.filter(
      factor => factor.timestamp > thirtyDaysAgo
    );
    
    return profile;
  }

  private calculateTrustScore(profile: AdaptiveRateLimitProfile): number {
    let score = profile.trustScore;
    
    // Historical success rate bonus
    const successfulSubmissions = profile.submissionHistory.filter(s => s.success).length;
    const totalSubmissions = profile.submissionHistory.length;
    if (totalSubmissions > 0) {
      const successRate = successfulSubmissions / totalSubmissions;
      score += (successRate - 0.5) * 20; // +/-10 points based on success rate
    }
    
    // Time-based trust building
    const accountAge = Date.now() - profile.lastUpdated;
    const daysOld = accountAge / (1000 * 60 * 60 * 24);
    if (daysOld > 7) {
      score += Math.min(daysOld * 0.5, 15); // Up to +15 points for older accounts
    }
    
    // Risk factor penalties
    profile.riskFactors.forEach(factor => {
      const penalty = factor.weight * (factor.severity === 'high' ? 3 : factor.severity === 'medium' ? 2 : 1);
      score -= penalty;
    });
    
    // Behavioral consistency bonus
    const avgBehavioralScore = profile.submissionHistory.reduce((sum, s) => sum + s.behavioralScore, 0) / 
                               Math.max(profile.submissionHistory.length, 1);
    if (avgBehavioralScore < 20) { // Low scores are good (less suspicious)
      score += 10;
    }
    
    // Clamp score between 0-100
    return Math.max(0, Math.min(100, score));
  }

  private determineRiskCategory(trustScore: number, riskFactors: RiskFactor[]): keyof typeof this.baseConfig {
    const highRiskFactors = riskFactors.filter(f => f.severity === 'high').length;
    const mediumRiskFactors = riskFactors.filter(f => f.severity === 'medium').length;
    
    // High-risk conditions
    if (highRiskFactors >= 2 || trustScore < 20) {
      return 'risky';
    }
    
    // Suspicious conditions
    if (highRiskFactors >= 1 || mediumRiskFactors >= 3 || trustScore < 40) {
      return 'suspicious';
    }
    
    // Trusted conditions
    if (trustScore > 80 && riskFactors.length === 0) {
      return 'trusted';
    }
    
    // Default to normal
    return 'normal';
  }

  private async applySystemAdjustments(
    riskCategory: keyof typeof this.baseConfig,
    profile: AdaptiveRateLimitProfile
  ): Promise<AdaptedLimits> {
    const baseLimits = { ...this.baseConfig[riskCategory] };
    
    // System load adjustments
    await this.updateSystemLoad();
    
    let adjustmentFactor = 1;
    
    // Increase restrictions during high system load
    if (this.systemLoad.cpuUsage > 80 || this.systemLoad.memoryUsage > 90) {
      adjustmentFactor *= 0.7; // Reduce limits by 30%
    } else if (this.systemLoad.cpuUsage > 60 || this.systemLoad.memoryUsage > 70) {
      adjustmentFactor *= 0.85; // Reduce limits by 15%
    }
    
    // Threat level adjustments
    switch (this.currentThreatLevel.current) {
      case 'critical':
        adjustmentFactor *= 0.3;
        break;
      case 'high':
        adjustmentFactor *= 0.5;
        break;
      case 'medium':
        adjustmentFactor *= 0.7;
        break;
      default:
        // No adjustment for low threat level
        break;
    }
    
    // Time-based adjustments (stricter during peak hours)
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 17) { // Business hours
      adjustmentFactor *= 0.9;
    }
    
    return {
      maxAttempts: Math.max(1, Math.floor(baseLimits.maxAttempts * adjustmentFactor)),
      windowMs: Math.floor(baseLimits.windowMs / adjustmentFactor),
      progressiveDelays: baseLimits.progressiveDelays.map(delay => 
        Math.floor(delay / adjustmentFactor)
      ),
      recoveryRate: Math.floor(baseLimits.recoveryRate / adjustmentFactor),
      requiresCaptcha: riskCategory === 'suspicious' || riskCategory === 'risky' || 
                       this.currentThreatLevel.current === 'high' || 
                       this.currentThreatLevel.current === 'critical',
      additionalVerification: riskCategory === 'risky' || this.currentThreatLevel.current === 'critical',
    };
  }

  private classifySubmissionSource(securityAnalysis: SecurityAnalysis, behavioralAnalysis: BehavioralAnalysis): 'manual' | 'automated' | 'suspicious' {
    if (securityAnalysis?.score > 60 || behavioralAnalysis?.suspiciousScore > 70) {
      return 'suspicious';
    }
    if (behavioralAnalysis?.suspiciousScore > 40 || securityAnalysis?.score > 30) {
      return 'automated';
    }
    return 'manual';
  }

  private identifyRiskFactors(securityAnalysis: SecurityAnalysis, behavioralAnalysis: BehavioralAnalysis): RiskFactor[] {
    const factors: RiskFactor[] = [];
    const now = Date.now();
    
    // Security-based risk factors
    if (securityAnalysis?.isSuspicious) {
      securityAnalysis.reasons.forEach((reason: string) => {
        factors.push({
          type: 'content',
          severity: securityAnalysis.score > 70 ? 'high' : 'medium',
          description: `Security concern: ${reason}`,
          timestamp: now,
          weight: securityAnalysis.score / 10,
        });
      });
    }
    
    // Behavioral risk factors
    if (behavioralAnalysis?.reasons) {
      behavioralAnalysis.reasons.forEach((reason: string) => {
        factors.push({
          type: 'behavioral',
          severity: behavioralAnalysis.suspiciousScore > 70 ? 'high' : 'medium',
          description: `Behavioral anomaly: ${reason}`,
          timestamp: now,
          weight: behavioralAnalysis.suspiciousScore / 15,
        });
      });
    }
    
    return factors;
  }

  private async updateSystemLoad(): Promise<void> {
    // Simulate system load monitoring
    // In production, this would integrate with actual system monitoring
    this.systemLoad = {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      activeConnections: Math.floor(Math.random() * 1000),
      requestRate: Math.floor(Math.random() * 100),
      errorRate: Math.random() * 10,
    };
    
    // Update threat level based on system conditions
    await this.updateThreatLevel();
  }

  private async updateThreatLevel(): Promise<void> {
    const factors: string[] = [];
    let threatScore = 0;
    
    // System overload indicators
    if (this.systemLoad.cpuUsage > 90) {
      factors.push('High CPU usage');
      threatScore += 30;
    }
    if (this.systemLoad.errorRate > 5) {
      factors.push('High error rate');
      threatScore += 25;
    }
    if (this.systemLoad.requestRate > 80) {
      factors.push('High request rate');
      threatScore += 20;
    }
    
    // Determine threat level
    let level: ThreatLevel['current'] = 'low';
    let action: ThreatLevel['recommendedAction'] = 'allow';
    
    if (threatScore > 70) {
      level = 'critical';
      action = 'block';
    } else if (threatScore > 50) {
      level = 'high';
      action = 'challenge';
    } else if (threatScore > 30) {
      level = 'medium';
      action = 'throttle';
    }
    
    this.currentThreatLevel = {
      current: level,
      factors,
      confidence: Math.min(0.9, 0.6 + (threatScore / 100) * 0.3),
      recommendedAction: action,
    };
  }

  // Public methods for external monitoring
  async updateSubmissionResult(identifier: string, success: boolean): Promise<void> {
    const profile = this.profiles.get(identifier);
    if (profile && profile.submissionHistory.length > 0) {
      // Update the most recent submission
      profile.submissionHistory[profile.submissionHistory.length - 1].success = success;
    }
  }

  getCurrentThreatLevel(): ThreatLevel {
    return this.currentThreatLevel;
  }

  getSystemLoad(): SystemLoad {
    return this.systemLoad;
  }

  getUserProfile(identifier: string): AdaptiveRateLimitProfile | undefined {
    return this.profiles.get(identifier);
  }

  // Cleanup method to prevent memory leaks
  cleanup(): void {
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    for (const [key, profile] of this.profiles.entries()) {
      if (profile.lastUpdated < weekAgo) {
        this.profiles.delete(key);
      }
    }
  }
}

export const adaptiveRateLimitService = AdaptiveRateLimitService.getInstance();
