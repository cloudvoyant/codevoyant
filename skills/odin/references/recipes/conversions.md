# Odin — type conversions

`T(x)` or `cast(T)x` to convert; `transmute` to reinterpret bits; `distinct` for a new nominal type.

```odin
i: int = 123
f := f64(i)         // T(x) — explicit conversion
u := cast(u32)f     // cast(T)x — same effect, different spelling
bits := transmute(u32)f32(1)   // reinterpret bits (same size)

My_Int :: distinct int   // new nominal type; My_Int != int, needs My_Int(x)
```

- **Implicit:** untyped constants (`X :: 42`, `1.0`, `"s"`) convert to any compatible target when exact — `x: f32 = 42`.
- **Explicit required:** between two *typed* values of different types (unlike C). `auto_cast v` forces it but is prototyping-only.

Docs: https://odin-lang.org/docs/overview/#type-conversion
