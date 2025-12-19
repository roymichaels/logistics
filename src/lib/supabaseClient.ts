export async function initSupabase(): Promise<any> {
  console.log('[STUB] initSupabase - frontend-only mode');
  return null;
}

export function getSupabase(): any {
  console.log('[STUB] getSupabase - frontend-only mode');
  return null;
}

export const supabase: any = null;
export const supabaseClient: any = null;

export function isSupabaseInitialized(): boolean {
  return false;
}

export async function waitForSupabaseInit(): Promise<void> {
  return Promise.resolve();
}

export async function loadConfig(): Promise<void> {
  console.log('[STUB] loadConfig - frontend-only mode');
  return Promise.resolve();
}
