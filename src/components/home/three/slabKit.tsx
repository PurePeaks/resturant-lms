"use client";

import { use, useEffect, useMemo, useRef } from "react";
import type { Ref, RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { paintSlabCanvases, rng } from "../saltPaint";

// ─── Timeline helpers ─────────────────────────────────────────────────────
export type Keys = ReadonlyArray<readonly [number, number]>;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/** Piecewise keyframes with smoothstep easing between each pair. */
export function track(p: number, keys: Keys) {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [p1, v1] = keys[i];
    if (p <= p1) {
      const [p0, v0] = keys[i - 1];
      return v0 + (v1 - v0) * smoothstep(p0, p1, p);
    }
  }
  return keys[keys.length - 1][1];
}

// ─── Textures (painted once, shared by every canvas on the page) ──────────
interface SlabTextures {
  salt: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
  frost: THREE.CanvasTexture;
  glow: THREE.CanvasTexture;
}

let textures: Promise<SlabTextures> | null = null;

function loadSlabTextures(): Promise<SlabTextures> {
  textures ??= paintSlabCanvases().then((c) => {
    const salt = new THREE.CanvasTexture(c.salt);
    salt.colorSpace = THREE.SRGBColorSpace;
    salt.wrapS = salt.wrapT = THREE.RepeatWrapping;
    salt.anisotropy = 8;
    const bump = new THREE.CanvasTexture(c.bump);
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    const frost = new THREE.CanvasTexture(c.frost);
    frost.colorSpace = THREE.SRGBColorSpace;
    return { salt, bump, frost, glow: new THREE.CanvasTexture(c.glow) };
  });
  return textures;
}

/** The shared slab textures; suspends (wrap in <Suspense>) until they're painted. */
export function useSlabTextures(): SlabTextures {
  return use(loadSlabTextures());
}

// ─── The slab: a rectangular block that splits into four mineral strata ──
export const SLAB_W = 3.6; // long side
export const SLAB_D = 2.4; // short side
export const SLAB_H = 0.6;
export const SLAB_LAYERS = 4;
const LAYER_H = SLAB_H / SLAB_LAYERS;

/** Corner radius of the slab seen from above, like the softly rounded real slabs. */
const SLAB_CORNER = 0.38;

/**
 * A slab with rounded corners in plan and softly bevelled top and bottom edges,
 * smooth-shaded and box-projected so the salt texture isn't stretched.
 */
function roundedSlabGeometry(w: number, h: number, d: number, corner: number, bevel: number) {
  const hw = w / 2 - bevel;
  const hd = d / 2 - bevel;
  const r = Math.min(corner, hw, hd);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(hw, hd - r);
  shape.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-hw + r, hd);
  shape.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hw, -hd + r);
  shape.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5, false);

  const depth = h - bevel * 2;
  const extruded = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 10,
  });
  // Lie flat (extrusion along +y), centred on the origin.
  extruded.rotateX(-Math.PI / 2);
  extruded.translate(0, -depth / 2, 0);

  // Weld the seams so the rounded corners shade smoothly instead of in facets.
  extruded.deleteAttribute("normal");
  extruded.deleteAttribute("uv");
  const geometry = mergeVertices(extruded);
  extruded.dispose();
  geometry.computeVertexNormals();

  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i) / w + 0.5;
    const y = pos.getY(i) / h + 0.5;
    const z = pos.getZ(i) / d + 0.5;
    if (ny >= nx && ny >= nz) uv.set([x, z], i * 2);
    else if (nx > nz) uv.set([z, y], i * 2);
    else uv.set([x, y], i * 2);
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}

let slabGeometries: { body: THREE.BufferGeometry; layer: THREE.BufferGeometry; frost: THREE.BufferGeometry } | null = null;

/** Built once and shared by every slab on the page (they're identical). */
function getSlabGeometries() {
  slabGeometries ??= {
    body: roundedSlabGeometry(SLAB_W, SLAB_H, SLAB_D, SLAB_CORNER, 0.08),
    layer: roundedSlabGeometry(SLAB_W, LAYER_H, SLAB_D, SLAB_CORNER, 0.03),
    frost: roundedSlabGeometry(SLAB_W + 0.03, SLAB_H + 0.03, SLAB_D + 0.03, SLAB_CORNER + 0.015, 0.09),
  };
  return slabGeometries;
}

