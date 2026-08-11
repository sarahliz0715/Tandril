# Tandril — Project Context for Claude
**Last updated:** August 11, 2026 | **Repo:** private | **Owner:** Sarah Evenson

---

## File References
When referencing a file the user should open or copy, always provide the absolute local file path (e.g. `/home/user/Tandril/supabase/functions/smart-api/index.ts`) as a clickable reference. Never paste large code blocks inline when a file path will do — just point to the file.

---

## What is Tandril?
Tandril is an AI-powered multi-platform e-commerce automation SaaS. Sellers connect their stores (Shopify, Etsy, eBay, WooCommerce, and more) and manage everything from one dashboard using natural language commands. Key features: AI-powered bulk commands, inventory management, automated workflows, market intelligence, AI advisor ("Orion"), purchase orders.

**Positioning:** Tandril is an execution layer, not a dashboard. Founder intent → autonomous action. "Your operations manager who never sleeps."

**Production URL:** https://www.tandril.org  
**GitHub:** sarahliz0715/Tandril (PRIVATE — do not make public)  
**Vercel:** auto-deploys from GitHub main branch — ⚠️ **two Vercel projects track this repo**: `tandril-mvp` is bound to the `www.tandril.org` production domain (this is the one that matters); `tandril` is a separate project (`tandril.vercel.app`) that also builds on every push but is NOT production. When checking/setting env vars for anything user-facing, use `tandril-mvp`.  

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

