# Aurix

Jewelry CAD studio: design rings, pendants and name plates, price them, export STL files and sell finished designs in the marketplace.

**Live site:** https://aurix-seven-vert.vercel.app

## Emails (SendGrid)

Aurix sends two kinds of email. Both need a SendGrid account with a verified sender.

**1. App emails** (order confirmation, new sale, delivered, new review, welcome). Database triggers call the
`send-email` Supabase function (`supabase/functions/send-email`), which sends through SendGrid. Until the two secrets
below exist, the function does nothing and orders, sign-ups and reviews work as before.

```bash
supabase secrets set SENDGRID_API_KEY=SG.xxxxxxxx EMAIL_FROM=hello@yourdomain.com
```

- `SENDGRID_API_KEY`: a SendGrid API key with the *Mail Send* permission only.
- `EMAIL_FROM`: a sender address you verified in SendGrid (Settings > Sender Authentication).
- Optional `SITE_URL` if the site moves from https://aurix-seven-vert.vercel.app.
- Each email is sent once (`email_log`), and it only ever goes to the real buyer, seller or reviewer of that record.

**2. Account emails** (password reset). These come from Supabase Auth, not the function. In the Supabase dashboard open
Authentication > Emails > SMTP Settings, turn on custom SMTP, and use host `smtp.sendgrid.net`, port `587`, username
`apikey`, password = your SendGrid API key, and the same verified sender address.

## Run locally

```powershell
powershell -File serve.ps1
```

Then open http://localhost:8080.
