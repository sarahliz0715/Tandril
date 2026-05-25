# Tandril — Project Context for Claude
**Last updated:** May 2026 | **Repo:** private | **Owner:** Sarah Evenson

---

## File References
When referencing a file the user should open or copy, always provide the absolute local file path (e.g. `/home/user/Tandril/supabase/functions/smart-api/index.ts`) as a clickable reference. Never paste large code blocks inline when a file path will do — just point to the file.

---

## What is Tandril?
Tandril is an AI-powered multi-platform e-commerce automation SaaS. Sellers connect their stores (Shopify, Etsy, eBay, WooCommerce, and more) and manage everything from one dashboard using natural language commands. Key features: AI-powered bulk commands, inventory management, automated workflows, market intelligence, AI advisor ("Orion"), purchase orders.

**Positioning:** Tandril is an execution layer, not a dashboard. Founder intent → autonomous action. "Your operations manager who never sleeps."

**Production URL:** https://www.tandril.org  
**GitHub:** sarahliz0715/Tandril (PRIVATE — do not make public)  
**Vercel:** auto-deploys from GitHub main branch  

---

## Architecture

- **Frontend:** React + Vite, deployed on Vercel
- **Backend:** Supabase (auth, database, edge functions)
- **AI:** Anthropic Claude API — model: `claude-haiku-4-5-20251001`
  - ⚠️ Do NOT use `claude-3-haiku-20240307` — that model is retired
- **Shopify app:** "Tandril Beta" in Shopify Partners (org: OMH)

### Supabase Edge Functions
All edge functions must be manually deployed by pasting code into:
**Supabase dashboard → Edge Functions → [function name] → Edit**
They do NOT auto-deploy from GitHub.

| Function | Purpose | Model Updated? |
|---|---|---|
| `interpret-command` | Parses natural language commands into structured actions | ✅ Confirmed |
| `execute-command` | Runs actions against Shopify API | ✅ Confirmed |
| `ai-insights` | Market intelligence and niche analysis | ⚠️ Needs verification |
| `price-benchmark` | Compares prices against eBay market data | ⚠️ Needs verification |
| `daily-business-briefing` | AI daily summary | ⚠️ Needs verification |
| `growth-opportunity-detector` | AI growth analysis | ⚠️ Needs verification |
| `risk-alert-analyzer` | AI risk analysis | ⚠️ Needs verification |
| `shopify-auth-init` | Starts Shopify OAuth flow | N/A |
| `shopify-auth-callback` | Completes Shopify OAuth | N/A |

---

## Credentials & Accounts
**All credentials are stored in Supabase secrets and .env — never hardcode them in files.**

- Supabase project: **Tandril_workingmvp** (production)
- Shopify app: **Tandril Beta** (Draft) — client_id in Supabase secrets
- eBay App ID: in Supabase secrets as `EBAY_APP_ID` (add if missing)
- Test Shopify reviewer account: credentials in Supabase secrets / shared separately
- Sarah's account: sarahliz0715@gmail.com (Google OAuth)

---

## Key Fixes Already Made — Do Not Redo

- **Claude model ID:** All confirmed edge functions updated from retired `claude-3-haiku-20240307` to `claude-haiku-4-5-20251001`
- **Commands/price updates:** Fixed in two places:
  - `execute-command`: Fetches all products when no product_ids given; updates prices at variant level via `PUT /variants/{id}.json`
  - `interpret-command`: Added explicit PARAMETER SCHEMA to system prompt so Claude uses correct field names (`price_adjustment`, `new_price`, `product_ids`)
- **Orion multi-product scoping:** Fixed in `smart-api/index.ts` — `findProduct()` now requires ≥3 word matches, `update_price` updates all variants, system prompt guards against batch_update for single-product commands
- **History title truncation:** Fixed in `History.jsx` — removed 80-char cap, shows full `command_text`
- **Intelligence tabs:** Reordered so functional tabs (Trending, Keywords, Price Benchmark) come before Niche Analysis and Seller Positioning
- **Price Benchmark markdown:** Added ReactMarkdown renderer in `PriceBenchmarkCard.jsx`
- **Shopify redirect URLs:** Updated from old Vercel URL to `https://www.tandril.org/api/shopify-callback` in:
  - Supabase secrets (APP_URL, SHOPIFY_REDIRECT_URI)
  - `shopify.app.toml` (deployed as tandril-beta-7)
