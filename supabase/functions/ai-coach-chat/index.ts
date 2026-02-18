// Orion AI Business Advisor — conversational coaching edge function
// Powers the AIAdvisor chat via Claude, persists to business_coaching table

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ORION_SYSTEM_PROMPT = `You are Orion, an expert AI business advisor built into Tandril — a platform that helps e-commerce sellers manage and grow their businesses across Shopify, Etsy, and other platforms.

## Your Role
You are a strategic business partner: smart, practical, and proactive. You help owners with:
- Business strategy and growth planning
- Inventory management and pricing optimization
- Marketing and customer acquisition
- Operations and workflow automation
- Data analysis and trend identification
- Platform-specific tactics (Shopify, Etsy, Amazon, etc.)

## Your Personality
- Direct and confident — give real opinions, not vague platitudes
- Data-driven — reference the user's actual store metrics when available
- Action-oriented — always tie advice to concrete next steps
- Encouraging but honest — celebrate wins, flag real problems clearly

## Taking Actions
When the user asks you to make a change to their store (update inventory, change prices, create products), you can generate action blocks alongside your response. Use this exact format:

\`\`\`orion_action
{
  "action": "update_inventory" | "update_price" | "create_product",
  "parameters": { ... }
}
\`\`\`

Examples:
- "Set the Blue Widget price to $29.99" →
\`\`\`orion_action
{"action": "update_price", "parameters": {"product_name": "Blue Widget", "new_price": 29.99}}
\`\`\`

- "Restock Ceramic Mug to 50 units" →
\`\`\`orion_action
{"action": "update_inventory", "parameters": {"product_name": "Ceramic Mug", "quantity": 50}}
\`\`\`

Only generate action blocks when the user explicitly requests a change. Always briefly confirm what you're about to do in plain text before the action block.

## Response Style
Keep responses concise and scannable. Use bullet points and headers when helpful. Avoid walls of text. If you don't have enough data to give specific advice, say so and ask for what you need.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const { conversation_id, message } = await req.json();
    if (!conversation_id || !message?.content) {
      throw new Error('Missing conversation_id or message.content');
    }

    console.log(`[ai-coach-chat] User ${user.id}, conversation ${conversation_id}`);

    // Load the conversation record
    const { data: convData, error: convError } = await supabaseClient
      .from('business_coaching')
      .select('*')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (convError || !convData) throw new Error('Conversation not found');

    const existingMessages: any[] = convData.content?.messages || [];

    // Append the new user message
    const userMessage = {
      role: message.role || 'user',
      content: message.content,
      file_urls: message.file_urls || [],
      created_at: new Date().toISOString(),
    };
    const messagesWithUser = [...existingMessages, userMessage];

    // Fetch connected platforms for context
    const { data: platforms } = await supabaseClient
      .from('platforms')
      .select('shop_name, platform_type, shop_domain')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const contextBlock = platforms && platforms.length > 0
      ? `\n\n## User's Connected Stores\n${platforms.map(p =>
          `- ${p.shop_name || p.platform_type} (${p.platform_type})${p.shop_domain ? ': ' + p.shop_domain : ''}`
        ).join('\n')}`
      : '\n\n## User Context\nNo stores connected yet — give general advice and encourage them to connect a store.';

    // Build Claude message array (filter to only user/assistant turns)
    const claudeMessages = messagesWithUser
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => ({ role: m.role, content: m.content }));

    // Call Claude
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: ORION_SYSTEM_PROMPT + contextBlock,
        messages: claudeMessages,
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      throw new Error(`Claude API error: ${errText}`);
    }

    const claudeResult = await claudeResponse.json();
    const aiResponseText = claudeResult.content[0].text;

    // Append AI response
    const aiMessage = {
      role: 'assistant',
      content: aiResponseText,
      created_at: new Date().toISOString(),
    };
    const finalMessages = [...messagesWithUser, aiMessage];

    // Persist updated conversation
    const { error: updateError } = await supabaseClient
      .from('business_coaching')
      .update({
        content: { ...convData.content, messages: finalMessages },
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation_id);

    if (updateError) throw new Error(`Failed to save conversation: ${updateError.message}`);

    console.log(`[ai-coach-chat] Conversation ${conversation_id} updated, ${finalMessages.length} total messages`);

    return new Response(
      JSON.stringify({
        success: true,
        data: { message: aiMessage, conversation_id },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[ai-coach-chat] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
