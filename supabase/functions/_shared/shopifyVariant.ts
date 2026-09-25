// Works out which Shopify product variant a cross-platform link points at.
//
// Shopify can only read or change stock for a specific variant, but a seller
// linking a product by hand often only knows the product number, or just the
// SKU (Quick Link used to accept either and save no variant, which made every
// sync to Shopify fail). Given whatever we have, this finds the variant:
//   1. variantId given            → use it
//   2. productId given            → its only variant, or the one whose SKU matches
//   3. only a SKU                 → search the store's variants by SKU
// Throws a plain-English error when it can't decide (e.g. several variants and
// no SKU to tell them apart), so the caller can pass it straight to the seller.

async function gql(domain: string, token: string, query: string, variables: Record<string, any> = {}) {
  const res = await fetch(`https://${domain}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify request failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`Shopify error: ${JSON.stringify(json.errors)}`);
  return json.data;
}

const lastPart = (gid: string) => String(gid).split('/').pop() || String(gid);
const isNumericId = (v: unknown) => /^\d+$/.test(String(v ?? '').trim());
const sameSku = (a: unknown, b: unknown) =>
  String(a ?? '').trim().toLowerCase() !== '' && String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

export interface ResolvedShopifyVariant {
  productId: string;
  variantId: string;
  sku: string;
  title: string;
  quantity: number | null;
}

export async function resolveShopifyVariant(
  shopDomain: string,
  token: string,
  opts: { productId?: string | null; variantId?: string | null; sku?: string | null },
): Promise<ResolvedShopifyVariant> {
  const sku = (opts.sku || '').trim();

  if (opts.variantId && isNumericId(opts.variantId)) {
    const d = await gql(shopDomain, token, `query($id: ID!) { productVariant(id: $id) { id sku inventoryQuantity product { id title } } }`,
      { id: `gid://shopify/ProductVariant/${opts.variantId}` });
    const v = d.productVariant;
    if (!v) throw new Error(`Shopify has no variant ${opts.variantId}.`);
    return { productId: lastPart(v.product.id), variantId: lastPart(v.id), sku: v.sku || '', title: v.product.title, quantity: v.inventoryQuantity ?? null };
  }

  if (opts.productId && isNumericId(opts.productId)) {
    const d = await gql(shopDomain, token, `query($id: ID!) { product(id: $id) { id title variants(first: 100) { edges { node { id sku title inventoryQuantity } } } } }`,
      { id: `gid://shopify/Product/${opts.productId}` });
    const p = d.product;
    if (!p) throw new Error(`Shopify has no product ${opts.productId}. Check the number at the end of the product's address in Shopify admin.`);
    const variants = (p.variants?.edges || []).map((e: any) => e.node);
    const pick = variants.length === 1 ? variants[0] : variants.find((v: any) => sameSku(v.sku, sku));
    if (!pick) {
      const options = variants.map((v: any) => `${v.title}${v.sku ? ` (SKU ${v.sku})` : ''}`).join(', ');
      throw new Error(`"${p.title}" has ${variants.length} variants and none has SKU "${sku}". Pick one: ${options}.`);
    }
    return { productId: lastPart(p.id), variantId: lastPart(pick.id), sku: pick.sku || '', title: p.title, quantity: pick.inventoryQuantity ?? null };
  }

  if (!sku) throw new Error('Need a Shopify product number, variant number, or SKU to find the product.');
  const d = await gql(shopDomain, token, `query($q: String!) { productVariants(first: 10, query: $q) { edges { node { id sku inventoryQuantity product { id title } } } } }`,
    { q: `sku:${JSON.stringify(sku)}` });
  const matches = (d.productVariants?.edges || []).map((e: any) => e.node).filter((v: any) => sameSku(v.sku, sku));
  if (matches.length === 0) throw new Error(`No Shopify product has SKU "${sku}".`);
  if (matches.length > 1) {
    throw new Error(`${matches.length} Shopify variants share SKU "${sku}" (${matches.map((v: any) => v.product.title).join(', ')}). Give the product number to pick one.`);
  }
  const v = matches[0];
  return { productId: lastPart(v.product.id), variantId: lastPart(v.id), sku: v.sku || '', title: v.product.title, quantity: v.inventoryQuantity ?? null };
}
