// Orion - AI Business Wingman Edge Function
// With persistent conversation history and business memory

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
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { message, conversation_id = null, uploaded_files = [], execute_action = null } = await req.json();

    // ── Action Execution Mode ────────────────────────────────────────────────
    if (execute_action) {
      const result = await executeStoreAction(supabaseClient, user.id, execute_action);
      return new Response(
        JSON.stringify({ success: true, execution_result: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!message) throw new Error('Message is required');

    console.log(`[Orion] Processing message for user ${user.id}`);

    // Try to get/create conversation — if tables don't exist yet, fall back gracefully
    let conversationId: string | null = null;
    try {
      conversationId = await getOrCreateConversation(supabaseClient, user.id, conversation_id);
    } catch (e) {
      console.warn('[Orion] Conversation table unavailable, running without persistence:', e.message);
    }

    // Load store context (always) + history/memory (only if conversation table available)
    let recentHistory: any[] = [];
    let memoryNotes: any[] = [];
    const storeContext = await getUserStoreContext(supabaseClient, user.id);

    if (conversationId) {
      try {
        [recentHistory, memoryNotes] = await Promise.all([
          loadConversationHistory(supabaseClient, user.id, conversationId),
          loadMemoryNotes(supabaseClient, user.id),
        ]);
      } catch (e) {
        console.warn('[Orion] Could not load history/memory:', e.message);
      }

      // Save the user's message to DB (non-fatal if it fails)
      saveMessage(supabaseClient, user.id, conversationId, 'user', message).catch(
        (e) => console.warn('[Orion] Could not save user message:', e.message)
      );
    }

    // Get Orion's response
    const rawResponse = await chatWithClaude(message, recentHistory, uploaded_files, storeContext, memoryNotes);

    // Parse any pending store action Orion embedded in its response
    let response = rawResponse;
    let pendingAction: any = null;
    const actionMatch = rawResponse.match(/\[ORION_ACTION:([\s\S]*?)\]$/m);
    if (actionMatch) {
      try {
        pendingAction = JSON.parse(actionMatch[1]);
        response = rawResponse.replace(/\s*\[ORION_ACTION:[\s\S]*?\]$/m, '').trim();
      } catch {
        // Malformed JSON in action block — ignore it, use full response as-is
      }
    }

    if (conversationId) {
      // Save Orion's response to DB (non-fatal)
      saveMessage(supabaseClient, user.id, conversationId, 'assistant', response).catch(
        (e) => console.warn('[Orion] Could not save assistant message:', e.message)
      );

      // Extract and save any new memory insights (non-blocking)
      extractAndSaveMemory(supabaseClient, user.id, conversationId, message, response).catch(
        (e) => console.error('[Orion] Memory extraction failed:', e)
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        response,
        pending_action: pendingAction,
        conversation_id: conversationId,
        context_used: {
          platforms: storeContext.platforms.length,
          has_products: storeContext.total_products > 0,
          has_orders: storeContext.total_orders > 0,
          history_messages: recentHistory.length,
          memory_notes: memoryNotes.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[Orion] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Failed to process AI chat' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

// ─── Conversation Management ──────────────────────────────────────────────────

async function getOrCreateConversation(supabaseClient: any, userId: string, conversationId: string | null) {
  if (conversationId) {
    // Verify it belongs to this user
    const { data } = await supabaseClient
      .from('orion_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();
    if (data) return conversationId;
  }

  // Create a new conversation
  const { data, error } = await supabaseClient
    .from('orion_conversations')
    .insert({ user_id: userId, title: 'New conversation' })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return data.id;
}

async function loadConversationHistory(supabaseClient: any, userId: string, conversationId: string) {
  // Load last 40 messages from current conversation + last 10 from previous sessions for context
  const { data: currentMessages } = await supabaseClient
    .from('orion_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(40);

  // Also grab a few messages from the most recent previous conversation
  const { data: prevConversations } = await supabaseClient
    .from('orion_conversations')
    .select('id')
    .eq('user_id', userId)
    .neq('id', conversationId)
    .order('updated_at', { ascending: false })
    .limit(1);

  let previousMessages: any[] = [];
  if (prevConversations && prevConversations.length > 0) {
    const { data: prevMsgs } = await supabaseClient
      .from('orion_messages')
      .select('role, content, created_at')
      .eq('conversation_id', prevConversations[0].id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    previousMessages = (prevMsgs || []).reverse();
  }

  return [...previousMessages, ...(currentMessages || [])];
}

async function saveMessage(supabaseClient: any, userId: string, conversationId: string, role: string, content: string) {
  await supabaseClient
    .from('orion_messages')
    .insert({ user_id: userId, conversation_id: conversationId, role, content });

  // Update conversation timestamp
  await supabaseClient
    .from('orion_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

async function loadMemoryNotes(supabaseClient: any, userId: string) {
  const { data } = await supabaseClient
    .from('orion_memory')
    .select('category, key, value, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50);
  return data || [];
}

async function extractAndSaveMemory(
  supabaseClient: any,
  userId: string,
  conversationId: string,
  userMessage: string,
  assistantResponse: string
) {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicApiKey) return;

  const extractionPrompt = `You are analyzing a conversation between a user and Orion (an AI business wingman) to extract memorable business facts.

User said: "${userMessage}"
Orion responded: "${assistantResponse}"

Extract any notable business facts, preferences, or insights worth remembering for future conversations. Focus on:
- Owner preferences or business goals
- Key products, suppliers, or business relationships mentioned
- Business challenges or opportunities discussed
- Decisions made or strategies agreed upon
- Important numbers or benchmarks mentioned

Respond with a JSON array (can be empty [] if nothing notable). Each item:
{"category": "owner_preference|product_knowledge|business_goal|trend|challenge|decision", "key": "short_identifier", "value": "the insight to remember"}

Only include genuinely useful facts. Return ONLY the JSON array, no other text.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      messages: [{ role: 'user', content: extractionPrompt }],
    }),
  });

  if (!response.ok) return;

  const data = await response.json();
  const text = data.content[0].text.trim();

  let insights: any[] = [];
  try {
    insights = JSON.parse(text);
  } catch {
    return; // Not valid JSON, skip
  }

  for (const insight of insights) {
    if (!insight.category || !insight.key || !insight.value) continue;
    // Upsert by user_id + key so we update existing facts
    await supabaseClient
      .from('orion_memory')
      .upsert(
        {
          user_id: userId,
          category: insight.category,
          key: insight.key,
          value: insight.value,
          source_conversation_id: conversationId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,key' }
      );
  }
}

// ─── Store Action Execution ───────────────────────────────────────────────────

async function executeStoreAction(supabaseClient: any, userId: string, action: any) {
  // Get the connected Shopify platform and its credentials
  const { data: platforms } = await supabaseClient
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('platform_type', 'shopify')
    .eq('is_active', true)
    .limit(1);

  if (!platforms || platforms.length === 0) {
    throw new Error('No connected Shopify store found. Connect one in the Platforms tab first.');
  }

  const platform = platforms[0];
  const shopDomain = platform.shop_domain || platform.domain || platform.store_domain;
  if (!shopDomain) throw new Error('Could not determine Shopify store domain.');

  // Decrypt the stored access token
  let accessToken = platform.access_token;
  try {
    // Try to detect and decrypt if encrypted (base64 length heuristic)
    if (accessToken && accessToken.length > 50 && !accessToken.startsWith('shpat_') && !accessToken.startsWith('shpca_')) {
      const { decrypt } = await import('../_shared/encryption.ts');
      accessToken = await decrypt(accessToken);
    }
  } catch (e) {
    console.warn('[Orion] Token decryption failed, using as-is:', e.message);
  }

  const shopifyBase = `https://${shopDomain}/admin/api/2024-01`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': accessToken,
  };

  switch (action.type) {

    case 'create_product': {
      const body = {
        product: {
          title: action.title,
          body_html: action.description || '',
          vendor: action.vendor || '',
          product_type: action.product_type || '',
          status: 'active',
          variants: [{
            sku: action.sku || '',
            price: String(action.price ?? '0.00'),
            inventory_quantity: action.quantity ?? 0,
            inventory_management: 'shopify',
            fulfillment_service: 'manual',
          }],
        },
      };
      const res = await fetch(`${shopifyBase}/products.json`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Shopify rejected the product: ${err}`);
      }
      const data = await res.json();
      return { message: `Created "${data.product.title}" in your Shopify store (ID: ${data.product.id})` };
    }

    case 'update_inventory': {
      // Find product by title or SKU via Shopify search
      const searchRes = await fetch(
        `${shopifyBase}/products.json?limit=250`,
        { headers }
      );
      const searchData = await searchRes.json();
      const allProducts = searchData.products || [];

      // Find matching product by SKU or title
      let targetVariant: any = null;
      for (const p of allProducts) {
        for (const v of (p.variants || [])) {
          if (action.sku && v.sku === action.sku) { targetVariant = v; break; }
          if (!action.sku && p.title.toLowerCase() === (action.product_name || '').toLowerCase()) {
            targetVariant = v; break;
          }
        }
        if (targetVariant) break;
      }

      if (!targetVariant) throw new Error(`Could not find product with SKU "${action.sku || action.product_name}" in Shopify.`);

      // Get location for inventory update
      const locRes = await fetch(
        `${shopifyBase}/inventory_levels.json?inventory_item_ids=${targetVariant.inventory_item_id}&limit=1`,
        { headers }
      );
      const locData = await locRes.json();
      const locationId = locData.inventory_levels?.[0]?.location_id;
      if (!locationId) throw new Error('Could not find inventory location for this product.');

      const setRes = await fetch(`${shopifyBase}/inventory_levels/set.json`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          location_id: locationId,
          inventory_item_id: targetVariant.inventory_item_id,
          available: action.quantity,
        }),
      });
      if (!setRes.ok) throw new Error(`Shopify inventory update failed: ${await setRes.text()}`);
      return { message: `Updated inventory for "${action.sku || action.product_name}" to ${action.quantity} units` };
    }

    case 'update_price': {
      // Find variant by SKU or title
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const searchData = await searchRes.json();
      const allProducts = searchData.products || [];

      let targetVariant: any = null;
      for (const p of allProducts) {
        for (const v of (p.variants || [])) {
          if (action.sku && v.sku === action.sku) { targetVariant = v; break; }
          if (!action.sku && p.title.toLowerCase() === (action.product_name || '').toLowerCase()) {
            targetVariant = v; break;
          }
        }
        if (targetVariant) break;
      }

      if (!targetVariant) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);

      const updateRes = await fetch(`${shopifyBase}/variants/${targetVariant.id}.json`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ variant: { id: targetVariant.id, price: String(action.price) } }),
      });
      if (!updateRes.ok) throw new Error(`Shopify price update failed: ${await updateRes.text()}`);
      return { message: `Updated price for "${action.sku || action.product_name}" to $${action.price}` };
    }

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

// ─── Store Context ────────────────────────────────────────────────────────────

async function getUserStoreContext(supabaseClient: any, userId: string) {
  const { data: platforms } = await supabaseClient
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  const { data: products, count: productCount } = await supabaseClient
    .from('products')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: orders, count: orderCount } = await supabaseClient
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(25);

  const totalRevenue = orders?.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0) || 0;
  const avgOrderValue = orders && orders.length > 0 ? totalRevenue / orders.length : 0;

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

// ─── Claude Chat ──────────────────────────────────────────────────────────────

async function chatWithClaude(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  uploadedFiles: Array<{ type: string; name: string; data?: string }>,
  storeContext: any,
  memoryNotes: Array<{ category: string; key: string; value: string }>
) {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicApiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const hasRealData = storeContext.total_products > 0 || storeContext.total_orders > 0 || storeContext.platforms.length > 0;
  const mode = hasRealData ? 'production' : 'demo/test';

  const formatProducts = (products: any[]) => {
    if (!products || products.length === 0) return 'No products found.';
    return products.map((p: any) => {
      const name = p.title || p.name || p.product_title || 'Unnamed';
      const sku = p.sku || p.variant_sku || 'N/A';
      const price = p.price != null ? `$${parseFloat(p.price).toFixed(2)}` : 'N/A';
      const stock = p.inventory_quantity ?? p.stock_quantity ?? p.quantity ?? 'N/A';
      const status = p.status || '';
      const vendor = p.vendor || '';
      const type = p.product_type || p.category || '';
      return `  - ${name} | SKU: ${sku} | Price: ${price} | Stock: ${stock}${vendor ? ` | Vendor: ${vendor}` : ''}${type ? ` | Type: ${type}` : ''}${status ? ` | Status: ${status}` : ''}`;
    }).join('\n');
  };

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

  const formatLowStock = (products: any[]) => products.map((p: any) => {
    const name = p.title || p.name || 'Unnamed';
    const stock = p.inventory_quantity ?? p.stock_quantity ?? p.quantity ?? 0;
    return `  - ${name}: ${stock} remaining`;
  }).join('\n');

  const formatMemory = (notes: any[]) => {
    if (!notes || notes.length === 0) return '';
    const grouped: Record<string, string[]> = {};
    notes.forEach((n) => {
      if (!grouped[n.category]) grouped[n.category] = [];
      grouped[n.category].push(n.value);
    });
    return Object.entries(grouped)
      .map(([cat, vals]) => `  ${cat.replace(/_/g, ' ')}:\n${vals.map(v => `    - ${v}`).join('\n')}`)
      .join('\n');
  };

  const lowStockSection = storeContext.low_stock_products.length > 0
    ? `\n**⚠️ Low Stock Alert (${storeContext.low_stock_products.length} products at 5 or fewer units):**\n${formatLowStock(storeContext.low_stock_products)}\n`
    : '';

  const memorySection = memoryNotes.length > 0
    ? `\n**What I Know About This Business (from past conversations):**\n${formatMemory(memoryNotes)}\n`
    : '';

  const systemPrompt = `You are Orion, an AI business wingman for e-commerce sellers. You're sharp, direct, and genuinely invested in their success. You remember past conversations and build on what you've learned over time.

**CRITICAL - What you can and cannot do:**
- You CAN: Read and analyze store data (products, orders, inventory, revenue) from the data provided below
- You CAN: Give advice, spot trends, flag issues, answer questions about their business
- You CAN: Execute store actions — create products, update inventory quantities, update prices — directly on their connected Shopify store
- You CANNOT: Log into any platform or request credentials — NEVER ask for passwords, API keys, or admin access. You already have the integration through Tandril.
- You CANNOT: Process payments, refund orders, delete products, or fulfill orders

**How to execute a store action:**
When the user asks you to create a product, add inventory, or change a price, respond conversationally AND append a single action block on its own line at the very end of your message:

To create a new product:
[ORION_ACTION:{"type":"create_product","title":"Product Title","sku":"SKU-001","price":29.99,"quantity":10,"description":"Optional description","vendor":"","product_type":""}]

To update inventory quantity (use exact SKU from the product list below):
[ORION_ACTION:{"type":"update_inventory","product_name":"Product Title","sku":"SKU-001","quantity":25}]

To update a price (use exact SKU from the product list below):
[ORION_ACTION:{"type":"update_price","product_name":"Product Title","sku":"SKU-001","price":34.99}]

Rules for actions:
- Always include the SKU when you have it — it's the most reliable way to find the product
- Only one action block per response
- The user will see a confirmation card and must approve before anything executes
- If you don't have enough info (missing price, missing title, etc.), ask for it before generating the action block

**Current Mode:** ${mode === 'demo/test' ? 'Demo/Test Mode - No real store connected yet' : 'Production Mode - Real store data loaded below'}

**Store Overview:**
- Active Platforms: ${storeContext.platforms.map((p: any) => p.platform_type).join(', ') || 'None connected yet'}
- Total Products: ${storeContext.total_products} (showing ${storeContext.products.length} below)
- Total Orders: ${storeContext.total_orders} (showing last ${storeContext.orders.length} below)
- Total Revenue (recent): $${storeContext.metrics.total_revenue.toFixed(2)}
- Average Order Value: $${storeContext.metrics.avg_order_value.toFixed(2)}
${lowStockSection}${memorySection}
${mode !== 'demo/test' ? `**Product Inventory (${storeContext.products.length} of ${storeContext.total_products} products):**
${formatProducts(storeContext.products)}

**Recent Orders (last ${storeContext.orders.length}):**
${formatOrders(storeContext.orders)}` : ''}

**Your Role:**
${mode === 'demo/test' ?
    `- You're in demo mode — no real store is connected yet
- Help with general e-commerce strategy and best practices
- Encourage them to connect a real platform (Shopify, WooCommerce, etc.) for personalized insights
- Never pretend to take actions you can't take` :
    `- Use the real store data above to give specific, grounded advice
- Answer questions about products, stock, orders, and revenue directly from the data above
- Proactively flag low stock, pricing opportunities, and trends you spot
- When asked to DO something in the store (add/update inventory, change prices, create products), generate an ORION_ACTION block as described above — the user will confirm before anything executes
- Only one action per response; if the user asks to update multiple products, handle them one at a time and let them confirm each
- Be direct and honest — a real wingman delivers results, not just advice`}

**Communication Style:**
- Use markdown for formatting
- Be conversational, energetic, and direct — like a trusted partner, not a formal consultant
- Reference specific products, real numbers, and past discussions when relevant
- Ask sharp clarifying questions when you need more context
- Keep responses focused and actionable`;

  // Build messages from persistent history
  const messages: any[] = conversationHistory.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content,
  }));

  // Add current message with any uploaded files
  const currentContent: any[] = [{ type: 'text', text: message }];

  if (uploadedFiles && uploadedFiles.length > 0) {
    for (const file of uploadedFiles) {
      if (file.type?.startsWith('image/')) {
        currentContent.push({
          type: 'image',
          source: { type: 'base64', media_type: file.type, data: file.data },
        });
      } else if (file.type === 'text/csv' || file.type === 'application/pdf') {
        currentContent.push({
          type: 'text',
          text: `\n\n**Uploaded File: ${file.name}**\n\`\`\`\n${file.data}\n\`\`\``,
        });
      }
    }
  }

  messages.push({ role: 'user', content: currentContent });

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
      messages,
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${await response.text()}`);

  const data = await response.json();
  return data.content[0].text;
}
