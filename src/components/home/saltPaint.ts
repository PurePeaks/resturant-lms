// Procedural Himalayan-salt painters shared by the WebGL scenes and the CSS slabs.
// Everything is seeded so the slab looks identical on every load.

export function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  // CPU-backed: cheap pixel access below, and a direct upload when used as a WebGL texture.
  return [canvas, canvas.getContext("2d", { willReadFrequently: true })!] as const;
}

interface Speck {
  r: number;
  g: number;
  b: number;
  a: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Hands control back to the browser so long paints never block input or animation. */
function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (scheduler?.yield) return scheduler.yield();
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });
}

/**
 * Blends thousands of tiny rectangles straight into pixel memory with the same
 * area coverage a canvas fillRect would give, at a fraction of the cost of
 * one draw call per speck. `next` fills in each speck in turn. Work is sliced
 * into ~6 ms chunks so it never stalls the page.
 */
async function blendSpecks(
  ctx: CanvasRenderingContext2D,
  size: number,
  count: number,
  next: (speck: Speck) => void,
  opaque: boolean
) {
  const image = ctx.getImageData(0, 0, size, size);
  const d = image.data;
  const s: Speck = { r: 0, g: 0, b: 0, a: 0, x: 0, y: 0, w: 0, h: 0 };
  let sliceStart = performance.now();
  for (let i = 0; i < count; i++) {
    if ((i & 1023) === 0 && performance.now() - sliceStart > 6) {
      await yieldToMain();
      sliceStart = performance.now();
    }
    next(s);
    const x1 = s.x + s.w;
    const y1 = s.y + s.h;
    const py1 = Math.min(size, Math.ceil(y1));
    const px1 = Math.min(size, Math.ceil(x1));
    for (let py = Math.max(0, Math.floor(s.y)); py < py1; py++) {
      const cy = Math.min(py + 1, y1) - Math.max(py, s.y);
      for (let px = Math.max(0, Math.floor(s.x)); px < px1; px++) {
        const a = s.a * cy * (Math.min(px + 1, x1) - Math.max(px, s.x));
        if (a <= 0) continue;
        const o = (py * size + px) * 4;
        if (opaque) {
          // Source-over onto an opaque pixel reduces to a plain lerp.
          d[o] += (s.r - d[o]) * a;
          d[o + 1] += (s.g - d[o + 1]) * a;
          d[o + 2] += (s.b - d[o + 2]) * a;
        } else {
          // Source-over on straight (non-premultiplied) RGBA.
          const da = d[o + 3] / 255;
          const oa = a + da * (1 - a);
          const keep = (da * (1 - a)) / oa;
          const add = a / oa;
          d[o] = s.r * add + d[o] * keep;
          d[o + 1] = s.g * add + d[o + 1] * keep;
          d[o + 2] = s.b * add + d[o + 2] * keep;
          d[o + 3] = oa * 255;
        }
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

function facet(ctx: CanvasRenderingContext2D, r: () => number, x: number, y: number, radius: number) {
  const sides = 4 + Math.floor(r() * 3);
  ctx.beginPath();
  for (let k = 0; k < sides; k++) {
    const a = (k / sides) * Math.PI * 2 + r() * 0.6;
    const d = radius * (0.6 + r() * 0.5);
    if (k === 0) ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    else ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
}

/** A long, gently wandering stroke across the whole canvas, roughly parallel to the strata. */
function sweep(ctx: CanvasRenderingContext2D, r: () => number, size: number, wander: number) {
  const angle = 0.45 + (r() - 0.5) * 0.5;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const off = (r() - 0.5) * size * 1.6;
  let x = size / 2 - dx * size - dy * off;
  let y = size / 2 - dy * size + dx * off;
  const steps = 8;
  const len = (size * 2) / steps;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let s = 0; s < steps; s++) {
    const nx = x + dx * len + (r() - 0.5) * wander;
    const ny = y + dy * len + (r() - 0.5) * wander;
    ctx.quadraticCurveTo(x + (dx * len) / 2 + (r() - 0.5) * wander, y + (dy * len) / 2 + (r() - 0.5) * wander, nx, ny);
    x = nx;
    y = ny;
  }
  ctx.stroke();
}

/**
 * A jagged band of pale crystal crossing the canvas, the white "cloud" seams
 * that run through real Himalayan slabs.
 */
function crystalBand(ctx: CanvasRenderingContext2D, r: () => number, size: number, width: number) {
  const angle = 0.35 + (r() - 0.5) * 0.9;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const off = (r() - 0.5) * size * 1.2;
  const cx = size / 2 - dy * off;
  const cy = size / 2 + dx * off;
  const steps = 36;
  const upper: [number, number][] = [];
  const lower: [number, number][] = [];
  let drift = 0;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps - 0.5) * size * 2.2;
    drift += (r() - 0.5) * width * 0.35;
    const px = cx + dx * t - dy * drift;
    const py = cy + dy * t + dx * drift;
    // One edge stays fairly smooth, the other breaks into jagged crystal teeth.
    const top = width * (0.35 + r() * 0.25);
    const bottom = width * (0.25 + r() * 0.9) * (r() < 0.2 ? 1.6 : 1);
    upper.push([px - dy * top, py + dx * top]);
    lower.push([px + dy * bottom, py - dx * bottom]);
  }
  ctx.beginPath();
  upper.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  for (let i = lower.length - 1; i >= 0; i--) ctx.lineTo(lower[i][0], lower[i][1]);
  ctx.closePath();
  ctx.fill();
}

/** Pale peach-pink salt with salmon zones, jagged white crystal bands and fine grit, as in the real slabs. */
export async function paintSalt(seed = 7, size = 1024) {
  const [canvas, ctx] = makeCanvas(size);
  const r = rng(seed);
  const k = size / 1024;

  ctx.fillStyle = "#f2cfc2";
  ctx.fillRect(0, 0, size, size);

  // Salmon-pink zones where the iron runs deep.
  for (let i = 0; i < 26; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = (120 + r() * 320) * k;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(228,${120 + Math.floor(r() * 30)},${95 + Math.floor(r() * 25)},${0.28 + r() * 0.2})`);
    g.addColorStop(1, "rgba(228,140,110,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  // Milky, almost-white crystal clouds.
  for (let i = 0; i < 18; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = (80 + r() * 200) * k;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(255,246,242,${0.25 + r() * 0.25})`);
    g.addColorStop(1, "rgba(255,246,242,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  // Jagged white crystal bands.
  for (let i = 0; i < 3; i++) {
    ctx.filter = `blur(${(1.5 + r() * 2) * k}px)`;
    ctx.fillStyle = `rgba(255,250,247,${0.5 + r() * 0.25})`;
    crystalBand(ctx, r, size, (40 + r() * 70) * k);
  }
  ctx.filter = "none";

  // Faint crystal facets.
  for (let i = 0; i < 220; i++) {
    facet(ctx, r, r() * size, r() * size, (8 + r() * 40) * k);
    ctx.fillStyle = r() > 0.5 ? `rgba(255,255,255,${0.03 + r() * 0.05})` : `rgba(190,100,85,${0.02 + r() * 0.04})`;
    ctx.fill();
  }

  // Fine sugary grit across the whole surface.
  await yieldToMain();
  await blendSpecks(ctx, size, Math.ceil(70000 * k * k), (sp) => {
    if (r() > 0.4) {
      sp.r = sp.g = sp.b = 255;
      sp.a = 0.15 + r() * 0.45;
    } else {
      sp.r = 196;
      sp.g = 112;
      sp.b = 96;
      sp.a = 0.08 + r() * 0.18;
    }
    sp.w = sp.h = (0.6 + r() * 1.6) * k;
    sp.x = r() * size;
    sp.y = r() * size;
  }, true);
  return canvas;
}

/** Grey-scale relief: a gritty crystalline surface with the odd fissure. */
export async function paintBump(seed = 11, size = 512) {
  const [canvas, ctx] = makeCanvas(size);
  const r = rng(seed);
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 300; i++) {
    facet(ctx, r, r() * size, r() * size, 4 + r() * 18);
    const v = Math.floor(100 + r() * 60);
    ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
    ctx.fill();
  }
  await blendSpecks(ctx, size, 40000, (sp) => {
    sp.r = sp.g = sp.b = r() > 0.5 ? 255 : 0;
    sp.a = 0.08 + r() * 0.22;
    sp.x = r() * size;
    sp.y = r() * size;
    sp.w = 1 + r();
    sp.h = 1 + r();
  }, true);
  ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(40,40,40,${0.2 + r() * 0.3})`;
    ctx.lineWidth = 0.6 + r() * 1.2;
    sweep(ctx, r, size, 30);
  }
  return canvas;
}

/** Transparent frost: dense white specks and feathered ice crystals. */
export async function paintFrost(seed = 5, size = 512) {
  const [canvas, ctx] = makeCanvas(size);
  const r = rng(seed);
  ctx.fillStyle = "rgba(232,244,255,0.38)";
  ctx.fillRect(0, 0, size, size);
  await blendSpecks(ctx, size, 9000, (sp) => {
    sp.r = sp.g = sp.b = 255;
    sp.a = r() * 0.75;
    sp.w = sp.h = r() * 1.8 + 0.3;
    sp.x = r() * size;
    sp.y = r() * size;
  }, false);
  ctx.lineCap = "round";
  for (let i = 0; i < 140; i++) {
    const x = r() * size;
    const y = r() * size;
    const len = 6 + r() * 22;
    ctx.strokeStyle = `rgba(255,255,255,${0.25 + r() * 0.4})`;
    ctx.lineWidth = 0.6 + r();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + r() * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
  }
  return canvas;
}

/** Soft white radial falloff, tinted per use (heat bloom, sparks, embers). */
export function paintGlow(size = 256) {
  const [canvas, ctx] = makeCanvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

let saltUrl: string | null = null;
let saltQueued = false;
const saltListeners = new Set<() => void>();

/**
 * Subscribe to the salt texture for CSS-rendered slabs. It is painted in idle
 * time and JPEG-encoded off the main thread, so it never competes with the hero.
 */
export function subscribeSaltUrl(listener: () => void) {
  saltListeners.add(listener);
  if (!saltUrl && !saltQueued) {
    saltQueued = true;
    const paint = () =>
      paintSalt(7, 512).then((canvas) =>
        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            saltUrl = URL.createObjectURL(blob);
            saltListeners.forEach((l) => l());
          },
          "image/jpeg",
          0.85
        )
      );
    if ("requestIdleCallback" in window) window.requestIdleCallback(paint, { timeout: 3000 });
    else setTimeout(paint, 400);
  }
  return () => {
    saltListeners.delete(listener);
  };
}

export const getSaltUrl = () => saltUrl;

export interface SlabCanvases {
  salt: HTMLCanvasElement;
  bump: HTMLCanvasElement;
  frost: HTMLCanvasElement;
  glow: HTMLCanvasElement;
}

let slabCanvases: Promise<SlabCanvases> | null = null;

/** Paints the 3D slab's textures once, in small slices; start it early to overlap with the 3D download. */
export function paintSlabCanvases() {
  slabCanvases ??= (async () => {
    const salt = await paintSalt();
    const bump = await paintBump();
    const frost = await paintFrost();
    return { salt, bump, frost, glow: paintGlow() };
  })();
  return slabCanvases;
}
