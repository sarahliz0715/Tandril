// Vercel Serverless Function: Stripe Webhook Handler
//
// Stripe calls this endpoint after payment events. We verify the signature,
// then update the user's subscription tier in Supabase auth metadata.
//
// Required Vercel env vars: STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Register this URL in Stripe Dashboard → Webhooks: https://www.tandril.org/api/stripe-webhook
// Events to subscribe: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

const PLAN_LIMITS = {
  starter:      { api_usage_limit: 500,   platforms_limit: 4  },
  professional: { api_usage_limit: 2000,  platforms_limit: 10 },
  enterprise:   { api_usage_limit: 10000, platforms_limit: 50 },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function verifySignature(payload, header, secret) {
  const parts = {};
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq > 0) parts[part.slice(0, eq)] = part.slice(eq + 1);
  }
  const timestamp = parts['t'];
  const sig = parts['v1'];
  if (!timestamp || !sig) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(timestamp + '.' + payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
  } catch {
    return false;
  }
}

async function findUserByCustomerId(supabase, customerId) {
  // TODO: optimize with a stripe_customers table once user base grows
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error || !data?.users) return null;
  return data.users.find(u => u.user_metadata?.stripe_customer_id === customerId) ?? null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('[stripe-webhook] Missing signature header or STRIPE_WEBHOOK_SECRET');
    return res.status(400).json({ error: 'Webhook not configured' });
  }

  if (!verifySignature(rawBody, sig, webhookSecret)) {
    console.error('[stripe-webhook] Signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log('[stripe-webhook] Processing event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;

        const userId = session.metadata?.user_id || session.client_reference_id;
        const planId = session.metadata?.plan_id;

        if (!userId || !planId || !PLAN_LIMITS[planId]) {
          console.error('[stripe-webhook] Missing user_id or plan_id in session metadata', session.id);
          break;
        }

        const limits = PLAN_LIMITS[planId];
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            subscription_tier: planId,
            subscription_status: 'active',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            api_usage_limit: limits.api_usage_limit,
            platforms_limit: limits.platforms_limit,
          },
        });
        if (error) throw error;
        console.log('[stripe-webhook] Activated', planId, 'for user', userId);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const user = await findUserByCustomerId(supabase, sub.customer);
        if (!user) {
          console.warn('[stripe-webhook] No user found for customer', sub.customer);
          break;
        }
        const status = sub.status === 'active' ? 'active'
          : sub.status === 'past_due' ? 'past_due'
          : 'expired';
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: { subscription_status: status },
        });
        console.log('[stripe-webhook] Updated subscription status to', status, 'for user', user.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const user = await findUserByCustomerId(supabase, sub.customer);
        if (!user) {
          console.warn('[stripe-webhook] No user found for customer', sub.customer);
          break;
        }
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            subscription_tier: 'free',
            subscription_status: 'expired',
            stripe_subscription_id: null,
            api_usage_limit: 50,
            platforms_limit: 2,
          },
        });
        console.log('[stripe-webhook] Downgraded user', user.id, 'to free (subscription cancelled)');
        break;
      }

      default:
        console.log('[stripe-webhook] Unhandled event type:', event.type);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[stripe-webhook] Error processing event:', error);
    return res.status(500).json({ error: error.message });
  }
}
