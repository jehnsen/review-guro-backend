/**
 * Activation Code Generator
 * Generates unique Season Pass activation codes
 */

import crypto from 'crypto';

/**
 * Generate a unique activation code
 * Format: RGSP-XXXX-XXXX (ReviewGuro Season Pass)
 * Example: RGSP-A7F3-K9P2
 */
export const generateActivationCode = (): string => {
  // Generate 8 random characters (uppercase letters and numbers)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking: 0,O,1,I
  let code = '';

  const randomBytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[randomBytes[i] % chars.length];
  }

  // Format as RGSP-XXXX-XXXX
  return `RGSP-${code.slice(0, 4)}-${code.slice(4, 8)}`;
};

/**
 * Validate activation code format
 */
export const isValidActivationCode = (code: string): boolean => {
  const pattern = /^RGSP-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
  return pattern.test(code);
};
