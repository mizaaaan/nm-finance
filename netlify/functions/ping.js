export default async (req) => {
  return new Response(JSON.stringify({ ok: true, message: 'NM Finance API is alive' }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

export const config = { path: '/api/ping' }
