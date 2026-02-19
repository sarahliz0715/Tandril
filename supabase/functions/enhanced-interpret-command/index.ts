// Enhanced Interpret Command Edge Function
// Advanced AI command interpretation with preview mode, ambiguity detection, and complex condition handling

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { command_text, platform_targets, context = {}, request_preview = true } = await req.json();

    if (!command_text) {
      throw new Error('Missing command_text parameter');
    }

    console.log(`[Enhanced Interpret] Processing: "${command_text}" for user ${user.id}`);

    // Use enhanced AI interpretation
    const interpretation = await enhancedInterpretation(
      command_text,
      platform_targets,
      context,
      request_preview
    );

    console.log(`[Enhanced Interpret] Result:`, {
      actions: interpretation.actions?.length || 0,
      needsClarification: !!interpretation.clarification_needed,
      previewRequested: request_preview,
    });

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
    console.error('[Enhanced Interpret] Error:', error);
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

async function enhancedInterpretation(
  commandText: string,
  platformTargets: string[],
  context: any,
  requestPreview: boolean
): Promise<any> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!anthropicApiKey) {
    console.warn('[Enhanced Interpret] No ANTHROPIC_API_KEY found');
    return basicInterpretation(commandText, platformTargets);
  }

  const systemPrompt = `You are an advanced AI assistant for e-commerce command interpretation with enhanced capabilities:

1. **Multi-Step Commands**: Break complex commands into sequential actions
2. **Complex Conditions**: Handle AND/OR logic, multiple filters, conditional branches
3. **Ambiguity Detection**: Identify unclear commands and ask clarifying questions
4. **Impact Estimation**: Provide detailed estimates of what will change

The user manages Shopify stores and gives commands like:
- "Update all products with 'vintage' in the title AND price > $50 to have a 20% discount"
- "If product is out of stock AND hasn't sold in 30 days, reduce price by 15%"
- "Find my best sellers and optimize their SEO"

Your response must be valid JSON with this structure:

{
  "actions": [
    {
      "type": "get_products" | "update_products" | "apply_discount" | "update_inventory" | "update_seo" | "create_collection" | "conditional_update",
      "description": "Clear description of what this action does — ALWAYS include key values (e.g. 'Set inventory to 15', 'Apply 20% discount')",
      "parameters": {
        // Action-specific parameters
        // For update_inventory: use "available" for the target quantity, and "product_title" to identify the product by name, or "filters" for complex matching. Do NOT leave quantity undefined.
        // Example: { "available": 15, "product_title": "Classic Cotton T-Shirt Black" }
        // For complex filters, use:
        "filters": [
          { "field": "title", "operator": "contains", "value": "vintage", "logic": "AND" },
          { "field": "price", "operator": "greater_than", "value": 50, "logic": "AND" }
        ]
      },
      "requires_confirmation": boolean,
      "step_number": 1,
      "depends_on_step": null | number // If this step depends on results from a previous step
    }
  ],
  "confidence_score": 0.0-1.0,
  "warnings": ["Any risks or important notes"],
  "estimated_impact": {
    "description": "Summary of what will change",
    "affected_items_estimate": "~50 products",
    "risk_level": "low" | "medium" | "high",
    "reversible": boolean
  },
  "clarification_needed": null | {
    "reason": "Why clarification is needed",
    "questions": [
      {
        "question": "Which products should this apply to?",
        "type": "choice" | "text" | "number",
        "options": ["All products", "Specific collection", "Products matching criteria"]
      }
    ],
    "suggestions": ["Suggested clarifications"]
  },
  "preview_recommended": boolean,
  "supports_undo": boolean
}

**Important Guidelines:**
- If the command is ambiguous or risky, set "clarification_needed"
- For bulk operations, ALWAYS set "preview_recommended": true
- Use "conditional_update" type for IF/THEN logic
- Break complex commands into multiple sequential steps
- Provide accurate impact estimates
- Set "requires_confirmation" for anything that modifies data

Platform targets: ${platformTargets.join(', ')}
${context.previous_question ? `Previous clarification: ${context.previous_question}` : ''}
${context.user_answer ? `User's answer: ${context.user_answer}` : ''}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
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

  const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/) || contentText.match(/({[\s\S]*})/);
  const jsonText = jsonMatch ? jsonMatch[1] : contentText;

  const interpretation = JSON.parse(jsonText);

  // Ensure all required fields are present
  return {
    actions: interpretation.actions || [],
    confidence_score: interpretation.confidence_score || 0.8,
    warnings: interpretation.warnings || [],
    estimated_impact: interpretation.estimated_impact || {
      description: 'Impact analysis not available',
      risk_level: 'medium',
      reversible: false,
    },
    clarification_needed: interpretation.clarification_needed || null,
    preview_recommended: interpretation.preview_recommended !== false,
    supports_undo: interpretation.supports_undo !== false,
  };
}

function basicInterpretation(commandText: string, platformTargets: string[]): any {
  // Fallback for when Claude is not available
  return {
    actions: [
      {
        type: 'custom_command',
        description: commandText,
        parameters: { command: commandText },
        requires_confirmation: true,
        step_number: 1,
      },
    ],
    confidence_score: 0.5,
    warnings: ['AI interpretation not available. Configure ANTHROPIC_API_KEY for enhanced features.'],
    estimated_impact: {
      description: 'Unable to estimate impact without AI analysis',
      risk_level: 'high',
      reversible: false,
    },
    clarification_needed: null,
    preview_recommended: true,
    supports_undo: false,
  };
}
