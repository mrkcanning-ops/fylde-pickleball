/**
 * Hybrid Storage Utility for Club Members and Guests
 * 
 * For Club Members: Data is synced to both localStorage and Supabase database
 * For Guests: Data is stored only in localStorage
 * 
 * Usage (synchronous):
 * const storage = new HybridStorage(userType, userId);
 * storage.saveData('current_season', data); // returns immediately, syncs to DB in background
 * const data = storage.loadData('current_season'); // loads from localStorage/DB cache
 * 
 * Note: All operations are designed to be non-blocking. Database syncs happen in the background.
 */

export class HybridStorage {
  constructor(userType, userId) {
    this.userType = userType; // 'club-member' or 'guest'
    this.userId = userId;
    this.isClient = typeof window !== 'undefined';
    this.syncQueue = []; // Queue for background database syncs
    this.isSyncing = false;
    this.dbCache = {}; // Cache for loaded data from database
    
    if (this.isClient) {
      // Start background sync worker
      this.startBackgroundSync();
    }
  }

  /**
   * Save data - always immediate to localStorage, async sync to database for club members
   */
  saveData(key, data) {
    if (!this.isClient) return;

    // Always save to localStorage immediately
    try {
      localStorage.setItem(key, JSON.stringify(data));
      this.dbCache[key] = data; // Update cache
    } catch (e) {
      console.error('localStorage save error:', e);
    }

    // Queue database sync for club members (non-blocking)
    if (this.userType === 'club-member') {
      this.queueDatabaseSync(key, data);
    }
  }

  /**
   * Load data - from cache/localStorage, with database as fallback for club members
   */
  loadData(key, fallback = null) {
    if (!this.isClient) return fallback;

    // Try cache first
    if (this.dbCache[key] !== undefined) {
      return this.dbCache[key];
    }

    // Fall back to localStorage
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.dbCache[key] = parsed;
        return parsed;
      }
    } catch (e) {
      console.error('localStorage load error:', e);
    }

    return fallback;
  }

  /**
   * Remove data from both localStorage and queue database deletion
   */
  removeData(key) {
    if (!this.isClient) return;

    try {
      localStorage.removeItem(key);
      delete this.dbCache[key];
    } catch (e) {
      console.error('localStorage remove error:', e);
    }

    if (this.userType === 'club-member') {
      this.queueDatabaseDelete(key);
    }
  }

  /**
   * Queue a database sync operation
   */
  queueDatabaseSync(key, data) {
    this.syncQueue.push({
      type: 'save',
      key,
      data,
      dataType: this.inferDataType(key),
    });
  }

  /**
   * Queue a database delete operation
   */
  queueDatabaseDelete(key) {
    this.syncQueue.push({
      type: 'delete',
      key,
    });
  }

  /**
   * Start background sync worker
   */
  startBackgroundSync() {
    // Run sync every 2 seconds if there are queued items
    setInterval(() => {
      if (this.syncQueue.length > 0 && !this.isSyncing) {
        this.processSyncQueue();
      }
    }, 2000);

    // Also sync on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.processSyncQueue(true); // Synchronous flush
      });
    }
  }

  /**
   * Process the sync queue - sends batched updates to database
   */
  async processSyncQueue(flush = false) {
    if (this.syncQueue.length === 0 || this.isSyncing) return;

    this.isSyncing = true;

    try {
      // Process up to 10 items per batch
      const batch = this.syncQueue.splice(0, 10);

      for (const item of batch) {
        try {
          if (item.type === 'save') {
            await fetch('/api/storage/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: this.userId,
                key: item.key,
                data: item.data,
                dataType: item.dataType,
              }),
            });
          } else if (item.type === 'delete') {
            await fetch('/api/storage/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: this.userId,
                key: item.key,
              }),
            });
          }
        } catch (error) {
          console.error('Database sync error for key:', item.key, error);
          // Re-queue failed item
          this.syncQueue.unshift(item);
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Infer data type from key for better database organization
   */
  inferDataType(key) {
    if (key.includes('current_season')) return 'season';
    if (key.includes('divisions')) return 'divisions';
    if (key.includes('players')) return 'players';
    if (key.includes('match')) return 'matches';
    if (key.includes('score')) return 'scores';
    return 'general';
  }

  /**
   * Force a synchronous flush of the sync queue (for page unload)
   */
  async flushSync() {
    while (this.syncQueue.length > 0) {
      await this.processSyncQueue();
    }
  }
}
