# Reading 3D Formats

Getting geometry into memory is the first step in any pipeline. The format you start with determines what information is available downstream: a STEP file preserves exact mathematical surfaces (B-rep), while an STL file gives you only triangles. Understanding the difference saves you from losing precision you needed or carrying precision you don't.

## Why This Matters

A mesh is vertices (3D positions), faces (indices connecting vertices into triangles or quads), and optional per-vertex data: normals, UV texture coordinates, vertex colors. That's the runtime representation, but the file format determines what arrives:

- **B-rep formats** (STEP, IGES) store exact mathematical surfaces — planes, cylinders, NURBS. They preserve infinite precision and can be tessellated at any resolution. Used in CAD; heavy to parse.
- **Tessellated formats** (OBJ, STL, PLY) store pre-computed triangles. Lighter, but resolution is baked in at export time. STL doesn't even carry normals or UVs — just triangles.
- **Renderer-native formats** (glTF/GLB, FBX) are designed for real-time engines. They carry materials, textures, animations, and scene graphs. glTF is the JPEG of 3D.

Picking the wrong loader for the wrong format is the most common early mistake. Trimesh can't read STEP. Open CASCADE can read STEP but gives you topology, not a mesh — you need to tessellate first.

## Format Overview

| Format | Encodes | Typical Source | Best For |
|--------|---------|---------------|----------|
| STEP (.step/.stp) | B-rep (exact surfaces, topology) | CAD exports (SolidWorks, Fusion 360) | Precision geometry, manufacturing |
| IGES (.igs/.iges) | B-rep (older standard) | Legacy CAD systems | Interop with older tools |
| OBJ (.obj) | Vertices, faces, normals, UVs, materials | DCC tools (Blender, Maya) | General interchange |
| STL (.stl) | Triangles only (no normals, no UVs) | 3D printing slicers | 3D printing, simple geometry |
| PLY (.ply) | Vertices, faces, vertex colors, custom properties | 3D scanners, point cloud tools | Scanned data, point clouds |
| glTF/GLB (.gltf/.glb) | Meshes, materials, textures, animations, scene graph | Game engines, web 3D | Real-time rendering |
| FBX (.fbx) | Meshes, materials, animations, skeleton | DCC tools, game engines | Animation pipelines |

## Python: trimesh

Trimesh is the default choice for loading tessellated formats. It's fast, well-documented, and gives you a numpy-backed mesh with batteries included.

```python
import trimesh

# Load a single mesh
mesh = trimesh.load("model.obj")

# If the file contains multiple objects, you get a Scene
scene = trimesh.load("multi_object.glb")
if isinstance(scene, trimesh.Scene):
    for name, geom in scene.geometry.items():
        print(f"{name}: {len(geom.vertices)} verts, {len(geom.faces)} faces")

# Access the data you care about
vertices = mesh.vertices          # (N, 3) float64
faces = mesh.faces                # (M, 3) int64
normals = mesh.vertex_normals     # computed if missing

# Watertightness check — critical for voxelization and boolean ops
print(mesh.is_watertight)
```

Trimesh handles OBJ, STL, PLY, glTF/GLB, OFF, and 3MF. It does not handle STEP or IGES — for those, see Open CASCADE below.

