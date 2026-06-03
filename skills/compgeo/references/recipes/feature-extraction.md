# Feature Extraction

Features are how you turn raw geometry into answers. A mesh is just triangles until you ask it questions: "where are the holes?", "where is this sharp enough to be a cutting edge?", "does this object have rotational symmetry?" Extracting geometric features is the bridge between having a mesh and doing something useful with it — feeding ML models, running QA checks, rigging for animation, or segmenting a scan into semantic parts.

## Why This Matters

Most geometry pipelines don't operate on the mesh directly. They operate on derived properties: surface normals for rendering and physics, curvature for feature-point detection and simplification, boundary loops for hole-filling, sharp edges for mesh segmentation. Getting these right (and understanding when they're wrong) determines whether downstream steps produce correct results.

Common downstream uses:
- **ML training data**: per-vertex curvature and normals as input features for point cloud classifiers
- **Quality assurance**: detecting holes, self-intersections, and degenerate faces in manufactured parts
- **Animation rigging**: identifying joint locations by curvature extrema
- **Segmentation**: grouping faces into patches by curvature class (flat, convex, concave, crease)

## Surface Normals

A surface normal is a unit vector perpendicular to the surface at a given point. There are two flavors:

- **Per-face normals**: one normal per triangle, computed from the cross product of two edge vectors. Cheap and unambiguous. Used in flat-shaded rendering and face-level geometric queries.
- **Per-vertex normals**: one normal per vertex, computed as a weighted average of the normals of all faces sharing that vertex. Gives smooth shading but introduces ambiguity at sharp creases (e.g., the edge of a cube should not be smooth-shaded).

When smooth shading matters: always for rendering organic shapes. Never for CAD models with sharp creases unless you split vertices at the crease edges first.

### Python

```python
import trimesh
import numpy as np

mesh = trimesh.load("model.obj")

# Per-face normals (auto-computed)
face_normals = mesh.face_normals  # (M, 3) float64

# Per-vertex normals (area-weighted average of adjacent face normals)
vertex_normals = mesh.vertex_normals  # (N, 3) float64
```

Open3D requires an explicit call to compute normals — they are not available by default after loading:

```python
import open3d as o3d

mesh = o3d.io.read_triangle_mesh("model.obj")
mesh.compute_vertex_normals()   # modifies mesh in-place
mesh.compute_triangle_normals()

normals = np.asarray(mesh.vertex_normals)
```

For point clouds (no faces), Open3D estimates normals from local neighborhoods:

```python
pcd = o3d.io.read_point_cloud("scan.ply")
pcd.estimate_normals(search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=0.1, max_nn=30))

# Orient normals consistently (outward)
pcd.orient_normals_consistent_tangent_plane(k=15)
```

### C++

With Eigen, computing a face normal from three vertices is one cross product:

```cpp
Eigen::Vector3d normal = (v1 - v0).cross(v2 - v0).normalized();
```

PCL provides normal estimation for point clouds with configurable neighborhood radius:

```cpp
#include <pcl/features/normal_3d.h>

pcl::NormalEstimation<pcl::PointXYZ, pcl::Normal> ne;
ne.setInputCloud(cloud);

pcl::search::KdTree<pcl::PointXYZ>::Ptr tree(new pcl::search::KdTree<pcl::PointXYZ>());
ne.setSearchMethod(tree);
ne.setRadiusSearch(0.03);  // meters

pcl::PointCloud<pcl::Normal>::Ptr normals(new pcl::PointCloud<pcl::Normal>());
ne.compute(*normals);
```

Normal orientation is inherently ambiguous for point clouds — there's no face winding to tell you which side is "out." PCL's normal estimation picks a consistent local orientation but may flip globally. Use a viewpoint hint (`ne.setViewPoint(...)`) when you know the sensor position.

