"use client"
// @ts-nocheck

// Silk Spider Cursor: a 3D jumping spider lives on your page. It follows the
// pointer, walks with a real alternating gait, and lays silk that sticks only
// to the elements you mark.
//
//   enter   it drops in from the top of the page on a drag line, bobs on the
//           silk, looks at you, lands, and bites the line, which springs away.
//   walk    the body eases after the pointer, never glued to it, and turns to
//           face where it is going. Eight legs run 2-bone IK in two groups
//           (L1 R2 L3 R4 / R1 L2 R3 L4). Feet stay planted and step only when
//           they drift too far, so it walks instead of sliding. A foot that
//           lands on silk plucks it.
//   spin    a drag line trails from the spinnerets. Crossing onto a marked
//           element tacks it down there, using the element's live box, so it
//           stays stuck on scroll and resize. Long elements get tacked every
//           few steps, and a new line sometimes bridges to an older one. Over
//           time the lines pull each other into real web shapes. A line that
//           never finds an element is let go.
//   stop    when the pointer rests, it turns to face you, rears its front up
//           so you see the big eyes, waves its palps, and blinks twice.
//   sleep   a few seconds later it settles down, tucks its legs, shuts its
//           eyes and floats "z z z". The next move wakes it with a start.
//   clear   Delete or Backspace cuts every line loose. The silk springs off
//           its anchors, sags, sheds its dew and fades.
//   fly     now and then a fly buzzes in. If it hits silk it sticks and
//           struggles, and when you leave the spider alone it goes and wraps it.
//
// One requestAnimationFrame loop drives two layers: a 2D canvas for the silk
// and a WebGL canvas (three.js) for the spider, rendered inside a scissor box
// around it. DPR is capped, the loop stops while the tab is hidden, and with
// prefers-reduced-motion the spider just sits and breathes, with no webs.

import * as React from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"

export interface SilkSpiderCursorProps {
  /** CSS selector for elements the silk may stick to. Never anchors to empty space. */
  anchorSelector?: string
  /** A GLB (URL or data URI) of the spider, Y up and facing +Z. Defaults to the embedded jumping spider. */
  modelSrc?: string
  /** Top-down photo projection for the default model (see README). */
  topTextureSrc?: string
  /** Front (face) photo projection for the default model. */
  faceTextureSrc?: string
  /** Leg span in px. Defaults to a size that scales with the viewport. */
  size?: number
  /** Silk colour. */
  silkColor?: string
  /** The page colour behind the spider, used as bounce light on its belly. */
  bounceColor?: string
  /** Shadow colour cast on the page. */
  shadowColor?: string
  /** Most threads kept at once; the oldest fade out past this. */
  maxThreads?: number
  /** Let a fly wander in now and then. */
  fly?: boolean
  /** Still time before it falls asleep, ms. */
  sleepAfter?: number
  /** Threads already spun across the marked elements when the page opens. */
  seedWebs?: number
  /** Drop in on a thread from the top of the page. */
  enter?: boolean
  /** Keys that clear the webs. */
  clearKeys?: string[]
  /** "fixed" covers the viewport; "absolute" covers the nearest positioned parent. */
  position?: "fixed" | "absolute"
  zIndex?: number
  /** Device-pixel-ratio cap for both canvases. */
  maxDpr?: number
  className?: string
}

// ---------------------------------------------------------------------------
// Silk: one particle pool shared by every thread, so a bridge pulls on the
// lines it hangs from. Verlet integration, distance constraints.
// ---------------------------------------------------------------------------

// #region silk
const MAXP = 9000
const MAXC = 9000

type AnchorRef = { el: Element | null; u: number; v: number; sx: number; sy: number }

type Thread = {
  id: number
  parts: number[]
  cons: number[]
  owned: number[]
  state: number // 0 drag, 1 set, 2 dying
  alpha: number
  born: number
  dieT: number
  dews: number[] // pairs: position along parts (float index), radius
  anchorEl: Element | null
  hostIds: number[]
}

