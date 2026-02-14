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

    console.log(`[AI Coach] Processing message for user ${user.id}`);

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
    console.error('[AI Coach] Error:', error);
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

  // Get recent products
  const { data: products, count: productCount } = await supabaseClient
    .from('products')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get recent orders
  const { data: orders, count: orderCount } = await supabaseClient
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Calculate key metrics
  const totalRevenue = orders?.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0) || 0;
  const avgOrderValue = orders && orders.length > 0 ? totalRevenue / orders.length : 0;

  return {
    platforms: platforms || [],
    products: products || [],
    total_products: productCount || 0,
    orders: orders || [],
    total_orders: orderCount || 0,
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

  // Build system prompt with store context
  const systemPrompt = `You are an expert e-commerce business coach helping a seller optimize their online business.

**Current Store Context:**
- Active Platforms: ${storeContext.platforms.map((p: any) => p.platform_type).join(', ') || 'None connected yet'}
- Total Products: ${storeContext.total_products}
- Total Orders: ${storeContext.total_orders}
- Total Revenue: $${storeContext.metrics.total_revenue.toFixed(2)}
- Average Order Value: $${storeContext.metrics.avg_order_value.toFixed(2)}

**Your Role:**
- Provide actionable, specific advice based on their actual store data
- Analyze uploaded files (product catalogs, competitor research, spreadsheets, screenshots)
- Suggest growth strategies, pricing optimizations, and operational improvements
- Be conversational and supportive, but direct and honest
- When analyzing files, extract key insights and provide recommendations

**Communication Style:**
- Use markdown for formatting
- Be concise but thorough
- Always tie advice back to their actual numbers
- Ask clarifying questions when needed`;

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
      model: 'claude-3-5-sonnet-20241022',
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
