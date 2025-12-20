// Process Bulk Upload Edge Function
// Parses CSV files and creates products in Shopify

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

    const { upload_id } = await req.json();

    if (!upload_id) {
      throw new Error('Missing upload_id parameter');
    }

    console.log(`[Process Bulk Upload] Processing upload ${upload_id} for user ${user.id}`);

    // Get the bulk upload record
    const { data: upload, error: uploadError } = await supabaseClient
      .from('bulk_uploads')
      .select('*')
      .eq('id', upload_id)
      .eq('user_id', user.id)
      .single();

    if (uploadError || !upload) {
      throw new Error('Bulk upload not found');
    }

    // Update status to processing
    await supabaseClient
      .from('bulk_uploads')
      .update({
        processing_status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', upload_id);

    // Download the file from storage
    const fileUrl = upload.file_url;
    const fileResponse = await fetch(fileUrl);
    const fileContent = await fileResponse.text();

    // Parse CSV
    const csvData = parseCSV(fileContent);

    if (csvData.length === 0) {
      throw new Error('No data found in CSV file');
    }

    console.log(`[Process Bulk Upload] Parsed ${csvData.length} rows from CSV`);

    // Get target platforms
    const targetPlatformIds = upload.target_platforms || [];

    if (targetPlatformIds.length === 0) {
      throw new Error('No target platforms specified');
    }

    // Get platform credentials
    const { data: platforms, error: platformsError } = await supabaseClient
      .from('platforms')
      .select('*')
      .in('id', targetPlatformIds)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (platformsError || !platforms || platforms.length === 0) {
      throw new Error('No active platforms found');
    }

    // Process each row
    const results = {
      total_records: csvData.length,
      successful_records: 0,
      failed_records: 0,
      created_products: 0,
      errors: [],
    };

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];

      try {
        // Validate required fields
        if (!row.title || !row.title.trim()) {
          results.errors.push(`Row ${i + 1}: Missing product title`);
          results.failed_records++;
          continue;
        }

        // Create product on each target platform
        for (const platform of platforms) {
          try {
            const product = await createShopifyProduct(platform, row, upload.processing_options);
            console.log(`[Process Bulk Upload] Created product ${product.id} on ${platform.shop_domain}`);
            results.created_products++;
          } catch (error) {
            console.error(`[Process Bulk Upload] Error creating product on ${platform.shop_domain}:`, error);
            results.errors.push(`Row ${i + 1} on ${platform.shop_name}: ${error.message}`);
          }
        }

        results.successful_records++;
      } catch (error) {
        console.error(`[Process Bulk Upload] Error processing row ${i + 1}:`, error);
        results.errors.push(`Row ${i + 1}: ${error.message}`);
        results.failed_records++;
      }
    }

    // Update upload record with results
    await supabaseClient
      .from('bulk_uploads')
      .update({
        processing_status: results.failed_records === 0 ? 'completed' : 'completed',
        processing_results: results,
        completed_at: new Date().toISOString(),
      })
      .eq('id', upload_id);

    console.log(`[Process Bulk Upload] Completed. ${results.successful_records} successful, ${results.failed_records} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          upload_id,
          results,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Process Bulk Upload] Error:', error);

    // Try to update the upload status to failed
    const { upload_id } = await req.json().catch(() => ({}));
    if (upload_id) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseClient
        .from('bulk_uploads')
        .update({
          processing_status: 'failed',
          error_details: { message: error.message },
          completed_at: new Date().toISOString(),
        })
        .eq('id', upload_id)
        .catch(() => {});
    }

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

function parseCSV(csvContent: string): any[] {
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    return [];
  }

  // Parse header row
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));

    if (values.length === headers.length) {
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }

  return data;
}

async function createShopifyProduct(platform: any, rowData: any, options: any): Promise<any> {
  // Map CSV columns to Shopify product format
  const product: any = {
    title: rowData.title || rowData['product name'] || rowData.name,
    body_html: rowData.description || rowData.body_html || '',
    vendor: rowData.vendor || '',
    product_type: rowData.category || rowData.product_type || rowData.type || '',
    tags: rowData.tags ? rowData.tags.split(';').join(',') : '',
    status: 'active',
  };

  // Handle variants
  const variants = [];
  const price = parseFloat(rowData.price || rowData['base price'] || rowData.base_price || '0');
  const sku = rowData.sku || '';
  const inventory = parseInt(rowData.inventory || rowData['total stock'] || rowData.total_stock || '0');

  variants.push({
    price: price.toString(),
    sku: sku,
    inventory_quantity: inventory,
    inventory_management: 'shopify',
  });

  product.variants = variants;

  // Handle images if provided
  if (rowData.image_url || rowData['image url']) {
    product.images = [{
      src: rowData.image_url || rowData['image url'],
    }];
  }

  // Create product via Shopify API
  const url = `https://${platform.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/products.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': platform.access_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ product }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result.product;
}
