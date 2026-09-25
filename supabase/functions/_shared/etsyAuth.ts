// Etsy access tokens expire after ~1 hour. Every Etsy call site should get its
// token through here instead of reading platform.credentials.access_token directly.

const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Returns a usable Etsy access token for a `platforms` row, refreshing it first
 * if it's expired (or within 5 min of expiry). On refresh, the new tokens are
 * saved back to the row and the passed-in `platform` object is updated in place,
 * so later reads of platform.credentials.access_token also see the fresh token.
 *
 * Rows connected before token_expires_at was tracked are refreshed once, which
 * fills it in. If refresh fails, the existing token is returned unchanged.
 */
export async function getEtsyAccessToken(supabase: any, platform: any): Promise<string | null> {
  const creds = platform?.credentials ?? {};
  const meta = platform?.metadata ?? {};
  const currentToken: string | null = creds.access_token ?? null;

  const expiresAt = meta.token_expires_at ? new Date(meta.token_expires_at).getTime() : 0;
  if (expiresAt && Date.now() < expiresAt - REFRESH_MARGIN_MS) return currentToken;

  const clientId = Deno.env.get('ETSY_CLIENT_ID');
  if (!clientId || !creds.refresh_token) return currentToken;

  try {
    const res = await fetch(ETSY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: creds.refresh_token,
      }),
    });
    if (!res.ok) {
      console.warn(`[etsyAuth] Token refresh failed for platform ${platform.id}: ${res.status} ${await res.text()}`);
      return currentToken;
    }
    const tokens = await res.json();
    const newCreds = {
      ...creds,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || creds.refresh_token,
      expires_in: tokens.expires_in,
    };
    const newMeta = {
      ...meta,
      token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    };

    const { error } = await supabase
      .from('platforms')
      .update({ credentials: newCreds, metadata: newMeta })
      .eq('id', platform.id);
    if (error) console.warn(`[etsyAuth] Could not save refreshed token for platform ${platform.id}: ${error.message}`);

    platform.credentials = newCreds;
    platform.metadata = newMeta;
    return tokens.access_token;
  } catch (e: any) {
    console.warn(`[etsyAuth] Token refresh error for platform ${platform?.id}: ${e.message}`);
    return currentToken;
  }
}
