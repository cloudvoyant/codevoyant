# Odin — strings

`string` = immutable UTF-8 byte view (ptr+len); `cstring` = NUL-terminated. Iterating yields **runes**. Watch which calls allocate.

```odin
import "core:strings"
import "core:strconv"

s := "Hellope"
for r in s { fmt.println(r) }        // r is a rune
for r, i in s { fmt.println(i, r) }

// no allocation:
_ = strings.contains(s, "ll")
_ = strings.has_prefix(s, "He")
t := strings.trim_space("  hi  ")    // subslice view

// allocates → delete the result
parts, _ := strings.split("a,b,c", ",");            defer delete(parts)
joined   := strings.concatenate([]string{"a","b"}); defer delete(joined)
msg      := fmt.aprintf("x=%d", 42);                defer delete(msg)   // tprintf = temp, no delete

// Builder — accumulate then read a view
b := strings.builder_make(); defer strings.builder_destroy(&b)
strings.write_string(&b, "hello ")
strings.write_string(&b, "world")
out := strings.to_string(b)          // view into builder, no alloc

n := strconv.atoi("123")             // string → int
buf: [8]u8
str := strconv.itoa(buf[:], 42)      // int → string (into buf)
```

Allocating (delete/destroy): `split`, `concatenate`, `clone`, `builder_make`, `fmt.aprintf`. Non-allocating: `trim_space`, `to_string`, `contains`, `has_prefix`, `fmt.tprintf`.

Docs: https://pkg.odin-lang.org/core/strings/
