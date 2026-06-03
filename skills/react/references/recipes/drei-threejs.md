# 3D Scenes with React Three Fiber and Drei

## Why this matters

Three.js is a powerful 3D library, but using it directly in React creates a fundamental tension: Three.js is imperative (you create objects, call methods, mutate properties) while React is declarative (you describe what the UI should look like, React figures out the mutations). Mixing these models leads to code that's hard to reason about — Three.js objects created in `useEffect` with manual cleanup, camera and renderer lifecycle managed outside React's tree.

React Three Fiber (r3f) solves this by mapping Three.js classes to JSX elements. `<mesh>` becomes `new THREE.Mesh()`. `args` maps to constructor arguments. You write declarative 3D scene trees the same way you write HTML.

Drei is r3f's utility belt — helpers for cameras, controls, lighting, model loading, performance primitives, and more. Without it, you'd write 50 lines of boilerplate for "load a GLB file and play its animation".

**Why the version trio matters:** `three`, `@react-three/fiber`, and `@react-three/drei` are coupled. Three.js generates TypeScript declarations for JSX elements at a specific version. Using a mismatched `three` major with r3f 9 breaks the JSX type system — you'll get type errors on every `<mesh>` and `<boxGeometry>`.

```bash
pnpm add three@~0.182 @react-three/fiber@^9 @react-three/drei@^10
pnpm add -D @types/three
```


## 1. Canvas and your first scene

`<Canvas>` is the root of every r3f scene. It creates the `WebGLRenderer`, scene graph, and a default camera. It uses a `ResizeObserver` to track its parent element — **size the parent in CSS, not on Canvas itself**.

```tsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Suspense } from "react";

function SpinningBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#6366f1" />
    </mesh>
  );
}

export function Scene() {
  return (
    <Canvas>
      {/* makeDefault tells r3f helpers (OrbitControls, etc.) to target this camera */}
      <PerspectiveCamera makeDefault position={[3, 3, 3]} fov={50} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      <Suspense fallback={null}>
        <SpinningBox />
      </Suspense>

      <OrbitControls makeDefault />
    </Canvas>
  );
}
```

Mount with a sized parent:

```tsx
<div style={{ width: "100vw", height: "100vh" }}>
  <Scene />
</div>
```

```css
html, body, #root { margin: 0; height: 100%; }
```

**Key concepts:**
- Lowercase JSX tags (`<mesh>`, `<boxGeometry>`) are Three.js classes. `args` is the constructor argument array — `args={[1, 1, 1]}` maps to `new THREE.BoxGeometry(1, 1, 1)`.
- `meshStandardMaterial` requires at least one light in the scene. Without lights, every PBR material renders black.
- Wrap async components (model loaders, environment maps) in `<Suspense>`.

### Camera options

- **Quick perspective (inline):** `<Canvas camera={{ position: [3,3,3], fov: 50 }}>` — no element needed.
- **Perspective with ref:** `<PerspectiveCamera makeDefault position={[3,3,3]} fov={50} />` — can hold a ref for programmatic control.
- **Orthographic** (technical/diagram views): `<OrthographicCamera makeDefault zoom={300} position={[10,10,10]} />` — control apparent size with `zoom`, not distance.

### Controls

- `<OrbitControls makeDefault />` — orbit/pan/zoom with mouse.
- `<CameraControls makeDefault ref={ref} />` — richer imperative API (`fitToBox`, `setLookAt`, `rotateTo`). Use when you need to animate the camera to frame a specific object.


## 2. Lighting

Without lights, PBR materials render black. Three lighting approaches, in order of effort:

### A. Hand-placed lights (full control)

```tsx
export function Lights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <directionalLight position={[-5, 2, -5]} intensity={0.4} />
      <pointLight position={[0, 3, 0]} intensity={2} decay={2} />
    </>
  );
}
```

- `ambientLight` — no position, lifts all shadows uniformly.
- `directionalLight` — parallel rays aimed at origin; treat `position` as direction, not location.
- `pointLight`/`spotLight` — fall off with `decay`. `decay={2}` is physically correct; `decay={0}` for flat brightness.

### B. Shadows (opt-in, GPU cost)

Shadows require three steps: enable on Canvas, mark the light as a shadow caster, and mark each mesh as a caster or receiver:

```tsx
<Canvas shadows>
  <directionalLight
    position={[5, 8, 5]} intensity={1.2}
    castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}
  />
  <mesh castShadow>{/* object casting a shadow */}</mesh>
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
    <planeGeometry args={[20, 20]} />
    <meshStandardMaterial color="#cccccc" />
  </mesh>
</Canvas>
```

For a soft contact shadow without the GPU cost, use `<ContactShadows />` from Drei.

### C. Image-based lighting with `<Environment>` (best look, least tuning)

