// AWS Signature Version 4 (SigV4) for Amazon SP-API — pure Deno Web Crypto, no aws-sdk.
// Used by smart-api and oauth-callback to sign requests to sellingpartnerapi-*.amazon.com.
//
// Required env vars (app-level, not per-seller):
//   AMAZON_AWS_ACCESS_KEY_ID     — IAM access key
//   AMAZON_AWS_SECRET_ACCESS_KEY — IAM secret key
//
// SP-API service name is "execute-api"; region defaults to us-east-1 (NA).

async function sha256hex(data: string | Uint8Array): Promise<string> {
  const input = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', input);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
}

/**
 * Signs an SP-API HTTP request and returns all headers needed to send it.
 *
 * @param method       HTTP method (GET, POST, PATCH, DELETE, PUT)
 * @param url          Fully-qualified URL (URL object)
 * @param body         Request body string (empty string for GET/DELETE)
 * @param region       AWS region (e.g. 'us-east-1')
 * @param accessKeyId  IAM access key
 * @param secretKey    IAM secret key
 * @param extraHeaders Additional headers to include and sign (must include x-amz-access-token)
 * @returns            Complete set of headers including Authorization, x-amz-date, etc.
 */
export async function signSpApiRequest(
  method: string,
  url: URL,
  body: string,
  region: string,
  accessKeyId: string,
  secretKey: string,
  extraHeaders: Record<string, string>
): Promise<Record<string, string>> {
  const now = new Date();
  // Format: 20260416T123456Z
  const amzDate = now.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const host = url.host;
  const canonicalUri = url.pathname || '/';

  // Canonical query string: sort params by key
  const qp: string[] = [];
  url.searchParams.forEach((v, k) =>
    qp.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
  );
  const canonicalQS = qp.sort().join('&');

  // All headers to sign (lowercased keys, sorted)
  const hdrs: Record<string, string> = {
    host,
    'x-amz-date': amzDate,
    ...extraHeaders,
  };
  const sortedKeys = Object.keys(hdrs).map(k => k.toLowerCase()).sort();
  // Rebuild with lowercased keys
  const normalizedHdrs: Record<string, string> = {};
  for (const k of sortedKeys) {
    normalizedHdrs[k] = hdrs[k] ?? hdrs[k.toUpperCase()] ?? '';
  }

  const canonicalHdrs = sortedKeys.map(k => `${k}:${normalizedHdrs[k].trim()}`).join('\n') + '\n';
  const signedHdrs = sortedKeys.join(';');

  const payloadHash = await sha256hex(body);
  const canonicalReq = [method.toUpperCase(), canonicalUri, canonicalQS, canonicalHdrs, signedHdrs, payloadHash].join('\n');

  const service = 'execute-api';
  const credScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const strToSign = ['AWS4-HMAC-SHA256', amzDate, credScope, await sha256hex(canonicalReq)].join('\n');

  // Derive signing key chain
  const kDate    = await hmacSha256(new TextEncoder().encode(`AWS4${secretKey}`), dateStamp);
  const kRegion  = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');

  const sigHex = [...new Uint8Array(await hmacSha256(kSigning, strToSign))]
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const authHdr = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credScope}, SignedHeaders=${signedHdrs}, Signature=${sigHex}`;

  return {
    ...normalizedHdrs,
    Authorization: authHdr,
    'Content-Type': extraHeaders['Content-Type'] || 'application/json',
  };
}

/**
 * Refreshes an Amazon LWA (Login with Amazon) access token using a refresh token.
 * Returns the new access token and its expiry time.
 */
export async function refreshLwaToken(refreshToken: string, clientId: string, clientSecret: string): Promise<{ accessToken: string; expiresAt: string }> {
  const res = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`LWA token refresh failed: ${await res.text()}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
  };
}
