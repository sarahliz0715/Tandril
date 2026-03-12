// Orion - AI Business Wingman Edge Function
// With persistent conversation history, business memory, and store actions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Bracket-aware extraction of [ORION_ACTION:{...}] blocks.
// The naive regex /\[ORION_ACTION:([\s\S]*?)\]/ stops at the first ] it finds,
// which breaks any action block that contains arrays (multi_action, batch_update, etc.).
function extractOrionActionBlocks(text: string): string[] {
  const blocks: string[] = [];
  const PREFIX = '[ORION_ACTION:';
  let pos = 0;
  while (pos < text.length) {
    const start = text.indexOf(PREFIX, pos);
    if (start === -1) break;
    let depth = 0;
    let inStr = false;
    let esc = false;
    const jsonStart = start + PREFIX.length;
    let end = -1;
    for (let i = jsonStart; i < text.length; i++) {
      const ch = text[i];
      if (esc) { esc = false; continue; }
      if (inStr) { if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') { inStr = true; continue; }
      if (ch === '{' || ch === '[') depth++;
      else if (ch === '}' || ch === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) {
      blocks.push(text.slice(jsonStart, end + 1));
      // skip the closing ] of the outer [ORION_ACTION:...]
      pos = end + (text[end + 1] === ']' ? 2 : 1);
    } else {
      break;
    }
  }
  return blocks;
}

function removeOrionActionBlocks(text: string): string {
  const PREFIX = '[ORION_ACTION:';
  let result = '';
  let pos = 0;
  while (pos < text.length) {
    const start = text.indexOf(PREFIX, pos);
    if (start === -1) { result += text.slice(pos); break; }
    result += text.slice(pos, start);
    let depth = 0;
    let inStr = false;
    let esc = false;
    const jsonStart = start + PREFIX.length;
    let end = -1;
    for (let i = jsonStart; i < text.length; i++) {
      const ch = text[i];
      if (esc) { esc = false; continue; }
      if (inStr) { if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') { inStr = true; continue; }
      if (ch === '{' || ch === '[') depth++;
      else if (ch === '}' || ch === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) {
      pos = end + (text[end + 1] === ']' ? 2 : 1);
    } else {
      result += text.slice(start);
      break;
    }
  }
  return result.trim();
}

// Human-readable summary of an Orion action for the Activity Log.
function summarizeOrionAction(action: any): string {
  const name = action.product_name || action.title || action.name || 'product';
  switch (action.type) {
    case 'create_product':              return `Created product: "${action.title || name}"`;
    case 'update_inventory':            return `Updated inventory for "${name}" → ${action.quantity} units`;
    case 'update_status':               return `Set "${name}" status → ${action.status}`;
    case 'ebay_update_inventory':       return `Updated eBay inventory for "${name}" → ${action.quantity} units`;
    case 'ebay_update_price':           return `Updated eBay price for "${name}" → $${action.price}`;
    case 'ebay_update_title':           return `Updated eBay title for "${name}"`;
    case 'ebay_update_description':     return `Updated eBay description for "${name}"`;
    case 'ebay_update_image':           return `Updated eBay images for "${name}"`;
    case 'ebay_end_listing':            return `Ended eBay listing for "${name}"`;
    case 'ebay_relist':                 return `Relisted "${name}" on eBay`;
    case 'ebay_create_listing':         return `Created eBay listing: "${action.title || name}"`;
    case 'update_price':        return `Updated price for "${name}" → $${action.price}`;
    case 'update_title':        return `Updated title of "${name}" → "${action.new_title}"`;
    case 'update_tags':
    case 'add_tags':            return `Updated tags for "${name}"`;
    case 'upload_image':        return `Uploaded image for "${name}"`;
    case 'update_metafield':    return `Set ${action.metafield_key || 'metafield'} on "${name}": ${action.metafield_value}`;
    case 'update_image_alt':
    case 'update_image_alt_text': return `Updated image alt text for "${name}"`;
    case 'multi_action': {
      const desc = action.description || `${(action.actions || []).length} updates`;
      return `Orion: ${desc} on "${name}"`;
    }
    case 'batch_update': {
      const count = (action.updates || []).length;
      return `Batch updated ${action.field || 'field'} for ${count} product${count !== 1 ? 's' : ''}`;
    }
    case 'woo_create_product':        return `Created WooCommerce product: "${name}"`;
    case 'woo_bulk_create_products':  return `Created ${(action.products || []).length} WooCommerce products`;
    default:                          return `Orion action: ${action.type} on "${name}"`;
  }
}

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
    if (!authHeader) throw new Error('Missing authorization header');

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
      let result: any;
      let execStatus = 'completed';
      try {
        result = await executeStoreAction(supabaseClient, user.id, execute_action);
      } catch (err: any) {
        result = { error: err.message };
        execStatus = 'failed';
      }

      // Log to ai_commands so it appears in the dashboard Activity Log
      supabaseClient
        .from('ai_commands')
        .insert({
          user_id: user.id,
          command_text: summarizeOrionAction(execute_action),
          status: execStatus,
          executed_at: new Date().toISOString(),
          execution_results: { orion: true, action_type: execute_action.type, result },
          source: 'orion',
        })
        .then(({ error }) => {
          if (error) console.warn('[Orion] Could not log action to ai_commands:', error.message);
        });

      if (execStatus === 'failed') {
        return new Response(
          JSON.stringify({ success: false, error: result.error }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
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

      // Await user message save so we know persistence succeeded before calling Claude.
      // If this fails the error propagates and the user sees an error response rather
      // than a response that silently doesn't appear on next page load.
      try {
        await saveMessage(supabaseClient, user.id, conversationId, 'user', message);
      } catch (e: any) {
        console.error('[Orion] Failed to save user message:', e.message);
        // Don't abort — still call Claude so the user gets an answer,
        // but log clearly so the issue is visible in edge function logs.
      }
    }

    // Get Orion's response
    const rawResponse = await chatWithClaude(message, recentHistory, uploaded_files, storeContext, memoryNotes);

    // Parse ALL [ORION_ACTION:...] blocks from the response.
    // Strip them all from visible text, collect valid ones as an ordered queue.
    let response = rawResponse;
    let pendingActions: any[] = [];
    const allActionBlocks = extractOrionActionBlocks(rawResponse);
    if (allActionBlocks.length > 0) {
      response = removeOrionActionBlocks(rawResponse);
      for (const json of allActionBlocks) {
        try {
          pendingActions.push(JSON.parse(json));
        } catch {
          // skip malformed blocks
        }
      }
    }
    const pendingAction = pendingActions[0] || null; // backwards compat

    // Safety net: the model often generates "update_product" or similar for image uploads
    // even when explicitly told not to. If the user attached images and the action type
    // is not upload_image, coerce it here so the right backend handler runs.
    const imageFiles = (uploaded_files || []).filter((f: any) => f.type?.startsWith('image/'));
    let imageActionCoerced = false;
    if (imageFiles.length > 0 && pendingAction) {
      const isWrongImageAction = pendingAction.type !== 'upload_image' &&
        (pendingAction.image_url !== undefined ||
         pendingAction.type?.toLowerCase().includes('image') ||
         pendingAction.type === 'update_product');
      if (isWrongImageAction) {
        const productLabel = pendingAction.product_name || pendingAction.title || '';
        pendingAction = {
          type: 'upload_image',
          product_name: productLabel,
          sku: pendingAction.sku || '',
          image_from_upload: true,
        };
        imageActionCoerced = true;
        response = `On it! I'll add that image to "${productLabel || 'the product'}" — just confirm below and I'll take care of it.`;
      }
    }

    // If images were uploaded but Orion produced no action at all, synthesize one
    if (imageFiles.length > 0 && !pendingAction) {
      pendingAction = {
        type: 'upload_image',
        product_name: '',
        sku: '',
        image_from_upload: true,
      };
      if (!imageActionCoerced) {
        response = `I have your image ready to upload — just let me know which product to add it to, then confirm below.`;
      }
    }

    // Final pass: if there are image files and an upload_image action is queued,
    // but the response text still contains apologetic / capability-disclaimer language,
    // replace it entirely. This catches the case where the model generated the correct
    // action type but still wrote the wrong text.
    if (
      imageFiles.length > 0 &&
      pendingAction?.type === 'upload_image' &&
      !imageActionCoerced &&
      /cannot|can't|do not have the capability|unable to|apologize/i.test(response)
    ) {
      const productLabel = pendingAction.product_name || '';
      response = `On it! I'll add that image to "${productLabel || 'the product'}" — just confirm below and I'll take care of it.`;
    }

    if (conversationId) {
      saveMessage(supabaseClient, user.id, conversationId, 'assistant', response).catch(
        (e) => console.warn('[Orion] Could not save assistant message:', e.message)
      );
      extractAndSaveMemory(supabaseClient, user.id, conversationId, message, response).catch(
        (e) => console.error('[Orion] Memory extraction failed:', e)
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        response,
        pending_action: pendingAction,       // backwards compat (first action)
        pending_actions: pendingActions,     // full queue
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
    const { data } = await supabaseClient
      .from('orion_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();
    if (data) return conversationId;
  }

  const { data, error } = await supabaseClient
    .from('orion_conversations')
    .insert({ user_id: userId, title: 'New conversation' })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return data.id;
}

async function loadConversationHistory(supabaseClient: any, userId: string, conversationId: string) {
  const { data: currentMessages } = await supabaseClient
    .from('orion_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(40);

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
  const { error: msgError } = await supabaseClient
    .from('orion_messages')
    .insert({ user_id: userId, conversation_id: conversationId, role, content });

  if (msgError) throw new Error(`Failed to save message: ${msgError.message}`);

  const { error: tsError } = await supabaseClient
    .from('orion_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
  // Log but don't throw — message is already saved; a stale updated_at just
  // affects sort order in loadRecentHistory, not data correctness.
  if (tsError) console.warn('[Orion] Failed to bump conversation updated_at:', tsError.message);
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

**NEVER extract or save anything about:**
- Platform connection status (e.g. "eBay is synced", "eBay not connected", "Shopify connected")
- Integration status, sync status, or API availability
- Whether any platform's data is complete or incomplete
These are live states that change — saving them creates stale, misleading memory.

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
    return;
  }

  for (const insight of insights) {
    if (!insight.category || !insight.key || !insight.value) continue;
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

/** Find a Shopify product by SKU or title, with fuzzy title fallback. */
function findProduct(allProducts: any[], sku: string, productName: string): any | null {
  // 1. Exact SKU match (most reliable)
  if (sku) {
    for (const p of allProducts) {
      const match = (p.variants || []).find((v: any) => v.sku === sku);
      if (match) return p;
    }
  }
  if (!productName) return null;
  const needle = productName.toLowerCase().trim();

  // 2. Exact title match
  for (const p of allProducts) {
    if (p.title.toLowerCase().trim() === needle) return p;
  }
  // 3. Shopify title contains the search name
  for (const p of allProducts) {
    if (p.title.toLowerCase().includes(needle)) return p;
  }
  // 4. Search name contains the Shopify title (model may have added extra words)
  for (const p of allProducts) {
    if (needle.includes(p.title.toLowerCase().trim())) return p;
  }
  // 5. Significant word overlap (≥2 words matching, ignoring short words)
  const needleWords = needle.split(/\s+/).filter(w => w.length > 3);
  if (needleWords.length > 0) {
    let bestMatch: any = null;
    let bestScore = 0;
    for (const p of allProducts) {
      const titleWords = p.title.toLowerCase().split(/\s+/);
      const score = needleWords.filter(w => titleWords.some(tw => tw.includes(w) || w.includes(tw))).length;
      if (score >= 2 && score > bestScore) { bestScore = score; bestMatch = p; }
    }
    if (bestMatch) return bestMatch;
  }
  return null;
}

// ─── eBay Client Helper ───────────────────────────────────────────────────────
// Fetches the connected eBay platform, refreshes the token if needed, and
// returns ready-to-use headers + apiBase. Used by all eBay write actions.
async function getEbayClientForActions(supabaseClient: any, userId: string) {
  const { data: ebayPlatforms } = await supabaseClient
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('platform_type', 'ebay')
    .or('is_active.eq.true,status.eq.connected')
    .limit(1);

  if (!ebayPlatforms || ebayPlatforms.length === 0) {
    throw new Error('No connected eBay account found. Connect one in the Platforms tab first.');
  }

  const platform = ebayPlatforms[0];
  const credentials = platform.credentials;
  const metadata = platform.metadata || {};
  const isSandbox = metadata.environment === 'sandbox';
  const apiBase = isSandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
  const marketplaceId = credentials.marketplace_id || 'EBAY_US';
  let accessToken = credentials.access_token;

  // Refresh token if expired or close to expiry
  const tokenExpiresAt = metadata.token_expires_at ? new Date(metadata.token_expires_at).getTime() : 0;
  const needsRefresh = !metadata.token_expires_at || Date.now() > tokenExpiresAt - 5 * 60 * 1000;
  if (needsRefresh && credentials.refresh_token) {
    try {
      const ebayClientId = Deno.env.get('EBAY_CLIENT_ID');
      const ebayClientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
      if (ebayClientId && ebayClientSecret) {
        const tokenUrl = isSandbox
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
          const { error: tokenSaveErr } = await supabaseClient
            .from('platforms')
            .update({
              credentials: {
                ...credentials,
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token || credentials.refresh_token,
              },
              metadata: {
                ...metadata,
                token_expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
              },
            })
            .eq('id', platform.id);
          if (tokenSaveErr) console.warn('[Orion] eBay token save error in action handler:', tokenSaveErr.message);
        }
      }
    } catch (e: any) {
      console.warn('[Orion] eBay token refresh error in action handler:', e.message);
    }
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-EBAY-C-MARKETPLACE-ID': marketplaceId,
  };

  return { platform, apiBase, marketplaceId, headers };
}

async function executeStoreAction(supabaseClient: any, userId: string, action: any) {
  const { data: platforms } = await supabaseClient
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('platform_type', 'shopify')
    .or('is_active.eq.true,status.eq.connected')
    .limit(1);

  if (!platforms || platforms.length === 0) {
    throw new Error('No connected Shopify store found. Connect one in the Platforms tab first.');
  }

  const platform = platforms[0];
  const shopDomain = platform.shop_domain || platform.domain || platform.store_domain;
  if (!shopDomain) throw new Error('Could not determine Shopify store domain.');

  let accessToken = platform.access_token;
  try {
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
    case 'get_inventory': {
      // Returns live Shopify + eBay products normalized for the Inventory page
      const LOW_STOCK_THRESHOLD = 10;
      const inventory: any[] = [];

      // Fetch Shopify products
      const res = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      if (!res.ok) throw new Error(`Shopify products fetch failed: ${await res.text()}`);
      const { products: shopifyProducts } = await res.json();
      for (const p of (shopifyProducts || [])) {
        const variants = p.variants || [];
        const totalStock = variants.reduce((sum: number, v: any) => sum + (v.inventory_quantity || 0), 0);
        const skus = variants.map((v: any) => v.sku).filter(Boolean).join(', ');
        const prices = variants.map((v: any) => parseFloat(v.price) || 0).filter((n: number) => n > 0);
        const basePrice = prices.length > 0 ? Math.min(...prices) : 0;
        let status = 'active';
        if (p.status === 'archived') status = 'discontinued';
        else if (totalStock === 0) status = 'out_of_stock';
        else if (totalStock <= LOW_STOCK_THRESHOLD) status = 'low_stock';
        inventory.push({
          id: String(p.id),
          product_name: p.title,
          sku: skus || 'N/A',
          category: p.product_type || '',
          status,
          total_stock: totalStock,
          base_price: basePrice,
          image_url: p.images?.[0]?.src || null,
          vendor: p.vendor || '',
          tags: p.tags || '',
          platform_listings: [{ listing_id: String(p.id), platform: 'Shopify' }],
          shopify_id: p.id,
          source: 'shopify',
        });
      }

      // Fetch eBay products for any connected eBay platforms
      try {
        const { data: ebayPlatforms } = await supabaseClient
          .from('platforms')
          .select('*')
          .eq('user_id', userId)
          .eq('platform_type', 'ebay')
          .or('is_active.eq.true,status.eq.connected');

        for (const ebayPlatform of (ebayPlatforms || [])) {
          const creds = ebayPlatform.credentials;
          const meta = ebayPlatform.metadata || {};
          if (!creds?.access_token) continue;

          const ebayApiBase = meta.environment === 'sandbox'
            ? 'https://api.sandbox.ebay.com'
            : 'https://api.ebay.com';
          const marketplaceId = creds.marketplace_id || 'EBAY_US';
          const ebayHeaders: Record<string, string> = {
            'Authorization': `Bearer ${creds.access_token}`,
            'Content-Type': 'application/json',
            'X-EBAY-C-MARKETPLACE-ID': marketplaceId,
          };

          // Fetch offer prices keyed by SKU
          const offerPrices: Record<string, number> = {};
          const offersRes = await fetch(`${ebayApiBase}/sell/inventory/v1/offer?limit=200`, { headers: ebayHeaders });
          if (offersRes.ok) {
            const offersData = await offersRes.json();
            for (const offer of offersData.offers || []) {
              if (offer.sku && offer.pricingSummary?.price?.value) {
                offerPrices[offer.sku] = parseFloat(offer.pricingSummary.price.value);
              }
            }
          }

          const ebayInvRes = await fetch(`${ebayApiBase}/sell/inventory/v1/inventory_item?limit=200`, { headers: ebayHeaders });
          if (ebayInvRes.ok) {
            const ebayInvData = await ebayInvRes.json();
            for (const item of ebayInvData.inventoryItems || []) {
              const totalStock = item.availability?.shipToLocationAvailability?.quantity ?? 0;
              const basePrice = offerPrices[item.sku] ?? 0;
              let status = 'active';
              if (totalStock === 0) status = 'out_of_stock';
              else if (totalStock <= LOW_STOCK_THRESHOLD) status = 'low_stock';
              inventory.push({
                id: `ebay-${item.sku}`,
                product_name: item.product?.title || item.sku || 'eBay Item',
                sku: item.sku || 'N/A',
                category: '',
                status,
                total_stock: totalStock,
                base_price: basePrice,
                image_url: item.product?.imageUrls?.[0] || null,
                vendor: item.product?.brand || '',
                tags: '',
                platform_listings: [{ listing_id: item.sku, platform: 'eBay' }],
                source: 'ebay',
              });
            }
          }
        }
      } catch (e: any) {
        console.warn('[smart-api] eBay inventory fetch failed:', e.message);
      }

      return { inventory };
    }

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
      if (!res.ok) throw new Error(`Shopify rejected the product: ${await res.text()}`);
      const data = await res.json();
      return { message: `Created "${data.product.title}" in your Shopify store (ID: ${data.product.id})` };
    }

    case 'update_inventory': {
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const searchData = await searchRes.json();
      const allProducts = searchData.products || [];

      const invProduct = findProduct(allProducts, action.sku, action.product_name);
      if (!invProduct) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);
      const targetVariant = action.sku
        ? (invProduct.variants || []).find((v: any) => v.sku === action.sku) || invProduct.variants?.[0]
        : invProduct.variants?.[0];
      if (!targetVariant) throw new Error(`Product "${invProduct.title}" has no variants.`);

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
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const searchData = await searchRes.json();
      const allProducts = searchData.products || [];

      const priceProduct = findProduct(allProducts, action.sku, action.product_name);
      if (!priceProduct) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);
      const targetVariant = action.sku
        ? (priceProduct.variants || []).find((v: any) => v.sku === action.sku) || priceProduct.variants?.[0]
        : priceProduct.variants?.[0];
      if (!targetVariant) throw new Error(`Product "${priceProduct.title}" has no variants.`);

      const updateRes = await fetch(`${shopifyBase}/variants/${targetVariant.id}.json`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ variant: { id: targetVariant.id, price: String(action.price) } }),
      });
      if (!updateRes.ok) throw new Error(`Shopify price update failed: ${await updateRes.text()}`);
      return { message: `Updated price for "${action.sku || action.product_name}" to $${action.price}` };
    }

    case 'update_title': {
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const searchData = await searchRes.json();
      const allProducts = searchData.products || [];

      const targetProduct = findProduct(allProducts, action.sku, action.product_name);
      if (!targetProduct) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);

      const updateRes = await fetch(`${shopifyBase}/products/${targetProduct.id}.json`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ product: { id: targetProduct.id, title: action.new_title } }),
      });
      if (!updateRes.ok) throw new Error(`Shopify title update failed: ${await updateRes.text()}`);
      const updatedData = await updateRes.json();
      return { message: `Updated title from "${targetProduct.title}" to "${updatedData.product.title}"` };
    }

    case 'update_tags':
    case 'add_tags': {
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const searchData = await searchRes.json();
      const allProducts = searchData.products || [];

      const targetProduct = findProduct(allProducts, action.sku, action.product_name);
      if (!targetProduct) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);

      // Accept tags as an array or a comma-separated string
      const newTags = Array.isArray(action.tags)
        ? action.tags.join(', ')
        : String(action.tags || '');

      const updateRes = await fetch(`${shopifyBase}/products/${targetProduct.id}.json`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ product: { id: targetProduct.id, tags: newTags } }),
      });
      if (!updateRes.ok) throw new Error(`Shopify tags update failed: ${await updateRes.text()}`);
      return { message: `Updated tags on "${targetProduct.title}" to: ${newTags}` };
    }
    case 'add_image':
    case 'set_image':
    case 'upload_image': {
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const searchData = await searchRes.json();
      const allProducts = searchData.products || [];

      const targetProduct = findProduct(allProducts, action.sku, action.product_name);
      if (!targetProduct) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify. Make sure the product exists and try again.`);
      if (!action.image_data) throw new Error('No image data provided. Please re-upload the image and try again.');

      const uploadRes = await fetch(`${shopifyBase}/products/${targetProduct.id}/images.json`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image: {
            attachment: action.image_data,
            filename: action.image_filename || 'product-image.jpg',
          },
        }),
      });
      if (!uploadRes.ok) throw new Error(`Shopify image upload failed: ${await uploadRes.text()}`);
      return { message: `Added image to "${targetProduct.title}" successfully` };
    }

    case 'update_metafield': {
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const searchData = await searchRes.json();
      const allProducts = searchData.products || [];

      const targetProduct = findProduct(allProducts, action.sku, action.product_name);
      if (!targetProduct) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);

      const namespace = action.metafield_namespace || 'custom';
      const key = action.metafield_key;
      const value = action.metafield_value;
      const type = action.metafield_type || 'single_line_text_field';
      if (!key || value === undefined) throw new Error('metafield_key and metafield_value are required.');

      // Check if the metafield already exists so we can update rather than duplicate
      const listRes = await fetch(
        `${shopifyBase}/products/${targetProduct.id}/metafields.json?namespace=${namespace}&key=${key}`,
        { headers }
      );
      const listData = await listRes.json();
      const existing = listData.metafields?.[0];

      if (existing) {
        const updateRes = await fetch(`${shopifyBase}/metafields/${existing.id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ metafield: { id: existing.id, value, type } }),
        });
        if (!updateRes.ok) throw new Error(`Shopify metafield update failed: ${await updateRes.text()}`);
      } else {
        const createRes = await fetch(`${shopifyBase}/products/${targetProduct.id}/metafields.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ metafield: { namespace, key, value, type } }),
        });
        if (!createRes.ok) throw new Error(`Shopify metafield create failed: ${await createRes.text()}`);
      }
      return { message: `Set "${namespace}.${key}" metafield on "${targetProduct.title}" to "${value}"` };
    }

    case 'update_image_alt_text':
    case 'update_image_alt': {
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const searchData = await searchRes.json();
      const allProducts = searchData.products || [];

      const targetProduct = findProduct(allProducts, action.sku, action.product_name);
      if (!targetProduct) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);
      if (!action.alt_text) throw new Error('alt_text is required for update_image_alt.');

      const imagesRes = await fetch(`${shopifyBase}/products/${targetProduct.id}/images.json`, { headers });
      const imagesData = await imagesRes.json();
      const firstImage = imagesData.images?.[0];
      if (!firstImage) throw new Error(`Product "${targetProduct.title}" has no images.`);

      const updateRes = await fetch(`${shopifyBase}/products/${targetProduct.id}/images/${firstImage.id}.json`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ image: { id: firstImage.id, alt: action.alt_text } }),
      });
      if (!updateRes.ok) throw new Error(`Shopify image alt update failed: ${await updateRes.text()}`);
      return { message: `Updated image alt text for "${targetProduct.title}" to "${action.alt_text}"` };
    }

    case 'update_description': {
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const searchData = await searchRes.json();
      const allProducts = searchData.products || [];

      const targetProduct = findProduct(allProducts, action.sku, action.product_name);
      if (!targetProduct) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);
      const body_html = action.body_html || action.description;
      if (!body_html) throw new Error('description is required for update_description.');

      const updateRes = await fetch(`${shopifyBase}/products/${targetProduct.id}.json`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ product: { id: targetProduct.id, body_html } }),
      });
      if (!updateRes.ok) throw new Error(`Shopify description update failed: ${await updateRes.text()}`);
      return { message: `Updated product description for "${targetProduct.title}"` };
    }

    case 'update_seo_listing': {
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const searchData = await searchRes.json();
      const allProducts = searchData.products || [];

      const targetProduct = findProduct(allProducts, action.sku, action.product_name);
      if (!targetProduct) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);
      if (!action.seo_title && !action.seo_description) throw new Error('At least one of seo_title or seo_description is required.');

      const metafieldUpsert = async (key: string, value: string) => {
        const listRes = await fetch(
          `${shopifyBase}/products/${targetProduct.id}/metafields.json?namespace=global&key=${key}`,
          { headers }
        );
        const listData = await listRes.json();
        const existing = listData.metafields?.[0];
        if (existing) {
          const r = await fetch(`${shopifyBase}/metafields/${existing.id}.json`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ metafield: { id: existing.id, value, type: 'single_line_text_field' } }),
          });
          if (!r.ok) throw new Error(`SEO metafield update failed: ${await r.text()}`);
        } else {
          const r = await fetch(`${shopifyBase}/products/${targetProduct.id}/metafields.json`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ metafield: { namespace: 'global', key, value, type: 'single_line_text_field' } }),
          });
          if (!r.ok) throw new Error(`SEO metafield create failed: ${await r.text()}`);
        }
      };

      const parts: string[] = [];
      if (action.seo_title) {
        await metafieldUpsert('title_tag', action.seo_title);
        parts.push(`meta title: "${action.seo_title}"`);
      }
      if (action.seo_description) {
        await metafieldUpsert('description_tag', action.seo_description);
        parts.push('meta description updated');
      }
      return { message: `Updated SEO listing for "${targetProduct.title}": ${parts.join(', ')}` };
    }

    case 'update_url_handle': {
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const searchData = await searchRes.json();
      const allProducts = searchData.products || [];

      const targetProduct = findProduct(allProducts, action.sku, action.product_name);
      if (!targetProduct) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);
      if (!action.new_handle) throw new Error('new_handle is required for update_url_handle.');

      const handle = action.new_handle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const updateRes = await fetch(`${shopifyBase}/products/${targetProduct.id}.json`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ product: { id: targetProduct.id, handle } }),
      });
      if (!updateRes.ok) throw new Error(`Shopify handle update failed: ${await updateRes.text()}`);
      return { message: `Updated URL handle for "${targetProduct.title}" to "/products/${handle}"` };
    }

    case 'update_status': {
      const searchRes = await fetch(`${shopifyBase}/products.json?limit=250`, { headers });
      const searchData = await searchRes.json();
      const allProducts = searchData.products || [];

      const targetProduct = findProduct(allProducts, action.sku, action.product_name);
      if (!targetProduct) throw new Error(`Could not find product "${action.sku || action.product_name}" in Shopify.`);

      const validStatuses = ['active', 'draft', 'archived'];
      const newStatus = (action.status || '').toLowerCase();
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status "${action.status}". Must be one of: active, draft, archived.`);
      }

      const updateRes = await fetch(`${shopifyBase}/products/${targetProduct.id}.json`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ product: { id: targetProduct.id, status: newStatus } }),
      });
      if (!updateRes.ok) throw new Error(`Shopify status update failed: ${await updateRes.text()}`);
      const labels: Record<string, string> = { active: 'Active (live)', draft: 'Draft (hidden)', archived: 'Archived (removed)' };
      return { message: `Set "${targetProduct.title}" status to ${labels[newStatus] || newStatus}` };
    }

    // ── eBay write actions ────────────────────────────────────────────────────

    case 'ebay_update_inventory': {
      const { apiBase, headers: ebayHeaders } = await getEbayClientForActions(supabaseClient, userId);
      const sku = action.sku;
      if (!sku) throw new Error('sku is required for ebay_update_inventory.');
      if (action.quantity == null) throw new Error('quantity is required for ebay_update_inventory.');

      const getRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, { headers: ebayHeaders });
      if (!getRes.ok) throw new Error(`eBay item not found for SKU "${sku}": ${await getRes.text()}`);
      const currentItem = await getRes.json();

      const updatedItem = {
        ...currentItem,
        availability: {
          ...currentItem.availability,
          shipToLocationAvailability: {
            ...(currentItem.availability?.shipToLocationAvailability || {}),
            quantity: Number(action.quantity),
          },
        },
      };

      const putRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
        method: 'PUT',
        headers: ebayHeaders,
        body: JSON.stringify(updatedItem),
      });
      if (!putRes.ok) throw new Error(`eBay inventory update failed: ${await putRes.text()}`);
      return { message: `Updated eBay inventory for "${action.product_name || sku}" to ${action.quantity} units` };
    }

    case 'ebay_update_price': {
      const { apiBase, headers: ebayHeaders } = await getEbayClientForActions(supabaseClient, userId);
      const sku = action.sku;
      if (!sku) throw new Error('sku is required for ebay_update_price.');
      if (action.price == null) throw new Error('price is required for ebay_update_price.');

      const offersRes = await fetch(`${apiBase}/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}`, { headers: ebayHeaders });
      if (!offersRes.ok) throw new Error(`Could not find eBay offer for SKU "${sku}": ${await offersRes.text()}`);
      const offersData = await offersRes.json();
      const offer = offersData.offers?.[0];
      if (!offer) throw new Error(`No eBay offer found for SKU "${sku}". This may be a traditional (non-managed) listing — update the price directly on eBay for now.`);

      // Build PUT body — strip read-only fields
      const { offerId, listing, status: _status, ...offerBody } = offer;
      offerBody.pricingSummary = {
        price: {
          currency: offer.pricingSummary?.price?.currency || 'USD',
          value: String(action.price),
        },
      };

      const putRes = await fetch(`${apiBase}/sell/inventory/v1/offer/${offerId}`, {
        method: 'PUT',
        headers: ebayHeaders,
        body: JSON.stringify(offerBody),
      });
      if (!putRes.ok) throw new Error(`eBay price update failed: ${await putRes.text()}`);
      return { message: `Updated eBay price for "${action.product_name || sku}" to $${action.price}` };
    }

    case 'ebay_update_title': {
      const { apiBase, headers: ebayHeaders } = await getEbayClientForActions(supabaseClient, userId);
      const sku = action.sku;
      if (!sku) throw new Error('sku is required for ebay_update_title.');
      if (!action.new_title) throw new Error('new_title is required for ebay_update_title.');

      const getRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, { headers: ebayHeaders });
      if (!getRes.ok) throw new Error(`eBay item not found for SKU "${sku}": ${await getRes.text()}`);
      const currentItem = await getRes.json();

      const putRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
        method: 'PUT',
        headers: ebayHeaders,
        body: JSON.stringify({ ...currentItem, product: { ...currentItem.product, title: action.new_title } }),
      });
      if (!putRes.ok) throw new Error(`eBay title update failed: ${await putRes.text()}`);
      return { message: `Updated eBay listing title for "${action.product_name || sku}" to "${action.new_title}"` };
    }

    case 'ebay_update_description': {
      const { apiBase, headers: ebayHeaders } = await getEbayClientForActions(supabaseClient, userId);
      const sku = action.sku;
      if (!sku) throw new Error('sku is required for ebay_update_description.');
      if (!action.description) throw new Error('description is required for ebay_update_description.');

      const getRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, { headers: ebayHeaders });
      if (!getRes.ok) throw new Error(`eBay item not found for SKU "${sku}": ${await getRes.text()}`);
      const currentItem = await getRes.json();

      const putRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
        method: 'PUT',
        headers: ebayHeaders,
        body: JSON.stringify({ ...currentItem, product: { ...currentItem.product, description: action.description } }),
      });
      if (!putRes.ok) throw new Error(`eBay description update failed: ${await putRes.text()}`);
      return { message: `Updated eBay description for "${action.product_name || sku}"` };
    }

    case 'ebay_update_image': {
      // eBay uses public image URLs (imageUrls[]), not base64 uploads.
      // Provide image_url (single public URL) or image_urls (array).
      // Set replace_images: true to swap all images; otherwise appends.
      const { apiBase, headers: ebayHeaders } = await getEbayClientForActions(supabaseClient, userId);
      const sku = action.sku;
      if (!sku) throw new Error('sku is required for ebay_update_image.');
      const newUrls: string[] = action.image_urls || (action.image_url ? [action.image_url] : []);
      if (newUrls.length === 0) throw new Error('image_url or image_urls is required for ebay_update_image. Provide a public HTTPS URL.');

      const getRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, { headers: ebayHeaders });
      if (!getRes.ok) throw new Error(`eBay item not found for SKU "${sku}": ${await getRes.text()}`);
      const currentItem = await getRes.json();

      const existingUrls: string[] = currentItem.product?.imageUrls || [];
      const finalUrls = action.replace_images ? newUrls : [...existingUrls, ...newUrls];

      const putRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
        method: 'PUT',
        headers: ebayHeaders,
        body: JSON.stringify({ ...currentItem, product: { ...currentItem.product, imageUrls: finalUrls } }),
      });
      if (!putRes.ok) throw new Error(`eBay image update failed: ${await putRes.text()}`);
      return { message: `Updated images for eBay listing "${action.product_name || sku}" (${finalUrls.length} image${finalUrls.length !== 1 ? 's' : ''})` };
    }

    case 'ebay_end_listing': {
      const { apiBase, headers: ebayHeaders } = await getEbayClientForActions(supabaseClient, userId);
      const sku = action.sku;
      if (!sku) throw new Error('sku is required for ebay_end_listing.');

      const offersRes = await fetch(`${apiBase}/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}`, { headers: ebayHeaders });
      if (!offersRes.ok) throw new Error(`Could not look up eBay offer for SKU "${sku}": ${await offersRes.text()}`);
      const offersData = await offersRes.json();
      const offer = offersData.offers?.[0];
      if (!offer) throw new Error(`No eBay managed-inventory offer found for SKU "${sku}". If this is a traditional listing, end it directly on eBay.`);

      if (offer.status !== 'PUBLISHED') {
        return { message: `eBay listing for "${action.product_name || sku}" is already not live (status: ${offer.status}). No change needed.` };
      }

      const withdrawRes = await fetch(`${apiBase}/sell/inventory/v1/offer/${offer.offerId}/withdraw`, {
        method: 'POST',
        headers: ebayHeaders,
      });
      if (!withdrawRes.ok) throw new Error(`eBay end listing failed: ${await withdrawRes.text()}`);
      return { message: `Ended eBay listing for "${action.product_name || sku}". It has been removed from eBay — inventory is preserved and it can be relisted anytime.` };
    }

    case 'ebay_relist': {
      const { apiBase, headers: ebayHeaders } = await getEbayClientForActions(supabaseClient, userId);
      const sku = action.sku;
      if (!sku) throw new Error('sku is required for ebay_relist.');

      const offersRes = await fetch(`${apiBase}/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}`, { headers: ebayHeaders });
      if (!offersRes.ok) throw new Error(`Could not look up eBay offer for SKU "${sku}": ${await offersRes.text()}`);
      const offersData = await offersRes.json();
      const offer = offersData.offers?.[0];
      if (!offer) throw new Error(`No eBay offer found for SKU "${sku}".`);

      if (offer.status === 'PUBLISHED') {
        return { message: `eBay listing for "${action.product_name || sku}" is already live.` };
      }

      const publishRes = await fetch(`${apiBase}/sell/inventory/v1/offer/${offer.offerId}/publish`, {
        method: 'POST',
        headers: ebayHeaders,
      });
      if (!publishRes.ok) throw new Error(`eBay relist failed: ${await publishRes.text()}`);
      return { message: `Relisted "${action.product_name || sku}" on eBay successfully.` };
    }

    case 'ebay_create_listing': {
      // Creates an eBay managed-inventory listing end-to-end:
      // 1. PUT inventory item (title, description, images, quantity, condition)
      // 2. POST offer (price, category, policies fetched automatically)
      // 3. POST offer/{id}/publish
      const { apiBase, marketplaceId, headers: ebayHeaders } = await getEbayClientForActions(supabaseClient, userId);
      const sku = action.sku;
      if (!sku) throw new Error('sku is required for ebay_create_listing.');
      if (!action.title) throw new Error('title is required for ebay_create_listing.');
      if (action.price == null) throw new Error('price is required for ebay_create_listing.');
      if (action.quantity == null) throw new Error('quantity is required for ebay_create_listing.');

      // Step 1: Create/update inventory item
      const inventoryItemBody: any = {
        availability: {
          shipToLocationAvailability: { quantity: Number(action.quantity) },
        },
        condition: action.condition || 'NEW',
        product: {
          title: action.title,
          description: action.description || '',
          ...(action.image_urls ? { imageUrls: action.image_urls } : action.image_url ? { imageUrls: [action.image_url] } : {}),
          ...(action.brand ? { brand: action.brand } : {}),
          ...(action.aspects ? { aspects: action.aspects } : {}),
        },
      };

      const invPutRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
        method: 'PUT',
        headers: ebayHeaders,
        body: JSON.stringify(inventoryItemBody),
      });
      if (!invPutRes.ok) throw new Error(`eBay inventory item creation failed: ${await invPutRes.text()}`);

      // Step 2: Fetch account policies and merchant location automatically
      const [fulfillRes, paymentRes, returnRes, locationRes] = await Promise.all([
        fetch(`${apiBase}/sell/account/v1/fulfillment_policy?marketplace_id=${marketplaceId}`, { headers: ebayHeaders }),
        fetch(`${apiBase}/sell/account/v1/payment_policy?marketplace_id=${marketplaceId}`, { headers: ebayHeaders }),
        fetch(`${apiBase}/sell/account/v1/return_policy?marketplace_id=${marketplaceId}`, { headers: ebayHeaders }),
        fetch(`${apiBase}/sell/inventory/v1/location`, { headers: ebayHeaders }),
      ]);

      const [fulfillData, paymentData, returnData, locationData] = await Promise.all([
        fulfillRes.ok ? fulfillRes.json() : null,
        paymentRes.ok ? paymentRes.json() : null,
        returnRes.ok ? returnRes.json() : null,
        locationRes.ok ? locationRes.json() : null,
      ]);

      const fulfillmentPolicyId = action.fulfillment_policy_id || fulfillData?.fulfillmentPolicies?.[0]?.fulfillmentPolicyId;
      const paymentPolicyId = action.payment_policy_id || paymentData?.paymentPolicies?.[0]?.paymentPolicyId;
      const returnPolicyId = action.return_policy_id || returnData?.returnPolicies?.[0]?.returnPolicyId;
      const merchantLocationKey = action.merchant_location_key || locationData?.locations?.[0]?.merchantLocationKey;

      if (!fulfillmentPolicyId || !paymentPolicyId || !returnPolicyId || !merchantLocationKey) {
        const missing = [
          !fulfillmentPolicyId && 'fulfillment policy',
          !paymentPolicyId && 'payment policy',
          !returnPolicyId && 'return policy',
          !merchantLocationKey && 'merchant location',
        ].filter(Boolean).join(', ');
        throw new Error(`Could not auto-fetch eBay account settings (missing: ${missing}). Make sure your eBay account has at least one fulfillment policy, payment policy, return policy, and shipping location configured.`);
      }

      // Step 3: Create offer
      const offerBody: any = {
        sku,
        marketplaceId,
        format: 'FIXED_PRICE',
        availableQuantity: Number(action.quantity),
        pricingSummary: {
          price: { currency: 'USD', value: String(action.price) },
        },
        listingPolicies: {
          fulfillmentPolicyId,
          paymentPolicyId,
          returnPolicyId,
        },
        merchantLocationKey,
        ...(action.category_id ? { categoryId: String(action.category_id) } : {}),
      };

      const offerRes = await fetch(`${apiBase}/sell/inventory/v1/offer`, {
        method: 'POST',
        headers: ebayHeaders,
        body: JSON.stringify(offerBody),
      });
      if (!offerRes.ok) throw new Error(`eBay offer creation failed: ${await offerRes.text()}`);
      const offerData = await offerRes.json();
      const offerId = offerData.offerId;

      // Step 4: Publish offer
      const publishRes = await fetch(`${apiBase}/sell/inventory/v1/offer/${offerId}/publish`, {
        method: 'POST',
        headers: ebayHeaders,
      });
      if (!publishRes.ok) throw new Error(`eBay publish failed: ${await publishRes.text()}`);
      const publishData = await publishRes.json();

      return { message: `Created and published eBay listing for "${action.title}" (SKU: ${sku}, Listing ID: ${publishData.listingId || offerId}) at $${action.price}` };
    }

    case 'woo_create_product': {
      const { data: wooPlats } = await supabaseClient
        .from('platforms')
        .select('*')
        .eq('user_id', userId)
        .eq('platform_type', 'woocommerce')
        .or('is_active.eq.true,status.eq.connected')
        .limit(1);

      if (!wooPlats || wooPlats.length === 0) {
        throw new Error('No connected WooCommerce store found. Connect one in the Platforms tab first.');
      }

      const woo = wooPlats[0];
      const { consumer_key, consumer_secret } = woo.credentials;
      const wooBase = `${woo.store_url}/wp-json/wc/v3`;
      const wooHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${consumer_key}:${consumer_secret}`)}`,
      };

      const images = (action.images || []).filter(Boolean).map((src: string) => ({ src }));
      const tags = (action.tags || []).filter(Boolean).map((name: string) => ({ name }));

      const productBody: any = {
        name: action.name || action.title,
        type: action.product_type || 'simple',
        regular_price: String(action.price ?? '0.00'),
        description: action.description || '',
        short_description: action.short_description || '',
        sku: action.sku || '',
        manage_stock: true,
        stock_quantity: action.quantity ?? 0,
        status: 'publish',
        images,
        tags,
      };

      const res = await fetch(`${wooBase}/products`, {
        method: 'POST',
        headers: wooHeaders,
        body: JSON.stringify(productBody),
      });
      if (!res.ok) throw new Error(`WooCommerce rejected the product: ${await res.text()}`);
      const data = await res.json();
      return { message: `Created "${data.name}" in your WooCommerce store (ID: ${data.id})` };
    }

    case 'woo_bulk_create_products': {
      const { data: wooPlats } = await supabaseClient
        .from('platforms')
        .select('*')
        .eq('user_id', userId)
        .eq('platform_type', 'woocommerce')
        .or('is_active.eq.true,status.eq.connected')
        .limit(1);

      if (!wooPlats || wooPlats.length === 0) {
        throw new Error('No connected WooCommerce store found. Connect one in the Platforms tab first.');
      }

      const woo = wooPlats[0];
      const { consumer_key, consumer_secret } = woo.credentials;
      const wooBase = `${woo.store_url}/wp-json/wc/v3`;
      const wooHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${consumer_key}:${consumer_secret}`)}`,
      };

      const products: any[] = action.products || [];
      if (products.length === 0) throw new Error('No products provided for bulk create.');

      let successCount = 0;
      let failCount = 0;
      const failedProducts: string[] = [];

      for (const p of products) {
        try {
          const images = (p.images || []).filter(Boolean).map((src: string) => ({ src }));
          const tags = (p.tags || []).filter(Boolean).map((name: string) => ({ name }));

          const productBody: any = {
            name: p.name || p.title,
            type: p.product_type || 'simple',
            regular_price: String(p.price ?? '0.00'),
            description: p.description || '',
            short_description: p.short_description || '',
            sku: p.sku || '',
            manage_stock: true,
            stock_quantity: p.quantity ?? 0,
            status: 'publish',
            images,
            tags,
          };

          const res = await fetch(`${wooBase}/products`, {
            method: 'POST',
            headers: wooHeaders,
            body: JSON.stringify(productBody),
          });

          if (res.ok) {
            successCount++;
          } else {
            failCount++;
            failedProducts.push(p.name || p.title || 'Unknown');
          }
        } catch {
          failCount++;
          failedProducts.push(p.name || p.title || 'Unknown');
        }
      }

      const summary = `Created ${successCount} of ${products.length} products in WooCommerce.${failCount > 0 ? ` ${failCount} failed: ${failedProducts.slice(0, 3).join(', ')}${failedProducts.length > 3 ? '...' : ''}` : ''}`;
      return { message: summary, success_count: successCount, fail_count: failCount };
    }

    // ── multi_action: multiple changes on ONE product in one confirmation ──────
    case 'multi_action': {
      const subActions: any[] = action.actions || [];
      if (subActions.length === 0) throw new Error('multi_action requires at least one action in the actions array.');

      const results: string[] = [];
      const errors: string[] = [];

      for (const subAction of subActions) {
        // Inherit product identity from the parent action if the sub-action omits it
        const resolved = {
          product_name: action.product_name,
          sku: action.sku,
          ...subAction,
        };
        try {
          const r = await executeStoreAction(supabaseClient, userId, resolved);
          results.push(r.message || 'Done');
        } catch (e: any) {
          errors.push(`${subAction.type}: ${e.message}`);
        }
      }

      const successCount = results.length;
      const failCount = errors.length;
      const lines = [
        `${successCount}/${subActions.length} changes applied to "${action.product_name || action.sku}".`,
        ...results.map((r) => `✅ ${r}`),
        ...errors.map((e) => `❌ ${e}`),
      ];
      return { message: lines.join('\n'), success_count: successCount, fail_count: failCount, results, errors };
    }

    // ── batch_update: same field across MULTIPLE products in one confirmation ──
    case 'batch_update': {
      const updates: any[] = action.updates || [];
      const field: string = action.field; // "title" | "price" | "inventory" | "image_alt" | "metafield"
      if (updates.length === 0) throw new Error('batch_update requires at least one entry in the updates array.');
      if (!field) throw new Error('batch_update requires a "field" property (e.g. "title", "price", "inventory", "image_alt", "metafield").');

      const results: string[] = [];
      const errors: string[] = [];

      for (const upd of updates) {
        let subAction: any;
        switch (field) {
          case 'title':
            subAction = { type: 'update_title', product_name: upd.product_name, sku: upd.sku, new_title: upd.new_value };
            break;
          case 'price':
            subAction = { type: 'update_price', product_name: upd.product_name, sku: upd.sku, price: upd.new_value };
            break;
          case 'inventory':
            subAction = { type: 'update_inventory', product_name: upd.product_name, sku: upd.sku, quantity: upd.new_value };
            break;
          case 'image_alt':
            subAction = { type: 'update_image_alt', product_name: upd.product_name, sku: upd.sku, alt_text: upd.new_value };
            break;
          case 'metafield':
            subAction = {
              type: 'update_metafield',
              product_name: upd.product_name,
              sku: upd.sku,
              metafield_key: upd.metafield_key || action.metafield_key,
              metafield_value: upd.new_value,
              metafield_namespace: upd.metafield_namespace || action.metafield_namespace || 'custom',
              metafield_type: upd.metafield_type || action.metafield_type || 'single_line_text_field',
            };
            break;
          case 'description':
            subAction = { type: 'update_description', product_name: upd.product_name, sku: upd.sku, description: upd.new_value };
            break;
          case 'url_handle':
            subAction = { type: 'update_url_handle', product_name: upd.product_name, sku: upd.sku, new_handle: upd.new_value };
            break;
          case 'seo_listing':
            subAction = { type: 'update_seo_listing', product_name: upd.product_name, sku: upd.sku, seo_title: upd.seo_title, seo_description: upd.seo_description };
            break;
          default:
            errors.push(`Unknown batch field: ${field}`);
            continue;
        }
        try {
          const r = await executeStoreAction(supabaseClient, userId, subAction);
          results.push(r.message || 'Done');
        } catch (e: any) {
          errors.push(`${upd.product_name || upd.sku}: ${e.message}`);
        }
      }

      const summary = [
        `Batch update complete: ${results.length}/${updates.length} succeeded.`,
        ...results.map((r) => `✅ ${r}`),
        ...errors.map((e) => `❌ ${e}`),
      ].join('\n');
      return { message: summary, success_count: results.length, fail_count: errors.length, results, errors };
    }

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

