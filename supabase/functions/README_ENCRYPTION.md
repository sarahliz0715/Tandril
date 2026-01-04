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

## Functions Requiring Updates

The following edge functions need to be updated to decrypt access tokens:

- [x] `shopify-auth-callback` - Encrypts tokens on storage (DONE)
- [x] `enhanced-execute-command` - Decrypts tokens before use (DONE)
- [ ] `execute-command`
- [ ] `ai-content-generator`
- [ ] `ai-insights`
- [ ] `calculate-pnl`
- [ ] `daily-business-briefing`
- [ ] `dead-product-cleanup`
- [ ] `growth-opportunity-detector`
- [ ] `inventory-protection`
- [ ] `onboarding-store-analyzer`
- [ ] `order-monitor`
- [ ] `price-guardrail`
- [ ] `risk-alert-analyzer`
- [ ] `seo-fixer`
- [ ] `smart-trigger-evaluator`
- [ ] `undo-command`

## Migration Strategy

### Backward Compatibility
The `isEncrypted()` check ensures backward compatibility:
- Old unencrypted tokens will continue to work
- New tokens are automatically encrypted
- Functions handle both encrypted and unencrypted tokens gracefully

### Rollout Steps
1. Deploy the `_shared/encryption.ts` and `_shared/platformHelpers.ts` files
2. Set the `ENCRYPTION_SECRET` environment variable
3. Deploy updated `shopify-auth-callback` function
4. Deploy updated edge functions one by one
5. All new tokens will be encrypted; old tokens remain functional
6. Optionally: Run a migration script to encrypt existing tokens (future task)

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
