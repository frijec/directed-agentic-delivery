# Contact form on the homepage

Replace the "Book en session" CTA block in the Kontakt section with a real contact form. Submissions are stored in the backend and emailed to anders.bendtsen@consid.com.

Note on the admin page: the old `/contact-submissions` admin page no longer exists — the site was rebuilt as a static site and that page was removed with it. So there is nothing to delete; this plan only adds the form.

## What you get

- A contact form in the Kontakt section of the homepage with: Navn, E-mail, Telefon, Besked.
- Styled to match the existing site (same card, buttons, fonts, colours).
- Inline validation, a "sender…" state, and a success/error message after submit.
- Each submission saved in the backend database and emailed to anders.bendtsen@consid.com with a reply-to set to the sender.
- "Book en session" stays available in the top navigation, so the Calendly path is not lost.

## Prerequisite: sender domain

Sending email needs a sender domain you own. None is configured yet, so I will show the email setup dialog first (e.g. a subdomain of consid.engineering). The form and storage work immediately; email delivery starts once DNS verifies.

## Technical outline

- Database: add a `phone` column to the existing `contact_submissions` table (migration includes GRANTs; inserts happen server-side only, no anon write policy).
- Endpoint: a backend function `contact-submit` that validates input (name, email required; phone/message optional; length limits, email format), inserts the row with the service role, and sends the notification email. Basic abuse protection: honeypot field + per-IP rate limit.
- Frontend: form markup added to `index.html` in the `#kontakt` section, plus a small submit handler in `assets/site.js` posting JSON to the endpoint.
- Styles: contact-form rules added to `assets/site.css` using existing tokens.

## Out of scope

- No new admin UI for reading submissions; they are viewable in the backend database.
