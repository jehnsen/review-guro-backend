/**
 * Hashing Utilities
 * Password hashing and cache key generation
 */

import crypto from 'crypto';

/**
 * Generate a hash for cache keys based on filter parameters
 * Used for creating unique Redis keys for cached queries
 */
export const generateFilterHash = (filters: Record<string, unknown>): string => {
  // Sort keys to ensure consistent hash regardless of object property order
  const sortedFilters = Object.keys(filters)
    .sort()
    .reduce((acc, key) => {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);

  const filterString = JSON.stringify(sortedFilters);
  return crypto.createHash('md5').update(filterString).digest('hex');
};

/**
 * Generate a unique request ID for tracking
 */
export const generateRequestId = (): string => {
  return crypto.randomUUID();
};
