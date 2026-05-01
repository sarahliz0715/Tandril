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

// --- Inlined decryption helpers (cannot import _shared in dashboard-deployed functions) ---
const _ALGORITHM = 'AES-GCM';
const _KEY_LENGTH = 256;
const _IV_LENGTH = 12;

async function _getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) throw new Error('ENCRYPTION_SECRET environment variable not set');
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('tandril-encryption-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: _ALGORITHM, length: _KEY_LENGTH }, false, ['encrypt', 'decrypt']
  );
}

async function decryptToken(ciphertext: string): Promise<string> {
  const key = await _getEncryptionKey();
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, _IV_LENGTH);
  const data = combined.slice(_IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt({ name: _ALGORITHM, iv }, key, data);
  return new TextDecoder().decode(decrypted);
}
// --- End decryption helpers ---

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

      // Save the user's message to DB before calling Claude so it persists
      try {
        await saveMessage(supabaseClient, user.id, conversationId, 'user', message);
      } catch (e) {
        console.warn('[Orion] Could not save user message:', e.message);
      }
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
      // Await the assistant message save so it completes before the function returns.
      // Fire-and-forget saves are abandoned when Deno terminates the execution context.
      try {
        // Append a compact action summary so Orion's history shows what was proposed.
        // This lets Orion accurately track multi-step batch progress (e.g. spring SEO).
        const responseToSave = pendingAction
          ? `${response}\n\n_[Action proposed: ${formatActionSummary(pendingAction)}]_`
          : response;
        await saveMessage(supabaseClient, user.id, conversationId, 'assistant', responseToSave);
      } catch (e) {
        console.warn('[Orion] Could not save assistant message:', e.message);
      }

      // Memory extraction is non-essential — keep it best-effort
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
      model: 'claude-haiku-4-5-20251001',
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

// ─── Action Summary Formatter ─────────────────────────────────────────────────

function formatActionSummary(action: any): string {
  const name = action.product_name || action.title || action.sku || 'product';
  switch (action.type) {
    case 'update_title':
      return `Update title of "${name}" → "${action.new_title}"`;
    case 'update_inventory':
      return `Set inventory for "${name}" to ${action.quantity}`;
    case 'update_price':
      return `Update price for "${name}" to $${action.price}`;
    case 'create_product':
      return `Create product "${action.title}"`;
    case 'upload_image':
      return `Upload image for "${name}"`;
    case 'update_metafield':
      return `Set ${action.namespace}.${action.key} on "${name}"`;
    default:
      return `${action.type} on "${name}"`;
  }
}

// ─── Store Action Execution ───────────────────────────────────────────────────

async function executeStoreAction(supabaseClient: any, userId: string, action: any) {
  const { data: allPlatforms } = await supabaseClient
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('platform_type', ['shopify', 'woocommerce']);

  if (!allPlatforms || allPlatforms.length === 0) {
    throw new Error('No connected store found. Connect Shopify or WooCommerce in the Platforms tab first.');
  }

  const shopifyPlatform = allPlatforms.find((p: any) => p.platform_type === 'shopify');
  const wooPlatform = allPlatforms.find((p: any) => p.platform_type === 'woocommerce');
  const requested = (action.platform || '').toLowerCase();

  let target: any;
  let platformType: string;

  if (requested === 'woocommerce' && wooPlatform) {
    target = wooPlatform; platformType = 'woocommerce';
  } else if (requested === 'shopify' && shopifyPlatform) {
    target = shopifyPlatform; platformType = 'shopify';
  } else if (shopifyPlatform) {
    target = shopifyPlatform; platformType = 'shopify';
  } else if (wooPlatform) {
    target = wooPlatform; platformType = 'woocommerce';
  } else {
    throw new Error(`No connected ${requested || 'store'} found. Check your Platforms settings.`);
  }

  return platformType === 'woocommerce'
    ? executeWooAction(target, action)
    : executeShopifyAction(target, action);
}

