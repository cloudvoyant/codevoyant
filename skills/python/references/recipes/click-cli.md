# CLI Commands with Click

## Why this matters

A poorly designed CLI is one of the most common junior-dev mistakes: globals everywhere, connection setup that fails when you run `--help`, error messages that dump a raw traceback at the user. Click gives you a structured way to avoid all three.

The mental model: **the root group is a setup phase, not a business logic phase.** It creates services and stores them in `ctx.obj`. Subcommands read from `ctx.obj` and do real work. This means `--help` always works even on a host without credentials or network access — because help short-circuits before any real work happens.

Use Click. Not argparse, not typer, not bare `sys.argv`.


## Install

```bash
uv add click
```


## Minimal Working Example

The simplest Click CLI: one group, one command, one service injected through context.

```python
# src/acme_cli/cli.py
from __future__ import annotations

import click


@click.group()
@click.pass_context
def cli(ctx: click.Context) -> None:
    """Acme CLI — dev tools."""
    ctx.ensure_object(dict)
    # Set up services here; they're available to all subcommands via ctx.obj
    ctx.obj["config"] = {"env": "dev"}


@cli.command()
@click.pass_context
def status(ctx: click.Context) -> None:
    """Show current config."""
    click.echo(f"Env: {ctx.obj['config']['env']}")
```

Wire the script entry:

```toml
# apps/acme-cli/pyproject.toml
[project.scripts]
acme = "acme_cli.cli:cli"
```


## Full Pattern — Root Group with Version, Lazy Services

The production pattern: root group with an eager `--version` callback, platform guard, and lazy service setup.

```python
# apps/acme-cli/src/acme_cli/cli.py
from __future__ import annotations

from importlib.metadata import version as get_version

import click

from acme_cli.config_service import ConfigService
from acme_cli.help import CustomGroup, print_banner
from acme_cli.platform import require_supported_platform


def version_callback(ctx: click.Context, param: click.Parameter, value: bool) -> None:
    """Print version and exit (eager)."""
    if not value or ctx.resilient_parsing:
        return
    try:
        ver = get_version("acme-cli")
    except Exception:
        ver = "dev"
    print_banner()
    click.secho(f"v{ver}", fg=(127, 0, 255), bold=True)
    ctx.exit()


@click.group(cls=CustomGroup)
@click.option(
    "--version",
    is_flag=True,
    callback=version_callback,
    expose_value=False,
    is_eager=True,
    help="Show version and exit.",
)
@click.pass_context
def cli(ctx: click.Context) -> None:
    """Acme CLI — dev tools."""
    # Fail fast on unsupported platforms — before any side effects. Click's
    # eager --help / --version callbacks short-circuit before this body runs.
    require_supported_platform()
    ctx.ensure_object(dict)
    config_service = ConfigService()
    config_service.load()
    ctx.obj["config_service"] = config_service


# Import and attach commands AFTER cli is defined — avoids circular imports.
from acme_cli.commands.cloud import cloud   # noqa: E402
from acme_cli.commands.docs import docs     # noqa: E402

cli.add_command(cloud)
cli.add_command(docs)
```

Version is read at runtime via `importlib.metadata.version("acme-cli")` — never hardcoded.


## Subcommand Group with Its Own Options

Each command file defines its own `@click.group()` whose options set up `ctx.obj` for that subtree. **Defer building real connections until a command needs them**, so `--help` works without credentials.

```python
# apps/acme-cli/src/acme_cli/commands/cloud.py
from __future__ import annotations

import click

from acme_cli.cloud_auth import get_profile_for_env


@click.group()
@click.option(
    "--env",
    type=click.Choice(["dev", "stage", "prod"], case_sensitive=False),
    default="dev",
    help="Environment (determines profile and bucket).",
    show_default=True,
)
@click.pass_context
def cloud(ctx: click.Context, env: str) -> None:
    """Cloud operations."""
    profile = get_profile_for_env(env)
    # Lazy: don't create the session yet so --help works without credentials
    ctx.obj = {"env": env, "profile": profile, "session": None}


@cloud.command("list-buckets")
@click.pass_context
def list_buckets(ctx: click.Context) -> None:
    """List storage buckets in the account."""
    ...   # build the session here, on first real use
```


## Inject and Read Services Through `ctx.obj`

The root group stashes services in `ctx.obj`; a helper reads them back lazily and caches derived views:

```python
def get_project_context(ctx: click.Context) -> ProjectContext:
    ctx.ensure_object(dict)
    if "project_context" not in ctx.obj:
        config_service: ConfigService | None = ctx.obj.get("config_service")
        config = config_service.config if config_service and config_service.is_loaded else None
        ctx.obj["project_context"] = ProjectContext.from_config(config)
    return ctx.obj["project_context"]
```


## Input Validation

For a fixed enum, use `click.Choice`. For a regex or computed check, attach a `callback=` that raises `click.BadParameter`:

