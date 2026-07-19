# Odin — vector & matrix math

Fixed arrays are component-wise; `matrix[R,C]T` is built in and `*` is real matrix multiply. Dot/cross/length live in `core:math/linalg`.

```odin
import "core:math/linalg"
Vec3 :: [3]f32

a := Vec3{1, 4, 9}
b := Vec3{2, 4, 8}
c := a + b            // {3, 8, 17}   component-wise
d := a * b            // {2, 16, 72}  component-wise (NOT dot)
e := a * 2            // scalar broadcast
xy := a.xy            // swizzle

dp  := linalg.dot(a, b)          // scalar
cp  := linalg.cross(a, b)        // Vec3
n   := linalg.normalize(a)       // unit vector
len := linalg.length(a)

// matrices
m := matrix[2, 2]f32{1, 2,  3, 4}
v := [2]f32{5, 6}
mv := m * v                     // matrix × vector → [2]f32

id := linalg.MATRIX4F32_IDENTITY
T  := linalg.matrix4_translate(Vec3{1, 2, 3})
// linalg also has matrix4_rotate(angle_rad, axis) / matrix4_scale; compose with `*`
world := T * id
```

Note: `matrix4_rotate` argument order is conventionally `(angle_radians, axis)` — confirm against your compiler's `pkg.odin-lang.org`.

Docs: https://odin-lang.org/docs/overview/#array-programming · https://pkg.odin-lang.org/core/math/linalg/
