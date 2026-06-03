# Real-time Mesh Modification

Editing geometry at runtime powers sculpting tools, procedural terrain, destructible environments, and user-driven shape manipulation in the browser. The fundamental tension is between CPU-side modification (flexible, easy to debug, limited by JS performance) and GPU-side modification (fast, but harder to read back and reason about). Choosing the right approach depends on how many vertices you're touching and how often.

## CPU-side Vertex Modification

In three.js, mesh geometry is stored in `BufferGeometry` with typed array attributes. You can modify vertices directly in JavaScript and flag the attribute for re-upload to the GPU.

### Basic Pattern

```typescript
const geometry = mesh.geometry;
const positions = geometry.attributes.position as THREE.BufferAttribute;

// Modify vertices
for (let i = 0; i < positions.count; i++) {
  const y = positions.getY(i);
  positions.setY(i, y + Math.sin(positions.getX(i) * 0.1) * 0.5);
}

// Flag for GPU re-upload (required -- without this, changes are invisible)
positions.needsUpdate = true;

// If you changed vertex positions, recompute normals for correct lighting
geometry.computeVertexNormals();
```

### Performance Ceiling

CPU-side vertex modification in JavaScript has a practical ceiling around 100k vertices at 30fps. The bottleneck is the JS loop over the typed array plus the GPU buffer upload. Above this:

- **50k vertices**: comfortable for per-frame updates
- **100k vertices**: marginal; profile on target devices
- **500k+ vertices**: move to GPU (vertex shaders, compute shaders)

### Critical Rules

- **Never create new geometries per frame.** Allocate the `BufferGeometry` once, then modify the existing typed arrays in place. Creating and disposing geometries every frame causes GC pressure and GPU resource leaks.
- **Use `Float32Array` directly** when possible instead of `getX`/`setX` methods. The methods have per-call overhead:

```typescript
// Faster for bulk updates
const array = positions.array as Float32Array;
for (let i = 0; i < positions.count; i++) {
  array[i * 3 + 1] += displacement; // Y component
}
positions.needsUpdate = true;
```

- **Only flag `needsUpdate` once per frame**, not inside the loop.

## GPU-side Displacement

For large meshes or complex per-vertex effects, do the work in a vertex shader. The CPU sends uniforms (time, parameters) and the GPU applies displacement to every vertex in parallel.

### ShaderMaterial

```typescript
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uAmplitude: { value: 0.5 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uAmplitude;

    void main() {
      vec3 pos = position;
      // Sine wave displacement along Y
      pos.y += sin(pos.x * 2.0 + uTime) * uAmplitude;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    void main() {
      gl_FragColor = vec4(0.2, 0.6, 1.0, 1.0);
    }
  `,
});

// In the render loop
function animate() {
  material.uniforms.uTime.value = clock.getElapsedTime();
}
```

### Displacement Map on Standard Material

For simpler cases, `MeshStandardMaterial` supports texture-based displacement:

```typescript
const material = new THREE.MeshStandardMaterial({
  displacementMap: displacementTexture,
  displacementScale: 0.5,   // max displacement height
  displacementBias: -0.25,  // offset (center the displacement)
});
```

This is simpler than custom shaders but limited to texture-driven displacement. The mesh must have enough subdivisions for the displacement to look smooth (a 10-triangle plane won't show displacement detail).

### Morph Target GPU Blending

Morph targets (see the animation recipe) are another form of GPU-side vertex modification. The GPU interpolates between base positions and morph target offsets using `morphTargetInfluences`. This is efficient for predefined shape variations but doesn't support arbitrary per-vertex logic.

## Browser CSG (Constructive Solid Geometry)

CSG applies boolean operations -- union, subtraction, intersection -- to meshes. Subtract a cylinder from a cube to make a hole. Union two shapes to merge them. This is foundational for modeling tools, level editors, and procedural geometry.

### three-bvh-csg

`three-bvh-csg` is the current production-quality browser CSG library. It uses BVH (bounding volume hierarchy) acceleration to make boolean operations fast enough for interactive use.

GitHub: [github.com/gkjohnson/three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg)

```typescript
import { Brush, Evaluator, SUBTRACTION, ADDITION, INTERSECTION } from "three-bvh-csg";

// Create brushes from BufferGeometry
const brushA = new Brush(new THREE.BoxGeometry(2, 2, 2));
brushA.updateMatrixWorld();

const brushB = new Brush(new THREE.CylinderGeometry(0.5, 0.5, 3, 32));
brushB.position.set(0, 0, 0);
brushB.updateMatrixWorld();

// Evaluate the boolean operation
const evaluator = new Evaluator();
const result = evaluator.evaluate(brushA, brushB, SUBTRACTION);

