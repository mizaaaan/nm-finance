import express from 'express'
import path from 'node:path'
import { getPool, closePool } from './db.js'
import { createApiRouter } from './api.js'
import { applySchema, ensureAdmin, ROOT } from './schema.js'

// Next Millionaire Finance — Node server for the Hostinger deployment.
//
// Serves the Vite build from dist/ and the JSON API from /api/*, with its own
// cookie-session sign-in (see server/auth.js). The Netlify deployment keeps
// using netlify/functions; this server is the self-hosted equivalent.
//
// Environment (set in hPanel → Websites → Environment variables):
//   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
//   SESSION_SECRET   long random string (required)
//   ADMIN_EMAIL, ADMIN_PASSWORD   first sign-in, created only when no users exist
//   PORT             provided by the host

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)

app.use(express.json({ limit: '1mb' }))
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  next()
})

const dist = path.join(ROOT, 'dist')

async function start() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 24) {
    throw new Error(
      'SESSION_SECRET is missing or shorter than 24 characters. Add a long random value to the hosting environment.'
    )
  }

  const pool = getPool()

  // Schema and first admin are applied on boot; every statement is
  // IF NOT EXISTS, and the admin is only created while there are no users.
  if (process.env.AUTO_MIGRATE !== '0') {
    const applied = await applySchema(pool)
    console.log(`[db] schema checked (${applied} statements)`)
  }
  const adminEmail = await ensureAdmin(pool)
  if (adminEmail) console.log(`[auth] created the first admin account: ${adminEmail}`)

  app.use('/api', createApiRouter())

  // Hashed assets are immutable; index.html must always be revalidated so a
  // deploy is picked up immediately.
  app.use(
    express.static(dist, {
      index: false,
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache')
      }
    })
  )

  // Client-side routes (/documents/board, /ledger …) all serve the app; missing
  // files and unknown API paths stay 404s instead of quietly returning HTML.
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Unknown API route' })
    if (path.extname(req.path)) return res.status(404).send('Not found')
    res.sendFile(path.join(dist, 'index.html'))
  })

  app.use((error, _req, res, _next) => {
    console.error('[web]', error)
    if (res.headersSent) return
    res.status(500).json({ error: 'Something went wrong.' })
  })

  const port = Number(process.env.PORT || 3000)
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`[web] Next Millionaire Finance listening on ${port}`)
    console.log(`[web] database ${process.env.DB_NAME} @ ${process.env.DB_HOST || 'localhost'}`)
  })

  const shutdown = async () => {
    server.close()
    await closePool()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

start().catch((error) => {
  console.error(`[boot] ${error.message}`)
  process.exit(1)
})
