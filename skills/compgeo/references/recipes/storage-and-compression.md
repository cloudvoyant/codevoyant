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

## Large-Scale Voxel Storage

### Zarr: Chunked Cloud-Native Arrays

For voxel grids that don't fit in RAM or need to be read in parallel from cloud storage, Zarr provides chunked N-D array storage with pluggable compressors. Each chunk is a separate object/file, so you can read a 64-cubed subregion of a 4096-cubed grid with a single object-store GET.

Zarr docs: [zarr.readthedocs.io](https://zarr.readthedocs.io/)

```python
import zarr
import numcodecs
import numpy as np

# Write a 1024-cubed float32 grid in 64-cubed chunks, Blosc+Zstd compressed
store = zarr.open(
    "volume.zarr",
    mode="w",
    shape=(1024, 1024, 1024),
    chunks=(64, 64, 64),
    dtype=np.float32,
    compressor=numcodecs.Blosc(cname="zstd", clevel=5, shuffle=numcodecs.Blosc.BITSHUFFLE),
)
store[0:256, 0:256, 0:256] = my_subgrid  # write a region

# Read only the chunk containing voxel (100, 200, 300) — no full-grid load
subgrid = store[64:128, 192:256, 256:320]  # numpy array
```

Zarr stores can live on local disk, S3, GCS, or Azure Blob — swap the `store` argument:

```python
import s3fs

s3 = s3fs.S3FileSystem()
store = zarr.open(s3.get_mapper("s3://mybucket/volume.zarr"), mode="r")
region = store[128:192, 128:192, 128:192]  # streams only the touched chunks
```

**Chunk size guidance:**
- 64-cubed (1.05M voxels × 4 bytes = 4 MB): good default for random-access queries
- 128-cubed (8.4M voxels = 32 MB): better throughput for sequential sweeps, higher random-access cost
- Match chunk boundaries to your access pattern (e.g., if you always read XZ slices, use tall thin chunks)

### OME-Zarr: Multiscale Volumetric Data

OME-Zarr (Open Microscopy Environment) extends Zarr with a convention for storing multiscale image pyramids — coarse-to-fine resolutions in the same store. Useful for volumetric simulation data, medical imaging, and any dataset where you want to LOD between resolutions.

OME-Zarr spec: [ngff.openmicroscopy.org](https://ngff.openmicroscopy.org/)

```python
import zarr
import numpy as np

# Build a 3-level pyramid: [full, half, quarter]
store = zarr.open_group("volume.ome.zarr", mode="w")
scales = [1.0, 2.0, 4.0]  # voxel sizes at each level

for level, scale in enumerate(scales):
    n = 1024 // int(scale)
    store.require_dataset(
        f"/{level}",
        shape=(n, n, n),
        chunks=(64, 64, 64),
        dtype=np.float32,
    )

# Write metadata
store.attrs["multiscales"] = [{
    "axes": [{"name": ax, "type": "space", "unit": "micrometer"} for ax in "zyx"],
    "datasets": [{"path": str(i), "coordinateTransformations":
        [{"type": "scale", "scale": [s, s, s]}]} for i, s in enumerate(scales)],
}]
```

Viewers (Napari, BigDataViewer, neuroglancer) read OME-Zarr natively — they pick the right resolution level based on zoom.

### NanoVDB Page-Streaming

NanoVDB files can be split into pages (fixed-size blocks) and loaded on demand. This lets you stream large NanoVDB grids from disk or object storage without loading the entire file:

```cpp
#include <nanovdb/util/IO.h>

// Open a multi-grid NanoVDB file in paged mode
auto handle = nanovdb::io::readGrid<nanovdb::CudaDeviceBuffer>(
    "large_volume.nvdb",
    "density",           // grid name
    0,                   // grid index
    1                    // verbose
);

// Only the requested grid is loaded — other grids in the file stay on disk
handle.deviceUpload();
```

On the Python side, use `pynanovdb` with memory-mapped reading:

```python
import pynanovdb

# Memory-mapped: OS pages in only the pages you touch
handle = pynanovdb.read("large_volume.nvdb", mmap=True)
grid = handle.grid(0)
value = grid.getValue((512, 512, 512))  # OS fetches only the relevant page
```

For object storage, stream NanoVDB pages over HTTP with range requests:

```python
import requests
import io
import pynanovdb

# Range request for just the first 4 MB (header + metadata)
r = requests.get(
    "https://mybucket.s3.amazonaws.com/volume.nvdb",
    headers={"Range": "bytes=0-4194303"}
)
handle = pynanovdb.readBuffer(io.BytesIO(r.content))
```

## Large-Scale Mesh Delivery

### 3D Tiles

3D Tiles is a Cesium-originated open standard (now OGC) for streaming massive 3D datasets — terrain, buildings, photogrammetry, point clouds — over HTTP. The tileset is a JSON hierarchy (`tileset.json`) that describes spatial bounds, geometric error at each level, and child tile URLs. The viewer loads tiles based on camera position and a user-configurable geometric error threshold.

3D Tiles spec: [github.com/CesiumGS/3d-tiles](https://github.com/CesiumGS/3d-tiles)

Tile content format: **B3DM** (Batched 3D Model, glTF-inside) or **PNTS** (point clouds). The `py3dtiles` library generates tilesets from meshes and point clouds:

```python
from py3dtiles.convert import convert

# Convert a large OBJ mesh to a 3D Tiles tileset
convert(
    "large_city.obj",
    outfolder="./tileset/",
    jobs=8,            # parallel workers
    crs_in="EPSG:4326",
    crs_out="EPSG:4978",
)
# Produces: tileset.json + .b3dm tile files
```

Serve the output directory from any static HTTP server. In a three.js scene, use `3d-tiles-renderer-js`:

```typescript
import { TilesRenderer } from "3d-tiles-renderer";

const tilesRenderer = new TilesRenderer("/tileset/tileset.json");
tilesRenderer.setCamera(camera);
tilesRenderer.setResolutionFromRenderer(camera, renderer);

scene.add(tilesRenderer.group);

function animate() {
  tilesRenderer.update();
  renderer.render(scene, camera);
}
```

The renderer fetches and discards tiles automatically as the camera moves. A 500M-triangle city model loads in under 2 seconds with appropriate tile sizing because the viewer only fetches tiles covering the current view frustum.

**Tile sizing rule of thumb:** Target 500k–2M triangles per leaf tile and 10–100 leaf tiles in view at any given camera position. Larger tiles reduce request overhead; smaller tiles allow finer-grained LOD transitions.

### Chunked glTF for Progressive Loading

For datasets without geographic coordinates (mechanical assemblies, game levels), split the mesh into spatial chunks and load them independently. Use glTF's `EXT_mesh_gpu_instancing` for repeated objects:

```bash
# Split a large mesh with gltfpack (from meshoptimizer)
gltfpack -i large_assembly.glb -o optimized.glb \
  -si 0.9 \   # simplification ratio per LOD
  -cc          # vertex/index buffer compression
```

Then serve chunks separately and load them with a frustum-culling loader:

```typescript
// Load a chunk only when it's within a given distance
const chunkLoader = new THREE.GLTFLoader();
if (camera.frustum.intersectsBox(chunkBBox)) {
  chunkLoader.load(`/chunks/chunk_${id}.glb`, (gltf) => {
    scene.add(gltf.scene);
    loadedChunks.set(id, gltf.scene);
  });
}
```

## Large Point Cloud Attribute Storage

### Apache Arrow / Feather

For point clouds with many per-point attributes (position, normal, color, intensity, classification, GPS time), Apache Arrow provides a columnar binary format with zero-copy reads. Each attribute is a contiguous typed array — a viewer that only needs XYZ positions doesn't pay to read the intensity column.

Apache Arrow Python docs: [arrow.apache.org/docs/python](https://arrow.apache.org/docs/python/)

```python
import pyarrow as pa
import pyarrow.feather as feather
import numpy as np

# Write a point cloud with multiple attributes
n = 10_000_000  # 10M points
table = pa.table({
    "x": pa.array(positions[:, 0], type=pa.float32()),
    "y": pa.array(positions[:, 1], type=pa.float32()),
    "z": pa.array(positions[:, 2], type=pa.float32()),
    "intensity": pa.array(intensity, type=pa.uint16()),
    "classification": pa.array(labels, type=pa.uint8()),
    "r": pa.array(colors[:, 0], type=pa.uint8()),
    "g": pa.array(colors[:, 1], type=pa.uint8()),
    "b": pa.array(colors[:, 2], type=pa.uint8()),
})

# Write compressed Feather (IPC format with LZ4)
feather.write_feather(table, "cloud.feather", compression="lz4")

# Read — only load the columns you need
xyz = feather.read_feather("cloud.feather", columns=["x", "y", "z"])
pts = np.stack([xyz["x"], xyz["y"], xyz["z"]], axis=1)  # (N, 3) numpy array
```

10M float32 XYZ points: ~120 MB uncompressed, ~40 MB LZ4-compressed. Reading only XYZ from a 10-column file skips the remaining 60 MB entirely.

For streaming large files, use Arrow IPC streaming format:

```python
import pyarrow.ipc as ipc

# Write as IPC stream (can be piped / streamed)
with open("cloud.arrows", "wb") as f:
    writer = ipc.new_stream(f, table.schema)
    for batch in table.to_batches(max_chunksize=100_000):
        writer.write_batch(batch)
    writer.close()

# Read in batches (constant memory)
with ipc.open_stream("cloud.arrows") as reader:
    for batch in reader:
        pts = batch.column("x").to_pylist()  # process one batch at a time
```

### Storage Format Decision Table

| Data | Size | Use |
|------|------|-----|
| Voxel grid ≤ 512³ | < 500 MB | NumPy `.npy` or HDF5 |
| Voxel grid > 512³ or cloud-hosted | Any | Zarr with Blosc/Zstd |
| Multiscale volumetric data | Any | OME-Zarr |
| GPU-ready SDF / density volume | Any | NanoVDB (`.nvdb`) |
| Mesh ≤ 5M triangles | < 200 MB | glTF/GLB + Draco |
| Mesh > 5M triangles, geographic | Any | 3D Tiles (B3DM) |
| Mesh > 5M triangles, non-geographic | Any | Chunked GLB + frustum loader |
| Point cloud with attributes | Any | Feather (Arrow IPC) |
| LiDAR / geospatial point cloud | Any | LAZ |
| Point cloud for browser | Any | Potree octree tiles |