// ─── Store Context ────────────────────────────────────────────────────────────

// Simple XML value extractor (no library needed for our flat structure)
function xmlVal(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
  return m ? m[1].trim() : '';
}
function xmlBlocks(xml: string, tag: string): string[] {
  const blocks: string[] = [];
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, 'g');
  let m;
  while ((m = re.exec(xml)) !== null) blocks.push(m[0]);
  return blocks;
}

async function fetchEbayDataForOrion(supabaseClient: any, platform: any): Promise<{ products: any[], orders: any[], fetchError?: string }> {
  const credentials = platform.credentials;
  const metadata = platform.metadata || {};
  const isSandbox = metadata.environment === 'sandbox';
  const apiBase = isSandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
  const marketplaceId = credentials.marketplace_id || 'EBAY_US';
  let accessToken = credentials.access_token;

  // Refresh if: no expiry is recorded (old connection), OR token is expired/close to expiry.
  // Bug previously: `tokenExpiresAt > 0` guard skipped refresh for connections made before
  // token_expires_at was stored, leaving those tokens permanently stale.
  const tokenExpiresAt = metadata.token_expires_at ? new Date(metadata.token_expires_at).getTime() : 0;
  const needsRefresh = !metadata.token_expires_at || Date.now() > tokenExpiresAt - 5 * 60 * 1000;
  if (needsRefresh && credentials.refresh_token) {
    try {
      const ebayClientId = Deno.env.get('EBAY_CLIENT_ID');
      const ebayClientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
      if (ebayClientId && ebayClientSecret) {
        const tokenUrl = isSandbox
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
          const { error: tokenSaveErr } = await supabaseClient
            .from('platforms')
            .update({
              credentials: {
                ...credentials,
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token || credentials.refresh_token,
              },
              metadata: {
                ...metadata,
                token_expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
              },
            })
            .eq('id', platform.id);
          // Log but don't abort — we have a fresh token in memory even if DB
          // persistence failed. Next request will attempt refresh again.
          if (tokenSaveErr) console.warn('[Orion] eBay refreshed token may not have persisted to DB:', tokenSaveErr.message);
          console.log('[Orion] eBay token refreshed successfully');
        } else {
          const errText = await refreshRes.text();
          console.warn('[Orion] eBay token refresh failed:', refreshRes.status, errText);
        }
      }
    } catch (e: any) {
      console.warn('[Orion] eBay token refresh error:', e.message);
    }
  }

  const restHeaders: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-EBAY-C-MARKETPLACE-ID': marketplaceId,
  };

  const products: any[] = [];
  const orders: any[] = [];

  // ── 1. Sell Inventory API (managed-inventory / API-created listings) ──
  // Provides accurate stock quantities but prices often come back null when
  // the Offers API SKU lookup doesn't match. We fill prices from Trading API below.
  const sellInvItems = new Map<string, any>();
  const invRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item?limit=100`, { headers: restHeaders });
  console.log('[Orion] eBay Sell Inventory API status:', invRes.status);
  if (invRes.ok) {
    const invData = await invRes.json();
    const offerPrices: Record<string, number> = {};
    const offersRes = await fetch(`${apiBase}/sell/inventory/v1/offer?limit=200`, { headers: restHeaders });
    if (offersRes.ok) {
      const offersData = await offersRes.json();
      for (const offer of offersData.offers || []) {
        if (offer.sku && offer.pricingSummary?.price?.value) {
          offerPrices[offer.sku] = parseFloat(offer.pricingSummary.price.value);
        }
      }
    }
    for (const item of invData.inventoryItems || []) {
      sellInvItems.set(item.sku, {
        title: item.product?.title || item.sku || 'eBay Item',
        product_has_real_title: !!item.product?.title,
        sku: item.sku,
        price: offerPrices[item.sku] ?? null,  // may be null — filled from Trading API below
        inventory_quantity: item.availability?.shipToLocationAvailability?.quantity ?? 0,
        status: 'active',
        vendor: item.product?.brand || '',
        product_type: '',
        platform_type: 'ebay',
      });
    }
    console.log(`[Orion] eBay Sell Inventory API: ${sellInvItems.size} items`);
  } else {
    const errText = await invRes.text();
    console.warn('[Orion] eBay Sell Inventory API failed:', invRes.status, errText.slice(0, 200));
  }

  // ── 2. Trading API GetMyeBaySelling (always run — provides CurrentPrice for every listing) ──
  // This covers both traditional/UI-created listings AND managed-inventory ones.
  // We use it to fill in null prices from Sell Inventory and pick up any listings
  // that Sell Inventory missed.
  const tradingItems = new Map<string, any>();
  let tradingError = '';
  try {
    const tradingBody = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ActiveList><Include>true</Include><Pagination><EntriesPerPage>100</EntriesPerPage></Pagination></ActiveList>
  <DetailLevel>ReturnAll</DetailLevel>
</GetMyeBaySellingRequest>`;

    const tradingRes = await fetch(`${apiBase}/ws/api.dll`, {
      method: 'POST',
      headers: {
        'X-EBAY-API-CALL-NAME': 'GetMyeBaySelling',
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-IAF-TOKEN': accessToken,
        'Content-Type': 'text/xml',
      },
      body: tradingBody,
    });

    const xml = await tradingRes.text();
    const ack = xmlVal(xml, 'Ack');
    console.log(`[Orion] eBay Trading API HTTP ${tradingRes.status}, Ack=${ack}`);

    if (ack === 'Failure' || ack === 'PartialFailure') {
      const errMsg = xmlVal(xml, 'LongMessage') || xmlVal(xml, 'ShortMessage');
      const errCode = xmlVal(xml, 'ErrorCode');
      tradingError = `Trading API error ${errCode}: ${errMsg}`;
      console.warn('[Orion]', tradingError);
    } else if (ack === 'Success' || ack === 'Warning') {
      const items = xmlBlocks(xml, 'Item');
      for (const item of items) {
        const title = xmlVal(item, 'Title');
        const sku = xmlVal(item, 'SKU') || xmlVal(item, 'ItemID');
        const price = parseFloat(xmlVal(item, 'CurrentPrice') || '0');
        const qty = parseInt(xmlVal(item, 'QuantityAvailable') || xmlVal(item, 'Quantity') || '0', 10);
        if (title && sku) {
          tradingItems.set(sku, {
            title,
            sku,
            price: price || null,
            inventory_quantity: qty,
            status: 'active',
            vendor: '',
            product_type: '',
            platform_type: 'ebay',
          });
        }
      }
      console.log(`[Orion] eBay Trading API: ${tradingItems.size} active listings`);
    } else {
      tradingError = `Unexpected Ack value: "${ack}"`;
      console.warn('[Orion] eBay Trading API unexpected response, Ack:', ack, xml.slice(0, 300));
    }
  } catch (e: any) {
    tradingError = e.message;
    console.warn('[Orion] eBay Trading API exception:', e.message);
  }

  // ── 3. Merge results ──
  // Sell Inventory items are the source of truth for stock quantities.
  // Fill their null prices from Trading API where the SKU matches.
  if (sellInvItems.size > 0) {
    for (const [sku, item] of sellInvItems) {
      if (tradingItems.has(sku)) {
        const tradingItem = tradingItems.get(sku)!;
        // Fill price from Trading API if Sell Inventory had none
        if (item.price === null) item.price = tradingItem.price;
        // Fill title from Trading API if Sell Inventory only has the SKU as title
        if (!item.product_has_real_title && tradingItem.title && tradingItem.title !== sku) {
          item.title = tradingItem.title;
        }
      }
      products.push(item);
    }
    // Also add any Trading API listings whose SKUs aren't in Sell Inventory
    // (traditional/UI-created listings that aren't in managed inventory).
    for (const [sku, item] of tradingItems) {
      if (!sellInvItems.has(sku)) {
        products.push(item);
      }
    }
  } else if (tradingItems.size > 0) {
    // Sell Inventory returned nothing — use Trading API results entirely.
    products.push(...tradingItems.values());
  }

  // If both APIs returned nothing, surface a diagnostic.
  if (products.length === 0) {
    const bothFailed = tradingError
      ? tradingError
      : 'eBay is connected but 0 active listings were found via both the Sell Inventory API and Trading API. If you believe you have active eBay listings, they may have recently ended or the eBay account may need to be reconnected from the Platforms tab.';
    return { products: [], orders: [], fetchError: bothFailed };
  }

  // ── 3. Orders via Sell Fulfillment API ──
  const ordersRes = await fetch(`${apiBase}/sell/fulfillment/v1/order?limit=25`, { headers: restHeaders });
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

