-- Print-on-demand (e.g. Printful) products: Shopify stock is held by the
-- fulfillment app (9999 = made to order) and can't be changed by Tandril.
-- For those SKUs Tandril keeps the other stores (eBay, ...) topped up to a
-- fixed number instead of syncing Shopify's count.
--   made_to_order   checked once per Shopify link (null = not checked yet)
--   keep_stocked_at the number to keep other stores at (null = default 5);
--                   stored on the Shopify link of the SKU
alter table public.platform_product_links
  add column if not exists made_to_order boolean,
  add column if not exists keep_stocked_at integer check (keep_stocked_at is null or keep_stocked_at between 1 and 999);
