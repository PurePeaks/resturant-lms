"use client";

import { use, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rng } from "../saltPaint";
import { GlowDisc, Particles, SLAB_H, SaltSlab, newSlabState } from "./slabKit";

// Food sits on the slab's top face.
const TOP = SLAB_H / 2;

// ─── Painted food textures (small canvases, painted once, in slices) ──────
type Paint = (ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number) => void;

function texture(w: number, h: number, seed: number, paint: Paint, repeat = false) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  paint(canvas.getContext("2d")!, w, h, rng(seed));
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function blobs(ctx: CanvasRenderingContext2D, r: () => number, w: number, h: number, n: number, colors: string[], min: number, max: number) {
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = min + r() * (max - min);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, colors[i % colors.length]);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

function specks(ctx: CanvasRenderingContext2D, r: () => number, w: number, h: number, n: number, colors: string[], size: number) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[i % colors.length];
    const s = 0.5 + r() * size;
    ctx.fillRect(r() * w, r() * h, s, s);
  }
}

function wavy(ctx: CanvasRenderingContext2D, r: () => number, x0: number, y0: number, x1: number, amp: number) {
  const steps = 6;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  let y = y0;
  for (let i = 1; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const ny = y + (r() - 0.5) * amp;
    ctx.quadraticCurveTo(x - (x1 - x0) / steps / 2, y + (r() - 0.5) * amp, x, ny);
    y = ny;
  }
  ctx.stroke();
}

// Arc-based so it also works on browsers without CanvasRenderingContext2D.roundRect (iOS < 16).
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number) {
  const r = Math.min(rad, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

/** Seared crust: deep brown with caramelised patches and char. */
const crust: Paint = (ctx, w, h, r) => {
  ctx.fillStyle = "#5e2c19";
  ctx.fillRect(0, 0, w, h);
  blobs(ctx, r, w, h, 30, ["rgba(150,82,40,0.55)", "rgba(40,18,10,0.5)", "rgba(185,110,55,0.35)"], 6, 28);
  specks(ctx, r, w, h, 900, ["rgba(20,8,4,0.6)", "rgba(210,140,80,0.4)"], 1.6);
};

/** Cut face of a sliced steak: crust rim, cooked ring, pink centre and fat marbling. */
const sliceFace =
  (marbling: number): Paint =>
  (ctx, w, h, r) => {
    crust(ctx, w, h, r);
    ctx.fillStyle = "#7c4232";
    roundRect(ctx, w * 0.05, h * 0.14, w * 0.9, h * 0.72, h * 0.14);
    const g = ctx.createLinearGradient(0, h * 0.24, 0, h * 0.76);
    g.addColorStop(0, "#a92f3d");
    g.addColorStop(0.5, "#cc4a5b");
    g.addColorStop(1, "#a92f3d");
    ctx.fillStyle = g;
    roundRect(ctx, w * 0.09, h * 0.24, w * 0.82, h * 0.52, h * 0.1);
    ctx.lineCap = "round";
    for (let i = 0; i < marbling; i++) {
      ctx.strokeStyle = `rgba(255,238,230,${0.35 + r() * 0.45})`;
      ctx.lineWidth = 0.8 + r() * 2.4;
      const x0 = w * (0.1 + r() * 0.5);
      wavy(ctx, r, x0, h * (0.28 + r() * 0.44), x0 + w * (0.15 + r() * 0.3), h * 0.08);
    }
    specks(ctx, r, w, h, 220, ["rgba(120,20,30,0.25)"], 1.2);
  };

/** Diver scallop, painted along the lathe profile: seared base, ivory sides, golden-brown top. */
const scallop: Paint = (ctx, w, h, r) => {
  // Canvas top = top centre of the scallop, bottom = underside.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#8f4718");
  g.addColorStop(0.14, "#b06a2c");
  g.addColorStop(0.24, "#cf9a5c");
  g.addColorStop(0.34, "#e9d2b1");
  g.addColorStop(0.66, "#e3c9a3");
  g.addColorStop(0.76, "#cfa775");
  g.addColorStop(1, "#a86a33");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(200,170,130,0.35)";
  for (let i = 0; i < 26; i++) {
    ctx.lineWidth = 0.6 + r();
    const x = r() * w;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.3);
    ctx.lineTo(x + (r() - 0.5) * 4, h * 0.72);
    ctx.stroke();
  }
  specks(ctx, r, w, h * 0.22, 160, ["rgba(70,30,10,0.45)", "rgba(230,170,90,0.4)"], 1.5);
};

/** Salmon flesh: coral orange with white fat lines. */
const salmon: Paint = (ctx, w, h, r) => {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#f58a5c");
  g.addColorStop(1, "#ee7448");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.lineCap = "round";
  for (let i = -4; i < 14; i++) {
    ctx.strokeStyle = `rgba(255,238,226,${0.55 + r() * 0.3})`;
    ctx.lineWidth = 2.5 + r() * 3;
    const x = i * w * 0.09;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + w * 0.22, h * 0.5, x + w * 0.05, h);
    ctx.stroke();
  }
  specks(ctx, r, w, h, 300, ["rgba(255,190,150,0.35)"], 1.5);
};

