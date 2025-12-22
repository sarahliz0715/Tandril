# Privacy Compliance Webhooks - Deployment Guide

This guide provides step-by-step instructions to deploy the mandatory Shopify compliance webhooks once Supabase is accessible.

## 📋 Pre-Deployment Checklist

Before starting, ensure you have:
- [ ] Supabase project created and accessible
- [ ] Supabase project reference ID (from your project URL)
- [ ] Shopify Partner account with your app created
- [ ] Shopify API credentials (Client ID and Client Secret)
- [ ] Terminal/command line access

## 🚀 Deployment Steps

### Step 1: Deploy Edge Functions to Supabase

You have **two options** for deploying Edge Functions:

#### Option A: Manual Deployment via Supabase Dashboard (No CLI Required)

1. **Log into Supabase Dashboard**
   - Go to https://app.supabase.com
   - Open your project

2. **Navigate to Edge Functions**
   - Click "Edge Functions" in the left sidebar
   - Click "Create a new function"

3. **Deploy customers-data-request function:**
   - Function name: `customers-data-request`
   - Copy the entire contents of: `supabase/functions/customers-data-request/index.ts`
   - Paste into the code editor
   - Click "Deploy"

4. **Deploy customers-redact function:**
   - Click "Create a new function"
   - Function name: `customers-redact`
   - Copy the entire contents of: `supabase/functions/customers-redact/index.ts`
   - Paste into the code editor
   - Click "Deploy"

5. **Deploy shop-redact function:**
   - Click "Create a new function"
   - Function name: `shop-redact`
   - Copy the entire contents of: `supabase/functions/shop-redact/index.ts`
   - Paste into the code editor
   - Click "Deploy"

