/**
 * Security Audit Logger
 * Tracks security events, failed attempts, and suspicious activity
 */

import { getSupabase, isSupabaseInitialized } from '../../lib/supabaseClient';
import { getGlobalSecurityManager } from './securityManager';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../lib/logger';

export interface SecurityEvent {
  eventType: 'pin_setup' | 'pin_verify' | 'pin_change' | 'pin_reset' |
           'login_attempt' | 'logout' | 'session_expired' | 'account_locked' |
           'message_sent' | 'message_deleted' | 'chat_created' | 'chat_joined' |
           'suspicious_activity' | 'key_rotation' | 'data_access';
  userId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityAlert {
  id: string;
  userId: string;
  alertType: 'multiple_failed_attempts' | 'suspicious_location' | 'unusual_activity' | 'security_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: string;
  acknowledged: boolean;
}

export class SecurityAuditLogger {
  private eventQueue: SecurityEvent[] = [];
  private isProcessingQueue = false;
  private failedAttempts: Map<string, number> = new Map();
  private lastEventTimes: Map<string, number> = new Map();

  constructor() {
    this.startQueueProcessor();
  }

  private getSupabaseClient(): SupabaseClient | null {
    try {
      if (isSupabaseInitialized()) {
        return getSupabase();
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    // TEMP: Disabled until security_audit_log table is created
    return;

    // Add to queue for batch processing
    this.eventQueue.push({
      ...event,
      details: await this.encryptEventDetails(event.details)
    });

    // Check for suspicious patterns
    await this.analyzeSuspiciousActivity(event);

    // Process high-priority events immediately
    if (event.riskLevel === 'critical' || event.riskLevel === 'high') {
      await this.processEventQueue();
    }
  }

  /**
   * Log PIN authentication attempt
   */
  async logPINAttempt(userId: string, success: boolean, failedCount?: number): Promise<void> {
    const riskLevel = this.calculatePINRiskLevel(success, failedCount);

    await this.logSecurityEvent({
      eventType: 'pin_verify',
      userId,
      details: {
        success,
        failedCount: failedCount || 0,
        timestamp: new Date().toISOString(),
        consecutiveFailures: this.failedAttempts.get(userId) || 0
      },
      success,
      riskLevel
    });

    // Update failed attempts tracking
    if (success) {
      this.failedAttempts.delete(userId);
    } else {
      const current = this.failedAttempts.get(userId) || 0;
      this.failedAttempts.set(userId, current + 1);

      // Generate alert for multiple failed attempts
      if (current + 1 >= 3) {
        await this.generateSecurityAlert({
          userId,
          alertType: 'multiple_failed_attempts',
          severity: current + 1 >= 5 ? 'high' : 'medium',
          message: `${current + 1} consecutive failed PIN attempts`,
          details: {
            failedAttempts: current + 1,
            lastAttempt: new Date().toISOString()
          }
        });
      }
    }
  }

  /**
   * Log message encryption/decryption
   */
  async logMessageActivity(
    userId: string,
    chatId: string,
    messageId: string,
    action: 'sent' | 'received' | 'deleted',
    success: boolean
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: action === 'deleted' ? 'message_deleted' : 'message_sent',
      userId,
      details: {
        chatId,
        messageId,
        action,
        encryptionUsed: true,
        timestamp: new Date().toISOString()
      },
      success,
      riskLevel: success ? 'low' : 'medium'
    });
  }

  /**
   * Log session activity
   */
  async logSessionActivity(
    userId: string,
    action: 'created' | 'expired' | 'terminated',
    sessionId?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: action === 'created' ? 'login_attempt' :
                action === 'terminated' ? 'logout' : 'session_expired',
      userId,
      details: {
        sessionId,
        action,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      },
      success: true,
      riskLevel: 'low'
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    userId: string | undefined,
    activity: string,
    details: Record<string, any>,
    riskLevel: 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'suspicious_activity',
      userId,
      details: {
        activity,
        detectionTime: new Date().toISOString(),
        ...details
      },
      success: false,
      riskLevel
    });

