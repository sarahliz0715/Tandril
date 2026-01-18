# Shopify Test Account Setup Guide

This guide will help you create a dedicated test account for Shopify app reviewers.

## Option 1: Create Account via UI (Recommended - Easiest)

### Step 1: Create the Account

1. **Open an incognito/private browser window**
2. **Go to:** https://tandril-mvp.vercel.app/Signup
3. **Sign up with:**
   - Email: `shopify-test@tandril.com`
   - Password: `TandrilTest2026!`
   - Full Name: `Shopify Test Account`

4. **Check your email** and confirm the account (if email confirmation is required)

### Step 2: Enable Beta Mode & Features

Once logged in as the test account:

1. **Open browser console** (F12 or right-click → Inspect → Console)
2. **Paste this code** and press Enter:

```javascript
// Enable beta mode and full features for Shopify testing
const { supabase } = await import('/src/api/supabaseClient.js');

const updates = {
  user_mode: 'beta',
  betaAccess: true,
  shopify_beta_access: true,
  onboarding_completed: true,
  subscription_status: 'active',
  subscription_tier: 'professional',
  subscription: 'professional',
  layout_reminder_dismissed: true,
  trial_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
};

const { data, error } = await supabase.auth.updateUser({
  data: updates
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('✅ Test account configured successfully!');
  console.log('Please refresh the page to see beta features.');
}
```

3. **Refresh the page** - You should now see the beta mode dashboard with all features

### Step 3: Generate Demo Data (Optional but Recommended)

1. **Click "Generate Demo Data"** button on the dashboard (if available)
2. **OR** run this in the console:

```javascript
const { generateDemoData } = await import('/src/api/functions.js');
await generateDemoData();
console.log('✅ Demo data generated!');
```

3. **Refresh the page** to see the demo data

---

## Option 2: Create Account via Script (Advanced)

If you have access to Supabase admin credentials:

1. **Set environment variables:**
   ```bash
   export VITE_SUPABASE_URL="your-supabase-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

2. **Install dependencies (if not already installed):**
   ```bash
   npm install @supabase/supabase-js dotenv
   ```

3. **Run the creation script:**
   ```bash
   node scripts/create-shopify-test-account.js
   ```

---

## Test Account Credentials

Once created, use these credentials for Shopify app submission:

### For Shopify App Listing Form:

**Username/Email:**
```
shopify-test@tandril.com
```

**Password:**
```
TandrilTest2026!
```

**Account Description:**
```
Full access test account with beta features enabled and professional tier subscription. This account provides complete access to all Tandril features including AI commands, platform integrations, inventory management, purchase order system, and automation workflows. No additional accounts needed.
```

---

## Verification Checklist

Before submitting to Shopify, verify the test account has:

- ✅ Beta mode enabled (Dashboard shows beta features)
- ✅ No 2FA/MFA required
- ✅ Onboarding marked as completed
- ✅ Professional tier features visible
- ✅ Can navigate to all pages (Commands, Platforms, Inventory, Purchase Orders, etc.)
- ✅ Demo data populated (optional but makes app look better)
- ✅ Can connect to a Shopify development store

---

## Testing the Account

### Login URL:
https://tandril-mvp.vercel.app/Login

### To verify beta mode is working:
1. Log in with test credentials
2. Check that navigation shows: Suppliers, Purchase Orders, Inventory, etc.
3. Dashboard should show "Beta" badge or indicator
4. All features should be accessible

### To connect a Shopify test store:
1. Go to Platforms page
2. Click "Connect Shopify"
3. Use a Shopify development store for testing
4. Verify OAuth flow works correctly

---

## Notes for Shopify Reviewers

You can include this in your Shopify app submission notes:

```
Test Account Notes:
- This account has beta access enabled to demonstrate all app features
- Professional tier subscription is active (no payment required for testing)
- Demo data can be generated from the dashboard to see the app in action
- The app can be tested with any Shopify development store
- No 2FA is required for this test account
- All features are immediately accessible after login
```

---

## Troubleshooting

### If beta mode isn't showing:
- Make sure you ran the console script from Step 2
- Try logging out and back in
- Clear browser cache and try again

### If you can't generate demo data:
- The generateDemoData function might not be deployed yet
- You can manually create test data by connecting platforms and creating items

### If login fails:
- Double-check the email and password
- Try resetting the password via the "Forgot Password" link
- Make sure the account was created and email confirmed

---

## Support

If you need help setting up the test account, contact:
- Email: evensonsarah704@gmail.com
- Make sure to mention this is for Shopify app testing