async function executeShopifyAction(platform: any, action: any) {
  const shopDomain = platform.shop_domain || platform.domain || platform.store_domain;
  if (!shopDomain) throw new Error('Could not determine Shopify store domain.');

  let accessToken = platform.access_token;
  try {
    if (accessToken && accessToken.length > 50 && !accessToken.startsWith('shpat_') && !accessToken.startsWith('shpca_')) {
      accessToken = await decryptToken(accessToken);
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
      const res = await fetch(`${shopifyBase}/products.json`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Shopify rejected the product: ${await res.text()}`);
      const data = await res.json();
      return { message: `Created "${data.product.title}" in your Shopify store (ID: ${data.product.id})` };
    }

    case 'update_inventory': {
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const allProducts = (await searchRes.json()).products || [];
      let targetVariant: any = null;
      for (const p of allProducts) {
        for (const v of (p.variants || [])) {
          if (action.sku && v.sku === action.sku) { targetVariant = v; break; }
          if (!action.sku && p.title.toLowerCase() === (action.product_name || '').toLowerCase()) { targetVariant = v; break; }
        }
        if (targetVariant) break;
      }
      if (!targetVariant) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);

      const locData = await (await fetch(`${shopifyBase}/inventory_levels.json?inventory_item_ids=${targetVariant.inventory_item_id}&limit=1`, { headers })).json();
      const locationId = locData.inventory_levels?.[0]?.location_id;
      if (!locationId) throw new Error('Could not find inventory location for this product.');

      const setRes = await fetch(`${shopifyBase}/inventory_levels/set.json`, {
        method: 'POST', headers,
        body: JSON.stringify({ location_id: locationId, inventory_item_id: targetVariant.inventory_item_id, available: action.quantity }),
      });
      if (!setRes.ok) throw new Error(`Shopify inventory update failed: ${await setRes.text()}`);
      return { message: `Updated inventory for "${action.sku || action.product_name}" to ${action.quantity} units` };
    }

    case 'upload_image': {
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const allProducts = (await searchRes.json()).products || [];
      let targetProduct: any = null;
      for (const p of allProducts) {
        if (action.sku && (p.variants || []).find((v: any) => v.sku === action.sku)) { targetProduct = p; break; }
        if (p.title.toLowerCase() === (action.product_name || '').toLowerCase()) { targetProduct = p; break; }
      }
      if (!targetProduct) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);
      if (!action.image_data) throw new Error('No image data provided. Please upload an image and try again.');

      const uploadRes = await fetch(`${shopifyBase}/products/${targetProduct.id}/images.json`, {
        method: 'POST', headers,
        body: JSON.stringify({ image: { attachment: action.image_data, filename: action.image_filename || 'product-image.jpg' } }),
      });
      if (!uploadRes.ok) throw new Error(`Shopify image upload failed: ${await uploadRes.text()}`);
      return { message: `Added image to "${targetProduct.title}" successfully` };
    }

    case 'update_title': {
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const allProducts = (await searchRes.json()).products || [];
      let targetProduct: any = null;
      for (const p of allProducts) {
        if (action.sku && (p.variants || []).find((v: any) => v.sku === action.sku)) { targetProduct = p; break; }
        if (p.title.toLowerCase() === (action.product_name || '').toLowerCase()) { targetProduct = p; break; }
      }
      if (!targetProduct) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);

      const updateRes = await fetch(`${shopifyBase}/products/${targetProduct.id}.json`, {
        method: 'PUT', headers,
        body: JSON.stringify({ product: { id: targetProduct.id, title: action.new_title } }),
      });
      if (!updateRes.ok) throw new Error(`Shopify title update failed: ${await updateRes.text()}`);
      const updatedData = await updateRes.json();
      return { message: `Updated title from "${targetProduct.title}" to "${updatedData.product.title}"` };
    }

    case 'update_price': {
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const allProducts = (await searchRes.json()).products || [];
      let targetVariant: any = null;
      for (const p of allProducts) {
        for (const v of (p.variants || [])) {
          if (action.sku && v.sku === action.sku) { targetVariant = v; break; }
          if (!action.sku && p.title.toLowerCase() === (action.product_name || '').toLowerCase()) { targetVariant = v; break; }
        }
        if (targetVariant) break;
      }
      if (!targetVariant) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);

      const updateRes = await fetch(`${shopifyBase}/variants/${targetVariant.id}.json`, {
        method: 'PUT', headers,
        body: JSON.stringify({ variant: { id: targetVariant.id, price: String(action.price) } }),
      });
      if (!updateRes.ok) throw new Error(`Shopify price update failed: ${await updateRes.text()}`);
      return { message: `Updated price for "${action.sku || action.product_name}" to $${action.price}` };
    }

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

async function executeWooAction(platform: any, action: any) {
  const storeUrl = platform.store_url;
  const { consumer_key, consumer_secret } = platform.credentials || {};
  if (!storeUrl || !consumer_key || !consumer_secret) {
    throw new Error('WooCommerce credentials are incomplete. Reconnect your store in the Platforms tab.');
  }

  const auth = btoa(`${consumer_key}:${consumer_secret}`);
  const headers: Record<string, string> = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' };
  const wooBase = `${storeUrl}/wp-json/wc/v3`;

  const findProduct = async (): Promise<any> => {
    if (action.sku) {
      const r = await fetch(`${wooBase}/products?sku=${encodeURIComponent(action.sku)}&per_page=1`, { headers });
      if (r.ok) { const items = await r.json(); if (items.length > 0) return items[0]; }
    }
    if (action.product_name) {
      const r = await fetch(`${wooBase}/products?search=${encodeURIComponent(action.product_name)}&per_page=5`, { headers });
      if (r.ok) {
        const items = await r.json();
        return items.find((p: any) => p.name.toLowerCase() === (action.product_name || '').toLowerCase()) || items[0];
      }
    }
    throw new Error(`Could not find product "${action.sku || action.product_name}" in WooCommerce.`);
  };

  switch (action.type) {

    case 'create_product': {
      const res = await fetch(`${wooBase}/products`, {
        method: 'POST', headers,
        body: JSON.stringify({
          name: action.title,
          description: action.description || '',
          regular_price: String(action.price ?? '0.00'),
          sku: action.sku || '',
          manage_stock: true,
          stock_quantity: action.quantity ?? 0,
          status: 'publish',
        }),
      });
      if (!res.ok) throw new Error(`WooCommerce rejected the product: ${await res.text()}`);
      const data = await res.json();
      return { message: `Created "${data.name}" in your WooCommerce store (ID: ${data.id})` };
    }

    case 'update_inventory': {
      const product = await findProduct();
      const res = await fetch(`${wooBase}/products/${product.id}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ manage_stock: true, stock_quantity: action.quantity }),
      });
      if (!res.ok) throw new Error(`WooCommerce inventory update failed: ${await res.text()}`);
      return { message: `Updated inventory for "${action.sku || action.product_name}" to ${action.quantity} units` };
    }

    case 'update_price': {
      const product = await findProduct();
      const res = await fetch(`${wooBase}/products/${product.id}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ regular_price: String(action.price) }),
      });
      if (!res.ok) throw new Error(`WooCommerce price update failed: ${await res.text()}`);
      return { message: `Updated price for "${action.sku || action.product_name}" to $${action.price}` };
    }

    case 'update_title': {
      const product = await findProduct();
      const res = await fetch(`${wooBase}/products/${product.id}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ name: action.new_title }),
      });
      if (!res.ok) throw new Error(`WooCommerce title update failed: ${await res.text()}`);
      return { message: `Updated title from "${product.name}" to "${action.new_title}"` };
    }

    case 'upload_image':
      throw new Error('Image upload via Orion is only supported for Shopify. Upload images directly in your WooCommerce dashboard.');

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

