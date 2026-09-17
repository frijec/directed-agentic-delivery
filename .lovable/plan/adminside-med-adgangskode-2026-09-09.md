# Adminside med adgangskode

En ny side, kun til jer, hvor I kan se alle beskeder fra kontaktformularen. Adgang kræver adgangskoden `Consid2026`.

## Hvad du får

- Ny side på `/admin/` i samme design som resten af sitet.
- Login-felt: indtast adgangskoden, og listen med beskeder vises.
- Tabel med dato, navn, e-mail, telefon, virksomhed/rolle (hvis udfyldt) og besked — nyeste først.
- Simpel søgning/filtrering på navn eller e-mail, og en knap til at hente alt som CSV.
- Adgangen huskes i browseren indtil fanen lukkes; en "Log ud"-knap rydder den.
- Siden holdes ude af Google (`noindex` + robots-regel) og ude af sitemap.

## Sikkerhed — vær opmærksom

Sitet er rent statisk, så adgangskoden alene i browseren ville kunne læses af enhver. For at undgå det bliver beskederne hentet gennem en beskyttet funktion i databasen, som selv kontrollerer adgangskoden, før den udleverer noget. Uden korrekt kode returneres ingen data. Tabellen forbliver lukket for offentlig læsning.

Det er stadig en delt adgangskode, ikke rigtige brugerkonti — god nok til intern brug, men skal koden deles bredt, bør vi senere skifte til rigtigt login.

## Teknisk

- Migration: opret `public.get_contact_submissions(p_password text)` som `security definer`, der sammenligner mod en adgangskode og returnerer rækker fra `contact_submissions` sorteret på `created_at desc`; `revoke all` på funktionen fra `public` og `grant execute` til `anon`. Ingen anon SELECT-policy på tabellen.
- Ny fil `admin/index.html` (samme header/footer-struktur og `assets/site.css`), plus lidt inline JS der kalder `POST /rest/v1/rpc/get_contact_submissions` med den publishable key og indtastet kode.
- `robots.txt`: `Disallow: /admin/`. Sitemap uændret.