- **Etsy compliance:** Removed all "competitor" language, added Etsy trademark notice, renamed features
- **Repo visibility:** Changed to private May 2026

---

## How Flows Work

### Commands flow
1. User types command in Commands page
2. `interpret-command` edge function parses it into structured actions with specific parameter names
3. User reviews and clicks Execute
4. `execute-command` edge function runs actions against Shopify API
5. Price updates: always done at VARIANT level, not product level

### Shopify OAuth flow
1. `ShopifyConnectButton.jsx` calls `shopify-auth-init` edge function
2. User redirected to Shopify → approves → redirected to `tandril.org/api/shopify-callback`
3. Vercel serverless function (`api/shopify-callback.js`) redirects to `/Platforms?shopify_code=...`
4. Platforms page exchanges code via `shopify-auth-callback` edge function

### Auth
- Supabase auth, sessions stored in localStorage
- `User.me()` calls `supabase.auth.getSession()` — reads from `auth.users` metadata, no separate users table
- Layout retries auth up to 3 seconds after OAuth redirects

---

## Platform Status

### Shopify App Store
- App "Tandril Beta" — currently Draft status
- **Blockers before submission:**
  - [ ] GDPR compliance webhooks (3 required endpoints) — not yet implemented
  - [ ] Arcade screencast demo for app listing
- Test account for Shopify reviewers: see Supabase secrets
- Testing guide: `docs/shopify-reviewer-testing-guide.md`
- Once GDPR webhooks done: ~3 days to ready, then 5–10 business day review

### Etsy
- **Status: BLOCKED — do not resubmit yet**
- Multiple prior submissions have been banned
- Currently waiting on **Shivangi** (Etsy support) to pre-approve name/description before resubmitting
- Key contact: developer@etsy.com, reference ticket #24354334 (Eva's prior approval)
- Proposed name for next submission: "Etsy Bulk Product & Inventory Manager"
- History tracked in: `docs/etsy-compliance-log.md`
- DO NOT resubmit until Shivangi explicitly approves

### Platform Integration Parity
| Platform | Status |
|---|---|
| Shopify | Full parity |
| WooCommerce | Full parity confirmed |
| eBay | Full parity (no Tags) |
| Etsy | Full parity — pending API approval |
| Amazon | Built — pending approval |
| TikTok Shop | Built — pending approval |
| BigCommerce | Built — pending approval |
| Faire | Built — pending approval |

---

## Pending / In Progress

- [ ] Verify + deploy remaining edge functions with updated model ID (see table above)
- [ ] Implement GDPR webhooks (3 endpoints) — unlocks Shopify App Store submission
- [ ] Record Arcade screencast for Shopify app listing
- [ ] Add `EBAY_APP_ID` secret to Supabase if not already present
- [ ] Wait for Shivangi (Etsy) approval before any resubmission
- [ ] Fix mock data in QuickInsights, InventoryOverview, ProfitLossAnalysis (deferred — intentional until user connects store)

---

## What NOT to Change
- Internal `competitor_analysis` data_type string — kept for backward compatibility
- `CompetitorInsightsCard` component name — internal only, not user-facing
- JWT verification on edge functions — leave ON
- Mock data behavior before store connection — intentional UX

---

## File Locations
- Windows machine: `C:\Users\Yoga\OneDrive\Desktop\Tandril`
- No Git installed on Windows machine
- No proper git repo on Windows — code lives in GitHub and on Linux server
- Supabase edge functions: edit directly in Supabase dashboard (do not rely on GitHub version)

---

## Important Habits for Claude Code Sessions
- Always type at least a few words when attaching a file — blank attachment + no text breaks the API and loops every message after it in that session
- At the end of any significant session, ask Claude to update this CLAUDE.md with what changed
- Credentials never go in this file — they live in Supabase secrets or .env
- This repo is PRIVATE — do not change visibility
