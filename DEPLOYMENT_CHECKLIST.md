# Quick Deployment Checklist

Use this checklist to deploy your compliance webhooks to Supabase.

## ✅ Pre-Deployment Information

Fill in your project details:

```
Supabase Project Reference: _________________
Supabase Project URL: _________________
```

Your webhook URLs will be:
```
1. https://[YOUR_PROJECT_REF].supabase.co/functions/v1/customers-data-request
2. https://[YOUR_PROJECT_REF].supabase.co/functions/v1/customers-redact
3. https://[YOUR_PROJECT_REF].supabase.co/functions/v1/shop-redact
```

## 📁 Files Ready for Deployment

All files are ready in your repository:

### Edge Functions (3 files):
- ✅ `supabase/functions/customers-data-request/index.ts` (155 lines)
- ✅ `supabase/functions/customers-redact/index.ts` (185 lines)
- ✅ `supabase/functions/shop-redact/index.ts` (225 lines)

### Database Migration:
- ✅ `supabase/migrations/002_create_compliance_requests.sql`

## 🚀 Deployment Steps

### STEP 1: Deploy Edge Functions via Dashboard

For each function, do the following:

#### 1a. Deploy customers-data-request
1. Go to https://app.supabase.com → Your Project
2. Click "Edge Functions" in sidebar
3. Click "Create a new function"
4. Function name: `customers-data-request`
5. Copy ALL contents from `supabase/functions/customers-data-request/index.ts`
6. Paste into code editor
7. Click "Deploy"
8. ✅ Mark as done when deployed

#### 1b. Deploy customers-redact
1. Click "Create a new function"
2. Function name: `customers-redact`
3. Copy ALL contents from `supabase/functions/customers-redact/index.ts`
4. Paste into code editor
5. Click "Deploy"
6. ✅ Mark as done when deployed

#### 1c. Deploy shop-redact
1. Click "Create a new function"
2. Function name: `shop-redact`
3. Copy ALL contents from `supabase/functions/shop-redact/index.ts`
4. Paste into code editor
5. Click "Deploy"
6. ✅ Mark as done when deployed

### STEP 2: Run Database Migration

1. In Supabase Dashboard → Click "SQL Editor"
2. Click "New query"
3. Copy ALL contents from `supabase/migrations/002_create_compliance_requests.sql`
4. Paste into SQL Editor
5. Click "Run" (or Ctrl+Enter)
6. Verify success message appears
7. Go to "Table Editor" → Look for `compliance_requests` table
8. ✅ Mark as done when table exists

### STEP 3: Configure Environment Variables

1. In Supabase Dashboard → "Project Settings" → "Edge Functions"
2. Scroll to "Secrets" section
3. Add these 3 secrets:

**Secret 1:**
- Name: `SHOPIFY_API_SECRET`
- Value: [Your Shopify App Client Secret from Partner Dashboard]

**Secret 2:**
- Name: `SUPABASE_URL`
- Value: [Your Supabase Project URL, e.g., https://xxxxx.supabase.co]

**Secret 3:**
- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: [Get from Project Settings → API → service_role key]

4. ✅ Mark as done when all 3 secrets are saved

### STEP 4: Get Webhook URLs

After deploying, your webhook URLs are:

```
customers/data_request:
https://[YOUR_PROJECT_REF].supabase.co/functions/v1/customers-data-request

customers/redact:
https://[YOUR_PROJECT_REF].supabase.co/functions/v1/customers-redact

shop/redact:
https://[YOUR_PROJECT_REF].supabase.co/functions/v1/shop-redact
```

**Write your actual URLs here:**
```
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________
```

### STEP 5: Register Webhooks in Shopify

1. Go to https://partners.shopify.com
2. Click "Apps"
3. Select your app
4. Click "Configuration" → Scroll to "Webhooks"

**Add Webhook 1:**
- Topic: `customers/data_request`
- URL: [Your URL from Step 4 #1]
- Format: JSON
- API Version: 2024-07
- ✅ Save and mark as done

**Add Webhook 2:**
- Topic: `customers/redact`
- URL: [Your URL from Step 4 #2]
- Format: JSON
- API Version: 2024-07
- ✅ Save and mark as done

**Add Webhook 3:**
- Topic: `shop/redact`
- URL: [Your URL from Step 4 #3]
- Format: JSON
- API Version: 2024-07
- ✅ Save and mark as done

### STEP 6: Test Webhooks

1. In Supabase Dashboard → "Edge Functions"
2. Click on `customers-data-request`
3. Click "Logs" tab
4. Keep this open

5. In another tab, trigger a test webhook from Shopify:
   - Option A: Use Shopify Partner Dashboard webhook test feature
   - Option B: Connect a development store and trigger manually

6. Check if logs appear in Supabase
7. Check if records appear in `compliance_requests` table

8. Repeat for other two webhooks
9. ✅ Mark as done when all 3 webhooks receive test data

## ✅ Final Verification

Check all boxes:
- [ ] All 3 Edge Functions deployed
- [ ] Database migration ran successfully
- [ ] compliance_requests table exists
- [ ] All 3 environment variables set
- [ ] All 3 webhooks registered in Shopify
- [ ] All 3 webhooks tested and working
- [ ] HMAC verification working (no 401 errors)

## 🎉 Deployment Complete!

Once all boxes are checked, your Shopify app is fully compliant with privacy webhook requirements!

## 📋 Notes & Issues

Use this space to track any issues encountered:

```
Issue 1: ____________________________________________
Solution: ____________________________________________

Issue 2: ____________________________________________
Solution: ____________________________________________
```

## 🔗 Quick Links

- Supabase Dashboard: https://app.supabase.com
- Shopify Partner Dashboard: https://partners.shopify.com
- Full Guide: See DEPLOYMENT_GUIDE.md
- Detailed Docs: See PRIVACY_COMPLIANCE.md
