# Odin — multiple returns & destructuring

Return >1 value; destructure at the call site; `_` ignores. Two idiomatic shapes: `(value, ok)` and `(value, error)`.

```odin
swap :: proc(x, y: int) -> (int, int) { return y, x }

a, b := swap(1, 2)          // destructure both
_, second := swap(1, 2)     // `_` ignores a value

find :: proc() -> (val: int, ok:  bool)  { return 3, true }   // (value, ok)
load :: proc() -> (val: int, err: Error) { return 3, .None }  // (value, error)
```

See also: `errors.md` (`or_return` / `or_else`).

Docs: https://odin-lang.org/docs/overview/#multiple-results
