# Ray Tracing on Geometry

Ray tracing answers spatial questions: "does this ray hit the object?", "what's the first surface the sensor sees?", "which faces are visible from this viewpoint?" This recipe covers ray tracing as a geometry query tool, not as a path tracing renderer. The focus is on intersection testing, acceleration structures, and practical patterns like LiDAR simulation and visibility culling.

## Why This Matters

Anywhere you need to ask "what does this ray see?", you need ray tracing. Concrete use cases:

- **Collision detection**: cast a ray from a moving object's future position to check for obstacles
- **LiDAR simulation**: generate synthetic point clouds from a mesh by casting thousands of rays from a virtual sensor
- **Shadow casting**: determine which surfaces are illuminated by checking line-of-sight to each light
- **Visibility culling**: find which faces of a mesh are visible from a camera position (for texture projection, inspection planning)
- **Depth maps**: render depth images from arbitrary viewpoints without a full rendering pipeline
- **Point cloud generation**: sample a mesh surface by casting rays and recording hit positions

Brute-force ray-triangle intersection is O(n) per ray, where n is the number of triangles. For a mesh with 100k triangles and 10k rays, that's a billion intersection tests. Acceleration structures make this tractable.

## What a BVH Is

A Bounding Volume Hierarchy (BVH) is a tree of nested bounding boxes. Each leaf node contains a small set of triangles; each internal node contains the bounding box of all its children. To test a ray, you walk the tree: if the ray misses a node's bounding box, you skip its entire subtree.

The result: O(log n) intersection tests per ray instead of O(n). Building the BVH costs O(n log n) upfront, so it pays off when you're casting more than a handful of rays.

Two common variants:
- **BVH with axis-aligned bounding boxes (AABB)**: the most common. Simple to build and traverse. Used by Embree, trimesh, and most production systems.
- **BSP trees (Binary Space Partitioning)**: split space with planes rather than bounding boxes. Can be faster for certain scene configurations but harder to build well.

The practical choice: use AABB-based BVH via a library. Building your own BVH is educational but not necessary when Embree and trimesh exist.

## Python: trimesh RayMeshIntersector

Trimesh provides a built-in ray caster that builds a BVH automatically. It's good for prototyping and moderate ray counts (up to ~10k rays).

```python
import trimesh
import numpy as np

mesh = trimesh.load("model.obj")

# Create the intersector (builds BVH internally)
intersector = trimesh.ray.ray_triangle.RayMeshIntersector(mesh)

# Define rays: origins and directions (both Nx3 arrays)
origins = np.array([[0, 0, 10], [1, 0, 10], [2, 0, 10]])
directions = np.array([[0, 0, -1], [0, 0, -1], [0, 0, -1]])  # shooting downward

# Full intersection: returns hit locations, ray indices, and face indices
hit_locations, ray_indices, face_indices = intersector.intersects_location(
    ray_origins=origins,
    ray_directions=directions
)

for i in range(len(hit_locations)):
    print(f"Ray {ray_indices[i]} hit face {face_indices[i]} at {hit_locations[i]}")
```

For occlusion queries where you only need the first hit (faster):

```python
# First hit only — returns (N,) arrays: face index per ray (-1 if no hit)
index_tri, index_ray, locations = intersector.intersects_id(
    ray_origins=origins,
    ray_directions=directions,
    return_locations=True,
    multiple_hits=False
)
```

Batch querying is the key to performance in trimesh. Avoid looping over individual rays — pass all origins and directions as arrays and let numpy handle the vectorization.

