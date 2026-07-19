# Odin — dynamic arrays, slices, maps

Dynamic arrays grow (append/remove take `&arr`); slices are `low:high` (high exclusive); maps use comma-ok lookup.

```odin
// dynamic array
xs: [dynamic]int
defer delete(xs)
append(&xs, 1, 2, 3)          // variadic
ordered_remove(&xs, 0)        // keep order, O(n)
unordered_remove(&xs, 0)      // swap last in, O(1)
last := pop(&xs)
for v, i in xs { fmt.println(i, v) }   // value first, index second
clear(&xs)                    // len→0, keeps cap

// fixed array + slice (high bound exclusive)
fixed := [?]int{1, 2, 3, 4, 5}   // [?] infers length
mid   := fixed[1:4]              // {2,3,4}
heap  := make([]int, 6); defer delete(heap)

// map
m := make(map[string]int); defer delete(m)
m["bob"] = 2
v, ok := m["bob"]             // comma-ok lookup
_ = "bob" in m               // presence test
delete_key(&m, "bob")
for k, val in m { fmt.println(k, val) }
```

Docs: https://odin-lang.org/docs/overview/#dynamic-arrays · https://odin-lang.org/docs/overview/#maps