/**
 * Renderer setup shared by every canvas. Shader error checks read back driver
 * logs on each shader's first use, which stalls; three.js recommends turning
 * them off in production, so they stay on in development only.
 */
export function tuneRenderer({ gl }: { gl: THREE.WebGLRenderer }) {
  gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
  // Ask the GPU its anisotropy limit now, while it's idle: three.js caches the
  // answer, and asking later (on the first texture upload) waits for all queued GPU work.
  gl.capabilities.getMaxAnisotropy();
}

/** Local y of stratum `i` (0 = top) for a given separation. */
export const layerY = (i: number, gap: number) => ((SLAB_LAYERS - 1) / 2 - i) * (LAYER_H + gap);

export interface SlabState {
  gap: number; // exploded-view separation between strata
  heat: number; // 0–1 ember glow
  frost: number; // 0–1 frost coat
  thickness: number; // 1 = a full slab
  pulse: number; // momentary sizzle flash
}

export const newSlabState = (): SlabState => ({ gap: 0, heat: 0, frost: 0, thickness: 1, pulse: 0 });

// Index 0 is the solid body; 1–4 are the strata, top to bottom.
const TINTS = ["#fff7f3", "#fff7f3", "#ffefe9", "#ffe6de", "#fff2ed"].map((c) => new THREE.Color(c));
const HEAT_GAIN = [1.3, 0.55, 1.1, 1.65, 2.2];
const ICE = new THREE.Color("#d4e9ff");
const EMBER = new THREE.Color("#ff8a5c");

function saltMaterial(tex: SlabTextures, tint: THREE.Color, i: number) {
  // Quarter-turns give each stratum its own pattern without tiling seams.
  const map = tex.salt.clone();
  map.center.set(0.5, 0.5);
  map.rotation = (i * Math.PI) / 2;
  // Matte, sugary crystal rather than polished stone.
  return new THREE.MeshPhysicalMaterial({
    map,
    color: tint.clone(),
    roughness: 0.62,
    bumpMap: tex.bump,
    bumpScale: 2.2,
    clearcoat: 0.18,
    clearcoatRoughness: 0.55,
    sheen: 0.45,
    sheenColor: new THREE.Color("#fff0ea"),
    sheenRoughness: 0.6,
    emissive: new THREE.Color("#ff5a1f"),
    emissiveMap: map,
    emissiveIntensity: 0,
  });
}

export function SaltSlab({ state }: { state: RefObject<SlabState> }) {
  const tex = useSlabTextures();
  const geometries = getSlabGeometries();
  const materials = useMemo(() => TINTS.map((tint, i) => saltMaterial(tex, tint, i)), [tex]);
  const frostMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex.frost,
        transparent: true,
        opacity: 0,
        roughness: 0.9,
        depthWrite: false,
      }),
    [tex]
  );

  useEffect(
    () => () => {
      materials.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
      frostMaterial.dispose();
    },
    [materials, frostMaterial]
  );

  const root = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const frost = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const s = state.current;
    const g = root.current;
    if (!g) return;
    // Thin from the top down so the slab stays seated on whatever is below it.
    g.scale.y = s.thickness;
    g.position.y = (-(1 - s.thickness) * SLAB_H) / 2;
    // A seamless block until the strata start to separate.
    const split = s.gap > 0.002;
    meshes.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.visible = i === 0 ? !split : split;
      if (i > 0) mesh.position.y = layerY(i - 1, s.gap);
      const m = mesh.material as THREE.MeshPhysicalMaterial;
      // Heat rises from below, so the bottom strata glow hottest.
      m.emissiveIntensity = s.heat * HEAT_GAIN[i] + s.pulse;
      m.color.copy(TINTS[i]).lerp(EMBER, s.heat * 0.45).lerp(ICE, s.frost * 0.8);
      m.roughness = 0.62 + s.frost * 0.3;
    });
    const f = frost.current;
    if (f) {
      f.visible = s.frost > 0.005;
      (f.material as THREE.MeshStandardMaterial).opacity = s.frost;
    }
  });

  return (
    <group ref={root}>
      {materials.map((m, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          geometry={i === 0 ? geometries.body : geometries.layer}
          material={m}
          visible={i === 0}
        />
      ))}
      <mesh ref={frost} geometry={geometries.frost} material={frostMaterial} renderOrder={2} />
    </group>
  );
}

