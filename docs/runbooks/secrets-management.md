# Secrets Management Runbook

Production secrets for operant-event live in **AWS SSM Parameter Store** under
the path `/operant-event/prod/<VAR_NAME>`. They are fetched by the deploy
script at deploy time and injected into the running processes via PM2's
`--update-env`.

No `.env` file is read on production. `.env` files are only for local
development.

---

## One-time AWS setup

### 1. Create an IAM policy for the EC2 instance

The policy document is at `infrastructure/aws/ssm-policy.json`. Create it:

```bash
aws iam create-policy \
  --policy-name operant-event-ssm-read \
  --policy-document file://infrastructure/aws/ssm-policy.json
```

Note the returned `PolicyArn`.

### 2. Attach the policy to the EC2 instance role

Find the instance profile attached to your EC2 box:

```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=operant-event-prod" \
  --query "Reservations[*].Instances[*].IamInstanceProfile.Arn"
```

Attach the policy (replace `<ROLE_NAME>` with the role inside the instance
profile):

```bash
aws iam attach-role-policy \
  --role-name <ROLE_NAME> \
  --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/operant-event-ssm-read
```

### 3. Store the secrets

Run these commands **once** with your actual production values. All parameters
are stored as `SecureString` (encrypted at rest with the default `aws/ssm`
KMS key — the instance role above can decrypt them automatically).

```bash
REGION="ap-south-1"   # change to your region
PREFIX="/operant-event/prod"

# ── Required ─────────────────────────────────────────────────────────────
aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/DATABASE_URL" \
  --value "postgresql://user:password@host:5432/operant_event?schema=public"

aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/REDIS_URL" \
  --value "redis://:password@host:6379"

# Generate with: openssl rand -base64 48
aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/JWT_ACCESS_SECRET" \
  --value "<64-char random string>"

aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/JWT_REFRESH_SECRET" \
  --value "<64-char random string — DIFFERENT from JWT_ACCESS_SECRET>"

# ── Optional overrides (sensible defaults exist in code) ─────────────────
aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/FRONTEND_URL" \
  --value "https://your-domain.com"

aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/UPLOADS_DIR" \
  --value "/home/ubuntu/operant-event-uploads"

# Resend (email delivery) — only needed if sending real emails
aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/RESEND_API_KEY" \
  --value "re_live_..."

aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/EMAIL_FROM_ADDRESS" \
  --value "noreply@your-domain.com"

# Razorpay — only needed if any conference uses GATEWAY payment mode
aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/RAZORPAY_KEY_ID" \
  --value "rzp_live_..."
aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/RAZORPAY_KEY_SECRET" \
  --value "<secret>"
aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/RAZORPAY_WEBHOOK_SECRET" \
  --value "<secret>"

# Stripe — only needed if any conference uses Stripe payment mode
aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/STRIPE_SECRET_KEY" \
  --value "sk_live_..."
aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/STRIPE_WEBHOOK_SECRET" \
  --value "whsec_..."

# Web process
aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/BACKEND_API_URL" \
  --value "https://your-domain.com/api/v1"

aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "${PREFIX}/COOKIE_DOMAIN" \
  --value ".your-domain.com"
```

### 4. Remove the old hand-placed `.env` file from the server

Once you have verified secrets are in SSM and the first SSM-based deploy
succeeds, delete the old file:

```bash
ssh ubuntu@<EC2_HOST> "rm -f /home/ubuntu/operant-event/apps/api/.env \
  /home/ubuntu/operant-event/apps/worker/.env"
```

---

## Rotating a secret

```bash
aws ssm put-parameter --region "$REGION" --type SecureString \
  --name "/operant-event/prod/JWT_ACCESS_SECRET" \
  --value "<new secret>" \
  --overwrite
```

Then trigger a deploy (or `pm2 reload ecosystem.config.js --update-env` on
the box after manually sourcing the new value) so the running processes pick
up the change.

---

## Verifying access from the EC2 instance

SSH onto the box and run:

```bash
aws ssm get-parameters-by-path \
  --path "/operant-event/prod/" \
  --with-decryption \
  --query "Parameters[*].Name"
```

You should see the list of parameter names without error. If you get an
`AccessDeniedException`, the IAM instance role is not yet attached correctly
(re-check step 2 above).

---

## Dependencies on the EC2 host

The deploy script requires `jq` to parse SSM JSON output. Install it once:

```bash
sudo apt-get update && sudo apt-get install -y jq
```
