"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";
import {
  CrystalBurst,
  GlowDisc,
  Particles,
  RING_SEAT_Y,
  SLAB_D,
  SLAB_H,
  SLAB_LAYERS,
  SLAB_W,
  SaltSlab,
  SteelRing,
  StudioLights,
  tuneRenderer,
  WarmUp,
  clamp01,
  layerY,
  newSlabState,
  smoothstep,
  track,
} from "./three/slabKit";
import type { Keys } from "./three/slabKit";
import { BURST_RANGE, COOKS_RANGE, EXPLODE, FROST, HEAT, THICKNESS } from "./storyTimeline";

export type PlaceCallout = (index: number, x: number, y: number, opacity: number, viewportWidth: number) => void;

interface StoryProps {
  progress: MotionValue<number>;
  placeCallout: PlaceCallout;
  calm: boolean;
}

// Choreography (progress → value). Chapter windows live in storyTimeline.ts.
const ROT_X: Keys = [
  [0, 0.85],
  [0.07, 0.85],
  [0.2, 0.4],
  [0.28, 0.08],
  [0.46, 0.08],
  [0.53, 0.22],
];
const ROT_Z: Keys = [
  [0, -0.14],
  [0.16, 0],
];
const CAM_Y: Keys = [
  [0, 0.5],
  [0.07, 0.5],
  [0.2, 3.2],
  [0.28, 1.3],
  [0.46, 1.3],
  [0.53, 2.4],
  [0.64, 2.4],
  [0.72, 3.6],
  [0.84, 3.2],
];
const CAM_Z: Keys = [
  [0, 17],
  [0.07, 17],
  [0.2, 12],
  [0.28, 11],
  [0.46, 11],
  [0.53, 13],
  [0.64, 13],
  [0.72, 13.5],
  [0.84, 12.5],
];
const LOOK_Y: Keys = [
  [0, -0.3],
  [0.07, -0.3],
  [0.2, 0],
  [0.28, 0.2],
  [0.46, 0.2],
  [0.53, -0.1],
  [0.64, -0.1],
  [0.72, 0.2],
  [0.84, 0.1],
];
const RING_Y: Keys = [
  [0.47, -5],
  [0.535, RING_SEAT_Y],
  [0.66, RING_SEAT_Y],
  [0.73, -5],
];
// The hot (from below) and cold (from above) fill lights never overlap, so one
// light plays both parts: one fewer light for every pixel the slab covers.
const HEAT_GLOW = new THREE.Color("#ff6a1f");
const FROST_GLOW = new THREE.Color("#9fd4ff");
const HEAT_LIGHT_LOCAL = new THREE.Vector3(0, -0.9, 0);

const CORNERS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

