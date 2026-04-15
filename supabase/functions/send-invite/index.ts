import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_URL = 'https://api.resend.com/emails'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to_email, code, subject, body } = await req.json()

    if (!to_email || !code || !subject || !body) {
      return ok({ ok: false, error: 'Missing required fields: to_email, code, subject, body' })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')
    const replyTo   = Deno.env.get('RESEND_REPLY_TO')

    console.log('[send-invite] from:', fromEmail, '| to:', to_email)

    if (!resendKey) return ok({ ok: false, error: 'RESEND_API_KEY not configured' })
    if (!fromEmail) return ok({ ok: false, error: 'RESEND_FROM_EMAIL not configured' })

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
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const respBody = await resp.text()
    console.log('[send-invite] Resend status:', resp.status, '| body:', respBody)

    if (!resp.ok) {
      let detail = respBody
      try {
        const parsed = JSON.parse(respBody)
        detail = parsed.message ?? parsed.error ?? respBody
      } catch { /* keep raw */ }
      return ok({ ok: false, error: `Resend ${resp.status}: ${detail}` })
    }

    return ok({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[send-invite] exception:', msg)
    return ok({ ok: false, error: msg })
  }
})
