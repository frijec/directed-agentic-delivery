# Pæne adresser uden "index.html" på Lovable-hosting

## Hvad jeg har målt på det live site

- `/` → virker
- `/ydelser/index.html` → virker
- `/ydelser/`, `/ydelser`, `/ydelser/agentic-workshops` → 404

Lovable-hostingen serverer altså kun præcise filnavne for dette site. Der er ingen automatisk "mappe → index.html"-opslag og ingen fallback. Derfor kan pæne adresser ikke opnås med den nuværende rene HTML-udgivelse alene — der skal et lille serverlag med.

## Anbefalet løsning: tilføj et tyndt serverlag foran de eksisterende sider

Siderne bliver præcis som de er i dag. Vi lægger blot en lille "vejviser" foran dem, der oversætter en pæn adresse til den rigtige HTML-fil.

Resultatet:

- `/ydelser/` og `/ydelser` viser ydelsesoversigten
- `/viden/` og `/viden` viser videnoversigten
- `/ydelser/agentic-workshops` (uden `.html`) viser artiklen
- `/viden/<artikel>` uden `.html` virker tilsvarende
- Gamle adresser med `index.html` / `.html` sender automatisk videre til den pæne adresse (permanent viderestilling, så Google flytter med)
- `/admin/` virker også uden `index.html`

## Ændringer i teksten på siderne

- Alle interne links skiftes tilbage til pæne stier (`/ydelser/`, `/viden/`, `/ydelser/agentic-workshops`).
- Canonical- og Open Graph-adresser opdateres til de pæne adresser.
- `sitemap.xml` opdateres til de pæne adresser.
- `/admin/` forbliver skjult for søgemaskiner.

## Teknisk plan

1. Genindfør en minimal TanStack Start-server i projektet (kun til udlevering af sider; ingen omskrivning af sideindhold):
   - `src/routes/api`-lignende opsætning er ikke nok — der bruges en catch-all server-route `src/routes/$.ts`, som svarer på alle sti-forespørgsler.
   - Et build-trin genererer et modul, der importerer hver eksisterende HTML-fil som råtekst (`?raw`) og mapper: `/ydelser/` → `ydelser/index.html`, `/ydelser/agentic-workshops` → `ydelser/agentic-workshops.html` osv.
   - Handler returnerer HTML med `Content-Type: text/html` og fornuftig cache-header; ukendte stier får en 404-side.
   - `.html`- og `index.html`-varianter besvares med 301 til den pæne sti.
2. Statiske filer (`assets/`, `matcap.jpg`, `favicon`, `robots.txt`, `sitemap.xml`, `CNAME`) flyttes til `public/`, så de serveres direkte uden at gå gennem vejviseren.
3. `package.json`/byggescripts opdateres, så `build` producerer server-bundlet i stedet for kun at kopiere filer; `dev` kører den samme server lokalt.
4. Verifikation: byg, kør lokalt, og tjek at `/`, `/ydelser/`, `/viden/`, en artikel uden `.html`, `/admin/`, billeder og kontaktformularen alle svarer 200 — og at `.html`-adresser viderestiller.

## Alternativ, hvis serverlag ikke ønskes nu

Bliv på ren statisk udgivelse og behold `index.html` i adresserne (som i dag). Det virker, men adresserne bliver ved med at se sådan ud. GitHub Pages ville give pæne adresser gratis, men kræver Enterprise-kontoen og DNS-flytning, som vi har udskudt.
