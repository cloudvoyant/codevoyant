# Odin — structs

`Name :: struct { … }`. Named-field literals use `=` (not `:`). `using` promotes fields — Odin's substitute for inheritance.

```odin
Vec3 :: struct { x, y, z: f32 }

v1 := Vec3{x = 1, y = 2, z = 3}   // named fields use `=`
v2 := Vec3{1, 2, 3}               // positional (all or none)
v3 := Vec3{}                      // zero value (every field zeroed)

// `using` promotes fields: e.x reaches pos.x
Entity :: struct {
	using pos: Vec3,
	hp: int,
}
e: Entity; e.x = 10               // promoted access

Packed :: struct #packed { a: u8, b: u32 }   // no padding
```

Docs: https://odin-lang.org/docs/overview/#structs
