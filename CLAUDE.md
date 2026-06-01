# Tandril — Project Context for Claude
**Last updated:** May 30, 2026 | **Repo:** private | **Owner:** Sarah Evenson

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
| `execute-scheduled-workflows` | Runs workflow steps (AI commands, emails, etc.) | N/A |
| `smart-api` | Orion chat + store action execution | ✅ Confirmed |
| `stripe-checkout` | Creates Stripe Checkout Sessions with user_id metadata | N/A |
| `stripe-billing-portal` | Creates Stripe billing portal sessions | N/A |
| `customers-data-request` | GDPR: handles customer data export requests | N/A |
| `customers-redact` | GDPR: anonymizes customer data on request | N/A |
| `shop-redact` | GDPR: deletes all shop data 48h after uninstall | N/A |

---

## Credentials & Accounts
**All credentials are stored in Supabase secrets and .env — never hardcode them in files.**

- Supabase project: **Tandril_workingmvp** (production)
- Shopify app: **Tandril Beta** (Draft) — client_id in Supabase secrets
- eBay App ID: in Supabase secrets as `EBAY_APP_ID` (add if missing)
- Test Shopify reviewer account: credentials in Supabase secrets / shared separately
- Sarah's account: sarahliz0715@gmail.com (Google OAuth)

---

## Email Setup (Resend)
Outbound email is sent via Resend (resend.com). The `RESEND_FROM_EMAIL` Supabase secret overrides the default sender. The `tandril.org` domain is verified in Resend (us-east-1).

| From address | Used for |
|---|---|
| `noreply@tandril.org` | Workflow emails, general notifications (default fallback) |
| `briefing@tandril.org` | Daily briefing emails from Orion |
| `alerts@tandril.org` | Custom alert emails |
| `hello@tandril.org` | Beta invites + general contact |

