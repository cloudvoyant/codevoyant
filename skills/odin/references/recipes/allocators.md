# Odin — allocators & freeing

`context.allocator` is implicit; most core procs take `allocator := context.allocator`. Pair every alloc with exactly one free.

```odin
p := new(int);        defer free(p)      // single value:  new ↔ free
s := make([]int, 6);  defer delete(s)    // slice/map/dynarray/string: make ↔ delete

// Scratch memory: temp allocator + one bulk reclaim (no per-item delete)
for {                                    // e.g. a frame loop
	defer free_all(context.temp_allocator)
	msg := fmt.tprintf("frame %d", i)    // tprintf uses the temp allocator
	scratch := make([]u8, 1024, context.temp_allocator)
	_ = msg; _ = scratch
}

// Arena: bump-allocate into a fixed buffer, reset all at once
import "core:mem"
buf: [4096]u8
arena: mem.Arena
mem.arena_init(&arena, buf[:])
context.allocator = mem.arena_allocator(&arena)
// ... allocate freely ...
free_all(context.allocator)              // resets the bump pointer
```

Leak detection (dev builds) — tracking allocator:

```odin
track: mem.Tracking_Allocator
mem.tracking_allocator_init(&track, context.allocator)
context.allocator = mem.tracking_allocator(&track)
defer {
	for _, e in track.allocation_map do fmt.eprintfln("leak %v @ %v", e.size, e.location)
	mem.tracking_allocator_destroy(&track)
}
```

`free` = one pointer · `delete` = slice/map/dynarray/string · `free_all` = everything from an arena/temp at once (don't also free/delete those items — double free).

Docs: https://odin-lang.org/docs/overview/#implicit-context-system · https://pkg.odin-lang.org/core/mem/
