import mysql from 'mysql2/promise'

// MySQL connection for the Hostinger (Node) deployment.
//
// Env vars (set them in Hostinger → hPanel → Websites → your app → Environment):
//   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
export class ConfigError extends Error {}

export function dbConfig() {
  const database = process.env.DB_NAME
  const user = process.env.DB_USER
  if (!database || !user) {
    throw new ConfigError(
      'Database is not configured. Set DB_NAME, DB_USER and DB_PASSWORD (and DB_HOST/DB_PORT if your host differs from localhost:3306) in the hosting environment.'
    )
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user,
    password: process.env.DB_PASSWORD || '',
    database,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL || 5),
    queueLimit: 0,
    charset: 'utf8mb4_unicode_ci',
    // Dates come back as 'YYYY-MM-DD' strings and DECIMALs as numbers, which is
    // what the API's responses (and therefore the frontend) expect.
    dateStrings: true,
    decimalNumbers: true,
    timezone: 'Z'
  }
}

let pool = null

export function getPool() {
  if (!pool) pool = mysql.createPool(dbConfig())
  return pool
}

export async function closePool() {
  if (pool) {
    await pool.end().catch(() => {})
    pool = null
  }
}