/** Pan-seared salmon top. */
const salmonCrust: Paint = (ctx, w, h, r) => {
  salmon(ctx, w, h, r);
  ctx.fillStyle = "rgba(160,80,30,0.7)";
  ctx.fillRect(0, 0, w, h);
  blobs(ctx, r, w, h, 26, ["rgba(225,140,70,0.6)", "rgba(80,35,12,0.5)"], 8, 30);
  specks(ctx, r, w, h, 500, ["rgba(40,16,6,0.5)"], 1.4);
};

/** Bluefin tuna: deep ruby with a faint grain. */
const tuna: Paint = (ctx, w, h, r) => {
  ctx.fillStyle = "#a8162e";
  ctx.fillRect(0, 0, w, h);
  ctx.lineCap = "round";
  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = `rgba(215,70,95,${0.15 + r() * 0.2})`;
    ctx.lineWidth = 1 + r() * 3;
    wavy(ctx, r, -10, r() * h, w + 10, h * 0.05);
  }
  specks(ctx, r, w, h, 300, ["rgba(90,0,15,0.3)", "rgba(240,120,140,0.2)"], 1.4);
};

/** Raw beef for carpaccio: dark crimson with fine marbling. */
const rawBeef: Paint = (ctx, w, h, r) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, "#b8303f");
  g.addColorStop(1, "#8a1726");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.lineCap = "round";
  for (let i = 0; i < 16; i++) {
    ctx.strokeStyle = `rgba(250,215,215,${0.2 + r() * 0.3})`;
    ctx.lineWidth = 0.6 + r() * 1.6;
    const x0 = r() * w * 0.6;
    wavy(ctx, r, x0, r() * h, x0 + w * (0.2 + r() * 0.4), h * 0.06);
  }
  specks(ctx, r, w, h, 500, ["rgba(70,0,10,0.25)"], 1.6);
};

/** Diced tuna tartare. */
const tartare: Paint = (ctx, w, h, r) => {
  ctx.fillStyle = "#8f1328";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 180; i++) {
    const s = 5 + r() * 7;
    const v = Math.floor(r() * 4);
    ctx.fillStyle = ["#b11d36", "#9c1730", "#c42f48", "#7d0f22"][v];
    ctx.fillRect(r() * w, r() * h, s, s);
    ctx.fillStyle = "rgba(255,200,210,0.25)";
    ctx.fillRect(r() * w, r() * h, 1.5, 1.5);
  }
};