#### Option B: Deploy via Supabase CLI (Advanced)

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link your project (replace YOUR_PROJECT_REF with your actual project reference)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all three functions
supabase functions deploy customers-data-request
supabase functions deploy customers-redact
supabase functions deploy shop-redact
```

### Step 2: Run Database Migration

1. **Open Supabase SQL Editor:**
   - In your Supabase Dashboard
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

2. **Copy the migration SQL:**
   - Open the file: `supabase/migrations/002_create_compliance_requests.sql`
   - Copy the entire contents

3. **Execute the migration:**
   - Paste the SQL into the SQL Editor
   - Click "Run" or press Ctrl+Enter
   - Verify it completes successfully (you should see "Success" message)

4. **Verify the table was created:**
   - Click "Table Editor" in the left sidebar
   - Look for the `compliance_requests` table
   - It should appear in your table list

### Step 3: Configure Environment Variables in Supabase

1. **Navigate to Edge Functions Settings:**
   - In Supabase Dashboard
   - Go to "Edge Functions" → "Settings"
   - Or go to "Project Settings" → "Edge Functions"

2. **Add/Verify these secrets:**

   Click "Add new secret" for each:

   ```
   SHOPIFY_API_SECRET = [Your Shopify Client Secret from Partner Dashboard]
   SUPABASE_URL = [Your Supabase project URL, e.g., https://xxxxx.supabase.co]
   SUPABASE_SERVICE_ROLE_KEY = [Your service role key from Project Settings → API]
   ```

   **To find these values:**
   - **SHOPIFY_API_SECRET**: Shopify Partner Dashboard → Your App → App Credentials → Client Secret
   - **SUPABASE_URL**: Project Settings → API → Project URL
   - **SUPABASE_SERVICE_ROLE_KEY**: Project Settings → API → service_role key (keep this secret!)

### Step 4: Get Your Edge Function URLs

After deploying the functions, you'll need the full URLs for Shopify webhook configuration.

**Your webhook URLs will be:**
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/customers-data-request
https://YOUR_PROJECT_REF.supabase.co/functions/v1/customers-redact
https://YOUR_PROJECT_REF.supabase.co/functions/v1/shop-redact
```

**To get YOUR_PROJECT_REF:**
- Look at your Supabase project URL
- Example: `https://abcdefghijklmnop.supabase.co`
- Your project ref is: `abcdefghijklmnop`

**Write down your three webhook URLs here for easy reference:**
```
1. customers/data_request: _______________________________________
2. customers/redact: _____________________________________________
3. shop/redact: __________________________________________________
```

### Step 5: Configure Webhooks in Shopify Partner Dashboard

1. **Go to Shopify Partners:**
   - Visit https://partners.shopify.com
   - Click "Apps"
   - Select your app

2. **Navigate to Webhooks:**
   - Click "Configuration" in the left sidebar
   - Scroll down to "Webhooks" section
   - Click "Add webhook" or "Configure webhooks"

3. **Add customers/data_request webhook:**
   - Topic: `customers/data_request`
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/customers-data-request`
   - Format: `JSON`
   - API Version: `2024-07` (or latest available)
   - Click "Add webhook" or "Save"

4. **Add customers/redact webhook:**
   - Topic: `customers/redact`
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/customers-redact`
   - Format: `JSON`
   - API Version: `2024-07` (or latest available)
   - Click "Add webhook" or "Save"

5. **Add shop/redact webhook:**
   - Topic: `shop/redact`
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/shop-redact`
   - Format: `JSON`
   - API Version: `2024-07` (or latest available)
   - Click "Add webhook" or "Save"

### Step 6: Test Webhook Endpoints

1. **Test with Shopify CLI** (if installed):
   ```bash
   shopify webhook trigger --topic=customers/data_request \
     --delivery-method=http \
     --address=https://YOUR_PROJECT_REF.supabase.co/functions/v1/customers-data-request

   shopify webhook trigger --topic=customers/redact \
     --delivery-method=http \
     --address=https://YOUR_PROJECT_REF.supabase.co/functions/v1/customers-redact

   shopify webhook trigger --topic=shop/redact \
     --delivery-method=http \
     --address=https://YOUR_PROJECT_REF.supabase.co/functions/v1/shop-redact
   ```

2. **Check Edge Function Logs:**
   - In Supabase Dashboard
   - Go to "Edge Functions"
   - Click on each function
   - Click "Logs" tab
   - Look for successful webhook receipts

3. **Check compliance_requests table:**
   - Go to "Table Editor"
   - Open `compliance_requests` table
   - You should see test webhook records if tests succeeded

### Step 7: Verify Deployment Success

Check off each item:
- [ ] All 3 Edge Functions deployed successfully
- [ ] Database migration ran without errors
- [ ] `compliance_requests` table exists
- [ ] Environment variables are set in Supabase
- [ ] All 3 webhooks registered in Shopify Partner Dashboard
- [ ] Test webhooks return 200 status code
- [ ] Webhook logs appear in Supabase Edge Function logs
- [ ] Test records appear in `compliance_requests` table

## 🔧 Troubleshooting

### Edge Function won't deploy
- **Error:** "Function already exists"
  - **Solution:** Use the "Update" or "Redeploy" button instead of "Create new"

### HMAC verification fails (401 errors)
- **Error:** Webhooks return 401 Unauthorized
  - **Solution:** Verify `SHOPIFY_API_SECRET` matches your Shopify app's Client Secret exactly
  - Check there are no extra spaces or line breaks in the secret

### Database errors
- **Error:** "Table does not exist"
  - **Solution:** Run the migration SQL again in SQL Editor
- **Error:** RLS policy violations
  - **Solution:** Edge Functions should use `SUPABASE_SERVICE_ROLE_KEY`, not the anon key

### Webhooks not receiving data
- **Error:** No logs in Edge Functions
  - **Solution:** Verify webhook URLs are correct in Shopify Partner Dashboard
  - Check that URLs use `https://` not `http://`
  - Ensure function names match exactly (with hyphens, not underscores)

### Can't find Project Reference
- **Solution:** Look at your Supabase project URL in the browser address bar
- Example: `https://app.supabase.com/project/abcdefghijklmnop`
- Your ref is: `abcdefghijklmnop`

## 📝 Post-Deployment: Customization Needed

After successful deployment, you still need to customize:

1. **customers-data-request webhook** (Line ~108 in the file)
   - Add logic to retrieve customer data from your database
   - Format the data appropriately
   - Send it to the store owner

2. **customers-redact webhook** (Lines ~117-141 in the file)
   - Uncomment the example deletion code
   - Adapt it to your database schema
   - Add logic for all customer data tables

See `PRIVACY_COMPLIANCE.md` for detailed customization instructions.

## ✅ Deployment Complete!

Once all steps are done, your Shopify app will be compliant with mandatory privacy webhook requirements. Your app can now:
- ✅ Handle customer data access requests
- ✅ Handle customer data deletion requests
- ✅ Automatically delete shop data after uninstall
- ✅ Track all compliance requests for audit purposes

## 📞 Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Review `PRIVACY_COMPLIANCE.md` for detailed troubleshooting
3. Check Shopify webhook delivery attempts in Partner Dashboard
4. Verify all environment variables are set correctly

---

**Ready to deploy?** Start with Step 1 once Supabase is accessible!
