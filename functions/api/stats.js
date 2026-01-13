const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "get, options",
  "access-control-allow-headers": "content-type"
}

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...cors,
      ...extra
    }
  })

const getUniverseId = async (placeId) => {
  const u = `https://apis.roblox.com/universes/v1/places/${placeId}/universe`
  const r = await fetch(u, { headers: { "user-agent": "cf-pages" } })
  if (!r.ok) throw new Error("universe lookup failed")
  const d = await r.json()
  if (!d || !d.universeId) throw new Error("no universe id")
  return String(d.universeId)
}

const getGame = async (universeId) => {
  const u = `https://games.roblox.com/v1/games?universeIds=${encodeURIComponent(universeId)}`
  const r = await fetch(u, { headers: { "user-agent": "cf-pages" } })
  if (!r.ok) throw new Error("games fetch failed")
  const d = await r.json()
  const g = d && Array.isArray(d.data) ? d.data[0] : null
  if (!g) throw new Error("missing game data")
  return g
}

const getVotes = async (universeId) => {
  const u = `https://games.roblox.com/v1/games/votes?universeIds=${encodeURIComponent(universeId)}`
  const r = await fetch(u, { headers: { "user-agent": "cf-pages" } })
  if (!r.ok) return { upVotes: null, downVotes: null }
  const d = await r.json()
  const v = d && Array.isArray(d.data) ? d.data[0] : null
  if (!v) return { upVotes: null, downVotes: null }
  return { upVotes: v.upVotes ?? null, downVotes: v.downVotes ?? null }
}

const getIcon = async (universeId) => {
  const u = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${encodeURIComponent(universeId)}&size=512x512&format=Png&isCircular=false`
  const r = await fetch(u, { headers: { "user-agent": "cf-pages" } })
  if (!r.ok) return null
  const d = await r.json()
  const item = d && Array.isArray(d.data) ? d.data[0] : null
  return item && item.imageUrl ? item.imageUrl : null
}

export const onRequestOptions = async () => new Response(null, { status: 204, headers: cors })

export const onRequestGet = async ({ request, env, ctx }) => {
  const url = new URL(request.url)
  const placeId = url.searchParams.get("placeId") || "122586736038729"

  const cacheKey = new Request(url.toString(), request)
  const cache = caches.default
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  try {
    const universeId = await getUniverseId(placeId)
    const [g, v, iconUrl] = await Promise.all([getGame(universeId), getVotes(universeId), getIcon(universeId)])

    const out = {
      placeId,
      universeId,
      gameUrl: `https://www.roblox.com/games/${placeId}`,
      name: g.name ?? null,
      description: g.description ?? null,
      creatorName: g.creator?.name ?? null,
      creatorType: g.creator?.type ?? null,
      playing: g.playing ?? null,
      visits: g.visits ?? null,
      favoritedCount: g.favoritedCount ?? null,
      maxPlayers: g.maxPlayers ?? null,
      created: g.created ?? null,
      updated: g.updated ?? null,
      upVotes: v.upVotes,
      downVotes: v.downVotes,
      iconUrl
    }

    const res = json(out, 200, { "cache-control": "public, max-age=30" })
    ctx.waitUntil(cache.put(cacheKey, res.clone()))
    return res
  } catch (e) {
    return json({ error: "failed to load stats" }, 502, { "cache-control": "no-store" })
  }
}
