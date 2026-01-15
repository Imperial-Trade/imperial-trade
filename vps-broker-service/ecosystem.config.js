/**
 * PM2 Ecosystem Configuration
 * 
 * Robust process management for MT5 Broker Service
 * - Auto-restart on crashes
 * - Logging to files
 * - Health monitoring
 * - Graceful shutdown
 * 
 * NOTE: Environment variables are loaded from .env file
 * via dotenv.config() in the application code
 */

module.exports = {
  apps: [
    {
      name: 'imperial-trade-broker-service',
      script: './dist/index.js',
      cwd: 'C:/vps-broker-service',
      instances: 1,
      exec_mode: 'fork',
      
      // Make visible in taskbar (like Price Feeder)
      windowsHide: false, // Show console window in taskbar
      
      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      
      // Logging
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Environment variables - loaded from .env file via dotenv
      // These can be overridden here if needed
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      
      // Advanced PM2 features
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Health monitoring
      health_check_grace_period: 3000,
    },
  ],
};