trimesh ray docs: [trimesh.org/trimesh.ray.html](https://trimesh.org/trimesh.ray.html)

## Python: Intel Embree via pyembree

When trimesh's built-in ray caster isn't fast enough (>10k rays, real-time requirements, secondary rays), reach for Embree through the `pyembree` or `trimesh[easy]` backend. Embree is Intel's production ray tracing kernel — it uses SIMD and packet tracing for 10-100x speedup over pure Python/numpy.

Trimesh can use Embree as a drop-in backend:

```python
import trimesh

mesh = trimesh.load("model.obj")

# If pyembree is installed, trimesh.ray.ray_pyembree is available
# trimesh automatically prefers Embree when installed
intersector = trimesh.ray.ray_pyembree.RayMeshIntersector(mesh)

# Same API as before
origins = np.array([[0, 0, 10]])
directions = np.array([[0, 0, -1]])
hit_locations, ray_indices, face_indices = intersector.intersects_location(
    ray_origins=origins,
    ray_directions=directions
)
```

Install pyembree: `pip install pyembree`. On some platforms you may need to install from conda: `conda install -c conda-forge pyembree`.

When to use Embree:
- More than 10,000 rays
- Iterative algorithms (secondary rays, path tracing, multiple bounce)
- Real-time or interactive applications
- Large meshes (>1M triangles) where BVH quality matters

## C++: Intel Embree

Embree in C++ gives you full control over the ray tracing pipeline: device creation, scene construction, geometry attachment, BVH building, and ray queries.

```cpp
#include <embree4/rtcore.h>

// Create device and scene
RTCDevice device = rtcNewDevice(nullptr);
RTCScene scene = rtcNewScene(device);

// Create triangle geometry
RTCGeometry geom = rtcNewGeometry(device, RTC_GEOMETRY_TYPE_TRIANGLE);

// Set vertex buffer
float* vertices = (float*)rtcSetNewGeometryBuffer(
    geom, RTC_BUFFER_TYPE_VERTEX, 0, RTC_FORMAT_FLOAT3,
    3 * sizeof(float), num_vertices);
// ... fill vertices from your mesh

// Set index buffer
unsigned* indices = (unsigned*)rtcSetNewGeometryBuffer(
    geom, RTC_BUFFER_TYPE_INDEX, 0, RTC_FORMAT_UINT3,
    3 * sizeof(unsigned), num_triangles);
// ... fill indices from your mesh

rtcCommitGeometry(geom);
rtcAttachGeometry(scene, geom);
rtcReleaseGeometry(geom);
rtcCommitScene(scene);  // builds the BVH

// Cast a single ray
RTCRayHit rayhit;
rayhit.ray.org_x = 0.0f; rayhit.ray.org_y = 0.0f; rayhit.ray.org_z = 10.0f;
rayhit.ray.dir_x = 0.0f; rayhit.ray.dir_y = 0.0f; rayhit.ray.dir_z = -1.0f;
rayhit.ray.tnear = 0.0f;
rayhit.ray.tfar = std::numeric_limits<float>::infinity();
rayhit.hit.geomID = RTC_INVALID_GEOMETRY_ID;

rtcIntersect1(scene, &rayhit);

if (rayhit.hit.geomID != RTC_INVALID_GEOMETRY_ID) {
    // Hit: rayhit.hit.primID = triangle index
    //       rayhit.ray.tfar = distance to hit
    //       rayhit.hit.Ng_x/y/z = unnormalized geometry normal
}
```

For performance-critical applications, use stream (packet) queries instead of single rays:

```cpp
// Ray packet of 4/8/16 rays (SIMD width dependent)
RTCRayHit4 rayhit4;
// ... fill 4 rays
int valid[4] = {-1, -1, -1, -1};  // -1 = active
rtcIntersect4(valid, scene, &rayhit4);
```

Coherent rays (similar origins and directions, like a camera frustum) benefit most from packet queries. Incoherent rays (random directions, like ambient occlusion) see less speedup from packets.

CMake setup:

```cmake
find_package(embree 4 REQUIRED)
target_link_libraries(myapp PRIVATE embree)
```

Embree API reference: [embree.org/api.html](https://www.embree.org/api.html)

## C++: OptiX (GPU Ray Tracing)

When you need to cast millions of rays per frame (real-time LiDAR simulation, interactive visibility), CPU-based Embree may not be enough. NVIDIA OptiX provides GPU-accelerated ray tracing using RT cores on RTX hardware.

OptiX is a full pipeline: you write programs (ray generation, closest hit, any hit, miss) that the GPU executes in parallel. The learning curve is steep — you're writing GPU programs, managing device memory, and configuring a pipeline.

When to reach for OptiX:
- More than 10 million rays per frame
- Real-time requirements (<16ms per frame)
- GPU already in the pipeline (e.g., you're rendering too)

When not to reach for OptiX:
- Offline/batch processing where Embree is fast enough
- No NVIDIA GPU available
- Prototype stage where development speed matters more than runtime speed

For most computational geometry use cases, Embree on CPU is the right choice. OptiX is for the cases where you've profiled and Embree isn't fast enough.

OptiX programming guide: [developer.nvidia.com/rtx/ray-tracing/optix](https://developer.nvidia.com/rtx/ray-tracing/optix)

## Ray-Voxel Intersection

When your geometry is represented as a voxel grid rather than a triangle mesh, you need a different traversal strategy. The Digital Differential Analyzer (DDA) algorithm steps through voxels along the ray path, visiting each voxel the ray passes through in order.

DDA intuition: given a ray direction, compute how far you must travel to cross the next voxel boundary along each axis. Always step along the axis with the smallest next-crossing distance. This visits every voxel the ray touches, in order, with no skipped cells.

### Python

Open3D provides raycasting on triangle meshes that can be used with voxelized geometry by converting back to mesh first. For direct voxel raycasting:

```python
import open3d as o3d
import numpy as np

mesh = o3d.io.read_triangle_mesh("model.obj")

# RaycastingScene works with triangle meshes
scene = o3d.t.geometry.RaycastingScene()
scene.add_triangles(o3d.t.geometry.TriangleMesh.from_legacy(mesh))

# Cast rays
rays = o3d.core.Tensor(
    [[0, 0, 10, 0, 0, -1]],  # [ox, oy, oz, dx, dy, dz]
    dtype=o3d.core.Dtype.Float32
)
result = scene.cast_rays(rays)
# result['t_hit'] = distances, result['primitive_ids'] = face indices
```

### C++: OpenVDB

For sparse voxel grids, OpenVDB provides a DDA-based ray tracer:

```cpp
#include <openvdb/openvdb.h>
#include <openvdb/tools/RayIntersector.h>

openvdb::FloatGrid::Ptr grid = ...;  // your SDF or level set grid

openvdb::tools::LevelSetRayIntersector<openvdb::FloatGrid> intersector(*grid);

openvdb::math::Ray<double> ray(
    openvdb::math::Vec3d(0, 0, 10),   // origin
    openvdb::math::Vec3d(0, 0, -1)    // direction
);

openvdb::math::Vec3d hit;
if (intersector.intersectsWS(ray, hit)) {
    // hit contains the world-space intersection point
}
```

OpenVDB ray docs: [openvdb.org/documentation/doxygen/codeExamples.html](https://www.openvdb.org/documentation/doxygen/codeExamples.html)

## Ray-Point Cloud Intersection

Point clouds have no surfaces, so there's no true ray-surface intersection. Instead, you approximate: find the points closest to the ray and decide whether any of them are "close enough" to count as a hit.

The practical approach: for each ray, query a k-d tree for points within a radius of the ray line.

```python
import numpy as np
from scipy.spatial import KDTree

points = np.random.rand(10000, 3)  # your point cloud
tree = KDTree(points)

ray_origin = np.array([0, 0, 0])
ray_direction = np.array([1, 0, 0])
ray_direction = ray_direction / np.linalg.norm(ray_direction)

# Sample points along the ray and query nearby cloud points
t_values = np.linspace(0, 10, 100)
ray_points = ray_origin + np.outer(t_values, ray_direction)

# For each sample, find nearest point cloud point
distances, indices = tree.query(ray_points)

# "Hit" if any sample is within threshold distance of a cloud point
threshold = 0.05
hit_mask = distances < threshold
if hit_mask.any():
    first_hit_t = t_values[hit_mask][0]
    nearest_point = points[indices[hit_mask][0]]
```

This is approximate. It works well for:
- Dense point clouds where the spacing is smaller than the threshold
- Applications where approximate hits are acceptable (e.g., selecting a region of a point cloud by clicking)

It does not work well for:
- Sparse point clouds
- Applications requiring exact surface intersection (reconstruct a mesh first)

## Practical Patterns

### LiDAR Simulation

Generate a synthetic point cloud by casting rays from a sensor position in a hemisphere pattern:

```python
import trimesh
import numpy as np

mesh = trimesh.load("scene.obj")
intersector = trimesh.ray.ray_triangle.RayMeshIntersector(mesh)

sensor_pos = np.array([0, 0, 5])  # sensor above the scene

# Generate ray directions in a hemisphere (pointing down)
n_azimuth = 360
n_elevation = 90
azimuths = np.linspace(0, 2 * np.pi, n_azimuth, endpoint=False)
elevations = np.linspace(0, np.pi / 2, n_elevation, endpoint=False)

az_grid, el_grid = np.meshgrid(azimuths, elevations)
az_flat = az_grid.ravel()
el_flat = el_grid.ravel()

directions = np.column_stack([
    np.cos(az_flat) * np.cos(el_flat),
    np.sin(az_flat) * np.cos(el_flat),
    -np.sin(el_flat)  # pointing downward
])

origins = np.tile(sensor_pos, (len(directions), 1))

hits, ray_idx, face_idx = intersector.intersects_location(origins, directions)
# hits is your synthetic point cloud
point_cloud = trimesh.PointCloud(hits)
```

### Visibility Culling

Determine which faces of a mesh are visible from a camera position:

```python
# Cast rays from camera to each face centroid
centroids = mesh.triangles_center  # (M, 3)
camera_pos = np.array([10, 0, 0])

directions = centroids - camera_pos
distances = np.linalg.norm(directions, axis=1, keepdims=True)
directions = directions / distances

origins = np.tile(camera_pos, (len(centroids), 1))

# A face is visible if the first hit is that face itself
hit_locations, ray_indices, face_indices = intersector.intersects_location(
    origins, directions
)

# Group hits by ray and check if the closest hit matches the target face
# (simplified: check if target face is in the hit set for each ray)
visible_faces = set()
for ray_i, face_i in zip(ray_indices, face_indices):
    if face_i == ray_i:  # ray_i corresponds to face_i in our construction
        visible_faces.add(face_i)
```

### Shadow Rays

Test whether a point is in shadow by casting a ray from the surface point toward the light source:

```python
# For each surface point, cast a ray to the light
light_pos = np.array([0, 0, 100])
surface_points = hit_locations  # from a previous pass

shadow_dirs = light_pos - surface_points
shadow_dists = np.linalg.norm(shadow_dirs, axis=1, keepdims=True)
shadow_dirs = shadow_dirs / shadow_dists

# Offset origins slightly along normal to avoid self-intersection
normals = mesh.face_normals[face_indices]
shadow_origins = surface_points + normals * 1e-5

# Check for any intersection between surface and light
hits_any = intersector.intersects_any(shadow_origins, shadow_dirs)
# hits_any[i] == True means point i is in shadow
```

The normal offset (epsilon push) is critical — without it, rays self-intersect with the surface they're leaving, and everything appears shadowed. Use a small multiple of your mesh's scale; 1e-5 works for meter-scale geometry.