Trimesh docs: [trimesh.org/trimesh.html](https://trimesh.org/trimesh.html)

## Python: Open3D

Open3D overlaps with trimesh for mesh loading but shines for point cloud workflows. Prefer Open3D when your pipeline involves point cloud processing (registration, downsampling, normals estimation) or when you need its visualization window for debugging.

```python
import open3d as o3d

# Mesh loading
mesh = o3d.io.read_triangle_mesh("model.ply")
mesh.compute_vertex_normals()  # Open3D doesn't auto-compute

# Point cloud loading
pcd = o3d.io.read_point_cloud("scan.ply")
print(f"{len(pcd.points)} points")
```

Open3D supports OBJ, STL, PLY, OFF, and glTF. Its mesh API is thinner than trimesh's — fewer convenience methods, no built-in boolean operations. But its point cloud and volumetric integration APIs are much stronger.

Open3D docs: [open3d.org/docs/release/](http://www.open3d.org/docs/release/)

## Python: pythonocc / Open CASCADE

For STEP and IGES files you need a B-rep kernel. pythonocc is the Python binding for Open CASCADE Technology (OCCT). Loading a STEP file gives you a topological shape, not a mesh — you choose the tessellation resolution.

```python
from OCC.Core.STEPControl import STEPControl_Reader
from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
from OCC.Core.TopExp import TopExp_Explorer
from OCC.Core.TopAbs import TopAbs_FACE

# Load STEP
reader = STEPControl_Reader()
reader.ReadFile("part.step")
reader.TransferRoots()
shape = reader.OneShape()

# Tessellate — linear_deflection controls triangle density
mesh = BRepMesh_IncrementalMesh(shape, 0.1)  # 0.1mm deflection
mesh.Perform()

# Now you can extract triangulated faces
explorer = TopExp_Explorer(shape, TopAbs_FACE)
```

The deflection parameter is the maximum distance between the tessellated surface and the true mathematical surface. Smaller values give denser meshes. Start with 0.1 for visualization, drop to 0.01 for analysis where surface accuracy matters.

pythonocc docs: [github.com/tpaviot/pythonocc-core](https://github.com/tpaviot/pythonocc-core)
Open CASCADE docs: [dev.opencascade.org/doc/overview/html/](https://dev.opencascade.org/doc/overview/html/)

## C++: Assimp

Assimp (Asset-Import-Library) is the Swiss army knife for loading tessellated formats in C++. It normalizes everything into a common `aiScene` structure.

```cpp
#include <assimp/Importer.hpp>
#include <assimp/scene.h>
#include <assimp/postprocess.h>

Assimp::Importer importer;
const aiScene* scene = importer.ReadFile("model.obj",
    aiProcess_Triangulate | aiProcess_GenNormals);

if (!scene || scene->mFlags & AI_SCENE_FLAGS_INCOMPLETE) {
    // handle error: importer.GetErrorString()
}

for (unsigned i = 0; i < scene->mNumMeshes; ++i) {
    aiMesh* mesh = scene->mMeshes[i];
    // mesh->mVertices[j] — aiVector3D
    // mesh->mFaces[j].mIndices — face indices
    // mesh->mNormals[j] — per-vertex normals (if GenNormals flag set)
}
```

CMake with vcpkg or Conan:

```cmake
find_package(assimp REQUIRED)
target_link_libraries(myapp PRIVATE assimp::assimp)
```

Assimp supports 40+ formats including OBJ, STL, PLY, glTF, FBX, and Collada. It does not support STEP/IGES.

Assimp docs: [assimp-docs.readthedocs.io](https://assimp-docs.readthedocs.io/)

## C++: Open CASCADE (OCCT)

For STEP files in C++ you use OCCT directly. The pattern mirrors the Python version: read the file, get a `TopoDS_Shape`, tessellate it.

```cpp
#include <STEPControl_Reader.hxx>
#include <BRepMesh_IncrementalMesh.hxx>
#include <TopExp_Explorer.hxx>
#include <TopoDS.hxx>
#include <BRep_Tool.hxx>
#include <Poly_Triangulation.hxx>

STEPControl_Reader reader;
reader.ReadFile("part.step");
reader.TransferRoots();
TopoDS_Shape shape = reader.OneShape();

// Tessellate
BRepMesh_IncrementalMesh mesher(shape, 0.1);
mesher.Perform();

// Extract triangles from each face
TopExp_Explorer explorer(shape, TopAbs_FACE);
for (; explorer.More(); explorer.Next()) {
    TopoDS_Face face = TopoDS::Face(explorer.Current());
    TopLoc_Location loc;
    auto tri = BRep_Tool::Triangulation(face, loc);
    if (!tri.IsNull()) {
        // tri->NbTriangles(), tri->Node(i), tri->Triangle(i)
    }
}
```

OCCT is large — expect a non-trivial build setup. vcpkg has an `opencascade` port. On Ubuntu, `libocct-*-dev` packages are available.

OCCT docs: [dev.opencascade.org/doc/overview/html/](https://dev.opencascade.org/doc/overview/html/)

## C++: Bridging with Python

Sometimes the fastest path to loading exotic formats in a C++ pipeline is to call trimesh or Open3D through pybind11 or a subprocess. This is a valid pattern for offline/batch processing. It's not a valid pattern for real-time applications where the Python GIL or process spawn overhead would be a problem.

If your geometry loading is a one-time pipeline step (load → process → write binary), scripting the load in Python and passing serialized data to C++ is often simpler than adding another C++ dependency.

## Format Gotchas

**Coordinate systems.** glTF uses right-handed Y-up. OBJ is typically right-handed Y-up. STL has no convention (check your exporter). Blender exports Z-up by default. FBX varies by DCC tool. Always verify your up-axis before computing anything spatial — a 90-degree rotation error in your pipeline will produce silently wrong results.

**Units.** STEP files carry unit metadata (usually millimeters). OBJ/STL/PLY carry no units at all. If you're combining meshes from different sources, normalize to a common unit early.

**ASCII vs binary.** STL and PLY both have ASCII and binary variants. Binary is 5-10x smaller and faster to parse. Always prefer binary for production pipelines. Trimesh and Assimp handle both transparently.

**Multi-mesh files.** glTF, FBX, and OBJ can contain multiple meshes in a scene hierarchy. Don't assume `load()` returns a single mesh — check whether you got a scene. In trimesh, a multi-object file returns a `Scene`, not a `Trimesh`.

**Winding order.** Face winding (clockwise vs counter-clockwise) determines which side of a triangle is "front." STL files frequently have inconsistent winding. If your mesh looks inside-out or boolean operations fail, check and fix winding with `trimesh.repair.fix_winding(mesh)` or Assimp's `aiProcess_FixInfacingNormals`.