- Sarah's personal email: omamahills@gmail.com
- Sarah's Tandril business email: evensonsarah (rarely checked — use omamahills for all forwarding)
- All `@tandril.org` forwarding is configured via **GoDaddy** (domain registrar/DNS host for tandril.org)
- `hello@tandril.org` is a GoDaddy email alias pointing to `security@tandril.org` (Sarah's GoDaddy mailbox)
- `security@tandril.org` forwards to omamahills@gmail.com (set up in GoDaddy Email Forwarding → edit rule)
- GoDaddy email plan is Microsoft 365-style (paid), used to satisfy Etsy developer account requirement

## Stripe Setup
- Stripe account: live mode, business name "Tandril"
- Webhook endpoint: `https://www.tandril.org/api/stripe-webhook`
- Events subscribed: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Products: Tandril Starter ($39.99/mo), Tandril Professional ($129.99/mo), Tandril Enterprise ($299.99/mo)
- Price IDs stored in Supabase secrets as `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_ENTERPRISE`
- `STRIPE_SECRET_KEY` in Supabase secrets; `STRIPE_WEBHOOK_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` in Vercel env vars

## Domain & Hosting
- **Domain registrar / DNS host:** GoDaddy (tandril.org)
- **Frontend hosting:** Vercel (auto-deploys from GitHub main branch)
- **Backend:** Supabase (Tandril_workingmvp project)

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
- **smart-api template literal parse error:** Backtick-wrapped words in CRITICAL scoping rules replaced with single quotes (May 30, 2026)
- **shopify-auth-init CORS/parse error:** Template literals replaced with string concatenation so Supabase editor doesn't mangle them (May 30, 2026)
- **Sidebar nav hide/drag:** Eye icon to hide nav items + drag tooltip added to Layout.jsx (May 30, 2026)
- **Workflow Create button:** Fixed — steps now sync to modal state live without requiring internal Save click first
- **Workflow Run Now:** Added to manual workflow card dropdown menu
- **Workflow step chaining:** `run_ai_command` steps capture Orion's response; `send_email` steps auto-use it as body if left blank
- **Workflow Run Now inactive fix:** Manual runs no longer require `is_active=true` — any workflow can be triggered by ID
- **Stripe integration:** Full upgrade flow built (May 30, 2026):
  - `api/stripe-webhook.js` (Vercel) — verifies signatures, activates/downgrades tiers on payment events
  - `stripe-checkout` edge function — creates Checkout Sessions with user_id + plan_id in metadata
  - `stripe-billing-portal` edge function — creates billing portal sessions for managing subscriptions
  - `pages/StripeSuccess.jsx` — post-checkout landing page
  - Stripe Price IDs stored in Supabase secrets; webhook secret + service role key in Vercel env vars
  - Webhook URL registered in Stripe: `https://www.tandril.org/api/stripe-webhook`
- **GDPR webhooks deployed:** `customers-data-request`, `customers-redact`, `shop-redact` — clears Shopify App Store blocker (May 30, 2026)
- **hello@tandril.org email:** GoDaddy alias → security@tandril.org → forwards to omamahills@gmail.com; beta invites now send from this address (May 30, 2026)
- **Orion action cards logged in History:** smart-api now captures previous variant prices on update_price; History page shows Orion actions by default with undo support; `restore_variant_prices` action type added for price restoration (May 30, 2026)

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
  - [x] GDPR compliance webhooks — deployed (customers-data-request, customers-redact, shop-redact)
  - [ ] Arcade screencast demo for app listing
- Test account for Shopify reviewers:
  - Shopify store: `omhbridge-dev.myshopify.com`
  - Tandril login: `shopify-test@tandril.org`
  - Password: `TandrilTest2026!`
- Testing guide: `docs/shopify-reviewer-testing-guide.md`
- Reviewer instructions (paste into Shopify app submission):

---
**Tandril — Reviewer Testing Instructions**

Thank you for reviewing Tandril. Please follow the steps below to test the app's core functionality.

**Test credentials:**
- Shopify store: `omhbridge-dev.myshopify.com`
- Tandril login: `shopify-test@tandril.org`
- Password: `TandrilTest2026!`

**Step 1 — Connect your store**
Open the app and navigate to **Platforms** in the left sidebar. Click **Connect Shopify**, enter `omhbridge-dev` as the store domain, and click **Continue to Shopify**. Approve the permissions on the Shopify OAuth screen. You will be returned to Tandril with the store showing as connected.

**Step 2 — View live product and inventory data**
Click **Products** in the sidebar. You will see real product titles, prices, and inventory quantities pulled live from the connected store. Copy the title of the first product listed — you will use it in Step 4. Then click **Inventory** to confirm stock levels are visible.

**Step 3 — AI Advisor**
Click **AI Advisor** in the sidebar. In the chat box, type `Show me my low stock products` and send. Orion will return a list pulled from live store data. Then type `What's my best opportunity to grow sales this week?` and send. Review the response.

**Step 4 — AI command with undo**
Click **Commands** in the sidebar. In the command box, type `Lower the price of [paste the product title you copied in Step 2] by $10` and click **Interpret**. Review the action card that appears, then click **Execute**. Navigate to **History** in the sidebar and confirm the command appears as a completed entry. Click the undo button on that entry and confirm the price is restored to its original value.

**Step 5 — Workflows**
Click **Workflows** in the sidebar. Open any existing workflow and review its trigger type and steps. Check the run history to confirm past executions are recorded.
---
- Once screencast is done: ready to submit, then 5–10 business day review

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
- [x] GDPR webhooks deployed — Shopify App Store blocker cleared
- [ ] Record Arcade screencast for Shopify app listing — last blocker before submission
- [ ] Test Stripe upgrade flow end-to-end with a test card
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
- Supabase edge functions: always copy from **main branch** on GitHub — feature branches are deleted after merge
- When deploying edge functions, paste into Supabase dashboard → Edge Functions → [name] → Code → Deploy

---

## Important Habits for Claude Code Sessions
- Always type at least a few words when attaching a file — blank attachment + no text breaks the API and loops every message after it in that session
- At the end of any significant session, ask Claude to update this CLAUDE.md with what changed
- Credentials never go in this file — they live in Supabase secrets or .env
- This repo is PRIVATE — do not change visibility