/** Salami: dark red with fat inclusions, peppercorns and a darker rim. */
const salami: Paint = (ctx, w, h, r) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.38, w / 2, h / 2, w / 2);
  g.addColorStop(0, "#922536");
  g.addColorStop(1, "#4f1019");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * w * 0.4;
    ctx.fillStyle = `rgba(246,${210 + Math.floor(r() * 25)},${200 + Math.floor(r() * 20)},${0.75 + r() * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, 2 + r() * 6, 2 + r() * 4, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  specks(ctx, r, w, h, 40, ["rgba(20,10,10,0.85)"], 3);
};

/** Aged cheese with a few eyes. */
const cheese: Paint = (ctx, w, h, r) => {
  ctx.fillStyle = "#f0cf7d";
  ctx.fillRect(0, 0, w, h);
  blobs(ctx, r, w, h, 14, ["rgba(250,225,150,0.6)", "rgba(220,180,90,0.35)"], 20, 60);
  for (let i = 0; i < 12; i++) {
    const x = r() * w;
    const y = r() * h;
    const s = 3 + r() * 7;
    ctx.fillStyle = "rgba(196,150,60,0.75)";
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  specks(ctx, r, w, h, 400, ["rgba(255,245,210,0.4)", "rgba(190,150,70,0.25)"], 1.4);
};

interface FoodTextures {
  crust: THREE.Texture;
  ribeye: THREE.Texture;
  wagyu: THREE.Texture;
  scallop: THREE.Texture;
  salmon: THREE.Texture;
  salmonCrust: THREE.Texture;
  tuna: THREE.Texture;
  rawBeef: THREE.Texture;
  tartare: THREE.Texture;
  salami: THREE.Texture;
  cheese: THREE.Texture;
}

const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

let foodTextures: Promise<FoodTextures> | null = null;

/** Paints every food texture, one per task, so it never blocks scrolling. */
function loadFoodTextures() {
  foodTextures ??= (async () => {
    const jobs: [keyof FoodTextures, () => THREE.Texture][] = [
      ["crust", () => texture(128, 128, 1, crust, true)],
      ["ribeye", () => texture(256, 128, 2, sliceFace(10))],
      ["wagyu", () => texture(256, 128, 3, sliceFace(30))],
      ["scallop", () => texture(64, 256, 4, scallop)],
      ["salmon", () => texture(256, 256, 5, salmon, true)],
      ["salmonCrust", () => texture(128, 128, 6, salmonCrust)],
      ["tuna", () => texture(256, 256, 7, tuna)],
      ["rawBeef", () => texture(256, 256, 8, rawBeef)],
      ["tartare", () => texture(128, 128, 9, tartare, true)],
      ["salami", () => texture(256, 256, 10, salami)],
      ["cheese", () => texture(256, 256, 11, cheese, true)],
    ];
    const out = {} as FoodTextures;
    for (const [key, job] of jobs) {
      out[key] = job();
      await nextTask();
    }
    return out;
  })();
  return foodTextures;
}

function useFoodTextures() {
  return use(loadFoodTextures());
}

// ─── Small geometry helpers ───────────────────────────────────────────────
function leafGeometry(length: number, width: number) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(width, length * 0.2, width * 0.8, length * 0.75, 0, length);
  s.bezierCurveTo(-width * 0.8, length * 0.75, -width, length * 0.2, 0, 0);
  const g = new THREE.ShapeGeometry(s, 8);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** A thin disc with a gently irregular, hand-cut edge. */
function wobblyDisc(radius: number, thickness: number, seed: number) {
  const g = new THREE.CylinderGeometry(radius, radius, thickness, 40);
  const r = rng(seed);
  const p1 = r() * 6;
  const p2 = r() * 6;
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.hypot(x, z);
    if (d < 1e-4) continue;
    const a = Math.atan2(z, x);
    const k = 1 + 0.07 * Math.sin(a * 3 + p1) + 0.04 * Math.sin(a * 7 + p2);
    pos.setXYZ(i, x * k, pos.getY(i), z * k);
  }
  g.computeVertexNormals();
  return g;
}

function scallopGeometry() {
  const pts = [
    [0, 0],
    [0.19, 0],
    [0.24, 0.012],
    [0.26, 0.045],
    [0.262, 0.15],
    [0.25, 0.185],
    [0.22, 0.2],
    [0.001, 0.205],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 40);
}

const standard = (params: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(params);
const glossy = (params: THREE.MeshPhysicalMaterialParameters) =>
  new THREE.MeshPhysicalMaterial({ clearcoat: 0.5, clearcoatRoughness: 0.3, ...params });

/** Disposes every geometry and material in a bag of three.js objects when the dish unmounts. */
function useDisposal(bag: Record<string, unknown>) {
  useEffect(
    () => () => {
      for (const value of Object.values(bag)) {
        const items = Array.isArray(value) ? value : [value];
        for (const item of items) {
          if (item instanceof THREE.BufferGeometry || item instanceof THREE.Material) item.dispose();
        }
      }
    },
    [bag]
  );
}

// ─── Instancing: every repeated piece is one draw call ────────────────────
/** x, y, z, then optional rotation (rx, ry, rz) and scale (sx, sy = sx, sz = sx). */
type Placement = readonly number[];

function Instances({
  geometry,
  material,
  at,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  at: readonly Placement[];
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new THREE.Object3D();
    at.forEach(([x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx], i) => {
      o.position.set(x, y, z);
      o.rotation.set(rx, ry, rz);
      o.scale.set(sx, sy, sz);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [at]);
  return <instancedMesh ref={mesh} args={[geometry, material, at.length]} />;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// ─── Layouts (slab-top coordinates; the slab spans x ±1.8, z ±1.2) ───────
const STEAK_SLICE = (i: number): Placement => [-0.35 + Math.sin(i * 1.7) * 0.12, 0.05, -0.95 + i * 0.38, 0, Math.sin(i * 2.3) * 0.05, 0];
const RIBEYE = [0, 1, 4, 5].map(STEAK_SLICE);
const WAGYU = [2, 3].map(STEAK_SLICE);
const NEEDLES = range(16).map((i): Placement => [-0.42 + i * 0.055, 0.01, 0, i % 2 ? 0.9 : -0.9, 0, Math.PI / 2 + (i % 2 ? 0.5 : -0.5)]);
const FLAKES: Placement[] = [
  [1.0, 0.03, -0.55, 0, 0, 0],
  [1.35, 0.03, -0.25, 1, 2, 0],
  [0.95, 0.03, 0.75, 2, 4, 0],
];

const SCALLOPS: Placement[] = [
  [-1.2, 0, -0.35, 0, 0.2, 0, 1.15],
  [-0.55, 0, -0.6, 0, 1.1, 0, 1.15],
  [-0.75, 0, 0.3, 0, 2.3, 0, 1.15],
  [-1.35, 0, 0.55, 0, 0.7, 0, 1.15],
];
const GREENS = range(5).map((i): Placement => [-0.2 + (i % 3) * 0.12, 0.02 + i * 0.004, 0.65 + (i % 2) * 0.1, 0.2, i * 1.3, 0]);

const SCATTER = (() => {
  const r = rng(42);
  return range(24).map(() => [(r() - 0.5) * 1.6, (r() - 0.5) * 1.3, r() * Math.PI * 2] as const);
})();
const CARPACCIO = range(8).map((i): Placement => {
  const a = (i / 7) * Math.PI * 2;
  const ring = i === 7 ? 0 : 0.66;
  // One hand-cut shape, turned differently for each slice.
  return [Math.cos(a) * ring * 1.15, 0.008 + i * 0.003, Math.sin(a) * ring, 0, a + i * 0.9, 0];
});
const ARUGULA = SCATTER.slice(0, 7).map(([x, z, a], i): Placement => [x * 0.35, 0.05 + i * 0.006, z * 0.35, 0.25, a, 0]);
const SHAVINGS = SCATTER.slice(7, 15).map(([x, z, a]): Placement => [x, 0.045, z, 0.1, a, 0.05]);
const CAPERS = SCATTER.slice(15, 20).map(([x, z]): Placement => [x * 0.9, 0.05, z * 0.9]);
const OIL = SCATTER.slice(20).map(([x, z]): Placement => [x * 0.7, 0.04, z * 0.8, 0, 0, 0, 1.4, 0.3, 1]);

const TUNA = range(4).map((i): Placement => [-1.35 + i * 0.36, 0.04, -0.45, 0, Math.PI / 2 + 0.12, 0]);
const SALMON_SLICES = range(3).map((i): Placement => [-1.2 + i * 0.36, 0.04, 0.35, 0, Math.PI / 2 - 0.1, 0]);
const CHIVES = range(4).map((i): Placement => [-0.1 + i * 0.07, 0.31, 0.1 - i * 0.05, Math.PI / 2, 0, i * 0.8]);
const SEEDS = range(6).map((i): Placement => [Math.cos(i) * 0.24, 0.305, Math.sin(i) * 0.24, 0, 0, 0, 1.4, 0.7, 0.9]);
const GINGER = range(3).map((i): Placement => [1.1 + i * 0.08, 0.03 + i * 0.012, 0.65, 0.15, 0.6 + i * 0.5, 0]);

const WEDGE_SPOTS = [
  [-1.55, -0.45, 0.35],
  [-1.4, 0.5, -0.6],
] as const;
const WEDGES = WEDGE_SPOTS.map(([x, z, ry]): Placement => [x, 0, z, 0, ry, 0]);
// Each rind sits on its wedge's wide end, 0.965 along the wedge's local x axis.
const RINDS = WEDGE_SPOTS.map(([x, z, ry]): Placement => [x + Math.cos(ry) * 0.965, 0.15, z - Math.sin(ry) * 0.965, 0, ry, 0]);
const SALAMI = range(6).map((i): Placement => {
  const a = -0.9 + i * 0.36;
  return [0.3 + Math.cos(a) * 0.38, 0.0125 + i * 0.026, Math.sin(a) * 0.38, 0.06, 0, -0.04];
});
const CUBES: Placement[] = [
  [-0.35, 0.1, 0.75, 0, 0, 0],
  [-0.1, 0.1, 0.85, 0, 0.7, 0],
  [-0.25, 0.1, 0.55, 0, 1.4, 0],
];
const GRAPES = (() => {
  const r = rng(77);
  return range(11).map((i): Placement => [1.3 + (r() - 0.5) * 0.45, 0.1 + (i > 7 ? 0.15 : 0), -0.55 + (r() - 0.5) * 0.55]);
})();
const OLIVES: Placement[] = [
  [1.15, 0.08, 0.65, 0, 0, 0, 1, 0.8, 1.3],
  [1.4, 0.08, 0.45, 0, 1, 0, 1, 0.8, 1.3],
  [1.25, 0.08, 0.9, 0, 2, 0, 1, 0.8, 1.3],
];

// ─── The five dishes ──────────────────────────────────────────────────────
function Ribeye() {
  const tex = useFoodTextures();
  const kit = useMemo(() => {
    const crustMat = standard({ map: tex.crust, roughness: 0.55 });
    return {
      slice: new RoundedBoxGeometry(1.15, 0.1, 0.36, 2, 0.03),
      ribeye: [crustMat, crustMat, glossy({ map: tex.ribeye, roughness: 0.5 }), crustMat, crustMat, crustMat],
      wagyu: [crustMat, crustMat, glossy({ map: tex.wagyu, roughness: 0.45 }), crustMat, crustMat, crustMat],
      stem: new THREE.CylinderGeometry(0.014, 0.012, 1, 8),
      needle: new THREE.CylinderGeometry(0.008, 0.004, 0.16, 5),
      herb: standard({ color: "#3d6b33", roughness: 0.7 }),
      flake: new THREE.OctahedronGeometry(0.05, 0),
      salt: glossy({ color: "#fff4ef", roughness: 0.25 }),
    };
  }, [tex]);
  useDisposal(kit);

  return (
    <group position={[0, TOP, 0]}>
      {/* Six slices laid out cut-side up, the middle two extra-marbled wagyu */}
      <Instances geometry={kit.slice} material={kit.ribeye} at={RIBEYE} />
      <Instances geometry={kit.slice} material={kit.wagyu} at={WAGYU} />
      {/* Rosemary sprig */}
      <group position={[1.2, 0.03, 0.25]} rotation={[0, 0.6, 0]}>
        <mesh geometry={kit.stem} material={kit.herb} rotation={[0, 0, Math.PI / 2]} />
        <Instances geometry={kit.needle} material={kit.herb} at={NEEDLES} />
      </group>
      <Instances geometry={kit.flake} material={kit.salt} at={FLAKES} />
    </group>
  );
}

function ScallopsSalmon() {
  const tex = useFoodTextures();
  const kit = useMemo(() => {
    const flesh = glossy({ map: tex.salmon, roughness: 0.45 });
    return {
      scallop: scallopGeometry(),
      scallopMat: glossy({ map: tex.scallop, roughness: 0.45, clearcoat: 0.35 }),
      fillet: new RoundedBoxGeometry(1.15, 0.26, 0.55, 3, 0.07),
      filletMats: [flesh, flesh, standard({ map: tex.salmonCrust, roughness: 0.5 }), flesh, flesh, flesh],
      leaf: leafGeometry(0.16, 0.07),
      greens: standard({ color: "#5d9a3a", roughness: 0.6, side: THREE.DoubleSide }),
    };
  }, [tex]);
  useDisposal(kit);

  return (
    <group position={[0, TOP, 0]}>
      <Instances geometry={kit.scallop} material={kit.scallopMat} at={SCALLOPS} />
      <mesh geometry={kit.fillet} material={kit.filletMats} position={[0.75, 0.13, 0.05]} rotation={[0, 0.25, 0]} />
      <Instances geometry={kit.leaf} material={kit.greens} at={GREENS} />
    </group>
  );
}

function Carpaccio() {
  const tex = useFoodTextures();
  const kit = useMemo(
    () => ({
      slice: wobblyDisc(0.5, 0.012, 20),
      beef: glossy({ map: tex.rawBeef, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.15 }),
      leaf: leafGeometry(0.28, 0.1),
      arugula: standard({ color: "#3f7d2b", roughness: 0.55, side: THREE.DoubleSide }),
      shaving: new RoundedBoxGeometry(0.2, 0.012, 0.1, 1, 0.004),
      parmesan: standard({ color: "#f1e2b4", roughness: 0.7 }),
      caper: new THREE.SphereGeometry(0.035, 12, 8),
      caperMat: standard({ color: "#55652a", roughness: 0.5 }),
      drop: new THREE.SphereGeometry(0.03, 12, 8),
      oil: glossy({ color: "#c9b33a", roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.8 }),
    }),
    [tex]
  );
  useDisposal(kit);

  return (
    <group position={[0, TOP, 0]}>
      <Instances geometry={kit.slice} material={kit.beef} at={CARPACCIO} />
      <Instances geometry={kit.leaf} material={kit.arugula} at={ARUGULA} />
      <Instances geometry={kit.shaving} material={kit.parmesan} at={SHAVINGS} />
      <Instances geometry={kit.caper} material={kit.caperMat} at={CAPERS} />
      <Instances geometry={kit.drop} material={kit.oil} at={OIL} />
    </group>
  );
}

function SashimiTartare() {
  const tex = useFoodTextures();
  const kit = useMemo(() => {
    const tartare = standard({ map: tex.tartare, roughness: 0.4 });
    return {
      slice: new RoundedBoxGeometry(0.7, 0.08, 0.3, 2, 0.03),
      tuna: glossy({ map: tex.tuna, roughness: 0.35, clearcoat: 0.6 }),
      salmon: glossy({ map: tex.salmon, roughness: 0.35, clearcoat: 0.6 }),
      tower: new THREE.CylinderGeometry(0.36, 0.38, 0.3, 40),
      tartare: [tartare, tartare, tartare],
      yolk: new THREE.SphereGeometry(0.11, 24, 16),
      yolkMat: glossy({ color: "#f59a1b", roughness: 0.1, clearcoat: 1 }),
      chive: new THREE.CylinderGeometry(0.008, 0.008, 0.26, 6),
      chiveMat: standard({ color: "#3e8a2c", roughness: 0.5 }),
      seed: new THREE.SphereGeometry(0.016, 8, 6),
      seedMat: standard({ color: "#f3ead6", roughness: 0.6 }),
      wasabi: new THREE.SphereGeometry(0.13, 20, 14),
      wasabiMat: standard({ color: "#8cb84d", roughness: 0.85 }),
      petal: leafGeometry(0.22, 0.12),
      ginger: glossy({ color: "#f4b9b2", roughness: 0.3, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    };
  }, [tex]);
  useDisposal(kit);

  return (
    <group position={[0, TOP, 0]}>
      <Instances geometry={kit.slice} material={kit.tuna} at={TUNA} />
      <Instances geometry={kit.slice} material={kit.salmon} at={SALMON_SLICES} />
      <group position={[0.85, 0, -0.15]}>
        <mesh geometry={kit.tower} material={kit.tartare} position={[0, 0.15, 0]} />
        <mesh geometry={kit.yolk} material={kit.yolkMat} position={[0, 0.33, 0]} scale={[1, 0.6, 1]} />
        <Instances geometry={kit.chive} material={kit.chiveMat} at={CHIVES} />
        <Instances geometry={kit.seed} material={kit.seedMat} at={SEEDS} />
      </group>
      <mesh geometry={kit.wasabi} material={kit.wasabiMat} position={[0.25, 0.06, 0.7]} scale={[1, 0.55, 1]} />
      <Instances geometry={kit.petal} material={kit.ginger} at={GINGER} />
    </group>
  );
}

function CheeseBoard() {
  const tex = useFoodTextures();
  const kit = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.95, -0.33);
    shape.lineTo(0.95, 0.33);
    shape.closePath();
    const wedge = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 });
    wedge.rotateX(-Math.PI / 2);
    const salamiFace = standard({ map: tex.salami, roughness: 0.5 });
    return {
      wedge,
      cheeseMat: standard({ map: tex.cheese, roughness: 0.6 }),
      rind: new RoundedBoxGeometry(0.035, 0.3, 0.68, 1, 0.01),
      rindMat: standard({ color: "#c79a3c", roughness: 0.7 }),
      cube: new RoundedBoxGeometry(0.2, 0.2, 0.2, 2, 0.02),
      salami: new THREE.CylinderGeometry(0.27, 0.27, 0.025, 36),
      salamiMats: [standard({ color: "#5a1a20", roughness: 0.6 }), salamiFace, salamiFace],
      grape: new THREE.SphereGeometry(0.11, 20, 14),
      grapeMat: glossy({ color: "#4e2153", roughness: 0.3, clearcoat: 0.8 }),
      olive: new THREE.SphereGeometry(0.09, 16, 12),
      oliveMat: glossy({ color: "#6f7f2c", roughness: 0.3, clearcoat: 0.7 }),
    };
  }, [tex]);
  useDisposal(kit);

  return (
    <group position={[0, TOP, 0]}>
      <Instances geometry={kit.wedge} material={kit.cheeseMat} at={WEDGES} />
      <Instances geometry={kit.rind} material={kit.rindMat} at={RINDS} />
      <Instances geometry={kit.salami} material={kit.salamiMats} at={SALAMI} />
      <Instances geometry={kit.cube} material={kit.cheeseMat} at={CUBES} />
      <Instances geometry={kit.grape} material={kit.grapeMat} at={GRAPES} />
      <Instances geometry={kit.olive} material={kit.oliveMat} at={OLIVES} />
    </group>
  );
}

// ─── A dish on its slab, with heat or chill around it ─────────────────────
export const DISH_TONES = ["hot", "hot", "cold", "cold", "cold"] as const;
const FOODS = [Ribeye, ScallopsSalmon, Carpaccio, SashimiTartare, CheeseBoard];

export function DishLights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 7, 5]} intensity={1.8} />
      <pointLight position={[-4, 2.5, -3]} color="#ff7aa8" intensity={22} distance={18} />
      <pointLight position={[4, 2, -3]} color="#ffc070" intensity={18} distance={18} />
    </>
  );
}

export function Dish({ index, calm }: { index: number; calm: boolean }) {
  const hot = DISH_TONES[index] === "hot";
  const slab = useRef({ ...newSlabState(), heat: hot ? 0.45 : 0, frost: hot ? 0 : 0.3 });
  const glow = useRef(hot ? 0.7 : 0);
  const embers = useRef(hot ? 0.85 : 0);
  const sparkle = useRef(hot ? 0 : 0.6);
  const sway = useRef<THREE.Group>(null);
  const Food = FOODS[index];

  useFrame(({ clock }) => {
    const g = sway.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.rotation.y = -0.35 + (calm ? 0 : Math.sin(t * 0.35 + index * 1.7) * 0.32);
    g.position.y = calm ? 0 : Math.sin(t * 0.8 + index) * 0.04;
  });

  return (
    <>
      <DishLights />
      <group ref={sway}>
        <SaltSlab state={slab} />
        <Food />
        {hot && <GlowDisc level={glow} color="#ff5a1f" size={5.5} y={-0.36} strength={0.75} />}
      </group>
      {hot ? (
        <Particles count={70} level={embers} mode="rise" color="#ffae42" size={0.1} spread={1.5} height={2.4} base={TOP} seed={30 + index} />
      ) : (
        <Particles count={60} level={sparkle} mode="drift" color="#d6ecff" size={0.06} spread={2.4} height={2.2} base={-0.4} seed={40 + index} />
      )}
    </>
  );
}
