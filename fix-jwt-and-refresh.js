/**
 * FIX JWT AND REFRESH SESSION
 *
 * This script will:
 * 1. Call the sync-user-claims edge function to update your JWT
 * 2. Refresh your session to get the new JWT
 * 3. Clear cache and reload the app
 *
 * INSTRUCTIONS:
 * 1. Open your browser's Developer Console (F12)
 * 2. Copy and paste this entire script
 * 3. Press Enter to run it
 * 4. The page will automatically reload with your new business owner role
 */

(async function fixJWTAndRefresh() {
  console.log('🔧 Starting JWT fix and refresh...');

  try {
    // Get Supabase client from window (assuming it's available globally)
    const supabase = window.supabase ||
                     window.__SUPABASE_CLIENT__ ||
                     JSON.parse(localStorage.getItem('supabase.auth.token'))?.currentSession;

    if (!supabase && !localStorage.getItem('supabase.auth.token')) {
      console.error('❌ Could not find Supabase client or session');
      console.log('💡 Please make sure you are logged in');
      return;
    }

    // Get current user info from localStorage
    const authToken = localStorage.getItem('supabase.auth.token');
    if (!authToken) {
      console.error('❌ No auth token found in localStorage');
      return;
    }

    const session = JSON.parse(authToken);
    const userId = session.currentSession?.user?.id;
    const accessToken = session.currentSession?.access_token;

    if (!userId) {
      console.error('❌ Could not extract user ID from session');
      return;
    }

    console.log('✅ Found user ID:', userId);
    console.log('✅ Found access token');

    // Get Supabase URL from environment or page
    const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL ||
                       window.__VITE_SUPABASE_URL__ ||
                       document.querySelector('meta[name="supabase-url"]')?.content;

    if (!supabaseUrl) {
      console.error('❌ Could not find Supabase URL');
      console.log('💡 Trying to extract from localStorage...');
      // Try to get from the session
      const urlMatch = authToken.match(/"aud":"([^"]+)"/);
      if (!urlMatch) {
        console.error('❌ Could not extract Supabase URL');
        return;
      }
    }

    // Manually construct the URL (we know your setup)
    const syncClaimsUrl = `${window.location.origin.replace('http://', 'https://')}/functions/v1/sync-user-claims`;

    console.log('🔄 Calling sync-user-claims edge function...');
    console.log('📍 URL:', syncClaimsUrl);

    // Call the sync-user-claims edge function
    const syncResponse = await fetch(syncClaimsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        user_id: userId,
        business_id: '5b1fa749-3899-4fb4-b1c0-caf34b2751fd',
        infrastructure_id: '73c82fd4-c0c5-406c-ae94-96d4094c8eae'
      })
    });

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      console.error('❌ Failed to sync JWT claims:', syncResponse.status, errorText);
      return;
    }

    const syncResult = await syncResponse.json();
    console.log('✅ JWT claims synced successfully:', syncResult);

    // Force a session refresh
    console.log('🔄 Refreshing session...');

    // Clear cache
    console.log('🗑️ Clearing cache...');
    localStorage.removeItem('profile_cache');
    sessionStorage.clear();

    // Dispatch role refresh event
    console.log('📢 Dispatching role-refresh event...');
    window.dispatchEvent(new Event('role-refresh'));

    // Wait a moment for state to update
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ Fix complete! Reloading page in 2 seconds...');
    console.log('🎉 You should now have business owner access!');

    setTimeout(() => {
      window.location.reload();
    }, 2000);

  } catch (error) {
    console.error('❌ Error during JWT fix:', error);
    console.log('💡 Try refreshing the page manually (F5)');
  }
})();