function createSilk() {
  const X = new Float32Array(MAXP)
  const Y = new Float32Array(MAXP)
  const PX = new Float32Array(MAXP)
  const PY = new Float32Array(MAXP)
  const INV = new Float32Array(MAXP)
  const PIN = new Int32Array(MAXP).fill(-1)
  const CA = new Int32Array(MAXC)
  const CB = new Int32Array(MAXC)
  const CR = new Float32Array(MAXC)
  const CON = new Uint8Array(MAXC)
  const freeP = [] as number[]
  const freeC = [] as number[]
  for (let i = MAXP - 1; i >= 0; i--) freeP.push(i)
  for (let i = MAXC - 1; i >= 0; i--) freeC.push(i)
  const anchors = [] as (AnchorRef | null)[]
  const freeA = [] as number[]
  const threads = [] as Thread[]
  let nextId = 1

  const addAnchor = (a: AnchorRef) => {
    const id = freeA.length ? (freeA.pop() as number) : anchors.length
    anchors[id] = a
    return id
  }
  // high-water marks: the solver only walks the part of the pool ever used
  const hw = { p: 0, c: 0 }
  const particle = (x: number, y: number, anchor: number) => {
    const i = freeP.pop()
    if (i === undefined) return -1
    hw.p = Math.max(hw.p, i + 1)
    X[i] = PX[i] = x
    Y[i] = PY[i] = y
    PIN[i] = anchor
    INV[i] = anchor >= 0 ? 0 : 1
    return i
  }
  const constraint = (a: number, b: number, rest: number) => {
    const c = freeC.pop()
    if (c === undefined) return -1
    hw.c = Math.max(hw.c, c + 1)
    CA[c] = a
    CB[c] = b
    CR[c] = rest
    CON[c] = 1
    return c
  }
  const freeThread = (t: Thread) => {
    for (const c of t.cons) {
      CON[c] = 0
      freeC.push(c)
    }
    for (const p of t.owned) {
      const a = PIN[p]
      if (a >= 0) {
        anchors[a] = null
        freeA.push(a)
      }
      PIN[p] = -1
      INV[p] = 0
      freeP.push(p)
    }
    t.cons.length = 0
    t.owned.length = 0
    t.parts.length = 0
  }
  const newThread = (anchorEl: Element | null) => {
    const t: Thread = {
      id: nextId++, parts: [], cons: [], owned: [], state: 0, alpha: 1, born: 0, dieT: 0,
      dews: [], anchorEl, hostIds: [],
    }
    threads.push(t)
    return t
  }
  const length = (t: Thread) => {
    let L = 0
    for (let k = 1; k < t.parts.length; k++) {
      const a = t.parts[k - 1], b = t.parts[k]
      L += Math.hypot(X[b] - X[a], Y[b] - Y[a])
    }
    return L
  }
  const unpin = (p: number) => {
    const a = PIN[p]
    if (a >= 0) {
      anchors[a] = null
      freeA.push(a)
    }
    PIN[p] = -1
    INV[p] = 1
  }
  // Lay `n` free particles in a straight line between two existing ones.
  const span = (t: Thread, a: number, b: number, seg: number, slack: number) => {
    const d = Math.hypot(X[b] - X[a], Y[b] - Y[a])
    const n = Math.max(2, Math.min(36, Math.round(d / seg)))
    const rest = (d * (1 + slack)) / n
    let prev = a
    t.parts.push(a)
    for (let k = 1; k < n; k++) {
      const f = k / n
      const sag = Math.sin(Math.PI * f) * d * slack * 0.9
      const p = particle(X[a] + (X[b] - X[a]) * f, Y[a] + (Y[b] - Y[a]) * f + sag, -1)
      if (p < 0) break
      t.owned.push(p)
      t.parts.push(p)
      t.cons.push(constraint(prev, p, rest))
      prev = p
    }
    t.parts.push(b)
    t.cons.push(constraint(prev, b, rest))
  }
  const sprinkleDew = (t: Thread, rand: () => number, scale: number) => {
    t.dews.length = 0
    const L = length(t)
    const n = Math.floor(L / (24 + rand() * 30))
    for (let k = 0; k < n; k++) {
      const big = rand() < 0.18
      t.dews.push(1 + rand() * (t.parts.length - 3), (big ? 1.5 + rand() * 1.1 : 0.55 + rand() * 0.75) * scale)
    }
  }

  return {
    X, Y, PX, PY, INV, PIN, CA, CB, CR, CON, anchors, threads, hw,
    addAnchor, particle, constraint, freeThread, newThread, length, unpin, span, sprinkleDew,
  }
}
type Silk = ReturnType<typeof createSilk>

// Pins follow their anchor's live box; everything else falls and is held by
// its constraints.
function stepSilk(s: Silk, dt: number, time: number, rects: Map<Element, DOMRect>, iters: number) {
  const { X, Y, PX, PY, INV, PIN, CA, CB, CR, CON, anchors, hw } = s
  const g = 620 * dt * dt
  for (let i = 0; i < hw.p; i++) {
    const a = PIN[i]
    if (a >= 0) {
      const an = anchors[a]
      if (!an) continue
      if (an.el) {
        const r = rects.get(an.el)
        if (r) {
          X[i] = r.left + an.u * r.width
          Y[i] = r.top + an.v * r.height
        }
      } else {
        X[i] = an.sx
        Y[i] = an.sy
      }
      PX[i] = X[i]
      PY[i] = Y[i]
      continue
    }
    if (INV[i] === 0) continue
    const vx = (X[i] - PX[i]) * 0.986
    const vy = (Y[i] - PY[i]) * 0.986
    PX[i] = X[i]
    PY[i] = Y[i]
    const wind = Math.sin(time * 0.9 + X[i] * 0.006 + Y[i] * 0.004) * 9 * dt * dt
    X[i] += vx + wind
    Y[i] += vy + g * INV[i]
  }
  for (let it = 0; it < iters; it++) {
    for (let c = 0; c < hw.c; c++) {
      if (!CON[c]) continue
      const a = CA[c], b = CB[c]
      const wa = INV[a], wb = INV[b]
      const w = wa + wb
      if (w === 0) continue
      const dx = X[b] - X[a], dy = Y[b] - Y[a]
      const d = Math.sqrt(dx * dx + dy * dy) || 1e-6
      // silk is elastic: it gives a little when stretched and never pushes
      if (d <= CR[c]) continue
      const k = ((d - CR[c]) / d / w) * 0.92
      X[a] += dx * k * wa
      Y[a] += dy * k * wa
      X[b] -= dx * k * wb
      Y[b] -= dy * k * wb
    }
  }
}
// #endregion silk

