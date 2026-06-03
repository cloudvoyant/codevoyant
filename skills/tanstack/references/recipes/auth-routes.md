# Protecting Routes with Auth Guards

## Why this matters

Any app with user accounts needs to answer the same question on every navigation: is this user allowed to see this page? The naive approach — checking auth inside every component — leads to a flash of protected content before the redirect fires, because the component renders before the check completes.

TanStack Router gives you two better options that both prevent the flash. The key insight is that **route guards run before components render**. The question is only where the auth state lives: in a server-side session cookie (Style A) or in a client-side auth provider (Style B).

Crucially, route guards are **UX**, not security. The real security boundary is your server functions. Even if someone bypasses the route guard, the server function middleware (see `server-actions.md`) will reject their request. The guard just ensures legitimate users get a good experience — they never see a blank screen or a flash of the wrong UI.

What goes wrong without these patterns:
- Checking auth in components causes a render flash — the page is visible for one frame before the redirect
- Not handling the `isAuthenticated: false + hasAuthFailed: true` case leaves users stuck with no way out
- Style B without a query wrapper means the auth check fires on every render instead of being cached
- Forgetting to pass the bearer token from the client to server fns means the auth middleware rejects all mutations even when the user is logged in

## Two styles, one decision

| Style | Choose when | Trade-off |
|---|---|---|
| A — server-side loader redirect | Session in httpOnly cookie, readable via a server fn | Auth check happens during SSR; preferred for security |
| B — client-side provider + permission query | Provider SDK only runs in the browser (e.g. Kinde, Auth0 SPA SDK) | Auth check is client-only; user sees nothing, then navigates away |

In both styles, server functions enforce auth independently via JWT middleware — the route gate is UX only.

## Style A — server-side loader redirect

Gate a subtree with a pathless `(protected)/route.tsx` layout whose loader calls a session server fn and throws a redirect on failure. This happens during SSR before any HTML is sent to the browser.

### A1. Session server fn

The server fn reads cookies (via `isAuthenticated()` and `getAccessTokenClaim()` from your session helper), validates claims, and returns a typed `AuthState`. Returning a typed discriminated union instead of throwing lets the loader decide whether to redirect to `/login` or `/auth-failed`.

```ts
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { getAccessTokenClaim, isAuthenticated, refreshTokens } from "~/shared/auth/session.server";

type AuthState =
  | { isAuthenticated: true; orgId: string; userEmail: string }
  | { isAuthenticated: false; hasAuthFailed: boolean; reason?: string };

export const getAuthState = createServerFn({ method: "GET" })
  .inputValidator(z.object({ refresh: z.boolean().optional() }).optional())
  .handler(async ({ data }): Promise<AuthState> => {
    try {
      if (!(await isAuthenticated())) return { isAuthenticated: false, hasAuthFailed: false };
      if (data?.refresh) await refreshTokens();

      const orgIdClaim = await getAccessTokenClaim("external_org_id");
      const emailClaim = await getAccessTokenClaim("email");
      const orgId = typeof orgIdClaim === "string" ? orgIdClaim : undefined;
      const userEmail = typeof emailClaim === "string" ? emailClaim : undefined;
      if (!orgId || !userEmail) {
        return { isAuthenticated: false, hasAuthFailed: true, reason: "Missing required claims" };
      }
      return { isAuthenticated: true, orgId, userEmail };
    } catch (e) {
      return { isAuthenticated: false, hasAuthFailed: true, reason: String(e) };
    }
  });
```

### A2. Protected layout — `src/routes/(protected)/route.tsx`

The pathless group `(protected)` gates every route nested under it without adding a URL segment. The loader throws a redirect before the component ever renders. Auth data is returned from the loader so child routes can read it via `getRouteApi("/(protected)").useLoaderData()`.

```tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import * as z from "zod";

import { getAuthState } from "~/shared/auth";

export const Route = createFileRoute("/(protected)")({
  validateSearch: z.object({ modal: z.enum(["settings"]).optional() }),
  loader: async ({ location }) => {
    const auth = await getAuthState({ data: { refresh: true } });

    if (!auth.isAuthenticated) {
      if (auth.hasAuthFailed) throw redirect({ to: "/auth-failed" });
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }

    return { auth };
  },
  component: ProtectedLayoutComponent,
});

function ProtectedLayoutComponent() {
  return (
    <div className="flex h-dvh flex-1 flex-col overflow-hidden">
      <main className="min-h-0 min-w-0 flex-1"><Outlet /></main>
    </div>
  );
}
```

