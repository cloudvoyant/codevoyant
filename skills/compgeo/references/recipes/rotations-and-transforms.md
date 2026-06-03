# Rotations and Transforms

Quaternions are the right representation for 3D rotations in almost every engine and library, but they are unintuitive. This recipe walks through every common rotation representation, explains when to use each, and shows how to compose and apply transforms correctly across Python (scipy, open3d, trimesh) and TypeScript (three.js).

## The Problem With Euler Angles

Most people reach for Euler angles first because they are readable: pitch, yaw, roll as three numbers. They have three serious problems.

**Gimbal lock.** When two axes align, you lose a degree of freedom. An aircraft pitched to exactly 90 degrees can no longer distinguish yaw from roll because the yaw and roll axes are now the same physical axis. Any rotation system that stores three independent angles will hit this.

**Order dependency.** XYZ, ZYX, and YXZ are different conventions and give different results for the same three numbers. Every library picks a default, and they do not agree. Always specify the order explicitly.

```python
import numpy as np
from scipy.spatial.transform import Rotation

# Order matters!
r1 = Rotation.from_euler("xyz", [45, 90, 0], degrees=True)
r2 = Rotation.from_euler("zyx", [0, 90, 45], degrees=True)
# r1 != r2 even though the numbers look similar
print(np.allclose(r1.as_matrix(), r2.as_matrix()))  # False
```

**Interpolation is broken.** Linearly interpolating Euler angles does not produce smooth rotation. The path between two orientations can wobble, speed up, or take an unexpected route because the mapping from angle-space to rotation-space is nonlinear.

**Use Euler angles for:** display-only (showing human-readable orientation). Never accumulate them frame over frame.

## Rotation Matrices

A 3x3 orthogonal matrix where the columns are the new X, Y, Z axes after rotation. Intuitive if you think of it as "where do my basis vectors end up?"

- **Composing:** multiply matrices. Application order is right-to-left: `R_total = R_world @ R_local` applies local first, then world.
- **Inverse:** transpose (because orthogonal matrices satisfy `R^T R = I`).
- **Problem:** 9 numbers for 3 degrees of freedom. Floating-point drift accumulates under repeated multiplication, and the matrix gradually stops being orthogonal. You need periodic re-orthogonalization (Gram-Schmidt or SVD).

```python
import numpy as np

def rotation_matrix_x(theta_deg):
    t = np.radians(theta_deg)
    return np.array([
        [1,           0,            0],
        [0,  np.cos(t), -np.sin(t)],
        [0,  np.sin(t),  np.cos(t)],
    ])

# Apply to a point
p = np.array([1.0, 0.0, 0.0])
rotated = rotation_matrix_x(45) @ p
```

**Use rotation matrices for:** applying rotations to many points at once (batch matrix multiply), OpenGL/WebGL uniform uploads, and interop with CGAL or Eigen which expect matrices.

## Quaternions

Do not start with the math. Start with the API.

```python
import numpy as np
from scipy.spatial.transform import Rotation, Slerp

# From axis-angle (most intuitive to construct)
r = Rotation.from_rotvec([0, 0, np.pi / 2])  # 90 degrees around Z axis

# Apply to points
pts = np.array([[1, 0, 0], [0, 1, 0]])
rotated = r.apply(pts)

# Compose rotations (r2 then r1)
r1 = Rotation.from_euler("z", 45, degrees=True)
r2 = Rotation.from_euler("x", 30, degrees=True)
r_combined = r1 * r2

# Inverse
r_inv = r.inv()

# Convert to matrix when needed (e.g. for OpenGL)
mat = r.as_matrix()

# SLERP: smooth interpolation between two rotations
r_start = Rotation.from_euler("z", 0, degrees=True)
r_end = Rotation.from_euler("z", 90, degrees=True)
times = [0, 1]
rots = Rotation.concatenate([r_start, r_end])
slerp = Slerp(times, rots)
r_mid = slerp(0.5)  # halfway rotation
```

**What quaternions actually are** (brief version): a unit quaternion `[w, x, y, z]` encodes a rotation of `2 * acos(w)` around the axis `[x, y, z]`. The important intuition: `w` near 1 means a small rotation, `w` near 0 means a large rotation. You rarely need to touch the components directly.

**The double-cover gotcha.** `q` and `-q` represent the same rotation. If you are interpolating and `dot(q1, q2) < 0`, negate one quaternion before slerp to take the short path. Most libraries handle this automatically, but verify if you implement slerp yourself.

**Use quaternions for:** composition, interpolation, storage, and any time you accumulate rotations frame over frame. Normalize periodically (`q /= np.linalg.norm(q)`) to prevent drift.

## Axis-Angle Representation

The most human-readable form: "rotate X degrees around this axis." Convert to and from quaternion trivially.

```python
import numpy as np
from scipy.spatial.transform import Rotation

# Rotation of 45 degrees around Y axis
axis = np.array([0, 1, 0])
angle_rad = np.radians(45)
r = Rotation.from_rotvec(axis * angle_rad)

# Back to axis-angle
rotvec = r.as_rotvec()
angle = np.linalg.norm(rotvec)
axis_recovered = rotvec / angle
```

