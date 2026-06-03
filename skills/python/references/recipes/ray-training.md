# Distributed Computing with Ray

## Why this matters

A training job that takes 8 hours on one machine can take 30 minutes with 16 parallel workers — if the job is structured for distribution from the start. The trap is writing code that only runs in-process and then trying to retrofit parallelism later. Ray makes this tractable by providing tasks (stateless functions) and actors (stateful workers) as first-class primitives.

The key discipline: **structure pipelines so the same code can run in-process, as a subprocess, or as a Ray remote task — and produce byte-identical output in all three modes.** This makes distribution something you switch on, not something you rewrite for.


## Install

```bash
uv add 'ray[default]>=2.30'
```

Install the `[default]` extra (dashboard + autoscaler), not the bare `ray` wheel.


## Ray Core Concepts

See the [Ray core concepts docs](https://docs.ray.io/en/latest/ray-core/key-concepts.html) for the full tasks/actors/object-store API. Here's what matters for our stack:

**Apple Silicon + uv hang:** always set these env vars **before** `import ray`, or the driver hangs on Ray ≥ 2.55 when invoked via `uv run`:

```python
import os
os.environ.setdefault("RAY_ENABLE_UV_RUN_RUNTIME_ENV", "0")
os.environ.setdefault("RAY_USAGE_STATS_ENABLED", "0")
import ray
```

**Placement trick — `num_gpus=0.01`:** use a fractional GPU hint to force a task onto a GPU node without consuming the GPU. This is the pattern for sync/upload tasks that need to run co-located with GPU workers (e.g. `sync_to_s3` after a training task):

```python
@ray.remote(num_gpus=0.01)
def sync_to_s3(out_dir: str, s3_uri: str) -> str:
    import subprocess
    subprocess.run(["aws", "s3", "sync", out_dir, s3_uri], check=True)
    return s3_uri
```

**Object store:** pass `ray.put(big_array)` and give tasks the reference rather than the array. Each task reads from shared memory — no serialization per worker. Mandatory for large NumPy arrays distributed across many tasks.

**Actors:** method calls on a single actor are serialized automatically. Use actors for a model server, a connection pool, or a metric accumulator — no locking needed.


## Shipping Code — `runtime_env.working_dir`

Workers in a cluster don't have your local code. `working_dir` packages a directory of source files and ships it to every worker. This lets you edit `libs/*/src` locally and have remote workers pick up the changes immediately, without rebuilding their Docker image.

The cap is **100 MB** — stage a trimmed tree, not the repo root:

```python
import shutil, tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def stage_working_dir() -> Path:
    staging = Path(tempfile.mkdtemp(prefix="ray-stage-"))
    keep = ["pyproject.toml", "libs", "apps", "fixtures"]
    for entry in keep:
        src = REPO / entry
        if not src.exists():
            continue
        dst = staging / entry
        if src.is_dir():
            shutil.copytree(src, dst, ignore=shutil.ignore_patterns(
                "__pycache__", ".pytest_cache", ".ruff_cache",
                ".venv", "dist", "build", "*.egg-info", "out", "node_modules",
            ))
        else:
            shutil.copy2(src, dst)
    return staging


ray.init(
    address="ray://head:10001",
    runtime_env={
        "working_dir": str(stage_working_dir()),
        "env_vars": {"MY_APP_BACKEND": "cuda"},
    },
)
```

On the worker, prepend each source root to `sys.path` so local source wins over baked-in wheels:

```python
@ray.remote(num_gpus=1)
def run_on_worker(args: list[str]) -> int:
    import glob, os, sys
    cwd = os.getcwd()                                # the unpacked working_dir
    for src in sorted(glob.glob(os.path.join(cwd, "libs", "*", "src"))):
        sys.path.insert(0, src)
    import pytest                                     # heavy deps from worker venv
    return int(pytest.main(args))
```

Rebuild the worker image **only** when `pyproject.toml` changes. Pure source edits ship for free via `working_dir`.


## Three-Executor Pattern (Local ↔ Distributed Parity)

This is the core architectural pattern for distributable pipelines. Structure every pipeline stage so it can run three ways — in-process (fast, debuggable), subprocess (parity gate), or Ray remote (parallel, distributed) — and all three produce **byte-identical** output files.

The subprocess executor is the cheap parity gate that proves a stage is distribution-safe before you add a cluster. If subprocess and in-process agree, Ray will too.

```python
from __future__ import annotations

import importlib
import json
import subprocess
from pathlib import Path
from typing import Protocol, runtime_checkable

from my_schemas import JobSpec, RunStats

_STAGE_REGISTRY: dict[str, tuple[str, str]] = {}


def register_stage(name: str, module: str, attr: str = "run") -> None:
    _STAGE_REGISTRY[name] = (module, attr)


def resolve_stage(name: str):
    module_path, attr = _STAGE_REGISTRY[name]
    return getattr(importlib.import_module(module_path), attr)


@runtime_checkable
class StageExecutor(Protocol):
    def run_stage(self, name: str, inputs: dict[str, Path], output: Path,
                  job: JobSpec, num_gpus: float | None = None,
                  worker_type: str | None = None,
                  stage_kwargs: dict | None = None) -> RunStats: ...


class InProcessExecutor:
    def run_stage(self, name, inputs, output, job, num_gpus=None,
                  worker_type=None, stage_kwargs=None) -> RunStats:
        fn = resolve_stage(name)
        return fn(inputs=inputs, output=output, job=job, **(stage_kwargs or {}))


class SubprocessExecutor:
    def __init__(self, runner: list[str] | None = None) -> None:
        self._runner = runner or ["uv", "run", "my-app-stage"]

    def run_stage(self, name, inputs, output, job, num_gpus=None,
                  worker_type=None, stage_kwargs=None) -> RunStats:
        payload = {
            "stage": name,
            "inputs": {k: str(v) for k, v in inputs.items()},
            "output": str(output),
            "job": json.loads(job.model_dump_json()),
            "stage_kwargs": stage_kwargs or {},
        }
        proc = subprocess.run([*self._runner, name],
                              input=json.dumps(payload),
                              capture_output=True, text=True, check=False)
        if proc.returncode != 0:
            raise RuntimeError(
                f"stage '{name}' failed (rc={proc.returncode})\n"
                f"STDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
            )
        stats_line = next(
            (ln.strip() for ln in reversed(proc.stdout.splitlines())
             if ln.strip().startswith("{") and "wall_s" in ln),
            None,
        )
        if stats_line is None:
            raise RuntimeError(f"stage '{name}' emitted no RunStats JSON")
        return RunStats.model_validate_json(stats_line)


class RayExecutor:
    def __init__(self, num_workers=1, num_gpus_per_stage=0.0,
                 ray_address: str | None = None, runtime_env: dict | None = None) -> None:
        self.num_workers = num_workers
        self.num_gpus_per_stage = num_gpus_per_stage
        self.ray_address = ray_address
        self.runtime_env = runtime_env
        self._initialised = False

    def _ensure_ray(self) -> None:
        if self._initialised:
            return
        import os, sys
        os.environ.setdefault("RAY_ENABLE_UV_RUN_RUNTIME_ENV", "0")
        os.environ.setdefault("RAY_USAGE_STATS_ENABLED", "0")
        import ray
        if not ray.is_initialized():
            if self.ray_address:
                ray.init(address=self.ray_address, ignore_reinit_error=True,
                         runtime_env=self.runtime_env or {})
            else:
                ray.init(ignore_reinit_error=True, log_to_driver=False,
                         include_dashboard=False, num_cpus=max(1, self.num_workers),
                         runtime_env={"py_executable": sys.executable})
        self._initialised = True

    def run_stage(self, name, inputs, output, job, num_gpus=None,
                  worker_type=None, stage_kwargs=None) -> RunStats:
        self._ensure_ray()
        import ray

        module_path, attr = _STAGE_REGISTRY[name]
        gpus = self.num_gpus_per_stage if num_gpus is None else num_gpus
        # vm:<type> only works if the worker registered the resource at start
        extra = {f"vm:{worker_type}": 0.01} if worker_type else None

        @ray.remote(num_gpus=gpus, resources=extra)
        def _run_remote(module_path, attr, inputs_s, output_s, job_json, kwargs_in) -> str:
            import importlib
            from pathlib import Path as _Path
            from my_schemas import JobSpec as _JobSpec
            fn = getattr(importlib.import_module(module_path), attr)
            stats = fn(inputs={k: _Path(v) for k, v in inputs_s.items()},
                       output=_Path(output_s),
                       job=_JobSpec.model_validate_json(job_json),
                       **kwargs_in)
            return stats.model_dump_json()

        handle = _run_remote.remote(
            module_path, attr,
            {k: str(v) for k, v in inputs.items()},
            str(output), job.model_dump_json(), stage_kwargs or {},
        )
        return RunStats.model_validate_json(ray.get(handle))


def make_executor(name: str, ray_address=None, runtime_env=None) -> StageExecutor:
    if name == "inprocess":   return InProcessExecutor()
    if name == "subprocess":  return SubprocessExecutor()
    if name == "ray":         return RayExecutor(ray_address=ray_address, runtime_env=runtime_env)
    raise ValueError(f"unknown executor '{name}'")
```

The remote function takes only JSON/strings and `importlib`s the stage by module path — it never closes over a function object or in-process state. That's the rule that makes Ray output byte-identical to in-process output.

### The byte-identical gate (test)

```python
import hashlib
from pathlib import Path


def _digest(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def test_three_executors_byte_identical(tmp_path):
    job = make_job()
    inp = tmp_path / "in.txt"; inp.write_text("parity-payload")
    outs = {n: tmp_path / f"out_{n}.json" for n in ("in", "sub", "ray")}

    InProcessExecutor().run_stage("trivial", {"in": inp}, outs["in"], job)
    SubprocessExecutor().run_stage("trivial", {"in": inp}, outs["sub"], job)
    RayExecutor().run_stage("trivial", {"in": inp}, outs["ray"], job)

    d = {k: _digest(v) for k, v in outs.items()}
    assert d["in"] == d["sub"] == d["ray"], f"hash mismatch: {d}"
```


## AWS Cluster (Head + Spot GPU Workers)

Cluster shape:
- **Head** (`t3.medium`/`t3.xlarge`, on-demand) — Ray head container with `--autoscaling-config`. No GPU. Ports 6379 (GCS) / 8265 (dashboard) / 10001 (Client).
- **Workers** (`g4dn.*` / `g6.*` spot, GPU) — **not** in Terraform state; Ray autoscaler launches on demand and terminates on idle.
- Same container image on both (deps baked into `/workspace/.venv`).

Autoscaler config (key non-obvious bits when head is created outside `ray up`):

```yaml
provider:
  type: aws
  region: us-east-1
  cache_stopped_nodes: false
  disable_launch_config_check: true   # head not made by `ray up`; skip the check
  disable_node_updaters: true         # workers self-bootstrap via EC2 UserData; no SSH

available_node_types:
  ray.head.default:
    resources: {CPU: 2}
    max_workers: 0
  ray.worker.g4dn_2xlarge:
    min_workers: 0
    max_workers: 4
    # vm:<type> is a CUSTOM resource — task lands here ONLY if worker's
    # `ray start --resources` registered it too.
    resources: {CPU: 8, GPU: 1, "vm:g4dn.2xlarge": 1}
    node_config:
      InstanceType: g4dn.2xlarge
      ImageId: <gpu-ami>
      InstanceMarketOptions: {MarketType: spot, SpotOptions: {MaxPrice: "0.20"}}
```

Worker UserData starts Ray and registers the custom resource (load-bearing):

```bash
docker run -d --name ray-worker --gpus all --network host --shm-size=2g <image> \
  bash -c "ray start --address=$HEAD_IP:6379 \
           --resources='{\"vm:g4dn.2xlarge\":1}' --block"
```

### Reach the head from your laptop

```bash
# SSM port-forward (no public SSH, no inbound 0.0.0.0/0)
aws ssm start-session --target <head_instance_id> --region us-east-1 \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["10001"],"localPortNumber":["10001"]}'

export RAY_ADDRESS_OVERRIDE=ray://127.0.0.1:10001
```

### Submit a job

```python
import os
os.environ.setdefault("RAY_ENABLE_UV_RUN_RUNTIME_ENV", "0")
import ray

ray.init(
    address=os.environ.get("RAY_ADDRESS_OVERRIDE", "ray://<head_private_ip>:10001"),
    runtime_env={"working_dir": "<staged tree>",
                 "env_vars": {"MY_APP_BACKEND": "cuda"}},
)


@ray.remote(num_gpus=1)
def heavy(inp: str, out: str) -> str:
    ...
    return out


ray.get(heavy.remote("in.bin", "out.bin"))
```

### Get artifacts back

```python
@ray.remote(num_gpus=0.01)
def sync_to_s3(out_dir: str, s3_uri: str) -> str:
    import subprocess
    subprocess.run(["aws", "s3", "sync", "--no-progress", out_dir, s3_uri], check=True)
    return s3_uri


ray.get(sync_to_s3.remote("/workspace/out", f"s3://{bucket}/run-123/"))
```

```bash
aws s3 sync s3://<bucket>/run-123/ ./out/run-123/
```


## Cost Hygiene (Spot GPUs Bleed Money)

- Spot + price cap on workers (`MaxPrice: "0.20"`)
- Autoscaler `idle_timeout_minutes` reaps idle workers
- Independent watchdog crons as backstops (worker shuts down on GPU < 5% for N min; head stops after N idle hours)
- Wrap each run in a try/finally cost log; tear down workers (`ray down` or idle timeout) before destroying the head with Terraform


## Common Pitfalls

- **`runtime_env.pip` for transitive deps** — Ray builds a fresh per-task virtualenv and reinstalls everything, timing out the Ray Client gRPC channel on cold workers (5–10 min). Bake heavy deps into the worker image; ship source via `working_dir`. Reserve `pip` for one or two tiny pure-Python packages.
- **Per-task venv bootstrap needs pip** — if the worker base venv was created with `uv venv` (no `--seed`), the bootstrap fails with `No module named pip`. Always `uv venv --seed`.
- **Apple Silicon driver hang** — Ray >= 2.55 auto-detects `uv run` on the driver and rewrites `py_executable`, which then hangs. Set `RAY_ENABLE_UV_RUN_RUNTIME_ENV=0` **before** `import ray`.
- **`working_dir` cap = 100 MB** — stage a trimmed tree (exclude `.venv`, `.git`, `dist`, `build`); pointing at the repo root will blow past it.
- **`vm:<type>` custom resource** must be registered by the worker's `ray start --resources='{"vm:<type>":1}'` — if missing, the autoscaler picks the right node but the raylet has no such resource and the task pends forever.
- **Absolute laptop paths don't exist on the worker** — stage inputs into `working_dir` and pass `Path(local_input.name)` (basenames), let the worker resolve against the unpacked directory.
- **`env_vars` is not a secret store** — non-secret flags only; use instance roles for cloud credentials.
