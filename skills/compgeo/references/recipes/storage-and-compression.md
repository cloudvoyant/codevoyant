# Storage and Compression

A 1M-triangle mesh is roughly 50 MB uncompressed. Draco-compressed, that same mesh fits in 2 MB. A dense 256-cubed voxel grid occupies 16 MB of memory; the same data stored as a sparse VDB grid might be under 1 MB. Storage format choice is a 10-50x multiplier on load times, bandwidth costs, and cloud storage bills. Getting compression right is the difference between a web viewer that loads in 500 ms and one that takes 30 seconds.

## Mesh Compression: Draco

Draco is Google's open-source library for compressing 3D geometry. It compresses three things: vertex positions (quantized to configurable precision), vertex attributes (normals, UVs, colors), and connectivity topology (the face index buffer). The result is a binary buffer that decodes back to the original mesh structure with controlled precision loss.

Draco paper and docs: [google.github.io/draco](https://google.github.io/draco/)

### Python

The `draco` pip package (`pip install draco`) provides encode/decode functions:

```python
import draco
import numpy as np

# Encode
vertices = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]], dtype=np.float32)
faces = np.array([[0, 1, 2]], dtype=np.uint32)

# quantization_bits controls precision vs size tradeoff
encoded = draco.encode_mesh_to_buffer(
    vertices, faces,
    quantization_bits=14  # default; 10 for aggressive compression
)

# Decode
mesh = draco.decode_buffer_to_mesh(encoded)
decoded_vertices = mesh.points  # (N, 3)
decoded_faces = mesh.faces      # (M, 3)
```

Quantization bits tradeoff:
- **14 bits** (default): sub-millimeter precision for meter-scale models. Safe for most applications.
- **12 bits**: visible artifacts only on smooth curved surfaces. Good for web delivery.
- **10 bits**: noticeable on close inspection. Use for thumbnails, LOD2+ meshes, or when bandwidth is severely constrained.

### Three.js

glTF files can embed Draco-compressed geometry via the `KHR_draco_mesh_compression` extension. Three.js has built-in support:

```typescript
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const dracoLoader = new DRACOLoader();
// Point to the Draco decoder WASM files (ship these with your app or use a CDN)
dracoLoader.setDecoderPath("/draco/");

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

gltfLoader.load("model.glb", (gltf) => {
  scene.add(gltf.scene);
});
```

The decoder runs in a Web Worker automatically. The WASM decoder files (`draco_decoder.wasm`, `draco_wasm_wrapper.js`) must be served from the path you specify. Copy them from `node_modules/three/examples/jsm/libs/draco/`.

### C++

Draco provides a C++ API and is available as a Conan package (`draco/1.5.6`):

```cpp
#include <draco/compression/encode.h>
#include <draco/mesh/mesh.h>

draco::EncoderBuffer buffer;
draco::Encoder encoder;
encoder.SetSpeedOptions(5, 5);  // 0=slow+small, 10=fast+large
encoder.SetAttributeQuantization(draco::GeometryAttribute::POSITION, 14);

const draco::Status status = encoder.EncodeMeshToBuffer(*mesh, &buffer);
if (!status.ok()) { /* handle error */ }

// buffer.data() and buffer.size() contain the compressed bytes
```

## Mesh Compression: Quantization and Attribute Compression

Beyond Draco, you can compress mesh data by quantizing vertex attributes directly. The meshoptimizer library provides vertex and index buffer compression that integrates with standard rendering pipelines.

meshoptimizer: [meshoptimizer.org](https://meshoptimizer.org/)

### Python (meshoptimizer bindings)

```python
import meshoptimizer

# Simplify a mesh (reduce triangle count while preserving shape)
simplified_indices = meshoptimizer.simplify(
    indices, vertices,
    target_index_count=len(indices) // 4,
    target_error=0.01
)

# Encode vertex buffer for smaller transmission
encoded = meshoptimizer.encode_vertex_buffer(vertices)
# Encode index buffer
encoded_idx = meshoptimizer.encode_index_buffer(indices)
```

### glTF Extensions

Two extensions improve glTF file sizes without external compression:

- **`KHR_mesh_quantization`** allows vertex attributes to be stored as integer types (int8, uint16) instead of float32. A float32 position (12 bytes per vertex) becomes a uint16 position (6 bytes) with a dequantization transform in the accessor. Widely supported in three.js and other engines.
- **`EXT_meshopt_compression`** applies meshoptimizer's vertex/index buffer encoding directly inside glTF buffers. Smaller than Draco for some meshes and faster to decode. Supported by three.js via `MeshoptDecoder`.

Use `gltfpack` (ships with meshoptimizer) to apply these optimizations:

```bash
gltfpack -i input.glb -o output.glb -cc  # quantize + compress
```

## Voxel Storage

### Dense Storage

For small to medium grids (up to 512-cubed), dense arrays are straightforward:

```python
import numpy as np

# Binary occupancy grid
grid = np.zeros((256, 256, 256), dtype=np.bool_)

# Save/load with numpy (fastest for Python-to-Python)
np.save("grid.npy", grid)
grid = np.load("grid.npy")
```

For chunked access to very large grids, use HDF5 via `h5py`:

```python
import h5py

with h5py.File("voxels.h5", "w") as f:
    ds = f.create_dataset(
        "occupancy",
        shape=(1024, 1024, 1024),
        dtype=np.bool_,
        chunks=(64, 64, 64),       # chunk size for random access
        compression="gzip",
        compression_opts=4
    )
    ds[0:256, 0:256, 0:256] = grid  # write a subregion
```

HDF5 chunks let you read a 64-cubed subregion without loading the entire dataset. This matters for 1024-cubed+ grids that don't fit in RAM.

### Sparse Storage: OpenVDB

OpenVDB is the industry standard for sparse voxel storage (used in film VFX, game engines, and simulation). It stores only the occupied regions of space using a hierarchical tree structure, achieving enormous compression ratios for sparse data.

OpenVDB docs: [openvdb.org](https://www.openvdb.org/)

```python
import pyopenvdb as vdb

# Create a float grid
grid = vdb.FloatGrid()
accessor = grid.getAccessor()

# Set sparse voxels
for x, y, z in occupied_voxels:
    accessor.setValueOn((x, y, z), 1.0)

# Metadata
grid.name = "density"
grid.transform = vdb.createLinearTransform(voxelSize=0.01)

# Save
vdb.write("volume.vdb", grids=[grid])

# Load
grids = vdb.readAllGrids("volume.vdb")
```

C++ (OpenVDB):

```cpp
#include <openvdb/openvdb.h>

openvdb::initialize();
openvdb::FloatGrid::Ptr grid = openvdb::FloatGrid::create(/*background=*/0.0f);
auto accessor = grid->getAccessor();

accessor.setValue(openvdb::Coord(10, 20, 30), 1.0f);

grid->setName("density");
grid->setTransform(openvdb::math::Transform::createLinearTransform(0.01));

openvdb::io::File file("volume.vdb");
file.write({grid});
file.close();
```

### RLE for Binary Occupancy

For simple binary occupancy grids where you control the format, run-length encoding is effective:

```python
def rle_encode(grid_flat: np.ndarray) -> list[tuple[bool, int]]:
    """RLE encode a flat boolean array."""
    runs = []
    current_val = grid_flat[0]
    count = 1
    for val in grid_flat[1:]:
        if val == current_val:
            count += 1
        else:
            runs.append((bool(current_val), count))
            current_val = val
            count = 1
    runs.append((bool(current_val), count))
    return runs
```

RLE works well when geometry is spatially coherent (most voxel data). For random scattered voxels, prefer VDB.

## Point Cloud Storage

### PLY

PLY is the most versatile point cloud format. It supports arbitrary per-point properties (position, normal, color, custom attributes) and can store mesh faces too. Use PLY as the default exchange format.

```python
import open3d as o3d

pcd = o3d.io.read_point_cloud("scan.ply")
o3d.io.write_point_cloud("output.ply", pcd, write_ascii=False)  # binary PLY is smaller
```

### LAS/LAZ

LAS is the standard for LiDAR and geospatial point clouds. It has a well-defined header with spatial bounds, point count, and coordinate reference system. LAZ is LAS compressed with a specialized algorithm (not general-purpose LZ4 -- it's designed for LiDAR point distributions).

laspy docs: [laspy.readthedocs.io](https://laspy.readthedocs.io/)

```python
import laspy
import numpy as np

# Read
las = laspy.read("scan.las")
points = np.vstack([las.x, las.y, las.z]).T       # (N, 3)
intensity = np.array(las.intensity)                 # per-point intensity
classification = np.array(las.classification)       # per-point class (ground, building, etc.)

# Write LAZ (compressed)
header = laspy.LasHeader(point_format=2, version="1.4")
las_out = laspy.LasData(header)
las_out.x, las_out.y, las_out.z = points[:, 0], points[:, 1], points[:, 2]
las_out.write("output.laz")  # .laz extension triggers compression
```

LAS attributes: x, y, z, intensity, return_number, classification, color (RGB), GPS time. These are standardized fields -- every LiDAR processing tool understands them.

### PCD

PCD is PCL's native format. Use it when your pipeline is PCL-centric.

```python
import open3d as o3d

pcd = o3d.io.read_point_cloud("cloud.pcd")
o3d.io.write_point_cloud("output.pcd", pcd)
```

### Which Format to Choose

| Use Case | Format | Why |
|----------|--------|-----|
| General interchange | PLY | Supports everything, universal reader support |
| LiDAR / geospatial | LAS/LAZ | Standard header, classification field, CRS metadata |
| PCL pipeline | PCD | Zero-copy with PCL; avoid format conversion overhead |
| Web delivery | Draco-compressed PLY or glTF | Smallest size for browser consumption |

## Progressive Streaming

For web viewers rendering massive geometry, progressive loading avoids the "blank screen for 30 seconds" problem:

- **glTF with LOD**: Use the `MSFT_lod` extension to embed multiple mesh resolutions. The viewer loads the coarsest LOD first, then progressively replaces with finer detail. Toolchain support is limited -- most teams generate LODs manually with meshoptimizer and serve them as separate files.
- **Point cloud octree streaming**: The Potree format subdivides a point cloud into an octree of tiles. The viewer loads visible tiles at appropriate resolution based on camera distance. This enables rendering of billion-point datasets in the browser.

Potree: [potree.github.io](https://potree.github.io/)

For custom streaming, the pattern is: partition your geometry into spatial tiles, serve them behind a tile endpoint, and load on demand based on the camera frustum. This is essentially how Google Earth and Cesium work for terrain and 3D tiles.
