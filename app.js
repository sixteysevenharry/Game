const cfg = { placeId: "122586736038729", visitGoal: 10000, refreshMs: 45000 }

const el = (id) => document.getElementById(id)
const setText = (id, v) => { const n = el(id); if (n) n.textContent = v }
const setImg = (id, src) => { const n = el(id); if (n && src) n.src = src }

const fmt = (n) => {
  const x = Number(n)
  if (!Number.isFinite(x)) return "—"
  return x.toLocaleString()
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

const formatDate = (iso) => {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString()
}

const makeAch = (title, desc, req, done) => {
  const wrap = document.createElement("div")
  wrap.className = "ach"
  wrap.innerHTML = `
    <div class="achTop">
      <div class="achTitle">${title}</div>
      <div class="achState ${done ? "on" : ""}">${done ? "complete" : "in progress"}</div>
    </div>
    <div class="achDesc">${desc}</div>
    <div class="achReq">${req}</div>
  `
  return wrap
}

const renderAchievements = (data) => {
  const grid = el("achGrid")
  if (!grid) return
  grid.innerHTML = ""

  const visits = Number(data.visits || 0)
  const fav = Number(data.favoritedCount || 0)
  const up = Number(data.upVotes || 0)
  const playing = Number(data.playing || 0)

  const list = [
    { title: "getting started", desc: "stats page online and pulling data.", req: "unlock: page is online", done: true },
    { title: "first milestone", desc: "hit 1,000 visits.", req: "unlock: 1,000 visits", done: visits >= 1000 },
    { title: "10k push", desc: "reach 10,000 visits.", req: "unlock: 10,000 visits", done: visits >= 10000 },
    { title: "fan favorite", desc: "players saving the experience.", req: "unlock: 250 favorites", done: fav >= 250 },
    { title: "well liked", desc: "strong upvote count.", req: "unlock: 500 upvotes", done: up >= 500 },
    { title: "active lobby", desc: "steady concurrency.", req: "unlock: 25 playing", done: playing >= 25 }
  ]

  list.forEach(a => grid.appendChild(makeAch(a.title, a.desc, a.req, a.done)))
}

const applyGoal = (visits) => {
  const goal = cfg.visitGoal
  const v = Number(visits || 0)
  const pct = clamp((v / goal) * 100, 0, 100)

  setText("goalPct", `${pct.toFixed(1)}%`)
  setText("goalCurrent", fmt(v))
  setText("goalTarget", fmt(goal))
  setText("goalRemaining", fmt(Math.max(0, goal - v)))

  const bar = el("goalBar")
  if (bar) bar.style.width = `${pct}%`

  const chip = el("goalChip")
  if (chip) chip.textContent = `goal: ${fmt(goal)}`
}

const applyData = (data) => {
  setText("universeTag", data.universeId ? `uid: ${data.universeId}` : "uid: —")
  setText("gameName", data.name || "—")
  setText("gameBy", data.creatorName ? `by @${data.creatorName}` : "—")
  setText("gameDesc", data.description || "—")

  setText("visits", fmt(data.visits))
  setText("playing", fmt(data.playing))
  setText("favorites", fmt(data.favoritedCount))

  const up = Number(data.upVotes || 0)
  const down = Number(data.downVotes || 0)
  const total = up + down
  const ratio = total > 0 ? Math.round((up / total) * 100) : null
  setText("rating", ratio === null ? "—" : `${ratio}%`)

  setText("upVotes", fmt(up))
  setText("downVotes", fmt(down))
  setText("maxPlayers", data.maxPlayers != null ? fmt(data.maxPlayers) : "—")
  setText("createdAt", formatDate(data.created))
  setText("updatedAt", data.updated ? `updated: ${formatDate(data.updated)}` : "—")

  setImg("gameIcon", data.iconUrl)

  const playBtn = el("playBtn")
  if (playBtn) playBtn.href = data.gameUrl || `https://www.roblox.com/games/${cfg.placeId}`

  setText("statusPill", "status: online")
  setText("lastUpdated", `refreshed: ${new Date().toLocaleString()}`)

  applyGoal(data.visits)
  renderAchievements(data)
}

const load = async () => {
  try {
    setText("statusPill", "status: updating")
    const res = await fetch(`./api/stats?placeId=${encodeURIComponent(cfg.placeId)}`, { cache: "no-store" })
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    applyData(data)
  } catch {
    setText("statusPill", "status: error")
  }
}

const y = el("year")
if (y) y.textContent = new Date().getFullYear()

load()
setInterval(load, cfg.refreshMs)
