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
    case 'ebay_update_item_specifics':  return `Updated eBay item specifics for "${name}"`;
    case 'ebay_create_listing':         return `Created eBay listing: "${action.title || name}"`;
    case 'tiktok_update_price':         return `Updated TikTok Shop price for "${name}" → $${action.price}`;
    case 'tiktok_update_inventory':     return `Updated TikTok Shop inventory for "${name}" → ${action.quantity} units`;
    case 'tiktok_update_title':         return `Updated TikTok Shop title for "${name}"`;
    case 'tiktok_update_description':   return `Updated TikTok Shop description for "${name}"`;
    case 'tiktok_end_listing':          return `Deactivated TikTok Shop listing "${name}"`;
    case 'tiktok_renew_listing':        return `Reactivated TikTok Shop listing "${name}"`;
    case 'tiktok_create_product':       return `Created TikTok Shop product: "${action.title || name}"`;
    case 'query_analytics': return `Analytics: ${action.analytics_type || 'revenue_summary'} for ${action.period || '30d'}`;
    case 'sync_orders':     return `Synced orders from all connected platforms`;
    case 'get_orders':      return `Retrieved ${action.limit || 25} orders`;
    case 'fulfill_order':   return `Marked order ${action.platform_order_id} as shipped (${action.tracking_number})`;
    case 'cancel_order':    return `Cancelled order ${action.platform_order_id} on ${action.platform_type}`;
    case 'refund_order':    return `Refunded order ${action.platform_order_id} on ${action.platform_type}`;
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
    case 'ecwid_create_product':      return `Created Ecwid product: "${action.title || name}"`;
    case 'ecwid_update_inventory':    return `Updated Ecwid inventory for "${name}" → ${action.quantity} units`;
    case 'ecwid_update_price':        return `Updated Ecwid price for "${name}" → $${action.price}`;
    case 'ecwid_update_title':        return `Updated Ecwid title for "${name}"`;
    case 'ecwid_update_description':  return `Updated Ecwid description for "${name}"`;
    case 'magento_create_product':    return `Created Magento product: "${action.title || name}"`;
    case 'magento_update_inventory':  return `Updated Magento inventory for "${name}" → ${action.quantity} units`;
    case 'magento_update_price':      return `Updated Magento price for "${name}" → $${action.price}`;
    case 'magento_update_title':      return `Updated Magento title for "${name}"`;
    case 'magento_update_description':return `Updated Magento description for "${name}"`;
    case 'prestashop_create_product': return `Created PrestaShop product: "${action.title || name}"`;
    case 'prestashop_update_inventory':return `Updated PrestaShop inventory for "${name}" → ${action.quantity} units`;
    case 'prestashop_update_price':   return `Updated PrestaShop price for "${name}" → $${action.price}`;
    case 'prestashop_update_title':   return `Updated PrestaShop title for "${name}"`;
    case 'wish_update_inventory':     return `Updated Wish inventory for "${name}" → ${action.quantity} units`;
    case 'wish_update_price':         return `Updated Wish price for "${name}" → $${action.price}`;
    case 'walmart_update_inventory':  return `Updated Walmart inventory for "${name}" → ${action.quantity} units`;
    case 'walmart_update_price':      return `Updated Walmart price for "${name}" → $${action.price}`;
    case 'etsy_update_price':         return `Updated Etsy listing "${name}" price → $${action.price}`;
    case 'etsy_update_inventory':     return `Updated Etsy listing "${name}" quantity → ${action.quantity} units`;
    case 'etsy_update_title':         return `Updated Etsy listing "${name}" title`;
    case 'etsy_update_description':   return `Updated Etsy listing "${name}" description`;
    case 'etsy_update_tags':          return `Updated Etsy listing "${name}" tags`;
    case 'etsy_end_listing':          return `Deactivated Etsy listing "${name}"`;
    case 'etsy_renew_listing':        return `Reactivated Etsy listing "${name}"`;
    case 'etsy_create_listing':       return `Created Etsy listing: "${action.title || name}"`;
    case 'etsy_bulk_create_listings': return `Bulk created ${Array.isArray(action.listings) ? action.listings.length : '?'} Etsy listing(s)`;
    case 'woo_update_price':          return `Updated WooCommerce price for "${name}" → $${action.price}`;
    case 'woo_update_inventory':      return `Updated WooCommerce inventory for "${name}" → ${action.quantity} units`;
    case 'woo_update_title':          return `Updated WooCommerce title for "${name}"`;
    case 'woo_update_description':    return `Updated WooCommerce description for "${name}"`;
    case 'woo_update_tags':           return `Updated WooCommerce tags for "${name}"`;
    case 'woo_end_listing':           return `Deactivated WooCommerce product "${name}"`;
    case 'woo_renew_listing':         return `Reactivated WooCommerce product "${name}"`;
    case 'ecwid_update_tags':         return `Updated Ecwid keywords for "${name}"`;
    case 'ecwid_end_listing':         return `Disabled Ecwid product "${name}"`;
    case 'ecwid_renew_listing':       return `Enabled Ecwid product "${name}"`;
    case 'magento_end_listing':       return `Disabled Magento product "${name}"`;
    case 'magento_renew_listing':     return `Enabled Magento product "${name}"`;
    case 'prestashop_update_description': return `Updated PrestaShop description for "${name}"`;
    case 'prestashop_end_listing':    return `Disabled PrestaShop product "${name}"`;
    case 'prestashop_renew_listing':  return `Enabled PrestaShop product "${name}"`;
    case 'prestashop_update_tags':    return `Updated tags for "${name}" on PrestaShop`;
    case 'wish_update_title':         return `Updated Wish title for SKU "${action.sku || name}"`;
    case 'wish_update_description':   return `Updated Wish description for SKU "${action.sku || name}"`;
    case 'wish_update_tags':          return `Updated Wish tags for SKU "${action.sku || name}"`;
    case 'wish_end_listing':          return `Disabled Wish product SKU "${action.sku || name}"`;
    case 'wish_renew_listing':        return `Enabled Wish product SKU "${action.sku || name}"`;
    case 'walmart_update_title':      return `Updated Walmart title for SKU "${action.sku || name}"`;
    case 'walmart_update_description':return `Updated Walmart description for SKU "${action.sku || name}"`;
    case 'walmart_end_listing':       return `Retired Walmart listing SKU "${action.sku || name}"`;
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
      // Await the assistant message save so it completes before the function returns.
      // Fire-and-forget saves are abandoned when Deno terminates the execution context.
      try {
        await saveMessage(supabaseClient, user.id, conversationId, 'assistant', response);
      } catch (e: any) {
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
    'Accept-Language': 'en-US',
  };

  return { platform, apiBase, marketplaceId, headers };
}

// ─── TikTok Shop Client Helper ────────────────────────────────────────────────
// Fetches the connected TikTok Shop platform, refreshes the token if needed,
// resolves the shop_id (cached in metadata after first lookup), and returns
// ready-to-use headers + apiBase + shopId.
async function getTikTokClientForActions(supabaseClient: any, userId: string) {
  const { data: ttPlatforms } = await supabaseClient
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('platform_type', 'tiktok_shop')
    .or('is_active.eq.true,status.eq.connected')
    .limit(1);

  if (!ttPlatforms || ttPlatforms.length === 0) {
    throw new Error('No connected TikTok Shop found. Connect one in the Platforms tab first.');
  }

  const platform = ttPlatforms[0];
  const credentials = platform.credentials;
  const metadata = platform.metadata || {};
  let accessToken = credentials.access_token;

  // Refresh token if expired or within 5 minutes of expiry
  const tokenExpiresAt = metadata.token_expires_at ? new Date(metadata.token_expires_at).getTime() : 0;
  const needsRefresh = !metadata.token_expires_at || Date.now() > tokenExpiresAt - 5 * 60 * 1000;
  if (needsRefresh && credentials.refresh_token) {
    try {
      const clientKey = Deno.env.get('TIKTOK_CLIENT_KEY');
      const clientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET');
      if (clientKey && clientSecret) {
        const refreshRes = await fetch('https://auth.tiktok-shops.com/api/v2/token/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_key: clientKey,
            app_secret: clientSecret,
            refresh_token: credentials.refresh_token,
            grant_type: 'refresh_token',
          }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.code === 0 && refreshData.data?.access_token) {
            const newTokens = refreshData.data;
            accessToken = newTokens.access_token;
            await supabaseClient.from('platforms').update({
              credentials: {
                ...credentials,
                access_token: newTokens.access_token,
                refresh_token: newTokens.refresh_token || credentials.refresh_token,
              },
              metadata: {
                ...metadata,
                token_expires_at: new Date(Date.now() + (newTokens.access_token_expire_in || 172800) * 1000).toISOString(),
              },
            }).eq('id', platform.id);
          }
        }
      }
    } catch (e: any) {
      console.warn('[Orion] TikTok token refresh error:', e.message);
    }
  }

  const apiBase = 'https://open-api.tiktok-shops.com';
  const headers: Record<string, string> = {
    'x-tts-access-token': accessToken,
    'Content-Type': 'application/json',
  };

  // Resolve shop_id — cached in metadata after first lookup
  let shopId: string = metadata.shop_id || credentials.shop_id || '';
  if (!shopId) {
    const shopsRes = await fetch(`${apiBase}/authorization/202309/shops`, { headers });
    if (shopsRes.ok) {
      const shopsData = await shopsRes.json();
      shopId = shopsData?.data?.shops?.[0]?.id || '';
      if (shopId) {
        await supabaseClient.from('platforms').update({
          metadata: { ...metadata, shop_id: shopId },
        }).eq('id', platform.id);
      }
    }
    if (!shopId) throw new Error('Could not retrieve TikTok Shop ID. Try disconnecting and reconnecting TikTok Shop.');
  }

  return { platform, apiBase, headers, shopId };
}

