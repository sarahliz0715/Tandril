// Undo Command Edge Function
// Reverts a previously executed command using stored snapshots

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { command_id } = await req.json();

    if (!command_id) {
      throw new Error('Missing command_id parameter');
    }

    console.log(`[Undo Command] Reverting command ${command_id} for user ${user.id}`);

    // Get the command history
    const { data: history, error: historyError } = await supabaseClient
      .from('command_history')
      .select('*')
      .eq('command_id', command_id)
      .eq('user_id', user.id)
      .eq('can_undo', true)
      .single();

    if (historyError || !history) {
      throw new Error('Command history not found or cannot be undone');
    }

    if (history.undone_at) {
      throw new Error('This command has already been undone');
    }

    const { change_snapshots } = history;

    if (!change_snapshots || change_snapshots.length === 0) {
      throw new Error('No change snapshots found for this command');
    }

    // Get platform credentials
    const platformIds = [...new Set(change_snapshots.map((s: any) => s.platform_id))];
    const { data: platforms, error: platformsError } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('user_id', user.id)
      .in('id', platformIds);

    if (platformsError || !platforms || platforms.length === 0) {
      throw new Error('Platform credentials not found');
    }

    // Decrypt access tokens for all platforms
    for (const platform of platforms) {
      if (platform.access_token && isEncrypted(platform.access_token)) {
        try {
          platform.access_token = await decrypt(platform.access_token);
        } catch (error) {
          console.error(`[Undo Command] Failed to decrypt token for ${platform.shop_domain}`);
          throw new Error('Failed to decrypt platform credentials');
        }
      }
    }

    // Revert each change
    const results = [];

    for (const snapshot of change_snapshots) {
      const platform = platforms.find((p) => p.id === snapshot.platform_id);

      if (!platform) {
        results.push({
          action_type: snapshot.action_type,
          success: false,
          error: 'Platform not found',
        });
        continue;
      }

      try {
        const revertResult = await revertChange(snapshot, platform);
        results.push({
          action_type: snapshot.action_type,
          success: true,
          result: revertResult,
        });
      } catch (error) {
        console.error(`[Undo Command] Failed to revert:`, error);
        results.push({
          action_type: snapshot.action_type,
          success: false,
          error: error.message,
        });
      }
    }

    // Mark as undone
    await supabaseClient
      .from('command_history')
      .update({
        undone_at: new Date().toISOString(),
        undo_results: { results },
      })
      .eq('id', history.id);

    // Update the original command
    await supabaseClient
      .from('ai_commands')
      .update({
        status: 'undone',
        undone_at: new Date().toISOString(),
      })
      .eq('id', command_id);

    const summary = {
      total_reverted: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };

    console.log(`[Undo Command] Complete:`, summary);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          results,
          summary,
          message: `Successfully reverted ${summary.successful}/${summary.total_reverted} changes`,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Undo Command] Error:', error);
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

async function revertChange(snapshot: any, platform: any): Promise<any> {
  const { action_type, before_state, after_state, affected_resources } = snapshot;

  switch (action_type) {
    case 'update_products':
      return await revertProductUpdates(before_state, platform);

    case 'apply_discount':
      return await revertDiscounts(affected_resources, platform);

    case 'update_inventory':
      return await revertInventoryUpdates(before_state, platform);

    case 'update_seo':
      return await revertSEOUpdates(before_state, platform);

    default:
      throw new Error(`Cannot revert action type: ${action_type}`);
  }
}

async function revertProductUpdates(beforeStates: any[], platform: any): Promise<any> {
  const results = [];

  for (const beforeState of beforeStates || []) {
    try {
      // Restore each variant price to its before state via GraphQL
      if (beforeState.variants && beforeState.variants.length > 0) {
        // Get the product GID to use productVariantsBulkUpdate
        const varData = await shopifyGraphQL(platform.shop_domain, platform.access_token, `
          query($id: ID!) { productVariant(id: $id) { product { id } } }
        `, { id: toShopifyGid('ProductVariant', beforeState.variants[0].id) });

        const variantInputs = beforeState.variants.map((v: any) => ({
          id: toShopifyGid('ProductVariant', v.id),
          price: String(v.price),
        }));

        await shopifyGraphQL(platform.shop_domain, platform.access_token, `
          mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkUpdate(productId: $productId, variants: $variants) {
              userErrors { field message }
            }
          }
        `, {
          productId: varData.productVariant.product.id,
          variants: variantInputs,
        });
      }

      results.push({
        product_id: beforeState.id,
        success: true,
        reverted_to: beforeState,
      });
    } catch (error) {
      results.push({
        product_id: beforeState.id,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    reverted: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

async function revertDiscounts(affectedResources: any[], platform: any): Promise<any> {
  const results = [];

  for (const resource of affectedResources || []) {
    if (resource.type === 'price_rule') {
      try {
        // Delete the price rule that was created (no GraphQL equivalent — using REST)
        const res = await fetch(`https://${platform.shop_domain}/admin/api/2025-01/price_rules/${resource.id}.json`, {
          method: 'DELETE',
          headers: {
            'X-Shopify-Access-Token': platform.access_token,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok && res.status !== 404) {
          throw new Error(`Shopify API error (${res.status}): ${await res.text()}`);
        }

        results.push({
          resource_id: resource.id,
          success: true,
          action: 'deleted price rule',
        });
      } catch (error) {
        results.push({
          resource_id: resource.id,
          success: false,
          error: error.message,
        });
      }
    }
  }

  return {
    reverted: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

async function revertInventoryUpdates(beforeStates: any[], platform: any): Promise<any> {
  // Note: Reverting inventory is tricky as we need the exact inventory item IDs and location IDs
  // This is a simplified version
  return {
    message: 'Inventory revert not fully implemented in this version',
    warning: 'Manual inventory adjustment may be required',
  };
}

async function revertSEOUpdates(beforeStates: any[], platform: any): Promise<any> {
  // SEO updates through metafields would need to be restored
  return {
    message: 'SEO revert not fully implemented in this version',
    warning: 'Manual SEO restoration may be required',
  };
}
