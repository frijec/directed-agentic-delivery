import { createFileRoute } from '@tanstack/react-router'
import { clean, clientIp, hashIp, isEmail, json, rateLimited, readBody } from '@/lib/form-intake'

export const Route = createFileRoute('/api/public/contact')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readBody(request)

        // Honeypot — silently accept so bots do not retry.
        if (clean(body['company_website'], 200)) return json({ ok: true })

        const name = clean(body['name'], 100)
        const email = clean(body['email'], 255)
        const phone = clean(body['phone'], 40)
        const message = clean(body['message'], 2000)
        const source = clean(body['source'], 120) || 'homepage'

        if (!name) return json({ ok: false, error: 'Angiv dit navn.' }, 400)
        if (!email || !isEmail(email)) {
          return json({ ok: false, error: 'E-mailadressen ser ikke rigtig ud.' }, 400)
        }

        const ip = clientIp(request)
        if (rateLimited(`contact:${ip}`)) {
          return json({ ok: false, error: 'For mange forsøg — prøv igen om lidt.' }, 429)
        }

        let stored = false
        try {
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
          const { error } = await supabaseAdmin.from('contact_submissions').insert({
            name,
            email,
            phone: phone || null,
            message,
            source,
            user_agent: request.headers.get('user-agent')?.slice(0, 400) ?? null,
            ip_hash: await hashIp(ip),
          })
          stored = !error
          if (error) console.error('contact insert failed', error.message)
        } catch (error) {
          console.error('contact insert threw', error)
        }

        let mailed = false
        try {
          const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
          const result = await sendTemplateEmail('contact-notification', '', {
            templateData: { name, email, phone, message, source },
            replyTo: email,
            idempotencyKey: `contact-${email}-${Date.now()}`,
          })
          mailed = result.sent
        } catch (error) {
          console.error('contact email failed', error)
        }

        if (!stored && !mailed) {
          return json({ ok: false, error: 'Kunne ikke sende lige nu.' }, 502)
        }
        return json({ ok: true, mailed, stored })
      },
    },
  },
})
