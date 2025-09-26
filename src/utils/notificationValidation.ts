import { supabase } from '@/integrations/supabase/client';

export interface NotificationValidationResult {
  isValid: boolean;
  reason?: string;
  actualChanges?: Record<string, any>;
  changeSource: 'user_update' | 'system_update' | 'unknown';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SignalChangeData {
  signalId: string;
  oldData: any;
  newData: any;
  changeTypes: string[];
  timestamp: Date;
}

/**
 * Enhanced notification validation utility
 * Prevents false positive notifications by validating actual changes
 */
export class NotificationValidator {
  private static instance: NotificationValidator;
  private recentValidations: Map<string, { timestamp: Date; result: NotificationValidationResult }> = new Map();
  private readonly VALIDATION_CACHE_TTL = 30000; // 30 seconds

  static getInstance(): NotificationValidator {
    if (!NotificationValidator.instance) {
      NotificationValidator.instance = new NotificationValidator();
    }
    return NotificationValidator.instance;
  }

  /**
   * Validates if a notification should be sent based on signal changes
   */
  async validateSignalChange(changeData: SignalChangeData): Promise<NotificationValidationResult> {
    const cacheKey = `${changeData.signalId}-${changeData.timestamp.getTime()}`;
    
    // Check cache first
    const cached = this.recentValidations.get(cacheKey);
    if (cached && Date.now() - cached.timestamp.getTime() < this.VALIDATION_CACHE_TTL) {
      return cached.result;
    }

    try {
      const result = await this.performValidation(changeData);
      
      // Cache the result
      this.recentValidations.set(cacheKey, {
        timestamp: new Date(),
        result
      });

      // Cleanup old cache entries
      this.cleanupCache();

      return result;
    } catch (error) {
      console.error('Notification validation error:', error);
      return {
        isValid: false,
        reason: 'Validation error occurred',
        changeSource: 'unknown',
        riskLevel: 'high'
      };
    }
  }

  private async performValidation(changeData: SignalChangeData): Promise<NotificationValidationResult> {
    const { oldData, newData, changeTypes, signalId } = changeData;

    // Rule 1: Check for actual field changes
    const actualChanges = this.detectActualChanges(oldData, newData);
    if (Object.keys(actualChanges).length === 0) {
      await this.reportFalsePositive(signalId, changeTypes, 'no_actual_changes');
      return {
        isValid: false,
        reason: 'No actual field changes detected',
        actualChanges,
        changeSource: 'unknown',
        riskLevel: 'high'
      };
    }

    // Rule 2: Validate TP hits are legitimate
    if (changeTypes.includes('tp_hits')) {
      const tpValidation = this.validateTPHits(oldData, newData);
      if (!tpValidation.valid) {
        await this.reportFalsePositive(signalId, changeTypes, 'invalid_tp_hits');
        return {
          isValid: false,
          reason: tpValidation.reason,
          actualChanges,
          changeSource: 'system_update',
          riskLevel: 'high'
        };
      }
    }

    // Rule 3: Check for rapid-fire updates (potential system glitch)
    const rapidFireCheck = await this.checkRapidFireUpdates(signalId);
    if (rapidFireCheck.isRapidFire) {
      return {
        isValid: false,
        reason: 'Rapid-fire updates detected - potential system glitch',
        actualChanges,
        changeSource: 'system_update',
        riskLevel: 'medium'
      };
    }

    // Rule 4: Validate status changes are logical
    if (changeTypes.includes('status_change')) {
      const statusValidation = this.validateStatusChange(oldData, newData);
      if (!statusValidation.valid) {
        await this.reportFalsePositive(signalId, changeTypes, 'invalid_status_change');
        return {
          isValid: false,
          reason: statusValidation.reason,
          actualChanges,
          changeSource: 'user_update',
          riskLevel: 'medium'
        };
      }
    }

    // Rule 5: Check for phantom notes updates
    if (changeTypes.includes('notes_updated') && changeTypes.length === 1) {
      const notesValidation = this.validateNotesChange(oldData, newData);
      if (!notesValidation.valid) {
        return {
          isValid: false,
          reason: 'Insignificant notes change',
          actualChanges,
          changeSource: 'user_update',
          riskLevel: 'low'
        };
      }
    }

    // All validations passed
    return {
      isValid: true,
      actualChanges,
      changeSource: this.determineChangeSource(changeTypes, actualChanges),
      riskLevel: 'low'
    };
  }