```tsx
import { Environment } from "@react-three/drei";

<Environment preset="studio" environmentIntensity={0.8} />
// or custom HDRI:
<Environment files="/venice_sunset_1k.hdr" environmentIntensity={1} />
```

Presets: `"studio"`, `"city"`, `"sunset"`, `"warehouse"`, `"dawn"`, `"night"`, `"forest"`, `"apartment"`, `"lobby"`, `"park"`.

Add `background` prop to paint the environment behind the scene. Wrap in `<Suspense>` (it loads async). Best option for product visualization and PBR materials.


## 3. Loading GLB/glTF models

Put models in `public/` so Vite serves them as static assets (e.g. `public/models/robot.glb` → `/models/robot.glb`).

### Whole scene (simplest)

```tsx
import { useGLTF } from "@react-three/drei";

export function Model() {
  const { scene } = useGLTF("/models/robot.glb");
  return <primitive object={scene} />;
}
```

Render inside `<Suspense fallback={null}>`. `useGLTF` returns `{ scene, nodes, materials, animations }`, cached by URL.

**Caveat — shared instance:** the cached `scene` is the same object every time. Mounting the same URL in two `<primitive>` moves the one object around. Use Drei's `<Clone>` to render the same scene in multiple places:

```tsx
import { Clone, useGLTF } from "@react-three/drei";
const { scene } = useGLTF("/models/robot.glb");
<Clone object={scene} position={[0, 0, 0]} />
<Clone object={scene} position={[3, 0, 0]} />
```

### Per-node control

Access individual meshes by name to override materials or positions:

```tsx
const { nodes, materials } = useGLTF("/models/robot.glb");

<group>
  <mesh
    geometry={(nodes.Body as THREE.Mesh).geometry}
    material={materials.Metal}
    position={[0, 1, 0]}
    castShadow
  />
  <mesh geometry={(nodes.Head as THREE.Mesh).geometry} position={[0, 2, 0]}>
    <meshStandardMaterial color="#6366f1" />  {/* override the loaded material */}
  </mesh>
</group>
```

Tip: `npx gltfjsx model.glb` generates a typed `nodes`/`materials` component for you.

### Preload and dispose

```tsx
useGLTF.preload("/models/robot.glb"); // at module top — no first-frame stall
useGLTF.clear("/models/robot.glb");   // free GPU memory when truly done
```

### Baked animations

```tsx
import { useGLTF, useAnimations } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export function AnimatedModel() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/models/robot.glb");
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    const action = actions[names[0]];
    action?.reset().fadeIn(0.3).play();
    return () => { action?.fadeOut(0.3); };
  }, [actions, names]);

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}
```

`useAnimations` advances the `AnimationMixer` on every frame automatically — no manual `useFrame` needed. Cross-fade between clips: `actions.Idle?.crossFadeTo(actions.Run!, 0.4, false)`.


## 4. Animation loop with `useFrame`

`useFrame` is the r3f equivalent of Three.js's render loop. It runs every frame. The critical rule: **mutate refs, do not call `setState` per frame**. Calling state setters 60 times per second triggers 60 React re-renders per second, which defeats the purpose of a render loop.

```tsx
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export function SpinningBox() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!ref.current) return;
    // Always multiply by delta — makes motion consistent across 30fps, 60fps, 144fps
    ref.current.rotation.y += delta * 1.5;
    // state.clock.elapsedTime is total seconds since mount
    ref.current.position.y = Math.sin(state.clock.elapsedTime) * 0.5;
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#6366f1" />
    </mesh>
  );
}
```

### Smooth toward a target (damp)

`lerp(a, b, t)` is frame-rate dependent — at 30fps an object moves half as far per second as at 60fps. Use `THREE.MathUtils.damp` instead:

```tsx
useFrame((_state, delta) => {
  if (!ref.current) return;
  ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, target.x, 4, delta);
  ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, target.y, 4, delta);
  ref.current.position.z = THREE.MathUtils.damp(ref.current.position.z, target.z, 4, delta);
});
```

- `damp(current, target, lambda, delta)` — exponential smoothing, frame-rate independent. Higher `lambda` = snappier response.
- For vectors/quaternions: `Vector3.lerp`, `Quaternion.slerp`, or Drei's `maath/easing` helpers (`damp3`, `dampQ`).

### On-demand rendering (static scenes)

For model viewers or scenes that only change on user interaction:

```tsx
<Canvas frameloop="demand">{/* ... */}</Canvas>
```

r3f renders once on mount, then only when `invalidate()` is called. Drei controls call `invalidate()` automatically on interaction. Trigger it yourself after programmatic changes:

```tsx
const invalidate = useThree((s) => s.invalidate);
invalidate(); // request exactly one new frame
```

**Caveat:** continuous `useFrame` animations won't drive themselves in demand mode. Use the default loop for animated scenes; demand mode only for passive viewers.


## 5. Performance — instancing

