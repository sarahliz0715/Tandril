// AI Content Generator
// Uses Claude AI to generate product content: descriptions, titles, SEO, social captions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_API_VERSION = '2024-01';

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
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get request parameters
    const {
      content_type = 'description',  // 'description', 'title', 'meta', 'social', 'alt_text'
      product_ids = [],               // Array of product IDs to process
      tone = 'professional',          // 'professional', 'casual', 'luxury', 'playful'
      target_audience = 'general',    // 'general', 'b2b', 'b2c', 'youth', 'premium'
      apply_to_store = false,         // If true, update products in Shopify
      platform_id = null              // Required if apply_to_store is true
    } = await req.json();

    console.log(`[AI Content] Generating ${content_type} for ${product_ids.length} products`);

    if (product_ids.length === 0) {
      throw new Error('No product IDs provided');
    }

    // Get platform if applying changes
    let platform = null;
    if (apply_to_store) {
      if (!platform_id) {
        throw new Error('platform_id required when apply_to_store is true');
      }

      const { data: platforms } = await supabaseClient
        .from('platforms')
        .select('*')
        .eq('id', platform_id)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!platforms || platforms.length === 0) {
        throw new Error('Platform not found');
      }
      platform = platforms[0];
    }

    // Process each product
    const results = [];
    for (const productId of product_ids.slice(0, 20)) { // Limit to 20 for safety
      try {
        const result = await generateContentForProduct(
          productId,
          content_type,
          tone,
          target_audience,
          platform,
          apply_to_store
        );
        results.push(result);

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`[AI Content] Error processing product ${productId}:`, error);
        results.push({
          product_id: productId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[AI Content] Generated content for ${successCount}/${product_ids.length} products`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: results.length - successCount
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[AI Content] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

async function generateContentForProduct(
  productId: string,
  contentType: string,
  tone: string,
  targetAudience: string,
  platform: any,
  applyToStore: boolean
): Promise<any> {
  // Fetch product from Shopify
  const productResponse = await shopifyRequest(platform, `products/${productId}.json`);
  const product = productResponse.product;

  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  // Generate content using Claude
  const generatedContent = await generateWithClaude(
    product,
    contentType,
    tone,
    targetAudience
  );

  // Apply to store if requested
  if (applyToStore && platform) {
    await applyContentToProduct(product, generatedContent, contentType, platform);
  }

  return {
    product_id: productId,
    product_title: product.title,
    success: true,
    content_type: contentType,
    generated_content: generatedContent,
    applied_to_store: applyToStore
  };
}

async function generateWithClaude(
  product: any,
  contentType: string,
  tone: string,
  targetAudience: string
): Promise<any> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const systemPrompt = buildSystemPrompt(contentType, tone, targetAudience);
  const userPrompt = buildUserPrompt(product, contentType);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${await response.text()}`);
  }

  const result = await response.json();
  const contentText = result.content[0].text;

  // Parse JSON response
  try {
    const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/) || contentText.match(/({[\s\S]*})/);
    const jsonText = jsonMatch ? jsonMatch[1] : contentText;
    return JSON.parse(jsonText);
  } catch (error) {
    // If not JSON, return as plain text
    return { content: contentText };
  }
}

function buildSystemPrompt(contentType: string, tone: string, targetAudience: string): string {
  const toneGuide = {
    professional: 'Clear, professional, and authoritative',
    casual: 'Friendly, conversational, and approachable',
    luxury: 'Sophisticated, premium, and aspirational',
    playful: 'Fun, energetic, and creative'
  }[tone] || 'professional';

  const audienceGuide = {
    general: 'general consumers',
    b2b: 'business professionals and decision-makers',
    b2c: 'individual consumers',
    youth: 'young adults and teenagers',
    premium: 'affluent customers seeking luxury products'
  }[targetAudience] || 'general consumers';

  const contentGuides = {
    description: `Write compelling product descriptions that:
- Highlight key features and benefits
- Use ${toneGuide} language
- Target ${audienceGuide}
- Include emotional appeal and practical value
- Be 100-200 words
- Use HTML formatting (paragraphs, lists)
- Focus on what makes the product unique`,

    title: `Create SEO-optimized product titles that:
- Are 50-70 characters
- Include key features/benefits
- Use ${toneGuide} language
- Avoid ALL CAPS or excessive punctuation
- Include relevant keywords naturally
- Be clear and descriptive`,

    meta: `Write SEO meta descriptions that:
- Are 150-160 characters
- Include primary keywords
- Create urgency or curiosity
- Target ${audienceGuide}
- Accurately describe the product`,

    social: `Create social media captions that:
- Are engaging and shareable
- Use ${toneGuide} tone
- Include 1-3 relevant hashtags
- Have a clear call-to-action
- Be 100-150 characters (concise for Instagram/Twitter)`,

    alt_text: `Write image alt text that:
- Describes what's in the image clearly
- Includes product name and key features
- Be 10-125 characters
- Be helpful for visually impaired users
- Include relevant keywords naturally`
  };

  return `You are an expert e-commerce copywriter. Your job is to create ${contentType} for products.

${contentGuides[contentType]}

Respond with valid JSON only:
{
  "content": "your generated content here",
  "keywords": ["relevant", "keywords"],
  "notes": "optional notes about the content"
}`;
}

function buildUserPrompt(product: any, contentType: string): string {
  const currentDescription = product.body_html || 'No description';
  const price = product.variants?.[0]?.price || 'N/A';
  const images = product.images?.length || 0;

  let prompt = `Generate ${contentType} for this product:\n\n`;
  prompt += `Title: ${product.title}\n`;
  prompt += `Price: $${price}\n`;
  prompt += `Current Description: ${currentDescription.replace(/<[^>]*>/g, '').substring(0, 200)}...\n`;
  prompt += `Images: ${images}\n`;

  if (product.product_type) {
    prompt += `Type: ${product.product_type}\n`;
  }
  if (product.vendor) {
    prompt += `Vendor: ${product.vendor}\n`;
  }
  if (product.tags) {
    prompt += `Tags: ${product.tags}\n`;
  }

  if (contentType === 'alt_text' && product.images?.length > 0) {
    prompt += `\nGenerate alt text for image 1 of ${product.images.length}.`;
  }

  return prompt;
}

async function applyContentToProduct(
  product: any,
  generatedContent: any,
  contentType: string,
  platform: any
): Promise<void> {
  const updateData: any = { product: {} };

  switch (contentType) {
    case 'description':
      updateData.product.body_html = generatedContent.content;
      break;

    case 'title':
      updateData.product.title = generatedContent.content;
      break;

    case 'meta':
      updateData.product.metafields_global_description_tag = generatedContent.content;
      break;

    case 'alt_text':
      if (product.images && product.images.length > 0) {
        updateData.product.images = product.images.map((img: any, index: number) =>
          index === 0 ? { ...img, alt: generatedContent.content } : img
        );
      }
      break;
  }

  await shopifyRequest(platform, `products/${product.id}.json`, 'PUT', updateData);
  console.log(`[AI Content] Applied ${contentType} to product ${product.id}`);
}

async function shopifyRequest(
  platform: any,
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  const url = `https://${platform.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'X-Shopify-Access-Token': platform.access_token,
      'Content-Type': 'application/json',
    },
  };

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}