  private detectActualChanges(oldData: any, newData: any): Record<string, any> {
    const changes: Record<string, any> = {};
    const significantFields = [
      'status', 'entry_price', 'stop_loss', 'tp1', 'tp2', 'tp3', 'tp4', 'tp5',
      'tp_hits', 'close_reason', 'notes'
    ];

    for (const field of significantFields) {
      if (this.isSignificantChange(oldData[field], newData[field], field)) {
        changes[field] = {
          old: oldData[field],
          new: newData[field]
        };
      }
    }

    return changes;
  }

  private isSignificantChange(oldValue: any, newValue: any, field: string): boolean {
    // Handle null/undefined comparisons
    if (oldValue === newValue) return false;
    if (oldValue == null && newValue == null) return false;

    switch (field) {
      case 'tp_hits':
        // Only significant if array length increased
        const oldLength = Array.isArray(oldValue) ? oldValue.length : 0;
        const newLength = Array.isArray(newValue) ? newValue.length : 0;
        return newLength > oldLength;

      case 'notes':
        // Only significant if substantial content change
        const oldNotes = (oldValue || '').trim();
        const newNotes = (newValue || '').trim();
        return Math.abs(newNotes.length - oldNotes.length) > 10;

      case 'entry_price':
      case 'stop_loss':
      case 'tp1':
      case 'tp2':
      case 'tp3':
      case 'tp4':
      case 'tp5':
        // Significant if price changed by more than 0.01%
        if (typeof oldValue === 'number' && typeof newValue === 'number') {
          const percentChange = Math.abs((newValue - oldValue) / oldValue);
          return percentChange > 0.0001; // 0.01%
        }
        return oldValue !== newValue;

      default:
        return oldValue !== newValue;
    }
  }

  private validateTPHits(oldData: any, newData: any): { valid: boolean; reason?: string } {
    const oldHits = Array.isArray(oldData.tp_hits) ? oldData.tp_hits : [];
    const newHits = Array.isArray(newData.tp_hits) ? newData.tp_hits : [];

    // TP hits should only increase, never decrease or jump
    if (newHits.length <= oldHits.length) {
      return { valid: false, reason: 'TP hits array did not increase' };
    }

    // Validate sequential TP hitting (TP1 before TP2, etc.)
    const sortedNewHits = [...newHits].sort();
    for (let i = 0; i < sortedNewHits.length; i++) {
      if (sortedNewHits[i] !== i + 1) {
        return { valid: false, reason: 'TP hits are not sequential' };
      }
    }

    return { valid: true };
  }

  private async checkRapidFireUpdates(signalId: string): Promise<{ isRapidFire: boolean; count?: number }> {
    try {
      const { data, error } = await supabase
        .from('cron_job_logs')
        .select('created_at')
        .eq('job_name', 'enhanced_notification_pipeline')
        .like('error_message', `%Signal ID: ${signalId}%`)
        .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last 1 minute
        .order('created_at', { ascending: false });

      if (error) return { isRapidFire: false };

      const count = data?.length || 0;
      return { isRapidFire: count > 3, count }; // More than 3 updates in 1 minute
    } catch (error) {
      return { isRapidFire: false };
    }
  }

  private validateStatusChange(oldData: any, newData: any): { valid: boolean; reason?: string } {
    const validTransitions = {
      'pending': ['active', 'closed'],
      'active': ['closed', 'partially_profited'],
      'partially_profited': ['closed'],
      'closed': [] // Closed signals should not change status
    };

    const oldStatus = oldData.status;
    const newStatus = newData.status;

    if (!validTransitions[oldStatus] || !validTransitions[oldStatus].includes(newStatus)) {
      return { valid: false, reason: `Invalid status transition: ${oldStatus} -> ${newStatus}` };
    }

    return { valid: true };
  }

