/**
 * Server Entry Point
 * Initializes database, cache, and starts the HTTP server
 */

import { createApp } from './app';
import { config } from './config/env';
import { testDatabaseConnection, disconnectDatabase } from './config/database';
import { cacheService } from './services/cache.service';

const startServer = async (): Promise<void> => {
  try {
    console.log('🚀 Starting ReviewGuro API Server...\n');

    // ===========================================
    // INITIALIZE CONNECTIONS
    // ===========================================

    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Initialize Redis cache (non-blocking - app works without cache)
    await cacheService.connect();

    // ===========================================
    // CREATE AND START EXPRESS APP
    // ===========================================

    const app = createApp();

    const server = app.listen(config.server.port, () => {
      console.log('\n========================================');
      console.log(`🎓 ReviewGuro API Server`);
      console.log('========================================');
      console.log(`📍 Environment: ${config.server.nodeEnv}`);
      console.log(`🌐 Server:      http://localhost:${config.server.port}`);
      console.log(`📚 API Base:    http://localhost:${config.server.port}/api`);
      console.log(`❤️  Health:      http://localhost:${config.server.port}/api/health`);
      console.log('========================================\n');
    });

    // ===========================================
    // GRACEFUL SHUTDOWN HANDLING
    // ===========================================

    const gracefulShutdown = async (signal: string): Promise<void> => {
      console.log(`\n⚠️  Received ${signal}. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        console.log('📭 HTTP server closed');

        try {
          // Disconnect from database
          await disconnectDatabase();

          // Disconnect from Redis
          await cacheService.disconnect();

          console.log('✅ Graceful shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force exit after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      console.error('❌ Unhandled Rejection:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
