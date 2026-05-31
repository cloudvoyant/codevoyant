# Recipe: catch (err: unknown) instead of catch (err: any)

## Problem

`catch (err: any)` disables type safety inside the catch block. Accessing `err.message` directly compiles but throws at runtime if `err` is not an `Error`.

## Wrong Fix

```ts
catch (err: any) { logger.error(err.message) } // compiles, unsafe
```

## Correct Fix

```ts
catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  logger.error({ error: err }, message);
}
```

## Why

`unknown` forces you to narrow the type before accessing properties. `any` silently permits unsafe property access. The style guide says catch only at system boundaries (API handlers, server hooks) — at those boundaries the error could come from anywhere, so `unknown` is the correct type.

## See Also

- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
