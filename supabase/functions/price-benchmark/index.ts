// Price Benchmark Engine
// Compares a seller's product price against similar listings on eBay + Claude AI analysis

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EBAY_APP_ID = Deno.env.get('EBAY_APP_ID') ?? '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

async function fetchEbayPrices(keywords: string): Promise<{
  activePrices: number[];
  soldPrices: number[];
  activeCount: number;
  soldCount: number;
}> {
  const baseUrl = 'https://svcs.ebay.com/services/search/FindingService/v1';
  const commonParams = new URLSearchParams({
    'OPERATION-NAME': 'findItemsByKeywords',
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': EBAY_APP_ID,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'keywords': keywords,
    'paginationInput.entriesPerPage': '50',
  });

  const soldParams = new URLSearchParams(commonParams);
  soldParams.set('OPERATION-NAME', 'findCompletedItems');
  soldParams.append('itemFilter(0).name', 'SoldItemsOnly');
  soldParams.append('itemFilter(0).value', 'true');

  const [activeRes, soldRes] = await Promise.allSettled([
    fetch(`${baseUrl}?${commonParams}`),
    fetch(`${baseUrl}?${soldParams}`),
  ]);

  const extractPrices = (items: any[]): number[] =>
    items
      .map((item: any) => parseFloat(item?.sellingStatus?.[0]?.currentPrice?.[0]?.['__value__'] ?? '0'))
      .filter((p: number) => p > 0);

  let activePrices: number[] = [];
  let soldPrices: number[] = [];

  if (activeRes.status === 'fulfilled' && activeRes.value.ok) {
    const data = await activeRes.value.json();
    const items = data?.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item ?? [];
    activePrices = extractPrices(items);
  }

  if (soldRes.status === 'fulfilled' && soldRes.value.ok) {
    const data = await soldRes.value.json();
    const items = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? [];
    soldPrices = extractPrices(items);
  }

  return {
    activePrices,
    soldPrices,
    activeCount: activePrices.length,
    soldCount: soldPrices.length,
  };
}

function calcStats(prices: number[]) {
  if (prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  return { median, avg, min, max, p25, p75, count: prices.length };
}

async function claudeAnalysis(
  productName: string,
  productDescription: string,
  myPrice: number,
  ebayActive: ReturnType<typeof calcStats>,
  ebaySold: ReturnType<typeof calcStats>,
  keywords: string
): Promise<string> {
  const ebayContext = [
    ebayActive ? `eBay active listings (${ebayActive.count} results): median $${ebayActive.median.toFixed(2)}, range $${ebayActive.min.toFixed(2)}–$${ebayActive.max.toFixed(2)}, middle 50% $${ebayActive.p25.toFixed(2)}–$${ebayActive.p75.toFixed(2)}` : 'No eBay active listing data available.',
    ebaySold ? `eBay recently sold (${ebaySold.count} results): median $${ebaySold.median.toFixed(2)}, range $${ebaySold.min.toFixed(2)}–$${ebaySold.max.toFixed(2)}, middle 50% $${ebaySold.p25.toFixed(2)}–$${ebaySold.p75.toFixed(2)}` : 'No eBay sold data available.',
  ].join('\n');

  const prompt = `You are a pricing advisor for an e-commerce seller. Analyze how their product is priced relative to the market.

Product: ${productName}
${productDescription ? `Description: ${productDescription}` : ''}
My price: $${myPrice.toFixed(2)}
Search terms used: "${keywords}"

Market data:
${ebayContext}

Also use your general knowledge of the market for this type of product (Etsy, handmade marketplaces, print-on-demand, etc.) since eBay may not fully represent the handmade/custom goods market.

Provide a concise benchmark analysis (3–5 sentences) covering:
1. How this price compares to the market (low/competitive/premium)
2. The typical price range for similar products across all channels
3. A specific, actionable recommendation (raise, hold, or adjust + why)

Be direct and specific. Use dollar amounts. Do not use bullet points — write in plain sentences.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error('Claude API error');
  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

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

    const body = await req.json().catch(() => ({}));
    const { product_name, product_description = '', my_price, keywords } = body;

    if (!product_name || !my_price) {
      return new Response(
        JSON.stringify({ error: 'product_name and my_price are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use provided keywords or derive from product name
    const searchKeywords = keywords || product_name;
    const price = parseFloat(my_price);

    // Fetch eBay data and run Claude analysis in parallel
    const ebayData = EBAY_APP_ID
      ? await fetchEbayPrices(searchKeywords)
      : { activePrices: [], soldPrices: [], activeCount: 0, soldCount: 0 };

    const ebayActiveStats = calcStats(ebayData.activePrices);
    const ebaySoldStats = calcStats(ebayData.soldPrices);

    const analysis = await claudeAnalysis(
      product_name,
      product_description,
      price,
      ebayActiveStats,
      ebaySoldStats,
      searchKeywords
    );

    // Determine position vs market
    let position: 'below' | 'competitive' | 'premium' = 'competitive';
    const referenceMedian = ebaySoldStats?.median ?? ebayActiveStats?.median ?? null;
    if (referenceMedian) {
      if (price < referenceMedian * 0.85) position = 'below';
      else if (price > referenceMedian * 1.20) position = 'premium';
    }

    return new Response(
      JSON.stringify({
        success: true,
        product_name,
        my_price: price,
        search_keywords: searchKeywords,
        market_data: {
          ebay_active: ebayActiveStats,
          ebay_sold: ebaySoldStats,
        },
        position,
        analysis,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[price-benchmark] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
