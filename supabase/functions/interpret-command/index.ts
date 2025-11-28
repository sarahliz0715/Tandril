// Interpret Command Edge Function
// This function uses AI to interpret natural language commands and convert them into structured actions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get request body
    const { command_text, platform_targets, file_urls } = await req.json();

    if (!command_text) {
      throw new Error('Missing command_text parameter');
    }

    console.log(`[Interpret Command] Processing: "${command_text}" for user ${user.id}`);

    // Use AI to interpret the command
    const interpretation = await interpretCommandWithAI(command_text, platform_targets, file_urls);

    console.log(`[Interpret Command] Interpretation complete with ${interpretation.actions.length} actions`);

    return new Response(
      JSON.stringify({
        success: true,
        data: interpretation,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Interpret Command] Error:', error);
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

async function interpretCommandWithAI(
  commandText: string,
  platformTargets: string[],
  fileUrls: string[] = []
): Promise<any> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

  // Prefer Anthropic Claude, fallback to OpenAI
  if (anthropicApiKey) {
    return await interpretWithClaude(commandText, platformTargets, fileUrls, anthropicApiKey);
  } else if (openaiApiKey) {
    return await interpretWithOpenAI(commandText, platformTargets, fileUrls, openaiApiKey);
  } else {
    // Fallback to rule-based interpretation if no AI API key is configured
    return ruleBasedInterpretation(commandText, platformTargets);
  }
}

async function interpretWithClaude(
  commandText: string,
  platformTargets: string[],
  fileUrls: string[],
  apiKey: string
): Promise<any> {
  const systemPrompt = `You are an AI assistant that interprets e-commerce management commands and converts them into structured actions.

The user manages one or more Shopify stores. They will give you natural language commands like:
- "Update all products in the Winter Collection to be 20% off"
- "Find products with less than 10 in stock"
- "Add SEO tags to my best selling products"

Your job is to convert these commands into a structured JSON response with the following format:

{
  "actions": [
    {
      "type": "update_products" | "create_products" | "get_products" | "update_inventory" | "apply_discount" | "update_seo" | "create_collection" | etc,
      "description": "Human-readable description of what this action does",
      "parameters": {
        // Action-specific parameters
      },
      "requires_confirmation": true | false
    }
  ],
  "confidence_score": 0.0 to 1.0,
  "warnings": ["Any warnings or things the user should know"],
  "estimated_impact": "Description of what will change"
}

Platform targets: ${platformTargets.join(', ')}
${fileUrls.length > 0 ? `Attached files: ${fileUrls.join(', ')}` : ''}

Be specific with your actions and parameters. If you're unsure about something, set requires_confirmation to true.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: commandText,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${await response.text()}`);
  }

  const result = await response.json();
  const contentText = result.content[0].text;

  // Extract JSON from the response (it might be wrapped in markdown code blocks)
  const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/) || contentText.match(/({[\s\S]*})/);
  const jsonText = jsonMatch ? jsonMatch[1] : contentText;

  return JSON.parse(jsonText);
}

async function interpretWithOpenAI(
  commandText: string,
  platformTargets: string[],
  fileUrls: string[],
  apiKey: string
): Promise<any> {
  const systemPrompt = `You are an AI assistant that interprets e-commerce management commands and converts them into structured actions. Respond only with valid JSON in this format:

{
  "actions": [
    {
      "type": "update_products" | "get_products" | "update_inventory" | "apply_discount" | etc,
      "description": "Human-readable description",
      "parameters": {},
      "requires_confirmation": true | false
    }
  ],
  "confidence_score": 0.0 to 1.0,
  "warnings": [],
  "estimated_impact": "Description of changes"
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Command: "${commandText}"\nPlatforms: ${platformTargets.join(', ')}` },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${await response.text()}`);
  }

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}

function ruleBasedInterpretation(commandText: string, platformTargets: string[]): any {
  // Simple rule-based fallback for common commands
  const lowerCommand = commandText.toLowerCase();

  const actions = [];
  let confidenceScore = 0.7;

  // Inventory-related commands
  if (lowerCommand.includes('low stock') || lowerCommand.includes('inventory below')) {
    const threshold = parseInt(lowerCommand.match(/\d+/)?.[0] || '10');
    actions.push({
      type: 'get_products',
      description: `Find products with inventory below ${threshold}`,
      parameters: {
        filter: 'inventory_quantity',
        operator: 'less_than',
        value: threshold,
      },
      requires_confirmation: false,
    });
  }

  // Discount/pricing commands
  if (lowerCommand.includes('discount') || lowerCommand.includes('% off')) {
    const percentage = parseInt(lowerCommand.match(/(\d+)%/)?.[1] || '10');
    actions.push({
      type: 'apply_discount',
      description: `Apply ${percentage}% discount`,
      parameters: {
        discount_type: 'percentage',
        discount_value: percentage,
      },
      requires_confirmation: true,
    });
  }

  // Product updates
  if (lowerCommand.includes('update') && lowerCommand.includes('product')) {
    actions.push({
      type: 'update_products',
      description: 'Update products based on command',
      parameters: {
        command: commandText,
      },
      requires_confirmation: true,
    });
  }

  // If no actions were matched, create a generic action
  if (actions.length === 0) {
    actions.push({
      type: 'custom_command',
      description: commandText,
      parameters: {
        command: commandText,
      },
      requires_confirmation: true,
    });
    confidenceScore = 0.5;
  }

  return {
    actions,
    confidence_score: confidenceScore,
    warnings: ['Using rule-based interpretation. Configure ANTHROPIC_API_KEY or OPENAI_API_KEY for better results.'],
    estimated_impact: `Will perform ${actions.length} action(s) on ${platformTargets.join(', ')}`,
  };
}
