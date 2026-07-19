# Odin — procedures

`name :: proc(params) -> ret { }`. Default args, named returns (naked `return` allowed), named args at call site.

```odin
package main
import "core:fmt"

add :: proc(a, b: int) -> int { return a + b }

// default args + named returns
stats :: proc(x: int, scale := 2) -> (lo, hi: int) {
	lo = x
	hi = x * scale
	return
}

main :: proc() {
	fmt.println(add(2, 3))           // 5
	lo, hi := stats(4)               // positional
	_ = stats(x = 4, scale = 3)      // named args at call site
	fmt.println(lo, hi)
}
```

Docs: https://odin-lang.org/docs/overview/#procedures
