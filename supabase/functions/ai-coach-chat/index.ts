// AI Business Coach Chat Edge Function
// Conversational AI with file upload and multimodal analysis support

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
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

    const { message, conversation_history = [], uploaded_files = [] } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log(`[Orion] Processing message for user ${user.id}`);

    // Get user's store context
    const storeContext = await getUserStoreContext(supabaseClient, user.id);

    // Build conversation with context
    const response = await chatWithClaude(
      message,
      conversation_history,
      uploaded_files,
      storeContext
    );

    return new Response(
      JSON.stringify({
        success: true,
        response: response,
        context_used: {
          platforms: storeContext.platforms.length,
          has_products: storeContext.total_products > 0,
          has_orders: storeContext.total_orders > 0,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Orion] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process AI chat',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function getUserStoreContext(supabaseClient: any, userId: string) {
  // Get connected platforms
  const { data: platforms } = await supabaseClient
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'connected');

  // Get products with full inventory detail
  const { data: products, count: productCount } = await supabaseClient
    .from('products')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get recent orders
  const { data: orders, count: orderCount } = await supabaseClient
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(25);

  // Calculate key metrics
  const totalRevenue = orders?.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0) || 0;
  const avgOrderValue = orders && orders.length > 0 ? totalRevenue / orders.length : 0;

  // Find low stock products (inventory <= 5)
  const lowStockProducts = (products || []).filter((p: any) => {
    const qty = p.inventory_quantity ?? p.stock_quantity ?? p.quantity ?? null;
    return qty !== null && qty <= 5;
  });

  return {
    platforms: platforms || [],
    products: products || [],
    total_products: productCount || 0,
    orders: orders || [],
    total_orders: orderCount || 0,
    low_stock_products: lowStockProducts,
    metrics: {
      total_revenue: totalRevenue,
      avg_order_value: avgOrderValue,
      active_platforms: platforms?.length || 0,
    },
  };
}