```python
import re

import click

PROFILE_RE = re.compile(r"^acme-(dev|prod)-(gov|comm)$")


def validate_profile_arg(_ctx, _param, value: str) -> str:
    if not PROFILE_RE.match(value):
        raise click.BadParameter(
            f"Profile must match 'acme-(dev|prod)-(gov|comm)', got {value!r}. "
            "Examples: acme-dev-gov, acme-prod-comm."
        )
    return value


@click.command()
@click.argument("profile", callback=validate_profile_arg)
@click.option("--env", type=click.Choice(["dev", "stage", "prod"], case_sensitive=False),
              default="dev", show_default=True)
def some_command(profile: str, env: str) -> None: ...
```

`click.BadParameter` sets exit code 2 automatically.


## Error Handling at the CLI Edge

Command bodies wrap external calls in `try/except`, catch the specific low-level exception, and render colored multi-step troubleshooting. Convention: **red = error, yellow = guidance, green = success.**

```python
@click.pass_context
def verify(ctx: click.Context) -> None:
    try:
        identity = session.client("sts").get_caller_identity()
        click.secho(f"Account: {identity['Account']}", fg="green")
    except TokenRetrievalError:
        click.secho("Error: SSO token has expired or is invalid.", fg="red")
        click.secho("\nTroubleshooting steps:", fg="yellow")
        click.secho(f"  1. Run: aws sso login --profile {ctx.obj['profile']}", fg="yellow")
        click.secho("  2. Complete authentication in your browser", fg="yellow")
        click.secho("  3. Try the command again", fg="yellow")
        ctx.exit(1)
    except NoCredentialsError:
        click.secho("Error: No credentials found for this profile.", fg="red")
        click.secho("\nTroubleshooting steps:", fg="yellow")
        click.secho(f"  1. Run: aws configure --profile {ctx.obj['profile']}", fg="yellow")
        ctx.exit(1)
```

Subclass `click.UsageError` for domain validation that should surface as a CLI usage error:

```python
class MissingProjectConfig(click.UsageError):
    """Click formats the message and exits with code 2 automatically."""


def project_name(self) -> str:
    if self.config is None or self.config.project is None or not self.config.project.name:
        raise MissingProjectConfig(
            "`project.name` is not set in acme.yaml. "
            "Add a `project:` section with `name: <project>` to acme.yaml."
        )
    return self.config.project.name
```


## Custom Colored Help

Subclass `click.Group` and override `format_help` for a banner and aligned, colored command list:

```python
# apps/acme-cli/src/acme_cli/help.py
import click


def print_banner() -> None:
    click.secho("ACME", fg="bright_white", bold=True)


class CustomGroup(click.Group):
    """Click group with banner + colored help formatting."""

    def format_help(self, ctx: click.Context, formatter: click.HelpFormatter) -> None:
        print_banner()
        click.secho("Commands:", fg="blue", bold=True)
        commands = self.list_commands(ctx)
        max_len = max((len(c) for c in commands), default=0)
        for name in commands:
            cmd = self.get_command(ctx, name)
            if cmd is None:
                continue
            help_text = cmd.get_short_help_str(limit=60)
            click.secho(f"  {name.ljust(max_len + 2)}", fg="green", nl=False)
            click.echo(help_text)
```


## Alternative — Auto-Discovered Commands

When commands are numerous or pluggable, subclass `click.MultiCommand` and read every `*.py` in a `commands/` directory — no explicit `add_command` calls:

```python
import os
import click

plugin_folder = os.path.join(os.path.dirname(__file__), "commands")


class PluginCLI(click.MultiCommand):
    def list_commands(self, ctx):
        return sorted(
            f[:-3] for f in os.listdir(plugin_folder)
            if f.endswith(".py") and f != "__init__.py"
        )

    def get_command(self, ctx, name):
        ns = {}
        with open(os.path.join(plugin_folder, name + ".py")) as f:
            exec(compile(f.read(), f.name, "exec"), ns, ns)
        return ns[name]


cli = PluginCLI(help="Acme CLI — pluggable commands.")
```

Each file in `commands/` (e.g. `app.py`) exposes a top-level Click command object named the same as the file. Use the explicit `add_command` tree when the command set is fixed (import-time type checking); use `MultiCommand` when commands are pluggable.


## Verify

```bash
acme --version           # eager callback prints version, exits 0
acme --help              # custom colored help, no config/credentials needed
acme cloud --help        # subgroup help works without credentials (lazy session)
acme cloud list-buckets  # builds the session on first real use
```


## Common Pitfalls

- Circular imports — import command modules **after** the root group is defined, never at top of `cli.py`
- Building cloud clients in the group body breaks `--help` on hosts without credentials; build them lazily inside the command that needs them
- Boolean flags as plain CLI args are fine — if your linter flags `FBT001`/`FBT002`, ignore them for the CLI package via `per-file-ignores`
- `print` from a CLI is fine; if `T201` triggers, ignore it for `src/**/__main__.py` and `src/**/cli.py`
- `ctx.exit(1)` only works inside a Click context — use `sys.exit(1)` for guards that may run outside one (a `require_*` method on a service)
- `click.Choice([...], case_sensitive=False)` lowercases the value before passing to the body — don't compare against `"Dev"`
- Eager callbacks (`is_eager=True`) short-circuit before the group body — keep `require_supported_platform()` non-eager so it actually runs
