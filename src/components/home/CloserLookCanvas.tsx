"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  GlowDisc,
  Particles,
  PlatterClip,
  RING_SEAT_Y,
  SLAB_H,
  SaltSlab,
  SteelRing,
  StudioLights,
  tuneRenderer,
  WarmUp,
  useSlabTextures,
  newSlabState,
} from "./three/slabKit";

export type SetPiece = "slab" | "trivet" | "platter";

/** Written by the UI's pointer handlers; the scene only reads it. */
export interface DragState {
  offset: number;
  down: boolean;
  lastX: number;
}

const TARGETS: Record<
  SetPiece,
  { heat: number; frost: number; ring: number; clip: number; sx: number; sy: number; sz: number }
> = {
  slab: { heat: 0, frost: 0, ring: -5, clip: 0, sx: 1, sy: 1, sz: 1 },
  trivet: { heat: 0.85, frost: 0, ring: RING_SEAT_Y, clip: 0, sx: 1, sy: 1, sz: 1 },
  platter: { heat: 0, frost: 0.55, ring: -5, clip: 1, sx: 1.1, sy: 0.85, sz: 1.3 },
};

function ContactShadow({ y }: { y: number }) {
  const tex = useSlabTextures();
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex.glow, color: "#000000", transparent: true, opacity: 0.6, depthWrite: false }),
    [tex]
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh material={material} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[7, 7]} />
    </mesh>
  );
}

function SetRig({ piece, drag }: { piece: SetPiece; drag: RefObject<DragState> }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const slab = useRef(newSlabState());
  const heat = useRef(0);
  const frost = useRef(0);
  const current = useRef({ ...TARGETS.slab });
  const spin = useRef({ rot: 0, vel: 0, seen: 0 });
  const pivot = useRef<THREE.Group>(null);
  const shape = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);
  const clip = useRef<THREE.Group>(null);
  const heatLight = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    const pv = pivot.current;
    const sh = shape.current;
    if (!pv || !sh) return;
    const dt = Math.min(delta, 0.05);
    const c = current.current;
    const target = TARGETS[piece];
    for (const key of Object.keys(target) as (keyof typeof target)[]) {
      c[key] = THREE.MathUtils.damp(c[key], target[key], 4.5, dt);
    }

    slab.current.heat = c.heat;
    slab.current.frost = c.frost;
    heat.current = c.heat;
    frost.current = c.frost;

    // Reshape into the wider, thinner serving platter while staying seated.
    sh.scale.set(c.sx, c.sy, c.sz);
    sh.position.y = (-(1 - c.sy) * SLAB_H) / 2;
    if (ring.current) {
      ring.current.position.y = c.ring;
      ring.current.visible = c.ring > -4.5;
    }
    if (clip.current) {
      clip.current.visible = c.clip > 0.02;
      clip.current.scale.setScalar(Math.max(c.clip, 0.001));
    }
    if (heatLight.current) heatLight.current.intensity = c.heat * 26;

    // Drag with inertia; drift slowly when left alone.
    const d = drag.current;
    const sp = spin.current;
    const moved = d.offset - sp.seen;
    sp.seen = d.offset;
    sp.rot += moved;
    if (d.down) {
      sp.vel = THREE.MathUtils.lerp(sp.vel, moved, 0.5);
    } else {
      sp.rot += sp.vel;
      sp.vel *= Math.pow(0.92, dt * 60);
      if (Math.abs(sp.vel) < 0.002) sp.rot += dt * 0.22;
    }
    pv.rotation.set(0.16, sp.rot - 0.6, 0);
    pv.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.05;

    const aspect = size.width / size.height;
    const fit = Math.max(1, 1.3 / aspect);
    camera.position.set(0, 3.1 * fit, 10.5 * fit);
    camera.lookAt(0, -0.15, 0);
  });

  return (
    <>
      <group ref={pivot}>
        <group ref={shape}>
          <SaltSlab state={slab} />
          <PlatterClip groupRef={clip} />
        </group>
        <SteelRing groupRef={ring} />
        <pointLight ref={heatLight} position={[0, -0.9, 0]} color="#ff6a1f" intensity={0} distance={7} />
        <GlowDisc level={heat} color="#ff5a1f" size={6} y={-0.5} strength={0.8} />
        <GlowDisc level={heat} color="#ff7a2f" size={4.6} y={SLAB_H / 2 + 0.03} strength={0.3} />
        <Particles count={110} level={heat} mode="rise" color="#ffae42" size={0.11} spread={1.6} height={3} base={SLAB_H / 2} seed={6} />
      </group>
      <Particles count={160} level={frost} mode="fall" color="#d6ecff" size={0.08} spread={4.5} height={6} base={-2.5} seed={8} />
      <ContactShadow y={-0.5} />
    </>
  );
}

export default function CloserLookCanvas({
  piece,
  drag,
  active,
  onReady,
}: {
  piece: SetPiece;
  drag: RefObject<DragState>;
  active: boolean;
  onReady: () => void;
}) {
  // Hold rendering until every shader and texture is ready, so the first frames never stall.
  const [envReady, setEnvReady] = useState(false);
  const [ready, setReady] = useState(false);
  return (
    <Canvas
      frameloop={active && ready ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ fov: 30, near: 0.1, far: 80, position: [0, 3.1, 11] }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
      onCreated={tuneRenderer}
    >
      <StudioLights envIntensity={0.75} onReady={() => setEnvReady(true)} />
      <Suspense fallback={null}>
        <SetRig piece={piece} drag={drag} />
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
