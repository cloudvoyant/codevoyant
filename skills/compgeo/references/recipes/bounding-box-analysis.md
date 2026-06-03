# Bounding Box Analysis

Before you do anything expensive with geometry — intersection tests, physics simulation, rendering culling — you need a fast approximation of where that geometry lives in space. Bounding volumes give you that approximation, and the choice between AABB, OBB, and bounding sphere determines the tradeoff between tightness, computation cost, and stability under transformation.

## Why This Matters

A bounding volume is a simple shape that fully encloses a complex mesh. You use it everywhere:

- **Frustum culling** — skip rendering objects outside the camera view. AABBs are standard here.
- **Broad-phase collision** — test cheap AABB/sphere overlap before expensive mesh-mesh intersection.
- **LOD selection** — use bounding volume size in screen space to pick detail level.
- **Spatial indexing** — BVH trees (covered in the ray-tracing recipe) are built from bounding volumes.
- **Packing and layout** — fit objects into containers, compute arrangement density.
- **Normalization** — scale a mesh to fit a unit cube using its bounding box dimensions.

The three standard bounding volumes, in order of increasing tightness and cost:

| Volume | Fits tightly? | Rotation-stable? | Cost to compute | Cost to test overlap |
|--------|--------------|-------------------|-----------------|---------------------|
| AABB | No — loose for rotated objects | No — changes with orientation | O(n) one pass | O(1) six comparisons |
| OBB | Yes — tightest box | Yes — rotates with object | O(n) + PCA or rotating calipers | O(1) SAT test (15 axes) |
| Min enclosing sphere | Moderate | Yes | O(n) expected linear | O(1) distance check |

## AABB (Axis-Aligned Bounding Box)

The AABB is the min/max extent of the geometry along each world axis. Dead simple to compute, dead simple to test for overlap. The downside: it bloats for objects that aren't aligned with the axes. A long diagonal beam gets an AABB much larger than its actual volume.

### Python

```python
import trimesh

mesh = trimesh.load("model.obj")

# trimesh gives you the AABB directly
aabb = mesh.bounding_box           # trimesh.primitives.Box
bounds = mesh.bounds               # (2, 3) array: [[min_x, min_y, min_z], [max_x, max_y, max_z]]
extents = mesh.bounding_box.extents  # [width, height, depth]

# The corners of the AABB
corners = mesh.bounding_box.vertices  # (8, 3)

# Manual computation from vertices (useful when trimesh isn't available)
import numpy as np
min_corner = np.min(mesh.vertices, axis=0)
max_corner = np.max(mesh.vertices, axis=0)
```

### C++

```cpp
#include <Eigen/Dense>

// Given vertices as Eigen::MatrixXd (N x 3)
Eigen::Vector3d min_corner = vertices.colwise().minCoeff();
Eigen::Vector3d max_corner = vertices.colwise().maxCoeff();
Eigen::Vector3d extents = max_corner - min_corner;
Eigen::Vector3d center = (min_corner + max_corner) * 0.5;
```

### AABB overlap test

Two AABBs overlap if and only if they overlap on all three axes:

```cpp
bool aabb_overlap(const Eigen::Vector3d& min_a, const Eigen::Vector3d& max_a,
                  const Eigen::Vector3d& min_b, const Eigen::Vector3d& max_b) {
    return (min_a.x() <= max_b.x() && max_a.x() >= min_b.x()) &&
           (min_a.y() <= max_b.y() && max_a.y() >= min_b.y()) &&
           (min_a.z() <= max_b.z() && max_a.z() >= min_b.z());
}
```

### When AABB breaks down

Rotate an object 45 degrees and the AABB grows. For objects that rotate frequently (game entities, robotic arms), AABBs must be recomputed every frame. This is cheap (one pass over vertices), but the increasing looseness means more false positives in your broad-phase collision.

## OBB (Oriented Bounding Box)

The OBB is the tightest-fitting box, aligned with the object's principal axes rather than the world axes. It stays tight regardless of orientation, which makes it better for collision detection on rotated objects.

### Python

```python
import trimesh

mesh = trimesh.load("model.obj")

# trimesh computes a PCA-based OBB
obb = mesh.bounding_box_oriented
obb_transform = obb.primitive.transform  # 4x4 matrix: position + rotation
obb_extents = obb.primitive.extents      # [width, height, depth] in local frame
```

Trimesh uses PCA (Principal Component Analysis) on the vertex positions to find the orientation. PCA-based OBBs are not guaranteed to be the minimum-volume OBB, but they're a good approximation and fast to compute. For exact minimum-volume OBB, use CGAL.

### C++ with CGAL

