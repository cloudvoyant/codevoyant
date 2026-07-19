# Manim scene scripts — the real manim-web contract

`ed` renders `<Manim scene="…" />` animations through **diffbook's Manim island, which drives [manim-web](https://www.npmjs.com/package/manim-web)**. A scene script is a `*.{ts,js}` file that **default-exports an async function receiving a manim-web `Scene`**. Everything a scene draws or animates must come from the `manim-web` package. This file is the authoritative contract — `create-lesson` / `ed-lesson-author` read it before writing any scene, and `doctor` validates existing scenes against it.

> **Why this file exists (PL-30):** the agent previously invented a fictional drawing API (`scene.circle(...)`, `scene.line(...)`, `scene.label(...)`, `scene.moveTo(...)`) that diffbook does not implement, so every animation threw `scene.<x> is not a function` at runtime. That API does not exist. Only the manim-web surface below is real.

## ⛔ Hard rules

- **Import everything from `manim-web`.** Mobjects, animations, colors, and directions are named exports of `manim-web`. Never import from anywhere else for scene primitives.
- **Never invent methods on `scene`.** The `Scene` you receive has **only** these authoring methods: `add(...mobjects)`, `remove(...mobjects)`, `play(...animations)` (await it), `wait(duration?)` (await it), `addSound(...)`. There is **no** `scene.circle/line/label/rect/text/moveTo/draw` — those are hallucinations. Draw by constructing a mobject (`new Circle({…})`) and animating it (`await scene.play(new Create(circle))`).
- **Never declare a local `interface Scene`** (or re-type the parameter). Use the real type: `import { type Scene } from 'manim-web'`.
- **Position mobjects with mobject methods**, not scene methods: `mobject.moveTo([x,y,0])`, `.shift([dx,dy,0])`, `.nextTo(other, RIGHT, 0.3)`, `.scale(1.5)`, `.setColor('#…')`. To animate a change, use the `.animate` proxy: `await scene.play(circle.animate.shift([2,0,0]))`.
- **End on a non-blank frame.** The last `play`/`add` should leave something visible (the Player records to a scrubbable timeline).

## The contract

```ts
import { type Scene, Circle, Create } from 'manim-web';

// The default export receives the Scene; do all drawing/animation through it.
export default async function myScene(scene: Scene): Promise<void> {
  const dot = new Circle({ radius: 0.5, color: '#22c55e' });
  await scene.play(new Create(dot));
}
```

`Scene` methods you may call (all others are off-limits):

| Method | Signature | Use |
|---|---|---|
| `scene.add` | `add(...m: Mobject[]): this` | Put mobjects on screen instantly (no animation). |
| `scene.remove` | `remove(...m: Mobject[]): this` | Take mobjects off screen. |
| `scene.play` | `play(...a: Animation[]): Promise<void>` | Run one or more animations simultaneously. **`await` it.** |
| `scene.wait` | `wait(duration?: number): Promise<void>` | Hold the current frame. **`await` it.** |

## Verified building blocks (all named exports of `manim-web`)

**Mobjects** (construct with `new`, options are the fields shown):
- `new Circle({ radius?: number, color?: string, fillOpacity?: number, strokeWidth?: number, center?: [x,y,z] })`
- `new Dot({ point?: [x,y,z], radius?: number, color?: string })`
- `new Line({ start?: [x,y,z], end?: [x,y,z], color?: string, strokeWidth?: number })`
- `new Arrow({ start?: [x,y,z], end?: [x,y,z], color?: string })`, `new Rectangle({ width?, height?, color? })`, `new Square({ sideLength?, color? })`, `new Polygon({ … })`, `new Triangle({ … })`
- `new Text({ text: string, fontSize?: number, color?: string })`
- `new MathTex('x^2 + y^2 = r^2', { color?: string })` — LaTeX math
- Graphing: `new Axes({ … })`, `new NumberPlane({ … })`, `new NumberLine({ … })`, `new FunctionGraph({ … })`, `new BarChart({ … })`
- Group with `new VGroup(a, b, c)`

