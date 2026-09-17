// Maps clean URLs to the static HTML pages that live in /pages.
const modules = import.meta.glob('../../pages/**/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export const PAGES: Record<string, string> = {}

for (const [filePath, html] of Object.entries(modules)) {
  const rel = filePath.slice(filePath.indexOf('/pages/') + '/pages/'.length)
  let url: string
  if (rel === 'index.html') url = '/'
  else if (rel.endsWith('/index.html')) url = '/' + rel.slice(0, -'index.html'.length)
  else url = '/' + rel.replace(/\.html$/, '')
  PAGES[url] = html
}

const htmlResponse = (html: string, status = 200) =>
  new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      // This site is a pre-launch sandbox, so nothing here should reach a
      // search index. Every page also carries a noindex meta tag; the header
      // is the belt to that braces, since it applies even when the HTML is
      // never parsed. Remove both, and the Disallow in robots.txt, to launch.
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })

const redirect = (to: string) =>
  new Response(null, { status: 301, headers: { Location: to } })

const NOT_FOUND = `<!doctype html><html lang="da"><head><meta charset="utf-8">
<title>Siden findes ikke — Consid</title><meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/assets/site.css"></head>
<body><main id="main"><section class="stack"><div class="wrap">
<h1 style="font-size:var(--t-h2)">Siden findes ikke</h1>
<p class="lead" style="margin-top:var(--s-5)">Adressen findes ikke længere. Prøv forsiden, ydelserne eller viden.</p>
<p style="margin-top:var(--s-6)"><a class="btn btn--primary" href="/">Til forsiden <span class="arw">→</span></a>
<a class="btn btn--soft" href="/ydelser/">Ydelser</a>
<a class="btn btn--soft" href="/viden/">Viden</a></p>
</div></section></main></body></html>`

/** Serves a static page for a clean URL, redirecting legacy .html paths. */
export function servePage(pathname: string): Response {
  const url = decodeURIComponent(pathname)

  if (PAGES[url]) return htmlResponse(PAGES[url])

  // /ydelser/index.html -> /ydelser/
  if (url.endsWith('/index.html')) {
    const clean = url.slice(0, -'index.html'.length)
    if (PAGES[clean]) return redirect(clean)
  }

  // /viden/artikel.html -> /viden/artikel
  if (url.endsWith('.html')) {
    const clean = url.slice(0, -'.html'.length)
    if (PAGES[clean]) return redirect(clean)
  }

  // /ydelser -> /ydelser/
  if (!url.endsWith('/') && PAGES[url + '/']) return redirect(url + '/')

  // /ydelser/artikel/ -> /ydelser/artikel
  if (url.endsWith('/') && PAGES[url.slice(0, -1)]) return redirect(url.slice(0, -1))

  return htmlResponse(NOT_FOUND, 404)
}