```cpp
#include <CGAL/Exact_predicates_inexact_constructions_kernel.h>
#include <CGAL/oriented_bounding_box.h>
#include <CGAL/Surface_mesh.h>

using K = CGAL::Exact_predicates_inexact_constructions_kernel;
using Mesh = CGAL::Surface_mesh<K::Point_3>;

Mesh mesh;
// ... load mesh ...

std::array<K::Point_3, 8> obb_corners;
CGAL::oriented_bounding_box(mesh, obb_corners);
```

CGAL's `oriented_bounding_box` computes the minimum-volume OBB using rotating calipers on the convex hull. It's exact but slower than PCA.

CGAL OBB docs: [doc.cgal.org/latest/Optimal_bounding_box/](https://doc.cgal.org/latest/Optimal_bounding_box/)

### When OBB is worth the cost

Use OBB when objects are long, thin, or diagonal — where the AABB would waste volume. If your objects are roughly spherical or axis-aligned, AABB is fine and cheaper.

## Min Enclosing Sphere

The minimum enclosing sphere (also called the bounding sphere or miniball) is the smallest sphere containing all vertices. It's orientation-invariant and has the cheapest overlap test (single distance comparison), but it's usually the loosest fit for non-spherical objects.

### Python

```python
import trimesh

mesh = trimesh.load("model.obj")
sphere = mesh.bounding_sphere
center = sphere.primitive.center
radius = sphere.primitive.radius
```

For standalone computation without trimesh, the `miniball` package implements Welzl's algorithm:

```python
import miniball
import numpy as np

# miniball expects a list of points
result = miniball.get_bounding_ball(np.array(mesh.vertices))
center, radius_squared = result
radius = np.sqrt(radius_squared)
```

### C++ with CGAL

```cpp
#include <CGAL/Exact_predicates_inexact_constructions_kernel.h>
#include <CGAL/Min_sphere_of_spheres_d.h>

using K = CGAL::Exact_predicates_inexact_constructions_kernel;
using MinSphere = CGAL::Min_sphere_of_spheres_d<
    CGAL::Min_sphere_of_spheres_d_traits_3<K, K::FT>>;

// Wrap each point as a zero-radius sphere
std::vector<typename MinSphere::Sphere> spheres;
for (auto& pt : points) {
    spheres.emplace_back(pt, 0.0);
}
MinSphere ms(spheres.begin(), spheres.end());
auto center = ms.center();
auto radius = std::sqrt(ms.discriminant());
```

CGAL miniball docs: [doc.cgal.org/latest/Bounding_volumes/](https://doc.cgal.org/latest/Bounding_volumes/)

### When to use bounding spheres

Bounding spheres work well for worst-case radius queries ("is anything within distance R?"), for objects that tumble freely (the sphere doesn't change under rotation), and as a first-pass culling step before AABB checks.

## Hierarchical Bounding Volumes

A single bounding volume per mesh only gets you so far. For ray casting, closest-point queries, and narrow-phase collision, you need a tree of bounding volumes — a BVH (Bounding Volume Hierarchy). Each leaf node holds a few triangles with a tight AABB; internal nodes hold the union AABB of their children. This gives O(log n) query time instead of O(n).

BVH construction and traversal are covered in depth in the [ray-tracing recipe](./ray-tracing.md). The key decision here is which bounding volume type to use at each node: AABB is almost always the right choice for BVH nodes because the overlap test is so cheap.

## Practical Patterns

**Broad-phase collision with AABB.** Before testing whether two meshes actually intersect (expensive), test their AABBs. If the AABBs don't overlap, the meshes can't intersect. This one check eliminates the vast majority of pairs in an N-body simulation.

```python
import trimesh

mesh_a = trimesh.load("a.obj")
mesh_b = trimesh.load("b.obj")

# Quick rejection
bounds_a = mesh_a.bounds  # [[min_x, min_y, min_z], [max_x, max_y, max_z]]
bounds_b = mesh_b.bounds

overlap = all(
    bounds_a[0][i] <= bounds_b[1][i] and bounds_a[1][i] >= bounds_b[0][i]
    for i in range(3)
)

if overlap:
    # Now do the expensive intersection test
    intersection = trimesh.boolean.intersection([mesh_a, mesh_b])
```

**Normalizing mesh scale.** When combining meshes from different sources, normalize them to a common bounding box. The standard approach is to translate the center to the origin and scale so the longest extent equals 1.0:

```python
import numpy as np

center = (mesh.bounds[0] + mesh.bounds[1]) / 2.0
mesh.vertices -= center

scale = np.max(mesh.bounding_box.extents)
mesh.vertices /= scale
```

**Extracting physical dimensions.** For games and simulation, you often need the width/height/depth of an object. The AABB extents give you this directly — but remember they're axis-aligned, so a rotated object's "width" might not be what you expect. Use OBB extents if you need dimensions in the object's local frame.
