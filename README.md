# Next Millionaire Finance

A private bookkeeping app for the Next Millionaire car-rental cooperative. Admins record rent
income, member contributions, expenses, dividends, deposits and receivables; everyone approved
can see the dashboard (company balance, monthly profit, 6-month cash flow, per-member investment
vs dividends, fleet status) and the ledger.

Live site: https://finance.nextmillionaireqr.com

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, Tailwind, Recharts, React Router |
| Backend | Netlify Functions (serverless, Node 22, ESM) |
| Database | Netlify DB (Postgres) via the `postgres` driver |
| Sign-in | Netlify Identity (headless `gotrue-js`, custom login screen) |
| Hosting | Netlify |

No services beyond GitHub and Netlify.

---

## Who can do what

Sign-up is open by default in Netlify Identity, so **being signed in does not grant access**. The
server decides what each account may do (`GET /api/me`), and the browser only reflects that.

| Level | How someone gets it | Can |
| --- | --- | --- |
| **admin** | Identity role `admin`, **or** email listed in `ADMIN_EMAILS` | View everything; add / edit / delete members, cars, transactions |
| **member** | Identity role `member`, **or** email listed in `MEMBER_EMAILS` | View only |
| *no access* | Signed in but not in either list | Sees a "Waiting for approval" screen; the API returns no data |

Nobody is hard-coded. If `ADMIN_EMAILS` is empty and nobody has the `admin` role, **nobody can write**.

To approve someone: add their email to `MEMBER_EMAILS` / `ADMIN_EMAILS` (Netlify → Site configuration →
Environment variables, then redeploy), or give them a role in Netlify → Identity → Users → *user* →
Roles. A role change usually shows up after the person signs out and back in.

> Email addresses are trusted only because Netlify Identity has confirmed them. Keep **email
> confirmation ON** (Identity → Registration / Emails).

---

## Handover checklist (do these once)

1. **Set `ADMIN_EMAILS`** in Netlify → Site configuration → Environment variables (comma-separated).
   Add `MEMBER_EMAILS` for view-only people. Redeploy.
2. **Identity settings** (Netlify → Identity): keep email confirmation on. Consider
   **Registration: Invite only** so strangers can't even create accounts (they can't see data
   either way).
3. **Make the GitHub repository private** (GitHub → Settings → Danger zone → Change visibility).
   `scripts/seed.mjs` contains the company's real figures.
4. **Leave `ENABLE_DATA_RESET` unset.** It controls a button that permanently deletes all data; see
   below.
5. **Transfer ownership** of the Netlify site, the GitHub repository and the domain
   `nextmillionaireqr.com` to the client, and have them add their own Identity admin.
6. Smoke test after deploying: sign in as an admin, add a test member + entry, delete them again;
   sign in as a non-listed account and confirm it only sees "Waiting for approval".

---

## Environment variables

Set in Netlify → Site configuration → Environment variables. Template: [`.env.example`](.env.example).

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_EMAILS` | **Yes** | Comma-separated emails that may add / edit / delete |
| `MEMBER_EMAILS` | No | Comma-separated emails that may view only |
| `ALLOW_ANY_SIGNED_IN_USER` | No | `true` = every signed-in account may *view*. Only sensible with invite-only registration |
| `ENABLE_DATA_RESET` | No | `true` = show the "Reset company data" button (see below). Off by default |
| `NETLIFY_DB_URL` | Provided by Netlify | Postgres connection string (`DATABASE_URL` is the fallback for local work) |
| `DATABASE_SSL` | No | `false` only for a local Postgres without TLS. TLS is required otherwise |
| `JWT_SECRET` | No | Identity JWT secret. If absent, tokens are validated by asking Netlify Identity (slightly slower, equally safe) |

## Wiping all data

Almost never needed. It requires **all three**: `ENABLE_DATA_RESET=true`, an admin account, and the
word `RESET` typed to confirm. Every wipe is written to the function log with the admin's email.
Turn the variable off again straight after.

---

## API

Every `/api/*` call needs `Authorization: Bearer <Identity token>` (the app sends it). Errors are
JSON `{ "error": "…", "code": "…" }`; unexpected failures return a reference id that matches the
server log (details are never sent to the browser).

| Endpoint | Methods | Access | Purpose |
| --- | --- | --- | --- |
| `/api/me` | GET | any signed-in | `{ email, name, access, features }` |
| `/api/dashboard?month=YYYY-MM` | GET | member+ | Aggregates for the dashboard |
| `/api/members`, `/api/members/:id` | GET / POST · PATCH, DELETE | read: member+ · write: admin | Members. A member with contributions or dividends cannot be deleted (409) |
| `/api/cars`, `/api/cars/:id` | GET / POST · PATCH, DELETE | read: member+ · write: admin | Cars |
| `/api/transactions?type=&month=&category=&limit=&offset=` | GET | member+ | List / filter (max 500 per page) |
| `/api/transactions`, `/api/transactions/:id` | POST · PATCH, DELETE | admin | Ledger entries |
| `/api/init` | POST | admin | Create tables if missing (idempotent) |
| `/api/reset` | POST | admin + `ENABLE_DATA_RESET` + `{"confirm":"RESET"}` | Delete all data |
| `/api/ping` | GET | public | Health check (touches no data) |

Validation is enforced on the server: positive amounts with at most 2 decimals, real calendar dates,
valid emails, length limits, and category/type consistency. All SQL is parameterised.

## Security notes

- Content-Security-Policy (no inline scripts), `X-Frame-Options: DENY`, `nosniff`, referrer and
  permissions policies, and `noindex` are set in `netlify.toml`. If you add analytics or another
  third-party script, extend the CSP there.
- Database connections require TLS.
- A signed-out or expired session is sent back to the login screen automatically.
- `npm audit` reports 0 known vulnerabilities (re-run it before each release).

---

## Local development

Requires Node ≥ 22.12 and the [Netlify CLI](https://docs.netlify.com/cli/get-started/).

```bash
npm install
cp .env.example .env     # fill in ADMIN_EMAILS and a database URL
netlify dev              # frontend + functions + Identity at http://localhost:8888
```

Use `netlify dev`, not plain `vite`, so `/api` and `/.netlify/identity` exist. Create a local user
with `netlify identity:create --confirm`.

### Database

The schema is in [`db/schema.sql`](db/schema.sql) and is also applied by `POST /api/init`
(`netlify/functions/_shared/schema.js` — a test keeps the two identical). It is only
`CREATE TABLE IF NOT EXISTS`, so it is safe to run repeatedly.

`scripts/seed.mjs` loads the original Apr–Jul 2026 books. It refuses to run against a non-empty
database unless you pass `--force`.

### Tests

```bash
npm run test:unit        # fast, no database needed
```

The full suite (`npm test`) also runs API tests against a real Postgres. Point it at a **throwaway**
database — the tests empty the tables:

```bash
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/nm_test \
npm test
```

Without `TEST_DATABASE_URL` the database tests are skipped. The tests connect **without** TLS by
default (fine for a local Postgres); add `TEST_DATABASE_SSL=require` if your test database needs TLS.

### Build

```bash
npm run build            # outputs dist/
```

Netlify runs this on every push to the production branch.

---

## Project layout

```
src/                    React app (pages, components, AuthContext, api client)
netlify/functions/      API: data.js (members/cars/transactions), dashboard.js, me.js, init.js, reset.js
netlify/functions/_shared/   auth, db, http helpers, validation, schema
db/schema.sql           Database schema
scripts/seed.mjs        Optional data loader
test/                   node:test unit + API tests
```
