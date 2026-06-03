# Voxel Operations with OpenVDB

OpenVDB is the standard library for sparse volumetric data. The [voxels-and-point-clouds recipe](./voxels-and-point-clouds.md) covers converting meshes to voxel grids; this recipe covers what you do with those grids once you have them: boolean (CSG) operations, morphological operations, rotation and resampling, querying, and round-trip conversion between voxels, meshes, and point clouds.

## OpenVDB Fundamentals Recap

A VDB is a sparse volumetric grid. Only non-empty voxels are stored, which makes operations on large grids feasible (a 4096^3 dense grid would need 64 GB for float32; a VDB storing the same level set uses a fraction of that). The key grid types:

- **FloatGrid** -- signed distance fields, density volumes. Most common for geometry.
- **BoolGrid** -- binary occupancy. Cheap and fast for inside/outside queries.
- **Vec3SGrid** -- velocity fields. Used in fluid simulation.

```python
import pyopenvdb as vdb
import numpy as np

# Load a VDB
grids, metadata = vdb.readAll("model.vdb")
grid = grids[0]  # FloatGrid

# Basic info
print(grid.gridClass)   # e.g. GRID_LEVEL_SET
print(grid.voxelSize)   # (dx, dy, dz)
print(grid.evalActiveVoxelBoundingBox())  # (min_ijk, max_ijk)
```

## Boolean / CSG Operations

Classic constructive solid geometry on SDF grids. The key requirement: operate on level sets (SDF grids), not density or fog volumes. A level set stores the signed distance to the surface: negative inside, positive outside, zero on the surface.

```python
import pyopenvdb as vdb

sphere = vdb.createLevelSetSphere(radius=1.0, voxelSize=0.1)
cube   = vdb.createLevelSetBox(
    vdb.BBoxd((-0.5, -0.5, -0.5), (0.5, 0.5, 0.5)),
    voxelSize=0.1,
)

# Union: min(sdf_a, sdf_b) -- combines both shapes
union = vdb.tools.csgUnion(sphere, cube)

# Difference: subtract cube from sphere
diff = vdb.tools.csgDifference(sphere, cube)

# Intersection: max(sdf_a, sdf_b) -- keeps only overlap
inter = vdb.tools.csgIntersection(sphere, cube)
```

CSG on SDFs is O(active voxels), not O(mesh triangles). This is much faster than mesh booleans for complex shapes and does not suffer from the robustness issues that plague mesh boolean algorithms (self-intersections, degenerate faces, T-junctions).

**Gotcha:** CSG operations modify the first grid in-place and invalidate the second. If you need to reuse a grid, copy it first with `grid.deepCopy()`.

## Morphological Operations

Dilation and erosion on the voxel topology. Useful for adding or removing material, smoothing surfaces, and computing clearances.

```python
import pyopenvdb as vdb

# Dilate: expand the active region outward by N voxels
vdb.tools.dilateActiveValues(grid, iterations=3)

# Erode: shrink the active region inward by N voxels
vdb.tools.erodeActiveValues(grid, iterations=3)
```

For level sets, dilation and erosion on the topology can break the SDF property (the gradient magnitude should be 1 everywhere). Use `levelSetRebuild` after morphological operations to restore a valid SDF:

```python
# Rebuild the SDF after morphological changes
vdb.tools.levelSetRebuild(grid, isovalue=0.0, halfWidth=3.0)
```

**Smoothing (mean curvature flow)** reduces noise and sharp features on the level set surface:

```python
vdb.tools.levelSetSmooth(grid, iterations=5)
```

## Rotating and Transforming a VDB Grid

VDB grids have an affine transform that maps voxel indices (i, j, k) to world coordinates. You can modify this transform or resample the grid into a new orientation.

### Modifying the transform (fast but limited)

Editing the transform changes how voxels map to world space but does not move the voxel data. This is fine for visualization and for operations that only use world-space coordinates. But if you need two grids in the same voxel-space coordinate frame (for CSG or comparison), you need to resample.

```python
import numpy as np
import pyopenvdb as vdb
from scipy.spatial.transform import Rotation

grid = vdb.createLevelSetSphere(radius=1.0, voxelSize=0.1)

# The grid's transform maps voxel indices to world coords
xform = grid.transform

# To rotate: compose a rotation matrix with the existing linear map
r = Rotation.from_euler("y", 45, degrees=True)
rot_mat = r.as_matrix()  # 3x3
```

### Resampling (accurate, required for multi-grid operations)

The most portable approach when you need the voxel data itself rotated: convert to mesh, transform the mesh vertices, and re-voxelize.

