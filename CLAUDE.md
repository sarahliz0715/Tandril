# Tandril — Project Context for Claude

## What is Tandril?
Tandril is a multi-platform e-commerce management SaaS tool. It lets sellers manage Shopify, Etsy, eBay, WooCommerce, Faire, and other platforms from one dashboard. Key features: AI-powered commands (bulk price updates, etc.), inventory management, AI advisor ("Orion"), market intelligence, automated workflows, purchase orders.

**Owner:** Sarah Evenson (sarahliz0715@gmail.com)
**Production URL:** https://www.tandril.org
**GitHub repo:** sarahliz0715/Tandril

---

## Architecture

- **Frontend:** React + Vite, deployed on **Vercel** (auto-deploys from GitHub main branch)
- **Backend:** Supabase (auth, database, edge functions)
- **AI:** Anthropic Claude API (model: `claude-haiku-4-5-20251001` — NOT the old `claude-3-haiku-20240307` which is retired)
- **Shopify app:** "Tandril Beta" in Shopify Partners (org: OMH)

### Key Supabase edge functions
- `interpret-command` — uses Claude to parse natural language commands into structured actions
- `execute-command` — executes actions against Shopify API (price updates, inventory, etc.)
- `shopify-auth-init` — starts Shopify OAuth flow
- `shopify-auth-callback` — completes Shopify OAuth
- `ai-insights` — generates market intelligence and niche analysis
- `price-benchmark` — compares seller prices against eBay market data
- `daily-business-briefing`, `growth-opportunity-detector`, `risk-alert-analyzer` — AI analysis functions

**Important:** Supabase edge functions do NOT auto-deploy from GitHub. They must be manually deployed by pasting code into the Supabase dashboard → Edge Functions → [function name] → Edit.

---

## Key Fixes Already Made (do not redo)

- **Claude model ID**: All edge functions updated from retired `claude-3-haiku-20240307` to `claude-haiku-4-5-20251001`
- **Commands/price updates**: Fixed in two places:
  - `execute-command`: Now fetches all products when no product_ids given; updates prices at variant level via `PUT /variants/{id}.json`
  - `interpret-command`: Added explicit PARAMETER SCHEMA to system prompt so Claude uses correct field names (`price_adjustment`, `new_price`, `product_ids`)
- **Intelligence tabs**: Reordered so functional tabs (Trending, Keywords, Price Benchmark) come before Niche Analysis and Seller Positioning
- **Price Benchmark markdown**: Added ReactMarkdown renderer in `PriceBenchmarkCard.jsx`
- **Shopify redirect URLs**: Updated from old Vercel URL to `https://www.tandril.org/api/shopify-callback` in:
  - Supabase secrets (APP_URL, SHOPIFY_REDIRECT_URI)
  - `shopify.app.toml` (deployed as tandril-beta-7)
- **Etsy compliance**: Removed all "competitor" language, added Etsy trademark notice, renamed features

---

## Accounts & Credentials

### Test account for Shopify reviewers
- Email: `shopify-test@tandril.org`
- Password: `TandrilTest2026!`
- Created in Supabase with auto-confirm + full metadata (professional tier, beta access, onboarding complete)

### Sarah's account
- Email: sarahliz0715@gmail.com (Google OAuth)

### Key services
- **Supabase project:** Tandril_workingmvp (production)
- **Shopify app:** Tandril Beta (Draft) — client_id: `41641b42c46bc650c3f4472682f3b6d9`
- **eBay App ID:** `SarahEve-Tandril-PRD-788c6f612-41c184ce` (add as EBAY_APP_ID secret in Supabase if missing)

---

## Platform Submission Status

### Shopify
- App: "Tandril Beta" — Draft status
- Submission requires: app listing completion + Arcade screencast demo
- Test account: shopify-test@tandril.org / TandrilTest2026!
- Testing guide: `docs/shopify-reviewer-testing-guide.md`

### Etsy
- Multiple submissions, all banned
- History tracked in: `docs/etsy-compliance-log.md`
- Current status: Waiting on Shivangi (Etsy support) to pre-approve name/description before resubmitting
- Proposed name for next submission: "Etsy Bulk Product & Inventory Manager"
- Key contact: developer@etsy.com, reference ticket #24354334 (Eva's prior approval)
- DO NOT resubmit until Shivangi approves

---

## Important Technical Notes

### Shopify OAuth flow
1. `ShopifyConnectButton.jsx` calls `shopify-auth-init` edge function
2. User redirected to Shopify → approves → redirected to `tandril.org/api/shopify-callback`
3. Vercel serverless function (`api/shopify-callback.js`) redirects to `/Platforms?shopify_code=...`
4. Platforms page exchanges code via `shopify-auth-callback` edge function

### Commands flow
1. User types command in Commands page
2. `interpret-command` edge function parses it into structured actions with specific parameter names
3. User reviews and clicks Execute
4. `execute-command` edge function runs actions against Shopify API
5. Price updates: always done at VARIANT level, not product level

### Auth
- Supabase auth, sessions stored in localStorage
- `User.me()` calls `supabase.auth.getSession()` — reads from `auth.users` metadata, no separate users table
- Layout retries auth up to 3 seconds after OAuth redirects

### File locations (Windows machine)
- Tandril folder: `C:\Users\Yoga\OneDrive\Desktop\Tandril`
- No Git installed on Windows machine
- No proper git repo on Windows — code lives in GitHub and on Linux server

---

## Pending / In Progress

- [ ] Record Arcade screencast for Shopify submission
- [ ] Wait for Shivangi (Etsy) response before resubmitting
- [ ] Deploy remaining edge functions with updated model ID (only interpret-command and execute-command confirmed deployed)
- [ ] Add EBAY_APP_ID secret to Supabase if not present
- [ ] Fix mock data in QuickInsights, InventoryOverview, ProfitLossAnalysis (deferred)
- [ ] Merge branch `claude/debug-previous-error-FChTX` to main

---

## What NOT to change
- Internal `competitor_analysis` data_type string — kept for backward compatibility
- `CompetitorInsightsCard` component name — internal only
- JWT verification on edge functions — leave ON
