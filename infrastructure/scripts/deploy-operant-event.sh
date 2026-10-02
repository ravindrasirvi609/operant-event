#!/usr/bin/env bash
# Deploy script for operant-event on EC2.
# Managed in git — do not edit the copy on the server directly.
# The CI/CD workflow (deploy.yml) copies this file to the server before running it.
#
# Prerequisites on the EC2 host:
#   - Repo already cloned once at /home/ubuntu/operant-event (this script only
#     fetches + resets an existing clone — it does not do the initial clone):
#       git clone git@github-personal:ravindrasirvi609/operant-event.git /home/ubuntu/operant-event
#   - NVM installed at $HOME/.nvm  (version from .nvmrc is used automatically)
#   - jq installed (for SSM JSON parsing: sudo apt-get install -y jq)
#   - AWS CLI installed and the instance IAM role grants ssm:GetParametersByPath
#     on arn:aws:ssm:*:*:parameter/operant-event/prod/*
#     See: infrastructure/aws/ssm-policy.json and docs/runbooks/secrets-management.md
#   - PM2 installed globally: npm install -g pm2
#   - Logs directory exists: mkdir -p /home/ubuntu/logs

set -euo pipefail

# ── Repository ──────────────────────────────────────────────────────────────
# Pull the latest code FIRST. .nvmrc, like everything else the rest of this
# script depends on, only exists on disk once this has run — reading it any
# earlier (as a previous version of this script did) fails on a fresh clone
# or whenever the on-disk checkout predates the commit that added .nvmrc.
if [ ! -d /home/ubuntu/operant-event/.git ]; then
  echo "ERROR: /home/ubuntu/operant-event is not a git checkout. Clone the repo there once before running this script (see prerequisites above)." >&2
  exit 1
fi
cd /home/ubuntu/operant-event

echo "Pulling latest code..."
git fetch origin main

# Capture the current commit so we can roll back if health checks fail.
PREV_SHA=$(git rev-parse HEAD)
echo "Current SHA (rollback target): $PREV_SHA"

git reset --hard origin/main
NEW_SHA=$(git rev-parse HEAD)
echo "Deploying SHA: $NEW_SHA"

# ── Node version ────────────────────────────────────────────────────────────
export NVM_DIR="$HOME/.nvm"

# nvm.sh itself is not written to tolerate Bash strict mode (`set -u`) — a
# known upstream incompatibility (nvm-sh/nvm#1183 and similar). Since it's
# sourced into this same shell, `nounset` would otherwise still be active
# when nvm's internal code runs and can crash with "VERSION: unbound
# variable" on some code paths. Relax it for just this block.
set +u
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
fi

# Use the version declared in .nvmrc — single source of truth shared with CI.
# Fail with a clear message rather than silently passing an empty string to
# `nvm use` (which is what triggered the unbound-variable crash above).
if [ ! -s .nvmrc ]; then
  echo "ERROR: .nvmrc not found in $(pwd) after pulling origin/main. Cannot determine Node version." >&2
  exit 1
fi
nvm use "$(cat .nvmrc)"
set -u

echo "Node version:"; node -v
echo "npm version:";  npm -v

# ── Package manager ──────────────────────────────────────────────────────────
echo "Setting up package manager..."
if ! command -v corepack >/dev/null 2>&1; then
  npm install --global --prefix "$HOME/.local" corepack@0.31.0
  export PATH="$HOME/.local/bin:$PATH"
fi
corepack enable
corepack prepare pnpm@11.23.0 --activate

echo "Installing dependencies..."
pnpm install --frozen-lockfile

# ── Secrets (AWS SSM Parameter Store) ───────────────────────────────────────
# All production secrets live at /operant-event/prod/<VAR_NAME> in SSM.
# They are fetched here, exported into this shell, and inherited by PM2
# processes via --update-env.  No .env file on disk is needed or sourced.
#
# Troubleshooting: run `aws ssm get-parameters-by-path --path /operant-event/prod/
#   --with-decryption` manually to verify the instance role has access.
echo "Fetching production secrets from AWS SSM..."
SSM_PATH="/operant-event/prod"
SECRETS_TMP=$(mktemp)
chmod 600 "$SECRETS_TMP"
# Ensure the temp file is removed even if the script exits early.
trap 'rm -f "$SECRETS_TMP"' EXIT

