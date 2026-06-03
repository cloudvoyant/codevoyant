# Mesh Reconstruction

You have voxels or a point cloud and you need a mesh: for rendering, for export to CAD tools, for boolean operations, or for physics simulation. This is mesh reconstruction — turning implicit or unstructured representations back into explicit triangle surfaces. There are two fundamentally different problems here: extracting an isosurface from a volumetric grid (voxels to mesh) and fitting a surface to scattered points (point cloud to mesh). Each has different algorithms, different failure modes, and different quality tradeoffs.

## Why This Matters

Many geometry pipelines start with data that isn't a mesh: 3D scans produce point clouds, simulation grids produce voxel fields, SDF operations produce implicit volumes. But almost everything downstream — rendering engines, 3D printers, game engines, CAD tools — expects a triangle mesh. Mesh reconstruction is the bridge.

The choice of algorithm determines:
- **Surface quality**: smooth vs faceted, hole-free vs patchy
- **Triangle count**: tens of thousands vs millions — directly impacts rendering performance
- **Feature preservation**: sharp edges preserved vs rounded off
- **Robustness to noise**: some algorithms handle noisy scans; others require clean input

## Voxel to Mesh: Marching Cubes

Marching Cubes is the standard algorithm for extracting an isosurface from a 3D scalar field. Given a threshold value (the "level"), it produces a triangle mesh that approximates the surface where the field equals that threshold.

**Intuition**: divide the volume into a grid of cubes. Each cube has 8 corners, and each corner is either above or below the threshold. That gives 256 possible configurations (2^8), reduced to 15 unique cases by rotational symmetry. For each case, there's a pre-computed set of triangles that approximates the surface passing through that cube. Stitch all the cubes together, and you have a mesh.

### Python: scikit-image

The simplest path to Marching Cubes in Python. Works on dense numpy arrays.

```python
import numpy as np
from skimage.measure import marching_cubes

# Assume `volume` is a 3D numpy array (e.g., 100x100x100)
# Values > 0 are inside, < 0 are outside (SDF convention)
volume = np.random.randn(100, 100, 100)  # replace with your actual volume

# Extract the isosurface at level=0
vertices, faces, normals, values = marching_cubes(volume, level=0.0)

print(f"{len(vertices)} vertices, {len(faces)} faces")
```

The `level` parameter is the isovalue. For an SDF, use 0.0 (the zero-crossing is the surface). For a density field, choose the threshold that separates solid from empty.