**Animations** (construct with `new`, pass to `scene.play`):
- Creation: `new Create(m)`, `new Write(textOrMath)`, `new Uncreate(m)`, `new DrawBorderThenFill(m)`, `new FadeIn(m)`, `new FadeOut(m)`, `new GrowFromCenter(m)`
- Transform: `new Transform(a, b)`, `new ReplacementTransform(a, b)`
- Movement/emphasis: `new Shift(m, [dx,dy,0])`, `new Rotate(m, angle)`, `new Indicate(m)`, `new Flash(m)`
- Or the `.animate` proxy for property changes: `scene.play(m.animate.shift([1,0,0]).setColor('#ef4444'))`

**Positioning helpers on any mobject:** `.moveTo(target, alignedEdge?)`, `.shift([dx,dy,dz])`, `.nextTo(target, direction?, buff?)`, `.scale(factor)`, `.setColor(color)`, `.rotate(angle)`.

**Directions / origin** (named exports): `UP, DOWN, LEFT, RIGHT, IN, OUT, ORIGIN, UL, UR, DL, DR` — 3-tuples usable in `.shift`/`.nextTo`.

**Colors:** any CSS color string works (`'#22c55e'`, `'tomato'`); manim-web also exports named color constants (`BLUE`, `RED`, `GREEN`, `YELLOW`, `WHITE`, …) from its color constants.

> This is a representative subset. If you need a mobject/animation not listed, confirm it is a real named export of `manim-web` (it has a large geometry/graphing/text/animation catalog) before using it — do not guess a method on `scene`.

## Worked examples

### 1. Draw and label a vector

```ts
import { type Scene, Arrow, Text, Create, Write, RIGHT } from 'manim-web';

export default async function vectorIntro(scene: Scene): Promise<void> {
  const v = new Arrow({ start: [0, 0, 0], end: [2, 1, 0], color: '#3b82f6' });
  const label = new Text({ text: 'v', fontSize: 36, color: '#3b82f6' });
  label.nextTo(v, RIGHT, 0.2);

  await scene.play(new Create(v));
  await scene.play(new Write(label));
  await scene.wait(0.5);
}
```

### 2. Morph one shape into another

```ts
import { type Scene, Circle, Square, Create, ReplacementTransform } from 'manim-web';

export default async function circleToSquare(scene: Scene): Promise<void> {
  const circle = new Circle({ radius: 1, color: '#22c55e' });
  const square = new Square({ sideLength: 2, color: '#eab308' });

  await scene.play(new Create(circle));
  await scene.play(new ReplacementTransform(circle, square));
  await scene.wait(0.5);
}
```

### 3. Move a point along a path (the `.animate` proxy)

```ts
import { type Scene, Dot, Line, Create } from 'manim-web';

export default async function moveAlong(scene: Scene): Promise<void> {
  const track = new Line({ start: [-2, 0, 0], end: [2, 0, 0], color: '#94a3b8' });
  const dot = new Dot({ point: [-2, 0, 0], color: '#ef4444' });

  scene.add(track);
  await scene.play(new Create(dot));
  await scene.play(dot.animate.moveTo([2, 0, 0]));   // animate the position change
  await scene.wait(0.3);
}
```

## Where scene files live

diffbook discovers scene scripts from (in order) `.diffbook/assets/`, `<contentRoot>/.assets/`, or (legacy) `<contentRoot>/_animations/`. `ed` writes them to **`{BOOK_DIR}/_animations/`** (the content-root legacy dir — valid and per-content-root). Reference a scene from MDX by its **basename without extension**: a file `{BOOK_DIR}/_animations/vector_intro.ts` is used as `<Manim scene="vector_intro" caption="…" />`.

## Self-check before writing any scene

1. First line imports the primitives from `'manim-web'` (and `type Scene`)?
2. The default export is `async function (scene: Scene)` — no local `interface Scene`, no re-typed parameter?
3. Every draw is `new <Mobject>(…)` + `scene.play(new <Animation>(…))` — **no** `scene.circle/line/label/moveTo/draw` calls?
4. Every `play`/`wait` is `await`ed; positioning uses mobject methods (`.moveTo/.shift/.nextTo/.animate`)?
5. The final frame is non-blank?

If any check fails, fix it before returning — a scene that violates these throws at runtime and renders nothing.
