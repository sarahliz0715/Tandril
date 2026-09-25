// Marks a platform connection as needing a reconnect when the platform rejects its
// stored credentials (e.g. Shopify 401 after the app was uninstalled or its access
// token was revoked). The row stays is_active so it keeps showing up everywhere, but
// status becomes 'needs_reconnect' so the Platforms/Products/Inventory pages can
// say so instead of silently showing an empty product list.
//
// Reconnecting through the normal connect flow sets status back to 'connected'.

export function isAuthFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /\b(401|403)\b|Invalid API key or access token|unrecognized login/i.test(msg);
}

/** Returns true if this call changed the status (i.e. it wasn't already flagged). */
export async function markNeedsReconnect(supabase: any, platform: any, reason: string): Promise<boolean> {
  if (!platform?.id) return false;
  const alreadyFlagged = platform.status === 'needs_reconnect';
  const metadata = {
    ...(platform.metadata || {}),
    connection_error: { message: reason.slice(0, 300), at: new Date().toISOString() },
  };
  const { error } = await supabase
    .from('platforms')
    .update({ status: 'needs_reconnect', metadata })
    .eq('id', platform.id);
  if (error) {
    console.warn(`[platformHealth] Could not flag platform ${platform.id}: ${error.message}`);
    return false;
  }
  platform.status = 'needs_reconnect';
  platform.metadata = metadata;
  console.warn(`[platformHealth] ${platform.platform_type} ${platform.shop_domain || platform.id} needs reconnect: ${reason}`);
  return !alreadyFlagged;
}

/** Clears a needs_reconnect flag once the credentials work again. */
export async function markHealthy(supabase: any, platform: any): Promise<void> {
  if (platform?.status !== 'needs_reconnect') return;
  const { connection_error: _removed, ...metadata } = platform.metadata || {};
  await supabase.from('platforms').update({ status: 'connected', metadata }).eq('id', platform.id);
  platform.status = 'connected';
  platform.metadata = metadata;
}
