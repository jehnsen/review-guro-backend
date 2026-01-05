/**
 * Database Configuration
 * Prisma Client singleton instance
 */

import { PrismaClient } from '@prisma/client';
import { config } from './env';

// Declare global type for Prisma client to prevent multiple instances in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create Prisma client with logging based on environment
const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log: config.server.isDevelopment
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  });
};

// Use singleton pattern to prevent multiple Prisma instances in development
// This is important for hot-reloading scenarios
export const prisma = globalThis.prisma ?? createPrismaClient();

if (config.server.isDevelopment) {
  globalThis.prisma = prisma;
}

// Graceful shutdown handler
export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  console.log('📦 Database disconnected');
};

// Connection test utility
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('📦 Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};
