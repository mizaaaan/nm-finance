// Local review mode.
//
// `npm run dev` with VITE_PREVIEW=1 in .env.local renders the app read-only
// without Netlify Identity, so screens can be reviewed before deployment.
// Production builds compile import.meta.env.DEV to false, so this can never
// switch off authentication on the deployed site.
export const PREVIEW_MODE = import.meta.env.DEV && import.meta.env.VITE_PREVIEW === '1'

export const PREVIEW_USER = {
  email: 'preview@localhost',
  user_metadata: { full_name: 'Review session' },
  app_metadata: {}
}

export function isPreviewUser(user) {
  return PREVIEW_MODE && user?.email === PREVIEW_USER.email
}
