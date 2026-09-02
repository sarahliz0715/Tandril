# Universal Undo — Implementation Spec

**Status:** Phase 1 (Shopify core + generic dispatcher) built in code, **not yet deployed**. This is a
spec to hand to a Claude Code session (this repo's `CLAUDE.md` conventions apply — edge functions
must be manually pasted into the Supabase dashboard to deploy, nothing here auto-deploys).

### Phase 1 — done in code, pending manual deploy
- `smart-api/index.ts`: `update_title`, `update_description`, `update_tags`/`add_tags`,
  `update_inventory`, `update_status`, `update_seo_listing`, `update_metafield`,
  `update_image_alt_text`/`update_image_alt`, `update_url_handle` now all capture `previous_state` +
  `target` on their return value. Added the generic `case 'undo_action'` dispatcher (replays the
  original handler with the old value) and a `summarizeOrionAction` label for it.
- `execute-command/index.ts`: `updateProducts` now captures exact `previous_prices` per variant
  (works for `price_adjustment` AND absolute `new_price`/`updates.price` — the old invert-based undo
  only handled `price_adjustment`).
- `pages/History.jsx`: `handleUndo` generalized — Orion rows use the new `previous_state` path when
  present, fall back to the old `previous_prices` path for older rows; Commands-page rows now prefer
  the exact captured prices over recomputing an inverse, with the old invert logic kept as a last
  resort for rows from before this change. Button visibility now goes through a single `canUndo()`
  check instead of a hardcoded price-only condition.
- **Before this is live:** manually paste the updated `smart-api` and `execute-command` into the
  Supabase dashboard (Edge Functions → deploy), then test each of the 9 Shopify actions above against
  a real connected store — undo, and confirm the value actually goes back to the real original, not
  just that the call succeeds.
- **Not done yet:** eBay/Etsy/TikTok/Amazon/WooCommerce/etc. (cross-platform actions), create/end/renew
  listing pairs, `execute-command`'s `apply_discount`/`update_inventory`/`update_seo` (still undo-less),
  and the excluded categories below (by design).

**Goal:** Every action that changes something in a connected store gets an undo option in History —
not just price changes. This is a trust/security requirement (per Sarah), not just a demo need.

## Why this isn't 150 separate features

`supabase/functions/smart-api/index.ts` has **150+ distinct write action types** across 15 platforms
(Shopify, eBay, Etsy, TikTok, Amazon, WooCommerce, Instagram, BigCommerce, Faire, Ecwid, Magento,
PrestaShop, Wish, Walmart, Square, Wix, Squarespace). `supabase/functions/execute-command/index.ts`
(the plain Commands page, no Orion) has a smaller set: `update_products`, `apply_discount`,
`update_inventory`, `update_seo`.

Writing a bespoke "undo" implementation per action type is not realistic. But almost every action
follows the same shape:

> "Set field `X` on product/listing `Y` to value `V`."

That means undo doesn't need new reverse logic — it needs the **old value** captured before the
write happens, and then **the exact same action handler**, called again with the old value in place
of the new one. The forward action *is* the undo action, just replayed with `V_old` instead of `V_new`.

This is already proven out for prices: `update_price` in `smart-api/index.ts` (~line 2112) captures
`previous_prices` before writing, and `restore_variant_prices` (~line 2194) replays it. The work here
is generalizing that one-off pattern to every action instead of writing more one-offs.

## The general pattern

For any action handler that currently does:

```
1. fetch the product/listing
2. write new value
3. return { message }
```

Change it to:

```
1. fetch the product/listing
2. capture old value of whatever field(s) are about to change
3. write new value
4. return { message, previous_state: { <field>: <old value>, ... }, target: { sku, product_name, ... } }
```

Then add ONE generic handler — `case 'undo_action'` — that:

```
1. Reads { original_type, target, previous_state } from the request
2. Builds a synthetic action = { type: original_type, ...target, ...previous_state }
   (i.e. the original action shape, but with old values substituted for new ones)
3. Calls the SAME executeAction(...) dispatcher recursively with that synthetic action
4. Returns its result
```

No new per-platform logic. It reuses every existing handler as its own inverse.

### Field-mapping cheat sheet (new-value param → old-value param, same handler)