```python
import pyopenvdb as vdb
import numpy as np
from scipy.spatial.transform import Rotation

# Extract mesh from level set
verts, tris, quads = vdb.tools.volumeToMesh(grid, isovalue=0.0)
verts = np.array(verts, dtype=np.float32)

# Apply rotation to vertices
r = Rotation.from_euler("y", 45, degrees=True)
verts_rotated = r.apply(verts)

# Re-voxelize from the rotated mesh
tris = np.array(tris, dtype=np.int32)
xform = vdb.createLinearTransform(voxelSize=0.1)
rotated_grid = vdb.tools.meshToLevelSet(xform, verts_rotated, tris, halfWidth=3)
```

This round-trip introduces some discretization error (limited by voxel size) but produces a grid where both the transform and the voxel data are consistent. Use this when you need to perform CSG between a rotated grid and another grid.

## Querying Voxels

### Point sampling

```python
import pyopenvdb as vdb

# Sample a value at a voxel index
accessor = grid.getAccessor()
value = accessor.getValue((10, 20, 30))  # ijk voxel coordinates

# World-space point to voxel index
ijk = grid.worldToIndex((1.0, 0.5, 0.0))
value = accessor.getValue(ijk)
```

### Iterating over active voxels

```python
# Iterate over all active voxels
for item in grid.iterOnValues():
    ijk = item.min      # voxel coordinate
    val = item.value    # stored value

# Bounding box of active region
bbox = grid.evalActiveVoxelBoundingBox()
min_ijk, max_ijk = bbox
```

Use the accessor for random access and the iterator for batch processing. The accessor caches the tree traversal path, so sequential accesses near the same location are fast.

## Converting Between Voxels, Meshes, and Point Clouds

### VDB to mesh (marching cubes built-in)

```python
import pyopenvdb as vdb

verts, tris, quads = vdb.tools.volumeToMesh(grid, isovalue=0.0, adaptivity=0.0)
# verts: list of (x, y, z) tuples
# tris: list of (i, j, k) index tuples
# quads: list of (i, j, k, l) index tuples

# adaptivity > 0 simplifies the mesh (merges co-planar faces)
verts_simplified, tris_s, quads_s = vdb.tools.volumeToMesh(grid, isovalue=0.0, adaptivity=0.5)
```

### Mesh to VDB (level set)

```python
import numpy as np
import pyopenvdb as vdb

verts_np = np.array(verts, dtype=np.float32)   # (N, 3)
tris_np  = np.array(tris, dtype=np.int32)      # (M, 3)

xform = vdb.createLinearTransform(voxelSize=0.05)
ls = vdb.tools.meshToLevelSet(xform, verts_np, tris_np, halfWidth=3)
```

### Point cloud to VDB density

```python
import numpy as np
import pyopenvdb as vdb

points = np.random.randn(1000, 3).astype(np.float32)
density = vdb.tools.createDensityFromPoints(points, voxelSize=0.05, halfWidth=2.0)
```

## Saving and Loading

```python
import pyopenvdb as vdb

# Save one or more grids
vdb.write("output.vdb", grids=[grid])

# Load -- returns (list_of_grids, metadata_dict)
grids, metadata = vdb.readAll("scene.vdb")

# Find grids by class
ls_grid  = next(g for g in grids if g.gridClass == vdb.GridClass.LEVEL_SET)
fog_grid = next(g for g in grids if g.gridClass == vdb.GridClass.FOG_VOLUME)
```

VDB files can hold multiple grids with different types and names. Name your grids when creating them (`grid.name = "density"`) so consumers can find them without guessing.

## C++ OpenVDB (Brief Reference)

For production pipelines where Python overhead matters. The API maps directly from the Python bindings:

```cpp
#include <openvdb/openvdb.h>
#include <openvdb/tools/Composite.h>    // CSG ops
#include <openvdb/tools/LevelSetSphere.h>
#include <openvdb/tools/VolumeToMesh.h>

openvdb::initialize();

// Create primitives
auto sphere = openvdb::tools::createLevelSetSphere<openvdb::FloatGrid>(
    1.0f, openvdb::Vec3f(0, 0, 0), 0.1f);
auto cube = openvdb::tools::createLevelSetBox<openvdb::FloatGrid>(
    openvdb::BBoxd(
        openvdb::Vec3d(-0.5, -0.5, -0.5),
        openvdb::Vec3d(0.5, 0.5, 0.5)),
    openvdb::math::Transform::createLinearTransform(0.1));

// CSG union (modifies sphere in-place, invalidates cube)
openvdb::tools::csgUnion(*sphere, *cube);

// Extract mesh
std::vector<openvdb::Vec3s> points;
std::vector<openvdb::Vec3I> triangles;
std::vector<openvdb::Vec4I> quads;
openvdb::tools::volumeToMesh(*sphere, points, triangles, quads);

// Save
openvdb::io::File file("result.vdb");
openvdb::GridPtrVec grids;
grids.push_back(sphere);
file.write(grids);
file.close();
```

