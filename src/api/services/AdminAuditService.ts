import { apiClient } from '../client/ApiClient';
import { ApiResponse } from '@/types/common';

export interface AuditLogEntry {
  id: string;
  action: string;
  admin_email: string;
  target_entity: string;
  target_id: string;
  details?: any;
  created_at: string;
}

export class AdminAuditService {
  private static instance: AdminAuditService;

  private constructor() {}

  static getInstance(): AdminAuditService {
    if (!AdminAuditService.instance) {
      AdminAuditService.instance = new AdminAuditService();
    }
    return AdminAuditService.instance;
  }

  async logAdminAction(
    action: string,
    adminEmail: string,
    targetEntity: string,
    targetId: string,
    details?: any
  ): Promise<ApiResponse<void>> {
    try {
      const result = await apiClient.insert('audit_logs', {
        action,
        admin_email: adminEmail,
        target_entity: targetEntity,
        target_id: targetId,
        details: details ? JSON.stringify(details) : null
      });

      if (!result.success) {
        console.error('Failed to log admin action:', result.error);
        return {
          success: false,
          error: result.error || 'Failed to log admin action',
          data: undefined
        };
      }

      return {
        success: true,
        data: undefined,
        error: undefined
      };
    } catch (error) {
      console.error('Error logging admin action:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log admin action',
        data: undefined
      };
    }
  }

  async getAuditLogs(limit: number = 50): Promise<ApiResponse<AuditLogEntry[]>> {
    try {
      const result = await apiClient.select('audit_logs', {
        order: { column: 'created_at', ascending: false },
        limit
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to fetch audit logs',
          data: undefined
        };
      }

      // Cast via unknown first to satisfy TS when using lightweight rows
      const entries = result.data as unknown as AuditLogEntry[];

      return {
        success: true,
        data: entries,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }
}

export const adminAuditService = AdminAuditService.getInstance();