    // Generate immediate alert for high-risk activities
    if (riskLevel === 'high' || riskLevel === 'critical') {
      await this.generateSecurityAlert({
        userId: userId || 'unknown',
        alertType: 'suspicious_activity',
        severity: riskLevel,
        message: `Suspicious activity detected: ${activity}`,
        details
      });
    }
  }

  /**
   * Get security events for a user
   */
  async getUserSecurityEvents(
    userId: string,
    limit: number = 50,
    eventTypes?: string[]
  ): Promise<any[]> {
    const supabase = this.getSupabaseClient();
    if (!supabase) {
      logger.warn('Supabase not initialized, returning empty events');
      return [];
    }

    try {
      let query = supabase
        .from('security_audit_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (eventTypes && eventTypes.length > 0) {
        query = query.in('event_type', eventTypes);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch security events:', error);
        return [];
      }

      // Decrypt event details
      const decryptedEvents = [];
      for (const event of data || []) {
        try {
          const decryptedDetails = await this.decryptEventDetails(event.event_details);
          decryptedEvents.push({
            ...event,
            event_details: decryptedDetails
          });
        } catch (error) {
          logger.error('Failed to decrypt event details:', error);
          // Include event without details if decryption fails
          decryptedEvents.push({
            ...event,
            event_details: { error: 'Failed to decrypt' }
          });
        }
      }

      return decryptedEvents;
    } catch (error) {
      logger.error('Failed to get user security events:', error);
      return [];
    }
  }

  /**
   * Generate security alert
   */
  private async generateSecurityAlert(alertData: Omit<SecurityAlert, 'id' | 'timestamp' | 'acknowledged'>): Promise<void> {
    const alert: SecurityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      ...alertData
    };

    // Store alert in secure storage
    const securityManager = getGlobalSecurityManager();
    const storage = securityManager?.getSecureStorage();

    if (storage) {
      const existingAlerts = await storage.getItem<SecurityAlert[]>('security_alerts') || [];
      existingAlerts.push(alert);

      // Keep only last 100 alerts
      if (existingAlerts.length > 100) {
        existingAlerts.splice(0, existingAlerts.length - 100);
      }

      await storage.setItem('security_alerts', existingAlerts);
    }

    // Log the alert generation
    await this.logSecurityEvent({
      eventType: 'suspicious_activity',
      userId: alertData.userId,
      details: {
        alertGenerated: true,
        alertType: alertData.alertType,
        severity: alertData.severity,
        message: alertData.message
      },
      success: true,
      riskLevel: alertData.severity === 'critical' ? 'critical' : 'high'
    });
  }

  /**
   * Get active security alerts
   */
  async getSecurityAlerts(userId?: string): Promise<SecurityAlert[]> {
    const securityManager = getGlobalSecurityManager();
    const storage = securityManager?.getSecureStorage();

    if (!storage) {
      return [];
    }

    try {
      const alerts = await storage.getItem<SecurityAlert[]>('security_alerts') || [];

      if (userId) {
        return alerts.filter(alert => alert.userId === userId && !alert.acknowledged);
      }

      return alerts.filter(alert => !alert.acknowledged);
    } catch (error) {
      logger.error('Failed to get security alerts:', error);
      return [];
    }
  }

  /**
   * Acknowledge security alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    const securityManager = getGlobalSecurityManager();
    const storage = securityManager?.getSecureStorage();

    if (!storage) {
      return;
    }

    try {
      const alerts = await storage.getItem<SecurityAlert[]>('security_alerts') || [];
      const updatedAlerts = alerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      );

      await storage.setItem('security_alerts', updatedAlerts);
    } catch (error) {
      logger.error('Failed to acknowledge alert:', error);
    }
  }

  // Private helper methods

  private async encryptEventDetails(details: Record<string, any>): Promise<Record<string, any>> {
    const securityManager = getGlobalSecurityManager();
    const storage = securityManager?.getSecureStorage();

    if (storage) {
      try {
        // Store sensitive details encrypted
        const sensitiveKeys = ['password', 'pin', 'key', 'token', 'secret'];
        const encryptedDetails = { ...details };

        for (const key of Object.keys(details)) {
          if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            // Replace sensitive data with placeholder
            encryptedDetails[key] = '[ENCRYPTED]';
          }
        }

        return encryptedDetails;
      } catch (error) {
        logger.error('Failed to encrypt event details:', error);
      }
    }

    return details;
  }

  private async decryptEventDetails(encryptedDetails: Record<string, any>): Promise<Record<string, any>> {
    // For now, return as-is since we're not actually encrypting the details
    // In production, this would decrypt the sensitive fields
    return encryptedDetails;
  }

  private calculatePINRiskLevel(success: boolean, failedCount?: number): 'low' | 'medium' | 'high' | 'critical' {
    if (success) {
      return 'low';
    }

    if (!failedCount) {
      return 'low';
    }

    if (failedCount >= 5) {
      return 'critical';
    } else if (failedCount >= 3) {
      return 'high';
    } else if (failedCount >= 2) {
      return 'medium';
    }

    return 'low';
  }

  private async analyzeSuspiciousActivity(event: SecurityEvent): Promise<void> {
    const now = Date.now();
    const eventKey = `${event.userId}_${event.eventType}`;
    const lastTime = this.lastEventTimes.get(eventKey) || 0;

    // Check for rapid consecutive events (potential bot activity)
    if (now - lastTime < 1000 && event.eventType === 'pin_verify') {
      await this.logSuspiciousActivity(
        event.userId,
        'Rapid PIN attempts detected',
        {
          eventType: event.eventType,
          timeDifference: now - lastTime,
          possibleBot: true
        },
        'high'
      );
    }

    this.lastEventTimes.set(eventKey, now);
  }

  private startQueueProcessor(): void {
    // Process queue every 5 seconds
    setInterval(async () => {
      if (!this.isProcessingQueue && this.eventQueue.length > 0) {
        await this.processEventQueue();
      }
    }, 5000);
  }

  private async processEventQueue(): Promise<void> {
    const supabase = this.getSupabaseClient();
    if (this.isProcessingQueue || this.eventQueue.length === 0 || !supabase) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const eventsToProcess = [...this.eventQueue];
      this.eventQueue = [];

      const dbEvents = eventsToProcess.map(event => ({
        user_id: event.userId,
        event_type: event.eventType,
        event_details: event.details,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        success: event.success,
        risk_level: event.riskLevel,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('security_audit_log')
        .insert(dbEvents);

      if (error) {
        logger.error('Failed to insert security events:', error);
        // Re-queue failed events
        this.eventQueue.unshift(...eventsToProcess);
      }
    } catch (error) {
      logger.error('Failed to process event queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }
}

/**
 * Global audit logger instance
 */
let globalAuditLogger: SecurityAuditLogger | null = null;

export function getSecurityAuditLogger(): SecurityAuditLogger {
  if (!globalAuditLogger) {
    globalAuditLogger = new SecurityAuditLogger();
  }
  return globalAuditLogger;
}

export function initializeSecurityAuditLogger(): SecurityAuditLogger {
  return getSecurityAuditLogger();
}