// ---------------------------------------------------------------------------
// Legs: analytic 2-bone IK with the knee lifted up and out.
// ---------------------------------------------------------------------------

// #region ik
function solveKnee(
  hx: number, hy: number, hz: number,
  fx: number, fy: number, fz: number,
  l1: number, l2: number, px0: number, py0: number, pz0: number,
  out: number[],
) {
  let dx = fx - hx, dy = fy - hy, dz = fz - hz
  let d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6
  const maxD = (l1 + l2) * 0.999
  const minD = Math.abs(l1 - l2) * 1.001 + 1e-6
  const dc = Math.min(maxD, Math.max(minD, d))
  dx /= d; dy /= d; dz /= d
  d = dc
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  // pole: the leg's own rest bend, made perpendicular to the hip-foot line
  let px = px0, py = py0, pz = pz0
  const dot = px * dx + py * dy + pz * dz
  px -= dx * dot; py -= dy * dot; pz -= dz * dot
  const pl = Math.sqrt(px * px + py * py + pz * pz) || 1
  out[0] = hx + dx * a + (px / pl) * h
  out[1] = hy + dy * a + (py / pl) * h
  out[2] = hz + dz * a + (pz / pl) * h
  out[3] = hx + dx * d
  out[4] = hy + dy * d
  out[5] = hz + dz * d
  return out
}
// #endregion ik

// Gait groups: L1 R2 L3 R4 step together, then R1 L2 R3 L4. Legs 0-3 are the
// left side front to back, 4-7 the right.
const GROUP = [0, 1, 0, 1, 1, 0, 1, 0]

// ---------------------------------------------------------------------------
// Rig: the model is reoriented (forward +X, left +Y, up +Z), scaled to a leg
// span of 1, and each leg is skinned to two bones found from its geometry.
// ---------------------------------------------------------------------------

type Leg = {
  hip: THREE.Vector3
  knee: THREE.Vector3
  foot: THREE.Vector3
  l1: number
  l2: number
  b1: THREE.Bone
  b2: THREE.Bone
  restN: THREE.Vector3
  rd: THREE.Vector3 // rest hip-to-foot direction
  rp: THREE.Vector3 // rest knee pole, perpendicular to rd
  // gait state (page px, z up)
  fx: number; fy: number; fz: number
  sx: number; sy: number
  t: number
  stepping: boolean
  dur: number
}

type Rig = {
  root: THREE.Group
  legs: Leg[]
  abdomen: THREE.Bone
  uniforms: { uBlink: { value: number } }
  spinneret: THREE.Vector3
  headFront: THREE.Vector3
  bodyLen: number
}

// The embedded model faces +Z with +Y up (glTF convention).
const MODEL_FORWARD = new THREE.Vector3(0, 0, 1)
const MODEL_UP = new THREE.Vector3(0, 1, 0)

// Two photo projections baked from the full-detail scan, in model space:
// top view over x,z in [-0.98, 0.98], front view over x in [-0.48, 0.48], y in [-0.4, 0.4].
// Each vertex carries how much of each it may use (_w); the rest is its own colour.
const SKIN_VERT = `
attribute vec3 mpos;
attribute vec2 _w;
varying vec3 vMpos;
varying vec2 vW;
`
const SKIN_FRAG = `
uniform sampler2D uTop;
uniform sampler2D uFront;
uniform float uBlink;
uniform vec4 uEye;
uniform float uProj;
varying vec3 vMpos;
varying vec2 vW;
`
const SKIN_COLOR = `
vec4 diffuseColor = vec4( diffuse, opacity );
vec3 base = vColor.rgb;
float rough = vColor.a;
if (uProj > 0.5) {
  vec2 ut = vec2(vMpos.x / 0.98 * 0.5 + 0.5, 0.5 - vMpos.z / 0.98 * 0.5);
  vec2 uf = vec2(vMpos.x / 0.48 * 0.5 + 0.5, vMpos.y / 0.4 * 0.5 + 0.5);
  vec3 ct = texture2D(uTop, ut).rgb;
  vec3 cf = texture2D(uFront, uf).rgb;
  base = base * max(0.0, 1.0 - vW.x - vW.y) + ct * vW.x + cf * vW.y;
  // eyelids: fur from just above the eyes slides down over them
  float inEye = step(uEye.x, vMpos.y) * step(vMpos.y, uEye.y) * step(abs(vMpos.x), uEye.z) * step(uEye.w, vMpos.z);
  float lidLine = mix(uEye.y + 0.01, uEye.x - 0.01, uBlink);
  if (inEye > 0.5 && vMpos.y > lidLine) {
    vec3 lid = texture2D(uFront, vec2(uf.x, (uEye.y + 0.035) / 0.4 * 0.5 + 0.5)).rgb;
    float shade = 0.75 + 0.25 * smoothstep(lidLine, lidLine + 0.04, vMpos.y);
    base = lid * shade;
    rough = 0.9;
  }
}
diffuseColor.rgb = base;
`

// Attributes may be quantized (KHR_mesh_quantization); IK math wants floats.
const toFloat = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
  const out = new Float32Array(a.count * a.itemSize)
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k)
  return new THREE.BufferAttribute(out, a.itemSize)
}

