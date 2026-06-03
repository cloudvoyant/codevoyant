---
title: compgeo
---

# compgeo

Context skill for computational geometry — meshes, voxels, point clouds, and signed distance fields across Python (trimesh, open3d, pyvista), C++ (CGAL, libigl, Embree, OpenVDB), and TypeScript (three.js, react-drei, threlte) for frontend visualization.

## Philosophy

Framed around games/simulation use cases, not CAD/CAM. Geometry is treated as data: load it, analyze it, transform it, store it, render it. Every recipe explains the data structure implications before the API calls — understanding what a voxel grid or BVH actually is makes the library choices obvious.

## Recipes

- [Reading 3D Formats](./compgeo/recipes/reading-3d-formats) — STEP, OBJ, STL, PLY, glTF; Python and C++ loading pipelines
- [Bounding Box Analysis](./compgeo/recipes/bounding-box-analysis) — AABB, OBB, min enclosing sphere; when each matters
- [Voxels and Point Clouds](./compgeo/recipes/voxels-and-point-clouds) — mesh-to-voxel and mesh-to-point-cloud sampling
- [Feature Extraction](./compgeo/recipes/feature-extraction) — normals, curvature, boundaries, sharp edges, symmetry
- [Ray Tracing on Geometry](./compgeo/recipes/ray-tracing) — BVH, ray-mesh, ray-voxel, ray-point-cloud queries
- [Storage and Compression](./compgeo/recipes/storage-and-compression) — Draco, quantization, RLE voxels, LAS/PLY point clouds
- [GLTF Visualization](./compgeo/recipes/gltf-visualization) — three.js/react-drei/threlte scene setup, LOD, materials
- [GLTF Animation](./compgeo/recipes/gltf-animation) — morph targets, skeletal animation, animation clips
- [Real-time Mesh Modification](./compgeo/recipes/realtime-modification) — browser CSG, GPU displacement, vertex buffer updates
- [Mesh Reconstruction](./compgeo/recipes/mesh-reconstruction) — Marching Cubes, Poisson from voxels/point clouds
- [Dexels and Signed Distance Fields](./compgeo/recipes/dexels-and-sdf) — SDF generation, boolean ops, raymarching
- [Rotations and Transforms](./compgeo/recipes/rotations-and-transforms) — quaternions, Euler angles, axis-angle, homogeneous transforms, slerp, common pitfalls
- [Voxel Operations with OpenVDB](./compgeo/recipes/voxel-operations) — CSG boolean ops, dilation/erosion, rotation, querying, mesh/point-cloud round-trip
- [Wire Formats for Real-Time Geometry](./compgeo/recipes/wire-formats-realtime) — FlatBuffers, delta encoding, WebSocket framing, compact transform protocol

## References

- [trimesh](https://trimesh.org/)
- [Open3D](http://www.open3d.org/)
- [CGAL](https://www.cgal.org/)
- [Intel Embree](https://www.embree.org/)
- [OpenVDB](https://www.openvdb.org/)
- [NanoVDB](https://www.openvdb.org/documentation/doxygen/NanoVDB_MainPage.html)
- [libigl](https://libigl.github.io/)
- [three.js](https://threejs.org/docs/)
- [react-drei](https://drei.docs.pmnd.rs/)
- [threlte](https://threlte.xyz/docs)
- [FlatBuffers](https://flatbuffers.dev/)
- [Apache Arrow](https://arrow.apache.org/)
- [3D Tiles](https://github.com/CesiumGS/3d-tiles)