1,000 separate `<mesh>` elements = 1,000 draw calls. If they share the same geometry and material, GPU-instance them into one draw call.

### Declarative — Drei `<Instances>`

```tsx
import { Instances, Instance } from "@react-three/drei";

export function Field() {
  const positions = Array.from({ length: 1000 }, () => [
    (Math.random() - 0.5) * 50, 0, (Math.random() - 0.5) * 50,
  ]) as [number, number, number][];

  return (
    <Instances limit={1000} range={1000}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial />
      {positions.map((pos, i) => (
        <Instance key={i} position={pos} color="#6366f1" />
      ))}
    </Instances>
  );
}
```

Each `<Instance>` can set its own `position`, `rotation`, `scale`, `color`.

### Raw `<instancedMesh>` (per-frame matrix updates)

When you need to update positions every frame (particles, crowds):

```tsx
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

const COUNT = 1000;
const dummy = new THREE.Object3D();

export function RawField() {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    for (let i = 0; i < COUNT; i++) {
      dummy.position.set((Math.random() - 0.5) * 50, 0, (Math.random() - 0.5) * 50);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#6366f1" />
    </instancedMesh>
  );
}
```

`args={[geometry, material, count]}` — pass `undefined` when supplying geometry/material as JSX children. Always set `instanceMatrix.needsUpdate = true` after writing matrices.

### Disposal and memoization

- r3f auto-disposes JSX-built geometry/materials on unmount.
- Manually dispose anything built with `new THREE.*`:
  ```ts
  useEffect(() => () => geometry.dispose(), [geometry]);
  ```
- `useGLTF` caches results on purpose; clear only with `useGLTF.clear(url)` when truly done.
- **Hide, don't unmount** — toggling `visible` is cheaper than unmounting/remounting (which re-uploads geometry to the GPU).
- Wrap expensive computations in `useMemo`:
  ```ts
  const rotation = useMemo(
    () => new THREE.Euler().setFromQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w)),
    [q],
  );
  ```


## 6. Polylines with Drei `<Line>`

Native `THREE.Line` ignores `linewidth` on most platforms (always renders 1px). Drei's `<Line>` wraps `Line2`/`LineMaterial` (fat lines) so `lineWidth` works in screen pixels.

```tsx
import { Line } from "@react-three/drei";

export function Path() {
  const points: [number, number, number][] = [
    [0, 0, 0], [1, 1, 0], [2, 0, 0], [3, 1, 0],
  ];
  return <Line points={points} color="#3b82f6" lineWidth={2} />;
}
```

- `points`: `[x, y, z]` tuples or `THREE.Vector3[]`.
- `lineWidth`: screen pixels.
- `color`, `transparent`, `opacity` work as on a material.

### Per-vertex colors

```tsx
const points = [new THREE.Vector3(0,0,0), new THREE.Vector3(1,1,0), new THREE.Vector3(2,0,0)];
const colors = [new THREE.Color("green"), new THREE.Color("green"), new THREE.Color("red")];
<Line points={points} vertexColors={colors} lineWidth={2} />;
```

`vertexColors.length` must equal `points.length`. When set, the `color` prop is ignored.

### Dashed lines

```tsx
<Line points={points} color="#10b981" lineWidth={2} dashed dashSize={0.4} gapSize={0.2} />
```

`dashSize`/`gapSize` are in world units.

### Dynamic points

`<Line>` re-tessellates when the `points` prop identity changes. Memoize to avoid per-render cost:

```tsx
const points = useMemo(() => {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const x = (i / 64) * 6 - 3;
    pts.push(new THREE.Vector3(x, Math.sin(x + phase), 0));
  }
  return pts;
}, [phase]);

return <Line points={points} color="#6366f1" lineWidth={2} />;
```

For per-frame in-place updates, mutate the geometry's position buffer and set `needsUpdate = true` rather than rebuilding the array.

### Smooth curves

```tsx
const curve = new THREE.CatmullRomCurve3(controlPoints);
const points = curve.getPoints(100); // 100 samples → smooth polyline
<Line points={points} lineWidth={2} color="#6366f1" />;
```


## Performance checklist

- Many identical meshes? → `<Instances>` or `<instancedMesh>`.
- Scene static between interactions? → `frameloop="demand"` + `invalidate()`.
- Imperative geometry/material/texture? → dispose on unmount.
- Recomputing arrays/objects every render? → `useMemo`, or hoist outside the component.
- Re-rendering on unrelated state? → narrow Zustand selectors (`useStore(store, (s) => s.gridVisible)`).

## Verify

- Cube renders, lit, orbit/zoom/pan with mouse.
- Window resize tracks Canvas with no extra code.
- `delta`-based motion is consistent across refresh rates.
- Instanced field of 1,000 boxes is one (or few) draw calls — check `useThree((s) => s.gl).info.render.calls`.