// ─── Brushed-steel ring holder with its handle tab ────────────────────────
const RING_R = 1.05;
const RING_BAND = 0.11;
const RING_H = 0.09;
/** Seat height: group y that puts the ring top flush under a centred slab. */
export const RING_SEAT_Y = -SLAB_H / 2 - RING_H / 2 - 0.012;

const steel = () => new THREE.MeshStandardMaterial({ color: "#d9dce0", metalness: 1, roughness: 0.3 });

export function SteelRing({ groupRef }: { groupRef?: Ref<THREE.Group> }) {
  const parts = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, RING_R, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, RING_R - RING_BAND, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const band = new THREE.ExtrudeGeometry(shape, {
      depth: RING_H,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 3,
      curveSegments: 128,
    });
    // Lay the band flat, centred on y = 0.
    band.rotateX(-Math.PI / 2);
    band.translate(0, -RING_H / 2, 0);
    return { band, tab: new RoundedBoxGeometry(0.2, RING_H * 0.9, 0.3, 2, 0.02), material: steel() };
  }, []);

  useEffect(
    () => () => {
      parts.band.dispose();
      parts.tab.dispose();
      parts.material.dispose();
    },
    [parts]
  );

  return (
    <group ref={groupRef}>
      <mesh geometry={parts.band} material={parts.material} />
      <mesh geometry={parts.tab} material={parts.material} position={[RING_R + 0.07, 0, 0]} />
    </group>
  );
}

/** The steel clip that wraps one edge of the serving platter. */
export function PlatterClip({ groupRef }: { groupRef?: Ref<THREE.Group> }) {
  const parts = useMemo(
    () => ({
      top: new RoundedBoxGeometry(0.5, 0.025, 0.34, 2, 0.01),
      side: new RoundedBoxGeometry(0.5, 0.34, 0.025, 2, 0.01),
      material: steel(),
    }),
    []
  );

  useEffect(
    () => () => {
      parts.top.dispose();
      parts.side.dispose();
      parts.material.dispose();
    },
    [parts]
  );

  return (
    <group ref={groupRef} position={[SLAB_W / 2 - 0.55, SLAB_H / 2, -SLAB_D / 2]}>
      <mesh geometry={parts.top} material={parts.material} position={[0, 0.013, 0.16]} />
      <mesh geometry={parts.side} material={parts.material} position={[0, -0.16, -0.013]} />
    </group>
  );
}

// ─── Additive glow card (heat bloom under the slab) ───────────────────────
export function GlowDisc({
  level,
  color,
  size,
  y,
  strength = 1,
}: {
  level: RefObject<number>;
  color: string;
  size: number;
  y: number;
  strength?: number;
}) {
  const tex = useSlabTextures();
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex.glow,
        color,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      }),
    [tex, color]
  );
  useEffect(() => () => material.dispose(), [material]);
  const mesh = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const v = level.current;
    m.visible = v > 0.01;
    (m.material as THREE.MeshBasicMaterial).opacity = v * strength;
  });

  return (
    <mesh ref={mesh} material={material} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}

// ─── Point-sprite particles: embers rise, snow falls, dust drifts ─────────
// Animated entirely in the vertex shader, so there's no per-frame JavaScript
// or buffer upload; the motion maths matches the original CPU version.
const PARTICLE_MODES = { rise: 0, fall: 1, drift: 2 } as const;

