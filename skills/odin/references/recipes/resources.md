# Odin — vetted resources

All links fetched/searched and confirmed live (2026-07). Authority noted.

## Official (start here)
- **Language Overview** — https://odin-lang.org/docs/overview/ — the canonical tour (syntax → types → procedures → the `context`/allocator system). Read end-to-end first.
- **Package docs** — https://pkg.odin-lang.org/ — browsable API for `base`/`core`/`vendor`.
- **FAQ / rationale** — https://odin-lang.org/docs/faq/ — why no methods, no exceptions, no package manager, manual memory. (There is no separate formal spec — Overview + FAQ + `core/` are it.)
- **`demo.odin`** — https://github.com/odin-lang/Odin/blob/master/examples/demo/demo.odin — one heavily-commented file covering nearly every feature. Skim after the overview.
- **`core/` source** — https://github.com/odin-lang/Odin/tree/master/core — best large idiomatic codebase; read it to learn conventions.
- **`examples/`** — https://github.com/odin-lang/Odin/tree/master/examples — small runnable snippets.
- **Repo / showcase** — https://github.com/odin-lang/Odin · https://odin-lang.org/showcase/

## Books
- **Understanding the Odin Programming Language — Karl Zylinski (2024, updated 2026)** — https://odinbook.com/ (buy: store.zylinski.se · zylinski.itch.io/odinbook). The definitive structured resource; use it as your spine. *(You already have it in `~/…/Books/Computer Science/Odin/`.)*

## Tutorials / blogs
- **gingerBill's articles** (Odin's creator) — https://www.gingerbill.org/article/ — especially the 6-part **"Memory Allocation Strategies"** series; internalizing this is the biggest shift from GC languages.
- **Karl Zylinski's blog** — https://zylinski.se/posts/ — practical patterns (arenas, handle-based maps, bindings). Free written intro: https://zylinski.se/posts/introduction-to-odin/
- **Karl Zylinski — YouTube** — https://www.youtube.com/@karl_zylinski — games without an engine, Odin + Raylib.
- **Odin News** — https://odin-lang.org/news/ — releases/announcements.

## Community
- **Discord** (primary hub) — https://discord.gg/vafXTdubwr
- **Forum** — https://forum.odin-lang.org/ · **community index** — https://odin-lang.org/community/
- **awesome-odin** — https://github.com/jakubtomsu/awesome-odin — curated libs/bindings/tutorials.

## Reference codebases (learn by reading)
- **Odin `core/`** — the canonical idioms (above).
- **Raylib hot-reload template — Karl Zylinski** — https://github.com/karl-zylinski/odin-raylib-hot-reload-game-template — standard game scaffold (shipped CAT & ONION).
- **karl2d** — https://github.com/karl-zylinski/karl2d — readable beginner 2D lib.
- **breakout / snake tutorials** — https://github.com/karl-zylinski/breakout · https://github.com/karl-zylinski/snake-tutorial-code — step-by-step games + videos.
- **Dungeon of Quake** — https://github.com/jakubtomsu/dungeon-of-quake — complete retro FPS.
- **VirtualXT** — https://github.com/virtualxt/virtualxt — PC/XT emulator (systems example).

## Suggested path (experienced programmer)
1. Read the **Overview** end to end. 2. Skim **demo.odin**. 3. Work through **Karl's book** (you own it). 4. Read gingerBill's **Memory Allocation Strategies**. 5. Read **`core/`** for idioms. 6. Build with the **Raylib hot-reload template**; keep **Discord** open.
