/** Shared helpers for the public form endpoints (contact + AI playbook lead). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value)
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

export async function hashIp(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(`dad:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const hits = new Map<string, number[]>()

/** Allows `limit` submissions per IP per `windowMs`. */
export function rateLimited(key: string, limit = 5, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  return false
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get('content-type') || ''
  if (type.includes('application/json')) {
    try {
      return (await request.json()) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  const form = await request.formData()
  return Object.fromEntries(form.entries())
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
