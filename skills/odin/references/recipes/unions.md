# Odin — unions

`Name :: union { … }` is a tagged union (nil when unset). Branch with a type switch; extract with a type assertion.

```odin
Value :: union { int, string, bool }     // tagged; nil when unset
v: Value = "hi"

switch x in v {                          // type switch binds x
case int:    fmt.println("int", x)
case string: fmt.println("str", x)
case:        fmt.println("nil/other")
}

s     := v.(string)      // type assert — panics if wrong
s, ok := v.(string)      // safe form: ok=false instead of panic

Flag :: union #no_nil { bool, string }   // no nil state; first variant is zero value
```

`Maybe(T)` is a one-variant union — the idiomatic optional:

```odin
m: Maybe(int)            // nil
m = 7
x, ok := m.?             // safe unwrap
y := m.? or_else -1      // default unwrap
```

Docs: https://odin-lang.org/docs/overview/#unions
