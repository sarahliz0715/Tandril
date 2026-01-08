# Edge Function Encryption Implementation Guide

## Overview
Access tokens are now encrypted in the database using AES-GCM encryption. This document explains how to update edge functions to handle encrypted tokens.

## Setup Required

### Environment Variables
Add to your `.env` or Supabase Edge Function secrets:
```bash
ENCRYPTION_SECRET=your-secure-random-string-here-min-32-chars
```

**Important:** Use a cryptographically secure random string, minimum 32 characters.

## Implementation Pattern

### 1. Import the encryption utilities
```typescript
import { decrypt, isEncrypted } from '../_shared/encryption.ts';
```

### 2. Decrypt tokens after fetching platforms
After fetching platform(s) from the database, decrypt the access token before use:

```typescript
// Single platform
const { data: platform } = await supabaseClient
  .from('platforms')
  .select('*')
  .eq('user_id', userId)
  .eq('shop_domain', shopDomain)
  .single();

if (platform?.access_token && isEncrypted(platform.access_token)) {
  platform.access_token = await decrypt(platform.access_token);
}

// Multiple platforms
const { data: platforms } = await supabaseClient
  .from('platforms')
  .select('*')
  .eq('user_id', userId);

for (const platform of platforms) {
  if (platform.access_token && isEncrypted(platform.access_token)) {
    try {
      platform.access_token = await decrypt(platform.access_token);
    } catch (error) {
      console.error(`Failed to decrypt token for ${platform.shop_domain}`);
      throw new Error('Failed to decrypt platform credentials');
    }
  }
}
```

### 3. Alternative: Use Platform Helpers
For cleaner code, use the platform helper functions:

```typescript
import { getPlatformWithDecryptedToken, getUserPlatformsWithDecryptedTokens } from '../_shared/platformHelpers.ts';

// Single platform
const platform = await getPlatformWithDecryptedToken(supabaseClient, userId, shopDomain);

// Multiple platforms
const platforms = await getUserPlatformsWithDecryptedTokens(supabaseClient, userId);
```

## Functions Status

✅ **All edge functions have been updated!**

The following edge functions now support encrypted access tokens:

- [x] `shopify-auth-callback` - Encrypts tokens on storage ✅
- [x] `enhanced-execute-command` - Decrypts tokens before use ✅
- [x] `execute-command` ✅
- [x] `undo-command` ✅
- [x] `ai-content-generator` ✅
- [x] `ai-insights` ✅
- [x] `calculate-pnl` ✅
- [x] `daily-business-briefing` ✅
- [x] `dead-product-cleanup` ✅
- [x] `growth-opportunity-detector` ✅
- [x] `inventory-protection` ✅
- [x] `onboarding-store-analyzer` ✅
- [x] `order-monitor` ✅
- [x] `price-guardrail` ✅
- [x] `risk-alert-analyzer` ✅
- [x] `seo-fixer` ✅
- [x] `smart-trigger-evaluator` ✅

**Total: 17/17 functions completed** 🎉

## Migration Strategy

### ✅ Migration Complete!

All functions have been updated and deployed. The implementation is:

✅ **Backward Compatible**
- Old unencrypted tokens continue to work
- New tokens are automatically encrypted
- Functions handle both encrypted and unencrypted tokens gracefully

✅ **Deployment Steps Completed**
1. ✅ Deployed `_shared/encryption.ts` and `_shared/platformHelpers.ts` files
2. ⚠️  **ACTION REQUIRED:** Set the `ENCRYPTION_SECRET` environment variable in Supabase
3. ✅ Updated `shopify-auth-callback` function (encrypts on storage)
4. ✅ Updated all 16 edge functions (decrypt on use)
5. ✅ All new tokens will be encrypted; old tokens remain functional
6. 📋 **Optional:** Run a migration script to encrypt existing tokens (future task)

### Required Environment Variable

```bash
# Add this to Supabase Edge Function Secrets
ENCRYPTION_SECRET=<your-cryptographically-secure-random-string-min-32-chars>
```

Generate a secure secret with:
```bash
openssl rand -base64 48
```

## Security Notes

- Never log decrypted access tokens
- Never return decrypted tokens to the client
- Always use HTTPS for API calls
- Rotate `ENCRYPTION_SECRET` periodically (requires re-encryption migration)
- Store `ENCRYPTION_SECRET` in Supabase secrets, not in code

## Testing

Test each updated function:
1. Reconnect a Shopify store (creates encrypted token)
2. Execute a command/workflow using that platform
3. Verify the command executes successfully
4. Check logs for any decryption errors
