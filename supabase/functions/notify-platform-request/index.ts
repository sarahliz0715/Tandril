import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const NOTIFY_EMAIL = 'evensonssarah704@gmail.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Tandril <noreply@tandril.org>';

    if (!resendApiKey) throw new Error('RESEND_API_KEY is not configured');

    let body: any = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch { /* empty body is fine */ }

    const { platform_name, platform_url, business_justification, api_documentation, estimated_users, submitted_by } = body;

    const estimatedUsersLabel: Record<string, string> = {
      just_me: 'Just me',
      few_users: 'A few users (2–10)',
      many_users: 'Many users (10–100)',
      hundreds: 'Hundreds of users',
      thousands: 'Thousands of users',
    };

    const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
      <h1 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 4px;">New Platform Request</h1>
      <p style="color:#64748b;font-size:14px;margin:0 0 24px;">Someone just submitted a platform integration request on Tandril.</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="background:#f8fafc;">
          <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#64748b;width:40%;">Platform Name</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a1a2e;font-weight:600;">${platform_name || '—'}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#64748b;border-top:1px solid #f1f5f9;">Platform URL</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a1a2e;border-top:1px solid #f1f5f9;">${platform_url ? `<a href="${platform_url}" style="color:#3b82f6;">${platform_url}</a>` : '—'}</td>
        </tr>
        <tr style="background:#f8fafc;">
          <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#64748b;border-top:1px solid #f1f5f9;">Estimated Users</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a1a2e;border-top:1px solid #f1f5f9;">${estimatedUsersLabel[estimated_users] || estimated_users || '—'}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#64748b;border-top:1px solid #f1f5f9;">Submitted By</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a1a2e;border-top:1px solid #f1f5f9;">${submitted_by || 'Unknown'}</td>
        </tr>
        <tr style="background:#f8fafc;">
          <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#64748b;border-top:1px solid #f1f5f9;">API Docs</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a1a2e;border-top:1px solid #f1f5f9;">${api_documentation ? `<a href="${api_documentation}" style="color:#3b82f6;">${api_documentation}</a>` : '—'}</td>
        </tr>
      </table>

      <div style="background:#f0f9ff;border-left:4px solid #3b82f6;padding:16px;border-radius:6px;margin-bottom:24px;">
        <p style="font-size:12px;font-weight:600;color:#1e40af;margin:0 0 6px;">Why they need it</p>
        <p style="font-size:14px;color:#1e3a5f;margin:0;">${business_justification || '—'}</p>
      </div>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
      <p style="font-size:12px;color:#94a3b8;margin:0;">Tandril · Platform Request Notification</p>
    </div>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [NOTIFY_EMAIL],
        subject: `New Platform Request: ${platform_name || 'Unknown'}`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json().catch(() => ({}));
      throw new Error(`Resend error: ${err.message ?? emailRes.statusText}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[notify-platform-request] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