PCL normal estimation docs: [pointclouds.org/documentation/tutorials/normal_estimation.html](https://pointclouds.org/documentation/tutorials/normal_estimation.html)

## Curvature

Curvature measures how much a surface bends at a point. Two principal curvatures (k1, k2) describe the maximum and minimum bending in orthogonal directions. From these you derive:

- **Gaussian curvature** = k1 * k2. Zero on a flat surface or a cylinder. Positive on a sphere. Negative on a saddle (hyperbolic paraboloid). Tells you about the intrinsic shape type.
- **Mean curvature** = (k1 + k2) / 2. Zero on minimal surfaces. Measures the overall "bending amount." Useful for smoothing and feature detection.

Intuition: a flat sheet has both curvatures zero. A sphere curves the same way in all directions (positive Gaussian). A saddle curves up in one direction and down in the other (negative Gaussian). A cylinder curves in one direction only (zero Gaussian, nonzero mean).

### Python

Trimesh provides discrete curvature measures integrated over a neighborhood radius:

```python
import trimesh

mesh = trimesh.load("model.obj")

# Gaussian curvature per vertex (integrated over radius)
gaussian = trimesh.curvature.discrete_gaussian_curvature_measure(mesh, mesh.vertices, radius=0.1)

# Mean curvature per vertex
mean = trimesh.curvature.discrete_mean_curvature_measure(mesh, mesh.vertices, radius=0.1)
```

The `radius` parameter controls the integration neighborhood. Smaller radius captures finer detail but is noisier. Larger radius gives smoother estimates but blurs sharp features. Start with a radius around 1-5% of the mesh bounding box diagonal.

### C++

libigl provides curvature computation on triangle meshes using Eigen matrices:

```cpp
#include <igl/gaussian_curvature.h>
#include <igl/principal_curvature.h>

Eigen::MatrixXd V;  // vertices (N x 3)
Eigen::MatrixXi F;  // faces (M x 3)

// Gaussian curvature via angle defect
Eigen::VectorXd K;
igl::gaussian_curvature(V, F, K);

// Principal curvatures and directions
Eigen::MatrixXd PD1, PD2;  // principal directions
Eigen::VectorXd PV1, PV2;  // principal curvature values
igl::principal_curvature(V, F, PD1, PD2, PV1, PV2);
```

CMake setup for libigl (header-only with Eigen dependency):

```cmake
find_package(libigl REQUIRED)
target_link_libraries(myapp PRIVATE igl::core)
```

libigl curvature tutorial: [libigl.github.io/tutorial/#curvature-directions](https://libigl.github.io/tutorial/#curvature-directions)

**CGAL Jet_fitting_3 (more accurate for noisy data):**

CGAL's `Jet_fitting_3` fits a polynomial surface (a "jet") through each point's neighborhood and analytically derives principal curvatures. It's more accurate than the angle-defect method on noisy scans and doesn't require a triangle mesh — works directly on point clouds.

```cpp
#include <CGAL/Exact_predicates_inexact_constructions_kernel.h>
#include <CGAL/Monge_via_jet_fitting.h>
#include <list>

typedef CGAL::Exact_predicates_inexact_constructions_kernel Kernel;
typedef Kernel::Point_3                                     Point_3;
typedef CGAL::Monge_via_jet_fitting<Kernel>                 Monge_via_jet_fitting;
typedef Monge_via_jet_fitting::Monge_form                   Monge_form;

// For each point, collect its k nearest neighbors into 'neighborhood'
std::list<Point_3> neighborhood = { /* k nearest points including the point itself */ };

Monge_via_jet_fitting fit;
// degree_fitting=2 for curvature; degree_monge=2 for principal curvatures
Monge_form monge = fit(neighborhood.begin(), neighborhood.end(), /*degree_fitting=*/2, /*degree_monge=*/2);

// Principal curvatures
double k1 = monge.principal_curvatures(0);  // maximum curvature
double k2 = monge.principal_curvatures(1);  // minimum curvature

// Principal directions (as 3D vectors)
auto d1 = monge.maximal_principal_direction();
auto d2 = monge.minimal_principal_direction();

double mean_curvature     = (k1 + k2) / 2.0;
double gaussian_curvature = k1 * k2;
```

CMake setup:
```cmake
find_package(CGAL REQUIRED)
target_link_libraries(myapp PRIVATE CGAL::CGAL)
```

When to prefer CGAL over libigl for curvature: noisy point cloud data, when you need principal directions (not just magnitudes), or when the mesh has poor triangle quality. libigl's angle-defect is faster for clean meshes but degrades significantly on scans.

### Practical Uses

- **Curvature-based mesh simplification**: collapse edges in low-curvature (flat) regions first; preserve high-curvature regions. This gives better visual results than uniform simplification.
- **Feature point detection**: local curvature extrema mark corners, ridges, and valleys — useful for registration (aligning two scans) and keypoint matching.
- **Defect detection**: manufactured parts should match a design model's curvature profile; deviations flag machining errors or damage.

## Boundary and Hole Detection

A boundary edge is an edge that belongs to exactly one face. On a watertight mesh, every edge has exactly two adjacent faces. If any edge has only one face, the mesh has a boundary — which could be a designed opening or an accidental hole from bad data.

### Python

```python
import trimesh

mesh = trimesh.load("model.obj")

# Quick watertightness check
print(mesh.is_watertight)  # True if no boundary edges and consistent winding

# Get boundary edges as line segments
outline = mesh.outline()  # Path3D object with boundary edges

# Find unique edges and identify boundary edges
edges = mesh.edges_unique
edge_face_count = trimesh.grouping.group_rows(mesh.edges_sorted, require_count=2)
# boundary_edges = edges where the face count is 1
```

For finding individual boundary loops (each hole is one loop):

```python
# facets_over returns groups of coplanar faces; for holes, use graph analysis
# trimesh doesn't have a direct boundary_loop function — use the outline() path
outline = mesh.outline()
for entity in outline.entities:
    loop_vertices = outline.vertices[entity.points]
    print(f"Boundary loop with {len(loop_vertices)} vertices")
```

### C++

libigl provides direct boundary loop extraction:

```cpp
#include <igl/boundary_loop.h>

Eigen::MatrixXd V;
Eigen::MatrixXi F;

std::vector<std::vector<int>> loops;
igl::boundary_loop(F, loops);

// Each inner vector is an ordered list of vertex indices forming a boundary loop
for (const auto& loop : loops) {
    std::cout << "Loop with " << loop.size() << " vertices" << std::endl;
}
```

libigl boundary tutorial: [libigl.github.io/tutorial/#boundary-edges](https://libigl.github.io/tutorial/)

## Sharp Edge Detection

Sharp edges are where two adjacent faces meet at a steep angle. You detect them by computing the dihedral angle at each edge — the angle between the two face normals — and thresholding.

A dihedral angle of 180 degrees means the faces are coplanar (smooth). Angles significantly less than 180 degrees indicate a crease. Typical thresholds: anything below 150 degrees is a visible crease; below 90 degrees is a sharp corner; below 60 degrees is an extremely sharp edge rarely seen in well-designed geometry.

### Python

```python
import trimesh
import numpy as np

mesh = trimesh.load("model.obj")

# Get face adjacency and the angle between each pair of adjacent faces
face_adjacency = mesh.face_adjacency
face_adjacency_angles = mesh.face_adjacency_angles  # radians

# Find sharp edges (dihedral angle < 150 degrees)
threshold = np.radians(150)
sharp_mask = face_adjacency_angles < threshold
sharp_pairs = face_adjacency[sharp_mask]

print(f"{sharp_mask.sum()} sharp edges out of {len(face_adjacency)} adjacent face pairs")
```

### C++

Computing dihedral angle from two face normals sharing an edge:

```cpp
#include <Eigen/Core>
#include <cmath>

// n0, n1 are unit face normals of two faces sharing an edge
double dihedral_angle(const Eigen::Vector3d& n0, const Eigen::Vector3d& n1) {
    double cos_angle = n0.dot(n1);
    cos_angle = std::clamp(cos_angle, -1.0, 1.0);
    return std::acos(cos_angle);  // radians; pi = coplanar, 0 = folded back on itself
}

// Threshold selection:
// pi - radians(30) ≈ 2.618 rad → very subtle crease
// pi - radians(60) ≈ 2.094 rad → moderate crease
// pi - radians(90) ≈ 1.571 rad → right-angle edge
```

Build a face adjacency structure first (halfedge data structure or edge-to-face map), then iterate edges and compute the dihedral angle for each. libigl doesn't have a dedicated dihedral angle function, but building the adjacency is straightforward with `igl::edge_flaps`.

## Symmetry Detection

Detecting symmetry (reflective, rotational) is useful for aligning parts, reducing computation by exploiting symmetry, or validating manufacturing consistency. It's also approximate and computationally expensive — exact symmetry detection is NP-hard for arbitrary meshes.

The practical approach: PCA on mesh vertices. The principal axes give you the symmetry candidates.

```python
import numpy as np
from scipy.spatial.transform import Rotation

mesh = trimesh.load("model.obj")
vertices = mesh.vertices

# Center the vertices
centroid = vertices.mean(axis=0)
centered = vertices - centroid

# PCA via SVD
U, S, Vt = np.linalg.svd(centered, full_matrices=False)
principal_axes = Vt  # rows are principal axes

# Test reflective symmetry across each principal plane
for i, axis in enumerate(principal_axes):
    reflected = centered - 2 * np.outer(centered @ axis, axis)
    # For each reflected point, find nearest original point
    from scipy.spatial import KDTree
    tree = KDTree(centered)
    distances, _ = tree.query(reflected)
    symmetry_error = distances.mean()
    print(f"Axis {i}: mean symmetry error = {symmetry_error:.4f}")
```

This is approximate. For truly symmetric objects (by design), the error will be near zero. For organic or scanned geometry, you'll get a spectrum and need to decide on a threshold. For exact symmetry algorithms, see the literature on symmetry detection in computational geometry (Mitra et al., "Partial and Approximate Symmetry Detection for 3D Geometry").

## Primitive Shape Detection with CGAL

CGAL's `Shape_detection` package recognizes geometric primitives — planes, spheres, cylinders, cones, tori — directly from a point cloud with normals. This is RANSAC applied to 3D geometry: it repeatedly samples minimal sets of points, fits a candidate shape, and counts inliers. The result is a decomposition of the point cloud into detected primitives plus unclassified points.

This is one of the most practically useful things CGAL does for feature extraction. Scanning a room? Detect the floor and walls as planes. Scanning an industrial part? Detect cylinder bores and flat faces. It's much more robust than trying to derive this from curvature alone.

```cpp
#include <CGAL/Point_set_3.h>
#include <CGAL/Shape_detection/Region_growing/Region_growing.h>
#include <CGAL/Shape_detection/Efficient_RANSAC.h>

typedef CGAL::Exact_predicates_inexact_constructions_kernel  Kernel;
typedef Kernel::Point_3                                       Point_3;
typedef Kernel::Vector_3                                      Vector_3;
typedef std::pair<Point_3, Vector_3>                          Point_with_normal;
typedef std::vector<Point_with_normal>                        Pwn_vector;

typedef CGAL::Shape_detection::Efficient_RANSAC_traits<
    Kernel, Pwn_vector,
    CGAL::Shape_detection::Point_map<Pwn_vector>,
    CGAL::Shape_detection::Normal_map<Pwn_vector>>             Traits;

typedef CGAL::Shape_detection::Efficient_RANSAC<Traits>       Efficient_ransac;
typedef CGAL::Shape_detection::Plane<Traits>                  Plane;
typedef CGAL::Shape_detection::Cylinder<Traits>               Cylinder;
typedef CGAL::Shape_detection::Sphere<Traits>                 Sphere;

// Load or build your point cloud with normals
Pwn_vector points;
// ... fill points with (point, normal) pairs ...

Efficient_ransac ransac;
ransac.set_input(points);
ransac.add_shape_factory<Plane>();
ransac.add_shape_factory<Cylinder>();
ransac.add_shape_factory<Sphere>();

// Parameters
Efficient_ransac::Parameters params;
params.probability      = 0.05;   // probability that at least one shape is missed
params.min_points       = 200;    // minimum points to constitute a shape
params.epsilon          = 0.002;  // point-to-shape distance tolerance (meters)
params.cluster_epsilon  = 0.01;   // point clustering tolerance (connected components)
params.normal_threshold = 0.9;    // cos(angle) between point normal and shape normal

ransac.detect(params);

// Iterate over detected shapes
for (auto& shape : ransac.shapes()) {
    // Identify type
    if (auto* plane = dynamic_cast<Plane*>(shape.get())) {
        auto normal = plane->plane_normal();
        std::cout << "Plane: normal = (" << normal << ")\n";
        std::cout << "  Inliers: " << shape->indices_of_assigned_points().size() << "\n";
    }
    else if (auto* cyl = dynamic_cast<Cylinder*>(shape.get())) {
        std::cout << "Cylinder: radius = " << cyl->radius() << "\n";
        std::cout << "  Axis direction: " << cyl->axis().direction() << "\n";
    }
}

// Unassigned points (don't belong to any detected primitive)
std::cout << "Unassigned: " << ransac.number_of_unassigned_points() << "\n";
```

**Region Growing** is CGAL's alternative to RANSAC — it grows regions outward from seed points by checking that new candidates satisfy a local planarity/smoothness criterion. It's faster and deterministic, works well on clean mesh data where regions are connected:

```cpp
#include <CGAL/Shape_detection/Region_growing/Region_growing.h>
#include <CGAL/Shape_detection/Region_growing/Region_growing_on_polygon_mesh.h>
// ... see CGAL docs for the full polygon mesh region-growing setup
```

**When to use which:**
- **RANSAC**: noisy scans, point clouds, shapes may be partially occluded or interleaved
- **Region Growing**: clean meshes, faster, deterministic output, shapes are spatially contiguous
- **libigl/trimesh curvature**: you need continuous scalar fields, not discrete primitive labels

CGAL Shape Detection docs: [doc.cgal.org/latest/Shape_detection](https://doc.cgal.org/latest/Shape_detection/)

## Segmentation by Features

Once you have per-face curvature (or per-face normals), you can classify faces into groups and then extract connected components. This gives you a segmentation of the mesh into semantic patches: flat regions, curved regions, and crease edges between them.

```python
import trimesh
import numpy as np
from scipy import ndimage

mesh = trimesh.load("model.obj")

# Compute per-face mean curvature (average of vertex curvatures for each face)
mean_curv = trimesh.curvature.discrete_mean_curvature_measure(mesh, mesh.vertices, radius=0.05)
face_curvature = mean_curv[mesh.faces].mean(axis=1)  # average vertex curvatures per face

# Classify faces
FLAT_THRESHOLD = 0.01
CURVED_THRESHOLD = 0.1

labels = np.zeros(len(mesh.faces), dtype=int)
labels[np.abs(face_curvature) < FLAT_THRESHOLD] = 0       # flat
labels[(np.abs(face_curvature) >= FLAT_THRESHOLD) &
       (np.abs(face_curvature) < CURVED_THRESHOLD)] = 1   # gently curved
labels[np.abs(face_curvature) >= CURVED_THRESHOLD] = 2    # sharply curved

# Connected component labeling within each class
# Build face adjacency graph
adjacency = mesh.face_adjacency  # (E, 2) pairs of adjacent face indices
adj_matrix = np.zeros((len(mesh.faces), len(mesh.faces)), dtype=bool)
adj_matrix[adjacency[:, 0], adjacency[:, 1]] = True
adj_matrix[adjacency[:, 1], adjacency[:, 0]] = True

# For each label class, find connected components
segment_id = np.zeros(len(mesh.faces), dtype=int)
current_segment = 0
for label_class in range(3):
    mask = labels == label_class
    # Extract subgraph for this class and find connected components
    from scipy.sparse import csr_matrix
    from scipy.sparse.csgraph import connected_components
    
    indices = np.where(mask)[0]
    if len(indices) == 0:
        continue
    index_map = {idx: i for i, idx in enumerate(indices)}
    rows, cols = [], []
    for i, j in adjacency:
        if i in index_map and j in index_map:
            rows.extend([index_map[i], index_map[j]])
            cols.extend([index_map[j], index_map[i]])
    if rows:
        sub_adj = csr_matrix((np.ones(len(rows)), (rows, cols)),
                             shape=(len(indices), len(indices)))
        n_components, comp_labels = connected_components(sub_adj, directed=False)
    else:
        comp_labels = np.arange(len(indices))
    
    for local_idx, global_idx in enumerate(indices):
        segment_id[global_idx] = current_segment + comp_labels[local_idx]
    current_segment += comp_labels.max() + 1

print(f"Found {current_segment} segments")
```

The thresholds are mesh-dependent. Normalize curvature by the mesh bounding box diagonal or use percentile-based thresholds (e.g., top 10% curvature = sharp) for robustness across different scales.

## Export Feature Annotations

Once you've computed per-vertex or per-face scalar fields (curvature, segmentation labels, distances), you want to store them alongside the geometry. PLY is the best format for this — it supports arbitrary per-vertex and per-face properties.

```python
import trimesh
import numpy as np

mesh = trimesh.load("model.obj")

# Compute some per-vertex scalar field
curvature = trimesh.curvature.discrete_gaussian_curvature_measure(
    mesh, mesh.vertices, radius=0.05
)

# Attach as a vertex attribute
mesh.vertex_attributes["curvature"] = curvature

# Export to PLY — trimesh preserves vertex_attributes in PLY format
mesh.export("annotated.ply")
```

This PLY file can then be loaded in Open3D, MeshLab, or CloudCompare for visualization with the scalar field mapped to a color ramp. In MeshLab, use Render > Color > Per-vertex scalar to visualize.

For per-face attributes (like segmentation labels), use `mesh.face_attributes`:

```python
mesh.face_attributes["segment"] = segment_id
mesh.export("segmented.ply")
```

Note: not all viewers support per-face attributes in PLY. Per-vertex attributes are more universally supported. If you need per-face data visible everywhere, convert to per-vertex by averaging or majority-voting across adjacent faces.

trimesh export docs: [trimesh.org/trimesh.html#trimesh.Trimesh.export](https://trimesh.org/trimesh.html)