scikit-image docs: [scikit-image.org/docs/stable/api/skimage.measure.html#marching-cubes](https://scikit-image.org/docs/stable/api/skimage.measure.html)

### Python: Open3D

Open3D's `VoxelGrid` doesn't directly do Marching Cubes, but you can extract a mesh from a voxel grid by converting through a point cloud:

```python
import open3d as o3d

# If you have a VoxelGrid
voxel_grid = o3d.geometry.VoxelGrid.create_from_triangle_mesh(mesh, voxel_size=0.05)

# Convert voxel centers to point cloud, then reconstruct
# For direct MC, use scikit-image on the underlying numpy array
```

For most voxel-to-mesh needs, scikit-image's `marching_cubes` is more direct. Use Open3D when the reconstruction starts from a point cloud (see Poisson below).

### C++: OpenVDB

OpenVDB is the production path for voxel-to-mesh in C++. Its sparse grid representation handles large volumes efficiently — only voxels near the surface are allocated in memory.

```cpp
#include <openvdb/openvdb.h>
#include <openvdb/tools/VolumeToMesh.h>

openvdb::initialize();

// Assume `grid` is a FloatGrid containing an SDF
openvdb::FloatGrid::Ptr grid = ...;

// Extract mesh at isovalue 0.0
std::vector<openvdb::Vec3s> points;
std::vector<openvdb::Vec3I> triangles;
std::vector<openvdb::Vec4I> quads;

openvdb::tools::volumeToMesh(*grid, points, triangles, quads, 0.0);

// `points` contains vertex positions
// `triangles` and `quads` contain face indices
// Convert quads to triangles if your pipeline requires it
```

OpenVDB's `volumeToMesh` produces a mix of triangles and quads. The quads tend to be more regular than an all-triangle output. If you need pure triangles, split each quad into two triangles.

OpenVDB docs: [openvdb.org/documentation/doxygen/codeExamples.html](https://www.openvdb.org/documentation/doxygen/codeExamples.html)

### Marching Cubes Gotchas

- **Triangle count**: MC produces many small, roughly-equal-sized triangles. A 256^3 grid can easily produce millions of faces. Always post-process with decimation (see below).
- **Feature loss**: MC rounds off sharp edges. The isovalue surface is piecewise-linear across voxels, so features smaller than the voxel size are lost. Use a finer grid resolution for better feature preservation — at the cost of more triangles and more memory.
- **Ambiguous cases**: some cube configurations have multiple valid triangulations. Different MC implementations may produce slightly different meshes. The "marching cubes 33" variant resolves these ambiguities consistently.

## Voxel to Mesh: Dual Contouring

Dual Contouring produces meshes with sharper features than Marching Cubes by placing vertices at optimal positions within each cell (using Hermite data — surface normals at edge crossings) rather than interpolating along edges. The result better preserves sharp corners and creases.

Dual Contouring is more complex to implement: it requires not just the scalar field but also gradient (normal) information at each edge crossing. There's no single-line Python call for it. If you need sharper features than MC provides and can't just increase grid resolution, look into:

- The original paper: Ju et al., "Dual Contouring of Hermite Data" (2002)
- Open-source implementations: search for `dual_contouring` on GitHub; several standalone C++ implementations exist
- For production use, OpenVDB's adaptive meshing provides some of the same benefits

For most use cases, Marching Cubes at sufficient resolution is good enough. Reach for Dual Contouring when you're reconstructing CAD-like geometry with known sharp edges.

## Point Cloud to Mesh: Poisson Surface Reconstruction

Poisson reconstruction fits a smooth implicit function to a set of oriented points (positions + normals), then extracts the isosurface. It produces watertight meshes — the surface is always closed, even if the input point cloud has gaps.

**How it works intuitively**: the normals define an "inside" and "outside" direction at each point. Poisson reconstruction finds a smooth scalar field whose gradient best matches these normals, then extracts the zero-level isosurface via Marching Cubes internally.

### Python: Open3D

```python
import open3d as o3d

pcd = o3d.io.read_point_cloud("scan.ply")

# Normals are REQUIRED — estimate if missing
pcd.estimate_normals(search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=0.1, max_nn=30))
pcd.orient_normals_consistent_tangent_plane(k=15)

# Poisson reconstruction
mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(pcd, depth=9)

# depth controls resolution: higher = more triangles, more detail
# depth=8 is good for quick results; depth=10-12 for high detail
print(f"{len(mesh.vertices)} vertices, {len(mesh.triangles)} faces")
```

The `depth` parameter controls the octree resolution. Each increment roughly quadruples the triangle count. Start with depth=9 and adjust.

### Poisson Gotchas

- **Normals are mandatory**: Poisson reconstruction cannot work without oriented normals. If your point cloud doesn't have them, estimate them first (see the feature-extraction recipe). Wrong normal orientation produces inside-out surfaces.
- **Spurious geometry**: Poisson fills holes by design. If your scan has a large gap, Poisson will bridge it with a smooth surface that wasn't in the original data. This is useful for creating printable meshes but misleading for analysis.
- **Low-density trimming**: the `densities` output tells you how well-supported each vertex is by the input data. Remove low-density vertices to trim spurious geometry:

```python
import numpy as np

densities_arr = np.asarray(densities)
threshold = np.quantile(densities_arr, 0.01)  # remove bottom 1%
vertices_to_remove = densities_arr < threshold
mesh.remove_vertices_by_mask(vertices_to_remove)
```

### C++

libigl doesn't include Poisson reconstruction directly. Your options:
- **Open3D C++ API**: mirrors the Python API above
- **PoissonRecon**: the original standalone implementation by Kazhdan and Hoppe — [github.com/mkazhdan/PoissonRecon](https://github.com/mkazhdan/PoissonRecon). Command-line tool that reads oriented points and writes a mesh. Easy to integrate as a subprocess.
- **CGAL**: provides Poisson surface reconstruction via `CGAL::poisson_surface_reconstruction_3`

Open3D C++ docs: [open3d.org/docs/release/cpp_api.html](http://www.open3d.org/docs/release/cpp_api.html)

## Point Cloud to Mesh: Ball Pivoting

Ball Pivoting Algorithm (BPA) creates a mesh by rolling a virtual ball of radius r over the point cloud. Wherever the ball touches exactly three points simultaneously, it creates a triangle. The ball then pivots around the edge to find the next triangle.

```python
import open3d as o3d

pcd = o3d.io.read_point_cloud("scan.ply")
pcd.estimate_normals()

# Ball pivoting with multiple radii (handles varying point density)
radii = [0.005, 0.01, 0.02, 0.04]
radii_param = o3d.utility.DoubleVector(radii)
mesh = o3d.geometry.TriangleMesh.create_from_point_cloud_ball_pivoting(pcd, radii_param)

print(f"{len(mesh.vertices)} vertices, {len(mesh.triangles)} faces")
```

**When to prefer Ball Pivoting over Poisson**:
- You want to preserve holes and boundaries (BPA doesn't fill gaps — it leaves them as boundaries)
- Your point cloud represents a surface that shouldn't be watertight (e.g., a terrain scan)
- You want the mesh to closely follow the input points (BPA vertices are the input points; Poisson creates new vertex positions)

**When to prefer Poisson over Ball Pivoting**:
- You need a watertight mesh (for 3D printing, volume computation, boolean operations)
- Your point cloud has noise (Poisson smooths it; BPA connects noisy points directly)
- Point density varies significantly (Poisson handles this better)

The radius parameter is critical for BPA. Too small and you miss connections; too large and you create false triangles across gaps. Using multiple radii (as shown) handles varying density but increases computation time.

## Mesh Simplification / Decimation

After reconstruction, triangle counts are typically much higher than needed. A Poisson reconstruction at depth=10 can produce millions of triangles. Decimation reduces the count while preserving the surface shape.

### Python

```python
import trimesh

# Quadric edge collapse decimation — the standard approach
mesh = trimesh.load("reconstructed.obj")
print(f"Before: {len(mesh.faces)} faces")

# Reduce to target face count
simplified = mesh.simplify_quadric_decimation(face_count=10000)
print(f"After: {len(simplified.faces)} faces")
```

Quadric decimation minimizes the error at each collapse by tracking a per-vertex error quadric. Flat regions lose more faces than curved regions, which is exactly what you want.

### C++

libigl provides edge collapse decimation:

```cpp
#include <igl/decimate.h>

Eigen::MatrixXd V;  // input vertices
Eigen::MatrixXi F;  // input faces

Eigen::MatrixXd U;  // output vertices
Eigen::MatrixXi G;  // output faces
Eigen::VectorXi J;  // birth faces (maps output face to input face)

int target_faces = 10000;
igl::decimate(V, F, target_faces, U, G, J);
```

libigl decimation docs: [libigl.github.io/tutorial/#mesh-decimation](https://libigl.github.io/tutorial/)

## Quality Checks

After reconstruction, always validate:

```python
import trimesh

mesh = trimesh.load("reconstructed.obj")

# Watertightness — all edges shared by exactly two faces
print(f"Watertight: {mesh.is_watertight}")

# General validity — no degenerate faces, consistent winding
print(f"Valid: {mesh.is_valid}")

# Volume (only meaningful if watertight)
if mesh.is_watertight:
    print(f"Volume: {mesh.volume:.4f}")

# Self-intersections (slow for large meshes)
# trimesh doesn't have a built-in self-intersection test,
# but you can use the ray caster: cast rays from face centroids
# along face normals and check for unexpected nearby hits

# Euler characteristic — should be 2 for a single closed surface
print(f"Euler characteristic: {mesh.euler_number}")
```

Quality issues to watch for:
- **Non-manifold edges**: edges shared by more than two faces. These break most downstream algorithms. Fix with `trimesh.repair.fix_normals(mesh)` and `trimesh.repair.fill_holes(mesh)`.
- **Degenerate faces**: triangles with zero area (three collinear vertices). Remove with `mesh.update_faces(mesh.nondegenerate_faces())`.
- **Self-intersections**: faces that pass through other faces. Hard to detect efficiently; for critical applications, use a dedicated mesh repair tool like MeshFix or the CGAL polygon mesh processing package.
