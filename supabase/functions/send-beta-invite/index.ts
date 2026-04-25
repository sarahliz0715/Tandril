import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Tandril <noreply@send.tandril.com>';
    const appUrl = Deno.env.get('APP_URL') ?? 'https://tandril.vercel.app';
    const inviteUrl = `${appUrl}?invited=true`;

    console.log(`[send-beta-invite] Sending invite to ${email}`);

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "You're invited to Tandril Beta!",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
            <div style="margin-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px;">You're invited to Tandril Beta!</h1>
              <p style="color: #6b7280; font-size: 16px; margin: 0;">Exclusive early access to the AI-powered commerce platform</p>
            </div>

            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              Congratulations! You've been selected to join the Tandril beta program — an AI-powered platform that helps multi-channel sellers manage all their stores in one place.
            </p>

            <div style="margin: 28px 0; padding: 20px; background: #f8fafc; border-radius: 12px; border-left: 4px solid #6366f1;">
              <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 8px;">What you'll get access to:</p>
              <ul style="color: #6b7280; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>AI business coach with real-time store insights</li>
                <li>Multi-platform management (Shopify, WooCommerce, Faire, eBay &amp; more)</li>
                <li>Automated inventory, pricing, and order workflows</li>
                <li>Daily AI-generated briefings and growth opportunities</li>
              </ul>
            </div>

            <div style="margin: 32px 0; text-align: center;">
              <a href="${inviteUrl}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; letter-spacing: 0.01em;">
                Accept Invitation &rarr;
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
              Or copy this link: <a href="${inviteUrl}" style="color: #6366f1;">${inviteUrl}</a>
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

            <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
              You received this email because an administrator at Tandril invited you to the beta program. If you didn't expect this invitation, you can safely ignore it.
            </p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errorBody = await emailRes.json().catch(() => ({}));
      throw new Error(`Resend API error: ${errorBody.message ?? emailRes.statusText}`);
    }

    console.log(`[send-beta-invite] Email sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ success: true, invite_url: inviteUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-beta-invite] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