**Use axis-angle for:** user-specified rotations ("tilt 30 degrees around world-up"), storing angular velocity (axis = rotation axis, magnitude = angular speed in radians/second), and debug logging.

## 4x4 Homogeneous Transforms

Combines rotation and translation in one matrix. Essential for scene graphs, robot kinematics, and OpenGL.

```python
import numpy as np
from scipy.spatial.transform import Rotation

def make_transform(rotation_matrix, translation):
    """rotation_matrix: 3x3, translation: (3,) -> 4x4 homogeneous matrix"""
    T = np.eye(4)
    T[:3, :3] = rotation_matrix
    T[:3,  3] = translation
    return T

def apply_transform(T, points):
    """points: (N, 3) -> (N, 3)"""
    ones = np.ones((len(points), 1))
    pts_h = np.hstack([points, ones])  # (N, 4)
    return (T @ pts_h.T).T[:, :3]

# Compose: first rotate, then translate
r = Rotation.from_euler("z", 45, degrees=True)
T1 = make_transform(r.as_matrix(), [0, 0, 0])
T2 = make_transform(np.eye(3), [1, 2, 3])
T_combined = T2 @ T1  # apply T1 first, then T2
```

**Use 4x4 homogeneous transforms for:** scene graphs (parent-child transform chains), combined rotate-then-translate operations, and any library that expects a single transform (trimesh, open3d, OpenGL).

## Three.js and Threlte (Frontend)

```typescript
import * as THREE from 'three'

// Quaternion from axis-angle
const q = new THREE.Quaternion()
q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4)  // 45 degrees around Y

// Apply to object
mesh.quaternion.copy(q)

// SLERP between two quaternions
const q1 = new THREE.Quaternion()
const q2 = new THREE.Quaternion()
q2.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)
mesh.quaternion.slerpQuaternions(q1, q2, 0.5)  // midpoint

// Euler (use when reading from UI sliders, then convert)
const euler = new THREE.Euler(0, Math.PI / 4, 0, 'XYZ')
mesh.rotation.copy(euler)

// Full transform matrix
const matrix = new THREE.Matrix4()
matrix.compose(position, quaternion, scale)
mesh.matrix.copy(matrix)
mesh.matrixAutoUpdate = false
```

Key three.js conventions: `Object3D.rotation` is an Euler (convenient but gimbal-lock-prone), `Object3D.quaternion` is the underlying quaternion (preferred for animation), and they are kept in sync automatically. Setting one updates the other.

## Open3D and trimesh (Python Mesh Transforms)

### Open3D

```python
import open3d as o3d
import numpy as np

mesh = o3d.io.read_triangle_mesh("model.obj")

# Rotate 45 degrees around Z
R = mesh.get_rotation_matrix_from_xyz((0, 0, np.pi / 4))
mesh.rotate(R, center=(0, 0, 0))

# Translate
mesh.translate([1.0, 0.0, 0.0])

# Full transform at once
T = np.eye(4)
T[:3, :3] = R
T[:3, 3] = [1.0, 0.0, 0.0]
mesh.transform(T)
```

### trimesh

```python
import trimesh
import numpy as np
from scipy.spatial.transform import Rotation

mesh = trimesh.load("model.obj")

r = Rotation.from_euler("z", 45, degrees=True)
transform = np.eye(4)
transform[:3, :3] = r.as_matrix()
transform[:3, 3] = [1.0, 0.0, 0.0]

mesh.apply_transform(transform)
```

Both libraries use 4x4 homogeneous matrices as their universal transform interface. Build the matrix with scipy's Rotation for the rotation part and set the translation column directly.

## When to Use What

| Representation | Use when |
|---|---|
| Quaternion | Composition, interpolation, storage, accumulating rotations |
| Rotation matrix | Applying to many points, OpenGL/WebGL, CGAL/Eigen interop |
| Axis-angle | User input, angular velocity, debug output |
| Euler angles | Display only (never accumulate) |
| 4x4 homogeneous | Scene graphs, combined rotate+translate, library APIs |

## Common Pitfalls

- **Accumulating Euler angles frame over frame.** Convert UI inputs to quaternions immediately and accumulate in quaternion space. Re-normalize periodically.
- **Wrong multiplication order.** `r_total = r_world * r_local` applies local first, then world. Think of it as "first do local, then put that result in world frame."
- **Gimbal lock in animation.** If your animation has Euler keyframes, convert to quaternion keyframes and slerp between them.
- **Assuming quaternion component order.** scipy uses `[x, y, z, w]` internally and in `from_quat`/`as_quat`. three.js uses `[x, y, z, w]`. Some libraries (notably Eigen and ROS) use `[w, x, y, z]`. Always check the docs.
- **Forgetting to normalize.** After many compositions, quaternion magnitude drifts from 1.0. Normalize after every N operations or when magnitude deviates beyond a threshold.
