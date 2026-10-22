// Supabase API keys for edge functions — the new publishable (sb_publishable_...) and
// secret (sb_secret_...) keys only.
//
// Supabase injects them as JSON objects keyed by name, e.g.
//   SUPABASE_SECRET_KEYS      = {"default":"sb_secret_..."}
//   SUPABASE_PUBLISHABLE_KEYS = {"default":"sb_publishable_..."}
// SB_SECRET_KEY / SB_PUBLISHABLE_KEY function secrets are only a fallback if those are
// missing (custom secrets can't start with SUPABASE_).
//
// The legacy SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY are deliberately never read:
// the service_role key leaked in the Railway breach (Oct 2026). Even after the legacy keys
// are disabled in the dashboard, those env vars would still hold the old values, so any
// code comparing a caller's key against them would keep trusting the leaked key.
//
// New keys are not JWTs: send them on the `apikey` header only (never
// `Authorization: Bearer`), and a function called with one must be deployed with
// --no-verify-jwt and check the key itself with isServiceRequest().

function namedKeys(jsonVar: string, fallbackVar: string): string[] {
  const keys: string[] = [];
  const raw = Deno.env.get(jsonVar);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const ordered = ['default', ...Object.keys(parsed).filter((k) => k !== 'default')];
      for (const name of ordered) {
        const v = parsed[name];
        if (typeof v === 'string' && v) keys.push(v);
      }
    } catch {
      console.error(`[supabaseKeys] ${jsonVar} is not valid JSON`);
    }
  }
  const fallback = Deno.env.get(fallbackVar);
  if (fallback && !keys.includes(fallback)) keys.push(fallback);
  return keys;
}

/** Secret key (full access, bypasses RLS). Backend use only. */
export function getSecretKey(): string {
  const key = namedKeys('SUPABASE_SECRET_KEYS', 'SB_SECRET_KEY')[0] ?? '';
  if (!key) console.error('[supabaseKeys] No secret key: SUPABASE_SECRET_KEYS and SB_SECRET_KEY are both unset');
  return key;
}

/** Publishable key (low privilege, same as the old anon key). */
export function getPublishableKey(): string {
  const key = namedKeys('SUPABASE_PUBLISHABLE_KEYS', 'SB_PUBLISHABLE_KEY')[0] ?? '';
  if (!key) console.error('[supabaseKeys] No publishable key: SUPABASE_PUBLISHABLE_KEYS and SB_PUBLISHABLE_KEY are both unset');
  return key;
}

/** Headers for one Tandril edge function (or cron job) calling another. */
export function serviceHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', 'apikey': getSecretKey() };
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/**
 * The signed-in user's id from the request's `Authorization: Bearer <user JWT>`, or null.
 * `supabase` is any client for this project (a secret-key client is fine).
 */
export async function getSignedInUserId(req: Request, supabase: any): Promise<string | null> {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt || jwt.startsWith('sb_')) return null;
  const { data, error } = await supabase.auth.getUser(jwt);
  return error ? null : (data?.user?.id ?? null);
}

/**
 * True when the request carries one of this project's secret keys on the `apikey`
 * header — i.e. it comes from our own cron jobs, edge functions or Vercel API routes.
 * The legacy service_role JWT is never accepted.
 */
export function isServiceRequest(req: Request): boolean {
  const presented = (req.headers.get('apikey') ?? '').trim();
  if (!presented.startsWith('sb_secret_')) return false;
  let ok = false;
  for (const key of namedKeys('SUPABASE_SECRET_KEYS', 'SB_SECRET_KEY')) {
    if (timingSafeEqual(presented, key)) ok = true;
  }
  return ok;
}
