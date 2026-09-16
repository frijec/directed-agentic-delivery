import { createFileRoute } from '@tanstack/react-router'
import { clean, clientIp, hashIp, isEmail, json, rateLimited, readBody } from '@/lib/form-intake'

function isValidAnswers(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 6 &&
    value.every((v) => Number.isInteger(v) && v >= 0 && v <= 3)
  )
}

export const Route = createFileRoute('/api/public/niveau-tjek')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readBody(request)

        // Honeypot — silently accept so bots do not retry.
        if (clean(body['company_website'], 200)) return json({ ok: true })

        const company = clean(body['company'], 150)
        const role = clean(body['role'], 120)
        const orgSize = clean(body['org_size'], 20)
        const currentAiUsage = clean(body['current_ai_usage'], 2000)
        const biggestChallenge = clean(body['biggest_challenge'], 2000)
        const conversationValue = clean(body['conversation_value'], 2000)
        const email = clean(body['email'], 255)
        const answers = body['answers']

        if (!email || !isEmail(email)) {
          return json({ ok: false, error: 'E-mailadressen ser ikke rigtig ud.' }, 400)
        }
        if (!isValidAnswers(answers)) {
          return json({ ok: false, error: 'Ugyldige svar — gennemfør assessmentet igen.' }, 400)
        }

        const ip = clientIp(request)
        if (rateLimited(`niveau-tjek:${ip}`)) {
          return json({ ok: false, error: 'For mange forsøg — prøv igen om lidt.' }, 429)
        }

        let stored = false
        let scoreRow: Record<string, unknown> | null = null
        try {
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
          const { data, error } = await supabaseAdmin
            .from('niveau_tjek_leads')
            .insert({
              company: company || null,
              role: role || null,
              org_size: orgSize || null,
              current_ai_usage: currentAiUsage || null,
              biggest_challenge: biggestChallenge || null,
              conversation_value: conversationValue || null,
              email,
              answers,
              user_agent: request.headers.get('user-agent')?.slice(0, 400) ?? null,
              ip_hash: await hashIp(ip),
            })
            .select()
            .single()
          stored = !error
          scoreRow = data ?? null
          if (error) console.error('niveau-tjek insert failed', error.message)
        } catch (error) {
          console.error('niveau-tjek insert threw', error)
        }

        let mailed = false
        try {
          const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
          const result = await sendTemplateEmail('niveau-tjek-notification', '', {
            templateData: {
              company,
              role,
              orgSize,
              email,
              currentAiUsage,
              biggestChallenge,
              conversationValue,
              andelNiveau: scoreRow?.['andel_niveau'],
              strukturNiveau: scoreRow?.['struktur_niveau'],
              samletNiveau: scoreRow?.['samlet_niveau'],
              average: scoreRow?.['average'],
              limitingDimension: scoreRow?.['limiting_dimension'],
            },
            replyTo: email,
            idempotencyKey: `niveau-tjek-${email}-${Date.now()}`,
          })
          mailed = result.sent
        } catch (error) {
          console.error('niveau-tjek email failed', error)
        }

        if (!stored && !mailed) {
          return json({ ok: false, error: 'Kunne ikke sende lige nu.' }, 502)
        }
        return json({ ok: true, mailed, stored })
      },
    },
  },
})
