// Vercel Serverless Function: Shopify OAuth Callback Proxy
//
// Shopify redirects HERE after the merchant approves the app install.
// We can't point Shopify directly at the Supabase edge function because
// Supabase requires a JWT auth header, but Shopify's redirect is a plain
// browser GET with no auth. This proxy receives the redirect and passes
// the params to the frontend, which already has the user's session and
// can call the Supabase exchange function with proper auth.

export default function handler(req, res) {
  const { code, state, shop, hmac, timestamp, host } = req.query;

  // Forward the params to the frontend Platforms page
  const origin = process.env.APP_URL || `https://${req.headers.host}`;
  const redirectUrl = new URL('/Platforms', origin);

  if (code && state && shop) {
    redirectUrl.searchParams.set('shopify_code', code);
    redirectUrl.searchParams.set('shopify_state', state);
    redirectUrl.searchParams.set('shopify_shop', shop);
    if (hmac) redirectUrl.searchParams.set('shopify_hmac', hmac);
  } else {
    // Shopify sent an error or missing params
    redirectUrl.searchParams.set('error', 'Shopify did not return required OAuth parameters');
  }

  res.redirect(302, redirectUrl.toString());
}
