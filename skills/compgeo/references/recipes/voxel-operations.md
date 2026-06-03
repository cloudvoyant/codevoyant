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
