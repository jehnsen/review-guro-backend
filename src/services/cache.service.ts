/**
 * Redis Cache Service
 * Implements Cache-Aside pattern for efficient data caching
 *
 * CACHE-ASIDE PATTERN EXPLAINED:
 * 1. Application first checks the cache for data
 * 2. If data exists (cache hit) -> return cached data immediately
 * 3. If data doesn't exist (cache miss) -> fetch from database
 * 4. Store fetched data in cache with TTL for future requests
 * 5. Return the data to the caller
 *
 * This pattern reduces database load and improves response times
 * for frequently accessed, relatively static data like questions.
 */

import Redis from 'ioredis';
import { config } from '../config/env';
import { CacheOptions, CachedData } from '../types';

class CacheService {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private readonly defaultTTL: number = 3600; // 1 hour in seconds

  /**
   * Initialize Redis connection
   * Called during application startup
   */
  async connect(): Promise<void> {
    try {
      this.client = new Redis(config.redis.url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          // Exponential backoff with max 3 second delay
          const delay = Math.min(times * 100, 3000);
          return delay;
        },
        lazyConnect: true,
      });

      // Set up event handlers
      this.client.on('connect', () => {
        console.log('🔴 Redis: Connecting...');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        console.log('🟢 Redis: Connected and ready');
      });

      this.client.on('error', (error) => {
        console.error('🔴 Redis Error:', error.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('🔴 Redis: Connection closed');
        this.isConnected = false;
      });

      // Attempt connection
      await this.client.connect();
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      // Don't throw - allow app to work without cache
      this.isConnected = false;
    }
  }

  /**
   * Disconnect from Redis
   * Called during graceful shutdown
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('🔴 Redis: Disconnected');
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Generate a cache key with optional prefix
   * Format: prefix:key or just key if no prefix
   */
  private generateKey(key: string, prefix?: string): string {
    return prefix ? `${prefix}:${key}` : key;
  }

  /**
   * GET - Retrieve data from cache
   *
   * @param key - The cache key to lookup
   * @param options - Optional settings (prefix)
   * @returns Parsed data if found, null if miss or error
   *
   * CACHE HIT: Returns the cached data immediately
   * CACHE MISS: Returns null, caller should fetch from DB
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    // If Redis is not available, return null (cache miss)
    // This allows the application to gracefully degrade to DB-only mode
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const cacheKey = this.generateKey(key, options?.prefix);
      const cached = await this.client!.get(cacheKey);

      if (!cached) {
        // CACHE MISS - Key doesn't exist in Redis
        return null;
      }

      // CACHE HIT - Parse and return the cached JSON data
      const parsed: CachedData<T> = JSON.parse(cached);
      return parsed.data;
    } catch (error) {
      // Log error but don't throw - treat as cache miss
      console.error('Cache GET error:', error);
      return null;
    }
  }

  /**
   * SET - Store data in cache with TTL
   *
   * @param key - The cache key
   * @param data - The data to cache (will be JSON serialized)
   * @param options - Optional settings (ttl in seconds, prefix)
   * @returns true if successful, false otherwise
   *
   * TTL (Time To Live): Data automatically expires after this duration
   * This ensures stale data is eventually refreshed from the database
   */
  async set<T>(key: string, data: T, options?: CacheOptions): Promise<boolean> {
    // If Redis is not available, silently skip caching
    // The application continues to work, just without caching benefits
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(key, options?.prefix);
      const ttl = options?.ttl ?? this.defaultTTL;

      // Wrap data with metadata for debugging and validation
      const cacheData: CachedData<T> = {
        data,
        cachedAt: Date.now(),
        ttl,
      };

      // SET with EX (expiry in seconds)
      // After TTL seconds, Redis automatically deletes this key
      await this.client!.set(cacheKey, JSON.stringify(cacheData), 'EX', ttl);

      return true;
    } catch (error) {
      console.error('Cache SET error:', error);
      return false;
    }
  }

  /**
   * DELETE - Remove a specific key from cache
   *
   * Used for cache invalidation when data is updated
   * @param key - The cache key to delete
   * @param options - Optional settings (prefix)
   */
  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(key, options?.prefix);
      await this.client!.del(cacheKey);
      return true;
    } catch (error) {
      console.error('Cache DELETE error:', error);
      return false;
    }
  }

  /**
   * DELETE BY PATTERN - Remove all keys matching a pattern
   *
   * Useful for invalidating all cached questions when questions are updated
   * Example: deleteByPattern('questions:*') removes all question caches
   *
   * @param pattern - Redis SCAN pattern (e.g., 'questions:*')
   */
  async deleteByPattern(pattern: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      // Use SCAN instead of KEYS for production safety
      // KEYS can block Redis on large datasets
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client!.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.client!.del(...keys);
        }
      } while (cursor !== '0');

      return true;
    } catch (error) {
      console.error('Cache DELETE BY PATTERN error:', error);
      return false;
    }
  }

  /**
   * EXISTS - Check if a key exists in cache
   *
   * @param key - The cache key to check
   * @param options - Optional settings (prefix)
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(key, options?.prefix);
      const result = await this.client!.exists(cacheKey);
      return result === 1;
    } catch (error) {
      console.error('Cache EXISTS error:', error);
      return false;
    }
  }

  /**
   * FLUSH - Clear all cached data
   *
   * WARNING: Use with caution in production!
   * Only for development/testing or complete cache reset scenarios
   */
  async flush(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.flushdb();
      console.log('🧹 Cache flushed');
      return true;
    } catch (error) {
      console.error('Cache FLUSH error:', error);
      return false;
    }
  }

  /**
   * GET OR SET - Implements the Cache-Aside pattern in a single call
   *
   * This is the main method for cache-aside pattern:
   * 1. Check cache for existing data
   * 2. If found (hit), return immediately
   * 3. If not found (miss), call the factory function to get data
   * 4. Store the result in cache
   * 5. Return the data
   *
   * @param key - The cache key
   * @param factory - Async function to fetch data on cache miss
   * @param options - Optional settings (ttl, prefix)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<{ data: T; fromCache: boolean }> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);

    if (cached !== null) {
      // CACHE HIT - Return cached data with flag
      return { data: cached, fromCache: true };
    }

    // CACHE MISS - Fetch fresh data from the factory (usually DB query)
    const freshData = await factory();

    // Store in cache for future requests (fire and forget)
    this.set(key, freshData, options).catch((error) => {
      console.error('Failed to cache data:', error);
    });

    return { data: freshData, fromCache: false };
  }
}

// Export singleton instance
export const cacheService = new CacheService();
