/**
 * Clears all cached app data and reloads the page
 * Shows confirmation dialog before proceeding
 */
export async function clearCachedApp(): Promise<void> {
  const confirmed = window.confirm(
    'This will clear all cached app data and reload the page.\n\n' +
    'You will need to sign in again.\n\n' +
    'Continue?'
  );

  if (!confirmed) {
    return;
  }

  console.log('[clearCachedApp] Starting cache clear process...');

  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`[clearCachedApp] Found ${registrations.length} service worker(s)`);
      
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[clearCachedApp] Unregistered service worker:', registration.scope);
      }
    }

    // Clear Cache Storage
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log(`[clearCachedApp] Found ${cacheNames.length} cache(s):`, cacheNames);
      
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('[clearCachedApp] Deleted cache:', cacheName);
      }
    }

    // Clear localStorage
    console.log('[clearCachedApp] Clearing localStorage...');
    localStorage.clear();

    // Clear sessionStorage
    console.log('[clearCachedApp] Clearing sessionStorage...');
    sessionStorage.clear();

    console.log('[clearCachedApp] Cache clear complete. Reloading...');
    
    // Force reload from server
    window.location.reload();
  } catch (error) {
    console.error('[clearCachedApp] Error during cache clear:', error);
    alert('Error clearing cache. Please try manually clearing your browser cache.');
  }
}