// result is a regular THREE.Mesh you can add to the scene
scene.add(result);
```

### Performance Characteristics

- **10k-triangle meshes**: ~10ms per operation. Fine for user-triggered events (click to cut, click to merge).
- **100k-triangle meshes**: ~100-500ms. Too slow for real-time per-frame updates but acceptable for on-demand operations with a loading indicator.
- **Not suitable for per-frame CSG.** If you need per-frame boolean-like effects (e.g., destructible terrain), use SDF operations (see the Dexels and SDF recipe) or voxel-based approaches instead.

### Tips

- Call `brush.updateMatrixWorld()` after setting position/rotation/scale. The evaluator reads the world matrix, not the local transform.
- The result mesh needs a material assigned: `result.material = new THREE.MeshStandardMaterial({ ... })`.
- For repeated operations on the same base mesh, cache the `Brush` -- don't recreate it each time.

## Dynamic BufferGeometry Patterns

When you need to add or remove geometry at runtime (particles, trails, procedural mesh growth), pre-allocate large buffers and control what's drawn.

### setDrawRange

```typescript
// Pre-allocate for up to 10000 vertices
const maxVertices = 10000;
const positions = new Float32Array(maxVertices * 3);
const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

// Only draw the first 100 vertices initially
let activeCount = 100;
geometry.setDrawRange(0, activeCount);

// Add more vertices over time
function addVertex(x: number, y: number, z: number) {
  const i = activeCount * 3;
  positions[i] = x;
  positions[i + 1] = y;
  positions[i + 2] = z;
  activeCount++;
  geometry.setDrawRange(0, activeCount);
  geometry.attributes.position.needsUpdate = true;
}
```

### Updating Index Buffers

Changing topology (which vertices connect to form triangles) is more expensive because the index buffer must also be re-uploaded:

```typescript
const indices = new Uint32Array(maxTriangles * 3);
geometry.setIndex(new THREE.BufferAttribute(indices, 1));

// After modifying indices
geometry.index!.needsUpdate = true;
```

Avoid topology changes per frame if possible. For dynamic topology (e.g., adaptive mesh refinement), batch changes and apply once per frame rather than per-vertex.

### When to Reach for WebGPU Compute Shaders

If your modification pattern is massively parallel (every vertex gets the same operation with different parameters), WebGPU compute shaders move the entire computation to the GPU. This eliminates the CPU bottleneck and the buffer upload step.

Three.js has experimental WebGPU support via `THREE.WebGPURenderer`. The API is not yet stable, but the pattern is:

1. Write a compute shader that reads and writes to a storage buffer
2. Bind the vertex buffer as a storage buffer
3. Dispatch the compute shader before rendering

This is the right answer when you're modifying 1M+ vertices per frame (fluid simulation, cloth physics, massive particle systems). For simpler cases, the vertex shader approach from the GPU displacement section is easier and more portable.

## Python/C++ to Web Pipeline

Sometimes the geometry modification is too complex for the browser: finite element simulation, advanced boolean operations, mesh repair, or operations requiring libraries not available in JS (CGAL, libigl, OpenVDB). In these cases, run the computation server-side and stream the results to the browser.

### Architecture Pattern

```
Browser (three.js viewer)
  <-- WebSocket / REST -->
Server (Python trimesh / C++ libigl)
  - Receives modification request (e.g., "cut mesh at plane X")
  - Performs operation
  - Serializes result to glTF binary
  - Sends back to browser
```

### WebSocket Streaming

For interactive workflows (user drags a cutting plane, server recomputes in real time):

```python
# Server (Python, using websockets)
import asyncio
import websockets
import trimesh
import json

async def handle(websocket):
    mesh = trimesh.load("base_model.glb")

    async for message in websocket:
        params = json.loads(message)

        # Apply modification
        plane_origin = params["plane_origin"]
        plane_normal = params["plane_normal"]
        sliced = mesh.slice_plane(plane_origin, plane_normal)

        # Serialize to GLB and send
        glb_bytes = sliced.export(file_type="glb")
        await websocket.send(glb_bytes)
```

```typescript
// Client (three.js)
const ws = new WebSocket("ws://localhost:8765");
ws.binaryType = "arraybuffer";

ws.onmessage = (event) => {
  const blob = new Blob([event.data]);
  const url = URL.createObjectURL(blob);
  loader.load(url, (gltf) => {
    // Replace the current mesh
    scene.remove(currentModel);
    currentModel = gltf.scene;
    scene.add(currentModel);
    URL.revokeObjectURL(url);
  });
};

// Send modification request when user interacts
function onCutPlaneChange(origin: number[], normal: number[]) {
  ws.send(JSON.stringify({ plane_origin: origin, plane_normal: normal }));
}
```

### When Server-side Is the Right Answer

- **Complex simulations**: FEA, CFD, or physics simulations that require HPC compute and feed results to a web frontend for visualization.
- **Library-dependent operations**: anything requiring CGAL, OpenVDB, PCL, or other C++ libraries with no JS equivalent.
- **Large meshes**: operations on 10M+ triangle meshes that would exhaust browser memory.
- **Batch processing**: generating geometry variations (e.g., parametric design) where the server pre-computes and the browser just displays.

The tradeoff is latency. A local browser CSG operation takes 10ms. A server roundtrip takes 50-200ms minimum. For drag-to-sculpt interactions, keep it in the browser. For compute-heavy one-shot operations, use the server.
