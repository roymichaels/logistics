import { isSupabaseInitialized } from './supabaseClient';

export interface InitializationStatus {
  supabaseInitialized: boolean;
  telegramAvailable: boolean;
  telegramInitData: boolean;
  telegramUser: boolean;
  timestamp: string;
  userAgent: string;
  location: string;
}

export function getInitializationStatus(): InitializationStatus {
  const tg = (window as any).Telegram?.WebApp;

  return {
    supabaseInitialized: isSupabaseInitialized(),
    telegramAvailable: !!(window as any).Telegram?.WebApp,
    telegramInitData: !!(tg?.initData && tg.initData.length > 0),
    telegramUser: !!tg?.initDataUnsafe?.user,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    location: window.location.href,
  };
}

export function logInitializationStatus() {
  const status = getInitializationStatus();
  console.log('📊 Initialization Status:', status);

  if (!status.supabaseInitialized) {
    console.warn('⚠️ Supabase is not initialized');
  }

  if (!status.telegramAvailable) {
    console.warn('⚠️ Telegram WebApp SDK is not available');
  }

  if (!status.telegramInitData) {
    console.warn('⚠️ Telegram initData is empty');
  }

  if (!status.telegramUser) {
    console.warn('⚠️ Telegram user data is not available');
  }

  return status;
}

export function runFullDiagnostics() {
  console.log('🔍 === FULL INITIALIZATION DIAGNOSTICS ===');

  const status = logInitializationStatus();

  console.log('\n📦 Window Objects:');
  console.log('  __SUPABASE_CLIENT__:', !!(window as any).__SUPABASE_CLIENT__);
  console.log('  __SUPABASE_INITIALIZED__:', !!(window as any).__SUPABASE_INITIALIZED__);
  console.log('  __SUPABASE_SESSION__:', !!(window as any).__SUPABASE_SESSION__);
  console.log('  __JWT_CLAIMS__:', !!(window as any).__JWT_CLAIMS__);
  console.log('  Telegram:', !!(window as any).Telegram);
  console.log('  Telegram.WebApp:', !!(window as any).Telegram?.WebApp);

  if ((window as any).Telegram?.WebApp) {
    const tg = (window as any).Telegram.WebApp;
    console.log('\n📱 Telegram WebApp Details:');
    console.log('  version:', tg.version);
    console.log('  platform:', tg.platform);
    console.log('  colorScheme:', tg.colorScheme);
    console.log('  isExpanded:', tg.isExpanded);
    console.log('  viewportHeight:', tg.viewportHeight);
    console.log('  initData length:', tg.initData?.length || 0);
    console.log('  initData preview:', tg.initData?.substring(0, 100) || 'EMPTY');
    console.log('  user:', tg.initDataUnsafe?.user || 'NO USER');
  }

  if ((window as any).__SUPABASE_SESSION__) {
    const session = (window as any).__SUPABASE_SESSION__;
    console.log('\n🔐 Session Details:');
    console.log('  user.id:', session.user?.id);
    console.log('  access_token length:', session.access_token?.length || 0);
    console.log('  expires_at:', session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none');
  }

  if ((window as any).__JWT_CLAIMS__) {
    console.log('\n🎫 JWT Claims:', (window as any).__JWT_CLAIMS__);
  }

  console.log('\n🔍 === END DIAGNOSTICS ===\n');

  return status;
}

// Expose to window for easy access
if (typeof window !== 'undefined') {
  (window as any).getInitStatus = getInitializationStatus;
  (window as any).logInitStatus = logInitializationStatus;
  (window as any).runFullDiagnostics = runFullDiagnostics;
  console.log('💡 Diagnostics available: window.runFullDiagnostics()');
}
