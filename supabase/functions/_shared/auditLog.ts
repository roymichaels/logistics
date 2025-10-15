import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { HttpError } from './tenantGuard.ts';

export type AuditSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogPayload {
  eventType: string;
  action?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  businessId?: string;
  infrastructureId?: string;
  actorId?: string;
  actorRole?: string;
  changeSummary?: string;
  severity?: AuditSeverity;
  metadata?: Record<string, unknown>;
  previousState?: unknown;
  newState?: unknown;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

export async function logAuditEvent(
  supabase: SupabaseClient,
  payload: AuditLogPayload
): Promise<void> {
  const auditPayload = {
    event_type: payload.eventType,
    action: payload.action,
    target_entity_type: payload.targetEntityType,
    target_entity_id: payload.targetEntityId,
    business_id: payload.businessId,
    infrastructure_id: payload.infrastructureId,
    actor_id: payload.actorId,
    actor_role: payload.actorRole,
    change_summary: payload.changeSummary,
    severity: payload.severity,
    metadata: payload.metadata ?? {},
    previous_state: payload.previousState ?? null,
    new_state: payload.newState ?? null,
    ip_address: payload.ipAddress,
    user_agent: payload.userAgent,
    session_id: payload.sessionId,
    request_id: payload.requestId,
  };

  const { error } = await supabase.rpc('audit_log', { payload: auditPayload }).maybeSingle();

  if (error) {
    throw new HttpError(500, 'Failed to write audit log entry', { details: error });
  }
}