// ─── Store Context ────────────────────────────────────────────────────────────

async function fetchEbayDataForOrion(platform: any): Promise<{ products: any[], orders: any[] }> {
  const credentials = platform.credentials;
  const metadata = platform.metadata || {};
  const apiBase = metadata.environment === 'sandbox'
    ? 'https://api.sandbox.ebay.com'
    : 'https://api.ebay.com';
  const marketplaceId = credentials.marketplace_id || 'EBAY_US';
  let accessToken = credentials.access_token;

  // Refresh token if expired or close to expiry (5 min buffer)
  const tokenExpiresAt = metadata.token_expires_at ? new Date(metadata.token_expires_at).getTime() : 0;
  if (tokenExpiresAt > 0 && Date.now() > tokenExpiresAt - 5 * 60 * 1000) {
    try {
      const ebayClientId = Deno.env.get('EBAY_CLIENT_ID');
      const ebayClientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
      if (ebayClientId && ebayClientSecret && credentials.refresh_token) {
        const tokenUrl = metadata.environment === 'sandbox'
          ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
          : 'https://api.ebay.com/identity/v1/oauth2/token';
        const refreshRes = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${ebayClientId}:${ebayClientSecret}`)}`,
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: credentials.refresh_token,
          }).toString(),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          accessToken = refreshData.access_token;
        }
      }
    } catch {
      // Use existing token; will fail gracefully below if truly expired
    }
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-EBAY-C-MARKETPLACE-ID': marketplaceId,
  };

  const products: any[] = [];
  const orders: any[] = [];

  // Fetch inventory items
  const invRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item?limit=50`, { headers });
  if (invRes.ok) {
    const invData = await invRes.json();

    // Fetch offers to get prices (keyed by SKU)
    const offerPrices: Record<string, number> = {};
    const offersRes = await fetch(`${apiBase}/sell/inventory/v1/offer?limit=200`, { headers });
    if (offersRes.ok) {
      const offersData = await offersRes.json();
      for (const offer of offersData.offers || []) {
        if (offer.sku && offer.pricingSummary?.price?.value) {
          offerPrices[offer.sku] = parseFloat(offer.pricingSummary.price.value);
        }
      }
    }

    for (const item of invData.inventoryItems || []) {
      products.push({
        title: item.product?.title || item.sku || 'eBay Item',
        sku: item.sku,
        price: offerPrices[item.sku] ?? null,
        inventory_quantity: item.availability?.shipToLocationAvailability?.quantity ?? 0,
        status: 'active',
        vendor: item.product?.brand || '',
        product_type: '',
        platform_type: 'ebay',
      });
    }
  } else {
    console.warn('[Orion] eBay inventory fetch failed:', invRes.status, await invRes.text());
  }

  // Fetch orders
  const ordersRes = await fetch(`${apiBase}/sell/fulfillment/v1/order?limit=25`, { headers });
  if (ordersRes.ok) {
    const ordersData = await ordersRes.json();
    for (const order of ordersData.orders || []) {
      orders.push({
        id: order.orderId,
        order_number: order.orderId,
        created_at: order.creationDate,
        total_price: parseFloat(order.pricingSummary?.total?.value || '0'),
        financial_status: order.orderPaymentStatus === 'PAID' ? 'paid' : 'pending',
        fulfillment_status: order.orderFulfillmentStatus === 'FULFILLED' ? 'fulfilled' : 'unfulfilled',
        line_items: (order.lineItems || []).map((i: any) => ({
          title: i.title,
          quantity: i.quantity,
        })),
        platform_type: 'ebay',
      });
    }
  }

  return { products, orders };
}

async function fetchShopifyDataForOrion(platform: any): Promise<{ products: any[], orders: any[] }> {
  const shopDomain = platform.shop_domain || platform.domain;
  if (!shopDomain) return { products: [], orders: [] };

  let accessToken = platform.access_token;
  try {
    if (accessToken && accessToken.length > 50 && !accessToken.startsWith('shpat_') && !accessToken.startsWith('shpca_')) {
      accessToken = await decryptToken(accessToken);
    }
  } catch (_) { /* use as-is if decrypt fails */ }

  const headers = { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' };
  const base = `https://${shopDomain}/admin/api/2024-01`;
  const products: any[] = [];
  const orders: any[] = [];

  const productsRes = await fetch(`${base}/products.json?limit=250&status=active`, { headers });
  if (productsRes.ok) {
    const data = await productsRes.json();
    for (const p of data.products || []) {
      const v = p.variants?.[0];
      products.push({
        title: p.title,
        sku: v?.sku || `shopify-${p.id}`,
        price: parseFloat(v?.price || '0'),
        inventory_quantity: v?.inventory_quantity ?? 0,
        status: p.status,
        vendor: p.vendor || '',
        product_type: p.product_type || '',
        platform_type: 'shopify',
      });
    }
  }

  const ordersRes = await fetch(`${base}/orders.json?status=any&limit=25`, { headers });
  if (ordersRes.ok) {
    const data = await ordersRes.json();
    for (const o of data.orders || []) {
      orders.push({
        id: o.id,
        order_number: o.order_number || o.name,
        created_at: o.created_at,
        total_price: parseFloat(o.total_price || '0'),
        financial_status: o.financial_status,
        fulfillment_status: o.fulfillment_status,
        line_items: (o.line_items || []).map((i: any) => ({ title: i.title, quantity: i.quantity })),
        platform_type: 'shopify',
      });
    }
  }

  return { products, orders };
}

