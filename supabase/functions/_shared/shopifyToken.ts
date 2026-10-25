// Shopify access tokens: getting, saving, refreshing and migrating to expiring tokens.
//
// From Jan 1, 2027 Shopify requires public apps to use EXPIRING offline tokens: a 60-minute
// access token plus a refresh token (90 days, replaced on every refresh). See
// supabase/migrations/20261025000002_shopify_expiring_tokens.sql for where they live:
//   - platforms.access_token  = the current access token (encrypted). Every function that
//     reads it keeps working; refresh-shopify-tokens renews it every ~40 minutes.
//   - shopify_token_state     = refresh token + expiry, service-only.
// A store with no shopify_token_state row still has a non-expiring token and is untouched.
//
// Shopify facts this relies on (shopify.dev, "Refresh an expiring offline token" and
// "Migrate to expiring offline access tokens"):
//   - After a refresh, the previous access token stays valid until its own expiry.
//   - The refresh token you presented stays usable until you USE the new one, so a lost
//     refresh response (timeout, crash before saving) can simply be retried.
//   - A dead refresh token returns 401 {"error":"invalid_request"}: the merchant must reconnect.
//   - Migration (token exchange of the non-expiring token) kills the old token for GraphQL
//     immediately; repeating it within 7 days with the old token returns the same pair.

import { encrypt, decrypt, isEncrypted } from './encryption.ts';

const OFFLINE_TOKEN_TYPE = 'urn:shopify:params:oauth:token-type:offline-access-token';
const TOKEN_EXCHANGE_GRANT = 'urn:ietf:params:oauth:grant-type:token-exchange';
const API_VERSION = '2026-01';

/** getShopifyAccessToken refreshes when less than this is left. */
export const REFRESH_IF_LESS_THAN_MS = 5 * 60_000;

export interface ShopifyTokenResponse {
  access_token: string;
  scope?: string;
  expires_in?: number;              // seconds; only on expiring tokens
  refresh_token?: string;           // only on expiring tokens
  refresh_token_expires_in?: number;
}

export type RefreshResult =
  | { status: 'refreshed' | 'refreshed_elsewhere'; access_token: string; expires_at: string }
  | { status: 'fresh'; access_token: string; expires_at: string }
  | { status: 'not_expiring' }
  | { status: 'busy' }
  | { status: 'dead'; error: string }      // refresh token rejected — merchant must reconnect
  | { status: 'failed'; error: string };   // transient (network, 5xx) — safe to retry

/** New connections ask Shopify for expiring tokens only when this is "on". */
export function expiringTokensEnabled(): boolean {
  return (Deno.env.get('SHOPIFY_EXPIRING_TOKENS') || '').trim().toLowerCase() === 'on';
}

function appCredentials(): { client_id: string; client_secret: string } {
  const client_id = Deno.env.get('SHOPIFY_API_KEY');
  const client_secret = Deno.env.get('SHOPIFY_API_SECRET');
  if (!client_id || !client_secret) throw new Error('Shopify API credentials not configured');
  return { client_id, client_secret };
}

async function postTokenEndpoint(shop: string, params: Record<string, string>) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams(params),
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 300) }; }
  return { ok: res.ok, status: res.status, body };
}

