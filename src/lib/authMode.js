// Which sign-in the app expects.
//
//   netlify (default) — Netlify Identity, used by the Netlify deployment.
//   session           — the self-hosted Node server's own cookie login, used by
//                       the Hostinger build (`npm run build:hostinger`).
export const SESSION_MODE = import.meta.env.VITE_AUTH === 'session'
