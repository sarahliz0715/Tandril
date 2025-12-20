// Sync Shopify Orders Edge Function
// Fetches orders from connected Shopify stores

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_API_VERSION = '2024-01';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`[Sync Orders] Syncing orders for user ${user.id}`);

    // Get request params for filtering
    const { limit = 250, status = 'any' } = await req.json().catch(() => ({}));

    // Get all active Shopify platforms for this user
    const { data: platforms, error: platformsError } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform_type', 'shopify')
      .eq('is_active', true);

    if (platformsError) {
      throw new Error(`Failed to fetch platforms: ${platformsError.message}`);
    }

    if (!platforms || platforms.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { orders: [], message: 'No Shopify stores connected' },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Fetch orders from all connected stores
    const allOrders = [];

    for (const platform of platforms) {
      console.log(`[Sync Orders] Fetching from ${platform.shop_domain}`);

      try {
        // Build query params
        const queryParams = new URLSearchParams({
          limit: limit.toString(),
          status: status,
        });

        // Fetch orders
        const ordersData = await shopifyRequest(
          platform,
          `orders.json?${queryParams}`
        );
        const orders = ordersData.orders || [];

        console.log(`[Sync Orders] Found ${orders.length} orders`);

        // Process each order
        for (const order of orders) {
          const orderItem = {
            id: `${platform.id}-${order.id}`,
            platform_id: platform.id,
            platform_name: platform.shop_name || platform.shop_domain,
            order_id: order.id.toString(),
            order_number: order.order_number || order.name,
            order_date: order.created_at,
            customer_name: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'Guest',
            customer_email: order.customer?.email || order.email || '',
            customer_phone: order.customer?.phone || order.phone || '',
            status: mapShopifyStatus(order.financial_status, order.fulfillment_status),
            financial_status: order.financial_status,
            fulfillment_status: order.fulfillment_status || 'unfulfilled',
            subtotal_price: parseFloat(order.subtotal_price) || 0,
            total_tax: parseFloat(order.total_tax) || 0,
            total_price: parseFloat(order.total_price) || 0,
            currency: order.currency || 'USD',
            line_items_count: order.line_items?.length || 0,
            line_items: order.line_items?.map((item: any) => ({
              id: item.id.toString(),
              product_id: item.product_id?.toString(),
              variant_id: item.variant_id?.toString(),
              title: item.title,
              variant_title: item.variant_title,
              quantity: item.quantity,
              price: parseFloat(item.price) || 0,
              sku: item.sku || '',
              image_url: item.image?.src || null,
            })) || [],
            shipping_address: order.shipping_address ? {
              address1: order.shipping_address.address1,
              address2: order.shipping_address.address2,
              city: order.shipping_address.city,
              province: order.shipping_address.province,
              country: order.shipping_address.country,
              zip: order.shipping_address.zip,
            } : null,
            billing_address: order.billing_address ? {
              address1: order.billing_address.address1,
              address2: order.billing_address.address2,
              city: order.billing_address.city,
              province: order.billing_address.province,
              country: order.billing_address.country,
              zip: order.billing_address.zip,
            } : null,
            tracking_number: order.fulfillments?.[0]?.tracking_number || null,
            tracking_url: order.fulfillments?.[0]?.tracking_url || null,
            tracking_company: order.fulfillments?.[0]?.tracking_company || null,
            note: order.note || '',
            tags: order.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) || [],
            updated_at: order.updated_at,
          };

          allOrders.push(orderItem);
        }

        console.log(`[Sync Orders] Processed ${allOrders.length} orders from ${platform.shop_domain}`);

      } catch (error) {
        console.error(`[Sync Orders] Error fetching from ${platform.shop_domain}:`, error);
        // Continue with other platforms even if one fails
      }
    }

    // Sort orders by date (newest first)
    allOrders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

    console.log(`[Sync Orders] Total orders: ${allOrders.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          orders: allOrders,
          synced_at: new Date().toISOString(),
          platforms_synced: platforms.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Sync Orders] Error:', error);
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

async function shopifyRequest(
  platform: any,
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  const url = `https://${platform.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'X-Shopify-Access-Token': platform.access_token,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

function mapShopifyStatus(financialStatus: string, fulfillmentStatus: string | null): string {
  // Map Shopify statuses to our simplified status
  if (fulfillmentStatus === 'fulfilled') {
    return 'shipped';
  }
  if (fulfillmentStatus === 'partial') {
    return 'processing';
  }
  if (financialStatus === 'paid' && !fulfillmentStatus) {
    return 'processing';
  }
  if (financialStatus === 'pending') {
    return 'pending';
  }
  if (financialStatus === 'refunded' || financialStatus === 'voided') {
    return 'cancelled';
  }
  return 'pending';
}
