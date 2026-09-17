import { createFileRoute } from '@tanstack/react-router'
import { clean, clientIp, hashIp, isEmail, json, rateLimited, readBody } from '@/lib/form-intake'

export const Route = createFileRoute('/api/public/lead')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readBody(request)

        if (clean(body['company_website'], 200)) return json({ ok: true })

        const name = clean(body['name'], 100)
        const email = clean(body['email'], 255)
        const company = clean(body['company'], 150)
        const source = clean(body['source'], 160) || 'ai-playbook'

        if (!name) return json({ ok: false, error: 'Angiv dit navn.' }, 400)
        if (!email || !isEmail(email)) {
          return json({ ok: false, error: 'E-mailadressen ser ikke rigtig ud.' }, 400)
        }

        const ip = clientIp(request)
        if (rateLimited(`lead:${ip}`)) {
          return json({ ok: false, error: 'For mange forsøg — prøv igen om lidt.' }, 429)
        }

        let stored = false
        try {
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
          const { error } = await supabaseAdmin.from('contact_submissions').insert({
            name,
            email,
            company: company || null,
            message: 'AI-playbook anmodet',
            source: `playbook:${source}`,
            user_agent: request.headers.get('user-agent')?.slice(0, 400) ?? null,
            ip_hash: await hashIp(ip),
          })
          stored = !error
          if (error) console.error('lead insert failed', error.message)
        } catch (error) {
          console.error('lead insert threw', error)
        }

        let mailed = false
        try {
          const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
          const result = await sendTemplateEmail('lead-notification', '', {
            templateData: { name, email, company, source },
            replyTo: email,
            idempotencyKey: `lead-${email}-${Date.now()}`,
          })
          mailed = result.sent
        } catch (error) {
          console.error('lead email failed', error)
        }

        if (!stored && !mailed) {
          return json({ ok: false, error: 'Kunne ikke sende lige nu.' }, 502)
        }
        return json({ ok: true, mailed, stored })
      },
    },
  },
})
