export function createSupabaseDataStore(supabase?: any): any {
  console.log('[STUB] createSupabaseDataStore - frontend-only mode');
  return null;
}

export interface ApproveUserRegistrationInput {}
export interface UpdateUserRegistrationRoleInput {}
export interface UpsertUserRegistrationInput {}

export async function approveUserRegistrationRecord(input: ApproveUserRegistrationInput): Promise<any> {
  console.log('[STUB] approveUserRegistrationRecord - frontend-only mode');
  return { error: new Error('Frontend-only mode') };
}

export async function deleteUserRegistrationRecord(id: string): Promise<any> {
  console.log('[STUB] deleteUserRegistrationRecord - frontend-only mode');
  return { error: new Error('Frontend-only mode') };
}

export async function fetchUserRegistrationRecord(id: string): Promise<any> {
  console.log('[STUB] fetchUserRegistrationRecord - frontend-only mode');
  return { data: null, error: new Error('Frontend-only mode') };
}

export async function listUserRegistrationRecords(): Promise<any> {
  console.log('[STUB] listUserRegistrationRecords - frontend-only mode');
  return { data: [], error: null };
}

export async function updateUserRegistrationRoleRecord(input: UpdateUserRegistrationRoleInput): Promise<any> {
  console.log('[STUB] updateUserRegistrationRoleRecord - frontend-only mode');
  return { error: new Error('Frontend-only mode') };
}

export async function upsertUserRegistrationRecord(input: UpsertUserRegistrationInput): Promise<any> {
  console.log('[STUB] upsertUserRegistrationRecord - frontend-only mode');
  return { error: new Error('Frontend-only mode') };
}