### A3. Login route — `src/routes/login.tsx`

Resolve in `beforeLoad` so the redirect fires before the component renders. If the user is already signed in, bounce them to their original destination. Otherwise, construct the provider's hosted login URL and do an external redirect (not a TanStack Router redirect — the user leaves the app).

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import * as z from "zod";

import { getAuthState, getKindeLoginUrl } from "~/shared/auth";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async ({ search }) => {
    const auth = await getAuthState();
    if (auth.isAuthenticated) throw redirect({ to: search.redirect ?? "/app" });

    const loginUrl = await getKindeLoginUrl({ data: { redirect: search?.redirect } });
    throw redirect({ href: loginUrl });    // external redirect to hosted login
  },
});
```

### A4. Server-fn session middleware (optional)

When multiple server functions need session access, use middleware to avoid repeating the session check. The middleware injects `session` into `ctx.context` for all downstream handlers.

```ts
import { createMiddleware } from "@tanstack/react-start";
import { getServerSession } from "~/shared/auth/session";

export const serverAuthMiddleware = createMiddleware().server(async ({ next }) => {
  const auth = await getServerSession();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  return next({ context: { session: auth } });
});
```

## Style B — client-side provider + permission query

Use this when your auth SDK (Kinde, Auth0 SPA, etc.) requires running in the browser and cannot read a server-side session.

### B1. Wrap `<Outlet/>` in the auth provider (root route)

Read provider config from the root loader's `getPublicEnvVariablesFn` server fn (see `server-actions.md`), then wrap children. The provider config comes from the server; the provider itself runs client-side.

```tsx
// src/routes/__root.tsx (component portion)
import { KindeProvider } from "@kinde-oss/kinde-auth-react";

function ClientShellComponent() {
  const { authDomain, authClientId } = Route.useLoaderData();
  return (
    <KindeProvider
      domain={authDomain}
      clientId={authClientId}
      logoutUri={window.location.origin}
      redirectUri={window.location.origin + "/app"}
      useInsecureForRefreshToken={import.meta.env.DEV}
    >
      <Outlet />
    </KindeProvider>
  );
}
```

### B2. Permission query gate — `src/routes/(protected)/app.route.tsx`

Wrap the auth check in `useQuery` so it runs once and caches. The query is disabled while the provider is still loading (`enabled: !isLoading`). When the result is `isAuthorized: true`, render `<Outlet/>`. Until then, render nothing — no flash of protected content.

```tsx
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/(protected)/app")({
  component: ProtectedRouteComponent,
});

function ProtectedRouteComponent() {
  const { isLoading, isAuthenticated, getPermission } = useKindeAuth();
  const navigate = useNavigate();

  const authQuery = useQuery({
    enabled: !isLoading,
    queryKey: ["canAccessApp", { isAuthenticated }],
    queryFn: async () => {
      if (!isAuthenticated) {
        await navigate({ to: "/" });
        return { isAuthorized: false };
      }
      const permission = await getPermission("can_access_app");
      if (!permission?.isGranted) {
        await navigate({ to: "/" });
        return { isAuthorized: false };
      }
      return { isAuthorized: true };
    },
  });

  if (authQuery.data?.isAuthorized) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <Outlet />
      </div>
    );
  }
  return null;
}
```

With Style B, the access token reaches server fns as a per-call bearer header (`Authorization: Bearer ${await getAccessToken()}`) and is verified by `authMiddleware` (see `server-actions.md`).

## Type-safe route data via `getRouteApi`

Reuse a route's typed loader data, search params, or URL params outside the route file without re-importing the `Route` const. Useful for header components or layout widgets that need auth data.

```tsx
import { getRouteApi } from "@tanstack/react-router";

const route = getRouteApi("/(protected)");

function Header() {
  const { auth } = route.useLoaderData();
  return <span>{auth.userEmail}</span>;
}
```

## Verify

Visit a protected route signed out:
- Style A redirects to `/login` during SSR — no client-side rendering of protected content
- Style B renders nothing, then navigates to `/` after the provider loads

Sign in and confirm the protected UI renders and server fns succeed (check that mutation calls return 200, not 401).
