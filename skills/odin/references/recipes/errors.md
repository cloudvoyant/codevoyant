# Odin — error handling

Errors are plain values: return `(value, Error)` where `Error`'s zero value means success. `or_return` propagates; `or_else` supplies a default.

```odin
Error :: enum { None, Bad }              // .None == success (zero value)

step :: proc() -> (int, Error) { return 1, .None }

run :: proc() -> (n: int, err: Error) {
	n = step() or_return                 // if err != nil, return (0, err) now
	n += 1
	return
}

// propagate a file read, then default a map lookup
load :: proc(path: string) -> (data: []u8, err: os.Error) {
	data = os.read_entire_file(path) or_return
	return
}
port := config["port"] or_else 8080     // or_else = fallback value
```

See also: `unions.md` (`Maybe(T)` / `.?`).

Docs: https://odin-lang.org/docs/overview/#or_return-operator
