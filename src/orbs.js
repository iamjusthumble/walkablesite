// Dotted, depth-shaded 3D orbs, ported from thinking-orbs
// (https://github.com/RareFormLabs/thinking-orbs, MIT © 2026 Jakub Antalik).
// The engine is unchanged in spirit: plain 2D canvas arcs, z-sorted, depth
// carried by dot size and ink. Walkable changes: ink is mixed between two
// brand colours instead of grayscale, and there is a large "hero" tuning.

// ---------- core ----------
function hashD(a, b) { const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h) }
function fibDir(i, n) { const golden = Math.PI * (3 - Math.sqrt(5)); const y = 1 - (2 * (i + 0.5)) / n; const rad = Math.sqrt(1 - y * y); const a = i * golden; return [rad * Math.cos(a), y, rad * Math.sin(a)] }
function angleDelta(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)) }
function makeProj(yaw, tilt, cx, cy, scale) {
  const st = Math.sin(tilt), ct = Math.cos(tilt), sy = Math.sin(yaw), cyw = Math.cos(yaw)
  return (x, y, z) => { const x1 = x * cyw + z * sy; const z1 = -x * sy + z * cyw; const y1 = y * ct - z1 * st; const z2 = y * st + z1 * ct; return [cx + x1 * scale, cy - y1 * scale, z2] }
}
function radiusScale(size, pow) { return (size / 300) ** pow }
const hex = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
// ink 0 = full "ink" colour (near), 1 = "paper" colour (far)
function paint(ctx, dots, palette, rMin = 0.3) {
  const [ink, paper] = palette
  dots.sort((a, b) => a.z - b.z)
  for (const d of dots) {
    const alpha = (d.a ?? 1) * (palette[2] ?? 1)
    if (alpha < 0.02) continue
    const w = Math.min(1, Math.max(0, d.white))
    ctx.fillStyle = `rgba(${Math.round(ink[0] + (paper[0] - ink[0]) * w)},${Math.round(ink[1] + (paper[1] - ink[1]) * w)},${Math.round(ink[2] + (paper[2] - ink[2]) * w)},${alpha})`
    ctx.beginPath(); ctx.arc(d.x, d.y, Math.max(rMin, d.r), 0, Math.PI * 2); ctx.fill()
  }
}

// ---------- profiles ----------
const BASE = {
  globe: { latRings: 17, lonDensity: 44, rBase: 0.6, rDepth: 1.7, rBoost: 1.0, inkFar: 0.62, inkSpan: 0.54, rsPow: 0.6, rMin: 0.3 },
  orbits: { orbitN: 12, ghostN: 40, ghostR: 0.9, ghostA: 0.5, particles: 3, partR: 1.2, partRDepth: 1.6, rsPow: 0.6, rMin: 0.3 },
  rubik: { latRings: 15, lonDensity: 40, moveCount: 14, rBase: 0.6, rDepth: 1.7, rActive: 0.3, inkFar: 0.62, inkSpan: 0.54, rsPow: 0.6, rMin: 0.3 },
  wave: { rings: 15, lonDensity: 40, rBase: 0.6, rDepth: 1.7, rsPow: 0.6, rMin: 0.3 },
  ribbon: { lanes: 5, segs: 88, ghostN: 150, rBase: 1.1, rDepth: 1.7, rsPow: 0.6, rMin: 0.3 },
  morph: { rDot: 0.021, iconD: 1, rMin: 0.25 },
}
const COUNT_PAIRS = [['latRings', 'lonDensity'], ['rings', 'lonDensity'], ['lanes', 'segs']]
const RADIUS_KEYS = ['rBase', 'rDepth', 'rActive', 'rDot', 'ghostR', 'partR', 'partRDepth']
function scaleCounts(opts, scale) {
  const out = { ...opts }, done = new Set(), rt = Math.sqrt(scale)
  for (const [a, b] of COUNT_PAIRS) if (out[a] != null && out[b] != null && !done.has(a) && !done.has(b)) { out[a] = Math.max(2, Math.round(out[a] * rt)); out[b] = Math.max(2, Math.round(out[b] * rt)); done.add(a); done.add(b) }
  for (const k of ['orbitN', 'ghostN']) if (out[k] != null) out[k] = Math.max(1, Math.round(out[k] * scale))
  if (out.iconD != null) out.iconD = Math.max(0.02, out.iconD * scale)
  return out
}
function scaleRadii(opts, scale) { const out = { ...opts }; for (const k of RADIUS_KEYS) if (out[k] != null) out[k] *= scale; return out }

