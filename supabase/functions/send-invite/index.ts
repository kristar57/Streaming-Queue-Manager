import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_URL = 'https://api.resend.com/emails'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to_email, code, subject, body } = await req.json()

    if (!to_email || !code || !subject || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to_email, code, subject, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendKey   = Deno.env.get('RESEND_API_KEY')
    const fromEmail   = Deno.env.get('RESEND_FROM_EMAIL')
    const replyTo     = Deno.env.get('RESEND_REPLY_TO')

    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured — RESEND_API_KEY missing' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!fromEmail) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured — RESEND_FROM_EMAIL missing' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const htmlBody = body
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')

    const payload: Record<string, unknown> = {
      from: fromEmail,
      to: [to_email],
      subject,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">${htmlBody}</div>`,
      text: body,
    }
    if (replyTo) payload.reply_to = [replyTo]

    const resp = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!resp.ok) {
      let detail = 'Unknown error'
      try {
        const errBody = await resp.json()
        detail = errBody.message ?? errBody.error ?? detail
      } catch { /* ignore */ }
      return new Response(
        JSON.stringify({ error: `Resend error: ${detail}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