async function chatWithClaude(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  uploadedFiles: Array<{ type: string; url: string; name: string; data?: string }>,
  storeContext: any
) {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Check if user has real store data or is in demo/test mode
  const hasRealData = storeContext.total_products > 0 || storeContext.total_orders > 0 || storeContext.platforms.length > 0;
  const mode = hasRealData ? 'production' : 'demo/test';

  // Format product inventory for the prompt
  const formatProducts = (products: any[]) => {
    if (!products || products.length === 0) return 'No products found.';
    return products.map((p: any) => {
      const name = p.title || p.name || p.product_title || 'Unnamed';
      const sku = p.sku || p.variant_sku || 'N/A';
      const price = p.price != null ? `$${parseFloat(p.price).toFixed(2)}` : 'N/A';
      const stock = p.inventory_quantity ?? p.stock_quantity ?? p.quantity ?? 'N/A';
      const status = p.status || p.inventory_policy || '';
      const vendor = p.vendor || '';
      const type = p.product_type || p.category || '';
      return `  - ${name} | SKU: ${sku} | Price: ${price} | Stock: ${stock}${vendor ? ` | Vendor: ${vendor}` : ''}${type ? ` | Type: ${type}` : ''}${status ? ` | Status: ${status}` : ''}`;
    }).join('\n');
  };

  // Format recent orders for the prompt
  const formatOrders = (orders: any[]) => {
    if (!orders || orders.length === 0) return 'No orders found.';
    return orders.map((o: any) => {
      const num = o.order_number || o.name || o.id || 'N/A';
      const date = o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A';
      const total = o.total_price != null ? `$${parseFloat(o.total_price).toFixed(2)}` : 'N/A';
      const financial = o.financial_status || o.payment_status || '';
      const fulfillment = o.fulfillment_status || o.shipping_status || '';
      const items = o.line_items
        ? (Array.isArray(o.line_items)
            ? o.line_items.map((i: any) => `${i.title || i.name || 'Item'} x${i.quantity || 1}`).join(', ')
            : JSON.stringify(o.line_items).slice(0, 100))
        : '';
      return `  - Order #${num} | ${date} | ${total}${financial ? ` | ${financial}` : ''}${fulfillment ? ` | ${fulfillment}` : ''}${items ? `\n    Items: ${items}` : ''}`;
    }).join('\n');
  };

  // Format low stock alert
  const formatLowStock = (products: any[]) => {
    if (!products || products.length === 0) return '';
    return products.map((p: any) => {
      const name = p.title || p.name || 'Unnamed';
      const stock = p.inventory_quantity ?? p.stock_quantity ?? p.quantity ?? 0;
      return `  - ${name}: ${stock} remaining`;
    }).join('\n');
  };

  const lowStockSection = storeContext.low_stock_products.length > 0
    ? `\n**⚠️ Low Stock Alert (${storeContext.low_stock_products.length} products at 5 or fewer units):**\n${formatLowStock(storeContext.low_stock_products)}\n`
    : '';

  // Build system prompt with store context
  const systemPrompt = `You are Orion, an AI business wingman for e-commerce sellers. You're not just an advisor - you're their go-to partner who helps them grow, spot opportunities, and tackle challenges head-on. You're sharp, direct, and genuinely invested in their success. Think of yourself as the experienced wingman who's always got their back.

**Current Mode:** ${mode === 'demo/test' ? 'Demo/Test Mode - No real store connected yet' : 'Production Mode - Real store data'}

**Store Overview:**
- Active Platforms: ${storeContext.platforms.map((p: any) => p.platform_type).join(', ') || 'None connected yet'}
- Total Products: ${storeContext.total_products} (showing ${storeContext.products.length} below)
- Total Orders: ${storeContext.total_orders} (showing last ${storeContext.orders.length} below)
- Total Revenue (recent): $${storeContext.metrics.total_revenue.toFixed(2)}
- Average Order Value: $${storeContext.metrics.avg_order_value.toFixed(2)}
${lowStockSection}
${mode !== 'demo/test' ? `**Product Inventory (${storeContext.products.length} of ${storeContext.total_products} products):**
${formatProducts(storeContext.products)}

**Recent Orders (last ${storeContext.orders.length}):**
${formatOrders(storeContext.orders)}` : ''}

**Your Role:**
${mode === 'demo/test' ?
  `- Let them know you're in demo mode but you're ready to help with general e-commerce strategy
- Offer to dig into their questions, analyze uploaded files, or brainstorm growth ideas
- Encourage them to connect a real platform (Shopify, WooCommerce, BigCommerce, Faire, eBay) so you can give personalized insights based on their actual data
- Still bring real value with actionable advice based on best practices` :
  `- You have full visibility into their product catalog, inventory levels, and order history above - use it
- Answer specific questions about products, stock levels, pricing, and orders directly from the data
- Proactively flag low stock items, pricing opportunities, and trends you spot in the data
- Analyze uploaded files alongside store data for deeper insights
- Be direct and honest - a real wingman tells you the truth, not just what you want to hear`}

**Communication Style:**
- Use markdown for formatting
- Be conversational, energetic, and direct - like a trusted partner, not a formal consultant
- Lead with the most important insight or action, not background
${mode === 'demo/test' ? '- Share best practices confidently and encourage connecting a real platform for personalized intel' : '- Always reference specific products, order numbers, or real numbers when relevant'}
- Ask sharp clarifying questions when you need more context to give useful advice`;

  // Build messages array with uploaded files
  const messages: any[] = [];

  // Add conversation history
  conversationHistory.forEach((msg) => {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  });

  // Build current message content
  const currentMessageContent: any[] = [];

  // Add text message
  currentMessageContent.push({
    type: 'text',
    text: message,
  });

  // Add uploaded files (if any)
  if (uploadedFiles && uploadedFiles.length > 0) {
    for (const file of uploadedFiles) {
      if (file.type.startsWith('image/')) {
        // Image file - use vision
        currentMessageContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.type,
            data: file.data, // Base64 encoded image
          },
        });
      } else if (file.type === 'text/csv' || file.type === 'application/pdf') {
        // Text-based file - include content
        currentMessageContent.push({
          type: 'text',
          text: `\n\n**Uploaded File: ${file.name}**\n\`\`\`\n${file.data}\n\`\`\``,
        });
      }
    }
  }

  messages.push({
    role: 'user',
    content: currentMessageContent,
  });

  // Call Claude API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${await response.text()}`);
  }

  const data = await response.json();
  const assistantMessage = data.content[0].text;

  return assistantMessage;
}