export const STATE_TO_MODE = { working: 'orbits', searching: 'globe', solving: 'rubik', listening: 'wave', composing: 'ribbon', shaping: 'morph' }
// 64 / 20 are the upstream tunings; 'hero' is Walkable's large, decorative tuning.
const PRESETS = {
  orbits: { hero: { speed: 0.9, count: 1, size: 1.6 }, 64: { speed: 1.885, count: 1, size: 1 }, 20: { speed: 3.9, count: 0.238, size: 2.4 } },
  globe: { hero: { speed: 0.9, count: 1.3, size: 1.5, extra: { scanMul: 2.2, dimBase: 0.4 } }, 64: { speed: 2.015, count: 0.42, size: 1.15, extra: { scanMul: 4.08, dimBase: 0.45 } }, 20: { speed: 2.665, count: 0.105, size: 1.75, extra: { scanMul: 4.335, dimBase: 0.45 } } },
  rubik: { hero: { speed: 1.2, count: 1, size: 1.5 }, 64: { speed: 1.82, count: 0.35, size: 1.05 }, 20: { speed: 1.95, count: 0.088, size: 1.9 } },
  wave: { hero: { speed: 1.6, count: 1, size: 1.5 }, 64: { speed: 4.388, count: 0.341, size: 1 }, 20: { speed: 3.998, count: 0.105, size: 1.6 } },
  ribbon: { hero: { speed: 1.2, count: 1, size: 1.4, extra: { spin: 0, bandMul: 3.9, wobMul: 1 } }, 64: { speed: 2.34, count: 0.25, size: 0.85, extra: { spin: 0, bandMul: 3.9, wobMul: 1 } }, 20: { speed: 3.12, count: 0.051, size: 1.073, extra: { spin: 0, bandMul: 4.94, wobMul: 1 } } },
  morph: { hero: { speed: 1.6, count: 1.4, size: 0.6, extra: { spread: 1.45 } }, 64: { speed: 2.405, count: 0.54, size: 0.395, extra: { spread: 1.45 } }, 20: { speed: 2.08, count: 0.53, size: 1.011, extra: { spread: 1.45 } } },
}
const cache = new Map()
export function resolvePreset(state, tuning) {
  const key = `${state}-${tuning}`
  if (cache.has(key)) return cache.get(key)
  const mode = STATE_TO_MODE[state], p = PRESETS[mode][tuning]
  let opts = { ...BASE[mode] }
  if (p.count !== 1) opts = scaleCounts(opts, p.count)
  if (p.size !== 1) opts = scaleRadii(opts, p.size)
  if (p.extra) opts = { ...opts, ...p.extra }
  const resolved = { mode, speed: p.speed, opts }
  cache.set(key, resolved)
  return resolved
}

