"use client";

import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { StudioLights, tuneRenderer } from "./three/slabKit";
import { DISH_TONES, Dish } from "./three/foodKit";

interface View {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

// Kept outside the component: these mutate three.js objects in place.
function shareEnvironment(view: View, source: THREE.Scene) {
  view.scene.environment = source.environment;
  view.scene.environmentIntensity = source.environmentIntensity;
}

/** Frames the slab in a slot of the given size, wide or tall. */
function frameCamera(view: View, width: number, height: number) {
  const aspect = width / height;
  const d = Math.max(9.6 / aspect, 7) * 1.05;
  const elevation = 0.72;
  view.camera.aspect = aspect;
  view.camera.position.set(0, Math.sin(elevation) * d + 0.25, Math.cos(elevation) * d);
  view.camera.lookAt(0, 0.15, 0);
  view.camera.updateProjectionMatrix();
}

function findSprites(scene: THREE.Scene) {
  const sprites: THREE.ShaderMaterial[] = [];
  scene.traverse((object) => {
    const material = (object as THREE.Points).isPoints ? ((object as THREE.Points).material as THREE.ShaderMaterial) : null;
    if (material?.uniforms?.uScale) sprites.push(material);
  });
  return sprites;
}

/** Point sprites are sized against the view they're drawn into, not the whole canvas. */
function sizeSprites(sprites: THREE.ShaderMaterial[] | undefined, height: number) {
  if (sprites) for (const m of sprites) m.uniforms.uScale.value = height * 0.5;
}

function collectTextures(scene: THREE.Scene, into: Set<THREE.Texture>) {
  scene.traverse((object) => {
    const material = (object as THREE.Mesh).material;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) {
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) into.add(value);
      const uniforms = (m as THREE.ShaderMaterial).uniforms;
      if (uniforms) for (const u of Object.values(uniforms)) if (u.value instanceof THREE.Texture) into.add(u.value);
    }
  });
}

/**
 * Draws every dish into its card's slot with a scissored viewport, so five
 * dishes share one WebGL context and only on-screen cards are rendered.
 */
function DishViews({
  slots,
  calm,
  envReady,
  onReady,
}: {
  slots: RefObject<(HTMLElement | null)[]>;
  calm: boolean;
  envReady: boolean;
  onReady: () => void;
}) {
  const get = useThree((s) => s.get);
  const views = useMemo<View[]>(
    () => DISH_TONES.map(() => ({ scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(28, 1, 0.1, 60) })),
    []
  );
  const done = useRef(onReady);
  const sprites = useRef<THREE.ShaderMaterial[][]>([]);

  useEffect(() => {
    done.current = onReady;
  }, [onReady]);

  // Share the studio environment, then compile every dish before the first frame.
  useEffect(() => {
    if (!envReady) return;
    const { gl, scene } = get();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      done.current();
    };
    const textures = new Set<THREE.Texture>();
    sprites.current = views.map((v) => findSprites(v.scene));
    for (const view of views) {
      shareEnvironment(view, scene);
      frameCamera(view, 4, 3);
      collectTextures(view.scene, textures);
    }
    textures.forEach((t) => gl.initTexture(t));
    Promise.all(views.map((v) => gl.compileAsync(v.scene, v.camera))).then(finish, finish);
    const fallback = setTimeout(finish, 4000);
    return () => {
      finished = true;
      clearTimeout(fallback);
    };
  }, [envReady, get, views]);

  // Priority 1 takes over rendering from R3F.
  useFrame(({ gl }) => {
    const bounds = gl.domElement.getBoundingClientRect();
    gl.setScissorTest(false);
    gl.clear(true, true, false);
    gl.setScissorTest(true);
    const els = slots.current;
    views.forEach((view, i) => {
      const el = els?.[i];
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.right <= bounds.left || r.left >= bounds.right || r.bottom <= bounds.top || r.top >= bounds.bottom) return;
      const x = r.left - bounds.left;
      const y = bounds.bottom - r.bottom;
      gl.setViewport(x, y, r.width, r.height);
      gl.setScissor(x, y, r.width, r.height);
      frameCamera(view, r.width, r.height);
      sizeSprites(sprites.current[i], r.height);
      gl.render(view.scene, view.camera);
    });
    gl.setScissorTest(false);
  }, 1);

  return (
    <>
      {views.map((view, i) => (
        <Fragment key={i}>{createPortal(<Dish index={i} calm={calm} />, view.scene)}</Fragment>
      ))}
    </>
  );
}

export default function DishesCanvas({
  slots,
  active,
  calm,
  onReady,
}: {
  slots: RefObject<(HTMLElement | null)[]>;
  active: boolean;
  calm: boolean;
  onReady: () => void;
}) {
  const [envReady, setEnvReady] = useState(false);
  const [ready, setReady] = useState(false);
  return (
    <Canvas
      frameloop={active && ready ? "always" : "never"}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
      onCreated={tuneRenderer}
    >
      <StudioLights onReady={() => setEnvReady(true)} />
      <Suspense fallback={null}>
        <DishViews
          slots={slots}
          calm={calm}
          envReady={envReady}
          onReady={() => {
            setReady(true);
            onReady();
          }}
        />
      </Suspense>
    </Canvas>
  );
}
