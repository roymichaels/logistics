import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabaseClient';

export class EdgeFunctionError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.status = status;
    this.details = details;
  }
}

export interface SessionContext {
  supabase: SupabaseClient;
  session: Session;
}

export async function ensureSession(): Promise<SessionContext> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Failed to load session: ${error.message}`);
  }

  if (!data.session) {
    throw new Error('User is not authenticated');
  }

  return { supabase, session: data.session };
}

export async function callEdgeFunction<T>(
  supabase: SupabaseClient,
  functionName: string,
  body?: Record<string, unknown | null>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (error) {
    const message = error.message || `Failed to execute ${functionName}`;
    throw new EdgeFunctionError(message, (error as any).status, (error as any).details);
  }

  if (data === null || data === undefined) {
    throw new EdgeFunctionError(`No response returned from ${functionName}`);
  }

  return data;
}
