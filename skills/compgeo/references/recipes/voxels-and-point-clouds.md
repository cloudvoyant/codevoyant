# Voxels and Point Clouds

Meshes are the default geometry representation for rendering, but they're not always the best representation for computation. Voxel grids and point clouds trade topological precision for properties that meshes lack: voxels give you regular spatial structure (great for boolean ops and GPU compute), point clouds give you unstructured flexibility (great for sensor data and statistical analysis). This recipe covers converting between the three representations.

## Why This Matters

Three representations, three tradeoffs:

- **Mesh** — vertices connected by faces. Topology is explicit: you know what's inside, what's outside, and where surfaces are. Best for rendering and precise geometric queries. Memory scales with surface area, not volume.
- **Voxel grid** — a 3D occupancy grid. Each cell is on or off (or stores a value). Topology is implicit in the grid structure. Great for boolean operations (union/subtract = bitwise OR/AND), GPU-friendly (regular memory access patterns), and volume-based analysis. Memory scales with volume.
- **Point cloud** — unstructured set of 3D positions, optionally with normals/colors. No topology, no connectivity. Natural output of LIDAR, depth cameras, and photogrammetry. Best for registration, statistical analysis, and as input to surface reconstruction.

Converting between them is a fundamental pipeline operation. Mesh-to-voxel for physics simulation, mesh-to-point-cloud for training ML models, point-cloud-to-mesh for reconstructing scanned objects (covered in the [mesh-reconstruction recipe](./mesh-reconstruction.md)).

## Mesh to Voxel Grid

### Python: trimesh

Trimesh's voxelization is the simplest path from mesh to voxel grid. The `pitch` parameter controls the voxel size — smaller pitch means more voxels and higher fidelity.

```python
import trimesh

mesh = trimesh.load("model.obj")

# Voxelize with 0.01 unit pitch
voxels = mesh.voxelized(pitch=0.01)

# Access the occupancy grid
matrix = voxels.matrix        # 3D boolean numpy array
filled = voxels.points        # (N, 3) centers of filled voxels
print(f"Grid shape: {matrix.shape}, filled: {matrix.sum()}")

# Transform voxel indices back to world coordinates
origin = voxels.transform[:3, 3]  # world position of grid origin
```

**Pitch selection tradeoffs.** Start coarse (pitch = bounding box extent / 64) to validate your pipeline, then refine. Halving the pitch multiplies voxel count by 8. For a mesh with a 1-meter bounding box, pitch=0.01 gives a 100x100x100 grid (~1M voxels) — manageable. Pitch=0.001 gives 1000x1000x1000 (~1B voxels) — you need sparse storage.

Trimesh stores voxels in a sparse format internally. Access `voxels.sparse_indices` for the filled voxel coordinates without materializing the dense array.

### Python: PyVista

PyVista's voxelization works well when you need visualization alongside computation.

```python
import pyvista as pv

mesh = pv.read("model.obj")
voxels = pv.voxelize(mesh, density=0.01)

# voxels is a pyvista.UnstructuredGrid
print(f"Voxel count: {voxels.n_cells}")

# Visualize
voxels.plot(show_edges=True)
```

