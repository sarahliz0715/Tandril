// Vercel Serverless Function: Shopify OAuth Callback
//
// Shopify redirects HERE after the merchant approves the app.
//
// Two flows:
//   A. Connected user: the merchant initiated OAuth from inside Tandril (logged
//      in, clicked "Connect Shopify"). An oauth_states row exists with their
//      user_id. → Redirect to /Platforms so the frontend can call
//      shopify-auth-exchange with the user's session JWT (existing flow).
//
//   B. App Store install: the merchant clicked Install from the Shopify App
//      Store — no Tandril session exists. → Exchange the code here, find or
//      create a Tandril account using the shop owner's email, write the
//      platform row via shopify-app-install edge function, generate a
//      magic-link sign-in, and redirect to /Pricing.

import crypto from 'crypto';

function supabaseUrl() {
  return process.env.SUPABASE_URL;
}
function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function supabaseFetch(path, options = {}) {
  const url = `${supabaseUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey(),
      'Authorization': `Bearer ${serviceKey()}`,
      ...(options.headers || {}),
    },
  });
  return res;
}

export default async function handler(req, res) {
  const { code, state, shop, hmac } = req.query;
  const origin = process.env.APP_URL || `https://${req.headers.host}`;

  if (!code || !state || !shop) {
    const url = new URL('/Platforms', origin);
    url.searchParams.set('error', 'Shopify did not return required OAuth parameters');
    return res.redirect(302, url.toString());
  }

  // --- Flow A check: was this connect attempt initiated by a logged-in
  //     Tandril session? The only signal available here (a raw browser
  //     redirect from Shopify, carrying no Authorization header) is whether
  //     our own shopify-auth-init ever created an oauth_states row for this
  //     `state`. `state` is a random, single-use UUID generated per attempt
  //     and tied to a user_id at creation time — that's what proves this
  //     OAuth completion belongs to the specific logged-in user who started
  //     it, so it alone is sufficient to look this up.
  //
  //     Deliberately NOT gated on shop_domain matching what was stored:
  //     Shopify stores can be renamed, and the OLD .myshopify.com handle
  //     keeps working as an alias that still resolves to the same store —
  //     a merchant can type the old handle, get correctly routed through
  //     approval for the right store, and have Shopify's callback report
  //     the NEW canonical handle. Comparing those as strings produces a
  //     false-positive "different store" rejection for a real, legitimate
  //     connection (confirmed in testing, July 2026). Shopify's callback
  //     `shop` value is the authoritative answer for which store this is;
  //     what was originally typed is only ever used to build the initial
  //     authorize redirect, never as a validation gate afterward.
  //
  //     If a row exists at all, this WAS initiated by a logged-in session
  //     — even if it's since expired, in which case we fail closed and ask
  //     them to restart rather than falling through to the anonymous
  //     Flow B. Flow B is reserved strictly for the case where no
  //     oauth_states row was ever created for this state — i.e. a genuine
  //     App Store "Install" click with no Tandril session involved at all.
  try {
    const stateRes = await supabaseFetch(
      `/rest/v1/oauth_states?state=eq.${encodeURIComponent(state)}&select=user_id,expires_at&limit=1`
    );

    if (!stateRes.ok) {
      throw new Error(`oauth_states lookup returned ${stateRes.status}`);
    }

    const rows = await stateRes.json();

    if (rows?.length > 0 && rows[0].user_id) {
      const oauthState = rows[0];
      const isExpired = new Date(oauthState.expires_at) <= new Date();

      if (!isExpired) {
        // Flow A: a logged-in user initiated this connect
        const redirectUrl = new URL('/Platforms', origin);
        redirectUrl.searchParams.set('shopify_code', code);
        redirectUrl.searchParams.set('shopify_state', state);
        redirectUrl.searchParams.set('shopify_shop', shop);
        if (hmac) redirectUrl.searchParams.set('shopify_hmac', hmac);
        return res.redirect(302, redirectUrl.toString());
      }

      // A row exists — a logged-in session initiated this — but it's
      // expired. Fail closed instead of falling through to the anonymous
      // Flow B.
      const url = new URL('/Platforms', origin);
      url.searchParams.set('error', 'Your connection attempt expired. Please try connecting again.');
      return res.redirect(302, url.toString());
    }
    // rows.length === 0: no oauth_states row was ever created for this
    // state — genuinely no Tandril session involved. Fall through to Flow B.
  } catch (e) {
    console.error('[shopify-callback] oauth_states lookup error:', e.message);
    // A lookup error is NOT proof that no session exists — fail closed
    // rather than falling through to the anonymous install flow.
    const url = new URL('/Platforms', origin);
    url.searchParams.set('error', 'Could not verify your connection session. Please try connecting again.');
    return res.redirect(302, url.toString());
  }

  // --- Flow B: App Store install (no oauth_states row exists for this state) ---
  try {
    const shopifyApiKey    = process.env.SHOPIFY_API_KEY;
    const shopifyApiSecret = process.env.SHOPIFY_API_SECRET;

    if (!shopifyApiKey || !shopifyApiSecret) {
      throw new Error('SHOPIFY_API_KEY / SHOPIFY_API_SECRET not set in Vercel env');
    }

    // Verify HMAC so we know this is genuinely from Shopify
    if (hmac) {
      const params = Object.entries(req.query)
        .filter(([k]) => k !== 'hmac')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      const digest = crypto.createHmac('sha256', shopifyApiSecret).update(params).digest('hex');
      if (digest !== hmac) throw new Error('HMAC verification failed');
    }

    // Exchange code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: shopifyApiKey, client_secret: shopifyApiSecret, code }),
    });
    if (!tokenRes.ok) throw new Error('Token exchange failed: ' + (await tokenRes.text()));
    const { access_token, scope } = await tokenRes.json();
    if (!access_token) throw new Error('No access token returned by Shopify');

    // Get shop owner email + display name
    let ownerEmail = null;
    let shopName   = shop;
    try {
      const shopRes = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
        headers: { 'X-Shopify-Access-Token': access_token },
      });
      if (shopRes.ok) {
        const { shop: info } = await shopRes.json();
        ownerEmail = info?.email || info?.customer_email || null;
        shopName   = info?.name  || shop;
      }
    } catch (_) {}

    if (!ownerEmail) throw new Error('Could not retrieve shop owner email from Shopify');

    // Find or create Tandril user by email
    let userId = null;
    const listRes = await supabaseFetch(`/auth/v1/admin/users?email=${encodeURIComponent(ownerEmail)}`);
    if (listRes.ok) {
      const { users } = await listRes.json();
      if (users?.length > 0) {
        userId = users[0].id;
        console.log('[shopify-callback] Found existing user:', userId);
      }
    }

    if (!userId) {
      // Create new user — they'll receive a magic link to set a password
      const createRes = await supabaseFetch('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: ownerEmail,
          email_confirm: true,
          user_metadata: { subscription_tier: 'free', api_usage_limit: 50, platforms_limit: 2 },
        }),
      });
      if (!createRes.ok) throw new Error('Could not create Tandril user: ' + (await createRes.text()));
      const created = await createRes.json();
      userId = created.id;
      console.log('[shopify-callback] Created new user:', userId);
    }

    // Write platform row (encrypt token + register webhooks) via edge function
    const installRes = await fetch(`${supabaseUrl()}/functions/v1/shopify-app-install`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey()}`,
      },
      body: JSON.stringify({ user_id: userId, shop, shop_name: shopName, access_token, scope }),
    });
    if (!installRes.ok) {
      console.warn('[shopify-callback] shopify-app-install returned', installRes.status, await installRes.text());
    }

    // Generate magic link → auto-signs the user in and sends them to /Pricing
    const mlRes = await supabaseFetch('/auth/v1/admin/generate_link', {
      method: 'POST',
      body: JSON.stringify({
        type: 'magiclink',
        email: ownerEmail,
        options: { redirect_to: `${origin}/Pricing` },
      }),
    });
    if (!mlRes.ok) throw new Error('Magic link generation failed: ' + (await mlRes.text()));
    const mlData = await mlRes.json();
    const actionLink = mlData?.properties?.action_link || mlData?.action_link;
    if (!actionLink) throw new Error('No action_link in magic link response');

    console.log('[shopify-callback] App Store install complete, redirecting via magic link for:', ownerEmail);
    return res.redirect(302, actionLink);

  } catch (err) {
    console.error('[shopify-callback] App Store install error:', err.message);
    // Send them to Login with context so they can manually connect
    const fallback = new URL('/Login', origin);
    fallback.searchParams.set('shopify_shop', shop);
    fallback.searchParams.set('install_error', '1');
    return res.redirect(302, fallback.toString());
  }
}
