# Auth Sessions with JWT Cookies

## Why this matters

Most session patterns require either a server-side session store (a database that every request hits to look up the session) or a full auth server with token endpoints. Both add infrastructure and latency.

This approach is stateless: the session is a signed JWT cookie. The server never looks up session state — it verifies the signature and reads the claims directly from the cookie. Authorization is per-call and explicit, not a global middleware gate. If the user is allowed to access an item, their session cookie contains that item's ID.

What goes wrong without it:
- A global auth middleware that gates all routes creates a single point of failure and makes it hard to test individual endpoints
- Per-call authorization without a reusable helper leads to inconsistent checks and easy-to-miss gaps
- Server-side session stores add write latency on every action that creates or extends a session

The session lives in a `session` cookie as a signed JWT carrying a `sessionId` and the resource IDs the holder is allowed to touch. Session helpers live in `src/lib/server/` (server-only), and the `checkAuthorized` query lives in a `*.remote.ts` file consumed by every protected remote function and `+server.ts` handler.

See the [jose docs](https://jose.readthedocs.io/en/latest/) for the JWT library API — here's the implementation we use.

## Prerequisites

```bash
pnpm add jose nanoid
```

Set `PRIVATE_JWT_SECRET` (any high-entropy string, min 32 chars) in `.env`.

## Session helpers — `src/lib/server/session.ts`

The secret loads lazily via `$env/dynamic/private` so a missing secret throws at use time, not at import.

```ts
import { type JWTPayload, jwtVerify, SignJWT } from "jose";
import { JWTExpired } from "jose/errors";

import { env } from "$env/dynamic/private";
import { logger } from "$lib/logger";

const textEncoder = new TextEncoder();

function getJwtSecret() {
  if (!env.PRIVATE_JWT_SECRET) {
    throw new Error("PRIVATE_JWT_SECRET environment variable is not set");
  }
  return textEncoder.encode(env.PRIVATE_JWT_SECRET);
}

export interface SessionJwt extends JWTPayload {
  sessionId: string;
  itemIds: string[];
}

export async function createSession(sessionId: string, itemId: string) {
  return await createAccessToken({ sessionId, itemIds: [itemId] });
}

export async function updateSession(session: SessionJwt, itemId: string): Promise<string> {
  return await createAccessToken({
    sessionId: session.sessionId,
    itemIds: [...session.itemIds, itemId],
  });
}

export async function decodeSession(jwt: string | undefined): Promise<SessionJwt | null> {
  if (!jwt) return null;

  try {
    const result = await jwtVerify<SessionJwt>(jwt, getJwtSecret());
    return result.payload;
  } catch (error) {
    if (error instanceof JWTExpired) {
      logger.error(
        { event: "session.decode.error.expired", error: error.message },
        "Session token expired",
      );
    }
    return null;
  }
}

async function createAccessToken(payload: SessionJwt) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(getJwtSecret());
}
```

Key points: `HS256`, `1d` expiry, lazy secret.

## Register and authorize — `src/routes/api/session.remote.ts`

`checkAuthorized` is a `query` reused by every protected remote function. `registerSession` is a `command` that creates or extends the cookie.

```ts
import { error } from "@sveltejs/kit";
import { nanoid } from "nanoid";
import * as z from "zod";

import { command, getRequestEvent, query } from "$app/server";
import { logger } from "$lib/logger";
import { createSession, decodeSession, updateSession } from "$lib/server/session";

export const checkAuthorized = query(z.object({ itemId: z.string() }), async ({ itemId }) => {
  const { cookies } = getRequestEvent();
  const session = await decodeSession(cookies.get("session"));

  const unauthorized = !Array.isArray(session?.itemIds) || !session.itemIds.includes(itemId);
  if (unauthorized) {
    logger.error(
      { event: "session.authorize.error.itemId", itemId, sessionItemIds: session?.itemIds },
      "Item not authorized for this session",
    );
    error(401, "Unauthorized");
  }
});

export const registerSession = command(async () => {
  const { cookies } = getRequestEvent();

  const itemId = nanoid();
  let jwt = cookies.get("session");

  const session = await decodeSession(jwt);
  if (!session) {
    jwt = await createSession(crypto.randomUUID(), itemId);
  } else {
    jwt = await updateSession(session, itemId);
  }

  cookies.set("session", jwt, { path: "/" });
  logger.info({ event: "session.register.success", itemId }, "Registered item in session");

  return itemId;
});
```

Every protected read/write starts with `await checkAuthorized({ itemId })`:

```ts
export const getItem = query(z.object({ itemId: z.string() }), async ({ itemId }) => {
  await checkAuthorized({ itemId });
  // ... fetch and return
});
```

## Hooks — health and version only — `src/hooks.server.ts`

There is no global auth gate in hooks; authorization is per remote function. Hooks expose only operational endpoints:

```ts
import type { Handle } from "@sveltejs/kit";

import { PRIVATE_APP_VERSION, PRIVATE_COMMIT_MESSAGE } from "$env/static/private";

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname == "/healthcheck") {
    return new Response("OK");
  }

  if (event.url.pathname == "/version") {
    return Response.json({
      appVersion: PRIVATE_APP_VERSION,
      commitMessage: PRIVATE_COMMIT_MESSAGE,
    });
  }

  return await resolve(event);
};
```

## Two-phase presigned upload (optional)

For large files, never stream bytes through the server. A `query` returns a presigned PUT URL from the storage service, then the browser PUTs the file straight to storage.

Server (`src/routes/api/files.remote.ts`):

```ts
import { error } from "@sveltejs/kit";
import * as z from "zod";

import { query } from "$app/server";
import { filesApiClient } from "$lib/services/files/files-api-client";

import { checkAuthorized } from "./session.remote";

export const presignedUpload = query(
  z.object({ itemId: z.string(), fileName: z.string(), fileSize: z.number() }),
  async ({ itemId, fileName, fileSize }) => {
    await checkAuthorized({ itemId });

    const { data, response } = await filesApiClient.POST("/files/upload", {
      body: { originalFileName: fileName, fileSizeBytes: fileSize },
      params: { header: { "X-Acme-Tenant-Key": `workspace=${itemId}` } },
    });

    if (!data || !response.ok) {
      error(500, "Failed to get presigned upload url");
    }

    return data; // { presignedPutUrl: string }
  },
);
```

Client — get the URL, then PUT directly:

```ts
const { presignedPutUrl } = await presignedUpload({
  itemId,
  fileName: file.name,
  fileSize: file.size,
});

await uploadWithProgress(file, presignedPutUrl, (percent) => (progress = percent));
```

## How it fits the feature-slice architecture

- Session helpers (`src/lib/server/session.ts`) are shared infrastructure — they sit in `lib/server`, not in any feature lib.
- `session.remote.ts` lives under `src/routes/api/` and exports the `checkAuthorized` query for every feature's remote functions to import.
- Feature `+page.server.ts` files do not call session helpers directly — they call feature server functions, which call remote queries that call `checkAuthorized`.

## Verify

```bash
pnpm dev
curl localhost:5173/healthcheck   # -> OK
curl localhost:5173/version       # -> {"appVersion":...,"commitMessage":...}
```

Call `registerSession()` from the client, confirm a `session` cookie is set, then confirm a protected `query` returns `401` for an `itemId` not in the cookie and succeeds for one that is.