// ---------- modes ----------
function latLong(latRings, lonDensity, each) {
  for (let li = 0; li <= latRings; li++) {
    const lat = -Math.PI / 2 + (li / latRings) * Math.PI, cosLat = Math.cos(lat), sinLat = Math.sin(lat)
    const lonCount = Math.max(1, Math.round(Math.abs(cosLat) * lonDensity))
    for (let lj = 0; lj < lonCount; lj++) { const lon = (lj / lonCount) * 2 * Math.PI; each(cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon), lon) }
  }
}
function drawGlobe(ctx, size, t, pal, o) {
  const spin = 0.5, c = size / 2, pt = makeProj(t * spin, 0.4 + 0.06 * Math.sin(t * 0.35), c, c, c * 0.82)
  const scan = t * (spin + (1.7 - spin) * (o.scanMul ?? 1)), rs = radiusScale(size, o.rsPow ?? 0.6), dimBase = o.dimBase ?? 1, dots = []
  latLong(o.latRings, o.lonDensity, (x, y, z0, lon) => {
    const [px, py, z] = pt(x, y, z0), depth = (z + 1) / 2, d = angleDelta(lon + t * spin, scan), boost = Math.exp(-(d * d) / 0.18) * Math.max(0, z)
    dots.push({ x: px, y: py, z, r: (o.rBase + o.rDepth * depth + o.rBoost * boost) * rs, white: o.inkFar - o.inkSpan * depth, a: dimBase + (1 - dimBase) * Math.min(1, boost) })
  })
  paint(ctx, dots, pal, o.rMin)
}
function solveCycle(time, count, slotDur, rest) {
  const tc = time % (2 * count * slotDur + rest), amount = new Array(count).fill(0)
  let active = -1
  if (tc < 2 * count * slotDur) {
    const slot = Math.floor(tc / slotDur), p = (tc - slot * slotDur) / slotDur, ep = 1 - (1 - Math.min(1, p / 0.7)) ** 3
    if (slot < count) { for (let i = 0; i < slot; i++) amount[i] = 1; amount[slot] = ep; active = slot }
    else { const u = 2 * count - 1 - slot; for (let i = 0; i < u; i++) amount[i] = 1; amount[u] = 1 - ep; active = u }
  }
  return { amount, active }
}
function drawRubik(ctx, size, t, pal, o) {
  const c = size / 2, pt = makeProj(t * 0.55, 0.35 + 0.1 * Math.sin(t * 0.9), c, c, c * 0.82), rs = radiusScale(size, o.rsPow ?? 0.6)
  const moves = Array.from({ length: o.moveCount }, (_, i) => { const lo = -1 + 0.5 * Math.min(3, Math.floor(hashD(i, 5.9) * 4)); return { axis: Math.min(2, Math.floor(hashD(i, 2.3) * 3)), lo, hi: lo + 0.5, ang: ((hashD(i, 7.7) < 0.5 ? 1 : -1) * Math.PI) / 2 } })
  const sc = solveCycle(t, o.moveCount, 0.42, 1.2), dots = []
  latLong(o.latRings, o.lonDensity, (x, y, z) => {
    let inActive = false
    for (let i = 0; i < moves.length; i++) {
      if (sc.amount[i] <= 0) continue
      const mv = moves[i], coord = mv.axis === 0 ? x : mv.axis === 1 ? y : z
      if (coord < mv.lo || coord >= mv.hi) continue
      if (i === sc.active) inActive = true
      const a = mv.ang * sc.amount[i], ca = Math.cos(a), sa = Math.sin(a)
      if (mv.axis === 0) { const y2 = y * ca - z * sa; z = y * sa + z * ca; y = y2 } else if (mv.axis === 1) { const x2 = x * ca + z * sa; z = -x * sa + z * ca; x = x2 } else { const x2 = x * ca - y * sa; y = x * sa + y * ca; x = x2 }
    }
    const [px, py, zr] = pt(x, y, z), depth = (zr + 1) / 2
    dots.push({ x: px, y: py, z: zr, r: (o.rBase + o.rDepth * depth + (inActive ? o.rActive : 0)) * rs, white: o.inkFar - o.inkSpan * depth - (inActive ? 0.14 : 0) })
  })
  paint(ctx, dots, pal, o.rMin)
}
function drawWave(ctx, size, t, pal, o) {
  const c = size / 2, R = c * 0.874, pt = makeProj(t * 0.18, 0.38, c, c, 1), rs = radiusScale(size, o.rsPow ?? 0.6), dots = []
  for (let ri = 0; ri <= o.rings; ri++) {
    const lat = -Math.PI / 2 + (ri / o.rings) * Math.PI, cosLat = Math.cos(lat), sinLat = Math.sin(lat)
    const w = 0.62 * Math.sin(t * 2.1 - ri * 0.52) + 0.38 * Math.sin(t * 1.27 + ri * 0.83), rr = R * (0.88 + 0.105 * w), crest = Math.max(0, w)
    const lonCount = Math.max(1, Math.round(Math.abs(cosLat) * o.lonDensity))
    for (let lj = 0; lj < lonCount; lj++) {
      const lon = (lj / lonCount) * 2 * Math.PI, [px, py, z] = pt(cosLat * Math.cos(lon) * rr, sinLat * rr, cosLat * Math.sin(lon) * rr), depth = (z / R + 1) / 2
      dots.push({ x: px, y: py, z, r: (o.rBase + o.rDepth * depth) * (1 + 0.4 * crest) * rs, white: 0.66 - 0.56 * depth - 0.1 * crest })
    }
  }
  paint(ctx, dots, pal, o.rMin)
}
function drawOrbits(ctx, size, t, pal, o) {
  const c = size / 2, R = c * 0.82, pt = makeProj(t * 0.12, 0.3, c, c, 1), rs = radiusScale(size, o.rsPow ?? 0.6), dots = []
  for (let orb = 0; orb < o.orbitN; orb++) {
    const h1 = hashD(orb, 1.7), h2 = hashD(orb, 5.2), h3 = hashD(orb, 8.9), ro = R * (0.45 + 0.52 * h1), th = h1 * 2 * Math.PI, phi = Math.acos(2 * h2 - 1)
    const nx = Math.sin(phi) * Math.cos(th), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(th)
    let ux = -ny, uy = nx; const uz = 0, ul = Math.max(1e-6, Math.hypot(ux, uy)); ux /= ul; uy /= ul
    const vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux, speed = (0.25 + 0.55 * h3) * (h3 > 0.5 ? 1 : -1)
    const at = (a) => pt((ux * Math.cos(a) + vx * Math.sin(a)) * ro, (uy * Math.cos(a) + vy * Math.sin(a)) * ro, (uz * Math.cos(a) + vz * Math.sin(a)) * ro)
    for (let k = 0; k < o.ghostN; k++) { const [px, py, z] = at((k / o.ghostN) * 2 * Math.PI); dots.push({ x: px, y: py, z, r: o.ghostR * rs, white: 0.72, a: o.ghostA * (0.4 + 0.6 * ((z / ro + 1) / 2)) }) }
    for (let m = 0; m < o.particles; m++) { const [px, py, z] = at(t * speed + (m / o.particles) * 2 * Math.PI + h2 * 6), depth = (z / ro + 1) / 2; dots.push({ x: px, y: py, z, r: (o.partR + o.partRDepth * depth) * rs, white: 0.3 - 0.22 * depth }) }
  }
  paint(ctx, dots, pal, o.rMin)
}
function drawRibbon(ctx, size, t, pal, o) {
  const c = size / 2, R = c * 0.78, spin = o.spin ?? 1, pt = makeProj(t * 0.1 * spin, 0.3, c, c, 1), rs = radiusScale(size, o.rsPow ?? 0.6), dots = []
  for (let i = 0; i < o.ghostN; i++) { const d = fibDir(i, o.ghostN), [px, py, z] = pt(d[0] * R, d[1] * R, d[2] * R); dots.push({ x: px, y: py, z, r: 0.8 * rs, white: 0.78, a: 0.1 + 0.22 * ((z / R + 1) / 2) }) }
  const ya = t * 0.24 * spin, ta = 0.55 + 0.3 * Math.sin(t * 0.18) * spin
  const ux = Math.cos(ya), uy = 0, uz = Math.sin(ya), vx = -uz * Math.sin(ta), vy = Math.cos(ta), vz = ux * Math.sin(ta)
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
  const lanes = Math.max(1, Math.round(o.lanes * (o.bandMul ?? 1)))
  for (let w = 0; w < lanes; w++) {
    const laneOff = (w - (lanes - 1) / 2) * 0.075, edge = Math.abs(w - (lanes - 1) / 2) / Math.max(1, (lanes - 1) / 2)
    for (let k = 0; k < o.segs; k++) {
      const a = (k / o.segs) * 2 * Math.PI, off = laneOff + (0.16 * Math.sin(a * 3 - t * 1.7 + w * 0.22) + 0.07 * Math.sin(a * 5 + t * 1.1)) * (o.wobMul ?? 1)
      const x = ux * Math.cos(a) + vx * Math.sin(a) + nx * off, y = uy * Math.cos(a) + vy * Math.sin(a) + ny * off, z = uz * Math.cos(a) + vz * Math.sin(a) + nz * off, l = Math.hypot(x, y, z)
      const [px, py, zr] = pt((x / l) * R, (y / l) * R, (z / l) * R), depth = (zr / R + 1) / 2
      dots.push({ x: px, y: py, z: zr, r: (o.rBase + o.rDepth * depth) * (1 - 0.25 * edge) * rs, white: 0.52 - 0.44 * depth + 0.18 * edge, a: 0.4 + 0.6 * depth })
    }
  }
  paint(ctx, dots, pal, o.rMin)
}
function polyPath(verts) {
  const L = verts.map((a, i) => { const b = verts[(i + 1) % verts.length]; return Math.hypot(b[0] - a[0], b[1] - a[1]) }), total = L.reduce((s, l) => s + l, 0)
  return (f) => { let target = f * total, i = 0; while (target > L[i] && i < verts.length - 1) { target -= L[i]; i++ } const a = verts[i], b = verts[(i + 1) % verts.length], ff = L[i] ? Math.min(1, target / L[i]) : 0; return [a[0] + (b[0] - a[0]) * ff, a[1] + (b[1] - a[1]) * ff] }
}
const CYCLE = [(f) => { const a = -Math.PI / 2 + f * 2 * Math.PI; return [Math.cos(a) * 0.24, Math.sin(a) * 0.24] }, polyPath([[0, -0.26], [0.24, 0.16], [-0.24, 0.16]]), polyPath([[0, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2], [-0.2, -0.2]])]
function drawMorph(ctx, size, t, pal, o) {
  const HOLD = 1.4, SEG = HOLD + 0.9, K = CYCLE.length, tc = t % (SEG * K), k = Math.floor(tc / SEG), local = tc - k * SEG
  const m = local > HOLD ? ((x) => x * x * (3 - 2 * x))((local - HOLD) / 0.9) : 0, sprd = o.spread ?? 1, M = 160, pts = [], L = []
  for (let i = 0; i < M; i++) { const a = CYCLE[k](i / M), b = CYCLE[(k + 1) % K](i / M); pts.push([(a[0] + (b[0] - a[0]) * m) * sprd, (a[1] + (b[1] - a[1]) * m) * sprd]) }
  let total = 0
  for (let i = 0; i < M; i++) { const a = pts[i], b = pts[(i + 1) % M], l = Math.hypot(b[0] - a[0], b[1] - a[1]); L.push(l); total += l }
  const n = Math.max(6, Math.round(34 * o.iconD)), re = o.rDot * 1.35 * sprd, pulse = 1 + 0.02 * Math.sin(local * 3.1), c2 = size / 2, dots = []
  let seg = 0, acc = 0
  for (let k2 = 0; k2 < n; k2++) {
    const target = (k2 / n) * total
    while (acc + L[seg] < target && seg < M - 1) { acc += L[seg]; seg++ }
    const a = pts[seg], b = pts[(seg + 1) % M], f = L[seg] ? Math.min(1, (target - acc) / L[seg]) : 0
    dots.push({ x: c2 + (a[0] + (b[0] - a[0]) * f) * pulse * size, y: c2 + (a[1] + (b[1] - a[1]) * f) * pulse * size, z: 0, r: Math.max(0.35, re * size), white: 0.1 })
  }
  paint(ctx, dots, pal, o.rMin)
}
const DRAWS = { orbits: drawOrbits, globe: drawGlobe, rubik: drawRubik, wave: drawWave, ribbon: drawRibbon, morph: drawMorph }