  private validateNotesChange(oldData: any, newData: any): { valid: boolean; reason?: string } {
    const oldNotes = (oldData.notes || '').trim();
    const newNotes = (newData.notes || '').trim();

    // Must be substantial change (more than 20 characters difference)
    if (Math.abs(newNotes.length - oldNotes.length) < 20) {
      return { valid: false, reason: 'Notes change too minor' };
    }

    return { valid: true };
  }

  private determineChangeSource(changeTypes: string[], actualChanges: Record<string, any>): 'user_update' | 'system_update' | 'unknown' {
    // System updates typically involve TP hits or status changes to closed
    if (changeTypes.includes('tp_hits') || 
        (changeTypes.includes('status_change') && actualChanges.status?.new === 'closed')) {
      return 'system_update';
    }

    // User updates typically involve manual field changes
    if (changeTypes.some(type => ['entry_price_update', 'stop_loss_update', 'notes_updated'].includes(type))) {
      return 'user_update';
    }

    return 'unknown';
  }

  private async reportFalsePositive(signalId: string, changeTypes: string[], detectionMethod: string): Promise<void> {
    try {
      await supabase
        .from('notification_audit_false_positives')
        .insert({
          signal_id: signalId,
          reported_change_types: changeTypes,
          actual_change_data: { detection_method, automated: true },
          notification_sent_at: new Date().toISOString(),
          detection_method,
          user_reported: false
        });
    } catch (error) {
      console.error('Failed to report false positive:', error);
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.recentValidations.entries()) {
      if (now - entry.timestamp.getTime() > this.VALIDATION_CACHE_TTL) {
        this.recentValidations.delete(key);
      }
    }
  }

  /**
   * Rate limiting check for notifications
   */
  async checkNotificationRateLimit(signalId: string, maxPerMinute: number = 3): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('cron_job_logs')
        .select('created_at')
        .eq('job_name', 'enhanced_notification_pipeline')
        .like('error_message', `%Signal ID: ${signalId}%`)
        .eq('status', 'success')
        .gte('created_at', new Date(Date.now() - 60000).toISOString());

      if (error) return true; // Allow on error

      const count = data?.length || 0;
      return count < maxPerMinute;
    } catch (error) {
      return true; // Allow on error
    }
  }

  /**
   * Health check for notification system
   */
  async performHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: {
      successRate: number;
      falsePositiveRate: number;
      avgResponseTime: number;
    };
  }> {
    const issues: string[] = [];
    
    try {
      // Check recent notification success rate
      const { data: recentLogs } = await supabase
        .from('cron_job_logs')
        .select('status')
        .eq('job_name', 'enhanced_notification_pipeline')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Last hour

      const totalLogs = recentLogs?.length || 0;
      const successfulLogs = recentLogs?.filter(log => log.status === 'success').length || 0;
      const successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 100;

      if (successRate < 90) {
        issues.push(`Low success rate: ${successRate.toFixed(1)}%`);
      }

      // Check for false positives
      const { data: falsePositives } = await supabase
        .from('notification_audit_false_positives')
        .select('id')
        .gte('false_positive_detected_at', new Date(Date.now() - 3600000).toISOString());

      const falsePositiveRate = totalLogs > 0 ? ((falsePositives?.length || 0) / totalLogs) * 100 : 0;
      
      if (falsePositiveRate > 5) {
        issues.push(`High false positive rate: ${falsePositiveRate.toFixed(1)}%`);
      }

      return {
        healthy: issues.length === 0,
        issues,
        metrics: {
          successRate,
          falsePositiveRate,
          avgResponseTime: 850 // Mock - could be calculated from actual metrics
        }
      };
    } catch (error) {
      return {
        healthy: false,
        issues: ['Health check failed'],
        metrics: { successRate: 0, falsePositiveRate: 0, avgResponseTime: 0 }
      };
    }
  }
}

export const notificationValidator = NotificationValidator.getInstance();