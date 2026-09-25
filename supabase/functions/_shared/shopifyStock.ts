// Print-on-demand and fulfillment apps (Printful, Printify, ...) keep their own
// stock at their own Shopify location (Printful sets 9999 = "made to order").
// Tandril can read that stock but can't change it: Shopify answers "The
// specified location could not be found." So for those items Tandril must not
// try to set Shopify stock, and must never copy that 9999 to other stores.

const cache = new Map<string, boolean>();

async function gql(domain: string, token: string, query: string, variables: Record<string, any>) {
  const res = await fetch(`https://${domain}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) return null;
  return await res.json();
}

// True when Tandril can't manage stock for this item at this Shopify location
// (it belongs to a fulfillment app). Location reads don't reveal this, so it
// probes with a compare-and-set that "changes" the quantity to what it already
// is: a no-op at a normal location (and it can't overwrite a concurrent change,
// since Shopify only applies it if the stock still equals `currentQty`), and
// "location could not be found" at a fulfillment app's location.
export async function isExternallyManagedLocation(
  domain: string, token: string, locationGid: string, inventoryItemGid: string, currentQty: number,
): Promise<boolean> {
  const key = `${domain}|${locationGid}`;
  if (cache.has(key)) return cache.get(key)!;
  try {
    const json = await gql(domain, token, `
      mutation($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) { userErrors { field message } }
      }
    `, {
      input: {
        reason: 'correction',
        name: 'available',
        quantities: [{ inventoryItemId: inventoryItemGid, locationId: locationGid, quantity: currentQty, compareQuantity: currentQty }],
      },
    });
    if (!json || json.errors?.length) return false; // unknown — don't guess
    const errs = json.data?.inventorySetQuantities?.userErrors || [];
    const external = errs.some((e: any) => isLocationNotFoundError(e.message));
    console.log(`[shopifyStock] location ${locationGid} on ${domain}: ${external ? 'managed by a fulfillment app' : 'managed by the store'}`);
    // Only cache a definite answer; a stale compareQuantity just means "try again later".
    if (external || errs.length === 0) cache.set(key, external);
    return external;
  } catch {
    return false;
  }
}

export const EXTERNAL_STOCK_REASON =
  'Shopify stock for this product is managed by a print-on-demand or fulfillment app (like Printful), so Tandril leaves it alone.';

export const isLocationNotFoundError = (msg: string) => /location could not be found/i.test(msg || '');