const segQ = new THREE.Vector3()
const segDist = (p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) => {
  const ab = segQ.copy(b).sub(a)
  const t = Math.min(1, Math.max(0, (ab.x * (p.x - a.x) + ab.y * (p.y - a.y) + ab.z * (p.z - a.z)) / (ab.lengthSq() || 1)))
  const dx = a.x + ab.x * t - p.x, dy = a.y + ab.y * t - p.y, dz = a.z + ab.z * t - p.z
  return { d: Math.sqrt(dx * dx + dy * dy + dz * dz), t }
}

function buildRig(scene: THREE.Object3D, top: THREE.Texture | null, front: THREE.Texture | null, knownTips: number[] | null): Rig {
  scene.updateMatrixWorld(true)
  // canonical frame: forward -> +X, left -> +Y, up -> +Z
  const fwd = MODEL_FORWARD.clone().normalize()
  const up = MODEL_UP.clone().normalize()
  const left = new THREE.Vector3().crossVectors(up, fwd).normalize()
  const basis = new THREE.Matrix4().makeBasis(fwd, left, up).invert()

  const meshes = [] as THREE.Mesh[]
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh)
  })
  const geos = meshes.map((m) => {
    const src = m.geometry
    const g = new THREE.BufferGeometry()
    for (const name of Object.keys(src.attributes)) g.setAttribute(name, toFloat(src.attributes[name]))
    if (src.index) g.setIndex(src.index.clone())
    g.applyMatrix4(m.matrixWorld)
    g.setAttribute("mpos", (g.attributes.position as THREE.BufferAttribute).clone())
    g.applyMatrix4(basis)
    return g
  })
  const box = new THREE.Box3()
  for (const g of geos) {
    g.computeBoundingBox()
    box.union(g.boundingBox as THREE.Box3)
  }
  const span = Math.max(box.max.x - box.min.x, box.max.y - box.min.y)
  const center = new THREE.Vector3((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.min.z)
  const norm = new THREE.Matrix4().makeScale(1 / span, 1 / span, 1 / span).multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z))
  for (const g of geos) g.applyMatrix4(norm)

  // Everything below is in normalised units: span 1, lowest point at z 0.
  const all = [] as number[]
  const rough = [] as number[]
  for (const g of geos) {
    const p = g.attributes.position
    const c = g.attributes.color
    for (let i = 0; i < p.count; i++) {
      all.push(p.getX(i), p.getY(i), p.getZ(i))
      rough.push(c && c.itemSize === 4 ? c.getW(i) : 1)
    }
  }
  // body axis: the strip along x near y 0, above the leg tips
  let bx0 = Infinity, bx1 = -Infinity, topZ = 0
  for (let i = 0; i < all.length; i += 3) {
    if (Math.abs(all[i + 1]) < 0.03) {
      bx0 = Math.min(bx0, all[i])
      bx1 = Math.max(bx1, all[i])
      topZ = Math.max(topZ, all[i + 2])
    }
  }
  const bodyLen = bx1 - bx0
  // the waist (pedicel) is the narrowest point of the body strip between the thirds
  let waistX = bx0 + bodyLen * 0.5, narrow = Infinity
  for (let f = 0.3; f <= 0.7; f += 0.02) {
    const x = bx0 + bodyLen * f
    let w = 0
    for (let i = 0; i < all.length; i += 3) if (Math.abs(all[i] - x) < 0.008 && all[i + 2] > topZ * 0.35) w = Math.max(w, Math.abs(all[i + 1]))
    if (w > 0 && w < narrow) { narrow = w; waistX = x }
  }
  // carapace centre: halfway between the waist and the front. Knees ride as
  // high as the abdomen, so the carapace is measured from its very top only.
  const cx = (waistX + bx1) / 2
  let bodyR = 0
  for (let i = 0; i < all.length; i += 3) {
    if (Math.abs(all[i] - cx) < 0.03 && all[i + 2] > topZ * 0.8) bodyR = Math.max(bodyR, Math.abs(all[i + 1]))
  }
  bodyR = Math.max(bodyR, 0.05)
  // abdomen: an ellipse behind the waist
  const ax = (bx0 + waistX) / 2, ahl = (waistX - bx0) / 2, ahw = ahl * 0.92
  const inAbdomen = (x: number, y: number) => ((x - ax) / (ahl * 1.08)) ** 2 + (y / (ahw * 1.08)) ** 2 < 1
  // the abdomen's own skin is narrower: leg IV femurs lie right beside it
  const onAbdomen = (x: number, y: number) => ((x - ax) / (ahl * 1.05)) ** 2 + (y / (ahl * 0.6)) ** 2 < 1
  // Leg tips: the farthest points from the carapace centre in angular sectors,
  // the eight longest reaches (palps are short and drop out).
  const sectors = [] as { a: number; best: number; p: THREE.Vector3 }[]
  for (let i = 0; i < all.length; i += 3) {
    const dx = all[i] - cx, dy = all[i + 1]
    const r = Math.hypot(dx, dy)
    if (r < bodyR * 1.5) continue
    if (inAbdomen(all[i], dy)) continue
    // feet are low; a high point out there is a knee, not a tip
    if (all[i + 2] > topZ * 0.38) continue
    const ang = Math.atan2(dy, dx)
    let s = sectors.find((q) => Math.abs(Math.atan2(Math.sin(q.a - ang), Math.cos(q.a - ang))) < 0.22)
    if (!s) {
      s = { a: ang, best: 0, p: new THREE.Vector3() }
      sectors.push(s)
    }
    if (r > s.best) {
      s.best = r
      s.a = ang
      s.p.set(all[i], all[i + 1], all[i + 2])
    }
  }
  sectors.sort((a, b) => b.best - a.best)
  const legSectors = sectors.slice(0, 8)
  const L = legSectors.filter((s) => s.a > 0).sort((a, b) => a.a - b.a)
  const R = legSectors.filter((s) => s.a <= 0).sort((a, b) => b.a - a.a)
  const tips = knownTips
    ? Array.from({ length: 8 }, (_, k) => new THREE.Vector3(knownTips[k * 3], knownTips[k * 3 + 1], knownTips[k * 3 + 2]))
    : [...L, ...R].map((s) => s.p.clone())

  const legs = [] as Leg[]
  const bones = [] as THREE.Bone[]
  const rootBone = new THREE.Bone()
  bones.push(rootBone)
  const abdomen = new THREE.Bone()
  abdomen.position.set(waistX, 0, topZ * 0.5)
  rootBone.add(abdomen)
  bones.push(abdomen)

  const legAng = tips.map((t) => Math.atan2(t.y, t.x - cx))
  const tmp = new THREE.Vector3()
  for (let k = 0; k < tips.length; k++) {
    const tip = tips[k]
    const ang = legAng[k]
    const findKnee = (hip: THREE.Vector3) => {
      const nx = -(tip.y - hip.y), ny = tip.x - hip.x
      const nl = Math.hypot(nx, ny) || 1
      const L0 = Math.hypot(tip.x - hip.x, tip.y - hip.y)
      let knee = hip.clone().lerp(tip, 0.45).setZ(topZ * 0.8)
      let best = -Infinity
      for (let i = 0; i < all.length; i += 3) {
        const px = all[i] - hip.x, py = all[i + 1] - hip.y
        if (Math.abs((px * nx + py * ny) / nl) > 0.025) continue
        const along = (px * (tip.x - hip.x) + py * (tip.y - hip.y)) / L0
        if (along < L0 * 0.18 || along > L0 * 0.75) continue
        if (all[i + 2] > best) { best = all[i + 2]; knee = new THREE.Vector3(all[i], all[i + 1], all[i + 2]) }
      }
      return knee
    }
    // the hip sits on the carapace rim, aimed at the knee (legs I and II
    // reach forward but leave the body from its sides)
    const hipAt = (a: number) => new THREE.Vector3(cx + Math.cos(a) * bodyR * 0.92, Math.sin(a) * bodyR * 0.92, topZ * 0.42)
    let hip = hipAt(ang)
    let knee = findKnee(hip)
    hip = hipAt(Math.atan2(knee.y, knee.x - cx))
    knee = findKnee(hip)
    const foot = tip.clone()
    const b1 = new THREE.Bone()
    b1.position.copy(hip)
    const b2 = new THREE.Bone()
    b2.position.copy(knee).sub(hip)
    b1.add(b2)
    rootBone.add(b1)
    bones.push(b1, b2)
    const d1 = knee.clone().sub(hip), d2 = foot.clone().sub(knee)
    const restN = new THREE.Vector3().crossVectors(d1, d2)
    if (restN.lengthSq() < 1e-10) restN.set(-Math.sin(ang), Math.cos(ang), 0).cross(new THREE.Vector3(0, 0, 1))
    legs.push({
      hip, knee, foot, l1: d1.length(), l2: d2.length(), b1, b2, restN: restN.normalize(),
      rd: foot.clone().sub(hip).normalize(),
      rp: (() => {
        const rd = foot.clone().sub(hip).normalize()
        const v = knee.clone().sub(hip)
        return v.sub(rd.multiplyScalar(v.dot(rd))).normalize()
      })(),
      fx: 0, fy: 0, fz: 0, sx: 0, sy: 0, t: 0, stepping: false, dur: 0.14,
    })
  }

  // Skin: legs by sector and by where the vertex falls along hip-knee-foot,
  // the abdomen behind the waist, everything else to the root.
  const root = new THREE.Group()
  const uniforms = { uBlink: { value: 0 } }
  // eyes: glossy vertices on the front of the carapace (model space)
  const eye = new THREE.Vector4(1, -1, 0, 1)
  geos.forEach((g, gi) => {
    const pos = g.attributes.position
    const mp = g.attributes.mpos
    const n = pos.count
    const si = new Uint16Array(n * 4)
    const sw = new Float32Array(n * 4)
    const p = new THREE.Vector3()
    const c = g.attributes.color
    for (let i = 0; i < n; i++) {
      p.set(pos.getX(i), pos.getY(i), pos.getZ(i))
      if (c && c.itemSize === 4 && c.getW(i) < 0.3 && p.x > waistX && Math.hypot(p.x - cx, p.y) < bodyR * 1.2 && p.z > topZ * 0.45) {
        eye.x = Math.min(eye.x, mp.getY(i))
        eye.y = Math.max(eye.y, mp.getY(i))
        eye.z = Math.max(eye.z, Math.abs(mp.getX(i)))
        eye.w = Math.min(eye.w, mp.getZ(i))
      }
      const r = Math.hypot(p.x - cx, p.y)
      let done = false
      // chelicerae and palps hang in front of the face: they stay with the body
      const face = p.x > cx && Math.abs(p.y) < bodyR * 0.62
      if (r > bodyR * 0.7 && !face && !onAbdomen(p.x, p.y)) {
        // nearest leg by distance to its hip-knee-foot polyline
        let best = -1, bd = 0.07, bt = 0
        for (let k = 0; k < legs.length; k++) {
          const lg = legs[k]
          const d1 = segDist(p, lg.hip, lg.knee)
          const d2 = segDist(p, lg.knee, lg.foot)
          if (d1.d < bd) { bd = d1.d; best = k; bt = d1.t * 0.5 }
          if (d2.d < bd) { bd = d2.d; best = k; bt = 0.5 + d2.t * 0.5 }
        }
        if (best >= 0) {
          const bi = 2 + best * 2
          // blend across the knee (bt 0.5), and into the body at the hip
          const w2 = Math.min(1, Math.max(0, (bt - 0.44) / 0.12))
          const w0 = Math.min(1, Math.max(0, (0.08 - bt) / 0.08)) * (1 - w2)
          si[i * 4] = bi
          si[i * 4 + 1] = bi + 1
          si[i * 4 + 2] = 0
          sw[i * 4] = (1 - w2) * (1 - w0)
          sw[i * 4 + 1] = w2
          sw[i * 4 + 2] = w0
          done = true
        }
      }
      if (!done) {
        si[i * 4] = onAbdomen(p.x, p.y) ? 1 : 0
        sw[i * 4] = 1
      }
    }
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4))
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4))
    if (!g.attributes._w) g.setAttribute("_w", new THREE.BufferAttribute(new Float32Array(n * 2), 2))
    const srcMat = meshes[gi].material as THREE.MeshStandardMaterial
    const hasColor = !!c && c.itemSize === 4
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: hasColor,
      map: hasColor ? null : srcMat.map ?? null,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 1,
    })
    const proj = hasColor && top && front ? 1 : 0
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTop = { value: top }
      sh.uniforms.uFront = { value: front }
      sh.uniforms.uBlink = uniforms.uBlink
      sh.uniforms.uEye = { value: eye }
      sh.uniforms.uProj = { value: proj }
      sh.vertexShader = SKIN_VERT + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvMpos = mpos;\nvW = _w;")
      sh.fragmentShader = SKIN_FRAG + sh.fragmentShader
        .replace("vec4 diffuseColor = vec4( diffuse, opacity );", hasColor ? SKIN_COLOR : "vec4 diffuseColor = vec4( diffuse, opacity );")
        .replace("#include <color_fragment>", "")
        .replace("#include <roughnessmap_fragment>", hasColor ? "float roughnessFactor = clamp(mix(0.08, 0.92, rough), 0.06, 1.0);" : "#include <roughnessmap_fragment>")
    }
    const sm = new THREE.SkinnedMesh(g, mat)
    sm.castShadow = true
    sm.frustumCulled = false
    root.add(sm)
  })
  // bones at rest must have identity skinning: inverses from the rest pose
  const first = root.children[0] as THREE.SkinnedMesh
  first.add(rootBone)
  root.updateMatrixWorld(true)
  const skeleton = new THREE.Skeleton(bones)
  for (const sm of root.children) (sm as THREE.SkinnedMesh).bind(skeleton, new THREE.Matrix4())
  eye.x += (eye.y - eye.x) * 0.02

  return {
    root, legs, abdomen, uniforms,
    spinneret: new THREE.Vector3(bx0 + 0.01, 0, topZ * 0.4),
    headFront: new THREE.Vector3(bx1, 0, topZ * 0.7),
    bodyLen,
  }
}

