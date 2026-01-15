module.exports = {
  apps: [
    {
      name: 'Imperial Price Feeder',
      script: 'dist/index.js',
      cwd: 'C:\\imperial-price-feeder',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'C:\\imperial-price-feeder\\logs\\error.log',
      out_file: 'C:\\imperial-price-feeder\\logs\\output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
