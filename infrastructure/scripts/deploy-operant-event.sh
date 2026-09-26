#!/usr/bin/env bash
# Deploy script for operant-event on EC2.
# Managed in git — do not edit the copy on the server directly.
# The CI/CD workflow (deploy.yml) copies this file to the server before running it.

set -euo pipefail

# Load NVM for non-interactive SSH sessions
export NVM_DIR="$HOME/.nvm"

if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
fi

nvm use 22

cd /home/ubuntu/operant-event

echo "Node version:"
node -v

echo "npm version:"
npm -v

echo "Pulling latest code..."
git fetch origin main
git reset --hard origin/main

echo "Setting up package manager..."
# Corepack may not be available on all Node.js distributions.
# Fall back to a local install so the pinned pnpm version is always used.
if ! command -v corepack >/dev/null 2>&1; then
  npm install --global --prefix "$HOME/.local" corepack@0.31.0
  export PATH="$HOME/.local/bin:$PATH"
fi

corepack enable
corepack prepare pnpm@11.23.0 --activate

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Running database migrations..."
set -a
# shellcheck source=apps/api/.env
source apps/api/.env
set +a

pnpm --filter api exec prisma migrate deploy

echo "Building shared packages..."
pnpm --filter @operant-event/config build
pnpm --filter @operant-event/database build
pnpm --filter @operant-event/storage build

echo "Building API and worker..."
pnpm --filter api build
pnpm --filter worker build

echo "Restarting services..."
pm2 restart operant-api --update-env
pm2 restart operant-worker --update-env
pm2 save

echo "Checking PM2 status..."
pm2 status

echo "Deployment completed successfully."