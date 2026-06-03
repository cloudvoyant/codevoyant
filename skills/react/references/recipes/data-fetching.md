# Data Fetching and Forms with TanStack Query

## Why this matters

Data fetching is one of the hardest problems in frontend development because it's really five problems at once: fetching, caching, synchronization, error handling, and optimistic updates. Solving them ad hoc with `useEffect` + `useState` leads to race conditions, duplicate requests, stale data, inconsistent loading states, and cache invalidation bugs.

TanStack Query handles all five problems. Combined with a typed `openapi-fetch` client, it also eliminates an entire class of bugs: your API call arguments, request bodies, and response shapes are all verified by TypeScript at compile time.

Forms add a third layer: converting between what the API accepts (often numbers, enums, nullable types) and what HTML inputs produce (always strings, never null). Without a systematic approach, this conversion logic scatters across components. Zod + `react-hook-form` + a view-model class centralizes it.

**The full pipeline:**

```
OpenAPI schema → generated *-api-schema.d.ts → typed openapi-fetch client
   → query-key factory → queryOptions / mutationOptions → feature hook → component

Forms layer:
Zod discriminated-union schema → react-hook-form + zodResolver
   → view-model maps API ↔ form ↔ UI → mutation at the boundary
```

See the [TanStack Query docs](https://tanstack.com/query/latest/docs/framework/react/overview) and [openapi-fetch docs](https://openapi-ts.dev/openapi-fetch/) for API reference.


## 1. Install

```bash
pnpm add @tanstack/react-query openapi-fetch
pnpm add -D openapi-typescript

pnpm add zod react-hook-form @hookform/resolvers
```

For the shadcn `Form`/`FormField` primitives used in the form sections: `npx shadcn@latest add form input label` (see `shadcn-tailwind.md`).


## 2. Generate types from the backend schema

Never hand-write API types. The backend's OpenAPI/Swagger spec is the source of truth. Generate TypeScript declarations from it. Create `cli/swagger-typegen.ts`:

```ts
import { execSync } from "node:child_process";
import path from "node:path";

type SwaggerSource = {
  url: string;
  outputDir: string;
  outputFilename: string;
};

const sources: SwaggerSource[] = [
  {
    url: "https://core-api.acme.example.com/swagger/v1/swagger.json",
    outputDir: "./src/shared/api",
    outputFilename: "core-api-schema.d.ts",
  },
];

for (const source of sources) {
  const outputPath = path.join(source.outputDir, source.outputFilename);
  execSync(`openapi-typescript "${source.url}" -o "${outputPath}"`, {
    stdio: "inherit",
  });
}
```

```jsonc
{ "scripts": { "swagger-typegen": "node cli/swagger-typegen.ts" } }
```

```bash
pnpm run swagger-typegen
```

The generated `src/shared/api/core-api-schema.d.ts` exports `paths` (all endpoints) and `components` (all schemas). Add it to `globalIgnores` in your ESLint config.

Friendly names get re-derived in a companion `core-api-types.ts` file (see `conventions.md`).


## 3. Auth middleware

Attach auth headers once, centrally. `src/shared/api/middleware.ts`:

```ts
import type { Middleware } from "openapi-fetch";

declare function getAccessToken(): Promise<{
  isAuthenticated: boolean;
  accessToken: string;
  orgId: string;
}>;
declare function handleUnauthenticatedUser(): void;

export const clientAuthMiddleware: Middleware = {
  async onRequest({ request }) {
    const auth = await getAccessToken();
    if (!auth.isAuthenticated) {
      handleUnauthenticatedUser();
      return undefined;
    }
    request.headers.set("X-Acme-Org-ID", auth.orgId);
    request.headers.set("Authorization", `Bearer ${auth.accessToken}`);
    return request;
  },
  async onResponse({ response }) {
    if (response.status === 401) {
      handleUnauthenticatedUser();
      return;
    }
    if (!response.ok) {
      throw new Error(`${response.url}: ${response.status} ${response.statusText}`);
    }
  },
  async onError({ error }) {
    return new Error("Request failed", { cause: error });
  },
};
```

Replace `getAccessToken` and `handleUnauthenticatedUser` with your auth provider's actual functions.


## 4. Typed API clients

One factory per backend service. `src/shared/api/core-api-client.ts`:

```ts
import createClient from "openapi-fetch";

import type { paths } from "~/shared/api/core-api-schema";
import type { PublicRuntimeEnv } from "~/shared/env";

import { clientAuthMiddleware } from "./middleware";

export function createCoreApiClient(env: PublicRuntimeEnv) {
  const client = createClient<paths>({ baseUrl: env.REST_API_URI });
  client.use(clientAuthMiddleware);
  return client;
}
```

Bundle all clients. Include the `baseUrl` string alongside the client — query keys are parameterized by it so different environments (dev/staging/prod) never collide in the cache. `src/shared/api/api-clients.ts`:

```ts
import type { PublicRuntimeEnv } from "~/shared/env";

import { createCoreApiClient } from "./core-api-client";

export type ApiClients = {
  core: ReturnType<typeof createCoreApiClient>;
  coreBaseUrl: string;
};

export function createApiClients(env: PublicRuntimeEnv): ApiClients {
  return {
    core: createCoreApiClient(env),
    coreBaseUrl: env.REST_API_URI,
  };
}
```

Provide via context. `src/shared/api/api-clients-provider.tsx`:

```tsx
import { createContext, use } from "react";

import type { ApiClients } from "./api-clients";

const ApiClientContext = createContext<ApiClients | null>(null);

export function ApiClientsProvider({
  clients,
  children,
}: {
  clients: ApiClients;
  children: React.ReactNode;
}) {
  return <ApiClientContext value={clients}>{children}</ApiClientContext>;
}

export function useApiClients() {
  const context = use(ApiClientContext); // React 19 use()
  if (!context) throw new Error("ApiClientsProvider is missing");
  return context;
}
```


## 5. Query-key factories

Query keys are how TanStack Query knows which cached data to return, invalidate, or refetch. Keys need to be hierarchical so invalidating a resource's root key invalidates all its queries.

Include the `baseUrl` in every key so different backend environments don't share cache entries. `src/shared/api/keys/widgets.ts`:

```ts
export const widgetKeys = {
  root: (baseUrl: string) => [baseUrl, "widgets"] as const,
  all: (baseUrl: string, shopId: string) =>
    [...widgetKeys.root(baseUrl), { shopId }] as const,
  detail: (baseUrl: string, shopId: string, widgetId: string) =>
    [...widgetKeys.all(baseUrl, shopId), { widgetId }] as const,
  create: (baseUrl: string, shopId: string) =>
    [...widgetKeys.root(baseUrl), { shopId }, "create"] as const,
  update: (baseUrl: string, shopId: string) =>
    [...widgetKeys.root(baseUrl), { shopId }, "update"] as const,
  remove: (baseUrl: string, shopId: string) =>
    [...widgetKeys.root(baseUrl), { shopId }, "remove"] as const,
};
```

To invalidate all widget queries for a shop after a mutation: `queryClient.invalidateQueries({ queryKey: widgetKeys.root(clients.coreBaseUrl) })`.


## 6. Query and mutation options factories

Separate the query/mutation configuration from the hook that calls it. This lets you use the same options in loaders, prefetching, and tests without a React component.

`src/shared/api/queries/widgets.ts`:

```ts
import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
} from "@tanstack/react-query";

import type { ApiClients } from "~/shared/api/api-clients";
import { widgetKeys } from "~/shared/api/keys/widgets";

export function widgetsQueryOptions(shopId: string, clients: ApiClients) {
  return infiniteQueryOptions({
    queryKey: widgetKeys.all(clients.coreBaseUrl, shopId),
    queryFn: async ({ pageParam }) => {
      const { data } = await clients.core.GET("/widgets", {
        params: { query: { continuationToken: pageParam, limit: 25 } },
      });
      if (!data) throw new Error("Failed to fetch data");
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.continuationToken,
    placeholderData: keepPreviousData,
  });
}

export function getWidgetQueryOptions(
  shopId: string,
  widgetId: string,
  clients: ApiClients,
) {
  return queryOptions({
    queryKey: widgetKeys.detail(clients.coreBaseUrl, shopId, widgetId),
    queryFn: async () => {
      const { data } = await clients.core.GET("/widgets/{widgetId}", {
        params: { path: { widgetId } },
      });
      if (!data) throw new Error("Failed to fetch data");
      return data;
    },
  });
}
```

`src/shared/api/mutations/widgets.ts`:

```ts
import { mutationOptions } from "@tanstack/react-query";

import type { ApiClients } from "~/shared/api/api-clients";
import type { CreateWidgetRequest } from "~/shared/api/core-api-types";
import { widgetKeys } from "~/shared/api/keys/widgets";

export function createWidgetMutationOptions(shopId: string, clients: ApiClients) {
  return mutationOptions({
    mutationKey: widgetKeys.create(clients.coreBaseUrl, shopId),
    mutationFn: async (request: CreateWidgetRequest) => {
      const { data } = await clients.core.POST("/widgets", {
        body: request,
        params: { header: { "X-Acme-Org-ID": shopId } },
      });
      if (!data) throw new Error("Failed to post data");
      return data;
    },
  });
}
```

**Pattern to copy in every `queryFn`/`mutationFn`:** destructure `{ data }` from the openapi-fetch call, `throw` if falsy, return `data`. The auth middleware already throws on HTTP errors — this guards against unexpectedly empty responses.


## 7. QueryClient defaults

`src/shared/api/query-client.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 20, // treat data as fresh for 20 seconds
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

Wrap the app root with both providers:

```tsx
<QueryClientProvider client={queryClient}>
  <ApiClientsProvider clients={createApiClients(getPublicEnv())}>
    {/* app */}
  </ApiClientsProvider>
</QueryClientProvider>
```


## 8. Feature hook — the feature's public API

The feature hook is the only thing routes and pages call. It encapsulates the query, mutations, and view-model transformation behind a single function. `src/features/widgets/hooks/use-widgets.ts`:

```ts
import { useMemo } from "react";

import {
  useMutation,
  useQueryClient,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";

import { useApiClients } from "~/shared/api/api-clients-provider";
import { createWidgetMutationOptions } from "~/shared/api/mutations/widgets";
import { widgetsQueryOptions } from "~/shared/api/queries/widgets";

import { WidgetGroupViewModel } from "../view-models/widget-group-view-model";

export function useWidgets(shopId: string) {
  const clients = useApiClients();
  const queryClient = useQueryClient();

  const widgetsQuery = useSuspenseInfiniteQuery(
    widgetsQueryOptions(shopId, clients),
  );

  const viewModel = useMemo(
    () =>
      WidgetGroupViewModel.createFromWidgets(
        widgetsQuery.data.pages.flatMap((page) => page.items),
      ),
    [widgetsQuery.data],
  );

  const create = useMutation(createWidgetMutationOptions(shopId, clients));

  return { query: widgetsQuery, create, ...viewModel };
}
```

`useSuspenseInfiniteQuery` means the component renders inside a `<Suspense>` boundary and never sees a loading state — it only renders when data is ready, so no loading flags to thread through props.

Convention: return `{ query, create, update, remove, ...viewModel }`.


## 9. Simpler variant — no OpenAPI

When the backend has no OpenAPI spec, use plain `fetch` with explicit typing:

```ts
import { queryOptions } from "@tanstack/react-query";

export const userKeys = { all: () => ["user"] as const };

export function allUsersQueryOptions() {
  return queryOptions({
    queryKey: userKeys.all(),
    queryFn: async () => {
      const response = await fetch("https://api.acme.example.com/users");
      if (!response.ok) throw new Error(`${response.url}: ${response.status}`);
      return response.json() as Promise<
        { id: string; firstName: string; lastName: string }[]
      >;
    },
    refetchOnWindowFocus: false,
    retry: false,
  });
}
```

Mock during development with `msw` (`src/shared/mocks/`).


## 10. Zod barrel with custom helpers

Import Zod through a single project barrel so you can add project-specific validators once and use them everywhere. `src/shared/zod/index.ts`:

```ts
import * as z from "zod/v4";
import type { $ZodCustomParams } from "zod/v4/core";

export * from "zod/v4";

// Always: import * as z from "~/shared/zod";

export function numericString(
  params: string | $ZodCustomParams = "Value must be a valid number",
) {
  return z
    .string()
    .refine((value) => !Number.isNaN(Number(value.trim())), params);
}

export function numericRange(min: number, max = Infinity) {
  return numericString()
    .refine(
      (value) => parseFloat(value) > min,
      `Value must be greater than ${min.toLocaleString()}`,
    )
    .refine(
      (value) => parseFloat(value) <= max,
      `Value must be less than or equal to ${max.toLocaleString()}`,
    );
}
```

**Why numeric fields are modeled as strings:** HTML `<input>` always produces a string. Parsing to a number inside Zod causes controlled input flicker when the user types (e.g. typing `1.` would immediately fail validation). Keep the form value as a string validated by `numericRange`, then parse to a number in the view-model at the mutation boundary.

Shared enums derive from API discriminators. `src/shared/zod/enums.ts`:

```ts
import type { MaterialOption } from "~/shared/api/core-api-types";
import * as z from "./";

type EnumLike<T extends string> = Record<T, T>;

export const materialOptionSchema = z.enum(
  { Composite: "Composite", Alloy: "Alloy" } satisfies EnumLike<MaterialOption>,
  "Select a value",
);
```

The `satisfies EnumLike<MaterialOption>` ensures the Zod enum stays in sync with the API type — if the backend adds a new option, TypeScript will error here.


## 11. Discriminated-union form schema

When a form supports multiple variants of an entity (Standard vs Compact widget with different fields), use a Zod discriminated union. TypeScript narrows the type based on the discriminator field. `src/features/widgets/schemas/widget-form.ts`:

```ts
import * as z from "~/shared/zod";
import { materialOptionSchema } from "~/shared/zod/enums";

const standardWidgetFormSchema = z.object({
  type: z.literal("Standard"),
  id: z.guid(),
  name: z.string().min(1, "Enter a value"),
  width: z.numericRange(0),
  material: materialOptionSchema,
  segments: z.numericRange(0),
});

const compactWidgetFormSchema = z.object({
  type: z.literal("Compact"),
  id: z.guid(),
  name: z.string().min(1, "Enter a value"),
  material: materialOptionSchema,
});

export const widgetFormSchema = z.discriminatedUnion("type", [
  standardWidgetFormSchema,
  compactWidgetFormSchema,
]);

export type WidgetFormData = z.infer<typeof widgetFormSchema>;

export function defaultWidgetFormData(): WidgetFormData {
  return {
    type: "Standard",
    id: crypto.randomUUID(),
    name: "",
    width: "",
    material: "Composite",
    segments: "",
  };
}
```

The form type is always `z.infer<typeof widgetFormSchema>` — never hand-declared. If the schema changes, the type updates automatically.


## 12. Form: parent owns `useForm`, passes it down

The component that owns the form instance also owns the submit handler. Child form components receive `form` as a prop. `src/features/widgets/components/create-widget-dialog.tsx`:

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Form } from "~/shared/components/ui/form";
import {
  defaultWidgetFormData,
  widgetFormSchema,
  type WidgetFormData,
} from "../schemas/widget-form";
import { WidgetForm } from "./widget-form";

export function CreateWidgetDialog() {
  const form = useForm<WidgetFormData>({
    resolver: zodResolver(widgetFormSchema),
    defaultValues: defaultWidgetFormData(),
  });

  function onSubmit(values: WidgetFormData) {
    // values is typed WidgetFormData — pass to view-model in step 15
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <WidgetForm form={form} />
      </form>
    </Form>
  );
}
```


## 13. Field components with shadcn Form primitives

Field components receive the form instance and render individual fields. `src/features/widgets/components/widget-form.tsx`:

```tsx
import { type UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/shared/components/ui/form";
import { Input } from "~/shared/components/ui/input";

import type { WidgetFormData } from "../schemas/widget-form";

interface WidgetFormProps {
  form: UseFormReturn<WidgetFormData>;
}

export function WidgetForm({ form }: WidgetFormProps) {
  return (
    <div className="grid auto-rows-min gap-2">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem className="grid grid-cols-[1fr_3fr] items-center gap-2">
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage className="col-span-2 text-xs" />
          </FormItem>
        )}
      />
      {/* numeric fields are text Inputs — values stay as strings until view-model */}
    </div>
  );
}
```


## 14. View-model: API ↔ form ↔ UI

The view-model is the single place where unit conversions, enum-to-label mapping, and API ↔ form shape transformation live. Components stay dumb; transformation logic is testable in isolation.

`src/features/widgets/view-models/widget-view-model.ts`:

```ts
import type { Widget } from "~/shared/api/core-api-types";

import type { WidgetFormData } from "../schemas/widget-form";

export class WidgetViewModel {
  readonly #data: { id: string; name: string; widthMm: number };

  private constructor(data: WidgetViewModel["#data"]) {
    this.#data = data;
  }

  // API → view-model: branch on discriminator, convert units.
  static fromApi(widget: Widget): WidgetViewModel {
    return new WidgetViewModel({
      id: widget.id,
      name: widget.name,
      widthMm: widget.widthMm,
    });
  }

  // form (strings) → view-model: parse numbers.
  static fromFormData(formData: WidgetFormData): WidgetViewModel {
    return new WidgetViewModel({
      id: formData.id,
      name: formData.name,
      widthMm: "width" in formData ? Number(formData.width) : 0,
    });
  }

  get data(): Readonly<WidgetViewModel["#data"]> {
    return this.#data;
  }

  // view-model → form shape (for populating an edit form from existing data).
  toFormData(): WidgetFormData {
    return {
      type: "Standard",
      id: this.#data.id,
      name: this.#data.name,
      width: String(this.#data.widthMm),
      material: "Composite",
      segments: "",
    };
  }

  // view-model → API shape. Only called at the mutation boundary.
  toApi(): Widget {
    return { id: this.#data.id, name: this.#data.name, widthMm: this.#data.widthMm } as Widget;
  }
}
```

Conventions:
- Private `#data` field; `static fromApi` / `static fromFormData` constructors; `get data` getter.
- `toFormData()` and `toApi()` serializers live here, not in the component.
- A **group view-model** (`widget-group-view-model.ts`) aggregates a list of items via `static createFromWidgets(items)` — used by the feature hook.
- Components call `viewModel.toApi()` only when handing off to a mutation.


## 15. Submit — connect form to mutation

Update `onSubmit` in the parent component (step 12):

```tsx
function onSubmit(values: WidgetFormData) {
  const widget = WidgetViewModel.fromFormData(values);
  create.mutate(widget.toApi(), {
    onSuccess: () => {
      form.reset(defaultWidgetFormData());
      // close dialog, invalidate relevant queries
    },
  });
}
```


## Verify

```bash
pnpm run typecheck
```

Render a component that calls `useWidgets(shopId)` inside `<Suspense fallback={<p>Loading...</p>}>`, wrapped in `QueryClientProvider` + `ApiClientsProvider`. Submit the form empty — `FormMessage` shows Zod errors. Submit valid data — `onSubmit` receives typed `WidgetFormData`, mutation fires, form resets.
