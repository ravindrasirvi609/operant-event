/**
 * PM2 process definitions for the operant-event monorepo.
 *
 * Secrets are NOT stored here. They are fetched from AWS SSM Parameter Store
 * at deploy time and injected into the shell before `pm2 startOrReload`.
 * PM2 then snapshots the current process.env when --update-env is passed.
 *
 * Usage (handled automatically by the deploy script):
 *   pm2 startOrReload ecosystem.config.js --env production --update-env
 *
 * To start from scratch on a fresh host:
 *   pm2 start ecosystem.config.js --env production
 *
 * See: infrastructure/scripts/deploy-operant-event.sh
 */

'use strict';

const APP_ROOT = '/home/ubuntu/operant-event';

module.exports = {
  apps: [
    {
      name: 'operant-api',
      script: 'dist/main.js',
      cwd: `${APP_ROOT}/apps/api`,
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      // Rotate logs once they hit 10 MB; keep 5 rotated files.
      error_file: '/home/ubuntu/logs/api-error.log',
      out_file: '/home/ubuntu/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '5s',
      max_memory_restart: '1G',
    },
    {
      name: 'operant-worker',
      script: 'dist/main.js',
      cwd: `${APP_ROOT}/apps/worker`,
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: '/home/ubuntu/logs/worker-error.log',
      out_file: '/home/ubuntu/logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '5s',
      max_memory_restart: '512M',
    },
    {
      name: 'operant-web',
      // next CLI lives in node_modules — no global install required.
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: `${APP_ROOT}/apps/web`,
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      error_file: '/home/ubuntu/logs/web-error.log',
      out_file: '/home/ubuntu/logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '5s',
      max_memory_restart: '1G',
    },
  ],
};
