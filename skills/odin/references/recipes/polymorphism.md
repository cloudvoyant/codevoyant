# Odin — polymorphism

No methods/inheritance. Three tools: parametric generics (`$`), `where` constraints, and proc groups (overloading).

```odin
// $T inferred from args; works on any addable type
add :: proc(a, b: $T) -> T { return a + b }

// $T: typeid — pass a *type*; $N — compile-time constant
make_pair :: proc($T: typeid) -> [2]T { return {} }
first_n   :: proc(s: []$E, $N: int) -> [N]E { r: [N]E; for i in 0..<N do r[i] = s[i]; return r }

// where clause constrains the params
import "base:intrinsics"
sum :: proc(s: []$T) -> T where intrinsics.type_is_numeric(T) {
	total: T
	for v in s do total += v
	return total
}

// proc group = compile-time overloading, dispatched by arg types
show_int :: proc(x: int)    { fmt.println("int", x) }
show_str :: proc(x: string) { fmt.println("str", x) }
show :: proc{show_int, show_str}
// show(3) → show_int ; show("hi") → show_str

// `any` = runtime dynamic value (ptr + typeid), for logging etc.
dump :: proc(v: any) { fmt.printf("%T = %v\n", v, v) }
```

Subtype-style reuse is `using` in a struct (see `structs.md`).

Docs: https://odin-lang.org/docs/overview/#parametric-polymorphism