const PARTICLE_VERTEX = /* glsl */ `
  attribute vec4 seed; // x, z, phase, speed
  uniform float uTime;
  uniform float uHeight;
  uniform float uBase;
  uniform float uSize;
  uniform float uScale;
  varying float vFade;

  void main() {
    float ph = seed.z;
    float life = fract(ph + uTime * seed.w);
    vec3 p = vec3(seed.x, 0.0, seed.y);
    #if MODE == 0
      p.y = uBase + life * uHeight;
      p.x += sin(uTime * 1.7 + ph * 20.0) * 0.14 * life;
      p.z += cos(uTime * 1.3 + ph * 14.0) * 0.14 * life;
      vFade = sin(life * 3.14159265);
    #elif MODE == 1
      p.y = uBase + uHeight - life * uHeight;
      p.x += sin(uTime * 0.6 + ph * 30.0) * 0.25;
      vFade = sin(life * 3.14159265);
    #else
      p.y = uBase + fract(ph * 7.3) * uHeight + sin(uTime * 0.5 + ph * 40.0) * 0.25;
      p.x += sin(uTime * 0.3 + ph * 9.0) * 0.3;
      p.z += cos(uTime * 0.25 + ph * 5.0) * 0.3;
      vFade = 0.5 + 0.5 * sin(uTime * 2.0 + ph * 50.0);
    #endif
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const PARTICLE_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uLevel;
  varying float vFade;

  void main() {
    float a = texture2D(uMap, gl_PointCoord).a;
    gl_FragColor = vec4(uColor * vFade * uLevel, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

interface ParticleProps {
  count: number;
  level: RefObject<number>;
  mode: keyof typeof PARTICLE_MODES;
  color: string;
  size: number;
  spread: number;
  height: number;
  base?: number;
  seed?: number;
  speed?: number;
}

export function Particles({ count, level, mode, color, size, spread, height, base = 0, seed = 1, speed = 1 }: ParticleProps) {
  const tex = useSlabTextures();
  const geometry = useMemo(() => {
    const r = rng(seed);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * spread;
      seeds.set([Math.cos(a) * d, Math.sin(a) * d, r(), 0.12 + r() * 0.3], i * 4);
    }
    const g = new THREE.BufferGeometry();
    // three needs a position attribute to know the draw count; the shader ignores it.
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seeds, 4));
    return g;
  }, [count, spread, seed]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        defines: { MODE: PARTICLE_MODES[mode] },
        uniforms: {
          uTime: { value: 0 },
          uHeight: { value: height },
          uBase: { value: base },
          uSize: { value: size },
          uScale: { value: 1 },
          uLevel: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uMap: { value: tex.glow },
        },
        vertexShader: PARTICLE_VERTEX,
        fragmentShader: PARTICLE_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [mode, height, base, size, color, tex]
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  const points = useRef<THREE.Points>(null);

  useFrame(({ clock, size: view, viewport }) => {
    const pts = points.current;
    if (!pts) return;
    const lv = level.current;
    pts.visible = lv > 0.01;
    if (!pts.visible) return;
    const u = (pts.material as THREE.ShaderMaterial).uniforms;
    u.uTime.value = clock.elapsedTime * speed;
    u.uLevel.value = lv;
    // Same sizing as PointsMaterial: size × pixel ratio × (half the view height / depth).
    u.uSize.value = size * viewport.dpr;
    u.uScale.value = view.height * 0.5;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

// ─── Shatter: the spent slab bursts into finishing-salt crystals ──────────
export function CrystalBurst({ amount, count = 130, originY = 0 }: { amount: RefObject<number>; count?: number; originY?: number }) {
  const tex = useSlabTextures();
  const geometry = useMemo(() => new THREE.OctahedronGeometry(0.1, 0), []);
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: tex.salt,
        color: "#ffe3dc",
        roughness: 0.3,
        clearcoat: 0.8,
        sheen: 0.5,
        sheenColor: new THREE.Color("#ffc2b8"),
        flatShading: true,
      }),
    [tex]
  );
  const crystals = useMemo(() => {
    const r = rng(3);
    return Array.from({ length: count }, () => {
      const x = (r() - 0.5) * SLAB_W * 0.9;
      const z = (r() - 0.5) * SLAB_D * 0.9;
      const len = Math.hypot(x, z) || 1;
      const out = 0.6 + r() * 1.2;
      return {
        x,
        y: originY + (r() - 0.5) * 0.3,
        z,
        vx: (x / len) * out + (r() - 0.5) * 0.4,
        vy: 0.8 + r() * 1.5,
        vz: (z / len) * out + (r() - 0.5) * 0.4,
        rx: r() * Math.PI,
        ry: r() * Math.PI,
        spin: 2 + r() * 6,
        s: 0.4 + r() * 0.8,
      };
    });
  }, [count, originY]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const e = amount.current;
    m.visible = e > 0.001;
    if (!m.visible) return;
    const pop = Math.min(1, e * 12);
    crystals.forEach((c, i) => {
      dummy.position.set(c.x + c.vx * e * 2.4, c.y + c.vy * e * 2.2 - 5.5 * e * e, c.z + c.vz * e * 2.4);
      dummy.rotation.set(c.rx + e * c.spin, c.ry + e * c.spin * 0.7, 0);
      dummy.scale.setScalar(c.s * pop);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />;
}

// ─── Warm-up: no shader compiles or texture uploads mid-scroll ────────────
/**
 * Uploads every texture and compiles every material in the scene (hidden
 * effects included) before the canvas starts rendering, then calls `onReady`.
 * Mount it last inside <Canvas> so the lights and environment already exist.
 */
export function WarmUp({ onReady }: { onReady: () => void }) {
  const get = useThree((s) => s.get);
  const done = useRef(onReady);

  useEffect(() => {
    done.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      done.current();
    };
    const { gl, scene, camera } = get();
    const textures = new Set<THREE.Texture>();
    scene.traverse((object) => {
      const material = (object as THREE.Mesh).material;
      if (!material) return;
      for (const m of Array.isArray(material) ? material : [material]) {
        for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value);
        const uniforms = (m as THREE.ShaderMaterial).uniforms;
        if (uniforms) for (const u of Object.values(uniforms)) if (u.value instanceof THREE.Texture) textures.add(u.value);
      }
    });
    textures.forEach((t) => gl.initTexture(t));
    gl.compileAsync(scene, camera).then(finish, finish);
    // Never leave the scene hidden if a driver misreports compile status.
    const fallback = setTimeout(finish, 4000);
    return () => {
      finished = true;
      clearTimeout(fallback);
    };
  }, [get]);

  return null;
}

// ─── Studio lighting: soft-box reflections plus rose and gold rim lights ──
export function StudioLights({ envIntensity = 0.65, onReady }: { envIntensity?: number; onReady?: () => void }) {
  const get = useThree((s) => s.get);
  const done = useRef(onReady);

  useEffect(() => {
    done.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const { gl, scene } = get();
    let cancelled = false;
    let pmrem: THREE.PMREMGenerator | null = null;
    let env: THREE.Texture | null = null;
    const room = new RoomEnvironment();
    // Compile the room's materials in the background first, under the same
    // render-target settings the cube capture uses, so the capture doesn't stall on them.
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    const previous = gl.getRenderTarget();
    gl.setRenderTarget(target);
    const compiled = gl.compileAsync(room, new THREE.PerspectiveCamera(90, 1, 0.1, 100));
    gl.setRenderTarget(previous);
    // The generator's own filtering shaders are created and used in one go,
    // so let it build them in a dry run that draws nothing, then compile them
    // in the background too. Private API: if it ever changes, this is skipped.
    pmrem = new THREE.PMREMGenerator(gl);
    const internal = pmrem as unknown as {
      _renderCube?: (...args: unknown[]) => void;
      _boxMesh?: THREE.Mesh;
      _ggxMaterial?: THREE.Material | null;
      _integrationMaterial?: THREE.Material | null;
    };
    const filters: Promise<unknown>[] = [];
    if (typeof internal._renderCube === "function" && internal._boxMesh) {
      const renderCube = internal._renderCube;
      internal._renderCube = () => {};
      pmrem.fromScene(new THREE.Scene()).dispose();
      internal._renderCube = renderCube;
      const box = internal._boxMesh;
      for (const material of [internal._ggxMaterial, internal._integrationMaterial]) {
        if (!material) continue;
        const probe = new THREE.Mesh(box.geometry, material);
        gl.setRenderTarget(target);
        filters.push(gl.compileAsync(probe, new THREE.PerspectiveCamera(90, 1, 0.1, 10)));
        gl.setRenderTarget(previous);
      }
    }
    Promise.all([compiled, ...filters]).then(() => {
      target.dispose();
      if (cancelled || !pmrem) {
        room.dispose();
        return;
      }
      env = pmrem.fromScene(room).texture;
      room.dispose();
      scene.environment = env;
      scene.environmentIntensity = envIntensity;
      done.current?.();
    });
    return () => {
      cancelled = true;
      scene.environment = null;
      env?.dispose();
      pmrem?.dispose();
    };
  }, [get, envIntensity]);

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 8, 6]} intensity={1.7} />
      <pointLight position={[-5, 2.5, -4]} color="#ff5c9a" intensity={45} distance={22} />
      <pointLight position={[5, 1.5, -3]} color="#ffb547" intensity={35} distance={22} />
    </>
  );
}
