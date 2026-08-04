# NM Finance

Monthly balance accountability app for Next Millionaire MBS. Members log rent income,
contributions, and car-related expenses; the dashboard shows company balance, profit,
and per-member investment/dividend history.

## Stack
- **Frontend:** React + Vite + Tailwind
- **Backend:** Netlify Functions (serverless)
- **Database:** Netlify DB (built-in Postgres)
- **Auth:** Netlify Identity
- **Hosting:** Netlify (free tier)

No external services beyond GitHub + Netlify.

## Status
Scaffold only — pages are placeholders. Screens are being built one at a time.

## Local setup (once you have Node + Netlify CLI)
```
npm install
netlify dev
```
This runs the frontend and functions together at http://localhost:8888.

## Database
Schema lives in `db/schema.sql`. Run it once against the Netlify DB instance
(via `netlify db` CLI or the Netlify dashboard SQL console) after the site is
first deployed and the database is provisioned.