# jq @sh applies POSIX shell single-quote escaping so values with special
# characters (URLs, passwords) are exported safely.
aws ssm get-parameters-by-path \
  --path "${SSM_PATH}/" \
  --with-decryption \
  --recursive \
  --query "Parameters[*].{Name:Name,Value:Value}" \
  --output json \
| jq -r --arg prefix "${SSM_PATH}/" \
  '.[] | @sh "export \(.[0] | ltrimstr($prefix))=\(.[1])"' \
> "$SECRETS_TMP"

# shellcheck source=/dev/null
set -a
source "$SECRETS_TMP"
set +a
rm -f "$SECRETS_TMP"

# ── Database migrations ──────────────────────────────────────────────────────
# DATABASE_URL is now available from SSM (exported above).
echo "Running database migrations..."
pnpm --filter api exec prisma migrate deploy

# ── Build ────────────────────────────────────────────────────────────────────
echo "Building shared packages..."
pnpm --filter @operant-event/config build
pnpm --filter @operant-event/database build
pnpm --filter @operant-event/storage build

echo "Building API and worker..."
pnpm --filter api build
pnpm --filter worker build

echo "Building web..."
# NEXT_PUBLIC_* and other build-time env vars are also available from SSM
# (already exported into this shell above).
pnpm --filter web build

# ── Services ─────────────────────────────────────────────────────────────────
# startOrReload: starts new processes if they don't exist yet (safe on a
# fresh host) and does a graceful reload if they're already running.
# --update-env: snapshots the current shell's env vars into PM2's process
# record — this is how SSM-sourced secrets reach the running application.
echo "Restarting services..."
mkdir -p /home/ubuntu/logs
pm2 startOrReload ecosystem.config.js --env production --update-env
pm2 save

# ── Health check + rollback ──────────────────────────────────────────────────
# The API exposes GET /api/v1/health (added in AppController). We wait up to
# 60 s for it to respond, then roll back to PREV_SHA if it never does.
echo "Waiting for API health check..."
API_PORT="${PORT:-3001}"
HEALTH_URL="http://localhost:${API_PORT}/api/v1/health"
MAX_ATTEMPTS=12
RETRY_DELAY=5   # seconds

for i in $(seq 1 "$MAX_ATTEMPTS"); do
  if curl --silent --fail --max-time 3 "$HEALTH_URL" > /dev/null 2>&1; then
    echo "✓ Health check passed (attempt ${i}/${MAX_ATTEMPTS})"
    break
  fi

  if [ "$i" -eq "$MAX_ATTEMPTS" ]; then
    echo "✗ Health check failed after $((MAX_ATTEMPTS * RETRY_DELAY))s — rolling back to $PREV_SHA"

    git reset --hard "$PREV_SHA"
    pnpm install --frozen-lockfile

    # Re-fetch secrets at the old commit (schema may differ).
    SECRETS_TMP=$(mktemp)
    chmod 600 "$SECRETS_TMP"
    aws ssm get-parameters-by-path \
      --path "${SSM_PATH}/" \
      --with-decryption \
      --recursive \
      --query "Parameters[*].{Name:Name,Value:Value}" \
      --output json \
    | jq -r --arg prefix "${SSM_PATH}/" \
      '.[] | @sh "export \(.[0] | ltrimstr($prefix))=\(.[1])"' \
    > "$SECRETS_TMP"
    # shellcheck source=/dev/null
    set -a; source "$SECRETS_TMP"; set +a
    rm -f "$SECRETS_TMP"

    pnpm --filter @operant-event/config build
    pnpm --filter @operant-event/database build
    pnpm --filter @operant-event/storage build
    pnpm --filter api build
    pnpm --filter worker build
    pnpm --filter web build

    pm2 startOrReload ecosystem.config.js --env production --update-env
    pm2 save

    echo "Rollback complete. The box is running $PREV_SHA."
    echo "Investigate the failure before re-deploying."
    exit 1
  fi

  echo "  Health check pending (attempt ${i}/${MAX_ATTEMPTS}), retrying in ${RETRY_DELAY}s..."
  sleep "$RETRY_DELAY"
done

echo "Checking PM2 status..."
pm2 status

echo "Deployment completed successfully. Running: $NEW_SHA"
