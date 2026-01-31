/**
 * Season Pass Code Generator
 * Generates unique, readable codes for season pass redemption
 */

import crypto from 'crypto';

/**
 * Generate a random season pass code
 * Format: RG-XXXXX-XXXXX (e.g., RG-A1B2C-D3E4F)
 *
 * Uses alphanumeric characters excluding similar-looking ones (0/O, 1/I/L)
 * to reduce user error when typing codes
 */
export function generateSeasonPassCode(): string {
  // Characters that are easy to distinguish (no 0, O, 1, I, L)
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

  const part1 = generateRandomString(5, chars);
  const part2 = generateRandomString(5, chars);

  return `RG-${part1}-${part2}`;
}

/**
 * Generate multiple unique season pass codes
 */
export function generateSeasonPassCodes(count: number): string[] {
  const codes = new Set<string>();

  while (codes.size < count) {
    codes.add(generateSeasonPassCode());
  }

  return Array.from(codes);
}

/**
 * Generate a random string from given character set
 */
function generateRandomString(length: number, charset: string): string {
  let result = '';
  const charsetLength = charset.length;
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    result += charset[randomBytes[i] % charsetLength];
  }

  return result;
}

/**
 * Validate code format (basic check)
 * Accepts any alphanumeric characters for flexibility (allows manually created codes too)
 */
export function isValidCodeFormat(code: string): boolean {
  // Format: RG-XXXXX-XXXXX (5 alphanumeric chars - 5 alphanumeric chars)
  const pattern = /^RG-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
  return pattern.test(code.toUpperCase());
}

/**
 * Normalize code (uppercase, trim whitespace)
 */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}
