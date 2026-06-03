# GLTF Visualization

glTF is the "JPEG of 3D." It encodes geometry, PBR materials, textures, scene hierarchy, animations, and morph targets in a single portable format. OBJ has no materials or animations. FBX is proprietary and inconsistently implemented across tools. glTF is the right choice for web viewers, modern game engines, and any pipeline that ends in a screen. Understanding the glTF scene graph and the rendering APIs that consume it prevents the most common class of bugs: invisible models, wrong scale, missing textures, and memory leaks.

## The glTF Scene Graph

A glTF file is a tree of nodes. Each node can have a transform (translation, rotation, scale), child nodes, and optionally reference a mesh. A mesh contains one or more primitives, each with geometry attributes (positions, normals, UVs) and a material reference.

```
Scene
  Node "Root" (transform)
    Node "Body" -> Mesh -> Primitive (geometry + material)
    Node "Wheel_FL" -> Mesh -> Primitive
    Node "Wheel_FR" -> Mesh -> Primitive
    Node "Armature" -> Skin (skeleton)
      Node "Bone_Hips"
        Node "Bone_Spine"
```

Materials reference textures (base color, normal map, metallic-roughness, emissive). Textures reference images stored as embedded base64, binary buffer chunks, or external URIs.

The most common "my model is invisible" bugs:

- **Wrong scale**: CAD exports in millimeters produce a model 1000x too large. Check the bounding box first.
- **Wrong coordinate system**: glTF is Y-up, right-handed. If your source is Z-up (Blender default export), the model appears rotated 90 degrees.
- **Missing materials**: The mesh loads but appears black because the material textures reference external files that weren't included.

## Loading in three.js

### Basic Setup

```typescript
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

loader.load(
  "model.glb",
  (gltf) => {
    scene.add(gltf.scene);

    // Traverse to find specific meshes
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        console.log(child.name, child.geometry.attributes.position.count);
      }
    });
  },
  (progress) => {
    console.log(`${(progress.loaded / progress.total) * 100}%`);
  },
  (error) => {
    console.error("Failed to load:", error);
  }
);
```

### Coordinate System

glTF is Y-up. If your model appears sideways (common with Z-up exports from Blender or CAD tools):

```typescript
// Rotate the entire scene to convert Z-up to Y-up
gltf.scene.rotation.x = -Math.PI / 2;
```

Better: fix the export. In Blender, enable "Y Up" in the glTF export dialog. Rotating at load time works but compounds with animations and physics.

### Dispose Pattern

In single-page applications, failing to dispose of three.js resources causes memory leaks that crash the tab after a few model loads:

```typescript
function disposeModel(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => disposeMaterial(m));
      } else {
        disposeMaterial(child.material);
      }
    }
  });
}

function disposeMaterial(material: THREE.Material) {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) {
      value.dispose();
    }
  }
  material.dispose();
}

// Call before removing from scene
disposeModel(gltf.scene);
scene.remove(gltf.scene);
```

Three.js does not garbage-collect GPU resources automatically. Every geometry, material, and texture you create must be explicitly disposed.

## react-drei

react-drei wraps three.js in React-friendly hooks and components. For glTF loading, it eliminates most boilerplate.

