#!/bin/bash

# ============================================
# VECTERAI Fly.io Secrets Deployment Script
# ============================================
#
# This script sets all required environment variables as Fly.io secrets.
# Run this BEFORE your first deployment.
#
# Usage:
#   1. Copy this script
#   2. Fill in your actual secret values
#   3. Run: chmod +x scripts/deploy-secrets.sh && ./scripts/deploy-secrets.sh
#
# ============================================

set -e

echo "Setting VECTERAI secrets on Fly.io..."
echo ""

# ============================================
# REQUIRED SECRETS
# ============================================

# Supabase Configuration
echo "Setting Supabase secrets..."
fly secrets set \
  NEXT_PUBLIC_SUPABASE_URL="your-supabase-url" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key" \
  SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Anthropic (Claude AI)
echo "Setting Anthropic secrets..."
fly secrets set \
  ANTHROPIC_API_KEY="your-anthropic-api-key"

# Stripe Payments
echo "Setting Stripe secrets..."
fly secrets set \
  STRIPE_SECRET_KEY="your-stripe-secret-key" \
  STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret" \
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"

# Resend Email
echo "Setting Resend secrets..."
fly secrets set \
  RESEND_API_KEY="your-resend-api-key"

# ============================================
# OPTIONAL SECRETS (Voice & SMS)
# ============================================

# Vapi Voice AI (optional)
echo "Setting Vapi secrets (optional)..."
fly secrets set \
  VAPI_API_KEY="your-vapi-api-key" \
  VAPI_WEBHOOK_SECRET="your-vapi-webhook-secret" \
  VAPI_PHONE_NUMBER_ID="your-vapi-phone-number-id"

# Twilio SMS (optional)
echo "Setting Twilio secrets (optional)..."
fly secrets set \
  TWILIO_ACCOUNT_SID="your-twilio-account-sid" \
  TWILIO_AUTH_TOKEN="your-twilio-auth-token" \
  TWILIO_PHONE_NUMBER="your-twilio-phone-number"

# ============================================
# APPLICATION URL
# ============================================

echo "Setting application URL..."
fly secrets set \
  NEXT_PUBLIC_APP_URL="https://vecterai.fly.dev"

echo ""
echo "All secrets have been set!"
echo ""
echo "Next steps:"
echo "  1. Verify secrets: fly secrets list"
echo "  2. Deploy: fly deploy"
echo ""
