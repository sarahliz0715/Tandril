// Growth Opportunity Detector Edge Function
// AI identifies untapped growth opportunities in the store

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// --- Inlined from _shared/encryption.ts ---
const _ENC_ALGORITHM = 'AES-GCM';
const _ENC_IV_LENGTH = 12;
async function _getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) throw new Error('ENCRYPTION_SECRET environment variable not set');
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('tandril-encryption-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: _ENC_ALGORITHM, length: 256 }, false, ['encrypt', 'decrypt']
  );
}
async function decrypt(encrypted: string): Promise<string> {
  try {
    const key = await _getEncryptionKey();
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, _ENC_IV_LENGTH);
    const ciphertext = combined.slice(_ENC_IV_LENGTH);
    const decrypted = await crypto.subtle.decrypt({ name: _ENC_ALGORITHM, iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch { throw new Error('Failed to decrypt data'); }
}
function isEncrypted(value: string): boolean {
  try { return atob(value).length > _ENC_IV_LENGTH; } catch { return false; }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SHOPIFY_API_VERSION removed — now using GraphQL 2025-01

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`[Growth Opportunities] Analyzing for user ${user.id}`);

    // Get platforms
    const { data: platforms } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!platforms || platforms.length === 0) {
      throw new Error('No active platforms found');
    }

    // Decrypt access tokens for all platforms
    for (const platform of platforms) {
      if (platform.access_token && isEncrypted(platform.access_token)) {
        try {
          platform.access_token = await decrypt(platform.access_token);
        } catch (error) {
          console.error(`Failed to decrypt token for ${platform.shop_domain}`);
          throw new Error('Failed to decrypt platform credentials');
        }
      }
    }

    // Analyze store for growth opportunities
    const opportunities = await detectGrowthOpportunities(platforms[0]);

    // Save to database
    await supabaseClient.from('business_coaching').insert({
      user_id: user.id,
      coaching_type: 'growth_opportunity',
      content: { opportunities },
      metadata: {
        opportunities_count: opportunities.length,
        high_priority_count: opportunities.filter((o) => o.priority === 'high').length,
      },
    });

    console.log(`[Growth Opportunities] Found ${opportunities.length} opportunities`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          opportunities,
          summary: {
            total: opportunities.length,
            high_priority: opportunities.filter((o) => o.priority === 'high').length,
            estimated_revenue_potential: opportunities.reduce(
              (sum, o) => sum + (o.estimated_revenue || 0),
              0
            ),
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Growth Opportunities] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function detectGrowthOpportunities(platform: any): Promise<any[]> {
  try {
    // Fetch store data via GraphQL
    const productsData = await shopifyGraphQL(platform.shop_domain, platform.access_token, `
      query {
        products(first: 250) {
          edges {
            node {
              id title handle status vendor productType tags
              bodyHtml
              images(first: 1) { edges { node { url } } }
              variants(first: 100) {
                edges {
                  node {
                    id price sku inventoryQuantity
                  }
                }
              }
            }
          }
        }
      }
    `);
    const products = productsData.products.edges.map((e: any) => ({
      ...e.node,
      id: fromShopifyGid(e.node.id),
      product_type: e.node.productType,
      body_html: e.node.bodyHtml,
      images: e.node.images.edges.map((i: any) => ({ src: i.node.url })),
      variants: e.node.variants.edges.map((v: any) => ({
        ...v.node,
        id: fromShopifyGid(v.node.id),
        inventory_quantity: v.node.inventoryQuantity,
      }))
    }));

    const ordersData = await shopifyGraphQL(platform.shop_domain, platform.access_token, `
      query {
        orders(first: 250, query: "status:any") {
          edges {
            node {
              id name createdAt
              totalPriceSet { shopMoney { amount currencyCode } }
              lineItems(first: 50) {
                edges {
                  node {
                    title quantity
                    originalTotalSet { shopMoney { amount } }
                    product { id }
                    variant { id price }
                  }
                }
              }
            }
          }
        }
      }
    `);
    const orders = ordersData.orders.edges.map((e: any) => ({
      ...e.node,
      id: fromShopifyGid(e.node.id),
      created_at: e.node.createdAt,
      total_price: e.node.totalPriceSet?.shopMoney?.amount,
      line_items: e.node.lineItems.edges.map((li: any) => ({
        ...li.node,
        product_id: li.node.product ? fromShopifyGid(li.node.product.id) : null,
        variant_id: li.node.variant ? fromShopifyGid(li.node.variant.id) : null,
        price: li.node.variant?.price,
      }))
    }));

    // Analyze with AI
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicApiKey) {
      return detectBasicOpportunities(products, orders);
    }

    return await detectOpportunitiesWithAI(products, orders, platform.shop_name, anthropicApiKey);
  } catch (error) {
    console.error('[Growth Opportunities] Detection error:', error);
    return [];
  }
}

async function detectOpportunitiesWithAI(
  products: any[],
  orders: any[],
  shopName: string,
  apiKey: string
): Promise<any[]> {
  // Calculate product performance
  const productPerformance = products.map((product) => {
    const sales = orders.filter((o) =>
      o.line_items?.some((item: any) => item.product_id === product.id)
    ).length;

    const revenue = orders.reduce((sum, o) => {
      const items = o.line_items?.filter((item: any) => item.product_id === product.id) || [];
      return sum + items.reduce((itemSum: number, item: any) => itemSum + parseFloat(item.price || '0') * item.quantity, 0);
    }, 0);

    return {
      id: product.id,
      title: product.title,
      sales_count: sales,
      revenue,
      has_images: (product.images?.length || 0) > 0,
      has_description: (product.body_html?.length || 0) > 50,
      variant_count: product.variants?.length || 0,
      inventory: product.variants?.[0]?.inventory_quantity || 0,
    };
  });

  const systemPrompt = `You are an expert e-commerce growth strategist analyzing a Shopify store to find untapped revenue opportunities.

Analyze the product performance data and identify specific, actionable growth opportunities.

Focus on:
1. **Underperforming Products**: Products with potential but low sales
2. **Missing Optimizations**: Products without good images/descriptions
3. **Inventory Issues**: Popular items that are low/out of stock
4. **Pricing Opportunities**: Products priced too low given demand
5. **Cross-sell Potential**: Products that could be bundled
6. **Seasonal Timing**: Products that should be promoted now

Store: ${shopName}
Total Products: ${products.length}
Total Orders (recent): ${orders.length}

Product Performance:
${JSON.stringify(productPerformance.slice(0, 50), null, 2)}

Respond in JSON format:
{
  "opportunities": [
    {
      "type": "underperforming_product" | "missing_optimization" | "inventory_risk" | "pricing" | "cross_sell" | "seasonal",
      "priority": "high" | "medium" | "low",
      "title": "Brief title",
      "description": "Detailed explanation with specific products/numbers",
      "action": "Specific action to take",
      "estimated_revenue": number (monthly revenue potential in dollars),
      "effort_required": "low" | "medium" | "high",
      "products_affected": [product IDs]
    }
  ]
}

Prioritize opportunities by:
- High revenue potential with low effort = HIGH priority
- Medium revenue with medium effort = MEDIUM priority
- Low revenue or high effort = LOW priority`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Analyze this store and find growth opportunities.',
        },
      ],
    }),
  });

  if (!response.ok) {
    return detectBasicOpportunities(products, orders);
  }

  const result = await response.json();
  const contentText = result.content[0].text;

  const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/) || contentText.match(/({[\s\S]*})/);
  const jsonText = jsonMatch ? jsonMatch[1] : contentText;

  const parsed = JSON.parse(jsonText);
  return parsed.opportunities || [];
}

