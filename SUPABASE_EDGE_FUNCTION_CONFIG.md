# Supabase Edge Function Configuration Guide

## OAuth Callback Functions (Shopify, eBay)

OAuth callback functions receive redirects from external services (Shopify, eBay) and **do not have JWT authentication** because they're browser redirects. These functions need to be publicly accessible.

### Functions That Need Public Access:
- `shopify-auth-callback`
- `ebay-auth-callback`

### How to Configure in Supabase Dashboard:

#### Method 1: Using Supabase CLI (Recommended)
If you're using Supabase CLI for deployment:

1. Create `supabase/config.toml` (if it doesn't exist)
2. Add function configuration:

```toml
[functions.shopify-auth-callback]
verify_jwt = false

[functions.ebay-auth-callback]
verify_jwt = false
```

3. Deploy functions:
```bash
supabase functions deploy shopify-auth-callback
supabase functions deploy ebay-auth-callback
```

#### Method 2: Using Supabase Dashboard

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Edge Functions** (left sidebar)
4. For each callback function:
   - Click on the function name
   - Go to **Settings** tab
   - Find **"Verify JWT"** setting
   - Set to **FALSE** or **DISABLED**
   - Save changes

#### Method 3: Redeploy from Dashboard

If deploying via the Supabase dashboard:

1. When creating/editing the Edge Function
2. Look for **"Verify JWT"** or **"Authentication Required"** toggle
3. Turn it **OFF** for callback functions
4. Deploy

### Environment Variables Required

Make sure these are set in your Supabase Edge Functions environment:

#### For All Functions:
- `SUPABASE_URL` (usually auto-set)
- `SUPABASE_ANON_KEY` (usually auto-set)
- `SUPABASE_SERVICE_ROLE_KEY` (required for callbacks - set manually)
- `APP_URL` (your frontend URL, e.g., https://tandril.vercel.app)

#### For Shopify:
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_SCOPES` (optional, defaults to read_products,write_products,read_orders,read_inventory,write_inventory)
- `SHOPIFY_REDIRECT_URI` (optional, auto-generated if not set)

#### For eBay:
- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`
- `EBAY_ENVIRONMENT` (production or sandbox)

#### For AI Coach (smart-api):
- `ANTHROPIC_API_KEY`

### How to Set Environment Variables:

1. Go to Supabase Dashboard → **Edge Functions**
2. Click on **Settings** (top right) or select individual function
3. Find **"Environment Variables"** section
4. Add each variable with its value
5. Save and redeploy functions

### Security Notes:

Even though callback functions don't require JWT:
- ✅ They use **state parameter validation** (prevents CSRF)
- ✅ OAuth states expire after 10 minutes
- ✅ They use **service role key** to write to database securely
- ✅ Can optionally verify HMAC signatures (Shopify provides this)

### Troubleshooting:

**401 Unauthorized on callback:**
- ✅ Make sure `verify_jwt = false` for callback functions
- ✅ Check that `SUPABASE_SERVICE_ROLE_KEY` is set
- ✅ Verify the function is deployed

**Missing environment variables:**
- ✅ Check Supabase Dashboard → Edge Functions → Settings
- ✅ Redeploy function after adding variables

**CORS errors:**
- ✅ All functions now have proper CORS headers
- ✅ Make sure latest code is deployed

### Testing:

After configuration:

1. Try connecting Shopify store from Platforms page
2. Check browser console for detailed logs
3. Check Supabase Edge Functions logs for server-side errors
4. Verify redirect URL in Shopify app settings matches callback URL

### Callback URLs:

- **Shopify**: `https://[your-project].supabase.co/functions/v1/shopify-auth-callback`
- **eBay**: `https://[your-project].supabase.co/functions/v1/ebay-auth-callback`

These must match exactly in your OAuth app settings (Shopify Partners, eBay Developer).
