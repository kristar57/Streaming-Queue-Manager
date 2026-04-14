// TMDB proxy Edge Function
// POST { path: '/search/multi', params: { query: 'severance' } }
// Keeps the TMDB API key off the client.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { path, params } = await req.json()
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${Deno.env.get('TMDB_API_KEY')}` },
  })
  const data = await res.json()

  // Forward TMDB's HTTP status so the client can distinguish errors
  // from empty result sets (both would otherwise appear as HTTP 200).
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