// Looks up a TikTok product by keyword (SKU first, then product name) and returns
// the first match with its product_id and first sku details.
async function findTikTokProduct(apiBase: string, headers: Record<string, string>, shopId: string, productName: string, sku: string) {
  const keyword = sku && sku !== 'N/A' ? sku : productName;
  if (!keyword) throw new Error('product_name or sku is required to find a TikTok product.');

  const searchRes = await fetch(`${apiBase}/product/202309/products/search?shop_id=${encodeURIComponent(shopId)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ keyword, page_size: 10 }),
  });
  if (!searchRes.ok) throw new Error(`TikTok product search failed: ${await searchRes.text()}`);
  const searchData = await searchRes.json();
  if (searchData.code !== 0) throw new Error(`TikTok API error (${searchData.code}): ${searchData.message}`);

  const products = searchData.data?.products || [];
  if (products.length === 0) throw new Error(`Product "${productName || sku}" not found in TikTok Shop.`);

  return products[0];
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
            'Accept-Language': 'en-US',
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

      // Fetch TikTok Shop products
      try {
        const { data: ttPlatforms } = await supabaseClient
          .from('platforms')
          .select('*')
          .eq('user_id', userId)
          .eq('platform_type', 'tiktok_shop')
          .or('is_active.eq.true,status.eq.connected');

        for (const ttPlat of (ttPlatforms || [])) {
          const creds = ttPlat.credentials;
          const meta = ttPlat.metadata || {};
          if (!creds?.access_token) continue;

          const ttHeaders: Record<string, string> = {
            'x-tts-access-token': creds.access_token,
            'Content-Type': 'application/json',
          };
          const ttBase = 'https://open-api.tiktok-shops.com';

          // Resolve shop_id
          let ttShopId: string = meta.shop_id || creds.shop_id || '';
          if (!ttShopId) {
            const shopsRes = await fetch(`${ttBase}/authorization/202309/shops`, { headers: ttHeaders });
            if (shopsRes.ok) {
              const shopsData = await shopsRes.json();
              ttShopId = shopsData?.data?.shops?.[0]?.id || '';
              if (ttShopId) {
                await supabaseClient.from('platforms').update({
                  metadata: { ...meta, shop_id: ttShopId },
                }).eq('id', ttPlat.id);
              }
            }
          }
          if (!ttShopId) continue;

          const searchRes = await fetch(`${ttBase}/product/202309/products/search?shop_id=${encodeURIComponent(ttShopId)}`, {
            method: 'POST',
            headers: ttHeaders,
            body: JSON.stringify({ page_size: 100 }),
          });
          if (!searchRes.ok) continue;
          const searchData = await searchRes.json();
          if (searchData.code !== 0) continue;

          for (const p of (searchData.data?.products || [])) {
            const firstSku = p.skus?.[0];
            const price = parseFloat(firstSku?.price?.original_price || '0');
            const qty = (firstSku?.inventory || []).reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
            const imageUrl = p.main_images?.[0]?.urls?.[0] || p.images?.[0]?.urls?.[0] || null;
            let status = 'active';
            if (p.status === 'SELLER_DEACTIVATED' || p.status === 'PLATFORM_DEACTIVATED') status = 'inactive';
            else if (qty === 0) status = 'out_of_stock';
            else if (qty <= LOW_STOCK_THRESHOLD) status = 'low_stock';

            inventory.push({
              id: `tiktok-${p.id}`,
              product_name: p.title || 'TikTok Product',
              sku: firstSku?.seller_sku || 'N/A',
              category: '',
              status,
              total_stock: qty,
              base_price: price,
              image_url: imageUrl,
              vendor: '',
              tags: '',
              platform_listings: [{ listing_id: p.id, platform: 'TikTok Shop' }],
              source: 'tiktok_shop',
              tiktok_product_id: p.id,
            });
          }
        }
      } catch (e: any) {
        console.warn('[smart-api] TikTok Shop inventory fetch failed:', e.message);
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

    case 'ebay_update_item_specifics': {
      // Updates product.aspects (item specifics) on an eBay inventory item.
      // action.item_specifics: { "Brand": ["Nike"], "Size": ["M", "L"] }
      // action.replace_all: true → replaces all aspects; false/omitted → merges with existing
      const { apiBase, headers: ebayHeaders } = await getEbayClientForActions(supabaseClient, userId);
      const sku = action.sku;
      if (!sku) throw new Error('sku is required for ebay_update_item_specifics.');

      const getRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, { headers: ebayHeaders });
      if (!getRes.ok) throw new Error(`eBay inventory item not found for SKU "${sku}": ${await getRes.text()}`);
      const currentItem = await getRes.json();

      const existingAspects: Record<string, string[]> = currentItem.product?.aspects || {};
      const incoming: Record<string, unknown> = action.item_specifics || {};
      const merged = action.replace_all ? incoming : { ...existingAspects, ...incoming };

      // eBay requires every aspect value to be a string[]
      const normalized: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(merged)) {
        normalized[k] = Array.isArray(v) ? (v as unknown[]).map(String) : [String(v)];
      }

      const putRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
        method: 'PUT',
        headers: ebayHeaders,
        body: JSON.stringify({ ...currentItem, product: { ...currentItem.product, aspects: normalized } }),
      });
      if (!putRes.ok) throw new Error(`eBay item specifics update failed: ${await putRes.text()}`);

      const updatedKeys = Object.keys(normalized).join(', ');
      return { message: `Updated eBay item specifics for "${action.product_name || sku}": ${updatedKeys}` };
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

    // ── TikTok Shop write actions ─────────────────────────────────────────────

    case 'tiktok_update_price': {
      const { apiBase: ttBase, headers: ttHeaders, shopId } = await getTikTokClientForActions(supabaseClient, userId);
      const product = await findTikTokProduct(ttBase, ttHeaders, shopId, action.product_name, action.sku);
      const skuId = product.skus?.[0]?.id;
      if (!skuId) throw new Error(`No SKU found on TikTok product "${action.product_name || action.sku}".`);

      const res = await fetch(`${ttBase}/product/202309/skus?shop_id=${encodeURIComponent(shopId)}`, {
        method: 'PUT',
        headers: ttHeaders,
        body: JSON.stringify({
          skus: [{ id: skuId, price: { currency: 'USD', original_price: String(Number(action.price).toFixed(2)) } }],
        }),
      });
      if (!res.ok) throw new Error(`TikTok price update failed: ${await res.text()}`);
      const data = await res.json();
      if (data.code !== 0) throw new Error(`TikTok API error: ${data.message}`);
      return { message: `Updated TikTok Shop price for "${action.product_name || action.sku}" to $${action.price}` };
    }

    case 'tiktok_update_inventory': {
      const { apiBase: ttBase, headers: ttHeaders, shopId } = await getTikTokClientForActions(supabaseClient, userId);
      const product = await findTikTokProduct(ttBase, ttHeaders, shopId, action.product_name, action.sku);
      const firstSku = product.skus?.[0];
      if (!firstSku?.id) throw new Error(`No SKU found on TikTok product "${action.product_name || action.sku}".`);

      // Fetch first warehouse to use for inventory update
      const warehousesRes = await fetch(`${ttBase}/logistics/202309/warehouses?shop_id=${encodeURIComponent(shopId)}`, { headers: ttHeaders });
      if (!warehousesRes.ok) throw new Error(`TikTok warehouse lookup failed: ${await warehousesRes.text()}`);
      const warehousesData = await warehousesRes.json();
      const warehouseId = warehousesData?.data?.warehouses?.[0]?.id;
      if (!warehouseId) throw new Error('No TikTok Shop warehouse found. Check your seller account setup.');

      const res = await fetch(`${ttBase}/product/202309/stocks?shop_id=${encodeURIComponent(shopId)}`, {
        method: 'POST',
        headers: ttHeaders,
        body: JSON.stringify({
          skus: [{
            id: firstSku.id,
            seller_sku: firstSku.seller_sku || '',
            inventory: [{ warehouse_id: warehouseId, quantity: Number(action.quantity) }],
          }],
        }),
      });
      if (!res.ok) throw new Error(`TikTok inventory update failed: ${await res.text()}`);
      const data = await res.json();
      if (data.code !== 0) throw new Error(`TikTok API error: ${data.message}`);
      return { message: `Updated TikTok Shop inventory for "${action.product_name || action.sku}" to ${action.quantity} units` };
    }

    case 'tiktok_update_title':
    case 'tiktok_update_description': {
      const { apiBase: ttBase, headers: ttHeaders, shopId } = await getTikTokClientForActions(supabaseClient, userId);
      const product = await findTikTokProduct(ttBase, ttHeaders, shopId, action.product_name, action.sku);

      const body: Record<string, string> = {};
      if (action.type === 'tiktok_update_title') body.title = action.new_title;
      if (action.type === 'tiktok_update_description') body.description = action.description;

      const res = await fetch(`${ttBase}/product/202309/products/${encodeURIComponent(product.id)}?shop_id=${encodeURIComponent(shopId)}`, {
        method: 'PUT',
        headers: ttHeaders,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`TikTok product update failed: ${await res.text()}`);
      const data = await res.json();
      if (data.code !== 0) throw new Error(`TikTok API error: ${data.message}`);

      if (action.type === 'tiktok_update_title') return { message: `Updated TikTok Shop title for "${action.product_name || action.sku}" → "${action.new_title}"` };
      return { message: `Updated TikTok Shop description for "${action.product_name || action.sku}"` };
    }

    case 'tiktok_end_listing':
    case 'tiktok_renew_listing': {
      const { apiBase: ttBase, headers: ttHeaders, shopId } = await getTikTokClientForActions(supabaseClient, userId);
      const product = await findTikTokProduct(ttBase, ttHeaders, shopId, action.product_name, action.sku);

      const endpoint = action.type === 'tiktok_end_listing' ? 'deactivate' : 'activate';
      const res = await fetch(`${ttBase}/product/202309/products/${endpoint}?shop_id=${encodeURIComponent(shopId)}`, {
        method: 'POST',
        headers: ttHeaders,
        body: JSON.stringify({ product_ids: [product.id] }),
      });
      if (!res.ok) throw new Error(`TikTok ${endpoint} failed: ${await res.text()}`);
      const data = await res.json();
      if (data.code !== 0) throw new Error(`TikTok API error: ${data.message}`);

      const verb = action.type === 'tiktok_end_listing' ? 'Deactivated' : 'Reactivated';
      return { message: `${verb} TikTok Shop listing for "${action.product_name || action.sku}"` };
    }

    case 'tiktok_create_product': {
      // Requires category_id — look up via GET /product/202309/categories if not provided.
      // All other fields are required: title, description, images[], price, quantity, category_id.
      const { apiBase: ttBase, headers: ttHeaders, shopId } = await getTikTokClientForActions(supabaseClient, userId);

      if (!action.title) throw new Error('title is required for tiktok_create_product.');
      if (!action.price) throw new Error('price is required for tiktok_create_product.');
      if (!action.category_id) throw new Error('category_id is required for tiktok_create_product. Ask the user to provide it or look it up first.');
      if (!action.images || action.images.length === 0) throw new Error('At least one image URL is required for tiktok_create_product.');

      const body = {
        title: action.title,
        description: action.description || '',
        category_id: String(action.category_id),
        main_images: action.images.map((url: string) => ({ urls: [url] })),
        skus: [{
          seller_sku: action.sku || '',
          price: { currency: 'USD', original_price: String(Number(action.price).toFixed(2)) },
          inventory: [{ quantity: Number(action.quantity ?? 0) }],
        }],
      };

      const res = await fetch(`${ttBase}/product/202309/products?shop_id=${encodeURIComponent(shopId)}`, {
        method: 'POST',
        headers: ttHeaders,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`TikTok product create failed: ${await res.text()}`);
      const data = await res.json();
      if (data.code !== 0) throw new Error(`TikTok API error: ${data.message}`);
      return { message: `Created TikTok Shop product: "${action.title}" (ID: ${data.data?.product_id || 'unknown'})` };
    }

    // ── Order management actions ──────────────────────────────────────────────
    // Cross-platform: each action looks up the right platform via platform_type.

    case 'sync_orders': {
      // Pulls recent orders from all connected platforms and upserts to the orders table.
      // Call this whenever Orion needs fresh order data, or when the user asks to refresh.
      const { data: connectedPlatforms } = await supabaseClient
        .from('platforms')
        .select('*')
        .eq('user_id', userId)
        .or('is_active.eq.true,status.eq.connected');

      let synced = 0;
      const errors: string[] = [];

      for (const plat of (connectedPlatforms || [])) {
        try {
          const rows: any[] = [];

          // ── Shopify ──────────────────────────────────────────────────────────
          if (plat.platform_type === 'shopify') {
            const shopDomain = plat.shop_domain || plat.domain || plat.store_domain;
            let tok = plat.access_token;
            if (!shopDomain || !tok) continue;
            try {
              if (tok.length > 50 && !tok.startsWith('shpat_') && !tok.startsWith('shpca_')) {
                const { decrypt } = await import('../_shared/encryption.ts');
                tok = await decrypt(tok);
              }
            } catch {}
            const shopBase = `https://${shopDomain}/admin/api/2024-01`;
            const shopHeaders = { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' };
            const oRes = await fetch(`${shopBase}/orders.json?limit=250&status=any`, { headers: shopHeaders });
            if (oRes.ok) {
              const { orders: shopOrders } = await oRes.json();
              for (const o of (shopOrders || [])) {
                rows.push({
                  user_id: userId,
                  platform_type: 'shopify',
                  platform_order_id: String(o.id),
                  order_number: o.name || String(o.order_number),
                  status: o.cancelled_at ? 'cancelled' : o.financial_status === 'refunded' ? 'refunded' : o.fulfillment_status === 'fulfilled' ? 'shipped' : 'processing',
                  fulfillment_status: o.fulfillment_status || 'unfulfilled',
                  customer_name: o.customer ? `${o.customer.first_name || ''} ${o.customer.last_name || ''}`.trim() : (o.shipping_address?.name || 'Guest'),
                  customer_email: o.email || o.customer?.email || '',
                  shipping_address: o.shipping_address || null,
                  subtotal: parseFloat(o.subtotal_price || '0'),
                  total_price: parseFloat(o.total_price || '0'),
                  currency: o.currency || 'USD',
                  line_items: (o.line_items || []).map((i: any) => ({ title: i.title, sku: i.sku, quantity: i.quantity, unit_price: parseFloat(i.price || '0'), variant_title: i.variant_title })),
                  tracking_number: o.fulfillments?.[0]?.tracking_number || null,
                  tracking_company: o.fulfillments?.[0]?.tracking_company || null,
                  shipped_at: o.fulfillments?.[0]?.created_at || null,
                  order_date: o.created_at,
                });
              }
            }
          }

          // ── Etsy ─────────────────────────────────────────────────────────────
          if (plat.platform_type === 'etsy') {
            const shopId = plat.metadata?.shop_id;
            const tok = plat.credentials?.access_token;
            const clientId = Deno.env.get('ETSY_CLIENT_ID');
            if (!shopId || !tok || !clientId) continue;
            const rRes = await fetch(
              `https://openapi.etsy.com/v3/application/shops/${shopId}/receipts?limit=100`,
              { headers: { 'x-api-key': clientId, 'Authorization': `Bearer ${tok}` } }
            );
            if (rRes.ok) {
              const { results } = await rRes.json();
              for (const r of (results || [])) {
                rows.push({
                  user_id: userId,
                  platform_type: 'etsy',
                  platform_order_id: String(r.receipt_id),
                  order_number: String(r.receipt_id),
                  status: r.is_shipped ? 'shipped' : r.status === 'paid' ? 'processing' : r.status,
                  fulfillment_status: r.is_shipped ? 'fulfilled' : 'unfulfilled',
                  customer_name: r.name || 'Etsy Customer',
                  customer_email: r.buyer_email || '',
                  shipping_address: r.formatted_address ? { address1: r.formatted_address } : null,
                  subtotal: (r.subtotal?.amount || 0) / (r.subtotal?.divisor || 100),
                  total_price: (r.grandtotal?.amount || 0) / (r.grandtotal?.divisor || 100),
                  currency: r.grandtotal?.currency_code || 'USD',
                  line_items: (r.transactions || []).map((t: any) => ({ title: t.title, sku: t.product_data?.sku?.[0] || '', quantity: t.quantity, unit_price: (t.price?.amount || 0) / (t.price?.divisor || 100) })),
                  tracking_number: r.shipments?.[0]?.tracking_code || null,
                  tracking_company: r.shipments?.[0]?.carrier_name || null,
                  order_date: r.created_timestamp ? new Date(r.created_timestamp * 1000).toISOString() : null,
                });
              }
            }
          }

          // ── eBay ─────────────────────────────────────────────────────────────
          if (plat.platform_type === 'ebay') {
            const creds = plat.credentials;
            const meta = plat.metadata || {};
            if (!creds?.access_token) continue;
            const ebayBase = meta.environment === 'sandbox' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
            const ebayH = { 'Authorization': `Bearer ${creds.access_token}`, 'Content-Type': 'application/json', 'X-EBAY-C-MARKETPLACE-ID': creds.marketplace_id || 'EBAY_US' };
            const oRes = await fetch(`${ebayBase}/sell/fulfillment/v1/order?limit=50`, { headers: ebayH });
            if (oRes.ok) {
              const { orders: ebayOrders } = await oRes.json();
              for (const o of (ebayOrders || [])) {
                rows.push({
                  user_id: userId,
                  platform_type: 'ebay',
                  platform_order_id: o.orderId,
                  order_number: o.orderId,
                  status: o.orderFulfillmentStatus === 'FULFILLED' ? 'shipped' : o.orderPaymentStatus === 'PAID' ? 'processing' : 'pending',
                  fulfillment_status: o.orderFulfillmentStatus === 'FULFILLED' ? 'fulfilled' : 'unfulfilled',
                  customer_name: o.buyer?.username || 'eBay Buyer',
                  customer_email: '',
                  shipping_address: o.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress || null,
                  total_price: parseFloat(o.pricingSummary?.total?.value || '0'),
                  currency: o.pricingSummary?.total?.currency || 'USD',
                  line_items: (o.lineItems || []).map((i: any) => ({ title: i.title, sku: i.sku || '', quantity: i.quantity, unit_price: parseFloat(i.lineItemCost?.value || '0') })),
                  order_date: o.creationDate,
                });
              }
            }
          }

          // ── TikTok Shop ───────────────────────────────────────────────────────
          if (plat.platform_type === 'tiktok_shop') {
            const tok = plat.credentials?.access_token;
            const shopId = plat.metadata?.shop_id;
            if (!tok || !shopId) continue;
            const ttH = { 'x-tts-access-token': tok, 'Content-Type': 'application/json' };
            const oRes = await fetch(`https://open-api.tiktok-shops.com/order/202309/orders/search?shop_id=${encodeURIComponent(shopId)}`, {
              method: 'POST',
              headers: ttH,
              body: JSON.stringify({ page_size: 50, order_status: 100 }), // 100 = awaiting shipment
            });
            if (oRes.ok) {
              const oData = await oRes.json();
              if (oData.code === 0) {
                for (const o of (oData.data?.orders || [])) {
                  rows.push({
                    user_id: userId,
                    platform_type: 'tiktok_shop',
                    platform_order_id: o.id,
                    order_number: o.id,
                    status: o.status === 'AWAITING_SHIPMENT' ? 'processing' : o.status === 'SHIPPED' ? 'shipped' : o.status === 'DELIVERED' ? 'delivered' : 'pending',
                    fulfillment_status: o.status === 'SHIPPED' || o.status === 'DELIVERED' ? 'fulfilled' : 'unfulfilled',
                    customer_name: o.recipient_address?.name || 'TikTok Customer',
                    customer_email: '',
                    shipping_address: o.recipient_address || null,
                    total_price: parseFloat(o.payment?.total_amount || '0'),
                    currency: o.payment?.currency || 'USD',
                    line_items: (o.line_items || []).map((i: any) => ({ title: i.product_name, sku: i.seller_sku || '', quantity: i.quantity, unit_price: parseFloat(i.sale_price || '0') })),
                    order_date: o.create_time ? new Date(o.create_time * 1000).toISOString() : null,
                  });
                }
              }
            }
          }

          // ── WooCommerce ───────────────────────────────────────────────────────
          if (plat.platform_type === 'woocommerce') {
            const { consumer_key, consumer_secret } = plat.credentials;
            const wooBase = `${plat.store_url}/wp-json/wc/v3`;
            const wooH = { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(`${consumer_key}:${consumer_secret}`)}` };
            const oRes = await fetch(`${wooBase}/orders?per_page=100&status=any`, { headers: wooH });
            if (oRes.ok) {
              const wooOrders = await oRes.json();
              for (const o of (wooOrders || [])) {
                rows.push({
                  user_id: userId,
                  platform_type: 'woocommerce',
                  platform_order_id: String(o.id),
                  order_number: o.number ? `#${o.number}` : String(o.id),
                  status: o.status === 'completed' ? 'shipped' : o.status === 'cancelled' ? 'cancelled' : o.status === 'refunded' ? 'refunded' : 'processing',
                  fulfillment_status: o.status === 'completed' ? 'fulfilled' : 'unfulfilled',
                  customer_name: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim() || 'WooCommerce Customer',
                  customer_email: o.billing?.email || '',
                  shipping_address: o.shipping || null,
                  subtotal: parseFloat(o.total || '0'),
                  total_price: parseFloat(o.total || '0'),
                  currency: o.currency || 'USD',
                  line_items: (o.line_items || []).map((i: any) => ({ title: i.name, sku: i.sku || '', quantity: i.quantity, unit_price: parseFloat(i.price || '0') })),
                  order_date: o.date_created,
                });
              }
            }
          }

          if (rows.length > 0) {
            const { error: upsertErr } = await supabaseClient.from('orders').upsert(rows, {
              onConflict: 'user_id,platform_type,platform_order_id',
              ignoreDuplicates: false,
            });
            if (upsertErr) errors.push(`${plat.platform_type}: ${upsertErr.message}`);
            else synced += rows.length;
          }
        } catch (e: any) {
          errors.push(`${plat.platform_type}: ${e.message}`);
        }
      }

      return {
        message: `Synced ${synced} orders across your connected platforms.${errors.length > 0 ? ` Errors: ${errors.join('; ')}` : ''}`,
        synced_count: synced,
        errors,
      };
    }

    case 'get_orders': {
      // Query orders from the local DB. Supports filtering by status, platform, date range.
      let query = supabaseClient
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('order_date', { ascending: false })
        .limit(action.limit || 25);

      if (action.status) query = query.eq('status', action.status);
      if (action.platform_type) query = query.eq('platform_type', action.platform_type);
      if (action.fulfillment_status) query = query.eq('fulfillment_status', action.fulfillment_status);
      if (action.since) query = query.gte('order_date', action.since);

      const { data: orders, error: qErr } = await query;
      if (qErr) throw new Error(`Order query failed: ${qErr.message}`);

      const unfulfilled = (orders || []).filter((o: any) => o.fulfillment_status === 'unfulfilled');
      return {
        orders: orders || [],
        count: (orders || []).length,
        unfulfilled_count: unfulfilled.length,
        message: `Found ${(orders || []).length} order(s)${action.status ? ` with status "${action.status}"` : ''}.`,
      };
    }

    case 'fulfill_order': {
      // Marks an order as shipped on the originating platform and updates local DB.
      // Required: platform_type, platform_order_id, tracking_number
      // Optional: tracking_company (carrier), carrier_code
      const { platform_type: orderPlatform, platform_order_id: orderId, tracking_number, tracking_company } = action;
      if (!orderPlatform) throw new Error('platform_type is required for fulfill_order.');
      if (!orderId) throw new Error('platform_order_id is required for fulfill_order.');
      if (!tracking_number) throw new Error('tracking_number is required for fulfill_order.');

      const { data: orderPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', orderPlatform).or('is_active.eq.true,status.eq.connected').limit(1);
      if (!orderPlats || orderPlats.length === 0) throw new Error(`No connected ${orderPlatform} account found.`);
      const orderPlat = orderPlats[0];

      // ── Shopify ──────────────────────────────────────────────────────────────
      if (orderPlatform === 'shopify') {
        const shopDomain = orderPlat.shop_domain || orderPlat.domain || orderPlat.store_domain;
        let tok = orderPlat.access_token;
        try {
          if (tok.length > 50 && !tok.startsWith('shpat_') && !tok.startsWith('shpca_')) {
            const { decrypt } = await import('../_shared/encryption.ts');
            tok = await decrypt(tok);
          }
        } catch {}
        const shopBase = `https://${shopDomain}/admin/api/2024-01`;
        const shopH = { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' };

        // Get line item IDs for the fulfillment
        const oRes = await fetch(`${shopBase}/orders/${orderId}.json`, { headers: shopH });
        if (!oRes.ok) throw new Error(`Could not find Shopify order ${orderId}`);
        const { order: shopOrder } = await oRes.json();
        const locationRes = await fetch(`${shopBase}/locations.json`, { headers: shopH });
        const locationData = locationRes.ok ? await locationRes.json() : null;
        const locationId = locationData?.locations?.[0]?.id;

        const fulfillBody: any = {
          fulfillment: {
            location_id: locationId,
            tracking_number,
            tracking_company: tracking_company || '',
            line_items: (shopOrder.line_items || []).map((i: any) => ({ id: i.id })),
          },
        };
        const fRes = await fetch(`${shopBase}/orders/${orderId}/fulfillments.json`, {
          method: 'POST', headers: shopH, body: JSON.stringify(fulfillBody),
        });
        if (!fRes.ok) throw new Error(`Shopify fulfillment failed: ${await fRes.text()}`);
      }

      // ── Etsy ─────────────────────────────────────────────────────────────────
      if (orderPlatform === 'etsy') {
        const shopId = orderPlat.metadata?.shop_id;
        const tok = orderPlat.credentials?.access_token;
        const clientId = Deno.env.get('ETSY_CLIENT_ID');
        if (!shopId || !tok || !clientId) throw new Error('Etsy credentials incomplete for fulfillment.');
        const eRes = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/receipts/${orderId}`, {
          method: 'PUT',
          headers: { 'x-api-key': clientId, 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ was_shipped: true, tracking_code: tracking_number, carrier_name: tracking_company || '' }),
        });
        if (!eRes.ok) throw new Error(`Etsy fulfillment failed: ${await eRes.text()}`);
      }

      // ── eBay ──────────────────────────────────────────────────────────────────
      if (orderPlatform === 'ebay') {
        const { apiBase: ebayBase, headers: ebayH } = await getEbayClientForActions(supabaseClient, userId);
        const eRes = await fetch(`${ebayBase}/sell/fulfillment/v1/order/${encodeURIComponent(orderId)}/shippingFulfillment`, {
          method: 'POST',
          headers: ebayH,
          body: JSON.stringify({
            lineItems: [{ lineItemId: action.line_item_id || orderId, quantity: 1 }],
            shippedDate: new Date().toISOString(),
            shippingCarrierCode: action.carrier_code || tracking_company || 'Other',
            trackingNumber: tracking_number,
          }),
        });
        if (!eRes.ok) throw new Error(`eBay fulfillment failed: ${await eRes.text()}`);
      }

      // ── WooCommerce ───────────────────────────────────────────────────────────
      if (orderPlatform === 'woocommerce') {
        const { consumer_key, consumer_secret } = orderPlat.credentials;
        const wooBase = `${orderPlat.store_url}/wp-json/wc/v3`;
        const wooH = { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(`${consumer_key}:${consumer_secret}`)}` };
        const wRes = await fetch(`${wooBase}/orders/${orderId}`, {
          method: 'PUT', headers: wooH,
          body: JSON.stringify({ status: 'completed' }),
        });
        if (!wRes.ok) throw new Error(`WooCommerce order update failed: ${await wRes.text()}`);
      }

      // ── TikTok Shop ───────────────────────────────────────────────────────────
      if (orderPlatform === 'tiktok_shop') {
        const { apiBase: ttBase, headers: ttH, shopId } = await getTikTokClientForActions(supabaseClient, userId);
        // TikTok requires package creation before marking shipped
        const pkgRes = await fetch(`${ttBase}/fulfillment/202309/packages?shop_id=${encodeURIComponent(shopId)}`, {
          method: 'POST',
          headers: ttH,
          body: JSON.stringify({ order_id: orderId, tracking_number, provider_id: action.carrier_code || '' }),
        });
        if (!pkgRes.ok) throw new Error(`TikTok fulfillment failed: ${await pkgRes.text()}`);
        const pkgData = await pkgRes.json();
        if (pkgData.code !== 0) throw new Error(`TikTok API error: ${pkgData.message}`);
      }

      // Update local DB regardless of platform
      await supabaseClient.from('orders')
        .update({ status: 'shipped', fulfillment_status: 'fulfilled', tracking_number, tracking_company: tracking_company || null, shipped_at: new Date().toISOString() })
        .eq('user_id', userId).eq('platform_type', orderPlatform).eq('platform_order_id', orderId);

      return { message: `Order ${orderId} marked as shipped on ${orderPlatform} with tracking ${tracking_number}.` };
    }

    case 'cancel_order': {
      const { platform_type: orderPlatform, platform_order_id: orderId } = action;
      if (!orderPlatform || !orderId) throw new Error('platform_type and platform_order_id are required for cancel_order.');

      const { data: cPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', orderPlatform).or('is_active.eq.true,status.eq.connected').limit(1);
      if (!cPlats || cPlats.length === 0) throw new Error(`No connected ${orderPlatform} account found.`);
      const cPlat = cPlats[0];

      if (orderPlatform === 'shopify') {
        const shopDomain = cPlat.shop_domain || cPlat.domain || cPlat.store_domain;
        let tok = cPlat.access_token;
        try {
          if (tok.length > 50 && !tok.startsWith('shpat_') && !tok.startsWith('shpca_')) {
            const { decrypt } = await import('../_shared/encryption.ts');
            tok = await decrypt(tok);
          }
        } catch {}
        const cRes = await fetch(`https://${shopDomain}/admin/api/2024-01/orders/${orderId}/cancel.json`, {
          method: 'POST', headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: action.reason || 'customer' }),
        });
        if (!cRes.ok) throw new Error(`Shopify cancel failed: ${await cRes.text()}`);
      }

      if (orderPlatform === 'woocommerce') {
        const { consumer_key, consumer_secret } = cPlat.credentials;
        const cRes = await fetch(`${cPlat.store_url}/wp-json/wc/v3/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(`${consumer_key}:${consumer_secret}`)}` },
          body: JSON.stringify({ status: 'cancelled' }),
        });
        if (!cRes.ok) throw new Error(`WooCommerce cancel failed: ${await cRes.text()}`);
      }

      if (orderPlatform === 'ebay') {
        const { apiBase: ebayBase, headers: ebayH } = await getEbayClientForActions(supabaseClient, userId);
        const cRes = await fetch(`${ebayBase}/sell/fulfillment/v1/order/${encodeURIComponent(orderId)}/cancel`, {
          method: 'POST', headers: ebayH,
          body: JSON.stringify({ cancelReason: action.reason || 'BUYER_ASKED_CANCEL' }),
        });
        if (!cRes.ok) throw new Error(`eBay cancel failed: ${await cRes.text()}`);
      }

      await supabaseClient.from('orders')
        .update({ status: 'cancelled' })
        .eq('user_id', userId).eq('platform_type', orderPlatform).eq('platform_order_id', orderId);

      return { message: `Order ${orderId} cancelled on ${orderPlatform}.` };
    }

    case 'refund_order': {
      // Full refund. For partial refunds, platform dashboards are recommended.
      const { platform_type: orderPlatform, platform_order_id: orderId } = action;
      if (!orderPlatform || !orderId) throw new Error('platform_type and platform_order_id are required for refund_order.');

      const { data: rPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', orderPlatform).or('is_active.eq.true,status.eq.connected').limit(1);
      if (!rPlats || rPlats.length === 0) throw new Error(`No connected ${orderPlatform} account found.`);
      const rPlat = rPlats[0];

      if (orderPlatform === 'shopify') {
        const shopDomain = rPlat.shop_domain || rPlat.domain || rPlat.store_domain;
        let tok = rPlat.access_token;
        try {
          if (tok.length > 50 && !tok.startsWith('shpat_') && !tok.startsWith('shpca_')) {
            const { decrypt } = await import('../_shared/encryption.ts');
            tok = await decrypt(tok);
          }
        } catch {}
        // Calculate refund amounts
        const oRes = await fetch(`https://${shopDomain}/admin/api/2024-01/orders/${orderId}.json`, {
          headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' },
        });
        if (!oRes.ok) throw new Error(`Could not fetch Shopify order ${orderId} for refund.`);
        const { order: shopOrder } = await oRes.json();
        const refundBody = {
          refund: {
            notify: true,
            note: action.reason || 'Refund requested',
            refund_line_items: (shopOrder.line_items || []).map((i: any) => ({ line_item_id: i.id, quantity: i.quantity, restock_type: 'return' })),
            transactions: [{ kind: 'refund', gateway: shopOrder.gateway, amount: shopOrder.total_price }],
          },
        };
        const rRes = await fetch(`https://${shopDomain}/admin/api/2024-01/orders/${orderId}/refunds.json`, {
          method: 'POST',
          headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' },
          body: JSON.stringify(refundBody),
        });
        if (!rRes.ok) throw new Error(`Shopify refund failed: ${await rRes.text()}`);
      }

      if (orderPlatform === 'woocommerce') {
        const { consumer_key, consumer_secret } = rPlat.credentials;
        const rRes = await fetch(`${rPlat.store_url}/wp-json/wc/v3/orders/${orderId}/refunds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(`${consumer_key}:${consumer_secret}`)}` },
          body: JSON.stringify({ reason: action.reason || 'Refund requested', api_refund: true }),
        });
        if (!rRes.ok) throw new Error(`WooCommerce refund failed: ${await rRes.text()}`);
      }

      await supabaseClient.from('orders')
        .update({ status: 'refunded' })
        .eq('user_id', userId).eq('platform_type', orderPlatform).eq('platform_order_id', orderId);

      return { message: `Refund processed for order ${orderId} on ${orderPlatform}.` };
    }

    case 'query_analytics': {
      // On-demand analytics queries against the orders table.
      // analytics_type: revenue_summary | top_products | platform_breakdown | order_trends | refund_rate
      // period: today | 7d | 30d | 90d | 1y  (or use since + until for custom range)
      const analyticsType = action.analytics_type || 'revenue_summary';

      // Resolve date range
      const now = new Date();
      let since: Date;
      let until: Date = now;

      if (action.since) {
        since = new Date(action.since);
        if (action.until) until = new Date(action.until);
      } else {
        const periodDays: Record<string, number> = { today: 0, '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
        const days = periodDays[action.period ?? '30d'] ?? 30;
        since = days === 0
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) // start of today
          : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      }

      const sinceISO = since.toISOString();
      const untilISO = until.toISOString();
      const periodLabel = action.period === 'today' ? 'today' : `${since.toLocaleDateString()} – ${until.toLocaleDateString()}`;

      // Core query — excludes cancelled/refunded unless analytics_type is refund_rate
      const coreQuery = () => supabaseClient
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .gte('order_date', sinceISO)
        .lte('order_date', untilISO);

      const paidQuery = () => coreQuery().not('status', 'in', '(cancelled,refunded)');

      // ── revenue_summary ──────────────────────────────────────────────────────
      if (analyticsType === 'revenue_summary') {
        let q = paidQuery();
        if (action.platform_type) q = q.eq('platform_type', action.platform_type);
        const { data: orders } = await q;

        const revenue = (orders || []).reduce((s: number, o: any) => s + parseFloat(o.total_price || 0), 0);
        const count   = (orders || []).length;
        const aov     = count > 0 ? revenue / count : 0;

        // Compare to same-length previous period
        const periodMs = until.getTime() - since.getTime();
        const prevSince = new Date(since.getTime() - periodMs);
        const { data: prevOrders } = await supabaseClient
          .from('orders').select('total_price').eq('user_id', userId)
          .gte('order_date', prevSince.toISOString()).lt('order_date', sinceISO)
          .not('status', 'in', '(cancelled,refunded)');
        const prevRevenue = (prevOrders || []).reduce((s: number, o: any) => s + parseFloat(o.total_price || 0), 0);
        const changePct   = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue * 100) : null;
        const changeStr   = changePct !== null ? ` (${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}% vs prior period)` : '';

        return {
          analytics_type: 'revenue_summary',
          period: periodLabel,
          revenue,
          orders: count,
          aov,
          previous_period_revenue: prevRevenue,
          change_pct: changePct,
          message: `Revenue ${periodLabel}: $${revenue.toFixed(2)} across ${count} order(s). AOV: $${aov.toFixed(2)}${changeStr}.`,
        };
      }

      // ── top_products ─────────────────────────────────────────────────────────
      if (analyticsType === 'top_products') {
        let q = paidQuery();
        if (action.platform_type) q = q.eq('platform_type', action.platform_type);
        const { data: orders } = await q;

        const productMap: Record<string, { revenue: number; units: number; title: string }> = {};
        for (const order of (orders || [])) {
          for (const item of (order.line_items || [])) {
            const key = item.sku || item.title || 'Unknown';
            if (!productMap[key]) productMap[key] = { revenue: 0, units: 0, title: item.title || key };
            productMap[key].revenue += (item.unit_price || 0) * (item.quantity || 1);
            productMap[key].units   += item.quantity || 1;
          }
        }

        const limit = action.limit || 10;
        const sorted = Object.entries(productMap)
          .sort((a, b) => (action.sort_by === 'units' ? b[1].units - a[1].units : b[1].revenue - a[1].revenue))
          .slice(0, limit)
          .map(([sku, d], i) => ({ rank: i + 1, sku, title: d.title, revenue: parseFloat(d.revenue.toFixed(2)), units: d.units }));

        return {
          analytics_type: 'top_products',
          period: periodLabel,
          products: sorted,
          message: `Top ${sorted.length} products by ${action.sort_by === 'units' ? 'units sold' : 'revenue'} ${periodLabel}.`,
        };
      }

      // ── platform_breakdown ───────────────────────────────────────────────────
      if (analyticsType === 'platform_breakdown') {
        const { data: orders } = await paidQuery();

        const platMap: Record<string, { revenue: number; orders: number }> = {};
        for (const o of (orders || [])) {
          const p = o.platform_type || 'unknown';
          if (!platMap[p]) platMap[p] = { revenue: 0, orders: 0 };
          platMap[p].revenue += parseFloat(o.total_price || 0);
          platMap[p].orders++;
        }
        const total = Object.values(platMap).reduce((s, p) => s + p.revenue, 0);
        const rows  = Object.entries(platMap)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .map(([platform, d]) => ({
            platform,
            revenue: parseFloat(d.revenue.toFixed(2)),
            orders: d.orders,
            share: total > 0 ? `${(d.revenue / total * 100).toFixed(1)}%` : '0%',
          }));

        return {
          analytics_type: 'platform_breakdown',
          period: periodLabel,
          total_revenue: parseFloat(total.toFixed(2)),
          platforms: rows,
          message: `Platform revenue breakdown ${periodLabel}. Total: $${total.toFixed(2)}.`,
        };
      }

      // ── order_trends ─────────────────────────────────────────────────────────
      if (analyticsType === 'order_trends') {
        const { data: orders } = await paidQuery();

        const dayMap: Record<string, { revenue: number; count: number }> = {};
        for (const o of (orders || [])) {
          const day = (o.order_date || o.created_at || '').slice(0, 10);
          if (!day) continue;
          if (!dayMap[day]) dayMap[day] = { revenue: 0, count: 0 };
          dayMap[day].revenue += parseFloat(o.total_price || 0);
          dayMap[day].count++;
        }
        const trend = Object.entries(dayMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, d]) => ({ date, revenue: parseFloat(d.revenue.toFixed(2)), orders: d.count }));

        const bestDay = trend.reduce((best, d) => (!best || d.revenue > best.revenue ? d : best), null as any);
        return {
          analytics_type: 'order_trends',
          period: periodLabel,
          trend,
          best_day: bestDay,
          message: `Daily trends ${periodLabel}: ${trend.length} days with sales.${bestDay ? ` Best day: ${bestDay.date} ($${bestDay.revenue.toFixed(2)})` : ''}`,
        };
      }

      // ── refund_rate ──────────────────────────────────────────────────────────
      if (analyticsType === 'refund_rate') {
        const { data: allOrders } = await coreQuery().select('status,total_price,platform_type');
        const total     = (allOrders || []).length;
        const refunded  = (allOrders || []).filter((o: any) => o.status === 'refunded');
        const cancelled = (allOrders || []).filter((o: any) => o.status === 'cancelled').length;
        const refundedRevenue = refunded.reduce((s: number, o: any) => s + parseFloat(o.total_price || 0), 0);

        return {
          analytics_type: 'refund_rate',
          period: periodLabel,
          total_orders: total,
          refunded_orders: refunded.length,
          cancelled_orders: cancelled,
          refund_rate_pct: total > 0 ? parseFloat((refunded.length / total * 100).toFixed(2)) : 0,
          refunded_revenue: parseFloat(refundedRevenue.toFixed(2)),
          message: `Refund rate ${periodLabel}: ${refunded.length} refunds out of ${total} total orders (${total > 0 ? (refunded.length / total * 100).toFixed(1) : 0}%). $${refundedRevenue.toFixed(2)} refunded.`,
        };
      }

      throw new Error(`Unknown analytics_type "${analyticsType}". Valid: revenue_summary, top_products, platform_breakdown, order_trends, refund_rate`);
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

    // ── WooCommerce update actions ────────────────────────────────────────────

    case 'woo_update_price':
    case 'woo_update_inventory':
    case 'woo_update_title':
    case 'woo_update_description':
    case 'woo_update_tags':
    case 'woo_end_listing':
    case 'woo_renew_listing': {
      const { data: wooUPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'woocommerce').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!wooUPlats || wooUPlats.length === 0) throw new Error('No connected WooCommerce store found.');
      const wooU = wooUPlats[0];
      const { consumer_key, consumer_secret } = wooU.credentials;
      const wooUBase = `${wooU.store_url}/wp-json/wc/v3`;
      const wooUHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${consumer_key}:${consumer_secret}`)}`,
      };

      // Resolve product ID by SKU first, then name search
      let wooProductId: number | null = null;
      let wooProductName = action.product_name || action.title || '';
      if (action.sku && action.sku !== 'N/A') {
        const skuRes = await fetch(`${wooUBase}/products?sku=${encodeURIComponent(action.sku)}&per_page=1`, { headers: wooUHeaders });
        if (skuRes.ok) {
          const skuData = await skuRes.json();
          if (Array.isArray(skuData) && skuData.length > 0) { wooProductId = skuData[0].id; wooProductName = skuData[0].name; }
        }
      }
      if (!wooProductId && action.product_name) {
        const nameRes = await fetch(`${wooUBase}/products?search=${encodeURIComponent(action.product_name)}&per_page=5`, { headers: wooUHeaders });
        if (nameRes.ok) {
          const nameData: any[] = await nameRes.json();
          const match = nameData.find((p: any) => p.name.toLowerCase().includes(action.product_name.toLowerCase()));
          if (match) { wooProductId = match.id; wooProductName = match.name; }
        }
      }
      if (!wooProductId) throw new Error(`Product "${action.product_name || action.sku}" not found in WooCommerce.`);

      let wooBody: Record<string, any> = {};
      if (action.type === 'woo_update_price') {
        wooBody = { regular_price: String(Number(action.price).toFixed(2)) };
      } else if (action.type === 'woo_update_inventory') {
        wooBody = { manage_stock: true, stock_quantity: Number(action.quantity) };
      } else if (action.type === 'woo_update_title') {
        wooBody = { name: action.new_title };
      } else if (action.type === 'woo_update_description') {
        wooBody = { description: action.description };
      } else if (action.type === 'woo_update_tags') {
        const tagList: string[] = Array.isArray(action.tags)
          ? action.tags
          : String(action.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
        wooBody = { tags: tagList.map((t: string) => ({ name: t })) };
      } else if (action.type === 'woo_end_listing') {
        wooBody = { status: 'draft' };
      } else if (action.type === 'woo_renew_listing') {
        wooBody = { status: 'publish' };
      }

      const wooUpdateRes = await fetch(`${wooUBase}/products/${wooProductId}`, {
        method: 'PUT', headers: wooUHeaders, body: JSON.stringify(wooBody),
      });
      if (!wooUpdateRes.ok) throw new Error(`WooCommerce update failed: ${await wooUpdateRes.text()}`);

      const wooMsgs: Record<string, string> = {
        woo_update_price:       `Updated WooCommerce price for "${wooProductName}" → $${action.price}`,
        woo_update_inventory:   `Updated WooCommerce inventory for "${wooProductName}" → ${action.quantity} units`,
        woo_update_title:       `Updated WooCommerce title for "${wooProductName}" → "${action.new_title}"`,
        woo_update_description: `Updated WooCommerce description for "${wooProductName}"`,
        woo_update_tags:        `Updated WooCommerce tags for "${wooProductName}"`,
        woo_end_listing:        `Deactivated WooCommerce product "${wooProductName}" (set to draft)`,
        woo_renew_listing:      `Reactivated WooCommerce product "${wooProductName}" (published)`,
      };
      return { message: wooMsgs[action.type] || 'WooCommerce update complete' };
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

    // ── Ecwid write actions ───────────────────────────────────────────────────

    case 'ecwid_update_inventory':
    case 'ecwid_update_price':
    case 'ecwid_update_title':
    case 'ecwid_update_description': {
      const { data: ecwidPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'ecwid').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!ecwidPlats || ecwidPlats.length === 0) throw new Error('No connected Ecwid store found.');
      const ecwid = ecwidPlats[0];
      const { store_id, access_token: ecwidToken } = ecwid.credentials;
      const ecwidBase = `https://app.ecwid.com/api/v3/${store_id}`;
      const ecwidHeaders = { 'Authorization': `Bearer ${ecwidToken}`, 'Content-Type': 'application/json' };

      // Find the product by name or sku
      const searchQuery = action.sku && action.sku !== 'N/A'
        ? `sku=${encodeURIComponent(action.sku)}`
        : `keyword=${encodeURIComponent(action.product_name || '')}`;
      const searchRes = await fetch(`${ecwidBase}/products?${searchQuery}&limit=5`, { headers: ecwidHeaders });
      if (!searchRes.ok) throw new Error(`Ecwid product search failed: ${await searchRes.text()}`);
      const searchData = await searchRes.json();
      const ecwidProduct = (searchData.items || [])[0];
      if (!ecwidProduct) throw new Error(`Product "${action.product_name || action.sku}" not found in Ecwid.`);
      const productId = ecwidProduct.id;

      if (action.type === 'ecwid_update_inventory') {
        const updateRes = await fetch(`${ecwidBase}/products/${productId}`, {
          method: 'PUT', headers: ecwidHeaders,
          body: JSON.stringify({ quantity: Number(action.quantity) }),
        });
        if (!updateRes.ok) throw new Error(`Ecwid inventory update failed: ${await updateRes.text()}`);
        return { message: `Updated Ecwid inventory for "${ecwidProduct.name}" to ${action.quantity} units` };
      }

      if (action.type === 'ecwid_update_price') {
        const updateRes = await fetch(`${ecwidBase}/products/${productId}`, {
          method: 'PUT', headers: ecwidHeaders,
          body: JSON.stringify({ price: Number(action.price) }),
        });
        if (!updateRes.ok) throw new Error(`Ecwid price update failed: ${await updateRes.text()}`);
        return { message: `Updated Ecwid price for "${ecwidProduct.name}" to $${action.price}` };
      }

      if (action.type === 'ecwid_update_title') {
        const updateRes = await fetch(`${ecwidBase}/products/${productId}`, {
          method: 'PUT', headers: ecwidHeaders,
          body: JSON.stringify({ name: action.new_title }),
        });
        if (!updateRes.ok) throw new Error(`Ecwid title update failed: ${await updateRes.text()}`);
        return { message: `Updated Ecwid title for "${ecwidProduct.name}" → "${action.new_title}"` };
      }

      if (action.type === 'ecwid_update_description') {
        const updateRes = await fetch(`${ecwidBase}/products/${productId}`, {
          method: 'PUT', headers: ecwidHeaders,
          body: JSON.stringify({ description: action.description }),
        });
        if (!updateRes.ok) throw new Error(`Ecwid description update failed: ${await updateRes.text()}`);
        return { message: `Updated Ecwid description for "${ecwidProduct.name}"` };
      }
      break;
    }

    case 'ecwid_create_product': {
      const { data: ecwidPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'ecwid').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!ecwidPlats || ecwidPlats.length === 0) throw new Error('No connected Ecwid store found.');
      const ecwid = ecwidPlats[0];
      const { store_id, access_token: ecwidToken } = ecwid.credentials;
      const ecwidBase = `https://app.ecwid.com/api/v3/${store_id}`;
      const ecwidHeaders = { 'Authorization': `Bearer ${ecwidToken}`, 'Content-Type': 'application/json' };
      const body: any = {
        name: action.title,
        price: Number(action.price) || 0,
        quantity: Number(action.quantity) || 0,
        sku: action.sku || undefined,
        description: action.description || undefined,
        enabled: true,
      };
      const createRes = await fetch(`${ecwidBase}/products`, {
        method: 'POST', headers: ecwidHeaders, body: JSON.stringify(body),
      });
      if (!createRes.ok) throw new Error(`Ecwid product creation failed: ${await createRes.text()}`);
      return { message: `Created Ecwid product: "${action.title}"` };
    }

    case 'ecwid_update_tags':
    case 'ecwid_end_listing':
    case 'ecwid_renew_listing': {
      const { data: ecwidXPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'ecwid').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!ecwidXPlats || ecwidXPlats.length === 0) throw new Error('No connected Ecwid store found.');
      const ecwidX = ecwidXPlats[0];
      const { store_id: ecwidXStoreId, access_token: ecwidXTok } = ecwidX.credentials;
      const ecwidXBase = `https://app.ecwid.com/api/v3/${ecwidXStoreId}`;
      const ecwidXHeaders = { 'Authorization': `Bearer ${ecwidXTok}`, 'Content-Type': 'application/json' };

      const ecwidXQuery = action.sku && action.sku !== 'N/A'
        ? `sku=${encodeURIComponent(action.sku)}`
        : `keyword=${encodeURIComponent(action.product_name || '')}`;
      const ecwidXSearch = await fetch(`${ecwidXBase}/products?${ecwidXQuery}&limit=5`, { headers: ecwidXHeaders });
      if (!ecwidXSearch.ok) throw new Error(`Ecwid product search failed: ${await ecwidXSearch.text()}`);
      const ecwidXFound = ((await ecwidXSearch.json()).items || [])[0];
      if (!ecwidXFound) throw new Error(`Product "${action.product_name || action.sku}" not found in Ecwid.`);

      let ecwidXBody: Record<string, any> = {};
      if (action.type === 'ecwid_update_tags') {
        // Ecwid uses a space-separated `keywords` field for search tags
        const kw = Array.isArray(action.tags)
          ? action.tags.join(' ')
          : String(action.tags || '').split(',').map((t: string) => t.trim()).join(' ');
        ecwidXBody = { keywords: kw };
      } else if (action.type === 'ecwid_end_listing') {
        ecwidXBody = { enabled: false };
      } else if (action.type === 'ecwid_renew_listing') {
        ecwidXBody = { enabled: true };
      }

      const ecwidXUpdate = await fetch(`${ecwidXBase}/products/${ecwidXFound.id}`, {
        method: 'PUT', headers: ecwidXHeaders, body: JSON.stringify(ecwidXBody),
      });
      if (!ecwidXUpdate.ok) throw new Error(`Ecwid update failed: ${await ecwidXUpdate.text()}`);
      const ecwidXMsgs: Record<string, string> = {
        ecwid_update_tags:  `Updated Ecwid search keywords for "${ecwidXFound.name}"`,
        ecwid_end_listing:  `Disabled Ecwid product "${ecwidXFound.name}"`,
        ecwid_renew_listing:`Enabled Ecwid product "${ecwidXFound.name}"`,
      };
      return { message: ecwidXMsgs[action.type] || 'Ecwid update complete' };
    }

    // ── Magento write actions ─────────────────────────────────────────────────

    case 'magento_update_inventory':
    case 'magento_update_price':
    case 'magento_update_title':
    case 'magento_update_description': {
      const { data: magentoPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'magento').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!magentoPlats || magentoPlats.length === 0) throw new Error('No connected Magento store found.');
      const magento = magentoPlats[0];
      const magentoBase = magento.store_url.replace(/\/$/, '');
      const magentoToken = magento.credentials.access_token;
      const magentoHeaders = { 'Authorization': `Bearer ${magentoToken}`, 'Content-Type': 'application/json' };

      // Look up the product by SKU
      const sku = action.sku && action.sku !== 'N/A' ? action.sku : null;
      if (!sku) throw new Error('SKU is required for Magento actions. Ask the user for the product SKU.');
      const encodedSku = encodeURIComponent(sku);

      if (action.type === 'magento_update_inventory') {
        // Magento StockItems API
        const stockRes = await fetch(`${magentoBase}/rest/V1/products/${encodedSku}/stockItems/1`, { headers: magentoHeaders });
        if (!stockRes.ok) throw new Error(`Magento stock lookup failed: ${await stockRes.text()}`);
        const stockData = await stockRes.json();
        const updateRes = await fetch(`${magentoBase}/rest/V1/products/${encodedSku}/stockItems/${stockData.item_id}`, {
          method: 'PUT', headers: magentoHeaders,
          body: JSON.stringify({ stockItem: { qty: Number(action.quantity), is_in_stock: Number(action.quantity) > 0 } }),
        });
        if (!updateRes.ok) throw new Error(`Magento inventory update failed: ${await updateRes.text()}`);
        return { message: `Updated Magento inventory for "${action.product_name || sku}" to ${action.quantity} units` };
      }

      if (action.type === 'magento_update_price') {
        const updateRes = await fetch(`${magentoBase}/rest/V1/products/${encodedSku}`, {
          method: 'PUT', headers: magentoHeaders,
          body: JSON.stringify({ product: { sku, price: Number(action.price) } }),
        });
        if (!updateRes.ok) throw new Error(`Magento price update failed: ${await updateRes.text()}`);
        return { message: `Updated Magento price for "${action.product_name || sku}" to $${action.price}` };
      }

      if (action.type === 'magento_update_title') {
        const updateRes = await fetch(`${magentoBase}/rest/V1/products/${encodedSku}`, {
          method: 'PUT', headers: magentoHeaders,
          body: JSON.stringify({ product: { sku, name: action.new_title } }),
        });
        if (!updateRes.ok) throw new Error(`Magento title update failed: ${await updateRes.text()}`);
        return { message: `Updated Magento title for "${action.product_name || sku}" → "${action.new_title}"` };
      }

      if (action.type === 'magento_update_description') {
        const updateRes = await fetch(`${magentoBase}/rest/V1/products/${encodedSku}`, {
          method: 'PUT', headers: magentoHeaders,
          body: JSON.stringify({ product: { sku, custom_attributes: [{ attribute_code: 'description', value: action.description }] } }),
        });
        if (!updateRes.ok) throw new Error(`Magento description update failed: ${await updateRes.text()}`);
        return { message: `Updated Magento description for "${action.product_name || sku}"` };
      }
      break;
    }

    case 'magento_create_product': {
      const { data: magentoPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'magento').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!magentoPlats || magentoPlats.length === 0) throw new Error('No connected Magento store found.');
      const magento = magentoPlats[0];
      const magentoBase = magento.store_url.replace(/\/$/, '');
      const magentoToken = magento.credentials.access_token;
      const magentoHeaders = { 'Authorization': `Bearer ${magentoToken}`, 'Content-Type': 'application/json' };
      const createBody = {
        product: {
          sku: action.sku || `ORION-${Date.now()}`,
          name: action.title,
          price: Number(action.price) || 0,
          status: 1,
          visibility: 4,
          type_id: 'simple',
          attribute_set_id: 4,
          extension_attributes: { stock_item: { qty: Number(action.quantity) || 0, is_in_stock: true } },
          custom_attributes: action.description
            ? [{ attribute_code: 'description', value: action.description }]
            : [],
        },
      };
      const createRes = await fetch(`${magentoBase}/rest/V1/products`, {
        method: 'POST', headers: magentoHeaders, body: JSON.stringify(createBody),
      });
      if (!createRes.ok) throw new Error(`Magento product creation failed: ${await createRes.text()}`);
      return { message: `Created Magento product: "${action.title}"` };
    }

    case 'magento_end_listing':
    case 'magento_renew_listing': {
      const { data: magentoXPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'magento').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!magentoXPlats || magentoXPlats.length === 0) throw new Error('No connected Magento store found.');
      const magentoX = magentoXPlats[0];
      const magentoXBase = magentoX.store_url.replace(/\/$/, '');
      const magentoXHeaders = { 'Authorization': `Bearer ${magentoX.credentials.access_token}`, 'Content-Type': 'application/json' };
      const magentoXSku = action.sku && action.sku !== 'N/A' ? action.sku : null;
      if (!magentoXSku) throw new Error('SKU is required for Magento actions.');
      const newStatus = action.type === 'magento_end_listing' ? 2 : 1; // 1=enabled, 2=disabled
      const magentoXRes = await fetch(`${magentoXBase}/rest/V1/products/${encodeURIComponent(magentoXSku)}`, {
        method: 'PUT', headers: magentoXHeaders,
        body: JSON.stringify({ product: { sku: magentoXSku, status: newStatus } }),
      });
      if (!magentoXRes.ok) throw new Error(`Magento status update failed: ${await magentoXRes.text()}`);
      return { message: action.type === 'magento_end_listing'
        ? `Disabled Magento product "${action.product_name || magentoXSku}"`
        : `Enabled Magento product "${action.product_name || magentoXSku}"` };
    }

    // ── PrestaShop write actions ──────────────────────────────────────────────

    case 'prestashop_update_inventory':
    case 'prestashop_update_price':
    case 'prestashop_update_title':
    case 'prestashop_update_description':
    case 'prestashop_end_listing':
    case 'prestashop_renew_listing': {
      const { data: psPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'prestashop').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!psPlats || psPlats.length === 0) throw new Error('No connected PrestaShop store found.');
      const ps = psPlats[0];
      const psBase = ps.store_url.replace(/\/$/, '');
      const psEncoded = btoa(`${ps.credentials.api_key}:`);
      const psHeaders = { 'Authorization': `Basic ${psEncoded}`, 'Content-Type': 'application/json' };

      // Look up by reference (SKU) or keyword
      const searchRef = action.sku && action.sku !== 'N/A' ? action.sku : '';
      let psProductId: string | null = null;
      let psCurrentProduct: any = null;

      if (searchRef) {
        const searchRes = await fetch(`${psBase}/api/products?output_format=JSON&filter[reference]=${encodeURIComponent(searchRef)}&display=[id,reference,name]`, { headers: psHeaders });
        if (searchRes.ok) {
          const sd = await searchRes.json();
          psProductId = sd?.products?.[0]?.id?.toString() || null;
        }
      }
      if (!psProductId && action.product_name) {
        const searchRes = await fetch(`${psBase}/api/products?output_format=JSON&filter[name]=%25${encodeURIComponent(action.product_name)}%25&display=[id,name]`, { headers: psHeaders });
        if (searchRes.ok) {
          const sd = await searchRes.json();
          psProductId = sd?.products?.[0]?.id?.toString() || null;
        }
      }
      if (!psProductId) throw new Error(`Product "${action.product_name || action.sku}" not found in PrestaShop.`);

      // Fetch full product XML for PUT
      const getRes = await fetch(`${psBase}/api/products/${psProductId}`, {
        headers: { 'Authorization': `Basic ${psEncoded}`, 'Accept': 'application/xml' },
      });
      if (!getRes.ok) throw new Error(`PrestaShop product fetch failed: ${await getRes.text()}`);
      let productXml = await getRes.text();

      if (action.type === 'prestashop_update_price') {
        productXml = productXml.replace(/<price><!\[CDATA\[.*?\]\]><\/price>/, `<price><![CDATA[${Number(action.price).toFixed(6)}]]></price>`);
        productXml = productXml.replace(/<price>[^<]*<\/price>/, `<price>${Number(action.price).toFixed(6)}</price>`);
      }
      if (action.type === 'prestashop_update_title') {
        productXml = productXml.replace(/(<name>[\s\S]*?<language[^>]*>)[\s\S]*?(<\/language>)/, `$1<![CDATA[${action.new_title}]]>$2`);
      }
      if (action.type === 'prestashop_update_description') {
        productXml = productXml.replace(/(<description>[\s\S]*?<language[^>]*>)[\s\S]*?(<\/language>)/, `$1<![CDATA[${action.description}]]>$2`);
      }
      if (action.type === 'prestashop_end_listing') {
        productXml = productXml.replace(/<active><!\[CDATA\[.*?\]\]><\/active>/, '<active><![CDATA[0]]></active>');
        productXml = productXml.replace(/<active>[^<]*<\/active>/, '<active>0</active>');
      }
      if (action.type === 'prestashop_renew_listing') {
        productXml = productXml.replace(/<active><!\[CDATA\[.*?\]\]><\/active>/, '<active><![CDATA[1]]></active>');
        productXml = productXml.replace(/<active>[^<]*<\/active>/, '<active>1</active>');
      }

      const putRes = await fetch(`${psBase}/api/products/${psProductId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Basic ${psEncoded}`, 'Content-Type': 'application/xml' },
        body: productXml,
      });
      if (!putRes.ok) throw new Error(`PrestaShop update failed: ${await putRes.text()}`);

      if (action.type === 'prestashop_update_inventory') {
        // PrestaShop inventory lives in stock_availables
        const stockRes = await fetch(`${psBase}/api/stock_availables?output_format=JSON&filter[id_product]=${psProductId}&display=[id,quantity]`, { headers: psHeaders });
        if (!stockRes.ok) throw new Error(`PrestaShop stock lookup failed: ${await stockRes.text()}`);
        const stockData = await stockRes.json();
        const stockId = stockData?.stock_availables?.[0]?.id;
        if (!stockId) throw new Error('Could not find PrestaShop stock_available record for this product.');

        const getStockRes = await fetch(`${psBase}/api/stock_availables/${stockId}`, {
          headers: { 'Authorization': `Basic ${psEncoded}`, 'Accept': 'application/xml' },
        });
        if (!getStockRes.ok) throw new Error(`PrestaShop stock fetch failed: ${await getStockRes.text()}`);
        let stockXml = await getStockRes.text();
        stockXml = stockXml.replace(/<quantity>[^<]*<\/quantity>/, `<quantity>${Number(action.quantity)}</quantity>`);
        const updateStockRes = await fetch(`${psBase}/api/stock_availables/${stockId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Basic ${psEncoded}`, 'Content-Type': 'application/xml' },
          body: stockXml,
        });
        if (!updateStockRes.ok) throw new Error(`PrestaShop stock update failed: ${await updateStockRes.text()}`);
        return { message: `Updated PrestaShop inventory for "${action.product_name || action.sku}" to ${action.quantity} units` };
      }

      const labels: Record<string, string> = {
        prestashop_update_price:       `Updated PrestaShop price for "${action.product_name || action.sku}" to $${action.price}`,
        prestashop_update_title:       `Updated PrestaShop title for "${action.product_name || action.sku}" → "${action.new_title}"`,
        prestashop_update_description: `Updated PrestaShop description for "${action.product_name || action.sku}"`,
        prestashop_end_listing:        `Disabled PrestaShop product "${action.product_name || action.sku}"`,
        prestashop_renew_listing:      `Enabled PrestaShop product "${action.product_name || action.sku}"`,
      };
      return { message: labels[action.type] || 'PrestaShop update complete' };
    }

    case 'prestashop_create_product': {
      const { data: psPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'prestashop').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!psPlats || psPlats.length === 0) throw new Error('No connected PrestaShop store found.');
      const ps = psPlats[0];
      const psBase = ps.store_url.replace(/\/$/, '');
      const psEncoded = btoa(`${ps.credentials.api_key}:`);

      // Fetch the blank schema first to get required default fields
      const schemaRes = await fetch(`${psBase}/api/products?schema=blank`, {
        headers: { 'Authorization': `Basic ${psEncoded}`, 'Accept': 'application/xml' },
      });
      if (!schemaRes.ok) throw new Error(`PrestaShop schema fetch failed: ${await schemaRes.text()}`);
      let schema = await schemaRes.text();

      // Fill in required fields
      schema = schema
        .replace(/<name><!\[CDATA\[.*?\]\]><\/name>/, `<name><![CDATA[${action.title}]]></name>`)
        .replace(/<reference><!\[CDATA\[.*?\]\]><\/reference>/, `<reference><![CDATA[${action.sku || ''}]]></reference>`)
        .replace(/<price><!\[CDATA\[.*?\]\]><\/price>/, `<price><![CDATA[${Number(action.price || 0).toFixed(6)}]]></price>`)
        .replace(/<active><!\[CDATA\[.*?\]\]><\/active>/, `<active><![CDATA[1]]></active>`);

      const createRes = await fetch(`${psBase}/api/products`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${psEncoded}`, 'Content-Type': 'application/xml' },
        body: schema,
      });
      if (!createRes.ok) throw new Error(`PrestaShop product creation failed: ${await createRes.text()}`);
      return { message: `Created PrestaShop product: "${action.title}"` };
    }

    case 'prestashop_update_tags': {
      // PrestaShop tags are a separate entity type.  For each tag name we:
      //   1. Search /api/tags for an existing record with that name + language
      //   2. Create a new tag record if none found
      //   3. Collect all resolved tag IDs
      //   4. GET the product XML and replace (or insert) the <tags> block inside <associations>
      //   5. PUT the updated product XML back
      const { data: psTPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'prestashop').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!psTPlats || psTPlats.length === 0) throw new Error('No connected PrestaShop store found.');
      const psT = psTPlats[0];
      const psTBase = psT.store_url.replace(/\/$/, '');
      const psTEncoded = btoa(`${psT.credentials.api_key}:`);
      const psTJsonH = { 'Authorization': `Basic ${psTEncoded}`, 'Content-Type': 'application/json' };

      // 1. Resolve product ID
      const psTRef = action.sku && action.sku !== 'N/A' ? action.sku : '';
      let psTProductId: string | null = null;

      if (psTRef) {
        const sRes = await fetch(`${psTBase}/api/products?output_format=JSON&filter[reference]=${encodeURIComponent(psTRef)}&display=[id]`, { headers: psTJsonH });
        if (sRes.ok) { const sd = await sRes.json(); psTProductId = sd?.products?.[0]?.id?.toString() || null; }
      }
      if (!psTProductId && action.product_name) {
        const sRes = await fetch(`${psTBase}/api/products?output_format=JSON&filter[name]=%25${encodeURIComponent(action.product_name)}%25&display=[id]`, { headers: psTJsonH });
        if (sRes.ok) { const sd = await sRes.json(); psTProductId = sd?.products?.[0]?.id?.toString() || null; }
      }
      if (!psTProductId) throw new Error(`Product "${action.product_name || action.sku}" not found in PrestaShop.`);

      // 2. Resolve / create each tag
      const langId = action.lang_id || 1;
      const tagIds: number[] = [];
      for (const rawTag of (action.tags || [])) {
        const tagName = String(rawTag).trim();
        if (!tagName) continue;

        // Search for existing tag
        const searchRes = await fetch(
          `${psTBase}/api/tags?output_format=JSON&filter[name]=${encodeURIComponent(tagName)}&filter[id_lang]=${langId}&display=[id]`,
          { headers: psTJsonH }
        );
        let tagId: number | null = null;
        if (searchRes.ok) {
          const td = await searchRes.json();
          tagId = td?.tags?.[0]?.id || null;
        }

        if (!tagId) {
          // Create the tag via XML (PrestaShop tags endpoint requires XML)
          const tagXml = `<?xml version="1.0" encoding="UTF-8"?><prestashop xmlns:xlink="http://www.w3.org/1999/xlink"><tag><id_lang>${langId}</id_lang><name><![CDATA[${tagName}]]></name></tag></prestashop>`;
          const createRes = await fetch(`${psTBase}/api/tags`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${psTEncoded}`, 'Content-Type': 'application/xml' },
            body: tagXml,
          });
          if (createRes.ok) {
            const xml = await createRes.text();
            const m = xml.match(/<id>(\d+)<\/id>/);
            if (m) tagId = parseInt(m[1], 10);
          } else {
            console.error(`[prestashop_update_tags] Tag create failed for "${tagName}": ${await createRes.text()}`);
          }
        }
        if (tagId) tagIds.push(tagId);
      }
      if (tagIds.length === 0) throw new Error('No valid tags could be resolved for PrestaShop.');

      // 3. GET product XML and splice in the new <tags> block
      const prodRes = await fetch(`${psTBase}/api/products/${psTProductId}`, {
        headers: { 'Authorization': `Basic ${psTEncoded}`, 'Accept': 'application/xml' },
      });
      if (!prodRes.ok) throw new Error(`PrestaShop product fetch failed: ${await prodRes.text()}`);
      let prodXml = await prodRes.text();

      const tagNodes = tagIds.map(id => `<tag><id>${id}</id></tag>`).join('');
      const newTagsBlock = `<tags nodeType="tag" api="tags">${tagNodes}</tags>`;

      if (/<tags[^>]*>[\s\S]*?<\/tags>/.test(prodXml)) {
        prodXml = prodXml.replace(/<tags[^>]*>[\s\S]*?<\/tags>/, newTagsBlock);
      } else {
        // Insert before </associations>; if no associations block, append before </product>
        if (prodXml.includes('</associations>')) {
          prodXml = prodXml.replace('</associations>', `${newTagsBlock}</associations>`);
        } else {
          prodXml = prodXml.replace('</product>', `<associations>${newTagsBlock}</associations></product>`);
        }
      }

      // 4. PUT updated product
      const putRes = await fetch(`${psTBase}/api/products/${psTProductId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Basic ${psTEncoded}`, 'Content-Type': 'application/xml' },
        body: prodXml,
      });
      if (!putRes.ok) throw new Error(`PrestaShop tag update failed: ${await putRes.text()}`);

      return { message: `Updated tags for "${action.product_name || action.sku}" on PrestaShop: ${(action.tags || []).join(', ')}` };
    }

    // ── Wish write actions ────────────────────────────────────────────────────

    case 'wish_update_inventory':
    case 'wish_update_price': {
      const { data: wishPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'wish').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!wishPlats || wishPlats.length === 0) throw new Error('No connected Wish store found.');
      const wish = wishPlats[0];
      const wishToken = wish.credentials.access_token;

      if (!action.sku || action.sku === 'N/A') throw new Error('SKU is required for Wish actions.');

      if (action.type === 'wish_update_inventory') {
        const params = new URLSearchParams({ access_token: wishToken, sku: action.sku, inventory: String(Number(action.quantity)) });
        const updateRes = await fetch(`https://merchant.wish.com/api/v3/variant/update?${params}`, { method: 'POST' });
        if (!updateRes.ok) throw new Error(`Wish inventory update failed: ${await updateRes.text()}`);
        const data = await updateRes.json();
        if (data.code !== 0) throw new Error(data.message || 'Wish API error');
        return { message: `Updated Wish inventory for SKU "${action.sku}" to ${action.quantity} units` };
      }

      if (action.type === 'wish_update_price') {
        const params = new URLSearchParams({ access_token: wishToken, sku: action.sku, price: String(Number(action.price)) });
        const updateRes = await fetch(`https://merchant.wish.com/api/v3/variant/update?${params}`, { method: 'POST' });
        if (!updateRes.ok) throw new Error(`Wish price update failed: ${await updateRes.text()}`);
        const data = await updateRes.json();
        if (data.code !== 0) throw new Error(data.message || 'Wish API error');
        return { message: `Updated Wish price for SKU "${action.sku}" to $${action.price}` };
      }
      break;
    }

    case 'wish_update_title':
    case 'wish_update_description':
    case 'wish_update_tags':
    case 'wish_end_listing':
    case 'wish_renew_listing': {
      const { data: wishXPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'wish').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!wishXPlats || wishXPlats.length === 0) throw new Error('No connected Wish store found.');
      const wishXToken = wishXPlats[0].credentials.access_token;
      if (!action.sku || action.sku === 'N/A') throw new Error('SKU (parent_sku) is required for Wish actions.');

      const wishXParams = new URLSearchParams({ access_token: wishXToken, parent_sku: action.sku });
      if (action.type === 'wish_update_title') {
        wishXParams.set('name', action.new_title);
      } else if (action.type === 'wish_update_description') {
        wishXParams.set('description', action.description);
      } else if (action.type === 'wish_update_tags') {
        const tagStr = Array.isArray(action.tags) ? action.tags.join(',') : String(action.tags || '');
        wishXParams.set('tags', tagStr);
      } else if (action.type === 'wish_end_listing') {
        wishXParams.set('enabled', 'false');
      } else if (action.type === 'wish_renew_listing') {
        wishXParams.set('enabled', 'true');
      }

      const wishXRes = await fetch(`https://merchant.wish.com/api/v3/product/update?${wishXParams}`, { method: 'POST' });
      if (!wishXRes.ok) throw new Error(`Wish update failed: ${await wishXRes.text()}`);
      const wishXData = await wishXRes.json();
      if (wishXData.code !== 0) throw new Error(wishXData.message || 'Wish API error');

      const wishXMsgs: Record<string, string> = {
        wish_update_title:       `Updated Wish title for SKU "${action.sku}"`,
        wish_update_description: `Updated Wish description for SKU "${action.sku}"`,
        wish_update_tags:        `Updated Wish tags for SKU "${action.sku}"`,
        wish_end_listing:        `Disabled Wish product SKU "${action.sku}"`,
        wish_renew_listing:      `Enabled Wish product SKU "${action.sku}"`,
      };
      return { message: wishXMsgs[action.type] || 'Wish update complete' };
    }

    // ── Walmart write actions ─────────────────────────────────────────────────

    case 'walmart_update_inventory':
    case 'walmart_update_price': {
      const { data: walmartPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'walmart').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!walmartPlats || walmartPlats.length === 0) throw new Error('No connected Walmart store found.');
      const walmart = walmartPlats[0];
      const { client_id, client_secret } = walmart.credentials;

      // Get a fresh access token
      const tokenCreds = btoa(`${client_id}:${client_secret}`);
      const tokenRes = await fetch('https://marketplace.walmartapis.com/v3/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${tokenCreds}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'WM_SVC.NAME': 'Walmart Marketplace',
          'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
          'Accept': 'application/json',
        },
        body: 'grant_type=client_credentials',
      });
      if (!tokenRes.ok) throw new Error(`Could not authenticate with Walmart: ${await tokenRes.text()}`);
      const tokenData = await tokenRes.json();
      const walmartToken = tokenData.access_token;

      const sku = action.sku && action.sku !== 'N/A' ? action.sku : null;
      if (!sku) throw new Error('SKU is required for Walmart actions.');

      const walmartHeaders: Record<string, string> = {
        'Authorization': `Bearer ${walmartToken}`,
        'WM_SVC.NAME': 'Walmart Marketplace',
        'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
        'Accept': 'application/json',
        'Content-Type': 'application/xml',
      };

      if (action.type === 'walmart_update_inventory') {
        const inventoryXml = `<?xml version="1.0" encoding="UTF-8"?><inventory xmlns="http://walmart.com/"><sku>${sku}</sku><quantity><unit>EACH</unit><amount>${Number(action.quantity)}</amount></quantity><fulfillmentLagTime>1</fulfillmentLagTime></inventory>`;
        const updateRes = await fetch(`https://marketplace.walmartapis.com/v3/inventory?sku=${encodeURIComponent(sku)}`, {
          method: 'PUT', headers: walmartHeaders, body: inventoryXml,
        });
        if (!updateRes.ok) throw new Error(`Walmart inventory update failed: ${await updateRes.text()}`);
        return { message: `Updated Walmart inventory for SKU "${sku}" to ${action.quantity} units` };
      }

      if (action.type === 'walmart_update_price') {
        const priceXml = `<?xml version="1.0" encoding="UTF-8"?><Price xmlns="http://walmart.com/"><itemIdentifier><sku>${sku}</sku></itemIdentifier><pricingList><pricing><currentPrice><value currency="USD" amount="${Number(action.price).toFixed(2)}"/></currentPrice><currentPriceType>BASE</currentPriceType></pricing></pricingList></Price>`;
        const updateRes = await fetch(`https://marketplace.walmartapis.com/v3/price`, {
          method: 'PUT', headers: walmartHeaders, body: priceXml,
        });
        if (!updateRes.ok) throw new Error(`Walmart price update failed: ${await updateRes.text()}`);
        return { message: `Updated Walmart price for SKU "${sku}" to $${action.price}` };
      }
      break;
    }

    case 'walmart_update_title':
    case 'walmart_update_description':
    case 'walmart_end_listing': {
      const { data: walmartXPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'walmart').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!walmartXPlats || walmartXPlats.length === 0) throw new Error('No connected Walmart store found.');
      const walmartX = walmartXPlats[0];
      const { client_id: wXClientId, client_secret: wXClientSecret } = walmartX.credentials;
      const wXTokenRes = await fetch('https://marketplace.walmartapis.com/v3/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${wXClientId}:${wXClientSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'WM_SVC.NAME': 'Walmart Marketplace',
          'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
          'Accept': 'application/json',
        },
        body: 'grant_type=client_credentials',
      });
      if (!wXTokenRes.ok) throw new Error(`Could not authenticate with Walmart: ${await wXTokenRes.text()}`);
      const wXToken = (await wXTokenRes.json()).access_token;
      const wXSku = action.sku && action.sku !== 'N/A' ? action.sku : null;
      if (!wXSku) throw new Error('SKU is required for Walmart actions.');

      const wXHeaders: Record<string, string> = {
        'Authorization': `Bearer ${wXToken}`,
        'WM_SVC.NAME': 'Walmart Marketplace',
        'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
        'Accept': 'application/json',
        'Content-Type': 'application/xml',
      };

      if (action.type === 'walmart_end_listing') {
        // Retire the item — removes it from Walmart storefront
        const retireRes = await fetch(`https://marketplace.walmartapis.com/v3/items/retirement`, {
          method: 'PUT',
          headers: { ...wXHeaders, 'Content-Type': 'application/xml' },
          body: `<?xml version="1.0" encoding="UTF-8"?><ItemRetirement xmlns="http://walmart.com/"><sku>${wXSku}</sku></ItemRetirement>`,
        });
        if (!retireRes.ok) throw new Error(`Walmart retire failed: ${await retireRes.text()}`);
        return { message: `Retired Walmart listing SKU "${wXSku}"` };
      }

      // Title and description updates use the MP Items maintenance feed
      const productName = action.type === 'walmart_update_title' ? action.new_title : action.product_name || wXSku;
      const shortDesc = action.type === 'walmart_update_description' ? action.description : '';
      const itemXml = `<?xml version="1.0" encoding="UTF-8"?><MPItemFeed xmlns="http://walmart.com/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><MPItem><sku>${wXSku}</sku><productIdentifiers><productIdentifier><productIdType>SKU</productIdType><productId>${wXSku}</productId></productIdentifier></productIdentifiers>${action.type === 'walmart_update_title' ? `<productName>${productName}</productName>` : ''}${action.type === 'walmart_update_description' ? `<shortDescription>${shortDesc}</shortDescription>` : ''}</MPItem></MPItemFeed>`;
      const wXUpdateRes = await fetch('https://marketplace.walmartapis.com/v3/feeds?feedType=MP_ITEM', {
        method: 'POST', headers: { ...wXHeaders, 'Content-Type': 'application/xml' }, body: itemXml,
      });
      if (!wXUpdateRes.ok) throw new Error(`Walmart item update failed: ${await wXUpdateRes.text()}`);
      return { message: action.type === 'walmart_update_title'
        ? `Submitted Walmart title update for SKU "${wXSku}" (feed processing may take a few minutes)`
        : `Submitted Walmart description update for SKU "${wXSku}" (feed processing may take a few minutes)` };
    }

    case 'etsy_update_price':
    case 'etsy_update_inventory':
    case 'etsy_update_title':
    case 'etsy_update_description':
    case 'etsy_update_tags':
    case 'etsy_end_listing':
    case 'etsy_renew_listing': {
      const { data: etsyPlats } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'etsy').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!etsyPlats || etsyPlats.length === 0) throw new Error('No connected Etsy shop found.');
      const etsyPlat = etsyPlats[0];
      const etsyTok = etsyPlat.credentials?.access_token;
      const etsyShopId = etsyPlat.metadata?.shop_id;
      const etsyClientId = Deno.env.get('ETSY_CLIENT_ID');
      if (!etsyTok || !etsyShopId || !etsyClientId) throw new Error('Etsy credentials or shop_id missing.');

      // Resolve listing_id: prefer direct listing_id, fall back to searching by title/sku
      let listingId = action.listing_id;
      if (!listingId && (action.product_name || action.sku)) {
        const searchRes = await fetch(
          `https://openapi.etsy.com/v3/application/shops/${etsyShopId}/listings?limit=100&state=active`,
          { headers: { 'x-api-key': etsyClientId, 'Authorization': `Bearer ${etsyTok}` } }
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const found = (searchData.results || []).find((l: any) =>
            (action.product_name && l.title?.toLowerCase().includes(action.product_name.toLowerCase())) ||
            (action.sku && l.sku?.includes(action.sku))
          );
          if (found) listingId = found.listing_id;
        }
        if (!listingId) throw new Error(`Could not find Etsy listing matching "${action.product_name || action.sku}".`);
      }
      if (!listingId) throw new Error('listing_id or product_name/sku required for Etsy actions.');

      const etsyHeaders: Record<string, string> = {
        'x-api-key': etsyClientId,
        'Authorization': `Bearer ${etsyTok}`,
        'Content-Type': 'application/json',
      };

      if (action.type === 'etsy_update_price') {
        // Etsy price is stored in listing as a float (not subunits)
        const updateRes = await fetch(
          `https://openapi.etsy.com/v3/application/shops/${etsyShopId}/listings/${listingId}`,
          { method: 'PATCH', headers: etsyHeaders, body: JSON.stringify({ price: Number(action.price) }) }
        );
        if (!updateRes.ok) throw new Error(`Etsy price update failed: ${await updateRes.text()}`);
        return { message: `Updated Etsy listing #${listingId} price to $${action.price}` };
      }

      if (action.type === 'etsy_update_inventory') {
        // Etsy uses a separate inventory endpoint for quantity
        const invRes = await fetch(
          `https://openapi.etsy.com/v3/application/listings/${listingId}/inventory`,
          { headers: etsyHeaders }
        );
        if (!invRes.ok) throw new Error(`Could not fetch Etsy listing inventory: ${await invRes.text()}`);
        const invData = await invRes.json();
        // Update each product offering quantity
        const offerings = (invData.products || []).map((prod: any) => ({
          ...prod,
          offerings: (prod.offerings || []).map((o: any) => ({ ...o, quantity: Number(action.quantity) })),
        }));
        const updateRes = await fetch(
          `https://openapi.etsy.com/v3/application/listings/${listingId}/inventory`,
          { method: 'PUT', headers: etsyHeaders, body: JSON.stringify({ products: offerings }) }
        );
        if (!updateRes.ok) throw new Error(`Etsy inventory update failed: ${await updateRes.text()}`);
        return { message: `Updated Etsy listing #${listingId} quantity to ${action.quantity} units` };
      }

      if (action.type === 'etsy_update_title') {
        const updateRes = await fetch(
          `https://openapi.etsy.com/v3/application/shops/${etsyShopId}/listings/${listingId}`,
          { method: 'PATCH', headers: etsyHeaders, body: JSON.stringify({ title: action.title }) }
        );
        if (!updateRes.ok) throw new Error(`Etsy title update failed: ${await updateRes.text()}`);
        return { message: `Updated Etsy listing #${listingId} title to "${action.title}"` };
      }

      if (action.type === 'etsy_update_description') {
        const updateRes = await fetch(
          `https://openapi.etsy.com/v3/application/shops/${etsyShopId}/listings/${listingId}`,
          { method: 'PATCH', headers: etsyHeaders, body: JSON.stringify({ description: action.description }) }
        );
        if (!updateRes.ok) throw new Error(`Etsy description update failed: ${await updateRes.text()}`);
        return { message: `Updated Etsy listing #${listingId} description` };
      }

      if (action.type === 'etsy_update_tags') {
        // Etsy allows up to 13 tags; tags must be lowercase, no special chars
        const tags: string[] = Array.isArray(action.tags)
          ? action.tags.slice(0, 13)
          : String(action.tags).split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean).slice(0, 13);
        const updateRes = await fetch(
          `https://openapi.etsy.com/v3/application/shops/${etsyShopId}/listings/${listingId}`,
          { method: 'PATCH', headers: etsyHeaders, body: JSON.stringify({ tags }) }
        );
        if (!updateRes.ok) throw new Error(`Etsy tags update failed: ${await updateRes.text()}`);
        return { message: `Updated Etsy listing #${listingId} tags: ${tags.join(', ')}` };
      }

      if (action.type === 'etsy_end_listing') {
        const updateRes = await fetch(
          `https://openapi.etsy.com/v3/application/shops/${etsyShopId}/listings/${listingId}`,
          { method: 'PATCH', headers: etsyHeaders, body: JSON.stringify({ state: 'inactive' }) }
        );
        if (!updateRes.ok) throw new Error(`Etsy end listing failed: ${await updateRes.text()}`);
        return { message: `Deactivated Etsy listing #${listingId}` };
      }

      if (action.type === 'etsy_renew_listing') {
        const updateRes = await fetch(
          `https://openapi.etsy.com/v3/application/shops/${etsyShopId}/listings/${listingId}`,
          { method: 'PATCH', headers: etsyHeaders, body: JSON.stringify({ state: 'active' }) }
        );
        if (!updateRes.ok) throw new Error(`Etsy renew listing failed: ${await updateRes.text()}`);
        return { message: `Reactivated Etsy listing #${listingId}` };
      }
      break;
    }

    case 'etsy_create_listing': {
      const { data: etsyPlatsC } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'etsy').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!etsyPlatsC || etsyPlatsC.length === 0) throw new Error('No connected Etsy shop found.');
      const etsyPlatC = etsyPlatsC[0];
      const etsyTokC = etsyPlatC.credentials?.access_token;
      const etsyShopIdC = etsyPlatC.metadata?.shop_id;
      const etsyClientIdC = Deno.env.get('ETSY_CLIENT_ID');
      if (!etsyTokC || !etsyShopIdC || !etsyClientIdC) throw new Error('Etsy credentials or shop_id missing.');

      const {
        title, description, price, quantity = 1, sku, tags,
        who_made = 'i_did', when_made = 'made_to_order', taxonomy_id = 69, state = 'draft',
      } = action;
      if (!title || !description || price == null) {
        throw new Error('etsy_create_listing requires title, description, and price.');
      }

      const createBody: Record<string, any> = {
        title,
        description,
        price: Number(price),
        quantity: Number(quantity),
        who_made,
        when_made,
        taxonomy_id: Number(taxonomy_id),
        state,
      };
      if (sku) createBody.sku = sku;
      if (Array.isArray(tags) && tags.length > 0) createBody.tags = tags.slice(0, 13);

      const createRes = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${etsyShopIdC}/listings`,
        {
          method: 'POST',
          headers: {
            'x-api-key': etsyClientIdC,
            'Authorization': `Bearer ${etsyTokC}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(createBody),
        }
      );
      if (!createRes.ok) throw new Error(`Etsy create listing failed: ${await createRes.text()}`);
      const newListing = await createRes.json();

      await supabaseClient.from('products').upsert({
        user_id: userId,
        platform_type: 'etsy',
        title,
        sku: sku || `etsy-${newListing.listing_id}`,
        price: Number(price),
        inventory_quantity: Number(quantity),
        status: state === 'active' ? 'active' : 'draft',
        vendor: '',
        product_type: '',
      }, { onConflict: 'user_id,platform_type,sku', ignoreDuplicates: false });

      return { message: `Created Etsy listing "${title}" (ID: ${newListing.listing_id})`, listing_id: newListing.listing_id };
    }

    case 'etsy_bulk_create_listings': {
      const { data: etsyPlatsB } = await supabaseClient.from('platforms').select('*')
        .eq('user_id', userId).eq('platform_type', 'etsy').or('is_active.eq.true,status.eq.connected').limit(1);
      if (!etsyPlatsB || etsyPlatsB.length === 0) throw new Error('No connected Etsy shop found.');
      const etsyPlatB = etsyPlatsB[0];
      const etsyTokB = etsyPlatB.credentials?.access_token;
      const etsyShopIdB = etsyPlatB.metadata?.shop_id;
      const etsyClientIdB = Deno.env.get('ETSY_CLIENT_ID');
      if (!etsyTokB || !etsyShopIdB || !etsyClientIdB) throw new Error('Etsy credentials or shop_id missing.');

      const bulkListings: any[] = Array.isArray(action.listings) ? action.listings : [];
      if (bulkListings.length === 0) throw new Error('etsy_bulk_create_listings requires a non-empty listings array.');

      const etsyHeadersB: Record<string, string> = {
        'x-api-key': etsyClientIdB,
        'Authorization': `Bearer ${etsyTokB}`,
        'Content-Type': 'application/json',
      };

      const bulkResults: { title: string; listing_id?: number; error?: string }[] = [];
      const productRows: any[] = [];

      for (const listing of bulkListings) {
        const {
          title, description, price, quantity = 1, sku, tags,
          who_made = 'i_did', when_made = 'made_to_order', taxonomy_id = 69, state = 'draft',
        } = listing;
        if (!title || !description || price == null) {
          bulkResults.push({ title: title || 'unknown', error: 'Missing required fields (title, description, price)' });
          continue;
        }
        const bulkBody: Record<string, any> = {
          title,
          description,
          price: Number(price),
          quantity: Number(quantity),
          who_made,
          when_made,
          taxonomy_id: Number(taxonomy_id),
          state,
        };
        if (sku) bulkBody.sku = sku;
        if (Array.isArray(tags) && tags.length > 0) bulkBody.tags = tags.slice(0, 13);

        try {
          const res = await fetch(
            `https://openapi.etsy.com/v3/application/shops/${etsyShopIdB}/listings`,
            { method: 'POST', headers: etsyHeadersB, body: JSON.stringify(bulkBody) }
          );
          if (!res.ok) {
            bulkResults.push({ title, error: `HTTP ${res.status}: ${await res.text()}` });
          } else {
            const created = await res.json();
            bulkResults.push({ title, listing_id: created.listing_id });
            productRows.push({
              user_id: userId,
              platform_type: 'etsy',
              title,
              sku: sku || `etsy-${created.listing_id}`,
              price: Number(price),
              inventory_quantity: Number(quantity),
              status: state === 'active' ? 'active' : 'draft',
              vendor: '',
              product_type: '',
            });
          }
        } catch (e: any) {
          bulkResults.push({ title, error: e.message });
        }
      }

      if (productRows.length > 0) {
        await supabaseClient.from('products').upsert(productRows, {
          onConflict: 'user_id,platform_type,sku',
          ignoreDuplicates: false,
        });
      }

      const successCount = bulkResults.filter(r => !r.error).length;
      const failCount = bulkResults.filter(r => r.error).length;
      return {
        message: `Bulk created ${successCount} Etsy listing(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
        results: bulkResults,
      };
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
          const imageCount = (p.images || []).length;
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
            image_count: imageCount,
            has_images: imageCount > 0,
            image_url: (p.images || [])[0]?.src || null,
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

  // Fetch live products from Ecwid, Magento, PrestaShop, Wish, Walmart, Etsy
  for (const platform of (platforms || [])) {
    const pt = platform.platform_type;
    if (!['ecwid', 'magento', 'prestashop', 'wish', 'walmart', 'etsy'].includes(pt)) continue;
    try {
      if (pt === 'ecwid') {
        const { store_id, access_token: tok } = platform.credentials;
        const res = await fetch(`https://app.ecwid.com/api/v3/${store_id}/products?limit=100`, {
          headers: { 'Authorization': `Bearer ${tok}` },
        });
        if (res.ok) {
          const data = await res.json();
          for (const p of (data.items || [])) {
            products.push({
              id: `ecwid-${p.id}`,
              title: p.name || 'Unnamed',
              sku: p.sku || 'N/A',
              price: p.price || 0,
              inventory_quantity: p.quantity ?? 0,
              status: p.enabled ? 'active' : 'draft',
              vendor: '',
              product_type: p.categoryIds?.[0]?.toString() || '',
              tags: '',
              platform_type: 'ecwid',
            });
            productCount++;
          }
        }
      } else if (pt === 'magento') {
        const magentoBase = platform.store_url.replace(/\/$/, '');
        const tok = platform.credentials.access_token;
        const res = await fetch(`${magentoBase}/rest/V1/products?searchCriteria[pageSize]=100`, {
          headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          for (const p of (data.items || [])) {
            const stockAttr = p.extension_attributes?.stock_item;
            products.push({
              id: `magento-${p.id}`,
              title: p.name || 'Unnamed',
              sku: p.sku || 'N/A',
              price: p.price || 0,
              inventory_quantity: stockAttr?.qty ?? 0,
              status: p.status === 1 ? 'active' : 'draft',
              vendor: '',
              product_type: p.type_id || '',
              tags: '',
              platform_type: 'magento',
            });
            productCount++;
          }
        }
      } else if (pt === 'prestashop') {
        const psBase = platform.store_url.replace(/\/$/, '');
        const psEncoded = btoa(`${platform.credentials.api_key}:`);
        const res = await fetch(`${psBase}/api/products?output_format=JSON&display=[id,name,reference,price,active]&limit=100`, {
          headers: { 'Authorization': `Basic ${psEncoded}` },
        });
        if (res.ok) {
          const data = await res.json();
          for (const p of (data.products || [])) {
            const name = Array.isArray(p.name) ? p.name[0]?.value : p.name || 'Unnamed';
            products.push({
              id: `prestashop-${p.id}`,
              title: name,
              sku: p.reference || 'N/A',
              price: parseFloat(p.price) || 0,
              inventory_quantity: 0, // Stock fetched separately; keep 0 for context display
              status: p.active === '1' ? 'active' : 'draft',
              vendor: '',
              product_type: '',
              tags: '',
              platform_type: 'prestashop',
            });
            productCount++;
          }
        }
      } else if (pt === 'wish') {
        const wishToken = platform.credentials.access_token;
        const res = await fetch(`https://merchant.wish.com/api/v3/product/multi-get?access_token=${encodeURIComponent(wishToken)}&limit=50&offset=0`);
        if (res.ok) {
          const data = await res.json();
          if (data.code === 0) {
            for (const p of (data.data || [])) {
              const variants = p.variants || [];
              const totalQty = variants.reduce((s: number, v: any) => s + (v.inventory || 0), 0);
              products.push({
                id: `wish-${p.id}`,
                title: p.name || 'Unnamed',
                sku: variants[0]?.sku || 'N/A',
                price: variants[0]?.price || 0,
                inventory_quantity: totalQty,
                status: p.is_enabled ? 'active' : 'draft',
                vendor: '',
                product_type: '',
                tags: '',
                platform_type: 'wish',
              });
              productCount++;
            }
          }
        }
      } else if (pt === 'walmart') {
        const { client_id, client_secret } = platform.credentials;
        const tokenCreds = btoa(`${client_id}:${client_secret}`);
        const tokenRes = await fetch('https://marketplace.walmartapis.com/v3/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${tokenCreds}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'WM_SVC.NAME': 'Walmart Marketplace',
            'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
            'Accept': 'application/json',
          },
          body: 'grant_type=client_credentials',
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const walmartToken = tokenData.access_token;
          const itemsRes = await fetch('https://marketplace.walmartapis.com/v3/items?limit=100', {
            headers: {
              'Authorization': `Bearer ${walmartToken}`,
              'WM_SVC.NAME': 'Walmart Marketplace',
              'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
              'Accept': 'application/json',
            },
          });
          if (itemsRes.ok) {
            const itemsData = await itemsRes.json();
            for (const p of (itemsData.ItemResponse || [])) {
              products.push({
                id: `walmart-${p.sku}`,
                title: p.productName || p.sku || 'Unnamed',
                sku: p.sku || 'N/A',
                price: parseFloat(p.price?.amount || '0') || 0,
                inventory_quantity: 0,
                status: p.publishedStatus === 'PUBLISHED' ? 'active' : 'draft',
                vendor: p.brand || '',
                product_type: p.productType || '',
                tags: '',
                platform_type: 'walmart',
              });
              productCount++;
            }
          }
        }
      } else if (pt === 'etsy') {
        const shopId = platform.metadata?.shop_id;
        const tok = platform.credentials?.access_token;
        const clientId = Deno.env.get('ETSY_CLIENT_ID');
        if (shopId && tok && clientId) {
          const res = await fetch(
            `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=100&includes=Images,MainImage`,
            { headers: { 'x-api-key': clientId, 'Authorization': `Bearer ${tok}` } }
          );
          if (res.ok) {
            const data = await res.json();
            for (const l of (data.results || [])) {
              const price = l.price?.amount != null ? l.price.amount / (l.price.divisor || 100) : 0;
              const images = l.images || (l.main_image ? [l.main_image] : []);
              const imageCount = images.length;
              const imageUrl = images[0]?.url_570xN || images[0]?.url_fullxfull || null;
              products.push({
                id: `etsy-${l.listing_id}`,
                title: l.title || 'Unnamed',
                sku: l.sku?.[0] || `etsy-${l.listing_id}`,
                price,
                inventory_quantity: l.quantity || 0,
                status: l.state === 'active' ? 'active' : 'draft',
                vendor: '',
                product_type: l.taxonomy_path?.[0] || '',
                tags: (l.tags || []).join(', '),
                body_html: l.description ? l.description.slice(0, 150) : '',
                image_count: imageCount,
                has_images: imageCount > 0,
                image_url: imageUrl,
                platform_type: 'etsy',
                listing_id: l.listing_id,
              });
              productCount++;
            }
          }
        }
      }
    } catch (e: any) {
      console.warn(`[Orion] ${pt} product fetch failed:`, e.message);
    }
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

  // Fetch live Etsy orders (receipts) for any connected Etsy platform
  const etsyOrders: any[] = [];
  for (const platform of (platforms || [])) {
    if (platform.platform_type !== 'etsy') continue;
    const shopId = platform.metadata?.shop_id;
    const tok = platform.credentials?.access_token;
    const clientId = Deno.env.get('ETSY_CLIENT_ID');
    if (!shopId || !tok || !clientId) continue;
    try {
      const receiptsRes = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${shopId}/receipts?limit=50`,
        { headers: { 'x-api-key': clientId, 'Authorization': `Bearer ${tok}` } }
      );
      if (receiptsRes.ok) {
        const receiptsData = await receiptsRes.json();
        for (const r of (receiptsData.results || [])) {
          etsyOrders.push({
            order_id: `etsy-${r.receipt_id}`,
            order_number: r.receipt_id,
            customer_name: r.name || 'Etsy Customer',
            customer_email: r.buyer_email || '',
            total_price: (r.grandtotal?.amount || 0) / (r.grandtotal?.divisor || 100),
            status: r.status === 'paid' ? 'processing' : r.status === 'completed' ? 'delivered' : r.status,
            platform: 'Etsy',
            order_date: r.created_timestamp ? new Date(r.created_timestamp * 1000).toISOString() : null,
            created_at: r.created_timestamp ? new Date(r.created_timestamp * 1000).toISOString() : null,
            fulfillment_status: r.is_shipped ? 'fulfilled' : 'unfulfilled',
            line_items: (r.transactions || []).map((t: any) => ({
              title: t.title || 'Item',
              quantity: t.quantity || 1,
              price: (t.price?.amount || 0) / (t.price?.divisor || 100),
            })),
          });
        }
      }
    } catch (e: any) {
      console.warn('[Orion] Etsy receipts fetch failed:', e.message);
    }
  }

  // Merge eBay orders with DB orders and Etsy orders
  const ebayOrders = (platforms || []).flatMap((p: any) => p._ebayOrders || []);
  const orders = [...(dbOrders || []), ...ebayOrders, ...etsyOrders];
  const totalOrders = (orderCount || 0) + ebayOrders.length + etsyOrders.length;

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total_price) || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // 30-day revenue snapshot from the orders table (gives Orion grounded recent metrics)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: last30Orders } = await supabaseClient
    .from('orders').select('total_price,status,platform_type,order_date')
    .eq('user_id', userId).gte('order_date', thirtyDaysAgo)
    .not('status', 'in', '(cancelled,refunded)');
  const { data: last7Orders } = await supabaseClient
    .from('orders').select('total_price,platform_type')
    .eq('user_id', userId).gte('order_date', sevenDaysAgo)
    .not('status', 'in', '(cancelled,refunded)');

  const rev30 = (last30Orders || []).reduce((s: number, o: any) => s + parseFloat(o.total_price || 0), 0);
  const rev7  = (last7Orders  || []).reduce((s: number, o: any) => s + parseFloat(o.total_price || 0), 0);
  const cnt30 = (last30Orders || []).length;
  const cnt7  = (last7Orders  || []).length;

  // Revenue by platform (last 30 days)
  const platformRevMap: Record<string, number> = {};
  for (const o of (last30Orders || [])) {
    const p = o.platform_type || 'unknown';
    platformRevMap[p] = (platformRevMap[p] || 0) + parseFloat(o.total_price || 0);
  }
  const platformRevBreakdown = Object.entries(platformRevMap)
    .sort((a, b) => b[1] - a[1])
    .map(([platform, revenue]) => `${platform}: $${revenue.toFixed(2)}`).join(', ');

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
      revenue_last_30d: rev30,
      revenue_last_7d: rev7,
      orders_last_30d: cnt30,
      orders_last_7d: cnt7,
      revenue_by_platform_30d: platformRevBreakdown,
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
      const images = p.image_count != null
        ? ` | Images: ${p.image_count > 0 ? `${p.image_count} ✓` : '0 ❌'}`
        : '';
      return `  - ${name} | SKU: ${sku} | Price: ${price} | Stock: ${stock}${vendor ? ` | Vendor: ${vendor}` : ''}${type ? ` | Type: ${type}` : ''}${status ? ` | Status: ${status}` : ''}${handle}${images}`;
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
- You CAN: Execute store actions on eBay — create listings, update inventory quantities, update prices, update listing titles, update listing descriptions, update listing images, end listings (remove from eBay), relist ended listings, update item specifics
- You CAN: Execute store actions on TikTok Shop — create products, update price/inventory/title/description, deactivate/reactivate listings
- You CAN: Execute store actions on WooCommerce, Ecwid, Magento, PrestaShop, Wish, Walmart, Etsy — full product management on all connected platforms
- You CAN: Manage orders across all platforms — sync orders, mark as fulfilled with tracking, cancel orders, process refunds
- You CANNOT: Log into any platform or request credentials — NEVER ask for passwords, API keys, or admin access. You already have the integration through Tandril.
- You CANNOT: Process credit card payments or initiate charges outside of the platform's own payment system
- ⚠️ For partial refunds (specific line items or amounts), direct the user to their platform dashboard — only full-order refunds are supported via action blocks.

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
  • ebay_end_listing             ← remove a listing from eBay (keeps inventory, can relist)
  • ebay_relist                  ← re-publish a previously ended eBay listing
  • ebay_update_item_specifics   ← update item specifics/attributes (Brand, Size, Material, etc.) for eBay SEO and buyer filtering
  TikTok Shop actions:
  • tiktok_create_product    — { type, title, description, price, quantity?, sku?, category_id, images: ["url",...] }
  • tiktok_update_price      — { type, product_name, sku, price }
  • tiktok_update_inventory  — { type, product_name, sku, quantity }
  • tiktok_update_title      — { type, product_name, sku, new_title }
  • tiktok_update_description— { type, product_name, sku, description }
  • tiktok_end_listing       — { type, product_name, sku }  (deactivates — removes from storefront)
  • tiktok_renew_listing     — { type, product_name, sku }  (reactivates)
  WooCommerce actions:
  • woo_create_product
  • woo_bulk_create_products
  • woo_update_price
  • woo_update_inventory
  • woo_update_title
  • woo_update_description
  • woo_update_tags
  • woo_end_listing    (sets status=draft)
  • woo_renew_listing  (sets status=publish)
  Ecwid actions:
  • ecwid_create_product
  • ecwid_update_inventory
  • ecwid_update_price
  • ecwid_update_title
  • ecwid_update_description
  • ecwid_update_tags    (stored as keywords in Ecwid)
  • ecwid_end_listing    (sets enabled=false)
  • ecwid_renew_listing  (sets enabled=true)
  Magento / Adobe Commerce actions:
  • magento_create_product
  • magento_update_inventory
  • magento_update_price
  • magento_update_title
  • magento_update_description
  • magento_end_listing    (sets status=disabled)
  • magento_renew_listing  (sets status=enabled)
  PrestaShop actions:
  • prestashop_create_product
  • prestashop_update_inventory
  • prestashop_update_price
  • prestashop_update_title
  • prestashop_update_description
  • prestashop_end_listing   (sets active=0)
  • prestashop_renew_listing (sets active=1)
  • prestashop_update_tags   (creates/links PrestaShop tag entities; replaces existing tags)
  Wish Marketplace actions:
  • wish_update_inventory
  • wish_update_price
  • wish_update_title        — { type, sku, new_title }
  • wish_update_description  — { type, sku, description }
  • wish_update_tags         — { type, sku, tags: ["tag1","tag2"] }
  • wish_end_listing         — { type, sku }
  • wish_renew_listing       — { type, sku }
  Walmart Marketplace actions:
  • walmart_update_inventory
  • walmart_update_price
  • walmart_update_title       — { type, sku, new_title } (submitted as feed, ~minutes to process)
  • walmart_update_description — { type, sku, description } (submitted as feed, ~minutes to process)
  • walmart_end_listing        — { type, sku } (retires item from Walmart storefront)
  Etsy Shop actions:
  • etsy_update_price       — { type, product_name, listing_id?, price }
  • etsy_update_inventory   — { type, product_name, listing_id?, quantity }
  • etsy_update_title       — { type, product_name, listing_id?, title }
  • etsy_update_description — { type, product_name, listing_id?, description }
  • etsy_update_tags        — { type, product_name, listing_id?, tags: ["tag1","tag2",...] } (max 13 tags — this IS SEO on Etsy)
  • etsy_end_listing        — { type, product_name, listing_id? }  (sets state to inactive)
  • etsy_renew_listing      — { type, product_name, listing_id? }  (sets state back to active)
  • etsy_create_listing     — { type, title, description, price, quantity?, sku?, tags?, who_made?, when_made?, taxonomy_id?, state? }
  • etsy_bulk_create_listings — { type, listings: [{title,description,price,quantity?,sku?,tags?,who_made?,when_made?,taxonomy_id?,state?},...] }
  Analytics actions:
  • query_analytics — { type, analytics_type, period?, since?, until?, platform_type?, limit?, sort_by? }
    analytics_type values:
      revenue_summary    — revenue, order count, AOV, vs prior period
      top_products       — top N products by revenue or units sold (sort_by: "units" | "revenue")
      platform_breakdown — revenue/orders/share per platform
      order_trends       — day-by-day revenue + order count (use for charts / trend questions)
      refund_rate        — refund count, refund rate %, refunded revenue
    period values: today | 7d | 30d | 90d | 1y  (or use since/until ISO strings for custom)
  Order management actions (cross-platform):
  • sync_orders     — { type } — pulls recent orders from ALL connected platforms into local DB
  • get_orders      — { type, status?, platform_type?, fulfillment_status?, since?, limit? } — query stored orders
  • fulfill_order   — { type, platform_type, platform_order_id, tracking_number, tracking_company?, carrier_code? }
  • cancel_order    — { type, platform_type, platform_order_id, reason? }
  • refund_order    — { type, platform_type, platform_order_id, reason? } — full refund only
❌ FORBIDDEN (will always fail): update_product, update_seo, bulk_update, add_image, set_image, woo_update_product, or any other type not in the list above.

Platform action routing:
- Use ebay_* actions for products whose platform_type is 'ebay'
- Use Shopify actions (update_inventory, update_price, etc.) for products with platform_type 'shopify'
- Use ecwid_* actions for products with platform_type 'ecwid'
- Use magento_* actions for products with platform_type 'magento'
- Use prestashop_* actions for products with platform_type 'prestashop'
- Use wish_* actions for products with platform_type 'wish'
- Use walmart_* actions for products with platform_type 'walmart'
- Use etsy_* actions for products with platform_type 'etsy'
- Use tiktok_* actions for products with platform_type 'tiktok_shop'
- For multi_action and batch_update, sub-actions should use the correct prefix for the product's platform
- ⚠️ CRITICAL: eBay has NO "draft" or "archived" status. For eBay, the words "deactivate", "draft", "hide", "end", "mark as sold", "remove", "take down" all map to ebay_end_listing. NEVER use update_status on an eBay product.
- ⚠️ CRITICAL: Etsy has NO "draft" status. For Etsy, "deactivate", "remove", "hide", "take down" map to etsy_end_listing; "reactivate" or "relist" maps to etsy_renew_listing. NEVER use update_status on an Etsy product.
- ⚠️ CRITICAL: update_status is Shopify-ONLY.
- ⚠️ Etsy SEO = tags. When a user asks to "optimize SEO", "add keywords", or "improve search" on an Etsy listing, use etsy_update_tags (and optionally etsy_update_title/description). Etsy does not have separate SEO fields.
- ⚠️ Etsy tags: max 13, lowercase, no special characters except spaces. Always supply as an array.
- ⚠️ For Wish and Walmart, always include the SKU — these platforms identify products by SKU only.
- ⚠️ For Magento, always include the SKU — Magento's REST API uses SKU as the product identifier.
- ⚠️ For Wish and Walmart title/description updates, SKU is required — both platforms identify products by SKU only.
- ⚠️ Walmart title/description changes are submitted as feeds and may take a few minutes to reflect on the storefront. Mention this to the user.
- ⚠️ WooCommerce update actions require either a SKU or product name to resolve the product ID. Prefer SKU when available.

Context continuity rules (prevents executing wrong actions from short replies):
- When the user gives a short follow-up reply ("yes", "do it", "draft", "archived", "go ahead", "that one", "sounds good"), ALWAYS apply it to the EXACT item and action from the immediately preceding exchange — not anything else.
- NEVER let a short confirmation trigger an unrelated workflow from earlier in the conversation. If you just asked "draft or archived?" about the fleece jacket, a reply of "draft" means end the fleece jacket listing — not approve any pending SEO changes.
- Each action block you generate must clearly match the item the user just discussed. If the immediately preceding topic was deactivating an eBay item, generate the deactivation action for that item only.
- When in doubt about which item the user means, ask rather than guessing.

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

To update eBay item specifics (aspects) — these are the structured attributes buyers filter on (Brand, Size, Material, etc.).
replace_all:true replaces everything; omit or set false to merge with existing aspects:
[ORION_ACTION:{"type":"ebay_update_item_specifics","product_name":"Vintage Wool Sweater","sku":"SWEATER-001","item_specifics":{"Brand":["Handmade"],"Material":["Wool"],"Size":["M"],"Color":["Charcoal Grey"],"Style":["Vintage"]}}]
[ORION_ACTION:{"type":"ebay_update_item_specifics","product_name":"Vintage Wool Sweater","sku":"SWEATER-001","item_specifics":{"Season":["Fall","Winter"]},"replace_all":false}]

To create a single product on WooCommerce:
[ORION_ACTION:{"type":"woo_create_product","name":"Product Title","sku":"SKU-001","price":"29.99","quantity":10,"description":"Full description here","images":["https://image-url-1.jpg","https://image-url-2.jpg"],"tags":["tag1","tag2"],"product_type":"simple"}]

To bulk-create multiple products on WooCommerce (e.g. from an Etsy CSV migration — single confirmation for the whole batch):
[ORION_ACTION:{"type":"woo_bulk_create_products","products":[{"name":"Product 1","sku":"SKU-001","price":"19.99","quantity":5,"description":"...","images":["https://..."],"tags":["spring","cotton"]},{"name":"Product 2","sku":"SKU-002","price":"24.99","quantity":10,"description":"...","images":["https://..."],"tags":["summer"]}]}]

To update a WooCommerce product's price, inventory, title, description, or tags:
[ORION_ACTION:{"type":"woo_update_price","product_name":"Product Title","sku":"SKU-001","price":34.99}]
[ORION_ACTION:{"type":"woo_update_inventory","product_name":"Product Title","sku":"SKU-001","quantity":25}]
[ORION_ACTION:{"type":"woo_update_title","product_name":"Product Title","sku":"SKU-001","new_title":"New Product Title"}]
[ORION_ACTION:{"type":"woo_update_description","product_name":"Product Title","sku":"SKU-001","description":"Updated product description here"}]
[ORION_ACTION:{"type":"woo_update_tags","product_name":"Product Title","sku":"SKU-001","tags":["spring","cotton","women"]}]

To deactivate or reactivate a WooCommerce product:
[ORION_ACTION:{"type":"woo_end_listing","product_name":"Product Title","sku":"SKU-001"}]
[ORION_ACTION:{"type":"woo_renew_listing","product_name":"Product Title","sku":"SKU-001"}]

— Ecwid Actions —

To create a product on Ecwid:
[ORION_ACTION:{"type":"ecwid_create_product","title":"Product Name","sku":"SKU-001","price":29.99,"quantity":10,"description":"Full description here"}]

To update Ecwid inventory, price, title, description, or keywords (tags):
[ORION_ACTION:{"type":"ecwid_update_inventory","product_name":"Product Name","sku":"SKU-001","quantity":15}]
[ORION_ACTION:{"type":"ecwid_update_price","product_name":"Product Name","sku":"SKU-001","price":24.99}]
[ORION_ACTION:{"type":"ecwid_update_title","product_name":"Product Name","sku":"SKU-001","new_title":"New Product Name"}]
[ORION_ACTION:{"type":"ecwid_update_description","product_name":"Product Name","sku":"SKU-001","description":"Updated description text here"}]
[ORION_ACTION:{"type":"ecwid_update_tags","product_name":"Product Name","sku":"SKU-001","tags":["spring","cotton","women"]}]

To disable or enable an Ecwid product:
[ORION_ACTION:{"type":"ecwid_end_listing","product_name":"Product Name","sku":"SKU-001"}]
[ORION_ACTION:{"type":"ecwid_renew_listing","product_name":"Product Name","sku":"SKU-001"}]

— Magento / Adobe Commerce Actions —

To create a product on Magento:
[ORION_ACTION:{"type":"magento_create_product","title":"Product Name","sku":"SKU-001","price":29.99,"quantity":10,"description":"Full description here"}]

To update Magento inventory, price, title, or description (SKU required):
[ORION_ACTION:{"type":"magento_update_inventory","product_name":"Product Name","sku":"SKU-001","quantity":20}]
[ORION_ACTION:{"type":"magento_update_price","product_name":"Product Name","sku":"SKU-001","price":34.99}]
[ORION_ACTION:{"type":"magento_update_title","product_name":"Product Name","sku":"SKU-001","new_title":"New Product Name"}]
[ORION_ACTION:{"type":"magento_update_description","product_name":"Product Name","sku":"SKU-001","description":"Updated description here"}]

To disable or enable a Magento product (SKU required):
[ORION_ACTION:{"type":"magento_end_listing","product_name":"Product Name","sku":"SKU-001"}]
[ORION_ACTION:{"type":"magento_renew_listing","product_name":"Product Name","sku":"SKU-001"}]

— PrestaShop Actions —

To create a product on PrestaShop:
[ORION_ACTION:{"type":"prestashop_create_product","title":"Product Name","sku":"SKU-001","price":29.99,"quantity":10}]

To update PrestaShop inventory, price, title, or description:
[ORION_ACTION:{"type":"prestashop_update_inventory","product_name":"Product Name","sku":"SKU-001","quantity":15}]
[ORION_ACTION:{"type":"prestashop_update_price","product_name":"Product Name","sku":"SKU-001","price":19.99}]
[ORION_ACTION:{"type":"prestashop_update_title","product_name":"Product Name","sku":"SKU-001","new_title":"New Product Name"}]
[ORION_ACTION:{"type":"prestashop_update_description","product_name":"Product Name","sku":"SKU-001","description":"Updated full product description here"}]

To disable or enable a PrestaShop product:
[ORION_ACTION:{"type":"prestashop_end_listing","product_name":"Product Name","sku":"SKU-001"}]
[ORION_ACTION:{"type":"prestashop_renew_listing","product_name":"Product Name","sku":"SKU-001"}]

To update (replace) tags on a PrestaShop product — tags are created automatically if they don't exist yet.
Note: this replaces all existing tags on the product with the new set.
[ORION_ACTION:{"type":"prestashop_update_tags","product_name":"Product Name","sku":"SKU-001","tags":["handmade","ceramic","gift idea","home decor"]}]

— Wish Marketplace Actions —

To update Wish inventory, price, title, description, or tags (SKU required):
[ORION_ACTION:{"type":"wish_update_inventory","product_name":"Product Name","sku":"SKU-001","quantity":5}]
[ORION_ACTION:{"type":"wish_update_price","product_name":"Product Name","sku":"SKU-001","price":12.99}]
[ORION_ACTION:{"type":"wish_update_title","product_name":"Product Name","sku":"SKU-001","new_title":"New Product Title"}]
[ORION_ACTION:{"type":"wish_update_description","product_name":"Product Name","sku":"SKU-001","description":"Updated product description here"}]
[ORION_ACTION:{"type":"wish_update_tags","product_name":"Product Name","sku":"SKU-001","tags":["fashion","women","summer"]}]

To disable or enable a Wish product (SKU required):
[ORION_ACTION:{"type":"wish_end_listing","product_name":"Product Name","sku":"SKU-001"}]
[ORION_ACTION:{"type":"wish_renew_listing","product_name":"Product Name","sku":"SKU-001"}]

— Walmart Marketplace Actions —

To update Walmart inventory or price (SKU required):
[ORION_ACTION:{"type":"walmart_update_inventory","product_name":"Product Name","sku":"SKU-001","quantity":25}]
[ORION_ACTION:{"type":"walmart_update_price","product_name":"Product Name","sku":"SKU-001","price":49.99}]

To update Walmart title or description (SKU required — submitted as a feed, visible in a few minutes):
[ORION_ACTION:{"type":"walmart_update_title","product_name":"Product Name","sku":"SKU-001","new_title":"New Product Title"}]
[ORION_ACTION:{"type":"walmart_update_description","product_name":"Product Name","sku":"SKU-001","description":"Updated short description here"}]

To retire (remove) a Walmart listing (SKU required):
[ORION_ACTION:{"type":"walmart_end_listing","product_name":"Product Name","sku":"SKU-001"}]

— TikTok Shop Actions —

To update TikTok Shop price, inventory, title, or description (product_name or sku required):
[ORION_ACTION:{"type":"tiktok_update_price","product_name":"Ceramic Mug","sku":"MUG-001","price":24.99}]
[ORION_ACTION:{"type":"tiktok_update_inventory","product_name":"Ceramic Mug","sku":"MUG-001","quantity":20}]
[ORION_ACTION:{"type":"tiktok_update_title","product_name":"Ceramic Mug","sku":"MUG-001","new_title":"Handmade Ceramic Coffee Mug - 12oz - Speckled Glaze"}]
[ORION_ACTION:{"type":"tiktok_update_description","product_name":"Ceramic Mug","sku":"MUG-001","description":"Beautifully handcrafted ceramic mug. Holds 12oz. Microwave safe. Each piece is unique."}]

To deactivate or reactivate a TikTok Shop listing:
[ORION_ACTION:{"type":"tiktok_end_listing","product_name":"Ceramic Mug","sku":"MUG-001"}]
[ORION_ACTION:{"type":"tiktok_renew_listing","product_name":"Ceramic Mug","sku":"MUG-001"}]

To create a new TikTok Shop product (category_id and at least one image URL required):
Note: category_id is required by TikTok. Common IDs: 601079 = Clothing, 601105 = Shoes, 601191 = Home & Living, 601145 = Beauty & Personal Care, 601165 = Sports & Outdoors, 601217 = Electronics. If unsure, ask the user.
[ORION_ACTION:{"type":"tiktok_create_product","title":"Handmade Ceramic Mug","description":"Beautiful handcrafted ceramic mug, 12oz, microwave safe.","price":24.99,"quantity":10,"sku":"MUG-001","category_id":"601191","images":["https://your-image-url.jpg"]}]

— Etsy Shop Actions —

To update an Etsy listing's price, inventory, title, description, or tags:
[ORION_ACTION:{"type":"etsy_update_price","product_name":"Handmade Ceramic Mug","listing_id":123456789,"price":28.00}]
[ORION_ACTION:{"type":"etsy_update_inventory","product_name":"Handmade Ceramic Mug","listing_id":123456789,"quantity":5}]
[ORION_ACTION:{"type":"etsy_update_title","product_name":"Handmade Ceramic Mug","listing_id":123456789,"title":"Handmade Ceramic Coffee Mug - Speckled Glaze - 12oz"}]
[ORION_ACTION:{"type":"etsy_update_description","product_name":"Handmade Ceramic Mug","listing_id":123456789,"description":"Beautifully handcrafted ceramic mug with speckled glaze finish..."}]
[ORION_ACTION:{"type":"etsy_update_tags","product_name":"Handmade Ceramic Mug","listing_id":123456789,"tags":["ceramic mug","handmade","coffee mug","pottery","kitchen gift","speckled","stoneware"]}]

To deactivate or reactivate an Etsy listing:
[ORION_ACTION:{"type":"etsy_end_listing","product_name":"Handmade Ceramic Mug","listing_id":123456789}]
[ORION_ACTION:{"type":"etsy_renew_listing","product_name":"Handmade Ceramic Mug","listing_id":123456789}]

To create a single new Etsy listing:
Note: who_made options: "i_did" | "someone_else" | "collective". when_made options: "made_to_order" | "2020_2024" | "2010_2019" | "before_2007" | etc. taxonomy_id: 69=Art, 68=Bags, 520=Home & Living, 568=Jewelry, 345=Clothing, 1=Accessories. state: "draft" (default) or "active".
[ORION_ACTION:{"type":"etsy_create_listing","title":"Handmade Ceramic Coffee Mug","description":"Beautifully handcrafted ceramic coffee mug with speckled glaze. Holds 12oz. Microwave and dishwasher safe. Each piece is unique.","price":28.00,"quantity":3,"sku":"MUGA-001","tags":["ceramic mug","handmade pottery","coffee lover gift","kitchen gift","stoneware"],"who_made":"i_did","when_made":"made_to_order","taxonomy_id":520,"state":"draft"}]

To bulk-create multiple Etsy listings at once (e.g. from a CSV upload — single confirmation for the whole batch):
[ORION_ACTION:{"type":"etsy_bulk_create_listings","listings":[{"title":"Ceramic Mug - Blue","description":"Handmade blue ceramic mug, 12oz.","price":28.00,"quantity":5,"sku":"MUG-BLUE-001","tags":["ceramic mug","handmade","blue pottery"],"who_made":"i_did","when_made":"made_to_order","taxonomy_id":520,"state":"draft"},{"title":"Ceramic Mug - Green","description":"Handmade green ceramic mug, 12oz.","price":28.00,"quantity":5,"sku":"MUG-GREEN-001","tags":["ceramic mug","handmade","green pottery"],"who_made":"i_did","when_made":"made_to_order","taxonomy_id":520,"state":"draft"}]}]

— Analytics Actions —

Use query_analytics whenever the user asks about revenue, sales performance, top products, trends, or refunds.
IMPORTANT: Always run query_analytics to get fresh data before answering analytics questions — do NOT guess from the store overview above.

Revenue summary (with period-over-period comparison):
[ORION_ACTION:{"type":"query_analytics","analytics_type":"revenue_summary","period":"30d"}]
[ORION_ACTION:{"type":"query_analytics","analytics_type":"revenue_summary","period":"7d"}]
[ORION_ACTION:{"type":"query_analytics","analytics_type":"revenue_summary","period":"90d"}]
[ORION_ACTION:{"type":"query_analytics","analytics_type":"revenue_summary","platform_type":"etsy","period":"30d"}]
[ORION_ACTION:{"type":"query_analytics","analytics_type":"revenue_summary","since":"2026-04-01","until":"2026-04-15"}]

Top products by revenue or units sold:
[ORION_ACTION:{"type":"query_analytics","analytics_type":"top_products","period":"30d","limit":10}]
[ORION_ACTION:{"type":"query_analytics","analytics_type":"top_products","period":"30d","sort_by":"units","limit":5}]

Revenue by platform:
[ORION_ACTION:{"type":"query_analytics","analytics_type":"platform_breakdown","period":"30d"}]

Daily sales trends (for spotting patterns, slow days, best days):
[ORION_ACTION:{"type":"query_analytics","analytics_type":"order_trends","period":"30d"}]
[ORION_ACTION:{"type":"query_analytics","analytics_type":"order_trends","period":"7d"}]

Refund rate:
[ORION_ACTION:{"type":"query_analytics","analytics_type":"refund_rate","period":"30d"}]

— Order Management Actions —

To sync all orders from every connected platform into Orion's local database:
[ORION_ACTION:{"type":"sync_orders"}]

To query orders (optionally filtered):
[ORION_ACTION:{"type":"get_orders","limit":25}]
[ORION_ACTION:{"type":"get_orders","status":"processing","limit":50}]
[ORION_ACTION:{"type":"get_orders","fulfillment_status":"unfulfilled","limit":25}]
[ORION_ACTION:{"type":"get_orders","platform_type":"shopify","since":"2026-04-01T00:00:00Z","limit":100}]

To mark an order as shipped (fulfilled) with tracking — works on Shopify, Etsy, eBay, TikTok Shop, WooCommerce:
[ORION_ACTION:{"type":"fulfill_order","platform_type":"shopify","platform_order_id":"5678901234","tracking_number":"1Z999AA10123456784","tracking_company":"UPS"}]
[ORION_ACTION:{"type":"fulfill_order","platform_type":"etsy","platform_order_id":"3456789012","tracking_number":"9400111899223397913337","tracking_company":"USPS"}]
[ORION_ACTION:{"type":"fulfill_order","platform_type":"ebay","platform_order_id":"12-34567-89012","tracking_number":"794644792798","tracking_company":"FedEx","carrier_code":"FedEx"}]

To cancel an order:
[ORION_ACTION:{"type":"cancel_order","platform_type":"shopify","platform_order_id":"5678901234","reason":"customer"}]
[ORION_ACTION:{"type":"cancel_order","platform_type":"woocommerce","platform_order_id":"1042"}]

To issue a full refund on an order:
[ORION_ACTION:{"type":"refund_order","platform_type":"shopify","platform_order_id":"5678901234","reason":"Item arrived damaged"}]
[ORION_ACTION:{"type":"refund_order","platform_type":"woocommerce","platform_order_id":"1042","reason":"Customer request"}]

⚠️ For partial refunds (specific items or amounts), tell the user to process them in their platform dashboard — partial refunds require line-item level detail that varies per platform.
⚠️ Always run sync_orders first if the user asks about their current orders and the order data in context looks stale or empty.

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
- Total Orders on file: ${storeContext.total_orders}
- Revenue last 7 days: $${(storeContext.metrics.revenue_last_7d || 0).toFixed(2)} (${storeContext.metrics.orders_last_7d || 0} orders)
- Revenue last 30 days: $${(storeContext.metrics.revenue_last_30d || 0).toFixed(2)} (${storeContext.metrics.orders_last_30d || 0} orders)
- Average Order Value (last 30d): $${storeContext.metrics.orders_last_30d > 0 ? (storeContext.metrics.revenue_last_30d / storeContext.metrics.orders_last_30d).toFixed(2) : '0.00'}
${storeContext.metrics.revenue_by_platform_30d ? `- Revenue by platform (last 30d): ${storeContext.metrics.revenue_by_platform_30d}` : ''}
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

  // On-demand product image vision: if the user asks about a specific product's
  // image/photo/look, fetch that product's first image server-side and inject it
  // as a vision block so Orion can actually see and describe it.
  const productImageBlocks: any[] = [];
  const IMAGE_QUESTION = /\b(image|photo|picture|look like|show me|see the|thumbnail|visual)\b/i;
  if (IMAGE_QUESTION.test(message) && storeContext?.products?.length > 0) {
    const lowerMsg = message.toLowerCase();
    const matched = storeContext.products.find((p: any) => {
      const name = (p.title || p.name || '').toLowerCase().trim();
      const sku = (p.sku || '').toLowerCase().trim();
      return (name.length > 3 && lowerMsg.includes(name)) ||
             (sku.length > 2 && lowerMsg.includes(sku));
    });
    if (matched?.image_url) {
      try {
        const imgRes = await fetch(matched.image_url);
        if (imgRes.ok) {
          const mediaType = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
          const buffer = await imgRes.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          const chunk = 8192;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
          }
          productImageBlocks.push({
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: btoa(binary) },
          });
        }
      } catch (e) {
        console.warn('[Orion] Could not fetch product image for vision:', e);
      }
    }
  }

  const currentContent: any[] = [{ type: 'text', text: message }];

  for (const block of productImageBlocks) {
    currentContent.push(block);
  }

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
