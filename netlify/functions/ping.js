export default async (req) => {
  return new Response(JSON.stringify({ ok: true, message: 'Next Millionaire Finance API is alive' }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

export const config = { path: '/api/ping' }