async function plain(token: string): Promise<string> {
  return isEncrypted(token) ? await decrypt(token) : token;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * OAuth "code → token" exchange used by the connect paths. `shop` must already be validated
 * (normalizeShopDomain). Adds expiring=1 when SHOPIFY_EXPIRING_TOKENS is on.
 */
export async function exchangeShopifyCode(shop: string, code: string): Promise<ShopifyTokenResponse> {
  const params: Record<string, string> = { ...appCredentials(), code };
  let r;
  if (expiringTokensEnabled()) {
    r = await postTokenEndpoint(shop, { ...params, expiring: '1' });
  } else {
    // Switch off: exactly the request the connect paths always sent (non-expiring token).
    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const text = await res.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 300) }; }
    r = { ok: res.ok, status: res.status, body };
  }
  if (!r.ok || !r.body?.access_token) {
    throw new Error(`Failed to exchange code for token: ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  }
  return r.body as ShopifyTokenResponse;
}

/** True when Shopify gave us an expiring token (refresh token + lifetime). */
export function isExpiringToken(t: ShopifyTokenResponse): boolean {
  return Boolean(t.refresh_token && t.expires_in);
}

/**
 * Save a token Shopify just issued. Expiring → access token on platforms + refresh token in
 * shopify_token_state; non-expiring → access token only (and any stale expiring state removed).
 * With expectedAccessToken (the encrypted value we read before asking Shopify), nothing is
 * written if platforms.access_token changed in the meantime.
 */
export async function saveShopifyToken(
  supabase: any,
  platformId: string,
  t: ShopifyTokenResponse,
  opts: { migratedFrom?: string; expectedAccessToken?: string } = {},
): Promise<{ accessTokenEncrypted: string; expiresAt: string | null }> {
  const accessEnc = await encrypt(t.access_token);
  const expiring = isExpiringToken(t);
  const now = Date.now();
  const expiresAt = expiring ? new Date(now + t.expires_in! * 1000).toISOString() : null;
  const { error } = await supabase.rpc('save_shopify_token', {
    p_platform_id: platformId,
    p_access_token: accessEnc,
    p_refresh_token: expiring ? await encrypt(t.refresh_token!) : null,
    p_access_expires_at: expiresAt,
    p_refresh_expires_at: expiring && t.refresh_token_expires_in
      ? new Date(now + t.refresh_token_expires_in * 1000).toISOString() : null,
    p_migrated_from: opts.migratedFrom ?? null,
    p_expected_access_token: opts.expectedAccessToken ?? null,
  });
  if (error) throw new Error(`Could not save Shopify token: ${error.message}`);
  return { accessTokenEncrypted: accessEnc, expiresAt };
}

async function readTokenRow(supabase: any, platformId: string) {
  const { data: platform, error } = await supabase
    .from('platforms')
    .select('id, shop_domain, access_token')
    .eq('id', platformId)
    .maybeSingle();
  if (error) throw new Error(`Could not read Shopify connection: ${error.message}`);
  // Missing table (migration not applied yet) or no row = non-expiring token.
  const { data: state } = await supabase
    .from('shopify_token_state')
    .select('for_access_token, refresh_token, access_token_expires_at, lease_until')
    .eq('platform_id', platformId)
    .maybeSingle();
  const current = state && platform?.access_token && state.for_access_token === platform.access_token ? state : null;
  return { platform, state: current, staleState: Boolean(state && !current) };
}

/**
 * The access token to use for a Shopify call right now, refreshing first if it expires within
 * 5 minutes. Non-expiring tokens are returned as they are. Throws an error containing "401"
 * (so platformHealth.isAuthFailure flags the store) only when the merchant must reconnect.
 */
export async function getShopifyAccessToken(supabase: any, platformId: string): Promise<string> {
  const { platform, state } = await readTokenRow(supabase, platformId);
  if (!platform?.access_token) throw new Error('401 no Shopify access token stored');
  if (!state) return plain(platform.access_token);

  const msLeft = new Date(state.access_token_expires_at).getTime() - Date.now();
  if (msLeft > REFRESH_IF_LESS_THAN_MS) return plain(platform.access_token);

  const r = await refreshShopifyToken(supabase, platformId);
  if (r.status === 'refreshed' || r.status === 'refreshed_elsewhere' || r.status === 'fresh') return r.access_token;
  if (r.status === 'dead') throw new Error(`401 Shopify login expired and could not be renewed — reconnect the store (${r.error})`);
  // Couldn't refresh right now (busy/transient). The current token still works until it expires.
  if (msLeft > 0) return plain(platform.access_token);
  throw new Error(`Shopify token refresh failed: ${'error' in r ? r.error : r.status}`);
}

/**
 * Renew one store's access token. Only one caller at a time per store (lease); others wait
 * for that refresh to land. Skips the call to Shopify if the token still has at least
 * `minRemainingMs` left, unless `force` is set.
 */
export async function refreshShopifyToken(
  supabase: any,
  platformId: string,
  opts: { minRemainingMs?: number; force?: boolean } = {},
): Promise<RefreshResult> {
  const minRemainingMs = opts.minRemainingMs ?? REFRESH_IF_LESS_THAN_MS;
  const { data: claimed, error: claimErr } = await supabase.rpc('claim_shopify_token_refresh', {
    p_platform_id: platformId, p_seconds: 30,
  });
  if (claimErr) return { status: 'failed', error: `lease: ${claimErr.message}` };

  if (!claimed) {
    // Someone else is refreshing this store (or it has no expiring state). Wait for them.
    for (let i = 0; i < 15; i++) {
      const { platform, state } = await readTokenRow(supabase, platformId);
      if (!state) return { status: 'not_expiring' };
      if (new Date(state.access_token_expires_at).getTime() - Date.now() > REFRESH_IF_LESS_THAN_MS) {
        return { status: 'refreshed_elsewhere', access_token: await plain(platform.access_token), expires_at: state.access_token_expires_at };
      }
      await sleep(1000);
    }
    return { status: 'busy' };
  }

  const release = (lastError?: string) => supabase
    .from('shopify_token_state')
    .update({ lease_until: null, ...(lastError ? { last_error: lastError.slice(0, 500), updated_at: new Date().toISOString() } : {}) })
    .eq('platform_id', platformId);

  try {
    // Re-read under the lease: another refresh may have just finished.
    const { platform, state } = await readTokenRow(supabase, platformId);
    if (!platform?.access_token || !state) { await release(); return { status: 'not_expiring' }; }
    const msLeft = new Date(state.access_token_expires_at).getTime() - Date.now();
    if (!opts.force && msLeft > minRemainingMs) {
      await release();
      return { status: 'fresh', access_token: await plain(platform.access_token), expires_at: state.access_token_expires_at };
    }

    const r = await postTokenEndpoint(platform.shop_domain, {
      ...appCredentials(),
      grant_type: 'refresh_token',
      refresh_token: await plain(state.refresh_token),
    });
    if (!r.ok || !r.body?.access_token) {
      const msg = `${r.status} ${JSON.stringify(r.body).slice(0, 300)}`;
      await release(msg);
      // 401 = refresh token expired/replaced/invalid. Anything else (5xx, timeouts) is
      // transient, and the refresh token we hold is still good for a retry.
      return r.status === 401 ? { status: 'dead', error: msg } : { status: 'failed', error: msg };
    }
    if (!isExpiringToken(r.body)) {
      await release('refresh returned no refresh token');
      return { status: 'failed', error: 'Shopify refresh response had no refresh_token/expires_in' };
    }

    const saved = await saveShopifyToken(supabase, platformId, r.body, { expectedAccessToken: platform.access_token });
    return { status: 'refreshed', access_token: r.body.access_token, expires_at: saved.expiresAt! };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await release(msg);
    return { status: 'failed', error: msg };
  }
}

/**
 * Switch one store from its non-expiring token to an expiring pair, without the merchant
 * doing anything. Shopify invalidates the old token for GraphQL as soon as it answers, so the
 * new pair is saved before anything else; if saving fails, running this again within 7 days
 * gets the same pair back (the old token is still what platforms.access_token holds).
 */
export async function migrateShopifyToken(supabase: any, platformId: string): Promise<{
  status: 'migrated' | 'already_expiring'; shop: string; expires_at?: string; shop_name?: string;
}> {
  const { platform, state } = await readTokenRow(supabase, platformId);
  if (!platform?.access_token) throw new Error('No Shopify access token stored for this connection');
  if (state) return { status: 'already_expiring', shop: platform.shop_domain };

  const legacy = await plain(platform.access_token);
  const r = await postTokenEndpoint(platform.shop_domain, {
    ...appCredentials(),
    grant_type: TOKEN_EXCHANGE_GRANT,
    subject_token: legacy,
    subject_token_type: OFFLINE_TOKEN_TYPE,
    requested_token_type: OFFLINE_TOKEN_TYPE,
    expiring: '1',
  });
  if (!r.ok || !isExpiringToken(r.body || {})) {
    // Shopify refused: the old token is untouched and still works.
    throw new Error(`Shopify did not switch this store (old token still in use): ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  }

  let saved: { expiresAt: string | null } | null = null;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3 && !saved; attempt++) {
    try {
      saved = await saveShopifyToken(supabase, platformId, r.body, {
        migratedFrom: platform.access_token,
        expectedAccessToken: platform.access_token,
      });
    } catch (e) {
      lastErr = e;
      await sleep(1000 * (attempt + 1));
    }
  }
  if (!saved) {
    throw new Error(`Shopify switched the store but the new token could not be saved — run migrate again within 7 days to recover it: ${lastErr instanceof Error ? lastErr.message : lastErr}`);
  }

  // Prove the new token works.
  const check = await fetch(`https://${platform.shop_domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': r.body.access_token },
    body: JSON.stringify({ query: '{ shop { name } }' }),
  });
  const json = await check.json().catch(() => ({}));
  if (!check.ok || json.errors) throw new Error(`Saved the new token but a test call failed: ${check.status} ${JSON.stringify(json.errors || json).slice(0, 300)}`);

  return { status: 'migrated', shop: platform.shop_domain, expires_at: saved.expiresAt!, shop_name: json.data?.shop?.name };
}
