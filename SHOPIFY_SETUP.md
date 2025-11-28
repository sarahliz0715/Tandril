# Shopify Integration Setup Guide

This guide will walk you through setting up real Shopify integration for Tandril, including authentication, commands, and workflows that execute on real Shopify stores.

## Overview

With this setup, your users will be able to:
- ✅ Connect their Shopify stores via OAuth
- ✅ Run natural language commands that execute on their stores (e.g., "Find products with less than 10 in stock")
- ✅ Create automated workflows that run on schedule
- ✅ Use AI to interpret commands and suggest actions

## Architecture

The integration uses:
- **Supabase** - Authentication, database, and Edge Functions (serverless backend)
- **Shopify Admin API** - For managing stores
- **Anthropic Claude or OpenAI** - For AI command interpretation

## Step 1: Set Up Supabase Project

1. **Create a Supabase project:**
   - Go to https://app.supabase.com
   - Click "New Project"
   - Name it (e.g., "Tandril Production")
   - Choose a database password and region
   - Wait for the project to be created (~2 minutes)

2. **Get your Supabase credentials:**
   - Go to Project Settings > API
   - Copy your **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - Copy your **anon/public key** (starts with `eyJ...`)
   - Copy your **service_role key** (starts with `eyJ...`) - Keep this secret!

3. **Run database migrations:**
   - Go to the SQL Editor in Supabase
   - Copy the contents of `supabase/migrations/001_create_shopify_tables.sql`
   - Paste and click "Run"
   - This creates all necessary tables (platforms, ai_commands, ai_workflows, etc.)

4. **Deploy Edge Functions:**

   Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

   Login to Supabase:
   ```bash
   supabase login
   ```

   Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   # Get PROJECT_REF from your Supabase URL: https://YOUR_PROJECT_REF.supabase.co
   ```

   Deploy the Edge Functions:
   ```bash
   supabase functions deploy shopify-auth-init
   supabase functions deploy shopify-auth-callback
   supabase functions deploy interpret-command
   supabase functions deploy execute-command
   ```

## Step 2: Create a Shopify App

1. **Go to Shopify Partners:**
   - Visit https://partners.shopify.com
   - Create a Shopify Partners account if you don't have one
   - Click "Apps" > "Create app"

2. **Create the app:**
   - Choose "Create app manually"
   - App name: "Tandril"
   - App URL: `https://your-app.vercel.app`

3. **Configure OAuth:**
   - In your app settings, go to "App setup"
   - Set **Allowed redirection URL(s)**:
     ```
     https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-auth-callback
     ```
   - Replace `YOUR_PROJECT_REF` with your actual Supabase project reference

4. **Set API scopes:**
   - In "Configuration" > "API access"
   - Select these scopes:
     - `read_products` - View products
     - `write_products` - Edit products
     - `read_orders` - View orders
     - `read_inventory` - View inventory
     - `write_inventory` - Edit inventory
     - `read_price_rules` - View discounts
     - `write_price_rules` - Create discounts

5. **Get your API credentials:**
   - Copy your **Client ID** (this is your SHOPIFY_API_KEY)
   - Click "Reveal" next to Client secret and copy it (this is your SHOPIFY_API_SECRET)

## Step 3: Set Up AI Integration (Optional but Recommended)

For intelligent command interpretation, you'll need an AI API key.

### Option A: Anthropic Claude (Recommended)

1. Go to https://console.anthropic.com
2. Create an account and add credits
3. Go to "API Keys" and create a new key
4. Copy the API key

### Option B: OpenAI

1. Go to https://platform.openai.com
2. Create an account and add credits
3. Go to "API keys" and create a new key
4. Copy the API key

## Step 4: Configure Environment Variables

### In Supabase (for Edge Functions):

Go to Project Settings > Edge Functions > Add new secret

Add these secrets:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_step_1
APP_URL=https://your-app.vercel.app
SHOPIFY_API_KEY=your_shopify_client_id_from_step_2
SHOPIFY_API_SECRET=your_shopify_client_secret_from_step_2
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_inventory,write_inventory,read_price_rules,write_price_rules
SHOPIFY_REDIRECT_URI=https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-auth-callback
```

**Optional (for AI features):**
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key
# OR
OPENAI_API_KEY=your_openai_api_key
```