// ---------------------------------------------------------------------------


const isTyping = (el: Element | null) =>
  !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable)

function mulberry(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const angDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a))
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export default function SilkSpiderCursor({
  anchorSelector = "[data-silk-anchor]",
  modelSrc = DEFAULT_MODEL,
  topTextureSrc,
  faceTextureSrc,
  size,
  silkColor = "#ffffff",
  bounceColor = "#1530e6",
  shadowColor = "#000a3a",
  maxThreads = 120,
  fly = true,
  sleepAfter = 4500,
  enter = true,
  seedWebs = 0,
  clearKeys = ["Delete", "Backspace"],
  position = "fixed",
  zIndex = 50,
  maxDpr = 2,
  className,
}: SilkSpiderCursorProps) {
  const wrapRef = React.useRef(null as HTMLDivElement | null)
  const silkRef = React.useRef(null as HTMLCanvasElement | null)
  const glRef = React.useRef(null as HTMLCanvasElement | null)
  const opts = React.useRef({ anchorSelector, size, silkColor, maxThreads, fly, sleepAfter, enter, clearKeys })
  opts.current = { anchorSelector, size, silkColor, maxThreads, fly, sleepAfter, enter, clearKeys }

  React.useEffect(() => {
    const wrap = wrapRef.current
    const silkCanvas = silkRef.current
    const glCanvas = glRef.current
    if (!wrap || !silkCanvas || !glCanvas) return
    const ctx = silkCanvas.getContext("2d")
    if (!ctx) return
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    const rand = mulberry(0x5eed)

    // ---------------- renderer ----------------
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: true, powerPreference: "high-performance" })
    } catch {
      return
    }
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.92
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex
    scene.environmentIntensity = 0.35
    const hemi = new THREE.HemisphereLight(0xfff6ec, new THREE.Color(bounceColor), 0.45)
    hemi.position.set(0, 0, 1)
    scene.add(hemi)
    const key = new THREE.DirectionalLight(0xfff1de, 1.9)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.radius = 5
    key.shadow.bias = -0.0008
    key.shadow.normalBias = 0.6
    scene.add(key, key.target)
    const rim = new THREE.DirectionalLight(0xbcd0ff, 0.7)
    scene.add(rim, rim.target)
    const camera = new THREE.PerspectiveCamera(20, 1, 1, 20000)
    // shadow catcher on the page plane, moved with the spider
    const catcher = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShadowMaterial({ color: new THREE.Color(shadowColor), opacity: 0.42 }),
    )
    catcher.receiveShadow = true
    scene.add(catcher)
    // contact shade under the body: a soft radial blob
    const blobCanvas = document.createElement("canvas")
    blobCanvas.width = blobCanvas.height = 64
    const bctx = blobCanvas.getContext("2d") as CanvasRenderingContext2D
    const bg = bctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    bg.addColorStop(0, "rgba(0,0,0,0.55)")
    bg.addColorStop(0.55, "rgba(0,0,0,0.18)")
    bg.addColorStop(1, "rgba(0,0,0,0)")
    bctx.fillStyle = bg
    bctx.fillRect(0, 0, 64, 64)
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blobCanvas), transparent: true, depthWrite: false, color: new THREE.Color(shadowColor) }),
    )
    blob.position.z = 0.2
    scene.add(blob)

    const body = new THREE.Group() // page position + yaw/pitch/roll
    scene.add(body)
    let rig: Rig | null = null

    // ---------------- sizing ----------------
    let W = 0, H = 0, dpr = 1, S = 220
    const resize = () => {
      const r = wrap.getBoundingClientRect()
      W = Math.max(1, r.width)
      H = Math.max(1, r.height)
      dpr = Math.min(maxDpr, window.devicePixelRatio || 1)
      silkCanvas.width = Math.round(W * dpr)
      silkCanvas.height = Math.round(H * dpr)
      renderer.setPixelRatio(dpr)
      renderer.setSize(W, H, false)
      const fov = camera.fov * (Math.PI / 180)
      const dist = H / 2 / Math.tan(fov / 2)
      camera.aspect = W / H
      camera.position.set(W / 2, -H / 2, dist)
      camera.near = dist * 0.5
      camera.far = dist * 1.6
      camera.lookAt(W / 2, -H / 2, 0)
      camera.updateProjectionMatrix()
      S = opts.current.size ?? clamp(Math.min(W, H * 1.4) * 0.22, 150, 300)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    // ---------------- spider state (page px, y down) ----------------
    const sp = {
      x: W * 0.5, y: -S, vx: 0, vy: 0, th: Math.PI / 2, pitch: 0, roll: 0, z: 0, vz: 0,
      mode: reduced ? "idle" : opts.current.enter ? "enter" : "idle",
      t: 0, idleT: 0, blink: 0, sleep: 0, eyesClosed: 0, wake: 0, preferGroup: 0, ik: 0,
      enterX: W * 0.5, enterY: H * 0.34, landed: false,
    }
    if (sp.mode !== "enter") {
      sp.x = reduced ? W * 0.6 : W * 0.5
      sp.y = reduced ? H * 0.2 : H * 0.4
      sp.landed = true
    }
    const ptr = { x: sp.x, y: sp.y, has: false, lastMove: -1e9, ix: 0, iy: 0 }

    // ---------------- silk state ----------------
    const silk = createSilk()
    let drag: Thread | null = null
    let dragEl: Element | null = null
    let tackX = 0, tackY = 0
    let dropLine: Thread | null = null
    let anchorEls = [] as Element[]
    let anchorScan = 0
    const rects = new Map() as Map<Element, DOMRect>

    const scanAnchors = () => {
      const root = position === "fixed" ? document : wrap.parentElement ?? document
      anchorEls = Array.from(root.querySelectorAll(opts.current.anchorSelector))
    }
    scanAnchors()

    // world helpers
    const v3 = new THREE.Vector3()
    const m4 = new THREE.Matrix4()
    const toPage = (local: THREE.Vector3, out: THREE.Vector3) => {
      out.copy(local).applyMatrix4(rig ? rig.root.matrixWorld : body.matrixWorld)
      out.y = -out.y
      return out
    }
    const spinPage = new THREE.Vector3()
    const headPage = new THREE.Vector3()

    const anchorAt = (x: number, y: number, el: Element | null) => {
      if (!el) return silk.addAnchor({ el: null, u: 0, v: 0, sx: x, sy: y })
      const r = rects.get(el) as DOMRect
      return silk.addAnchor({ el, u: (x - r.left) / Math.max(1, r.width), v: (y - r.top) / Math.max(1, r.height), sx: x, sy: y })
    }

    const startDrag = (x: number, y: number, el: Element) => {
      const t = silk.newThread(el)
      const a = silk.particle(x, y, anchorAt(x, y, el))
      const s = silk.particle(x, y, silk.addAnchor({ el: null, u: 0, v: 0, sx: x, sy: y }))
      if (a < 0 || s < 0) return null
      t.owned.push(a, s)
      t.parts.push(a, s)
      t.cons.push(silk.constraint(a, s, 0.5))
      t.born = sp.t
      drag = t
      dragEl = el
      tackX = x
      tackY = y
      return t
    }

    const dragSpinner = (t: Thread) => t.parts[t.parts.length - 1]

    // Grow the drag line: when the spinneret pulls away, the pinned end becomes
    // a free bead and a new pinned end takes its place.
    const feedDrag = (x: number, y: number) => {
      if (!drag) return
      const s = dragSpinner(drag)
      const an = silk.anchors[silk.PIN[s]]
      if (an) {
        an.sx = x
        an.sy = y
      }
      const prev = drag.parts[drag.parts.length - 2]
      const seg = Math.max(10, S * 0.07)
      const d = Math.hypot(x - silk.X[prev], y - silk.Y[prev])
      if (d > seg && drag.parts.length < 60) {
        silk.unpin(s)
        silk.X[s] = silk.PX[s] = x
        silk.Y[s] = silk.PY[s] = y
        const c = drag.cons[drag.cons.length - 1]
        silk.CR[c] = d
        const ns = silk.particle(x, y, silk.addAnchor({ el: null, u: 0, v: 0, sx: x, sy: y }))
        if (ns < 0) return
        drag.owned.push(ns)
        drag.parts.push(ns)
        drag.cons.push(silk.constraint(s, ns, 0.5))
      } else {
        silk.CR[drag.cons[drag.cons.length - 1]] = Math.max(0.5, d)
      }
    }

    const setThreads = () => silk.threads.filter((t) => t.state === 1)

    // a line between two particles, laid with a sag, and maybe a bridge from it
    const lay = (a: number, b: number, el: Element | null) => {
      const t = silk.newThread(el)
      silk.span(t, a, b, Math.max(12, S * 0.08), 0.02 + rand() * 0.05)
      t.state = 1
      t.born = -10
      silk.sprinkleDew(t, rand, Math.sqrt(S / 220))
      return t
    }
    const bridgeFrom = (t: Thread) => {
      const mid = t.parts[Math.floor(t.parts.length / 2)]
      let best = -1, bd = S * 1.1, host: Thread | null = null
      for (const o of setThreads()) {
        if (o === t || o.parts.length < 4) continue
        for (let k = 1; k < o.parts.length - 1; k++) {
          const p = o.parts[k]
          const d = Math.hypot(silk.X[p] - silk.X[mid], silk.Y[p] - silk.Y[mid])
          if (d < bd && d > S * 0.18) { bd = d; best = p; host = o }
        }
      }
      if (best < 0 || !host) return
      const b = lay(mid, best, null)
      b.born = sp.t
      b.hostIds.push(t.id, host.id)
    }

    // The web it spun before you arrived: lines between nearby marked elements
    // in view, then bridges between them.
    const seed = (n: number) => {
      const els = anchorEls.filter((e) => {
        const r = rects.get(e)
        return !!r && r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < H
      })
      if (els.length < 2) return
      const pt = (el: Element) => {
        const r = rects.get(el) as DOMRect
        return [r.left + r.width * (0.15 + rand() * 0.7), r.top + r.height * (0.08 + rand() * 0.45)]
      }
      const made = [] as Thread[]
      for (let k = 0, tries = 0; k < n && tries < n * 12; tries++) {
        const A = els[Math.floor(rand() * els.length)]
        const ra = rects.get(A) as DOMRect
        const near = els.filter((e) => {
          if (e === A) return false
          const r = rects.get(e) as DOMRect
          const d = Math.hypot(r.left + r.width / 2 - ra.left - ra.width / 2, r.top + r.height / 2 - ra.top - ra.height / 2)
          return d > S * 0.4 && d < Math.min(W, H) * 0.6
        })
        if (!near.length) continue
        const B = near[Math.floor(rand() * near.length)]
        const [ax, ay] = pt(A), [bx, by] = pt(B)
        const pa = silk.particle(ax, ay, anchorAt(ax, ay, A))
        const pb = silk.particle(bx, by, anchorAt(bx, by, B))
        if (pa < 0 || pb < 0) break
        const t = lay(pa, pb, A)
        t.owned.push(pa, pb)
        made.push(t)
        k++
      }
      for (const t of made) if (rand() < 0.6) bridgeFrom(t)
    }
    let seeded = reduced || seedWebs <= 0

    // Tack the drag line down at (x, y) on el: it tightens to a gentle sag and
    // sometimes throws a bridge to a nearby line.
    const attach = (x: number, y: number, el: Element) => {
      if (!drag) return
      const t = drag
      const s = dragSpinner(t)
      const a0 = t.parts[0]
      const straight = Math.hypot(silk.X[a0] - x, silk.Y[a0] - y)
      if (straight < S * 0.1) {
        // too short to be worth a line: just move the start here
        silk.freeThread(t)
        silk.threads.splice(silk.threads.indexOf(t), 1)
        drag = null
        startDrag(x, y, el)
        return
      }
      const an = silk.anchors[silk.PIN[s]]
      if (an) {
        const r = rects.get(el) as DOMRect
        an.el = el