async function getUserStoreContext(supabaseClient: any, userId: string) {
  const { data: platforms } = await supabaseClient
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .or('is_active.eq.true,status.eq.connected');

  // Fetch products live from Shopify so inventory quantities are always current.
  // Falls back to the local products table if no Shopify platform is connected.
  let products: any[] = [];
  let productCount = 0;

  const shopifyPlatform = (platforms || []).find((p: any) => p.platform_type === 'shopify');
  if (shopifyPlatform) {
    try {
      let accessToken = shopifyPlatform.access_token;
      if (accessToken && accessToken.length > 50 && !accessToken.startsWith('shpat_') && !accessToken.startsWith('shpca_')) {
        const { decrypt } = await import('../_shared/encryption.ts');
        accessToken = await decrypt(accessToken);
      }
      const shopDomain = shopifyPlatform.shop_domain;
      const shopifyRes = await fetch(
        `https://${shopDomain}/admin/api/2024-01/products.json?limit=250`,
        { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } }
      );
      if (shopifyRes.ok) {
        const shopifyData = await shopifyRes.json();
        products = (shopifyData.products || []).map((p: any) => {
          const variants = p.variants || [];
          const totalQty = variants.reduce((sum: number, v: any) => sum + (v.inventory_quantity || 0), 0);
          const skus = variants.map((v: any) => v.sku).filter(Boolean).join(', ');
          const prices = variants.map((v: any) => parseFloat(v.price) || 0).filter((n: number) => n > 0);
          return {
            id: p.id,
            title: p.title,
            sku: skus || 'N/A',
            price: prices.length > 0 ? Math.min(...prices) : 0,
            inventory_quantity: totalQty,
            vendor: p.vendor || '',
            product_type: p.product_type || '',
            status: p.status || '',
            tags: p.tags || '',
            handle: p.handle || '',
            body_html: p.body_html ? p.body_html.replace(/<[^>]*>/g, '').slice(0, 150) : '',
            platform_type: 'shopify',
          };
        });
        productCount = products.length;
      }
    } catch (e: any) {
      console.warn('[Orion] Shopify live product fetch failed, falling back to local DB:', e.message);
    }
  }

  // Fall back to local products table (WooCommerce, manual imports, etc.)
  if (products.length === 0) {
    const { data: localProducts, count } = await supabaseClient
      .from('products')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    products = localProducts || [];
    productCount = count || 0;
  }

  // Fetch live eBay data for any connected eBay platforms
  const ebayFetchErrors: string[] = [];
  for (const platform of (platforms || [])) {
    if (platform.platform_type === 'ebay') {
      if (!platform.credentials?.access_token) {
        ebayFetchErrors.push('No access token found — try reconnecting eBay in the Platforms tab');
        continue;
      }
      try {
        const ebayData = await fetchEbayDataForOrion(supabaseClient, platform);
        products = [...products, ...ebayData.products];
        productCount += ebayData.products.length;
        (platform as any)._ebayOrders = ebayData.orders;
        if (ebayData.fetchError) ebayFetchErrors.push(ebayData.fetchError);
      } catch (e: any) {
        console.warn('[Orion] eBay data fetch failed:', e.message);
        ebayFetchErrors.push(e.message);
      }
    }
  }

  const { data: dbOrders, count: orderCount } = await supabaseClient
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(25);

  // Merge eBay orders with DB orders
  const ebayOrders = (platforms || []).flatMap((p: any) => p._ebayOrders || []);
  const orders = [...(dbOrders || []), ...ebayOrders];
  const totalOrders = (orderCount || 0) + ebayOrders.length;

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total_price) || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  const lowStockProducts = products.filter((p: any) => {
    const qty = p.inventory_quantity ?? p.stock_quantity ?? p.quantity ?? null;
    return qty !== null && qty <= 5;
  });

  return {
    platforms: platforms || [],
    products,
    total_products: productCount,
    orders,
    total_orders: totalOrders,
    low_stock_products: lowStockProducts,
    ebay_fetch_errors: ebayFetchErrors,
    metrics: {
      total_revenue: totalRevenue,
      avg_order_value: avgOrderValue,
      active_platforms: (platforms || []).length,
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
      const handle = p.handle ? ` | Handle: ${p.handle}` : '';
      return `  - ${name} | SKU: ${sku} | Price: ${price} | Stock: ${stock}${vendor ? ` | Vendor: ${vendor}` : ''}${type ? ` | Type: ${type}` : ''}${status ? ` | Status: ${status}` : ''}${handle}`;
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

  const ebayConnected = storeContext.platforms.some((p: any) => p.platform_type === 'ebay');
  const ebayProducts = storeContext.products.filter((p: any) => p.platform_type === 'ebay');
  const ebayMissingPrices = ebayProducts.filter((p: any) => p.price == null).length;
  const ebayErrorSection = storeContext.ebay_fetch_errors?.length > 0
    ? `\n**⚠️ eBay Status (connected, but could not load listings):**\n${storeContext.ebay_fetch_errors.map((e: string) => `  - ${e}`).join('\n')}\nReport this specific message to the user. If it mentions "invalid token", "expired", or "reconnect", tell them to disconnect and reconnect eBay in the Platforms tab. Do NOT say "eBay hasn't been synced" or make up reasons — use the exact error above.\n`
    : ebayConnected && ebayProducts.length === 0
    ? `\n**ℹ️ eBay Status:** eBay is connected but 0 products were returned this request. This is a data retrieval issue — do NOT tell the user eBay "hasn't been synced" or that the integration is incomplete. Tell them eBay is connected but no active listings were fetched, and suggest reconnecting eBay in the Platforms tab if they believe they have active listings.\n`
    : ebayConnected && ebayProducts.length > 0
    ? `\n**✅ eBay Integration: FULLY WORKING. ${ebayProducts.length} eBay listing(s) loaded with titles, SKUs, stock quantities, and${ebayMissingPrices === 0 ? ' prices' : ` prices (${ebayMissingPrices} listing(s) show N/A price — normal when eBay offer data is unavailable)`}. The eBay data is shown in the product list below exactly like Shopify data. CRITICAL RULES for eBay responses: (1) Do NOT say the eBay sync is incomplete, pending, or needs any action — it is done. (2) Do NOT ask the user to "loop in the Tandril team" or "finalize the sync" — the integration is fully operational. (3) Do NOT compare eBay data quality to Shopify as a negative — eBay listings naturally don't have product descriptions or URL handles and that is expected. (4) Just answer the question using the eBay data in the product list below the same way you would Shopify data.**\n`
    : '';

  const memorySection = memoryNotes.length > 0
    ? `\n**What I Know About This Business (from past conversations):**\n${formatMemory(memoryNotes)}\n⚠️ IMPORTANT: Memory notes reflect past conversations and may be outdated. Always prefer live data above (connected platforms, product list, orders) over any memory note about platform connection status, eBay sync status, or data availability. If live data shows eBay products are loaded, that is the truth — ignore any memory note suggesting otherwise.\n`
    : '';

  const systemPrompt = `You are Orion, an AI business wingman for e-commerce sellers. You're sharp, direct, and genuinely invested in their success. You remember past conversations and build on what you've learned over time.

**CRITICAL - What you can and cannot do:**
- You CAN: Read and analyze store data (products, orders, inventory, revenue) from the data provided below
- You CAN: Give advice, spot trends, flag issues, answer questions about their business
- You CAN: Execute store actions on Shopify — create products, update inventory quantities, update prices, update product titles/SEO, update product descriptions, update SEO meta title + meta description, update URL handles, update tags, add images to products, update image alt text, set/update product metafields, set product status (active/draft/archived)
- You CAN: Execute store actions on eBay — create listings, update inventory quantities, update prices, update listing titles, update listing descriptions, update listing images, end listings (remove from eBay), relist ended listings
- You CANNOT: Log into any platform or request credentials — NEVER ask for passwords, API keys, or admin access. You already have the integration through Tandril.
- You CANNOT: Process payments, refund orders, delete products, or fulfill orders

**How to execute a store action:**
When the user asks you to create a product, add inventory, change a price, rename a title, or add an image, respond conversationally AND append a single action block on its own line at the very end of your message.

🚫 NEVER say phrases like "I cannot directly upload", "I do not have the capability", "as an AI I cannot", or any variation of "I can't do that" for actions that ARE supported. You CAN do all of the above through the action block system — say so confidently. If asked to upload an image, say something like "On it! I'll queue that up — just confirm below." and generate the action block.

⚠️ ALLOWED action types (use ONLY these exact strings — any other type will fail with "Unknown action type"):
  Shopify single actions:
  • create_product
  • update_status          ← set product status: active | draft | archived
  • update_inventory
  • update_price
  • update_title
  • update_description       ← update the full product description / body HTML
  • update_seo_listing       ← update meta title (≤60 chars) + meta description (≤160 chars) shown in Google
  • update_url_handle        ← update the product's URL slug (e.g. "casual-spring-henley-olive")
  • upload_image
  • update_metafield
  • update_image_alt
  • update_tags
  Shopify grouped actions (use these to avoid making users confirm 10 times):
  • multi_action  ← multiple changes to ONE product, one confirmation
  • batch_update  ← same field change across MULTIPLE products, one confirmation
  eBay single actions:
  • ebay_create_listing    ← create a new eBay listing end-to-end (inventory item + offer + publish)
  • ebay_update_inventory  ← update quantity on an eBay listing
  • ebay_update_price      ← update the price on an eBay listing
  • ebay_update_title      ← update the listing title on eBay
  • ebay_update_description← update the listing description on eBay
  • ebay_update_image      ← update/add images on an eBay listing (requires public image URL)
  • ebay_end_listing       ← remove a listing from eBay (keeps inventory, can relist)
  • ebay_relist            ← re-publish a previously ended eBay listing
  WooCommerce actions:
  • woo_create_product
  • woo_bulk_create_products
❌ FORBIDDEN (will always fail): update_product, update_seo, bulk_update, add_image, set_image, woo_update_product, or any other type not in the list above.

eBay vs Shopify action routing:
- Use ebay_* actions for products whose platform_type is 'ebay' in the product list below
- Use Shopify actions for products with platform_type 'shopify'
- For multi_action and batch_update, sub-actions can be either Shopify or eBay types — route per product

Action formats:

To create a new product:
[ORION_ACTION:{"type":"create_product","title":"Product Title","sku":"SKU-001","price":29.99,"quantity":10,"description":"Optional description","vendor":"","product_type":""}]

To update inventory quantity (use exact SKU from the product list below):
[ORION_ACTION:{"type":"update_inventory","product_name":"Product Title","sku":"SKU-001","quantity":25}]

To update a price (use exact SKU from the product list below):
[ORION_ACTION:{"type":"update_price","product_name":"Product Title","sku":"SKU-001","price":34.99}]

To rename/update a product title (e.g. for SEO or seasonal refresh):
[ORION_ACTION:{"type":"update_title","product_name":"Current Product Title","sku":"SKU-001","new_title":"New Product Title"}]

To add/upload an image to a product (ONLY when the user has attached an image file — use upload_image, NEVER update_product):
[ORION_ACTION:{"type":"upload_image","product_name":"Product Title","sku":"SKU-001","image_from_upload":true}]

To set or update a product metafield (material, care instructions, custom data, etc.):
[ORION_ACTION:{"type":"update_metafield","product_name":"Product Title","sku":"SKU-001","metafield_namespace":"custom","metafield_key":"material","metafield_value":"100% cotton","metafield_type":"single_line_text_field"}]

To update the alt text on a product's first image (for SEO):
[ORION_ACTION:{"type":"update_image_alt","product_name":"Product Title","sku":"SKU-001","alt_text":"Descriptive keyword-rich alt text here"}]

To update a product's tags (replaces existing tags — provide all tags you want, including ones to keep):
[ORION_ACTION:{"type":"update_tags","product_name":"Product Title","sku":"SKU-001","tags":["spring","long-sleeve","cotton","women"]}]

To update the full product description (written in plain text or HTML — include keywords naturally, aim for 150-300+ words):
[ORION_ACTION:{"type":"update_description","product_name":"Product Title","sku":"SKU-001","description":"Your keyword-rich product description here..."}]

To update the SEO listing (meta title ≤60 chars, meta description ≤160 chars — these appear in Google search results):
[ORION_ACTION:{"type":"update_seo_listing","product_name":"Product Title","sku":"SKU-001","seo_title":"Casual Spring Henley Tee | Lightweight Olive Green Shirt","seo_description":"Shop our lightweight olive green Henley tee — perfect for spring layering. 100% cotton, machine washable. Free shipping over $50."}]

To update the product's URL handle/slug (keep it short, keyword-rich, lowercase with hyphens):
[ORION_ACTION:{"type":"update_url_handle","product_name":"Product Title","sku":"SKU-001","new_handle":"casual-spring-henley-olive-green"}]

To set a Shopify product status (active = live, draft = hidden, archived = removed from store):
[ORION_ACTION:{"type":"update_status","product_name":"Product Title","sku":"SKU-001","status":"draft"}]

— eBay Actions —

To create a new eBay listing (creates inventory item + offer + publishes in one step):
[ORION_ACTION:{"type":"ebay_create_listing","title":"Vintage Wool Sweater - Size M","sku":"SWEATER-001","price":29.99,"quantity":1,"description":"Beautiful vintage wool sweater in excellent condition.","condition":"USED_EXCELLENT","category_id":"11484","image_urls":["https://your-image-url.jpg"]}]
Note: condition options: NEW, LIKE_NEW, NEW_OTHER, NEW_WITH_DEFECTS, MANUFACTURER_REFURBISHED, CERTIFIED_REFURBISHED, EXCELLENT_REFURBISHED, VERY_GOOD_REFURBISHED, GOOD_REFURBISHED, SELLER_REFURBISHED, USED_EXCELLENT, USED_VERY_GOOD, USED_GOOD, USED_ACCEPTABLE, FOR_PARTS_OR_NOT_WORKING. category_id is optional but recommended.

To update eBay listing quantity:
[ORION_ACTION:{"type":"ebay_update_inventory","product_name":"Vintage Wool Sweater","sku":"SWEATER-001","quantity":2}]

To update eBay listing price:
[ORION_ACTION:{"type":"ebay_update_price","product_name":"Vintage Wool Sweater","sku":"SWEATER-001","price":24.99}]

To update an eBay listing title:
[ORION_ACTION:{"type":"ebay_update_title","product_name":"Vintage Wool Sweater","sku":"SWEATER-001","new_title":"Vintage Wool Cable Knit Sweater - Women's Size M - Excellent Condition"}]

To update an eBay listing description:
[ORION_ACTION:{"type":"ebay_update_description","product_name":"Vintage Wool Sweater","sku":"SWEATER-001","description":"Beautiful vintage cable knit wool sweater. Size M. No stains or damage. Ships within 1 business day."}]

To update eBay listing images (provide a public HTTPS URL — replace_images: true swaps all, false appends):
[ORION_ACTION:{"type":"ebay_update_image","product_name":"Vintage Wool Sweater","sku":"SWEATER-001","image_url":"https://your-image-url.jpg","replace_images":false}]

To end (remove) an eBay listing — listing is removed from eBay but inventory is preserved and it can be relisted:
[ORION_ACTION:{"type":"ebay_end_listing","product_name":"Vintage Wool Sweater","sku":"SWEATER-001"}]

To relist a previously ended eBay listing:
[ORION_ACTION:{"type":"ebay_relist","product_name":"Vintage Wool Sweater","sku":"SWEATER-001"}]

To create a single product on WooCommerce:
[ORION_ACTION:{"type":"woo_create_product","name":"Product Title","sku":"SKU-001","price":"29.99","quantity":10,"description":"Full description here","images":["https://image-url-1.jpg","https://image-url-2.jpg"],"tags":["tag1","tag2"],"product_type":"simple"}]

To bulk-create multiple products on WooCommerce (e.g. from an Etsy CSV migration — single confirmation for the whole batch):
[ORION_ACTION:{"type":"woo_bulk_create_products","products":[{"name":"Product 1","sku":"SKU-001","price":"19.99","quantity":5,"description":"...","images":["https://..."],"tags":["spring","cotton"]},{"name":"Product 2","sku":"SKU-002","price":"24.99","quantity":10,"description":"...","images":["https://..."],"tags":["summer"]}]}]

To make MULTIPLE changes to ONE product (title + metafield + alt text, etc.) — one confirmation card, all run together:
[ORION_ACTION:{"type":"multi_action","product_name":"Tie Dye T-Shirt","sku":"TDT-001","description":"Update title, SEO alt text, and material metafield","actions":[{"type":"update_title","new_title":"Vibrant Handmade Tie Dye T-Shirt"},{"type":"update_image_alt","alt_text":"Colorful handmade tie dye t-shirt on white background"},{"type":"update_metafield","metafield_key":"material","metafield_value":"100% Cotton","metafield_type":"single_line_text_field"}]}]

To update the SAME field across MULTIPLE products (e.g. rename all titles, restick prices, etc.) — one confirmation card:
[ORION_ACTION:{"type":"batch_update","field":"title","description":"Christmas-themed titles for all shirts","updates":[{"product_name":"Basic White Tee","sku":"BWT-001","new_value":"Cozy Christmas White Tee"},{"product_name":"Blue Denim Shirt","sku":"BDS-002","new_value":"Holiday Blue Denim Shirt"},{"product_name":"Striped Polo","sku":"SP-003","new_value":"Festive Striped Holiday Polo"}]}]
Valid batch_update field values: "title", "price", "inventory", "image_alt", "metafield", "description", "url_handle", "seo_listing"
For metafield batch_update, also add top-level: "metafield_key":"material", "metafield_type":"single_line_text_field"
For seo_listing batch_update, each entry in updates should include seo_title and/or seo_description (not new_value)

For multiple products with DIFFERENT changes each (not the same field), emit a separate [ORION_ACTION:...] block for each product. The user will see "Action 1 of N" and can confirm individually or all at once.

**Full SEO Optimization Workflow:**
When asked to "SEO optimize" a product (or all products), follow this complete checklist — not just the title:
1. **Product Title** — keyword-rich, ≤70 chars, main keyword first (e.g. "Casual Spring Henley T-Shirt – Lightweight Olive Green Tee")
2. **Product Description** — unique, 150-300+ words, primary keyword + 1-2 secondary keywords used naturally. Never just a list of specs. Write for humans.
3. **URL Handle** — concise, lowercase, hyphens only, includes main keyword (e.g. "casual-spring-henley-olive-green")
4. **SEO Meta Title** — ≤60 chars, slightly different from product title, click-worthy, includes brand if space allows
5. **SEO Meta Description** — ≤160 chars, includes main keyword, compelling CTA (e.g. "Shop our …", "Free shipping…")
6. **Image Alt Text** — describes the product image + includes keyword (e.g. "Olive green Henley t-shirt on white background")
7. **Tags** — relevant search terms, color, material, occasion, season, gender (e.g. ["spring","henley","cotton","olive-green","women","casual"])
8. **Custom Metafields** — material, care instructions, and any other structured data useful for search/filters

Always bundle ALL of these into a single multi_action so the user only has to confirm once:
[ORION_ACTION:{"type":"multi_action","product_name":"Henley T-Shirt - Olive Green","sku":"HTG-001","description":"Full SEO optimization: title, description, URL handle, meta title, meta description, image alt text, tags, and material metafield","actions":[{"type":"update_title","new_title":"Casual Spring Henley T-Shirt – Lightweight Olive Green Tee"},{"type":"update_description","description":"Step into spring with our Casual Henley T-Shirt in warm olive green. Crafted from 100% breathable cotton, this lightweight tee is designed for transitional weather — warm enough for breezy mornings, cool enough for sunny afternoons. The classic Henley neckline adds a relaxed, effortless look that pairs well with jeans, chinos, or shorts. Whether you're heading to a farmer's market, a weekend brunch, or just running errands, this shirt keeps you comfortable and stylish all day. Available in a relaxed fit with reinforced stitching for lasting durability. Machine washable and easy to care for."},{"type":"update_url_handle","new_handle":"casual-spring-henley-t-shirt-olive-green"},{"type":"update_seo_listing","seo_title":"Casual Spring Henley T-Shirt | Olive Green Cotton Tee","seo_description":"Lightweight 100% cotton olive green Henley tee — perfect for spring & transitional weather. Relaxed fit, machine washable. Shop now."},{"type":"update_image_alt","alt_text":"Casual olive green Henley t-shirt on white background — lightweight spring cotton tee"},{"type":"update_tags","tags":["spring","henley","cotton","olive-green","lightweight","casual","men","transitional-weather"]},{"type":"update_metafield","metafield_key":"material","metafield_value":"100% Cotton","metafield_type":"single_line_text_field"},{"type":"update_metafield","metafield_key":"care_instructions","metafield_value":"Machine wash cold, tumble dry low","metafield_type":"single_line_text_field"}]}]

When asked to SEO ALL products, emit one multi_action block per product (up to 10). If more than 10, do the first 10 and tell the user you'll continue after they confirm.

**Etsy CSV Migration Workflow:**
When a user uploads an Etsy CSV file and wants to migrate to WooCommerce, follow these steps:
1. Parse the CSV — Etsy's columns are: TITLE, DESCRIPTION, PRICE, CURRENCY_CODE, QUANTITY, SKU, TAGS, MATERIALS, IMAGE1 through IMAGE10, WHO_MADE, WHEN_MADE
2. Transform each row: TITLE→name, DESCRIPTION→description, PRICE→price, QUANTITY→quantity, SKU→sku, TAGS→tags (split by comma), IMAGE1-10→images array (collect all non-empty image URLs)
3. Group rows with the same TITLE — Etsy repeats rows for variations but omits per-variation price/quantity. Treat each unique TITLE as one product; use the price and quantity from the first row.
4. Show the user a summary: "I found X products in your Etsy CSV. Here's what I'll create: [list first 5 titles]. Ready to migrate all X to WooCommerce?"
5. On confirmation, generate a single woo_bulk_create_products action with ALL products in the array — do NOT create them one by one.
6. Note any products with variations that had incomplete data so the user knows to review those in WooCommerce afterward.

Rules for actions:
- Always include the SKU when you have it — it's the most reliable way to find the product
- The user will see a confirmation card and must approve before anything executes
- If you don't have enough info (missing price, missing title, etc.), ask for it before generating the action block
- For upload_image: only generate this action when the user has actually uploaded an image file. Never reference image URLs.
- For update_metafield: common metafield_type values are "single_line_text_field" (short text), "multi_line_text_field" (long text), "number_integer", "number_decimal". Default to "single_line_text_field" unless the value is long prose.

Action grouping — choose the most efficient approach:
1. ONE product, MULTIPLE field changes → use multi_action (one block, one confirmation, all changes run together)
2. MULTIPLE products, SAME field → use batch_update (one block, one confirmation, all products updated)
3. MULTIPLE products, DIFFERENT changes per product → emit a separate [ORION_ACTION:...] block for each product (user can "Confirm All" at once)
4. Maximum 10 [ORION_ACTION:...] blocks per response — if more than 10 products need changes, ask the user to narrow it down or use batch_update
- Never do one block at a time when the user clearly asked for multiple — that forces unnecessary back-and-forth

**Current Mode:** ${mode === 'demo/test' ? 'Demo/Test Mode - No real store connected yet' : 'Production Mode - Real store data loaded below'}

**Store Overview:**
- Active Platforms: ${storeContext.platforms.map((p: any) => p.platform_type).join(', ') || 'None connected yet'}
- Total Products: ${storeContext.total_products} (showing ${storeContext.products.length} below)
- Total Orders: ${storeContext.total_orders} (showing last ${storeContext.orders.length} below)
- Total Revenue (recent): $${storeContext.metrics.total_revenue.toFixed(2)}
- Average Order Value: $${storeContext.metrics.avg_order_value.toFixed(2)}
${lowStockSection}${ebayErrorSection}${memorySection}
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
- When asked to DO something in the store (add/update inventory, change prices, create products, rename/SEO-update titles, update descriptions, update SEO meta title/description, update URL handles, add images, update image alt text for SEO, set metafields like material or care instructions, update tags), generate ORION_ACTION block(s) as described above — the user will confirm before anything executes. For image uploads always use type "upload_image", never "update_product". For image alt text use "update_image_alt". For metafields use "update_metafield". For SEO meta title/description use "update_seo_listing". For product description use "update_description". For URL slug use "update_url_handle". Never tell the user you "can't" perform supported actions — you CAN, and you do it through the action block.
- When asked to "SEO optimize" any product, always follow the Full SEO Optimization Workflow above — do ALL 8 elements in a single multi_action, not just the title or just the metafields. Ask for the product name if ambiguous, then generate the full multi_action immediately.
- Use multi_action when asked to make several changes to the SAME product (e.g. "update the title, alt text, and material on the tie dye shirt" → one multi_action block)
- Use batch_update when asked to apply the SAME change across MULTIPLE products (e.g. "Christmas-ify all my titles" → one batch_update block with all products in the updates array)
- For multiple products needing DIFFERENT changes each, emit one block per product (max 10); tell the user how many actions are queued so they can "Confirm All"
- Be direct and honest — a real wingman delivers results, not just advice`}

**Communication Style:**
- Use markdown for formatting
- Be conversational, energetic, and direct — like a trusted partner, not a formal consultant
- Reference specific products, real numbers, and past discussions when relevant
- Ask sharp clarifying questions when you need more context
- Keep responses focused and actionable`;

  // Build messages from persistent history.
  // Strip [ORION_ACTION:...] blocks from historical assistant messages — old action
  // blocks (especially invalid ones like update_product) teach the model wrong patterns.
  const messages: any[] = conversationHistory.map((msg) => {
    let content = msg.content;
    if (msg.role !== 'user') {
      content = removeOrionActionBlocks(content);
    }
    return {
      role: msg.role === 'user' ? 'user' : 'assistant',
      content,
    };
  });

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

  // Retry up to 3 times on overloaded errors with exponential backoff
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
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

    if (response.ok) {
      const data = await response.json();
      return data.content[0].text;
    }

    const errorText = await response.text();
    let isOverloaded = false;
    try {
      isOverloaded = JSON.parse(errorText)?.error?.type === 'overloaded_error';
    } catch { /* ignore */ }

    lastError = new Error(`Claude API error: ${errorText}`);
    if (!isOverloaded) break; // Don't retry non-overload errors
  }
  throw lastError!;
}