// Walkable palettes: [near ink, far ink, opacity]
export const PALETTES = {
  purple: [hex('#5b21d6'), hex('#d9c6fb'), 1],
  soft: [hex('#8c52ff'), hex('#efe6fd'), 0.85],
  lime: [hex('#d9f79d'), hex('#6b4fa3'), 1],
  white: [hex('#ffffff'), hex('#c9a6ff'), 1],
}

// Mounts an animated orb on a canvas. Returns a cleanup function.
// Pauses offscreen and in hidden tabs; draws one still frame for reduced motion.
export function mountOrb(canvas, { state = 'working', size = 64, tuning = 64, palette = 'purple', speed = 1 }) {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const { mode, speed: base, opts } = resolvePreset(state, tuning)
  const draw = DRAWS[mode], pal = PALETTES[palette] || PALETTES.purple, eff = base * speed
  const frame = (t) => { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size); draw(ctx, size, t, pal, opts) }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  let raf = 0, running = false, visible = true
  const loop = () => { frame((performance.now() / 1000) * eff); if (running) raf = requestAnimationFrame(loop) }
  const start = () => { if (running || reduce.matches || !visible || document.visibilityState === 'hidden') return; running = true; raf = requestAnimationFrame(loop) }
  const stop = () => { running = false; cancelAnimationFrame(raf) }
  frame(reduce.matches ? 0.6 : (performance.now() / 1000) * eff)
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop() })
  io.observe(canvas)
  const onVis = () => (document.visibilityState === 'hidden' ? stop() : start())
  const onMotion = () => { stop(); frame(0.6); start() }
  document.addEventListener('visibilitychange', onVis)
  reduce.addEventListener?.('change', onMotion)
  return () => { stop(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); reduce.removeEventListener?.('change', onMotion) }
}
