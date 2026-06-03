# Dexels and Signed Distance Fields

Dexels and signed distance fields (SDFs) are two implicit representations of geometry — neither stores explicit triangles, but both encode shape in ways that enable operations that are awkward or expensive on meshes. Dexels are niche (CNC simulation, certain collision detectors). SDFs are foundational — they underpin boolean operations, raymarching renderers, procedural modeling, physics collision, and level-of-detail systems. If you work in computational geometry long enough, you will need SDFs.

## What a Dexel Is

A dexel ("depth element") is a column-based representation. Imagine casting a ray along one axis (say Z) through a regular 2D grid. For each grid cell, you record the Z values where the ray enters and exits solid material. Each enter/exit pair is one dexel segment.

```
Grid cell (x, y):
  Ray enters solid at z=2.0, exits at z=5.0
  Ray enters solid again at z=8.0, exits at z=9.5
  → Two dexel segments: [2.0, 5.0] and [8.0, 9.5]
```

Dexels are used primarily in:
- **CNC machining simulation**: the cutting tool sweeps through a dexel model of the stock, subtracting material. Dexel subtraction is fast — just clip intervals along each column.
- **Collision detection**: testing whether a point is inside the solid is a 1D interval check after locating the correct column.
- **Height field representation**: a single-dexel-per-column model is equivalent to a height map.

Dexels have a fundamental limitation: they can only represent geometry that's well-defined along the chosen axis. Overhangs and cavities along the axis direction are captured, but undercuts perpendicular to it may be missed. Multi-axis dexels (XY, XZ, YZ) partially address this.

Most developers won't implement dexels from scratch. Know the concept for when you encounter it in CNC simulation literature or existing codebases. For general-purpose implicit geometry, SDFs are more versatile.

## What an SDF Is

A signed distance field is a scalar field where each point in space stores its signed distance to the nearest surface:
- **Positive values** = outside the object
- **Negative values** = inside the object
- **Zero** = exactly on the surface

Why this representation is powerful:
- **Point-inside queries** are a single lookup: `sdf(point) < 0` means inside
- **Boolean operations** reduce to min/max of scalar fields — no mesh intersection algorithm needed
- **Smooth blending** between shapes is trivial with smooth min/max functions
- **Raymarching** renders SDFs directly without mesh extraction
- **Gradient of the SDF** at any point gives you the surface normal direction
- **Distance queries** are built in — the field value IS the distance

## Generating an SDF from a Mesh

### Python: trimesh

Query the signed distance at arbitrary points:

```python
import trimesh
import numpy as np

mesh = trimesh.load("model.obj")

# Query specific points
points = np.array([[0, 0, 0], [1, 1, 1], [0.5, 0.5, 0.5]])
distances = trimesh.proximity.signed_distance(mesh, points)
# Positive = outside, negative = inside (trimesh convention)

for pt, d in zip(points, distances):
    status = "inside" if d < 0 else "outside"
    print(f"{pt}: distance = {d:.4f} ({status})")
```

Generate a dense SDF volume on a regular grid:

```python
import trimesh
import numpy as np

mesh = trimesh.load("model.obj")

# Create a regular 3D grid covering the mesh bounding box
resolution = 64
bounds = mesh.bounds  # [[min_x, min_y, min_z], [max_x, max_y, max_z]]
padding = (bounds[1] - bounds[0]) * 0.1  # 10% padding

x = np.linspace(bounds[0][0] - padding[0], bounds[1][0] + padding[0], resolution)
y = np.linspace(bounds[0][1] - padding[1], bounds[1][1] + padding[1], resolution)
z = np.linspace(bounds[0][2] - padding[2], bounds[1][2] + padding[2], resolution)

# Create grid of query points
xx, yy, zz = np.meshgrid(x, y, z, indexing='ij')
grid_points = np.column_stack([xx.ravel(), yy.ravel(), zz.ravel()])

# Evaluate SDF at all grid points
sdf_values = trimesh.proximity.signed_distance(mesh, grid_points)
sdf_volume = sdf_values.reshape(resolution, resolution, resolution)

# sdf_volume is now a 3D numpy array you can use with marching cubes, boolean ops, etc.
```