## Shopify API Credentials
- **Client ID** = `SHOPIFY_API_KEY` in code/Vercel/Supabase
- **Client Secret** = `SHOPIFY_API_SECRET` in code/Vercel/Supabase
- Shopify rebranded "API key/secret" to "Client ID/Secret" — they are the same thing
- Location: Shopify Partners dashboard → Tandril Beta → **"visit your Dev Dashboard"** (blue banner) → **Settings** → Credentials section
- Direct path: partners.shopify.com → Apps → Tandril Beta → Overview → blue "visit your Dev Dashboard" link → Settings
- Current Client ID: `41641b42c46bc650c3f4472682f3b6d9`

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
- **Shopify Billing — confirmed non-embedded, pivoted to Managed Pricing:** `shopify.app.toml` has `embedded = false`, so the app is never rendered in an iframe — the classic "confirmationUrl navigated inside the iframe" bug does not apply here. `Pricing.jsx` / `SubscriptionSettings.jsx` already open Shopify's own Managed Pricing page (`admin.shopify.com/store/{handle}/charges/tandril-beta/pricing_plans`) in a new tab via `window.open` (not `window.location.href`) — this was done July 18, 2026.
- **Shopify Billing — shop-identity audit (July 21, 2026):** the real cause of repeated "doesn't recognize the store we're connected to" rejections was `.single()`/`.maybeSingle()` calls against the `platforms` table with no deterministic ordering. A user/shop can have more than one row (reconnect to a different store, stale rows left from earlier review cycles), so these calls either threw (silently reported as "no store connected") or picked an arbitrary/stale row. Fixed in `api/shopify-sync-plan.js`, `supabase/functions/shopify-billing/index.ts`, `supabase/functions/app-subscription-update/index.ts`, `supabase/functions/app-uninstalled/index.ts` to always resolve to the most recently updated **active** row (`order by is_active desc, updated_at desc, limit 1`) instead. Also fixed frontend `Platform.filter()` calls in `Pricing.jsx`/`SubscriptionSettings.jsx` — they were relying on the default `-created_at` ordering, which does NOT reflect reconnects (a reconnect updates `updated_at` on the existing row, not `created_at`), so a stale store could outrank the actually-connected one; now explicitly ordered by `-updated_at`.
- **Shopify Billing — closed an auth hole:** `shopify-billing`'s fallback path previously trusted a client-supplied `shop` param and queried it via the service-role client with **no ownership check** — any authenticated Tandril user could pass an arbitrary shop domain and read/act on another merchant's billing connection. Now the `shop` param only narrows the lookup within the caller's own `user_id`-scoped rows.
- **`app-subscription-update` webhook now fails closed on bad HMAC:** previously logged a warning and processed the payload anyway ("processing anyway for review") — now rejects (still returns 200 so Shopify doesn't retry-storm, but does not touch tier/entitlement state) if the HMAC signature doesn't verify against `SHOPIFY_API_SECRET`. **If tier upgrades stop syncing after this deploys, check Supabase logs for `HMAC verification failed` — it likely means the signing secret Shopify uses no longer matches `SHOPIFY_API_SECRET`, which is what the old code was silently working around.**
- **Shopify plan sync-back fixed — root cause was config, not code (July 23, 2026):** merchants who upgraded on Shopify's Managed Pricing screen kept seeing an old plan (e.g. Professional shown as Starter) in Tandril's Subscription settings. Two code bugs were fixed first (`api/shopify-sync-plan.js` and `app-subscription-update` now resolve tier by the subscription's **price** — `$39.99`/`$129.99`/`$299.99` → starter/professional/enterprise — instead of exact-matching Shopify's configurable plan display name, which was silently mismatching and, in the webhook, defaulting straight to `'starter'`). But the actual blocker turned out to be infrastructure: **`ENCRYPTION_SECRET` was missing entirely from `tandril-mvp`'s Vercel env vars** (it only ever existed in Supabase's edge function secrets — a separate store — and `api/shopify-sync-plan.js` is a Vercel function, added later, that nobody carried the var over for). Once added, decryption of the stored Shopify access token *still* failed (`decrypt_ok: false` even on a freshly-reconnected token), meaning Vercel's copy of `ENCRYPTION_SECRET` didn't actually match Supabase's value (copy/paste mismatch via Supabase's hover-to-reveal secrets UI). Fixed by generating a brand-new `ENCRYPTION_SECRET` and setting the identical value in both Supabase and Vercel (`tandril-mvp`, Production + Preview) at once, then reconnecting all Shopify stores (rotating this secret invalidates every previously-encrypted `access_token` in the `platforms` table — any store connected before this rotation needs to disconnect/reconnect). **Also found and fixed in passing:** `SHOPIFY_API_SECRET` in Supabase had gone stale/mismatched against the Shopify Partners app's actual current Client Secret, causing OAuth reconnection to fail with "Missing or invalid client secret" — re-copied from Partners Dashboard → Tandril Beta → Settings → Credentials. **Lesson for future sessions:** when a merchant-facing value looks wrong or an integration call fails with an auth/permission-shaped error, check for a secret mismatch between Supabase and Vercel before assuming the logic is wrong — `api/*.js` reads Vercel env vars, `supabase/functions/*` read Supabase secrets, and nothing keeps the two in sync automatically.
- **Shopify OAuth — account-identity-swap bug fixed (HIGH severity, PR #144/#146):** connecting a Shopify store while logged in could silently swap the active Tandril session to a different account. Root cause: `api/shopify-callback.js`'s Flow A (logged-in reconnect) vs. Flow B (anonymous App Store install) decision logic fell through to Flow B whenever a shop-domain case mismatch or store-rename alias caused its `oauth_states` lookup to look empty. Fixed by looking up `oauth_states` by `state` alone (not `state + shop_domain`), failing closed (error redirect, not Flow-B fallthrough) on an expired/missing row instead of assuming anonymous install, lowercasing shop domain at storage time in `shopify-auth-init`, and removing the `shop_domain` equality gate in `shopify-auth-exchange` entirely (a renamed store's old alias vs. Shopify's current canonical handle caused a false-positive rejection) — state + user_id + expiry is the real security property, not shop-domain matching.
- **`interpret-command` given the same retry-with-backoff as `smart-api` (PR #147):** was the only Claude-calling edge function with no retry logic — a single `overloaded_error`/429/500/502/503/529 would fail the whole command interpretation. Now retries up to 3x with 1s/2s/4s exponential backoff, identical pattern to `smart-api`.
- **Orion hallucinating completed actions with no action card (PR #148/#149/#150):** Orion would claim to have archived products, applied SEO changes, etc. with zero actual backend effect and no `[ORION_ACTION:{...}]` block for the user to approve — a serious trust bug since nothing was actually happening despite Orion saying it was "done." Fixed in `components/coach/AIBusinessCoach.jsx`'s `ensureActionBlock()` safety net across three rounds as new failure modes surfaced from live testing: (1) broadened the completion-claim trigger regex, which originally only matched `confirm (all|this|these|that)`; (2) added detection for Orion drifting into literal `<invoke>`/`<function_calls>` XML tool-call syntax (leftover from tool-use training, despite the system prompt explicitly forbidding it) with a targeted correction nudge distinct from the generic "no action block" nudge; (3) the broadened regex from (1) started false-firing on `reportToOrion`'s legitimate truthful post-execution summaries, causing an unnecessary nudge round-trip with no request timeout — manifested as a hung spinner until the user refreshed. Fixed via a `suspectFalseCompletion` flag, disabled at the `reportToOrion` call site since those completion claims are truthful by construction. **Known gap, not yet fixed:** no request timeout (`AbortController`) anywhere in the Claude API call chain — a slow/hung Anthropic response can still hang the UI indefinitely; the nudge round-trip bug above was a symptom of this.
- **eBay Connect — already fully built, do not rebuild (audited Aug 7, 2026):** a dev spec asked for eBay OAuth connect "mirroring Shopify" as if greenfield work. It already exists end-to-end: `ebay-auth-init`/`ebay-auth-callback` edge functions, `EbayConnectButton.jsx` wired into `PlatformCard.jsx`, `pages/EbayCallback.jsx`, and correct per-user token scoping via a unique `oauth_states` row per connect attempt (no shared/global session var — eBay has no anonymous-install ambiguity like Shopify does, since it's only ever initiated by an already-logged-in user). Token refresh-on-expiry is already implemented at every real eBay call site (`smart-api` x3, `sync-inventory-levels`, `cancel-flash-sale`, `process-scheduled-sales`, `process-price-restores`, and now `fetch-platform-products` — see below). `EBAY_CLIENT_ID`/`EBAY_CLIENT_SECRET` (OAuth) and `EBAY_APP_ID` (legacy Finding API, used only by `price-benchmark`) are two separate secrets — don't confuse them.
- **eBay token refresh not persisted in `fetch-platform-products` (PR #151):** `fetchEbayProducts()` was the one eBay call site that refreshed the access token in-memory near expiry but never wrote it back to the `platforms` row, unlike every other eBay call site — caused it to silently re-refresh on every single call instead of reusing the cached token. Fixed to persist `access_token`/`refresh_token`/`token_expires_at` the same way the others do.
- **eBay "Connect eBay" was actually broken end-to-end despite passing code review — root cause was eBay-portal config, not Tandril code (fixed live Aug 8, 2026):** clicking Connect eBay returned eBay's generic `{"error_id":"invalid_request","error_description":"Input request parameters are invalid.","http_status_code":400}` from `auth.ebay.com/oauth2/authorize`. Full chain of what was wrong, in the order it was found:
  1. **eBay's OAuth `redirect_uri` must be a RuName, not a URL.** Unlike every other platform integrated here, eBay's `/oauth2/authorize` and token-exchange endpoints take a **RuName** (a short identifier registered in eBay Developer Portal → Application Keys → "Get a Token from eBay via Your Application") in the `redirect_uri` param — not a literal callback URL. `ebay-auth-init`/`ebay-auth-callback` were both passing `${APP_URL}/ebay-callback` directly. Fixed by adding an `EBAY_RU_NAME` Supabase secret and using it as `redirect_uri` in both functions (must match exactly in both the authorize call and the token exchange).
  2. **A direct-to-`main` push (no PR) broke `ebay-auth-init/index.ts`.** While applying fix #1, a commit landed straight on `main` (bypassing the PR workflow this repo otherwise uses) and left `ebay-auth-init/index.ts` truncated to 27 lines, cut off mid-statement — missing the scopes list, the RuName check, and the entire auth-URL builder. The file happened to still be correct in Supabase (what got pasted into the dashboard wasn't affected), but GitHub `main` was broken and would have shipped a non-functional file on the next redeploy. **Lesson: always verify a file's line count / that it still parses after any direct-to-main or dashboard-paste edit, especially ones not made through the normal branch+PR flow.**
  3. **eBay lets you register multiple RuNames per keyset, but only one can have OAuth actually enabled.** The eBay Developer Portal's RuName table has an "OAuth Enabled" column (green checkmark) — a RuName without that checkmark will fail with the same generic `invalid_request`, even if the RuName string itself is spelled correctly and belongs to the right (Production, not Sandbox) keyset. Sarah had three RuNames registered; only one (`...lygvxu`) had OAuth enabled. `EBAY_RU_NAME` must point at the OAuth-enabled one.
  4. **The OAuth-enabled RuName's accepted/declined/privacy URLs were pointed at an unrelated, unused domain** (`loud-gecko-80-gm2h2jv58zyt.deno.dev`, apparently a leftover from an earlier prototype attempt, since disowned/confirmed as her own old work — not a third-party leak). Even with the RuName itself correctly OAuth-enabled, eBay's authorize step succeeded but then redirected the real authorization code to that stray domain instead of back to Tandril, so the connection never completed on Tandril's side. Fixed by updating that RuName's **"Your auth accepted URL"** to `https://www.tandril.org/ebay-callback`, **"Your auth declined URL"** to `https://www.tandril.org/Platforms?error=ebay_declined`, and **"Your privacy policy URL"** to `https://www.tandril.org/PrivacyPolicy` in the eBay Developer Portal (Supabase secrets/code changes alone cannot fix this — it's config that only exists eBay-side, tied to the specific RuName).
  5. **Cosmetic, fixed in passing:** `ebay-auth-callback/index.ts` never set `shop_name`/`shop_domain` on the `platforms` row it creates — only `name` and `metadata.username`. `PlatformCard.jsx` reads `shop_name || shop_domain` to show the connected store name next to the "Connected" badge (this is how Shopify's card shows its store name), so the eBay card showed "Connected" with no username. Fixed to set both fields. Only takes effect on a fresh connect — an already-connected row needs a disconnect/reconnect to pick it up.
  - **If eBay Connect breaks again:** check, in this order — (a) does `EBAY_RU_NAME` in Supabase match a RuName that's actually OAuth-enabled in the Developer Portal (Production tab), (b) does that RuName's accepted/declined/privacy URLs actually point at `www.tandril.org`, (c) is `ebay-auth-init/index.ts` on `main` still a complete, parseable file (this broke silently once already).
- **WooCommerce had a real "0 products" bug, and a separate connect-flow crash — both fixed and verified live (Aug 8, 2026):** WooCommerce's write side (Orion price/inventory/title updates, coupons, order actions) was fully built, but connecting a store showed 0 products/inventory with no way to self-resolve. Two distinct bugs found via an actual live test (spun up a disposable WordPress+WooCommerce sandbox on InstaWP.io — no other integration needs WordPress, this is WooCommerce-specific):
  1. **No live-fetch path for WooCommerce (PR #155).** `Products.jsx`'s `LIVE_FETCH_PLATFORMS` only covered `shopify`/`ebay`/`tiktok_shop`/`amazon`, and `smart-api`'s `getUserStoreContext` only live-fetched `ecwid`/`magento`/`prestashop`/`wish`/`walmart`/`etsy`. Everything else fell back to a local `products` table that **doesn't exist in the database** (see the still-open gap noted elsewhere in this file), so WooCommerce silently returned nothing. Fixed by adding a WooCommerce branch to both `smart-api` locations (`get_inventory` action + `getUserStoreContext`, fetching directly from `/wp-json/wc/v3/products` the same way Ecwid/Magento/PrestaShop already do) and adding `'woocommerce'` to `Products.jsx`'s `LIVE_FETCH_PLATFORMS`. `Inventory.jsx` needed no change — it calls `getShopifyInventory()` unconditionally and picked up the fix automatically.
  2. **`platforms_limit`/`api_usage_limit` were never surfaced to the frontend at all (PR #156).** While testing, the "Connect WooCommerce" button stayed disabled even after directly setting `platforms_limit: 50` in `auth.users.raw_user_meta_data` via SQL. Root cause: `lib/supabaseAuth.js`'s `User.me()` builds a curated user object and never included either field, even though both are correctly set by the Stripe webhook and Shopify billing sync on subscription changes. **This meant every user — including paying Professional/Enterprise customers — was silently capped at the free-tier default of 2 connected platforms, regardless of what tier they were actually paying for.** Fixed by adding both fields to `me()`'s return object.
  3. **Connect button crashed right after a successful connection, for WooCommerce AND BigCommerce AND Faire (PR #157).** `supabaseFunctions.js`'s `connectWooCommerce`/`connectBigCommerce`/`connectFaire` wrappers return `{ data: response }`, where `response` is already the edge function's own full body — `{ success, message, data: { platform, store_info } }`. So `store_info`/`platform` actually live at `response.data.data.*`, two levels deep — but all three button components read `response.data.store_info`/`response.data.platform`, one level too shallow, throwing `Cannot read properties of undefined (reading 'name')` right after the backend connection had already succeeded. The crash happened before `onConnectionSuccess()` ran, so the Platforms page also never refreshed to show the new connection. Fixed in all three button components.
  - **Verified end-to-end** with a real WooCommerce test store: 3 products with distinct stock levels showed correctly on the Products page with real prices/stock/status alongside live Shopify and eBay data.
  - **If WooCommerce (or BigCommerce/Faire) connect misbehaves again:** check whether it's actually a live-fetch gap (products page shows 0 despite a successful connection — see #1), a `platforms_limit` display issue (connect button stays disabled despite a correct DB value — see #2), or a post-connect crash (error right after submitting credentials, but the connection likely succeeded anyway — see #3). These are three independent, unrelated bugs that happened to surface together during the same test session — don't assume fixing one fixes the others.
- **BigCommerce — verified end-to-end same day as WooCommerce (Aug 8, 2026), "pending approval" in the parity table was misleading:** that label actually referred to formal BigCommerce App Marketplace listing (public discovery), not functional connectivity — `BigCommerceConnectButton.jsx`'s manual-credentials path (`store_hash` + `access_token`) requires zero platform-side approval, just a normal free-trial BigCommerce store and a self-generated Store-level API account (Settings → API → API Accounts → Create API Account — must be the modern "API Account" type, not "Legacy," and must include the **Information & Settings** scope in addition to **Products**, or the connection test 403s with "You don't have a required scope"). Two fixes shipped:
  1. **Same missing live-fetch gap as WooCommerce (PR #159), found proactively this time** before live testing — BigCommerce was in neither `Products.jsx`'s `LIVE_FETCH_PLATFORMS` nor `smart-api`'s `getUserStoreContext` loop. Fixed the same way, fetching from `/stores/{store_hash}/v3/catalog/products`.
  2. **No platform-identifying name, and missing `shop_name`/`shop_domain` (PR #160).** `bigcommerce-connect` stored the raw BigCommerce store name (e.g. "Tandrilteststore") with nothing indicating it was a BigCommerce connection, unlike eBay's "eBay - username" pattern — and never set `shop_name`/`shop_domain` either, the same gap eBay had (PR #151). Fixed to store `BigCommerce - {store name}` and set both fields. Only takes effect on disconnect/reconnect.
  - Note: a fresh BigCommerce trial store comes pre-seeded with ~15 sample demo products (shown as ~30 after the connect flow's dedup-by-SKU quirk) — this is BigCommerce's own default catalog, not a Tandril bug. Bulk-delete them in BigCommerce admin if a cleaner test catalog is wanted, not required.
  - **The "Built — pending approval" label in the parity table should not be trusted at face value for any platform without checking what the connect flow actually requires** — BigCommerce and WooCommerce both turned out to need zero platform approval for functional testing; only true OAuth-app-review platforms (Amazon SP-API, TikTok Shop Partner Center) are genuinely blocked.
- **CLAUDE.md correction — Meta/Facebook section was stale, not just incomplete (Aug 11, 2026):** the "Ad Campaign Feature — Roadmap (Not Yet Built)" framing implied zero Meta/Facebook work existed. In reality the Meta OAuth connect flow (`FacebookConnectButton.jsx`, `oauth-init`/`oauth-callback` edge functions, `meta_ads` platform type) and Instagram catalog sync are real, live, and reachable from the Platforms page today — only the actual ad-campaign creation/launch feature (`Ads.jsx` and its modals) is still mock-only. Rewritten into "Meta / Facebook Integration — What's Actually Built vs. Not" below. Nothing was fixed here — this was a documentation-only correction; the `Ads.jsx` modal prop-mismatch bug it surfaced is still open.

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
| BigCommerce | Full parity confirmed — self-service `store_hash`+`access_token`, no platform approval needed (see Key Fixes) |
| Faire | Built — pending approval |
| Facebook / Meta | OAuth connect + Instagram catalog sync built and live — NOT full parity (no product/inventory/price write-back like the commerce platforms above; see "Meta / Facebook Integration" below) |

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

## GraphQL Migration — Checkpoint (June 4, 2026, ~2:00 PM)

On June 4, 2026 we began migrating all Shopify REST API calls to GraphQL Admin API to meet Shopify App Store requirement 2.2.4. Everything below describes the state of the codebase BEFORE this migration began. If anything breaks after the migration, roll back to the last commit before this point.

**Last known-good commit before migration:** run `git log --oneline` and look for the commit just before any "GraphQL migration" commits.

**What was working before migration:**
- smart-api deployed and functional (Orion, Commands, Products page)
- execute-command deployed
- execute-scheduled-workflows deployed
- sync-inventory-levels built, not yet deployed
- All GDPR webhooks deployed
- Stripe + Shopify Billing both implemented
- Orion fixes deployed (no unsolicited action blocks, 3-at-a-time batching, no artifact tags)
- History clear + undo working (pending RLS DELETE policy fix in Supabase SQL)

**Functions being migrated (31 total, 6 agent groups):**
- Group A: `smart-api`
- Group B: `execute-command`, `enhanced-execute-command`, `undo-command`, `execute-scheduled-workflows`
- Group C: `sync-inventory-levels`, `sync-po-inventory`, `cancel-flash-sale`, `process-price-restores`, `process-scheduled-sales`
- Group D: `ai-insights`, `daily-business-briefing`, `daily-briefing-cron`, `growth-opportunity-detector`, `risk-alert-analyzer`, `calculate-pnl`
- Group E: `onboarding-store-analyzer`, `fetch-platform-products`, `fetch-product-variants`, `link-products`, `check-alerts`, `smart-trigger-evaluator`
- Group F: `seo-fixer`, `ai-content-generator`, `ai-coach-chat`, `inventory-protection`, `price-guardrail`, `dead-product-cleanup`, `order-monitor`, `shopify-order-webhook`

**Exempt from migration:** `shopify-billing` (already GraphQL), `shopify-auth-callback`, `shopify-auth-exchange` (auth endpoints)

---

## File Locations
- Windows machine: `C:\Users\Yoga\OneDrive\Desktop\Tandril`
- No Git installed on Windows machine
- No proper git repo on Windows — code lives in GitHub and on Linux server
- Supabase edge functions: always copy from **main branch** on GitHub — feature branches are deleted after merge
- When deploying edge functions, paste into Supabase dashboard → Edge Functions → [name] → Code → Deploy

---

## Strategic Context — Baked In, Always Apply

**Last updated:** June 6, 2026

### The AI + SMB Landscape
- The largest market sector affected by AI will be SMBs — not through job loss but through growth
- Strategic AI application lets small businesses grow without the traditional cost/risk of hiring and outsourcing
- The gap isn't access to AI anymore — it's who actually uses it
- SaaS is under real long-term pressure from bespoke AI solutions, but Tandril's moat holds because:
  1. Sellers in Tandril's ICP cannot build bespoke anything — they want something that works Tuesday morning
  2. Bespoke solutions break when APIs change; Tandril handles maintenance
  3. Orion's contextual business intelligence (outcome data from real stores) is not replicable by a generic AI assistant

### Tandril's Moat
- Not just inventory sync — it's an AI that knows your store well enough to run your ads
- Orion's value compounds with tenure: the longer a seller stays, the more store history Orion has, the smarter its recommendations get
- That learning loop is defensible in a way a generic chatbot is not

### Orion's Long-Term Direction
Orion grows in three phases:
1. **Ops intelligence** (current) — surface problems, answer questions, execute commands
2. **Growth execution** (roadmap) — draft ad creative, launch campaigns, report back
3. **Compounding advisor** (vision) — learns what works for each specific store, applies it automatically

Investor framing: *"The same AI that prevents your stockouts will eventually launch the ad to clear them."*

### GEO / Content Strategy
- Frame Tandril content around the "who uses it wins" thesis
- Target: multi-platform sellers posting about pain (Reddit, Etsy forums, Shopify community)
- Zora Insights is the demand validation tool — use it to find real sellers with real problems
- Omama Hills (Sarah's own Shopify + Etsy stores) is both a customer and a live testbed

---

## Meta / Facebook Integration — What's Actually Built vs. Not (corrected Aug 11, 2026)

This section used to claim Meta/Facebook work hadn't started at all. That was wrong for the OAuth/catalog piece — only the ad-campaign-launch piece is actually not-yet-built. Split below; don't re-merge these into one "not built" claim again.

### Built and live — Meta OAuth connect + Instagram catalog sync
- `components/platforms/FacebookConnectButton.jsx` calls the `oauth-init` edge function with `platform: 'meta_ads'` — reachable from the Platforms page today via `components/platforms/PlatformCard.jsx` (renders `<FacebookConnectButton>` for `platform_type === 'meta_ads'`), not dead code.
- `supabase/functions/oauth-init/index.ts` builds a real `https://www.facebook.com/v19.0/dialog/oauth` URL using the `META_APP_ID` secret, with scopes including `ads_management`, `business_management`.
- `supabase/functions/oauth-callback/index.ts` (`exchangeMeta`) does a genuine token exchange against `https://graph.facebook.com/v19.0/oauth/access_token` using `META_APP_ID`/`META_APP_SECRET`, fetches `/me`, and upserts a real row into the `platforms` table.
- `meta_ads` is a live, active row in `platform_types` (`supabase/migrations/006_add_extended_platforms.sql`, `requires_oauth: true`).
- Instagram (`exchangeInstagram` in the same `oauth-callback/index.ts` file) shares this same Meta app and does real Graph API calls for **product catalog / inventory sync** (pages, IG business account, product catalogs) — this is a Shopify/WooCommerce-style catalog sync, separate from ads. Real `graph.facebook.com` calls for this also exist in `smart-api/index.ts` for Instagram product catalog price/inventory sync.
- **Unconfirmed:** whether `META_APP_ID`/`META_APP_SECRET` are actually set in Supabase secrets — verify before assuming a merchant can complete the OAuth handshake end-to-end.
- Not comparable to Shopify/WooCommerce/BigCommerce "full parity" — there's no product/inventory/price write-back through this connection, only catalog read/sync for Instagram. See Platform Integration Parity table above.

### Not built — ad campaign creation/launch (mock only, has a known bug)
**Why it's parked:** Agentic AI and mature image generation didn't exist when Tandril was started. Deliberately waited rather than building a half-baked version. The timing is now right.

**The vision:** Seller types "Orion, move this inventory." Orion picks underperforming SKUs, writes ad creative, assembles image, launches coordinated ads across Meta and TikTok, monitors ROAS, reports back in plain language.

- `pages/Ads.jsx` and its modals (`components/ads/CreateCampaignModal.jsx`, `components/ads/CreateAdModal.jsx`, `components/ads/CampaignCard.jsx`, `components/ads/GeneratedAdPreview.jsx`) run entirely on mock/local data via `lib/mockData.js`'s generic `MockEntity` class. No `ad_campaigns`/`ad_creatives`/`ad_templates` table exists in any Supabase migration.
- **Known bug, not fixed:** `CreateCampaignModal.jsx` and `CreateAdModal.jsx` expect props `isOpen`/`onSave`, but `pages/Ads.jsx` never passes `isOpen` and passes no `onSave` — using this UI today will likely throw (`onSave is not a function`) rather than do anything. Whoever picks this feature up next should fix this wiring, not assume the modals work because they exist.
- `smart-api/index.ts` has zero action handlers for ad campaigns (`draft_ad`, `launch_ad`, or any `meta_ads` campaign actions) — none of the Stage 2/3 backend work below exists yet.
- `supabase/migrations/003_add_platform_types.sql` has a commented-out `'facebook'` seed row that was never applied — an earlier abandoned attempt, superseded by the live `meta_ads` row in migration 006. Ignore it.

### What's Already Built (Stage 1 foundation, reusable for the ads feature)
- Orion surfaces slow movers, low stock, growth opportunities, risk alerts
- AI content generator writes product copy — ad copy is a small extension
- Product images already pulled from stores
- TikTok Shop already connected
- Meta OAuth connect + Instagram catalog sync (see above) — the app-level Meta auth plumbing already exists, ad-launch work can build on it rather than starting OAuth from scratch

### Stage 2 — Creative Generation (to build)
| What | Where | Effort |
|---|---|---|
| Ad copy generator (headline, body, CTA via Claude) | `supabase/functions/ad-copy-generator/index.ts` | S |
| Image generation (product photo + DALL-E/Stability AI) | `supabase/functions/ad-image-generator/index.ts` | M |
| Ad preview UI component | `components/ads/AdPreviewCard.jsx` | M |
| `ad_creatives` table + Supabase Storage bucket | SQL migration + dashboard | S |
| Fix `isOpen`/`onSave` prop mismatch in `CreateCampaignModal.jsx`/`CreateAdModal.jsx` (see above) | `pages/Ads.jsx` + those two modals | S |

### Stage 3 — Launch, Reporting, Learning (to build)
| What | Where | Effort |
|---|---|---|
| Meta Ads launch edge function | `supabase/functions/meta-ads-launch/index.ts` | L |
| TikTok Ads launch edge function | `supabase/functions/tiktok-ads-launch/index.ts` | L |
| TikTok Ads OAuth flow (Meta OAuth already exists — see above) | Extend `Platforms.jsx` + new auth edge function | M |
| Ad performance sync cron | `supabase/functions/sync-ad-performance/index.ts` | M |
| Campaigns UI page | `pages/Campaigns.jsx` | L |
| Orion action types: `draft_ad`, `launch_ad`, `get_ad_performance` | Extend `smart-api/index.ts` | M |
| Learning loop — performance back into Orion context | `orion_ad_learnings` table + system prompt injection | M |

**New secrets needed when building:** `META_ACCESS_TOKEN` (long-lived, ads-specific — `META_APP_ID`/`META_APP_SECRET` already exist for OAuth connect), `TIKTOK_ADS_APP_ID`, `TIKTOK_ADS_SECRET`, image generation API key

---

## Important Habits for Claude Code Sessions
- Always type at least a few words when attaching a file — blank attachment + no text breaks the API and loops every message after it in that session
- **Mandatory:** at the end of every session that changes code, Claude MUST update this CLAUDE.md itself with what changed — not wait to be asked, not defer it. This file is read at the start of every session and other people/sessions trust it as ground truth; if it goes stale, the next session inherits wrong assumptions and makes real mistakes (this happened with the Meta/Facebook section — see Key Fixes). Do this update before ending the session, every time, even for changes that feel minor.
- Credentials never go in this file — they live in Supabase secrets or .env
- This repo is PRIVATE — do not change visibility