function StoryRig({ progress, placeCallout, calm }: StoryProps) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const slab = useRef(newSlabState());
  const heat = useRef(0);
  const frost = useRef(0);
  const dust = useRef(0.8);
  const burst = useRef(0);

  const pivot = useRef<THREE.Group>(null);
  const holder = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);
  const fxLight = useRef<THREE.PointLight>(null);

  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const intro = useRef(0);
  const v = useMemo(() => new THREE.Vector3(), []);

  // Track the pointer on the window so the canvas never intercepts scrolling.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, delta) => {
    const pv = pivot.current;
    const hd = holder.current;
    if (!pv || !hd) return;
    const p = progress.get();
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    intro.current = Math.min(1, intro.current + dt / 1.8);
    const introE = 1 - Math.pow(1 - intro.current, 3);
    const ptr = pointer.current;
    ptr.x = THREE.MathUtils.damp(ptr.x, calm ? 0 : ptr.tx, 3, dt);
    ptr.y = THREE.MathUtils.damp(ptr.y, calm ? 0 : ptr.ty, 3, dt);

    // ── Material states ──
    const aspect = size.width / size.height;
    // Portrait screens frame the slab smaller, so spread the strata further apart.
    const spread = aspect < 1 ? 1.7 : 1;
    const gap = track(p, EXPLODE) * spread;
    const heatV = track(p, HEAT);
    const frostV = track(p, FROST);
    const b = clamp01((p - BURST_RANGE[0]) / (BURST_RANGE[1] - BURST_RANGE[0]));
    const cookT = clamp01((p - COOKS_RANGE[0]) / (COOKS_RANGE[1] - COOKS_RANGE[0]));
    // A brief sizzle flash on every one of the 40 cooks.
    const pulse = cookT > 0 && cookT < 1 ? Math.pow(1 - ((cookT * 39) % 1), 4) * 0.5 : 0;

    const s = slab.current;
    s.gap = gap;
    s.heat = heatV;
    s.frost = frostV;
    s.thickness = track(p, THICKNESS);
    s.pulse = pulse;
    heat.current = heatV;
    frost.current = frostV;
    burst.current = b;
    dust.current = 0.35 + 0.5 * (1 - smoothstep(0.05, 0.16, p));

    // ── Slab pose ──
    const hero = 1 - smoothstep(0.06, 0.16, p);
    const idle = calm ? 0 : t * 0.12;
    pv.rotation.set(
      track(p, ROT_X) + ptr.y * 0.1,
      -0.7 + p * Math.PI * 2.2 + idle + ptr.x * 0.25 - (1 - introE) * 1.4,
      track(p, ROT_Z)
    );
    pv.position.y = (calm ? 0 : Math.sin(t * 0.9) * 0.08 * hero) - (1 - introE) * 0.6;
    pv.scale.setScalar(0.72 + 0.28 * introE);

    const slabScale = 1 - smoothstep(0, 0.12, b);
    hd.visible = slabScale > 0.001;
    hd.scale.setScalar(Math.max(slabScale, 0.001));

    if (ring.current) {
      const ry = track(p, RING_Y);
      ring.current.position.y = ry;
      ring.current.visible = ry > -4.5;
    }
    const fx = fxLight.current;
    if (fx) {
      if (heatV + pulse >= frostV) {
        pv.updateMatrixWorld();
        fx.position.copy(HEAT_LIGHT_LOCAL);
        pv.localToWorld(fx.position);
        fx.color.copy(HEAT_GLOW);
        fx.distance = 7;
        fx.intensity = heatV * 28 + pulse * 12;
      } else {
        fx.position.set(0, 3, 2);
        fx.color.copy(FROST_GLOW);
        fx.distance = 12;
        fx.intensity = frostV * 18;
      }
    }

    // ── Camera: keep the slab framed on portrait screens too ──
    const explodeW = clamp01(gap / (0.42 * spread));
    // The tilted hero slab faces the camera, so it can sit closer on portrait screens.
    const portrait = aspect < 1 ? 1 + explodeW * 0.3 - hero * 0.3 : 1;
    const fit = Math.max(1, 1.12 / aspect) * portrait;
    const ly = track(p, LOOK_Y);
    camera.position.set(ptr.x * 0.3, ly + (track(p, CAM_Y) - ly) * fit, track(p, CAM_Z) * fit);
    camera.lookAt(0, ly, 0);
    camera.updateMatrixWorld();

    // ── Mineral callouts pinned to each stratum's outermost edge ──
    if (explodeW < 0.02) {
      for (let i = 0; i < SLAB_LAYERS; i++) placeCallout(i, 0, 0, 0, size.width);
      return;
    }
    pv.updateMatrixWorld();
    for (let i = 0; i < SLAB_LAYERS; i++) {
      const right = i % 2 === 0;
      const y = layerY(i, gap);
      let edge = right ? -Infinity : Infinity;
      for (const [cx, cz] of CORNERS) {
        v.set((cx * SLAB_W) / 2, y, (cz * SLAB_D) / 2);
        pv.localToWorld(v).project(camera);
        const sx = (v.x * 0.5 + 0.5) * size.width;
        edge = right ? Math.max(edge, sx) : Math.min(edge, sx);
      }
      v.set(0, y, 0);
      pv.localToWorld(v).project(camera);
      const sy = (-v.y * 0.5 + 0.5) * size.height;
      const x = Math.min(size.width - 6, Math.max(6, edge + (right ? 8 : -8)));
      placeCallout(i, x, sy, explodeW, size.width);
    }
  });

  return (
    <>
      <group ref={pivot}>
        <group ref={holder}>
          <SaltSlab state={slab} />
        </group>
        <SteelRing groupRef={ring} />
        <GlowDisc level={heat} color="#ff5a1f" size={6.5} y={-0.5} strength={0.85} />
        <GlowDisc level={heat} color="#ff7a2f" size={4.6} y={SLAB_H / 2 + 0.03} strength={0.3} />
        <Particles count={150} level={heat} mode="rise" color="#ffae42" size={0.12} spread={1.7} height={3.4} base={SLAB_H / 2} seed={2} />
      </group>
      <pointLight ref={fxLight} intensity={0} />
      <Particles count={260} level={frost} mode="fall" color="#d6ecff" size={0.08} spread={5} height={7} base={-3} seed={4} />
      <Particles count={120} level={dust} mode="drift" color="#ffc8a8" size={0.05} spread={5.5} height={5} base={-2.2} seed={9} />
      <CrystalBurst amount={burst} originY={-0.17} />
    </>
  );
}

export default function HeroStoryCanvas({
  active,
  onReady,
  ...props
}: StoryProps & { active: boolean; onReady: () => void }) {
  // Hold rendering until every shader and texture is ready, so the first frames never stall.
  const [envReady, setEnvReady] = useState(false);
  const [ready, setReady] = useState(false);
  return (
    <Canvas
      frameloop={active && ready ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ fov: 30, near: 0.1, far: 120, position: [0, 0.5, 14] }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
      onCreated={tuneRenderer}
    >
      <StudioLights onReady={() => setEnvReady(true)} />
      <Suspense fallback={null}>
        <StoryRig {...props} />
        {envReady && (
          <WarmUp
            onReady={() => {
              setReady(true);
              onReady();
            }}
          />
        )}
      </Suspense>
    </Canvas>
  );
}
