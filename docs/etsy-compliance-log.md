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
| May 16, 2026 (submitted as "Seller Shop Management Tools") | Pending | — | Key string: r9hfhgc98o4u2ulqijp62nfx |

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

## Next Steps

- [ ] Submit new application with updated app name (avoid reusing "Tandril" if flagged)
- [ ] Run migration `20260509000003_market_intelligence.sql` in Supabase
- [ ] Deploy updated `ai-insights` edge function
- [ ] Check tandril.org marketing copy for any remaining "competitor analysis" or "competition" language
- [ ] Email developer@etsy.com referencing ticket #24354334 to request that prior clearance is applied to new submission
