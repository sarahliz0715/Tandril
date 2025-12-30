// SEO Fixer Edge Function
// AI-powered SEO optimization for product titles, descriptions, and alt text

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_API_VERSION = '2024-01';

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

    // Get configuration parameters
    const {
      mode = 'analyze',           // 'analyze' or 'fix'
      max_products = 50,           // Limit products per run (AI calls are expensive)
      workflow_id = null           // Optional workflow ID for tracking
    } = await req.json().catch(() => ({}));

    console.log(`[SEO Fixer] Running in ${mode} mode for user ${user.id}, max products: ${max_products}`);

    // Get all active Shopify platforms for the user
    const { data: platforms, error: platformsError } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('platform_type', 'shopify');

    if (platformsError) {
      throw new Error(`Failed to fetch platforms: ${platformsError.message}`);
    }

    if (!platforms || platforms.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active Shopify stores found',
          results: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Process each platform
    const allResults = [];
    for (const platform of platforms) {
      console.log(`[SEO Fixer] Processing ${platform.shop_domain}`);

      try {
        const platformResults = await fixSEO(platform, mode, max_products);
        allResults.push({
          platform: platform.shop_name,
          success: true,
          ...platformResults,
        });
      } catch (error) {
        console.error(`[SEO Fixer] Error on ${platform.shop_domain}:`, error);
        allResults.push({
          platform: platform.shop_name,
          success: false,
          error: error.message,
        });
      }
    }

    // Log results to workflow_runs if workflow_id provided
    if (workflow_id) {
      await supabaseClient
        .from('workflow_runs')
        .insert({
          workflow_id,
          user_id: user.id,
          status: 'completed',
          results: { platforms: allResults },
          executed_at: new Date().toISOString(),
        });
    }

    const totalAnalyzed = allResults.reduce((sum, r) => sum + (r.analyzed_count || 0), 0);
    const totalFixed = allResults.reduce((sum, r) => sum + (r.fixed_count || 0), 0);

    console.log(`[SEO Fixer] Complete - Analyzed ${totalAnalyzed}, Fixed ${totalFixed} across ${platforms.length} stores`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          analyzed_count: totalAnalyzed,
          fixed_count: totalFixed,
          platforms_processed: platforms.length,
          results: allResults,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[SEO Fixer] Error:', error);
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

async function fixSEO(
  platform: any,
  mode: string,
  maxProducts: number
): Promise<any> {
  // Fetch products
  const productsResponse = await shopifyRequest(platform, `products.json?limit=${maxProducts}`);
  const products = productsResponse.products || [];

  console.log(`[SEO Fixer] Found ${products.length} products on ${platform.shop_domain}`);

  const analyzedProducts = [];
  const fixedProducts = [];

  for (const product of products) {
    try {
      // Analyze SEO quality
      const analysis = analyzeSEOQuality(product);

      if (analysis.needsImprovement) {
        analyzedProducts.push({
          product_id: product.id,
          title: product.title,
          issues: analysis.issues,
          seo_score: analysis.score,
        });

        // If in fix mode and AI is available, improve the SEO
        if (mode === 'fix') {
          const improvements = await generateSEOImprovements(product);

          if (improvements) {
            // Update product in Shopify
            await shopifyRequest(
              platform,
              `products/${product.id}.json`,
              'PUT',
              {
                product: {
                  title: improvements.title || product.title,
                  body_html: improvements.description || product.body_html,
                  // Update image alt text
                  images: improvements.images || product.images,
                },
              }
            );

            fixedProducts.push({
              product_id: product.id,
              original_title: product.title,
              new_title: improvements.title,
              improvements: improvements.changes,
            });

            console.log(`[SEO Fixer] Fixed: ${product.title} → ${improvements.title}`);
          }
        }
      }
    } catch (error) {
      console.error(`[SEO Fixer] Error processing product ${product.id}:`, error.message);
    }
  }

  return {
    products_checked: products.length,
    analyzed_count: analyzedProducts.length,
    fixed_count: fixedProducts.length,
    products_with_issues: analyzedProducts,
    fixed_products: fixedProducts,
  };
}

/**
 * Analyze SEO quality of a product
 * Returns issues and score
 */
function analyzeSEOQuality(product: any): any {
  const issues = [];
  let score = 100;

  // Title analysis
  const titleLength = product.title?.length || 0;
  if (titleLength === 0) {
    issues.push('Missing title');
    score -= 30;
  } else if (titleLength < 30) {
    issues.push('Title too short (< 30 chars)');
    score -= 15;
  } else if (titleLength > 70) {
    issues.push('Title too long (> 70 chars, will be truncated in search results)');
    score -= 10;
  }

  // Description analysis
  const description = product.body_html || '';
  const descriptionText = description.replace(/<[^>]*>/g, ''); // Strip HTML
  const descriptionLength = descriptionText.length;

  if (descriptionLength === 0) {
    issues.push('Missing description');
    score -= 25;
  } else if (descriptionLength < 100) {
    issues.push('Description too short (< 100 chars)');
    score -= 15;
  }

  // Image alt text analysis
  const images = product.images || [];
  const imagesWithoutAlt = images.filter((img: any) => !img.alt || img.alt.trim() === '');
  if (imagesWithoutAlt.length > 0) {
    issues.push(`${imagesWithoutAlt.length} images missing alt text`);
    score -= Math.min(20, imagesWithoutAlt.length * 5);
  }

  // Check for SEO-unfriendly patterns
  if (product.title?.match(/[A-Z]{3,}/)) {
    issues.push('Title has excessive capitalization');
    score -= 5;
  }

  if (product.title?.match(/\d{5,}/)) {
    issues.push('Title contains long product codes (bad for SEO)');
    score -= 5;
  }

  return {
    score: Math.max(0, score),
    needsImprovement: score < 80,
    issues,
  };
}

/**
 * Use Claude AI to generate SEO improvements
 */
async function generateSEOImprovements(product: any): Promise<any> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!anthropicApiKey) {
    console.warn('[SEO Fixer] No ANTHROPIC_API_KEY found, skipping AI improvements');
    return null;
  }

  const systemPrompt = `You are an expert e-commerce SEO specialist. Your job is to optimize product listings for search engines.

Guidelines:
- Titles: 50-70 characters, include key product features, avoid excessive capitalization
- Descriptions: Clear, benefit-focused, 150-300 characters, include keywords naturally
- Alt text: Descriptive, 10-125 characters, describe what's in the image
- Avoid keyword stuffing, be natural and helpful
- Focus on what customers search for

Respond with valid JSON only:
{
  "title": "Optimized product title",
  "description": "Optimized description HTML",
  "images": [{"id": 123, "alt": "descriptive alt text"}],
  "changes": ["List of improvements made"]
}`;

  const userPrompt = `Optimize this product for SEO:

Title: ${product.title}
Description: ${product.body_html || 'No description'}
Price: $${product.variants?.[0]?.price || 'N/A'}
Images: ${product.images?.length || 0} images, ${product.images?.filter((img: any) => !img.alt).length || 0} missing alt text

Current Issues:
${analyzeSEOQuality(product).issues.join('\n')}

Provide SEO-optimized title, description, and image alt text.`;

  try {
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
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${await response.text()}`);
    }

    const result = await response.json();
    const contentText = result.content[0].text;

    // Extract JSON from response
    const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/) || contentText.match(/({[\s\S]*})/);
    const jsonText = jsonMatch ? jsonMatch[1] : contentText;

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('[SEO Fixer] AI generation failed:', error);
    return null;
  }
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

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}
