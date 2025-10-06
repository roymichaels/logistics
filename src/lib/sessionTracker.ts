/**
 * SESSION TRACKER - Comprehensive Diagnostics
 *
 * This module provides real-time tracking and diagnostics for session and authentication issues.
 * Every checkpoint logs to console and stores in a trackable history.
 */

import { getSupabase } from './supabaseClient';

const supabase = getSupabase();

export interface SessionCheckpoint {
  timestamp: number;
  checkpoint: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

class SessionTracker {
  private checkpoints: SessionCheckpoint[] = [];
  private sessionEstablished = false;
  private claimsVerified = false;

  log(checkpoint: string, status: SessionCheckpoint['status'], message: string, data?: any) {
    const entry: SessionCheckpoint = {
      timestamp: Date.now(),
      checkpoint,
      status,
      message,
      data
    };

    this.checkpoints.push(entry);

    const emoji = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
    const style = status === 'success' ? 'color: green' : status === 'warning' ? 'color: orange' : 'color: red';

    console.log(
      `%c[SessionTracker] ${emoji} ${checkpoint}: ${message}`,
      style,
      data || ''
    );

    if (typeof window !== 'undefined') {
      (window as any).__SESSION_TRACKER__ = this.checkpoints;
    }
  }

  async verifySession(): Promise<{
    valid: boolean;
    hasSession: boolean;
    hasClaims: boolean;
    claims: any;
    errors: string[];
  }> {
    const errors: string[] = [];

    this.log('VERIFY_START', 'success', 'Starting session verification');

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        this.log('VERIFY_SESSION', 'error', 'Failed to get session', error);
        errors.push('Session fetch error: ' + error.message);
        return { valid: false, hasSession: false, hasClaims: false, claims: null, errors };
      }

      if (!session) {
        this.log('VERIFY_SESSION', 'error', 'No session found');
        errors.push('No active session');
        return { valid: false, hasSession: false, hasClaims: false, claims: null, errors };
      }

      this.log('VERIFY_SESSION', 'success', 'Session exists', {
        user_id: session.user.id,
        expires_at: session.expires_at
      });

      // Check claims in both app_metadata (old format) and direct JWT payload (new format)
      const appMetadata = session.user.app_metadata || {};

      // Decode JWT to check for custom claims at root level
      let jwtClaims = {};
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        jwtClaims = {
          user_id: payload.user_id,
          telegram_id: payload.telegram_id,
          role: payload.user_role || payload.role,
          app_role: payload.app_role,
          workspace_id: payload.workspace_id,
          provider: payload.app_metadata?.provider
        };

        this.log('JWT_DECODE', 'success', 'JWT payload decoded', {
          has_user_id: !!payload.user_id,
          has_telegram_id: !!payload.telegram_id,
          has_role: !!(payload.user_role || payload.role),
          provider: payload.app_metadata?.provider,
          sub: payload.sub
        });
      } catch (e) {
        this.log('JWT_DECODE', 'error', 'Could not decode JWT payload', e);
      }

      // Merge claims from both sources (JWT claims take precedence)
      const claims = { ...appMetadata, ...jwtClaims };

      const requiredClaims = ['role', 'telegram_id', 'user_id'];
      const missingClaims = requiredClaims.filter(c => !claims[c]);

      if (missingClaims.length > 0) {
        this.log('VERIFY_CLAIMS', 'error', `Missing claims: ${missingClaims.join(', ')}`, claims);
        errors.push(`Missing JWT claims: ${missingClaims.join(', ')}`);
        return { valid: false, hasSession: true, hasClaims: false, claims, errors };
      }

      this.log('VERIFY_CLAIMS', 'success', 'All required claims present', claims);
      this.sessionEstablished = true;
      this.claimsVerified = true;

      return { valid: true, hasSession: true, hasClaims: true, claims, errors: [] };

    } catch (err) {
      const error = err as Error;
      this.log('VERIFY_EXCEPTION', 'error', 'Verification exception', error);
      errors.push('Exception: ' + error.message);
      return { valid: false, hasSession: false, hasClaims: false, claims: null, errors };
    }
  }

  async waitForSession(maxWaitMs = 5000): Promise<boolean> {
    this.log('WAIT_START', 'success', `Waiting for session (max ${maxWaitMs}ms)`);

    const startTime = Date.now();
    let checkInterval = 100;
    let attempts = 0;

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.verifySession();
      attempts++;

      if (result.valid) {
        this.log('WAIT_SUCCESS', 'success', `Session ready after ${Date.now() - startTime}ms (${attempts} attempts)`);
        return true;
      }

      // Exponential backoff: start with 100ms, increase to max 500ms
      checkInterval = Math.min(500, checkInterval * 1.2);
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      // After 10 attempts without success, log a warning
      if (attempts === 10) {
        this.log('WAIT_EXTENDED', 'warning', 'Session still not ready after 10 attempts');
      }
    }

    this.log('WAIT_TIMEOUT', 'error', `Session not ready after ${maxWaitMs}ms (${attempts} attempts)`);
    return false;
  }

  getReport(): string {
    const report = this.checkpoints.map(cp => {
      const time = new Date(cp.timestamp).toISOString().split('T')[1].slice(0, -1);
      const emoji = cp.status === 'success' ? '✅' : cp.status === 'warning' ? '⚠️' : '❌';
      return `${time} ${emoji} [${cp.checkpoint}] ${cp.message}`;
    }).join('\n');

    return `
=== SESSION TRACKER REPORT ===
${report}

Session Established: ${this.sessionEstablished ? '✅' : '❌'}
Claims Verified: ${this.claimsVerified ? '✅' : '❌'}
Total Checkpoints: ${this.checkpoints.length}
============================
`;
  }

  getCheckpoints(): SessionCheckpoint[] {
    return [...this.checkpoints];
  }

  clear() {
    this.checkpoints = [];
    this.sessionEstablished = false;
    this.claimsVerified = false;
    this.log('TRACKER_CLEARED', 'success', 'Session tracker reset');
  }

  isReady(): boolean {
    return this.sessionEstablished && this.claimsVerified;
  }
}

export const sessionTracker = new SessionTracker();

export function printSessionReport() {
  console.log(sessionTracker.getReport());
}

if (typeof window !== 'undefined') {
  (window as any).sessionTracker = sessionTracker;
  (window as any).printSessionReport = printSessionReport;
}
