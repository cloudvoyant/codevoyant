# Odin — CLI programs

`os.args` for raw args (`os.args[0]` is the program name); `core:flags` for declarative parsing.

```odin
package main
import "core:fmt"
import "core:os"

main :: proc() {
	for arg, i in os.args do fmt.printf("[%d] %s\n", i, arg)
}
```

Declarative parsing with `core:flags` (struct + field tags):

```odin
import "core:flags"; import "core:os"

Options :: struct {
	width:   int    `args:"name=w,required" usage:"board width"`,
	name:    string `usage:"player name"`,
	verbose: bool   `usage:"verbose"`,
	file:    string `args:"pos=0,required"  usage:"input file"`,
}

main :: proc() {
	opt: Options
	flags.parse_or_exit(&opt, os.args)   // prints usage + exits on -h or error
	fmt.printf("w=%d name=%s\n", opt.width, opt.name)
}
```

`.Odin` style = `-w:8 -verbose`; pass `style = .Unix` for `--w=8`. No subcommands — dispatch on `os.args[1]` yourself, then parse the rest. Build: `odin build . -out:game` (or `odin run .`).

Docs: https://pkg.odin-lang.org/core/flags/