The C++ API is the canonical reference. When the Python bindings are missing a function, check whether the C++ `openvdb::tools` namespace has it -- you can often call it via pybind11 or write a small C++ extension.

## NanoVDB GPU Operations

Once you have voxel data that doesn't change (baked geometry, precomputed SDFs, density volumes), move it to a NanoVDB buffer for GPU access. This section covers the read path: converting a built OpenVDB grid, uploading it, and running GPU kernels over it. For modifying voxels, stay on the CPU with OpenVDB, then re-bake to NanoVDB.

### Converting an Existing Grid

```cpp
#include <nanovdb/util/OpenToNanoVDB.h>
#include <nanovdb/util/CudaDeviceBuffer.h>

// After any CSG / morphological operation that produces a final grid:
auto handle = nanovdb::openToNanoVDB(*grid);  // grid is openvdb::FloatGrid::Ptr
handle.deviceUpload();
auto* d_grid = handle.deviceGrid<float>();
// d_grid is now valid on the device — pass to kernels
```

The conversion allocates a flat host buffer, serializes the VDB tree (root -> internal nodes -> leaf nodes -> values), then copies to device. Total cost is O(active voxels). For a 10M-voxel grid, expect ~100ms on the CPU and ~10ms for the H->D transfer.

### GPU-Side SDF Raymarching

A minimal raymarcher that steps through an SDF on the GPU:

```cuda
__device__ float sampleSDF(
    const nanovdb::FloatGrid* grid,
    const nanovdb::Vec3f& worldPos)
{
    auto acc = grid->getAccessor();
    // World to index space
    auto ijk = grid->worldToIndexF(worldPos);
    nanovdb::Coord coord(ijk[0], ijk[1], ijk[2]);
    return acc.getValue(coord);
}

__global__ void raymarchKernel(
    const nanovdb::FloatGrid* grid,
    float* depthBuffer,
    int width, int height,
    nanovdb::Vec3f origin, nanovdb::Vec3f dir)
{
    int px = blockIdx.x * blockDim.x + threadIdx.x;
    int py = blockIdx.y * blockDim.y + threadIdx.y;
    if (px >= width || py >= height) return;

    nanovdb::Vec3f pos = origin;
    float t = 0.0f;
    for (int step = 0; step < 256; ++step) {
        float sdf = sampleSDF(grid, pos);
        if (sdf < 0.001f) { depthBuffer[py * width + px] = t; return; }
        t += sdf;                      // sphere-tracing: step by SDF value
        pos = origin + dir * t;
    }
    depthBuffer[py * width + px] = -1.0f;  // miss
}
```

Sphere tracing converges in fewer steps than fixed-step raymarching because the SDF tells you how far you can safely advance without crossing the surface.

### GPU-Side Boolean Queries (Point Containment)

Check whether a batch of points is inside a closed surface (negative SDF = inside):

```cuda
__global__ void containmentQuery(
    const nanovdb::FloatGrid* grid,
    const float3* points,
    bool* inside,
    int n)
{
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= n) return;

    auto acc = grid->getAccessor();
    nanovdb::Vec3f wp(points[i].x, points[i].y, points[i].z);
    auto ijk = grid->worldToIndexF(wp);
    nanovdb::Coord coord(ijk[0], ijk[1], ijk[2]);
    inside[i] = acc.getValue(coord) < 0.0f;
}
```

This is the GPU equivalent of OpenVDB's `tools::pointsInsideLevelSet`. At 1M points, this kernel finishes in ~2ms on a modern GPU versus ~200ms for the CPU path.

### Writing a Modified Grid Back to OpenVDB

NanoVDB is read-only. To modify and save:

1. Run any modification on the CPU with OpenVDB
2. Re-bake: `nanovdb::openToNanoVDB(*modifiedGrid)` -> re-upload
3. Or keep both: CPU OpenVDB for editing state, NanoVDB handle for rendering

```cpp
// After GPU raymarching, you may want to rebuild the SDF:
// (modification is always on the CPU OpenVDB grid)
vdb::tools::levelSetRebuild(*grid, 0.0f, 3.0f);
auto newHandle = nanovdb::openToNanoVDB(*grid);
newHandle.deviceUpload();
d_grid = newHandle.deviceGrid<float>();  // swap the device pointer
```

### Performance Notes

- Each call to `handle.deviceUpload()` is a full H->D copy. For large grids (>100M voxels), consider double-buffering: upload the next grid while the GPU renders the current one.
- `getAccessor()` on device is cheap (stack-allocated cache structure). Prefer one accessor per thread, not one per voxel query.
- NanoVDB works with OptiX ray tracing kernels identically -- pass `d_grid` to your OptiX `__intersection__` program.
