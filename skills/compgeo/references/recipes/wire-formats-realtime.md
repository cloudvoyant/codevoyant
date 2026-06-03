# Wire Formats for Real-Time Geometry Streaming

When streaming geometry from a server to a browser (or between services), the wire format determines latency, bandwidth, and how much CPU you spend serializing and deserializing. This recipe covers the formats and patterns for real-time geometry: vertex buffer streaming, incremental updates, compact transform protocols, and binary WebSocket framing. For browser-side vertex modification and the architecture-level WebSocket pattern, see the [real-time modification recipe](./realtime-modification.md).

## FlatBuffers: Zero-Copy Vertex Buffers

FlatBuffers serialize data into a flat binary buffer that can be read directly — no parse step, no allocation, no copy. The reader accesses fields via offsets into the raw bytes. For vertex buffers, this means the client can pass the received buffer directly to `Float32Array` without deserialization.

FlatBuffers docs: [flatbuffers.dev](https://flatbuffers.dev/)

### Schema

```fbs
// geometry.fbs
namespace compgeo;

table VertexBuffer {
  positions: [float];   // length = n_vertices * 3  (x0,y0,z0, x1,y1,z1, ...)
  normals:   [float];   // length = n_vertices * 3  (optional)
  uvs:       [float];   // length = n_vertices * 2  (optional)
  indices:   [uint];    // length = n_triangles * 3
  name:      string;
}

root_type VertexBuffer;
```

```bash
flatc --python --ts geometry.fbs   # generates geometry_generated.py and geometry_generated.ts
```

### Python server: encode

```python
import flatbuffers
from compgeo import VertexBuffer  # generated

def encode_mesh(vertices, normals, indices):
    builder = flatbuffers.Builder(1024 * 1024)

    # Encode arrays (must be created before the table)
    pos_vec = builder.CreateNumpyVector(vertices.flatten().astype("float32"))
    nrm_vec = builder.CreateNumpyVector(normals.flatten().astype("float32"))
    idx_vec = builder.CreateNumpyVector(indices.flatten().astype("uint32"))

    VertexBuffer.Start(builder)
    VertexBuffer.AddPositions(builder, pos_vec)
    VertexBuffer.AddNormals(builder, nrm_vec)
    VertexBuffer.AddIndices(builder, idx_vec)
    buf = VertexBuffer.End(builder)

    builder.Finish(buf)
    return bytes(builder.Output())
```

### TypeScript client: zero-copy read

```typescript
import { ByteBuffer } from "flatbuffers";
import { VertexBuffer } from "./geometry_generated";

ws.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  const buf = new ByteBuffer(new Uint8Array(event.data));
  const vb = VertexBuffer.getRootAsVertexBuffer(buf);

  // Zero-copy — positions() returns a Float32Array view into the received buffer
  const positions = vb.positionsArray()!;    // Float32Array, no copy
  const indices   = vb.indicesArray()!;      // Uint32Array

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.attributes.position.needsUpdate = true;
};
```

FlatBuffers decode overhead for a 100k-vertex mesh: ~0.1ms. Equivalent JSON parse: ~50ms. The difference is material for 60fps streaming.

## Binary Delta Encoding

When geometry changes incrementally (sculpting, cloth simulation, fluid surface), only transmit the changed vertices. Two approaches:

### Bitmask delta

Send a bitmask of which vertices changed, followed by the new values for those vertices only:

```python
import numpy as np
import struct

def encode_delta(prev_verts: np.ndarray, curr_verts: np.ndarray) -> bytes:
    diff = curr_verts != prev_verts                  # (N, 3) bool
    changed = diff.any(axis=1)                       # (N,) bool — which vertices changed
    indices = np.where(changed)[0].astype(np.uint32) # indices of changed vertices
    values  = curr_verts[changed].astype(np.float32) # their new positions

    # Frame: [n_changed: u32][indices: u32 * n][values: f32 * n * 3]
    header = struct.pack("<I", len(indices))
    return header + indices.tobytes() + values.tobytes()

def decode_delta(prev_verts: np.ndarray, payload: bytes) -> np.ndarray:
    n = struct.unpack_from("<I", payload, 0)[0]
    offset = 4
    indices = np.frombuffer(payload, dtype=np.uint32, count=n, offset=offset)
    offset += n * 4
    values  = np.frombuffer(payload, dtype=np.float32, count=n * 3, offset=offset).reshape(-1, 3)
    result = prev_verts.copy()
    result[indices] = values
    return result
```

TypeScript receiver:

```typescript
function applyDelta(prevPositions: Float32Array, payload: ArrayBuffer): void {
  const view = new DataView(payload);
  const n = view.getUint32(0, true);  // little-endian
  const indexBytes  = new Uint32Array(payload, 4, n);
  const valueBytes  = new Float32Array(payload, 4 + n * 4, n * 3);

  for (let i = 0; i < n; i++) {
    const vi = indexBytes[i] * 3;
    prevPositions[vi]     = valueBytes[i * 3];
    prevPositions[vi + 1] = valueBytes[i * 3 + 1];
    prevPositions[vi + 2] = valueBytes[i * 3 + 2];
  }
  geometry.attributes.position.needsUpdate = true;
}
```

**When delta beats full upload:** If fewer than ~30% of vertices change per frame, the delta is smaller. Above 30%, the bitmask overhead dominates and a full upload is cheaper. Measure for your specific simulation.

### Quantized delta

For smooth deformations (cloth, fluid), compress each delta as a quantized displacement:

```python
def encode_quantized_delta(prev, curr, max_displacement=0.1, bits=16):
    delta = curr - prev                           # (N, 3)
    scale = (2 ** bits - 1) / (2 * max_displacement)
    quantized = np.clip(delta * scale + 2**(bits-1), 0, 2**bits - 1).astype(np.uint16)
    # Quantized delta is 2 bytes/component vs 4 bytes/component for float32
    return quantized.tobytes()
```

16-bit quantized displacement at max_displacement=0.1 gives ~3 micrometer precision. Halves bandwidth vs float32 deltas.

## WebSocket Binary Framing

When a WebSocket carries multiple message types (mesh updates, transform updates, metadata), add a lightweight header so the receiver can dispatch without parsing the full payload:

```
[ opcode: u8 ][ seq: u32 ][ length: u32 ][ payload: bytes ]
  1 byte        4 bytes     4 bytes
```

Opcodes:
- `0x01` — full vertex buffer (FlatBuffers VertexBuffer)
- `0x02` — bitmask delta
- `0x03` — compact transform update (see below)
- `0x04` — metadata / JSON side-channel
- `0xFF` — ping

Python server encoder:

```python
import struct

OPCODE_FULL_MESH  = 0x01
OPCODE_DELTA      = 0x02
OPCODE_TRANSFORM  = 0x03

def frame(opcode: int, seq: int, payload: bytes) -> bytes:
    header = struct.pack("<BII", opcode, seq, len(payload))
    return header + payload

# Usage
msg = frame(OPCODE_FULL_MESH, seq_counter, flatbuf_bytes)
await websocket.send(msg)
```

TypeScript receiver:

```typescript
const HEADER_SIZE = 9;  // 1 + 4 + 4

ws.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  const header = new DataView(event.data, 0, HEADER_SIZE);
  const opcode = header.getUint8(0);
  const seq    = header.getUint32(1, true);
  const length = header.getUint32(5, true);
  const payload = event.data.slice(HEADER_SIZE, HEADER_SIZE + length);

  switch (opcode) {
    case 0x01: handleFullMesh(payload); break;
    case 0x02: handleDelta(payload);    break;
    case 0x03: handleTransform(payload); break;
  }
};
```

**Backpressure:** If the server produces frames faster than the browser can consume them, buffer them server-side and drop old ones of the same opcode type (always keep the latest full mesh, but skip intermediate deltas):

```python
# Drop stale frames of the same opcode before sending the next one
pending = {}  # opcode -> queued bytes

async def enqueue(opcode, payload):
    pending[opcode] = frame(opcode, next_seq(), payload)

async def flush_loop(websocket):
    while True:
        if pending:
            for opcode, msg in list(pending.items()):
                await websocket.send(msg)
                del pending[opcode]
        await asyncio.sleep(1/60)  # 60 Hz flush
```

## Compact Transform Protocol

For rigid-body objects (robots, vehicles, scene nodes), stream position + rotation + scale as packed float32 arrays — no serialization library needed:

```
[ object_id: u32 ][ px: f32 ][ py: f32 ][ pz: f32 ]
[ rx: f32 ][ ry: f32 ][ rz: f32 ][ rw: f32 ]
[ sx: f32 ][ sy: f32 ][ sz: f32 ]
= 11 fields x 4 bytes + 4 = 48 bytes per object per frame
```

Use quaternion (rx, ry, rz, rw) not Euler angles — quaternions interpolate correctly and avoid gimbal lock.

Python server:

```python
import struct
import numpy as np

def encode_transform(obj_id: int, pos, quat, scale) -> bytes:
    return struct.pack("<I3f4f3f",
        obj_id,
        pos[0], pos[1], pos[2],
        quat[0], quat[1], quat[2], quat[3],
        scale[0], scale[1], scale[2],
    )

def encode_transform_batch(objects: list[dict]) -> bytes:
    count = len(objects)
    header = struct.pack("<I", count)
    body = b"".join(encode_transform(**o) for o in objects)
    return header + body
```

TypeScript receiver:

```typescript
function applyTransforms(payload: ArrayBuffer): void {
  const view = new DataView(payload);
  const count = view.getUint32(0, true);
  let offset = 4;

  for (let i = 0; i < count; i++) {
    const id = view.getUint32(offset, true); offset += 4;
    const px = view.getFloat32(offset, true); offset += 4;
    const py = view.getFloat32(offset, true); offset += 4;
    const pz = view.getFloat32(offset, true); offset += 4;
    const rx = view.getFloat32(offset, true); offset += 4;
    const ry = view.getFloat32(offset, true); offset += 4;
    const rz = view.getFloat32(offset, true); offset += 4;
    const rw = view.getFloat32(offset, true); offset += 4;
    const sx = view.getFloat32(offset, true); offset += 4;
    const sy = view.getFloat32(offset, true); offset += 4;
    const sz = view.getFloat32(offset, true); offset += 4;

    const obj = scene.getObjectByName(String(id));
    if (obj) {
      obj.position.set(px, py, pz);
      obj.quaternion.set(rx, ry, rz, rw);
      obj.scale.set(sx, sy, sz);
    }
  }
}
```

100 objects at 60 Hz: 48 bytes x 100 x 60 = 288 KB/s — well within a standard WebSocket connection.

## gRPC Streaming for Geometry Pipelines

For server-side geometry services (physics simulation, mesh processing), gRPC's bidirectional streaming carries requests and results efficiently. Protobuf handles serialization; gRPC handles framing and multiplexing.

```protobuf
// geometry.proto
syntax = "proto3";

service GeometryService {
  rpc StreamMesh (stream MeshRequest) returns (stream MeshResponse);
}

message MeshRequest {
  bytes params = 1;        // operation parameters (JSON or packed binary)
  uint32 request_id = 2;
}

message MeshResponse {
  uint32 request_id = 1;
  bytes vertex_data = 2;   // raw float32 vertex positions
  bytes index_data  = 3;   // raw uint32 indices
  string error      = 4;
}
```

Python server:

```python
import grpc
import geometry_pb2
import geometry_pb2_grpc
import numpy as np

class GeometryServicer(geometry_pb2_grpc.GeometryServiceServicer):
    async def StreamMesh(self, request_iterator, context):
        async for req in request_iterator:
            # Run geometry operation
            verts, indices = run_operation(req.params)
            yield geometry_pb2.MeshResponse(
                request_id=req.request_id,
                vertex_data=verts.astype(np.float32).tobytes(),
                index_data=indices.astype(np.uint32).tobytes(),
            )
```

TypeScript client (using `@grpc/grpc-js`):

```typescript
import * as grpc from "@grpc/grpc-js";
import { GeometryServiceClient } from "./geometry_grpc_pb";

const client = new GeometryServiceClient("localhost:50051", grpc.credentials.createInsecure());
const stream = client.streamMesh();

stream.on("data", (response) => {
  const verts   = new Float32Array(response.getVertexData_asU8().buffer);
  const indices = new Uint32Array(response.getIndexData_asU8().buffer);
  updateGeometry(verts, indices);
});

// Send a request
stream.write({ params: JSON.stringify({ operation: "cut", plane: [0,1,0,0] }), request_id: 1 });
```

gRPC vs WebSocket for geometry: gRPC wins when you have a multi-service architecture (type-safe contracts, multiplexed streams, retries). WebSocket wins for direct browser-to-server connections (gRPC requires a proxy like Envoy for browser clients due to HTTP/2 framing constraints).

## Format Comparison

| Format | Encode cost | Decode cost | Size | Zero-copy | Browser native |
|--------|-------------|-------------|------|-----------|----------------|
| Raw binary (custom) | ~0ms | ~0ms | Minimal | Yes | Yes |
| FlatBuffers | Low | ~0ms | Small | Yes | Yes (via wasm) |
| MessagePack | Low | Low | Small | No | Via library |
| Protobuf | Low | Low | Small | No | Via library |
| CBOR | Medium | Medium | Medium | No | Via library |
| JSON | High | High | Large | No | Native |

For geometry (large typed arrays), raw binary or FlatBuffers wins. For metadata and control messages (small structured objects), MessagePack or Protobuf wins. Never use JSON for vertex data.