PyVista docs: [docs.pyvista.org](https://docs.pyvista.org/)

### C++: OpenVDB

OpenVDB is the production choice for voxel grids in C++. It uses a hierarchical sparse data structure (VDB tree) that handles grids of effectively unlimited resolution — 10,000^3 and beyond — with memory proportional to the surface, not the volume.

```cpp
#include <openvdb/openvdb.h>
#include <openvdb/tools/MeshToVolume.h>

openvdb::initialize();

// Prepare mesh data
std::vector<openvdb::Vec3s> points;    // vertex positions
std::vector<openvdb::Vec3I> triangles; // face indices
// ... fill from your mesh ...

// Convert mesh to a narrow-band level set (SDF near the surface)
float voxel_size = 0.01f;
float half_bandwidth = 3.0f;  // in voxels
auto grid = openvdb::tools::meshToVolume<openvdb::FloatGrid>(
    points, triangles, voxel_size, half_bandwidth);

// Iterate active voxels
for (auto iter = grid->beginValueOn(); iter; ++iter) {
    openvdb::Coord coord = iter.getCoord();
    float sdf_value = iter.getValue();
    // coord.x(), coord.y(), coord.z() — voxel indices
}
```

CMake setup:

```cmake
find_package(OpenVDB REQUIRED)
target_link_libraries(myapp PRIVATE OpenVDB::openvdb)
```

OpenVDB gives you a signed distance field (SDF) rather than a binary occupancy grid. Voxels near the surface store their distance to the surface; voxels far from the surface are pruned. This is much more useful than binary occupancy for CSG operations, collision detection, and mesh reconstruction.

OpenVDB docs: [openvdb.org/documentation/](https://www.openvdb.org/documentation/)

## NanoVDB: GPU-Friendly Sparse Voxels

NanoVDB is a read-only, header-only sibling of OpenVDB shipped in the same repository (OpenVDB >= 8.0). It serializes a VDB tree into a **flat contiguous buffer** — no heap pointers, no tree traversal overhead on the GPU. Copy the buffer to device memory and launch a kernel. Runs on CUDA, OptiX, Metal, and (experimentally) WebGPU compute.

**When to use NanoVDB over OpenVDB:**

| Need | Use |
|------|-----|
| Modify voxels, run CSG | OpenVDB (CPU-side) |
| Read voxels in a GPU kernel | NanoVDB |
| Ship a VDB to an embedded device | NanoVDB (header-only, no OpenVDB runtime) |
| Real-time raymarching on GPU | NanoVDB |

### Python: pynanovdb

```python
import pynanovdb
import pyopenvdb as vdb

# Build an OpenVDB grid first (NanoVDB is read-only)
sphere = vdb.createLevelSetSphere(radius=1.0, voxelSize=0.1)
vdb.write("sphere.vdb", grids=[sphere])

# Convert to NanoVDB buffer
handle = pynanovdb.read("sphere.vdb")          # reads first grid
grid = handle.grid("ls_sphere")                # access by name

# Sample at index-space coordinate
ijk = (10, 0, 0)
value = grid.getValue(ijk)
print(f"SDF at {ijk}: {value:.4f}")

# Save as .nvdb (NanoVDB native format)
pynanovdb.write("sphere.nvdb", handle)
```

`pynanovdb` wraps the same flat buffer on the CPU. For GPU usage, use the C++ API below and pass the buffer to CUDA.

### C++: OpenVDB -> NanoVDB -> GPU

```cpp
#include <openvdb/openvdb.h>
#include <nanovdb/NanoVDB.h>
#include <nanovdb/util/OpenToNanoVDB.h>   // conversion
#include <nanovdb/util/CudaDeviceBuffer.h> // GPU buffer
#include <cuda_runtime.h>

openvdb::initialize();

// 1. Load or build an OpenVDB grid
openvdb::io::File file("sphere.vdb");
file.open();
auto baseGrid = file.readGrid("ls_sphere");
file.close();
auto vdbGrid = openvdb::gridPtrCast<openvdb::FloatGrid>(baseGrid);

// 2. Convert to NanoVDB (returns a host-side handle)
auto handle = nanovdb::openToNanoVDB(*vdbGrid);

// 3. Upload to GPU
handle.deviceUpload();  // allocates and copies to CUDA device memory

// 4. Get the device pointer and pass to a kernel
auto* deviceGrid = handle.deviceGrid<float>();
// deviceGrid is a nanovdb::FloatGrid* on the device — safe to dereference in a kernel
```

CUDA kernel that queries SDF values:

```cuda
__global__ void querySDF(const nanovdb::FloatGrid* grid, float* results, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= n) return;

    // Use a tree-cached accessor for fast repeated lookups
    auto acc = grid->getAccessor();
    nanovdb::Coord ijk(i, 0, 0);
    results[i] = acc.getValue(ijk);
}

// Launch
querySDF<<<(n + 255) / 256, 256>>>(deviceGrid, d_results, n);
```

`nanovdb::FloatGrid::getAccessor()` on device is O(1) amortized — it caches tree node pointers across consecutive calls to nearby coordinates. Use one accessor per thread.

CMake setup (OpenVDB >= 8.0 includes NanoVDB headers):

```cmake
find_package(OpenVDB REQUIRED)
find_package(CUDA REQUIRED)

target_link_libraries(myapp PRIVATE OpenVDB::openvdb)
target_include_directories(myapp PRIVATE ${OpenVDB_INCLUDE_DIRS})
# NanoVDB is header-only — no separate link target needed
```

NanoVDB docs: [openvdb.org/documentation/doxygen/NanoVDB_MainPage.html](https://www.openvdb.org/documentation/doxygen/NanoVDB_MainPage.html)

### Gotcha: Watertightness

Voxelization needs to determine inside vs outside. If your mesh has holes, gaps, or inconsistent face winding, the inside/outside test is undefined. Symptoms: random voxels missing, entire interior unfilled, or voxels leaking outside the mesh.

Fix before voxelizing:

```python
import trimesh

mesh = trimesh.load("model.obj")
if not mesh.is_watertight:
    trimesh.repair.fill_holes(mesh)
    trimesh.repair.fix_winding(mesh)
    trimesh.repair.fix_normals(mesh)
    # Re-check — some meshes can't be automatically repaired
    print(f"Watertight after repair: {mesh.is_watertight}")
```

If the mesh can't be repaired automatically, consider using surface-based voxelization (marks only surface voxels, not interior) instead of solid voxelization.

## Mesh to Point Cloud (Surface Sampling)

### Python: trimesh

Trimesh's surface sampling is area-weighted by default — larger triangles get proportionally more samples. This is usually what you want.

```python
import trimesh

mesh = trimesh.load("model.obj")

# Uniform area-weighted sampling
points, face_indices = trimesh.sample.sample_surface(mesh, count=10000)
# points: (10000, 3) — sample positions on the surface
# face_indices: which face each sample came from

# If you need normals at sample points
normals = mesh.face_normals[face_indices]
```

### Python: Open3D

Open3D offers both uniform and Poisson disk sampling. Poisson disk produces a blue-noise distribution — samples are evenly spaced with no clumping. Better for visual quality and for algorithms sensitive to sample distribution.

```python
import open3d as o3d

mesh = o3d.io.read_triangle_mesh("model.obj")
mesh.compute_vertex_normals()

# Uniform sampling
pcd_uniform = mesh.sample_points_uniformly(number_of_points=10000)

# Poisson disk sampling — more even distribution
pcd_poisson = mesh.sample_points_poisson_disk(
    number_of_points=5000,
    init_factor=5  # oversampling factor for initial uniform step
)
```

**When Poisson disk beats uniform.** If your downstream task is visual (rendering point clouds, computing surface normals from neighbors), Poisson disk avoids the clumping artifacts of uniform sampling. If your downstream task is statistical (computing volume, center of mass), uniform sampling is fine and faster.

Open3D sampling docs: [open3d.org/docs/release/tutorial/geometry/mesh.html](http://www.open3d.org/docs/release/tutorial/geometry/mesh.html)

### C++: Manual Barycentric Sampling

When you don't want a dependency on PCL or Open3D in C++, barycentric sampling with Eigen is straightforward:

```cpp
#include <Eigen/Dense>
#include <random>

// Sample a single point uniformly on a triangle
Eigen::Vector3d sample_triangle(
    const Eigen::Vector3d& v0,
    const Eigen::Vector3d& v1,
    const Eigen::Vector3d& v2,
    std::mt19937& rng)
{
    std::uniform_real_distribution<double> dist(0.0, 1.0);
    double r1 = std::sqrt(dist(rng));
    double r2 = dist(rng);
    return (1.0 - r1) * v0 + r1 * (1.0 - r2) * v1 + r1 * r2 * v2;
}

// Area-weighted sampling: pick triangles proportional to area
// 1. Compute cumulative area distribution
// 2. For each sample: pick triangle via binary search on cumulative area, then sample within it
```

The `sqrt` on `r1` ensures uniform distribution over the triangle area — without it, samples cluster near one vertex.

### C++: PCL

PCL (Point Cloud Library) is the heavyweight option for point cloud processing. It's overkill just for sampling, but if your pipeline already uses PCL for registration or filtering, it makes sense.

PCL docs: [pointclouds.org/documentation/](https://pointclouds.org/documentation/)

## Point Cloud from Depth / Sensor Data

Depth cameras (Intel RealSense, Azure Kinect) and LIDAR scanners produce point clouds directly. The common formats:

- **PLY** — supports per-point colors, normals, and custom properties. Load with Open3D or trimesh.
- **PCD** — PCL's native format. Load with Open3D (`o3d.io.read_point_cloud("scan.pcd")`).
- **LAS/LAZ** — LIDAR-specific formats with intensity, classification, and GPS time. LAZ is compressed LAS. Loading and storage covered in the [storage-and-compression recipe](./storage-and-compression.md).

```python
import open3d as o3d

# PLY point cloud
pcd = o3d.io.read_point_cloud("scan.ply")
print(f"{len(pcd.points)} points, has_colors: {pcd.has_colors()}")

# Depth image to point cloud (if you have camera intrinsics)
depth = o3d.io.read_image("depth.png")
intrinsic = o3d.camera.PinholeCameraIntrinsic(
    o3d.camera.PinholeCameraIntrinsicParameters.PrimeSenseDefault)
pcd = o3d.geometry.PointCloud.create_from_depth_image(depth, intrinsic)
```

## Voxel to Point Cloud Conversion

Extracting the centers of occupied voxels gives you a point cloud. This is useful when you want to apply point cloud algorithms (registration, normal estimation) to voxelized data.

```python
import trimesh

mesh = trimesh.load("model.obj")
voxels = mesh.voxelized(pitch=0.05)

# Filled voxel centers as a point cloud
point_cloud = voxels.points  # (N, 3) array of centers

# Wrap as Open3D point cloud for further processing
import open3d as o3d
pcd = o3d.geometry.PointCloud()
pcd.points = o3d.utility.Vector3dVector(point_cloud)
```

The reverse — fitting a voxel grid to a point cloud, or reconstructing a mesh from a point cloud — is covered in the [mesh-reconstruction recipe](./mesh-reconstruction.md).

## Memory Sizing

Dense voxel grids consume memory fast. The formula:

```
memory = nx * ny * nz * bytes_per_voxel
```

For a binary occupancy grid (1 byte per voxel):

| Grid resolution | Voxels | Memory |
|----------------|--------|--------|
| 64^3 | 262K | 256 KB |
| 128^3 | 2.1M | 2 MB |
| 256^3 | 16.8M | 16 MB |
| 512^3 | 134M | 128 MB |
| 1024^3 | 1.07B | 1 GB |

For float SDF grids (4 bytes per voxel), multiply by 4.

**Sparse storage is mandatory above 128^3 for most use cases.** OpenVDB's tree structure stores only voxels near the surface, reducing memory from O(n^3) to roughly O(n^2) for surface-like data. Trimesh's sparse voxel representation does the same for binary occupancy.

If you're working at high resolution and don't need the full grid, consider:

- **Narrow-band level sets** — store SDF values only within a few voxels of the surface (OpenVDB's default mode)
- **Octrees** — hierarchical subdivision, store detail only where needed
- **Run-length encoding** — for binary occupancy along one axis (covered in the [storage-and-compression recipe](./storage-and-compression.md))

The choice between dense, sparse, and hierarchical storage depends on your access pattern. Dense grids have the best cache locality for full-grid sweeps. Sparse grids win when you only touch surface-adjacent voxels. Octrees win when you need multi-resolution queries.
