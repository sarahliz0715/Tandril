# Etsy API Compliance Change Log

This document tracks all changes made to Tandril in response to Etsy API review feedback.
Maintained for reference during future Etsy developer portal submissions.

---

## Application History

| Submission | Outcome | Reason Given | Etsy Ticket |
|---|---|---|---|
| Original | Denied | AI involvement | — |
| April 2026 (after correspondence) | Eva approved — directed to resubmit | — | #24354334 |
| May 7, 2026 | Denied (Banned) | "Security-related / Other" — Competition Analysis flagged | #24716820 |
| May 2026 (submitted as "Orion - Multishop AI Assistant") | Did not reach Etsy — not found in portal | Resubmission required per Shivangi | — |
| May 15, 2026 (submitted as "Orion - Multishop AI Assistant") | Banned | Security-related reason not disclosed | — |
| May 16, 2026 (submitted as "Seller Shop Management Tools") | Banned | "Other" — no specific reason given. Support agent: Adiba. | Key string: r9hfhgc98o4u2ulqijp62nfx |

---

## Changes Made — May 9, 2026

**Trigger:** Dibyanshu (Etsy support, ticket #24716820) explicitly called out "Competition Analysis" as a feature that could be interpreted as non-compliant with Etsy's API Terms of Use.

**Root cause:** Tandril's Intelligence page had a tab and button labeled "Competitors" and "Create Competitor Intelligence." Etsy reviewers interpreted this as using the Etsy API to scrape or analyze competitor seller accounts — which is prohibited. In reality, this feature uses only the connected seller's own data and general AI knowledge; it never accesses other sellers' Etsy data via the API.

### UI / Copy Changes

| File | Before | After |
|---|---|---|
| `pages/Intelligence.jsx` | Tab: "Competitors" | Tab: "Market Landscape" |
| `pages/Intelligence.jsx` | Empty state: "Competitor Intelligence" | Empty state: "Market Landscape" |
| `pages/Intelligence.jsx` | Dialog title: "Generate Market Intelligence?" | Dialog title: "Generate Market Insights?" |
| `pages/Intelligence.jsx` | Dialog body: "analyze current market trends, competitors, and opportunities" | Dialog body: "analyze market trends and opportunities" |
| `pages/Intelligence.jsx` | Button: "Generate Intelligence" | Button: "Generate Market Insights" |
| `pages/PrintableComparison.jsx` | "competitor data, and profit goals" | "market trends, and profit goals" |
| `pages/SellbriteComparison.jsx` | "competitor data, and profit goals" | "market trends, and profit goals" |

### Feature / Backend Changes

| File | Change |
|---|---|
| `supabase/functions/ai-insights/index.ts` | Added niche market intelligence path: when called with a `niche` parameter, generates AI analysis using Claude Haiku (not Etsy API data) and saves to `market_intelligence` table. The `competitor_analysis` data type was renamed to `market_landscape` in prompts and titles. |
| `supabase/migrations/20260509000003_market_intelligence.sql` | New table: `market_intelligence` — stores AI-generated niche insights per user, with RLS. |
| `lib/supabaseEntities.js` | `MarketIntelligence` entity now points to real `market_intelligence` Supabase table instead of mock data. |

### What was NOT changed (and why)

- **Internal `competitor_analysis` data_type string** — kept for backward compatibility in grouping logic. Not visible to Etsy reviewers.
- **`CompetitorInsightsCard` component name** — internal code only, not user-visible.
- **`CustomAlerts` competitor_price_drop alert type** — this alert type monitors the seller's own price history, not competitor prices via Etsy API. No change needed.
- **Core AI behavior** — Orion/AI assistant does not use the Etsy API to access any seller's data other than the authenticated connected seller. No change was needed here; the issue was purely labeling.

---

## Changes Made — May 15, 2026

**Trigger:** Etsy API Terms of Use review during resubmission preparation.

### UI / Copy Changes

| File | Change |
|---|---|
| `components/platforms/PlatformCard.jsx` | Added required Etsy trademark notice to the Etsy platform card: "The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc." |
| `components/alerts/CreateCustomAlertModal.jsx` | Alert type `competitor_price_drop` renamed to `price_benchmark`; label changed from "Competitor Price Drop" to "Price Benchmark Alert" |
| `components/onboarding/BetaOnboardingFlow.jsx` | "Competitor Price Monitor" → "Price Benchmark Monitor"; copy updated to remove "tracking competitors" language |
| `pages/BetaCapabilities.jsx` | "Get competitive insights" → "Get market pricing insights" |
| `pages/CustomAlerts.jsx` | Icon map key updated: `competitor_price_drop` → `price_benchmark` |

### New Features

| File | Change |
|---|---|
| `supabase/functions/price-benchmark/index.ts` | New edge function: Price Benchmark tool. Uses eBay Finding API (public market data, not Etsy API) and Claude AI to compare a seller's price against similar products across the broader market. No Etsy API data used. |
| `components/intelligence/PriceBenchmarkCard.jsx` | New UI component for the Price Benchmark feature on the Intelligence page. |

---

## Clarifications to Include in Next Etsy Submission

When submitting the next application, explicitly state:

1. **Market Landscape / "competitor analysis" feature** uses Claude AI with general market knowledge only — it does not call any Etsy API endpoints to access other sellers' data, listings, prices, or any marketplace-wide data. Etsy API is used exclusively to read/write the connected seller's own shop data.

2. **No cross-seller data access exists** in Tandril's architecture. All database queries enforce `user_id = auth.uid()` via Row Level Security. There is no code path that reads another seller's Etsy data.

3. Reference prior correspondence ticket **#24354334** where Eva confirmed Tandril's architecture meets Etsy's requirements.

---

## Changes Made — May 21, 2026

**Trigger:** Lakshmi (Etsy support) again referenced "Competition Analysis" in denial email for "Seller Shop Management Tools" submission. Full codebase grep revealed remaining user-visible instances not caught in previous passes.

### Step 1 — UI / Copy Changes (user-visible competitor language removed)

| File | Before | After |
|---|---|---|
| `components/commands/CommandInterface.jsx` | Suggested command: "Check if my prices are competitive" | "Review my pricing against market averages" |
| `components/commands/CommandInterface.jsx` | Suggested command: "Update prices based on the attached competitor data" | "Update prices based on the attached market data" |
| `components/commands/CommandInterface.jsx` | Description: "Competitive pricing" | "Market-based pricing" |
| `components/commands/EnhancedCommandInterface.jsx` | Suggested command: "Analyze competitor pricing for my electronics category..." | "Analyze market pricing for my electronics category..." |
| `components/commands/PricingActionModal.jsx` | UI label: "Competitor Avg." | "Market Avg." |
| `components/bulk/BulkUploadInterface.jsx` | Checkbox label: "Auto-optimize pricing (competitive analysis)" | "Auto-optimize pricing (market analysis)" |
| `components/bulk/BulkUploadInterface.jsx` | AI recommendation text: "Price ranges appear competitive" | "Price ranges look good" |

### Step 2 — Privacy Policy & Brand References

| File | Change |
|---|---|
| `pages/PrivacyPolicy.jsx` — Section 1.3 | Rewrote to explicitly state we access only the connected seller's own data. Added highlighted note explaining Market Insights uses AI general knowledge — not API calls to other sellers' data. |
| `pages/PrivacyPolicy.jsx` — Section 9 | Added Etsy with required trademark notice: "The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc." |
| `pages/PrivacyPolicy.jsx` — Section 9 | Added eBay with note that pricing data comes from eBay's public Finding API only. |
| `pages/PrivacyPolicy.jsx` — Contact | Fixed website URL from `tandril-mvp.vercel.app` to `tandril.org`. |

### Step 3 — Feature Modifications

No modifications made. The Market Landscape / Seller Positioning feature is architecturally compliant — it uses Claude AI general knowledge and never calls any Etsy API endpoint to access other sellers' data. The issue in all prior denials was labeling only. Labeling is now corrected.

### What was verified as OK (not changed)

| File | Reason |
|---|---|
| `pages/Intelligence.jsx` tab value="competitors" | Internal JS identifier only — not visible to users or reviewers. Label is "Seller Positioning". |
| `components/intelligence/KeywordOpportunitiesCard.jsx` | "competition" refers to keyword search competition level (low/medium/high) — standard SEO terminology, not competitor analysis |
| `components/intelligence/PriceBenchmarkCard.jsx` | "Competitively Priced" describes the seller's own pricing position, not competitor data |
| `supabase/functions/ai-insights/index.ts` | `competitor_analysis` string kept for backward compatibility per prior decision |
| `supabase/functions/risk-alert-analyzer/index.ts` | Internal backend only, not user-visible |
| `WOOCOMMERCE_BULK_OPTIMIZATION_GUIDE.md`, `TECH_STACK.md` | Internal documentation, not served on tandril.org |

---

## Next Steps

- [ ] Submit new application with updated app name (avoid reusing "Tandril" if flagged)
- [ ] Run migration `20260509000003_market_intelligence.sql` in Supabase
- [ ] Deploy updated `ai-insights` edge function
- [x] Check tandril.org marketing copy for any remaining "competitor analysis" or "competition" language — completed May 21, 2026
- [ ] Email developer@etsy.com referencing ticket #24354334
- [ ] Reply to Lakshmi (ticket #24716820) noting changes made
- [ ] Continue working through Lakshmi's remaining steps before resubmitting