async function fetchWooDataForOrion(platform: any): Promise<{ products: any[], orders: any[] }> {
  const storeUrl = platform.store_url;
  const { consumer_key, consumer_secret } = platform.credentials || {};
  if (!storeUrl || !consumer_key || !consumer_secret) return { products: [], orders: [] };

  const auth = btoa(`${consumer_key}:${consumer_secret}`);
  const headers = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' };
  const products: any[] = [];
  const orders: any[] = [];

  const productsRes = await fetch(`${storeUrl}/wp-json/wc/v3/products?per_page=100&status=publish`, { headers });
  if (productsRes.ok) {
    const wooProducts = await productsRes.json();
    for (const p of wooProducts) {
      products.push({
        title: p.name,
        sku: p.sku || `woo-${p.id}`,
        price: parseFloat(p.price || p.regular_price || '0'),
        inventory_quantity: p.stock_quantity ?? 0,
        status: p.status === 'publish' ? 'active' : p.status,
        vendor: '',
        product_type: p.categories?.[0]?.name || '',
        platform_type: 'woocommerce',
      });
    }
  }

  const ordersRes = await fetch(`${storeUrl}/wp-json/wc/v3/orders?per_page=25`, { headers });
  if (ordersRes.ok) {
    const wooOrders = await ordersRes.json();
    for (const o of wooOrders) {
      orders.push({
        id: o.id,
        order_number: o.number,
        created_at: o.date_created,
        total_price: parseFloat(o.total || '0'),
        financial_status: o.payment_method ? 'paid' : 'pending',
        fulfillment_status: o.status === 'completed' ? 'fulfilled' : 'unfulfilled',
        line_items: (o.line_items || []).map((i: any) => ({ title: i.name, quantity: i.quantity })),
        platform_type: 'woocommerce',
      });
    }
  }

  return { products, orders };
}