drei docs: [drei.docs.pmnd.rs](https://drei.docs.pmnd.rs/)

### useGLTF

```tsx
import { useGLTF } from "@react-three/drei";

function Model() {
  const gltf = useGLTF("/model.glb");
  return <primitive object={gltf.scene} />;
}

// Preload during idle time (before the component mounts)
useGLTF.preload("/model.glb");
```

`useGLTF` uses React Suspense internally. Wrap the component in `<Suspense fallback={<Loader />}>` to show a loading state.

### primitive vs Clone

- **`<primitive object={...}>`** renders the original scene graph. There is only one instance. If you render `<primitive>` twice with the same object, the model teleports between the two positions (three.js objects can only have one parent).
- **`<Clone>`** deep-clones the geometry and materials, creating an independent copy. Use `<Clone>` when you need multiple instances of the same model.

```tsx
import { Clone, useGLTF } from "@react-three/drei";

function MultipleModels() {
  const gltf = useGLTF("/tree.glb");
  return (
    <>
      <Clone object={gltf.scene} position={[0, 0, 0]} />
      <Clone object={gltf.scene} position={[5, 0, 0]} />
      <Clone object={gltf.scene} position={[10, 0, 0]} />
    </>
  );
}
```

### Accessing Materials and Meshes

```tsx
function Model() {
  const { nodes, materials } = useGLTF("/model.glb");

  // nodes is a flat map of mesh names to mesh objects
  // materials is a flat map of material names to material objects
  return (
    <mesh
      geometry={(nodes.Body as THREE.Mesh).geometry}
      material={materials.BodyPaint}
      material-color="red" // override a material property
    />
  );
}
```

### Environment Maps

PBR materials need environment lighting to look correct. Without it, metallic surfaces appear black.

```tsx
import { Environment } from "@react-three/drei";

function Scene() {
  return (
    <>
      <Environment preset="studio" />
      <Model />
    </>
  );
}
```

Presets: `apartment`, `city`, `dawn`, `forest`, `lobby`, `night`, `park`, `studio`, `sunset`, `warehouse`. For custom HDRIs, pass `files="/path/to/env.hdr"`.

## threlte (Svelte)

threlte is the Svelte equivalent of React Three Fiber. It provides reactive 3D rendering with Svelte's component model.

threlte docs: [threlte.xyz/docs](https://threlte.xyz/docs)

### Loading GLTFs

```svelte
<script>
  import { useGltf } from "@threlte/extras";
  import { T } from "@threlte/core";

  const gltf = useGltf("/model.glb");
</script>

{#if $gltf}
  <T is={$gltf.scene} />
{/if}
```

Or use the declarative `<GLTF>` component:

```svelte
<script>
  import { GLTF } from "@threlte/extras";
</script>

<GLTF url="/model.glb" position={[0, 0, 0]} scale={0.5} />
```

### Reactive Props

threlte leverages Svelte reactivity. Position, rotation, and scale are reactive props that update the three.js transform automatically:

```svelte
<script>
  import { T } from "@threlte/core";

  let rotationY = $state(0);
</script>

<T.Mesh rotation.y={rotationY}>
  <T.BoxGeometry />
  <T.MeshStandardMaterial color="orange" />
</T.Mesh>
```

With Svelte 5 runes (`$state`, `$derived`), derived transforms update automatically when their source values change.

### Animation Loop

threlte provides `useTask` for per-frame updates (equivalent to React Three Fiber's `useFrame`):

```svelte
<script>
  import { useTask } from "@threlte/core";

  let rotation = $state(0);

  useTask((delta) => {
    rotation += delta;
  });
</script>
```

## LOD (Level of Detail)

LOD reduces the triangle count for objects far from the camera. This is critical for scenes with many detailed models.

### Three.js LOD Object

```typescript
const lod = new THREE.LOD();

// High detail: 0-50 units from camera
lod.addLevel(highPolyMesh, 0);
// Medium detail: 50-200 units
lod.addLevel(mediumPolyMesh, 50);
// Low detail: 200+ units
lod.addLevel(lowPolyMesh, 200);

scene.add(lod);

// LOD.update() is called automatically by the renderer
```

### Generating LODs

Use mesh decimation to produce lower-detail versions:

```python
import trimesh

mesh = trimesh.load("high_poly.glb")

# Target a specific face count
simplified = mesh.simplify_quadric_decimation(face_count=5000)
simplified.export("lod2.glb")
```

Or use `meshoptimizer` for better quality simplification:

```bash
# gltfpack generates LODs automatically
gltfpack -i input.glb -o output.glb -si 0.5  # simplify to 50% triangles
```

The glTF `MSFT_lod` extension allows embedding LOD levels in a single file, but toolchain support is limited. Most production pipelines generate separate files per LOD and switch in application code.

## Materials and PBR

### MeshStandardMaterial vs MeshPhysicalMaterial

- **`MeshStandardMaterial`** implements the standard metallic-roughness PBR model. Use this by default. It handles 95% of real-world materials.
- **`MeshPhysicalMaterial`** extends Standard with clearcoat, sheen, iridescence, and transmission (glass). It's more expensive to render. Only use it when you need these specific effects (car paint clearcoat, fabric sheen, glass refraction).

### Runtime Material Modification

```typescript
gltf.scene.traverse((child) => {
  if (child instanceof THREE.Mesh) {
    // Color
    child.material.color.set(0xff0000);

    // Wireframe overlay
    child.material.wireframe = true;

    // Opacity
    child.material.transparent = true;
    child.material.opacity = 0.5;

    // Force update after changing certain properties
    child.material.needsUpdate = true;
  }
});
```

### Transparent and Cutout Materials

Transparency in three.js has ordering gotchas. Transparent objects must render back-to-front, which three.js handles approximately but not perfectly.

```typescript
const material = new THREE.MeshStandardMaterial({
  map: texture,
  transparent: true,    // enable alpha blending
  alphaTest: 0.5,       // discard pixels below this alpha (cutout mode)
  side: THREE.DoubleSide, // render both faces (needed for thin geometry like leaves)
  depthWrite: false,    // prevents transparent surfaces from blocking each other
});
```

- Use **`alphaTest`** (cutout) for foliage, fences, decals. It's cheaper than full transparency and doesn't have sorting issues.
- Use **`transparent: true`** with **`depthWrite: false`** for glass, smoke, particles.

## Instancing

When you need to render the same mesh thousands of times (trees in a forest, particles, crowds), `InstancedMesh` renders all instances in a single draw call.

### Three.js

```typescript
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const count = 10000;

const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
const matrix = new THREE.Matrix4();

for (let i = 0; i < count; i++) {
  matrix.setPosition(
    Math.random() * 100 - 50,
    0,
    Math.random() * 100 - 50
  );
  instancedMesh.setMatrixAt(i, matrix);
}

instancedMesh.instanceMatrix.needsUpdate = true;
scene.add(instancedMesh);
```

### react-drei

```tsx
import { Instances, Instance } from "@react-three/drei";

function Forest() {
  const { nodes } = useGLTF("/tree.glb");
  return (
    <Instances
      geometry={(nodes.Tree as THREE.Mesh).geometry}
      material={(nodes.Tree as THREE.Mesh).material}
    >
      {positions.map((pos, i) => (
        <Instance key={i} position={pos} />
      ))}
    </Instances>
  );
}
```

### Per-frame Instance Updates

For animated instances (particles, flocking), update the instance matrices in the render loop:

```typescript
function animate() {
  for (let i = 0; i < count; i++) {
    instancedMesh.getMatrixAt(i, matrix);
    // Modify matrix (translate, rotate, scale)
    matrix.setPosition(x, y, z);
    instancedMesh.setMatrixAt(i, matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
}
```

The cost is O(n) CPU work per frame for n instances, plus one draw call. For 10k instances this is dramatically faster than 10k individual meshes (which would be 10k draw calls).
