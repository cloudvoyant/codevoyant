# Odin — defer

`defer stmt` runs at scope exit, in **LIFO** order. Put cleanup right next to acquisition.

```odin
f, _ := os.open("x.txt")
defer os.close(f)          // runs at scope exit

defer fmt.println("1")     // LIFO → prints 3, 2, 1
defer fmt.println("2")
defer fmt.println("3")

defer { a(); b() }         // defer a block
```

Docs: https://odin-lang.org/docs/overview/#defer