Note: computing a dense SDF is O(resolution^3 * mesh_complexity). For large meshes and high resolutions, this can be slow. Consider using a spatial acceleration structure (the mesh's BVH handles this internally in trimesh) and computing only near-surface values for sparse representations.

### C++: libigl

libigl provides signed distance computation with multiple methods for sign determination:

```cpp
#include <igl/signed_distance.h>

Eigen::MatrixXd V;  // mesh vertices (N x 3)
Eigen::MatrixXi F;  // mesh faces (M x 3)
Eigen::MatrixXd P;  // query points (Q x 3)

Eigen::VectorXd S;   // signed distances
Eigen::VectorXi I;   // closest face indices
Eigen::MatrixXd C;   // closest points on surface
Eigen::MatrixXd N;   // closest face normals

igl::signed_distance(P, V, F,
    igl::SIGNED_DISTANCE_TYPE_PSEUDONORMAL,  // sign method
    S, I, C, N);
```

Sign determination methods:
- `SIGNED_DISTANCE_TYPE_PSEUDONORMAL`: uses face normals at the closest point. Fast and robust for watertight meshes.
- `SIGNED_DISTANCE_TYPE_WINDING_NUMBER`: uses generalized winding number. Works on non-watertight meshes but slower. Preferred when mesh quality is uncertain.

CMake setup:

```cmake
find_package(libigl REQUIRED)
target_link_libraries(myapp PRIVATE igl::core)
```

libigl signed distance docs: [libigl.github.io/tutorial](https://libigl.github.io/tutorial/)

### C++: OpenVDB

OpenVDB is the production path for SDF generation and storage. Its sparse grid representation stores values only near the surface, making it memory-efficient for large volumes.

```cpp
#include <openvdb/openvdb.h>
#include <openvdb/tools/MeshToVolume.h>

openvdb::initialize();

// Convert mesh data to OpenVDB format
std::vector<openvdb::Vec3s> points;    // vertex positions
std::vector<openvdb::Vec3I> triangles; // face indices
// ... fill from your mesh

// Create SDF grid
float voxel_size = 0.01f;  // world-space voxel size
float half_bandwidth = 3.0f;  // number of voxels in the narrow band

openvdb::FloatGrid::Ptr grid = openvdb::tools::meshToSignedDistanceField<openvdb::FloatGrid>(
    *openvdb::math::Transform::createLinearTransform(voxel_size),
    points, triangles,
    std::vector<openvdb::Vec4I>(),  // quads (empty)
    half_bandwidth, half_bandwidth
);

// The grid stores SDF values only in a narrow band around the surface
// Voxels far from the surface have a background value (positive = outside)
```

The `half_bandwidth` controls how many voxels away from the surface are stored explicitly. A bandwidth of 3 means SDF values are computed for voxels within 3 voxel-widths of the surface; everything else gets the background value. Narrower bands use less memory; wider bands are needed for operations like smooth blending.

OpenVDB mesh-to-volume docs: [openvdb.org/documentation/doxygen/codeExamples.html](https://www.openvdb.org/documentation/doxygen/codeExamples.html)

## SDF Boolean Operations

The killer feature of SDFs: boolean operations become trivial scalar math. No mesh intersection algorithms, no topological surgery, no degenerate triangle handling.

Given two SDF fields A and B:

| Operation | Formula | Intuition |
|-----------|---------|-----------|
| Union | `min(A, B)` | Take the closer surface (smaller distance) |
| Intersection | `max(A, B)` | Take the farther surface (larger distance) |
| Subtraction | `max(A, -B)` | A but not B: keep A where B is outside, negate B's sign |

### Python: numpy

When both SDFs are dense 3D numpy arrays on the same grid:

```python
import numpy as np

# Assume sdf_a and sdf_b are (resolution, resolution, resolution) arrays

# Union
sdf_union = np.minimum(sdf_a, sdf_b)

# Intersection
sdf_intersection = np.maximum(sdf_a, sdf_b)

# Subtraction (A minus B)
sdf_subtraction = np.maximum(sdf_a, -sdf_b)
```

### Smooth Boolean Operations

Sharp booleans create hard edges at the intersection. For organic or blended shapes, use smooth min/max:

```python
def smooth_union(a, b, k=0.1):
    """Smooth minimum with blending radius k."""
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return a * h + b * (1 - h) - k * h * (1 - h)

def smooth_subtraction(a, b, k=0.1):
    """Smooth subtraction: A minus B with blending radius k."""
    return -smooth_union(-a, b, k)

def smooth_intersection(a, b, k=0.1):
    """Smooth maximum with blending radius k."""
    return -smooth_union(-a, -b, k)

# Apply
sdf_blended = smooth_union(sdf_a, sdf_b, k=0.05)
```

The `k` parameter controls the blending radius. Larger k gives a smoother, more rounded join. k=0 reduces to the sharp boolean.

### C++: OpenVDB

OpenVDB provides optimized CSG operations on sparse grids:

```cpp
#include <openvdb/tools/Composite.h>

openvdb::FloatGrid::Ptr grid_a = ...;
openvdb::FloatGrid::Ptr grid_b = ...;

// Union (modifies grid_a in place)
openvdb::tools::csgUnion(*grid_a, *grid_b);

// Subtraction: A minus B (modifies grid_a in place)
openvdb::tools::csgDifference(*grid_a, *grid_b);

// Intersection (modifies grid_a in place)
openvdb::tools::csgIntersection(*grid_a, *grid_b);
```

These operations work on the sparse narrow-band representation, so they're efficient even for very large volumes. The bandwidth is automatically adjusted to maintain a valid SDF after the operation.

## Raymarching an SDF

Raymarching (sphere tracing) renders an SDF directly without extracting a mesh. The algorithm: start at the camera, march along the ray direction. At each step, query the SDF — the distance value tells you how far you can safely step without crossing the surface. When the distance drops below a threshold, you've hit the surface.

```
p = ray_origin
for step in range(max_steps):
    d = sdf(p)
    if d < epsilon:
        # hit: p is on the surface
        normal = gradient(sdf, p)  # surface normal from SDF gradient
        break
    p += ray_direction * d  # safe to step by d
```

This is elegant: each step size is adaptive. Near the surface, steps are tiny and precise. Far from the surface, steps are large and fast. No BVH needed.

### GLSL Snippet (for three.js / WebGL)

A basic sphere tracer as a fragment shader, suitable for use with three.js `ShaderMaterial`:

```glsl
uniform vec3 cameraPos;
uniform mat4 invProjectionMatrix;
uniform mat4 invViewMatrix;

// Your SDF function — replace with actual geometry
float sceneSDF(vec3 p) {
    // Example: sphere of radius 1 at origin
    float sphere = length(p) - 1.0;
    // Example: box of size 0.8
    vec3 d = abs(p) - vec3(0.8);
    float box = length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
    // Smooth union
    float k = 0.2;
    float h = clamp(0.5 + 0.5 * (box - sphere) / k, 0.0, 1.0);
    return mix(box, sphere, h) - k * h * (1.0 - h);
}

vec3 calcNormal(vec3 p) {
    float e = 0.001;
    return normalize(vec3(
        sceneSDF(p + vec3(e, 0, 0)) - sceneSDF(p - vec3(e, 0, 0)),
        sceneSDF(p + vec3(0, e, 0)) - sceneSDF(p - vec3(0, e, 0)),
        sceneSDF(p + vec3(0, 0, e)) - sceneSDF(p - vec3(0, 0, e))
    ));
}

void main() {
    // Reconstruct ray from fragment coordinates
    vec2 uv = gl_FragCoord.xy / resolution.xy * 2.0 - 1.0;
    vec4 clipPos = vec4(uv, -1.0, 1.0);
    vec4 viewPos = invProjectionMatrix * clipPos;
    viewPos = vec4(viewPos.xy / viewPos.w, -1.0, 0.0);
    vec3 rayDir = normalize((invViewMatrix * viewPos).xyz);
    vec3 rayOrigin = cameraPos;

    // Sphere trace
    float t = 0.0;
    for (int i = 0; i < 128; i++) {
        vec3 p = rayOrigin + rayDir * t;
        float d = sceneSDF(p);
        if (d < 0.001) {
            vec3 normal = calcNormal(p);
            // Simple diffuse lighting
            float light = max(dot(normal, normalize(vec3(1, 1, 1))), 0.0);
            gl_FragColor = vec4(vec3(0.2 + 0.8 * light), 1.0);
            return;
        }
        t += d;
        if (t > 100.0) break;
    }
    gl_FragColor = vec4(0.0);  // miss: background
}
```

When to use raymarching:
- **Procedural shapes**: SDF primitives (spheres, boxes, toruses) combined with boolean ops — no mesh needed
- **Metaballs / organic shapes**: smooth unions of many primitives
- **Level editors**: real-time preview of CSG operations
- **Artistic rendering**: Shadertoy-style effects

When not to use raymarching:
- **Complex meshes**: converting a detailed mesh to an SDF and raymarching it is slower than rasterizing the mesh directly
- **Existing rendering pipeline**: if you already have a rasterization pipeline, adding a raymarching pass adds complexity

## SDF to Mesh

When you need to export an SDF as a mesh (for 3D printing, game engine import, etc.), you're back to Marching Cubes. The SDF volume IS the scalar field that Marching Cubes operates on; the isovalue is 0.0 (the zero-crossing surface).

```python
from skimage.measure import marching_cubes

# sdf_volume is your (resolution, resolution, resolution) numpy array
vertices, faces, normals, _ = marching_cubes(sdf_volume, level=0.0)

# Scale vertices back to world coordinates
# marching_cubes returns vertices in grid index space
vertices = vertices * voxel_size + grid_origin
```

In C++ with OpenVDB:

```cpp
#include <openvdb/tools/VolumeToMesh.h>

std::vector<openvdb::Vec3s> points;
std::vector<openvdb::Vec3I> triangles;
std::vector<openvdb::Vec4I> quads;

openvdb::tools::volumeToMesh(*grid, points, triangles, quads, 0.0);
```

See the mesh-reconstruction recipe for decimation and quality checks after extraction.

## Practical Patterns

### Storing SDF as OpenVDB Grid for Streaming

OpenVDB's `.vdb` file format stores sparse grids efficiently. An SDF with a narrow bandwidth of 3 voxels stores only ~6 voxel layers regardless of volume size. This makes it practical to stream large environments:

```cpp
openvdb::io::File file("scene.vdb");
file.write({grid});
file.close();

// Later: load specific grids by name
openvdb::io::File file("scene.vdb");
file.open();
openvdb::FloatGrid::Ptr grid = openvdb::gridPtrCast<openvdb::FloatGrid>(
    file.readGrid("my_sdf"));
```

### SDF for Physics Collision

SDF collision detection is a single lookup plus gradient:

```python
def sdf_collision(sdf_func, particle_pos, particle_radius):
    """Check if a sphere collides with the SDF surface."""
    d = sdf_func(particle_pos)
    penetration = particle_radius - d
    if penetration > 0:
        # Collision: compute normal from SDF gradient
        eps = 1e-4
        normal = np.array([
            sdf_func(particle_pos + [eps, 0, 0]) - sdf_func(particle_pos - [eps, 0, 0]),
            sdf_func(particle_pos + [0, eps, 0]) - sdf_func(particle_pos - [0, eps, 0]),
            sdf_func(particle_pos + [0, 0, eps]) - sdf_func(particle_pos - [0, 0, eps]),
        ])
        normal = normal / np.linalg.norm(normal)
        # Push particle out by penetration depth along normal
        corrected_pos = particle_pos + normal * penetration
        return True, corrected_pos, normal
    return False, particle_pos, None
```

This is O(1) per query (for a dense SDF) or O(log n) (for a sparse SDF like OpenVDB). Compare to mesh-based collision which requires BVH traversal and triangle intersection tests.

### SDF-Based Level of Detail

Render the SDF at different resolutions depending on camera distance:
- **Near camera**: fine grid (high resolution MC extraction or direct raymarching)
- **Far from camera**: coarse grid (fewer triangles, faster rendering)

OpenVDB supports multi-resolution grids natively. You can also pre-compute multiple SDF resolutions and switch between them based on distance — similar to mipmapping for textures but applied to 3D geometry.
