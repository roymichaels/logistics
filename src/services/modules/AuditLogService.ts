import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { BaseService } from './BaseService';

export interface AuditLog {
  id: string;
  business_id: string;
  user_id: string;
  user_email?: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  changes: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AuditLogFilter {
  action?: 'INSERT' | 'UPDATE' | 'DELETE' | 'all';
  tableName?: string;
  userId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  total: number;
  inserts: number;
  updates: number;
  deletes: number;
  uniqueTables: string[];
  uniqueUsers: string[];
}

export class AuditLogService extends BaseService {
  /**
   * Get audit logs for a business with optional filters
   */
  async getAuditLogs(
    businessId: string,
    filters?: AuditLogFilter
  ): Promise<AuditLog[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('business_id', businessId);

      if (filters?.action && filters.action !== 'all') {
        query = query.eq('action', filters.action);
      }

      if (filters?.tableName) {
        query = query.eq('table_name', filters.tableName);
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 500);

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 500) - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('[AuditLogService] Error fetching audit logs:', error);
        throw error;
      }

      const enrichedLogs = await this.enrichWithUserInfo(data || []);

      if (filters?.searchQuery) {
        return this.filterBySearch(enrichedLogs, filters.searchQuery);
      }

      return enrichedLogs;
    } catch (error) {
      logger.error('[AuditLogService] Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit log statistics
   */
  async getAuditStats(businessId: string, dateRange?: { start: string; end: string }): Promise<AuditLogStats> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('action, table_name, user_id')
        .eq('business_id', businessId);

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('[AuditLogService] Error fetching audit stats:', error);
        throw error;
      }

      const logs = data || [];

      return {
        total: logs.length,
        inserts: logs.filter(l => l.action === 'INSERT').length,
        updates: logs.filter(l => l.action === 'UPDATE').length,
        deletes: logs.filter(l => l.action === 'DELETE').length,
        uniqueTables: [...new Set(logs.map(l => l.table_name))],
        uniqueUsers: [...new Set(logs.map(l => l.user_id).filter(Boolean))]
      };
    } catch (error) {
      logger.error('[AuditLogService] Failed to get audit stats:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific record
   */
  async getRecordHistory(
    businessId: string,
    tableName: string,
    recordId: string
  ): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('business_id', businessId)
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[AuditLogService] Error fetching record history:', error);
        throw error;
      }

      return await this.enrichWithUserInfo(data || []);
    } catch (error) {
      logger.error('[AuditLogService] Failed to get record history:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserActivity(
    businessId: string,
    userId: string,
    dateRange?: { start: string; end: string }
  ): Promise<AuditLog[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('business_id', businessId)
        .eq('user_id', userId);

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      query = query.order('created_at', { ascending: false }).limit(100);

      const { data, error } = await query;

      if (error) {
        logger.error('[AuditLogService] Error fetching user activity:', error);
        throw error;
      }

      return await this.enrichWithUserInfo(data || []);
    } catch (error) {
      logger.error('[AuditLogService] Failed to get user activity:', error);
      throw error;
    }
  }

  /**
   * Create an audit log entry
   */
  async createAuditLog(
    businessId: string,
    userId: string,
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    tableName: string,
    recordId: string,
    changes: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          business_id: businessId,
          user_id: userId,
          action,
          table_name: tableName,
          record_id: recordId,
          changes,
          metadata
        })
        .select()
        .single();

      if (error) {
        logger.error('[AuditLogService] Error creating audit log:', error);
        throw error;
      }

      logger.info('[AuditLogService] Audit log created:', {
        action,
        table: tableName,
        record: recordId
      });

      return data;
    } catch (error) {
      logger.error('[AuditLogService] Failed to create audit log:', error);
      throw error;
    }
  }

  /**
   * Export audit logs to CSV
   */
  async exportAuditLogs(
    businessId: string,
    filters?: AuditLogFilter
  ): Promise<string> {
    try {
      const logs = await this.getAuditLogs(businessId, filters);

      const headers = ['תאריך', 'פעולה', 'טבלה', 'משתמש', 'מזהה רשומה'];
      const rows = logs.map(log => [
        new Date(log.created_at).toLocaleString('he-IL'),
        this.getActionLabel(log.action),
        this.getTableLabel(log.table_name),
        log.user_email || 'Unknown',
        log.record_id.slice(0, 8)
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      return csv;
    } catch (error) {
      logger.error('[AuditLogService] Failed to export audit logs:', error);
      throw error;
    }
  }

  /**
   * Enrich logs with user information
   */
  private async enrichWithUserInfo(logs: any[]): Promise<AuditLog[]> {
    const userIds = [...new Set(logs.map(log => log.user_id).filter(Boolean))];

    if (userIds.length === 0) {
      return logs.map(log => ({ ...log, user_email: 'Unknown' }));
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    const userMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

    return logs.map(log => ({
      ...log,
      user_email: userMap.get(log.user_id) || 'Unknown'
    }));
  }

  /**
   * Filter logs by search query
   */
  private filterBySearch(logs: AuditLog[], searchQuery: string): AuditLog[] {
    const query = searchQuery.toLowerCase();
    return logs.filter(
      log =>
        log.user_email?.toLowerCase().includes(query) ||
        log.table_name.toLowerCase().includes(query) ||
        log.record_id.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query)
    );
  }

  /**
   * Get Hebrew action label
   */
  private getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      INSERT: 'יצירה',
      UPDATE: 'עדכון',
      DELETE: 'מחיקה'
    };
    return labels[action] || action;
  }

  /**
   * Get Hebrew table label
   */
  private getTableLabel(tableName: string): string {
    const labels: Record<string, string> = {
      orders: 'הזמנות',
      products: 'מוצרים',
      inventory: 'מלאי',
      drivers: 'נהגים',
      profiles: 'משתמשים',
      businesses: 'עסק',
      zones: 'אזורים',
      order_items: 'פריטי הזמנה',
      tasks: 'משימות',
      tickets: 'פניות'
    };
    return labels[tableName] || tableName;
  }
}
