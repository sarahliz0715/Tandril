// Emails the seller when one of their store connections stops working, then reminds them
// if it's still broken — a disconnected store means sales on one platform stop reducing
// stock on the others, which is exactly how overselling happens.
//
// Schedule per broken connection (tracked in platforms.metadata.connection_error):
//   email 1 as soon as it's detected, email 2 after 24h, email 3 after 72h, then stop.
//   An app uninstall gets only the first email — the seller may have left on purpose.
// Needs a service-role Supabase client (reads the seller's email via auth.admin).

const REMINDER_DELAYS_HOURS = [0, 24, 72];
const APP_URL = 'https://www.tandril.org';

export const PLATFORM_LABELS: Record<string, string> = {
  shopify: 'Shopify', ebay: 'eBay', etsy: 'Etsy', woocommerce: 'WooCommerce', bigcommerce: 'BigCommerce',
  walmart: 'Walmart', amazon: 'Amazon', tiktok_shop: 'TikTok Shop', faire: 'Faire', instagram: 'Instagram Shop',
};

/** True if this broken connection is due its next email (initial or reminder). */
export function reconnectEmailDue(platform: any): boolean {
  const ce = platform?.metadata?.connection_error;
  if (platform?.status !== 'needs_reconnect' || !ce?.at) return false;
  const sent = ce.emails_sent ?? 0;
  const maxEmails = ce.reason === 'uninstalled' ? 1 : REMINDER_DELAYS_HOURS.length;
  if (sent >= maxEmails) return false;
  const dueAt = new Date(ce.at).getTime() + REMINDER_DELAYS_HOURS[sent] * 3600 * 1000;
  return Date.now() >= dueAt;
}

/**
 * Sends the next reconnect email for this platform and records it in metadata.
 * Returns true if an email was sent.
 */
export async function sendReconnectEmail(supabase: any, platform: any): Promise<boolean> {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.warn('[connectionAlerts] RESEND_API_KEY not set — skipping reconnect email');
    return false;
  }

  const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(platform.user_id);
  const to = userData?.user?.email;
  if (userErr || !to) {
    console.warn(`[connectionAlerts] No email for user ${platform.user_id}: ${userErr?.message ?? 'missing'}`);
    return false;
  }

  const ce = platform.metadata?.connection_error || {};
  const sent = ce.emails_sent ?? 0;
  const platformLabel = PLATFORM_LABELS[platform.platform_type] || platform.platform_type;
  const store = platform.shop_name || platform.shop_domain || platform.name || `your ${platformLabel} store`;
  const uninstalled = ce.reason === 'uninstalled';
  const hoursBroken = Math.max(1, Math.round((Date.now() - new Date(ce.at).getTime()) / 3600000));

  const subject = sent === 0
    ? `Action needed: reconnect ${store} to keep your inventory in sync`
    : `Reminder: ${store} has been disconnected for ${hoursBroken >= 48 ? `${Math.round(hoursBroken / 24)} days` : `${hoursBroken} hours`}`;

  const cause = uninstalled
    ? `Tandril was removed from ${store}, so it can no longer read or update that store.`
    : `${platformLabel} stopped accepting Tandril's connection to ${store}.`;

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
      <h2 style="color:#b45309">${sent === 0 ? 'Your store needs to be reconnected' : 'Your store is still disconnected'}</h2>
      <p style="font-size:16px">${cause}</p>
      <p style="font-size:16px"><strong>Until you reconnect, inventory isn't syncing.</strong>
        Sales on your other platforms won't lower your ${platformLabel} stock (and ${platformLabel} sales won't lower theirs),
        so you could sell items you no longer have.</p>
      <p style="margin:28px 0">
        <a href="${APP_URL}/Platforms" style="background:#059669;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">
          Reconnect ${store}
        </a>
      </p>
      <p style="font-size:14px;color:#64748b">It takes about a minute: open Platforms in Tandril and click <em>Reconnect Store</em>
        (or connect ${platformLabel} again). Your product links and settings are kept.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
      <p style="font-size:12px;color:#94a3b8">You're getting this because ${store} is connected to your Tandril account.</p>
    </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Tandril Alerts <alerts@tandril.org>', to: [to], subject, html }),
    });
    if (!res.ok) {
      console.warn('[connectionAlerts] Resend error:', await res.text());
      return false;
    }
  } catch (e: any) {
    console.warn('[connectionAlerts] Email send failed:', e.message);
    return false;
  }

  const metadata = {
    ...(platform.metadata || {}),
    connection_error: { ...ce, emails_sent: sent + 1, last_emailed_at: new Date().toISOString() },
  };
  await supabase.from('platforms').update({ metadata }).eq('id', platform.id);
  platform.metadata = metadata;
  console.log(`[connectionAlerts] Sent reconnect email ${sent + 1}/${REMINDER_DELAYS_HOURS.length} for ${store} to user ${platform.user_id}`);
  return true;
}
