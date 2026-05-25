import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Verify that the webhook actually came from Shopify
async function verifyShopifyHmac(body: string, hmacHeader: string): Promise<boolean> {
  const secret = Deno.env.get("SHOPIFY_API_SECRET") ?? "";
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return computedHmac === hmacHeader;
}

serve(async (req) => {
  try {
    const rawBody = await req.text();
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256") ?? "";

    const isValid = await verifyShopifyHmac(rawBody, hmacHeader);
    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const shopDomain = req.headers.get("x-shopify-shop-domain") ?? "unknown";
    const customerEmail = payload.customer?.email ?? null;
    const customerId = payload.customer?.id ?? null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabase.from("gdpr_requests").insert({
      type: "customers/redact",
      shop_domain: shopDomain,
      customer_id: customerId,
      customer_email: customerEmail,
      orders_requested: payload.orders_to_redact ?? [],
      payload: payload,
      received_at: new Date().toISOString(),
    });

    const deletionErrors: string[] = [];

    if (customerEmail) {
      const { error: ordersError } = await supabase
        .from("orders")
        .delete()
        .eq("customer_email", customerEmail)
        .eq("platform_type", "shopify");
      if (ordersError) deletionErrors.push(`orders: ${ordersError.message}`);
    }

    if (deletionErrors.length > 0) {
      console.error("[GDPR] customers/redact partial errors:", deletionErrors.join(" | "));
    }

    console.log(`[GDPR] Customer redact processed for ${customerEmail} on ${shopDomain}`);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[GDPR] customers/redact error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