| Action shape | New-value field | Old-value field to capture before write |
|---|---|---|
| `*_update_price` | `price` | current variant/listing price |
| `*_update_inventory` | `quantity` | current inventory quantity |
| `*_update_title` | `new_title` | current title |
| `*_update_description` | `body_html` / `description` | current description |
| `*_update_tags` / `add_tags` | `tags` | current tags array |
| `update_status` | `status` | current status |
| `update_metafield` | `metafield_value` | current metafield value (or `null` if it didn't exist — undo should delete it, not set it to `null`) |
| `update_seo_listing` | `seo_title`, `seo_description` | current `title_tag` / `description_tag` metafields |
| `update_url_handle` | `handle` | current handle |
| `update_image_alt_text` | `alt_text` | current alt text |

`*_end_listing` / `*_renew_listing` pairs are already each other's undo — undo of `ebay_end_listing`
is just calling `ebay_relist` (or the platform's renew action), no snapshot needed.

## Actions to explicitly EXCLUDE from auto-undo

Some actions have real-world effects that can't be silently reversed, and pretending otherwise would
be a worse trust problem than not offering undo at all. For these, the undo button should not appear
at all, and (if useful) the row can say why:

- **Order actions**: `fulfill_order`, `cancel_order`, `refund_order` — can't "unship" a package or
  claw back a refund without genuinely re-charging a customer. Direct them to the platform's own
  order tools.
- **Messages**: `send_message` — can't unsend a message already delivered to a customer.
- **Ad spend**: `launch_ad` — `pause_ad` already exists as the real control (stops further spend);
  money already spent can't be undone. Undo of `draft_ad` (nothing spent yet) is fine — just delete
  the draft row.
- **create_purchase_order`** with a `sent` status once actually sent to a supplier (draft POs are
  fine to undo/delete before that point).

Everything else — including all the `create_*` / listing-creation actions — CAN be undone, just with
a different undo shape (delete/deactivate the created entity instead of restoring a field). Capture
the created ID in the result and use the platform's existing delete/end-listing action as the undo.

## Files to change

1. **`supabase/functions/smart-api/index.ts`**
   - Add `previous_state` capture + `target` to every mutating action's return value, per the cheat
     sheet above. Do this platform-by-platform (see rollout order below), not all at once — it's a
     ~5,000-line file and large diffs here are hard to review/deploy safely.
   - Add `case 'undo_action'` (generic dispatcher described above).
   - Add `undo_action` to the non-Shopify-required action list and to `summarizeOrionAction()`.
   - Update the `ai_commands` insert (where `execution_results: { orion: true, action_type, result }`
     is written) — no schema change needed, `previous_state`/`target` just ride inside `result` the
     same way `previous_prices` already does.

2. **`supabase/functions/execute-command/index.ts`**
   - Same pattern for its 4 action types (`update_products`, `apply_discount`, `update_inventory`,
     `update_seo`) so Commands-page actions get the same undo, not just Orion ones.

3. **`pages/History.jsx`**
   - Replace the two hardcoded branches in `handleUndo` (Orion-price-only, Command-price-only) with
     one generic path: if `command.execution_results?.result?.previous_state` exists, undo = call
     `smart-api` with `execute_action: { type: 'undo_action', original_type: command.execution_results.action_type, target, previous_state }`.
   - Keep the existing price-specific branches as a fallback for old rows created before this change
     (so already-existing history doesn't lose its undo button) — same as how `previous_prices` is
     already handled as a special case today.
   - The button-visibility check (line ~657) should key off "has a snapshot to restore," not off
     source/type, so it works uniformly across Orion and Commands-page rows.
   - For excluded action types (orders, messages, ad spend), don't show the icon at all.

## Rollout order (build in this order, deploy+verify after each)

1. **Shopify core** (already has `update_price` done): `update_title`, `update_description`,
   `update_tags`/`add_tags`, `update_inventory`, `update_status`, `update_seo_listing`,
   `update_metafield`, `update_url_handle`, `update_image_alt_text`. Plus the Commands-page
   equivalents in `execute-command`. This covers what's actually used in the demo and in the
   Shopify reviewer test script (`docs/shopify-reviewer-testing-guide.md`).
2. **The generic `undo_action` dispatcher itself** — build once Shopify's snapshots exist to test
   against, since it's the same code for every platform after that.
3. **Cross-platform update actions** — eBay, Etsy, TikTok, Instagram, WooCommerce, Amazon, and the
   rest, in the same field-mapping pattern. Mechanical repetition of step 1's pattern per platform.
4. **Listing create/end/renew pairs** across all platforms — undo via delete/deactivate.
5. **Excluded categories** — no undo logic; instead confirm `History.jsx` correctly hides the icon
   and (optionally) surface a short explanation in the details modal for why.

## Before deploying to production

- `smart-api` and `execute-command` are edge functions — changes only take effect after manually
  pasting the updated file into Supabase dashboard → Edge Functions → deploy (per this repo's
  deployment model, see `CLAUDE.md`).
- Test each new undo against a real connected test store before considering a platform "done" —
  this repo has a pattern of undo/live-fetch bugs that only surfaced under real testing (see
  `CLAUDE.md`'s WooCommerce/BigCommerce/Instagram entries).
- Because `undo_action` replays through the same dispatcher, a bug in a forward handler's snapshot
  capture will silently produce a bad undo (e.g. restoring to the wrong value) rather than an error —
  worth an explicit "does the price/title/etc. actually go back to the real original" check per
  action type, not just "did the undo call succeed."
