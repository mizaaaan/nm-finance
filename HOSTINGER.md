# Running this site on Hostinger

The app has two halves. The **frontend** is a React/Vite build (static files).
The **backend** is the JSON API plus a database and a sign-in. On Netlify those
three are Netlify Functions + Netlify DB + Netlify Identity. On Hostinger this
repository ships its own equivalents, so the whole site runs there:

| Netlify | Hostinger (this repo) |
| --- | --- |
| Netlify Functions (`netlify/functions`) | `server/index.js` — Express on Node |
| Netlify Identity login | `server/auth.js` — email + password, signed cookie |
| Netlify DB (Postgres) | MySQL (`db/schema.mysql.sql`) |

The Netlify deployment keeps working exactly as before: `npm run build` is still
the Netlify build, and the functions are untouched.

## 1. Database (hPanel → Databases)

1. Create a **MySQL database** (and a database user) in hPanel.
2. Note the database name, user and password. The host is usually `localhost`.
3. Nothing else to do: the server creates its tables on first boot using
   `db/schema.mysql.sql`.

## 2. The Node app (hPanel → Websites → Create site → Web App)

1. Choose **Import a Git repository** and pick `mizaaaan/nm-finance`, branch
   `main`. Every push then redeploys.
2. Node version: **22** (20 and 24 also work).
3. Build settings:

   | Setting | Value |
   | --- | --- |
   | Install command | `npm ci` |
   | Build command | `npm run build:hostinger` |
   | Start command | `npm start` |

   `build:hostinger` compiles the frontend with `VITE_AUTH=session`, so the app
   signs in against the Node server instead of Netlify Identity. `npm start`
   runs `server/index.js`.

## 3. Environment variables (same screen, before the first deploy)

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u123456789_nmfinance
DB_USER=u123456789_admin
DB_PASSWORD=…
SESSION_SECRET=…            # 32+ random characters, required
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=…            # 8+ characters
ADMIN_NAME=Administrator
```

Generate `SESSION_SECRET` with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`ADMIN_EMAIL` / `ADMIN_PASSWORD` create the first account **only while the users
table is empty**, so they cannot overwrite a password later. Changing
`SESSION_SECRET` signs everyone out.

## 4. Point the domain and sign in

Add your domain to the web app, wait for the free SSL certificate, open the site
and sign in with the admin email and password. The dashboard starts empty; add
members, cars and ledger entries from the app.

More sign-in accounts: **Members → Sign-in accounts** (admins only). There is no
outgoing email, so there is no self-service password reset — remove the account
and add it again with a new password.

## Notes

- **One Node process** serves both the site and the API on `PORT`. Hostinger
  stops requests after 120 seconds and does not support inbound WebSockets; this
  app needs neither.
- **Assets** are served from `dist/` with cache headers; `index.html` is always
  revalidated, so a redeploy appears immediately.
- **Schema changes** are applied on boot (`AUTO_MIGRATE=0` disables that check).
  You can also run `npm run db:setup` with the same environment variables, or
  call `POST /api/init` as an admin.
- **Backups**: use hPanel's MySQL backups; `POST /api/reset` wipes the ledger and
  cannot be undone.
- **The 2026 records** (`/documents`) are static data in `src/data/records.js`;
  they need no database and work on any host.
- **Local check** of this deployment before pushing:

  ```
  npm install
  npm run build:hostinger
  DB_HOST=… DB_NAME=… DB_USER=… DB_PASSWORD=… \
  SESSION_SECRET=… ADMIN_EMAIL=… ADMIN_PASSWORD=… npm start
  ```

  Then open http://localhost:3000.