async function fetchFaireDataForOrion(platform: any): Promise<{ products: any[], orders: any[] }> {
  const { api_token } = platform.credentials || {};
  if (!api_token) return { products: [], orders: [] };

  const headers = {
    'X-FAIRE-ACCESS-TOKEN': api_token,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  const products: any[] = [];
  const orders: any[] = [];

  const productsRes = await fetch('https://www.faire.com/api/v2/products?limit=50', { headers });
  if (productsRes.ok) {
    const data = await productsRes.json();
    for (const p of data.products || []) {
      const option = p.options?.[0];
      products.push({
        title: p.name || 'Unnamed',
        sku: option?.sku || `faire-${p.id}`,
        price: option?.price_cents != null ? option.price_cents / 100 : 0,
        inventory_quantity: option?.available_quantity ?? 0,
        status: p.active ? 'active' : 'inactive',
        vendor: p.brand_name || '',
        product_type: p.category?.name || '',
        platform_type: 'faire',
      });
    }
  }

  const ordersRes = await fetch('https://www.faire.com/api/v2/orders?limit=25', { headers });
  if (ordersRes.ok) {
    const data = await ordersRes.json();
    for (const o of data.orders || []) {
      orders.push({
        id: o.id,
        order_number: o.display_id || o.id,
        created_at: o.created_at,
        total_price: o.total_order_value_cents != null ? o.total_order_value_cents / 100 : 0,
        financial_status: o.state === 'PAID' ? 'paid' : 'pending',
        fulfillment_status: o.state === 'DELIVERED' ? 'fulfilled' : 'unfulfilled',
        line_items: (o.items || []).map((i: any) => ({ title: i.product_name || i.name, quantity: i.quantity })),
        platform_type: 'faire',
      });
    }
  }

  return { products, orders };
}

async function getUserStoreContext(supabaseClient: any, userId: string) {
  const { data: platforms } = await supabaseClient
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  // Fetch live data from all supported platforms in parallel
  const liveResults = await Promise.all(
    (platforms || []).map(async (platform: any) => {
      try {
        if (platform.platform_type === 'shopify' && platform.access_token) {
          const data = await fetchShopifyDataForOrion(platform);
          return { ...data, platformType: 'shopify' };
        }
        if (platform.platform_type === 'ebay' && platform.credentials?.access_token) {
          const data = await fetchEbayDataForOrion(platform);
          return { ...data, platformType: 'ebay' };
        }
        if (platform.platform_type === 'woocommerce' && platform.credentials?.consumer_key) {
          const data = await fetchWooDataForOrion(platform);
          return { ...data, platformType: 'woocommerce' };
        }
        if (platform.platform_type === 'faire' && platform.credentials?.api_token) {
          const data = await fetchFaireDataForOrion(platform);
          return { ...data, platformType: 'faire' };
        }
      } catch (e: any) {
        console.warn(`[Orion] ${platform.platform_type} live fetch failed:`, e.message);
      }
      return null;
    })
  );

  const liveProducts: any[] = [];
  const liveOrders: any[] = [];
  const livePlatformTypes = new Set<string>();
  for (const result of liveResults) {
    if (result) {
      liveProducts.push(...result.products);
      liveOrders.push(...result.orders);
      livePlatformTypes.add(result.platformType);
    }
  }

  // Read DB for platforms we didn't fetch live (avoids stale duplicates)
  const { data: dbProducts, count: productCount } = await supabaseClient
    .from('products')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: dbOrders, count: orderCount } = await supabaseClient
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(25);

  const filteredDbProducts = (dbProducts || []).filter(
    (p: any) => !livePlatformTypes.has(p.platform_type || '')
  );
  const filteredDbOrders = (dbOrders || []).filter(
    (o: any) => !livePlatformTypes.has(o.platform_type || o.platform || '')
  );

  const products = [...filteredDbProducts, ...liveProducts];
  const orders = [...filteredDbOrders, ...liveOrders];
  const totalProducts = filteredDbProducts.length + liveProducts.length + Math.max(0, (productCount || 0) - (dbProducts?.length || 0));
  const totalOrders = filteredDbOrders.length + liveOrders.length;

  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  const lowStockProducts = products.filter((p: any) => {
    const qty = p.inventory_quantity ?? p.stock_quantity ?? p.quantity ?? null;
    return qty !== null && qty <= 5;
  });

  return {
    platforms: platforms || [],
    products,
    total_products: totalProducts,
    orders,
    total_orders: totalOrders,
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
      const platform = p.platform_type || p.platform || '';
      return `  - ${name} | SKU: ${sku} | Price: ${price} | Stock: ${stock}${platform ? ` | Platform: ${platform}` : ''}${vendor ? ` | Vendor: ${vendor}` : ''}${type ? ` | Type: ${type}` : ''}${status ? ` | Status: ${status}` : ''}`;
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

  const actionablePlatforms = (storeContext.platforms || [])
    .filter((p: any) => ['shopify', 'woocommerce'].includes(p.platform_type))
    .map((p: any) => p.platform_type === 'shopify' ? 'Shopify' : 'WooCommerce');
  const hasMultipleActionablePlatforms = actionablePlatforms.length >= 2;

  const systemPrompt = `You are Orion, an AI business wingman for e-commerce sellers. You're sharp, direct, and genuinely invested in their success. You remember past conversations and build on what you've learned over time.

**CRITICAL - What you can and cannot do:**
- You CAN: Read and analyze store data (products, orders, inventory, revenue) from the data provided below
- You CAN: Give advice, spot trends, flag issues, answer questions about their business
- You CAN: Execute store actions — create products, update inventory quantities, update prices, update product titles/SEO, add images to products — directly on their connected Shopify or WooCommerce store
- You CAN: Create automated workflows in Tandril — set up scheduled inventory email reports, low-stock notifications, and other recurring automations
- You CANNOT: Log into any platform or request credentials — NEVER ask for passwords, API keys, or admin access. You already have the integration through Tandril.
- You CANNOT: Process payments, refund orders, delete products, or fulfill orders

**How to execute a store action:**
When the user asks you to create a product, add inventory, change a price, rename a title, or add an image, respond conversationally AND append a single action block on its own line at the very end of your message.

⚠️ ALLOWED action types (use ONLY these — any other type will cause an error):
  • create_product
  • update_inventory
  • update_price
  • update_title
  • upload_image
  • create_workflow
❌ FORBIDDEN (will always fail): update_product, update_seo, bulk_update, add_image, set_image, or any other type not listed above.

Action formats:

All store actions accept an optional `"platform"` field — set it to `"shopify"` or `"woocommerce"` when the product belongs to a specific platform. If omitted, Shopify is used when connected, otherwise WooCommerce. Always match the platform to the product's Platform column in the product list below.

To create a new product:
[ORION_ACTION:{"type":"create_product","platform":"shopify","title":"Product Title","sku":"SKU-001","price":29.99,"quantity":10,"description":"Optional description","vendor":"","product_type":""}]

To update inventory quantity (use exact SKU from the product list below):
[ORION_ACTION:{"type":"update_inventory","platform":"shopify","product_name":"Product Title","sku":"SKU-001","quantity":25}]

To update a price (use exact SKU from the product list below):
[ORION_ACTION:{"type":"update_price","platform":"shopify","product_name":"Product Title","sku":"SKU-001","price":34.99}]

To rename/update a product title (e.g. for SEO or seasonal refresh):
[ORION_ACTION:{"type":"update_title","platform":"shopify","product_name":"Current Product Title","sku":"SKU-001","new_title":"New Product Title"}]

To add/upload an image to a product (Shopify only — ONLY when the user has attached an image file — use upload_image, NEVER update_product):
[ORION_ACTION:{"type":"upload_image","platform":"shopify","product_name":"Product Title","sku":"SKU-001","image_from_upload":true}]

To create a Tandril workflow (scheduled automation — e.g. low-stock email, daily report):
[ORION_ACTION:{"type":"create_workflow","name":"Daily Low Stock Report","trigger_type":"schedule","cron":"0 9 * * *","action_type":"inventory_email","recipient":"seller@example.com","low_stock_threshold":5}]

  Workflow action_types:
    - inventory_email: sends an inventory/low-stock report email. Fields: recipient (email), low_stock_threshold (number, default 5)
    - send_email: sends a custom email. Fields: recipient, subject
  Cron schedule values:
    - "0 * * * *" = Every Hour
    - "0 6 * * *" = Every Day at 6 AM
    - "0 9 * * *" = Every Day at 9 AM (default)
    - "0 12 * * *" = Every Day at 12 PM
    - "0 9 * * 1" = Every Monday at 9 AM
  Always ask for the user's email before generating a create_workflow action if you don't already know it.
${hasMultipleActionablePlatforms ? `
**Multi-platform execution:**
You are connected to multiple actionable stores: **${actionablePlatforms.join(' and ')}**. When the user asks to update something "on all stores", "everywhere", "across platforms", or when your recommendation is to apply the same change to all connected stores, include a "platforms" array listing all applicable platforms:
[ORION_ACTION:{"type":"update_price","platforms":["shopify","woocommerce"],"product_name":"Product Title","sku":"SKU-001","price":34.99}]

IMPORTANT: When you generate a multi-platform action, always tell the user which stores you can execute on by name — for example: "I can execute this on your **Shopify** store and **WooCommerce** store. Want me to update all stores, or just some?" The user will see checkboxes to select which stores to update before anything executes. Only use the "platforms" array for actions that genuinely make sense on both platforms. For platform-specific products or features, use the single "platform" field as before.
` : ''}
Rules for actions:
- Always include the SKU when you have it — it's the most reliable way to find the product
- Only one action block per response
- The user will see a confirmation card and must approve before anything executes
- If you don't have enough info (missing price, missing title, etc.), ask for it before generating the action block
- For upload_image: only generate this action when the user has actually uploaded an image file in their message. Never reference image URLs — only use uploaded files.

**Tracking multi-step batch operations (CRITICAL):**
When you execute a batch job one product at a time (e.g. updating all titles for spring SEO), **the product data loaded above is the primary source of truth** — not conversation history. An action may have been proposed and approved but still failed to execute (especially during testing), so history alone cannot confirm completion.

When asked "are we done?" or "check again":
1. **Check the actual product data first** — look at the current titles, prices, or inventory quantities in the Product Inventory list above. If a product already reflects the intended change (e.g. the title already contains the spring keyword), it's done. If it still shows the old value, it still needs work — regardless of what the conversation history says.
2. **Use `[Action proposed: ...]` history lines as a secondary hint only** — they tell you an action was proposed and approved, but do NOT guarantee it succeeded. Your previous messages will contain lines like `_[Action proposed: Update title of "Product Name" → "New Title"]_` for reference.

Always base your "are we done?" answer on the live product data, not on history. If a product shows the old value in the data above, it still needs to be updated.

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
    `- No store is connected yet — you're in setup mode
- Start your FIRST response with a warm, direct welcome: introduce yourself briefly and tell them the first thing they need to do is connect their Shopify store
- Explain that connecting takes about 30 seconds and unlocks everything: real inventory data, order tracking, price updates, and automated tasks
- Tell them to go to Settings > Platforms (or look for the "Connect Store" button in the sidebar) to get started
- If they ask questions about their store or data, remind them you can't see anything until a store is connected — keep it friendly, not robotic
- You CAN still help with general e-commerce strategy, pricing advice, copywriting, and business questions while they get set up
- Never pretend to take actions you can't take` :
    `- Use the real store data above to give specific, grounded advice
- Answer questions about products, stock, orders, and revenue directly from the data above
- Proactively flag low stock, pricing opportunities, and trends you spot
- When asked to DO something in the store (add/update inventory, change prices, create products, rename/SEO-update titles, add images to products), generate an ORION_ACTION block as described above — the user will confirm before anything executes. Always set `"platform"` to match the product's Platform in the product list. For image uploads always use type "upload_image" with `"platform":"shopify"`, never "update_product".
- When asked to set up an alert, notification, reminder, or automated report (e.g. "alert me when stock drops below 5", "send me a daily inventory report"), use type "create_workflow" — never tell the user to set it up manually in Shopify or elsewhere. Ask for their email first if needed, then generate the action block.
- Only one action per response; if the user asks to update multiple products (e.g. spring-theme all titles), propose all the new titles in your message first, then generate an action for the FIRST product — after they approve, you'll do the next one. Track progress by checking the **current product data above** — if it already shows the updated value, that product is done. Only fall back to `[Action proposed: ...]` history lines as a secondary hint.
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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${await response.text()}`);

  const data = await response.json();
  return data.content[0].text;
}