function detectBasicOpportunities(products: any[], orders: any[]): any[] {
  const opportunities = [];

  // Find products without images
  const noImageProducts = products.filter((p) => !p.images || p.images.length === 0);
  if (noImageProducts.length > 0) {
    opportunities.push({
      type: 'missing_optimization',
      priority: 'high',
      title: 'Products Missing Images',
      description: `${noImageProducts.length} products don't have images. Products with images sell 2-3x better.`,
      action: 'Add professional product photos',
      estimated_revenue: noImageProducts.length * 50,
      effort_required: 'medium',
      products_affected: noImageProducts.map((p) => p.id),
    });
  }

  // Find products with short descriptions
  const poorDescriptions = products.filter(
    (p) => !p.body_html || p.body_html.length < 100
  );
  if (poorDescriptions.length > 3) {
    opportunities.push({
      type: 'missing_optimization',
      priority: 'medium',
      title: 'Improve Product Descriptions',
      description: `${poorDescriptions.length} products have minimal descriptions. Better descriptions increase conversions by 20-30%.`,
      action: 'Write detailed, benefit-focused product descriptions',
      estimated_revenue: poorDescriptions.length * 30,
      effort_required: 'low',
      products_affected: poorDescriptions.slice(0, 10).map((p) => p.id),
    });
  }

  // Find out of stock products
  const outOfStock = products.filter((p) =>
    p.variants?.every((v: any) => v.inventory_quantity === 0)
  );
  if (outOfStock.length > 0) {
    opportunities.push({
      type: 'inventory_risk',
      priority: 'high',
      title: 'Restock Out-of-Stock Items',
      description: `${outOfStock.length} products are completely out of stock. You're losing sales every day.`,
      action: 'Order inventory for these products immediately',
      estimated_revenue: outOfStock.length * 100,
      effort_required: 'medium',
      products_affected: outOfStock.map((p) => p.id),
    });
  }

  return opportunities;
}

async function shopifyGraphQL(domain: string, token: string, query: string, variables: Record<string, any> = {}) {
  const response = await fetch(`https://${domain}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Shopify GraphQL request failed: ${response.status}`);
  const result = await response.json();
  if (result.errors?.length) throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  return result.data;
}

function toShopifyGid(type: string, id: string | number): string {
  return `gid://shopify/${type}/${id}`;
}

function fromShopifyGid(gid: string): string {
  return String(gid).split('/').pop() || String(gid);
}