### In Vercel (for frontend):

Go to your Vercel project > Settings > Environment Variables

Add these variables:
```bash
VITE_STANDALONE_MODE=false
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_from_step_1
```

Make sure to select **Production**, **Preview**, and **Development** environments.

## Step 5: Enable Supabase OAuth Providers (Optional)

If you want to enable Google and GitHub login:

1. Go to Authentication > Providers in Supabase
2. Enable Google:
   - Get credentials from Google Cloud Console
   - Add Client ID and Secret
3. Enable GitHub:
   - Create OAuth app on GitHub
   - Add Client ID and Secret

## Step 6: Deploy and Test

1. **Deploy to Vercel:**
   ```bash
   git push
   ```
   Vercel will automatically deploy your changes.

2. **Test the flow:**
   - Visit your app URL
   - Click "Get Started Free"
   - Sign up for a trial account
   - Go to Platforms page
   - Click "Connect Shopify"
   - Enter a test store name (use a development store)
   - Complete OAuth authorization
   - The store should now appear as connected!

3. **Test commands:**
   - Go to Commands page
   - Try a command like "Find all products"
   - The AI will interpret your command
   - Click "Execute" to run it on your store
   - View the results!

## Troubleshooting

### "Function not found" error

- Make sure you deployed Edge Functions: `supabase functions deploy <function-name>`
- Check that CORS is enabled in your function

### "Unauthorized" error

- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly in Vercel
- Check that you're logged in (clear cookies and try again)

### Shopify OAuth redirect fails

- Verify SHOPIFY_REDIRECT_URI matches exactly in:
  - Shopify app settings
  - Supabase Edge Function secrets
- Make sure the URL uses your actual Supabase project reference

### Commands don't execute

- Check that AI API key is set (ANTHROPIC_API_KEY or OPENAI_API_KEY)
- View Supabase Edge Function logs for errors
- Make sure the platform is connected and has valid credentials

### Database errors

- Run the migration SQL in Supabase SQL Editor
- Check Row Level Security policies are enabled
- Verify the user is authenticated

## Architecture Details

### Data Flow

1. **User connects Shopify store:**
   - Frontend calls `shopify-auth-init` Edge Function
   - Edge Function generates OAuth URL
   - User authorizes on Shopify
   - Shopify redirects to `shopify-auth-callback`
   - Callback exchanges code for access token
   - Token stored in `platforms` table (encrypted)

2. **User runs a command:**
   - Frontend calls `interpret-command` Edge Function
   - AI interprets the command and generates actions
   - Frontend shows confirmation with planned actions
   - User confirms
   - Frontend calls `execute-command` Edge Function
   - Edge Function fetches platform credentials from database
   - Edge Function calls Shopify Admin API
   - Results returned and stored in `ai_commands` table

3. **Workflows run automatically:**
   - Supabase cron job triggers workflow execution
   - `execute-workflow` Edge Function runs
   - Actions executed on Shopify stores
   - Results stored in `workflow_runs` table

### Security

- **OAuth tokens** - Stored in Supabase database with Row Level Security
- **Service role key** - Only used in Edge Functions, never exposed to frontend
- **API keys** - Stored as Supabase secrets, never in code
- **User data** - Protected by Supabase RLS policies

### Database Schema

- `platforms` - Connected Shopify stores
- `ai_commands` - Command history and results
- `saved_commands` - User's saved command templates
- `ai_workflows` - Automated workflows
- `workflow_runs` - Execution history for workflows
- `workflow_templates` - Pre-built workflow templates
- `oauth_states` - Temporary OAuth state storage for security

## Next Steps

- Set up email templates in Supabase for email verification
- Add webhook handling for Shopify events
- Implement workflow scheduler (cron jobs)
- Add payment processing for subscriptions
- Monitor usage and set rate limits

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Check that database migrations ran successfully
5. Test with a Shopify development store first

---

**🎉 Congratulations!** You now have a fully functional Shopify integration with AI-powered commands and workflows!
