# Odin — printing & a full-screen board

```odin
import "core:fmt"
fmt.println("a", "b")                 // space-separated + newline
fmt.printf("%d %v %s %t\n", 42, x, "hi", true)   // %v default, %d int, %s str, %t bool, %x hex, %T type
fmt.eprintln("to stderr")
// aprintf → heap string (delete it); tprintf → temp string; NOTE: there is no fmt.sprintf
```

Full-screen TUI (e.g. a board game) via standard ANSI escapes printed with `fmt` — enter the alternate screen, then each frame clear→home→draw:

```odin
import "core:fmt"
CLEAR :: "\e[2J"; HOME :: "\e[H"
ALT_ON :: "\e[?1049h"; ALT_OFF :: "\e[?1049l"; HIDE :: "\e[?25l"; SHOW :: "\e[?25h"
move :: proc(r, c: int) { fmt.printf("\e[%d;%dH", r, c) }   // 1-based cursor move

render :: proc(board: ^[8][8]rune) {
	fmt.print(CLEAR, HOME)
	for row in board {
		for cell in row do fmt.printf("%c ", cell)
		fmt.print("\r\n")
	}
	fmt.printf("\e[32mgreen\e[0m\n")   // \e[31m..\e[0m for color
}

main :: proc() {
	fmt.print(ALT_ON, HIDE)
	defer fmt.print(SHOW, ALT_OFF)       // always restore the terminal
	board: [8][8]rune
	// loop: render(&board); read input; update...
}
```

Caveat: stdin is **line-buffered/echoed** by default. Single-keypress input (arrow keys, no echo) needs raw mode — `core:sys/posix` termios (`tcsetattr`, clear `ECHO`/`ICANON`) or `core:sys/windows` `SetConsoleMode`; there is no stdlib `enable_raw_mode`. Line input:

```odin
import "core:bufio"; import "core:os"
sc: bufio.Scanner
bufio.scanner_init(&sc, os.to_stream(os.stdin))   // classic API: os.stream_from_handle(os.stdin)
for bufio.scanner_scan(&sc) { fmt.println(bufio.scanner_text(&sc)) }
```

Docs: https://pkg.odin-lang.org/core/fmt/ · https://pkg.odin-lang.org/core/bufio/
