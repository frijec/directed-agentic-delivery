# Mails der faktisk kommer frem

I dag sendes henvendelser via Formspree fra browseren. Formspree svarer "ok", men mailen lander aldrig hos jer — endpointet stammer fra den oprindelige skabelon, så vi kan ikke se eller styre modtageren.

Løsningen: send mailen fra jeres eget, allerede verificerede afsenderdomæne (notify.directed-agentic-delivery.consid.engineering) via serveren, og drop Formspree helt.

## Hvad der bygges

1. **Kontaktformularen på forsiden**
   - Sender til en ny adresse på jeres eget site i stedet for Formspree.
   - Serveren gemmer henvendelsen i databasen og sender en notifikationsmail til anders.bendtsen@consid.com med navn, e-mail, telefon og besked. Svar-til sættes til afsenderens e-mail, så man kan svare direkte.
   - Ingen kvitteringsmail til afsenderen.

2. **AI-playbook-formularen på artikelsiderne**
   - Samme model: gemmes i databasen og sender notifikation til Anders med navn, e-mail, virksomhed og hvilken artikel den kom fra.

3. **Formspree fjernes** fra forsiden og fra alle artikelsider.

4. **Fejlhåndtering**: Hvis mailen af en eller anden grund ikke går igennem, gemmes henvendelsen stadig, og besøgende ser en venlig fejlbesked med Anders' e-mailadresse. Alle sendte mails kan efterfølgende ses i mail-loggen.

## Teknisk

- Ny server-route `src/routes/api/public/contact.ts` (POST): Zod-validering, honeypot-tjek, simpel rate limit pr. IP, insert i `contact_submissions`, derefter mailafsendelse.
- Ny server-route `src/routes/api/public/lead.ts` (POST) til playbook-formularen; gemmer i samme tabel med `source` = artikel-slug og virksomhedsnavn i beskedfeltet (evt. ny nullable kolonne `company` via migration hvis felterne skal holdes adskilt).
- App-mailskabeloner scaffoldes (React Email + registry + server-only send-helper). To skabeloner: `contact-notification` og `lead-notification`, begge med fast modtager anders.bendtsen@consid.com.
- Frontend: `pages/index.html` submit-handler kalder `/api/public/contact` i stedet for Formspree + direkte REST-insert; `public/assets/site.js` (leadform) kalder `/api/public/lead`.
- Verifikation: lokal build + POST mod begge endpoints, og kontrol af, at der ligger en `sent`-hændelse i mail-loggen.
