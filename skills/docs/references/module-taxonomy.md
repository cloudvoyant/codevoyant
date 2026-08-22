# module-taxonomy — how to conceptualize a project's modules

The hierarchy retcon infers for a project, used by `retcon.md` Step 2.4 (flat-repo breakdown) and Step 2.5 (grouping). Infer this from a well-structured project; for a flat repo, propose it and confirm with the user.

## The hierarchy

```
Project
├── apps    (deployable applications / services)
│   └── modules | features
└── libs     (shared libraries / packages)
    └── modules | features
```

- **apps** (a.k.a. services) — CLIs, web apps, desktop apps, web services, workers. One deployable/executable thing is one app.
- **libs** — shared libraries and SDKs. Imported, not deployed on their own.
- **modules | features** — how an app or lib breaks into smaller, self-contained code components. A module is a unit that can be named and owned; a feature imposes additional structure onto what a module provides to its consumers. Several components form one module when they share a name prefix or ownership boundary, form a pipeline, or depend on each other as caller/callee.

## Cross-cutting concerns

A model or data pipeline being trained or served is often not evident in the directory structure. Do not assume it is, and do not assume it is not. When the code (or its docs) shows a model, pipeline, or experiment, that is a module in its own right — it is a cross-cutting concern that spans the app/lib split, not an implementation detail of whichever directory happens to contain it.

## Deriving the entities

Find the semantically appropriate entities the project manages by reading:

- directory structure and import graph,
- package/workspace metadata (which packages are published, which are executables),
- any docs already in the repo — if the repo discusses models, pipelines, or specific design patterns, conceptualize modules and features along those lines.

The taxonomy is what a good structured project implies anyway; retcon's job is to make it explicit when the repo has not.

## Boundaries

A module owns one thing and depends on others through their public API only. When proposing a breakdown, state what each module owns and what it depends on, so the user can verify the boundary, not just the names.
