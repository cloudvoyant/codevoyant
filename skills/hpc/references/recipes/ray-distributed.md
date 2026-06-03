# Distributed Compute with Ray

## Why Ray

Ray turns a Python function into a distributed task with one decorator. It handles task scheduling, object transfer, and fault tolerance. The same code runs on a laptop (single-node, for development and testing) or a 1000-node cloud cluster in production. You write Python functions; Ray handles where and how they execute.

Ray was created at UC Berkeley's RISELab and is now maintained by Anyscale. It powers distributed training and inference at OpenAI, Uber, Spotify, and Shopify.

## Core Concepts

Three things to understand before writing any code:

**Object store**: A shared-memory, in-process storage layer. Task arguments and return values are automatically placed here. Objects are immutable once stored. On a single node, this is Arrow-backed shared memory. On a cluster, objects transfer between nodes on demand.

**Scheduler**: Assigns tasks to workers. It considers data locality (prefer running a task where its input data already lives), resource requirements (CPU, GPU, memory), and placement constraints. You rarely interact with the scheduler directly.

**Driver**: The process that calls `ray.init()`. It submits tasks and collects results. On a cluster, the driver runs on the head node.

## Ray Tasks

Decorate a function with `@ray.remote` to make it a task:

```python
import ray

ray.init()

@ray.remote
def square(x):
    return x * x

# .remote() launches the task asynchronously and returns an ObjectRef
ref = square.remote(4)

# ray.get() blocks until the result is ready
result = ray.get(ref)  # 16
```

Launch many tasks and collect results:

```python
refs = [square.remote(i) for i in range(1000)]
results = ray.get(refs)  # blocks until all 1000 are done
```

**`ray.wait` for non-blocking polling**: When you want to process results as they arrive rather than waiting for all:

```python
ready, remaining = ray.wait(refs, num_returns=10, timeout=5.0)
# ready: list of ObjectRefs whose results are available
# remaining: list of ObjectRefs still pending
for ref in ready:
    print(ray.get(ref))
```

**Resource requirements**: Tasks default to 1 CPU. Override with:

```python
@ray.remote(num_cpus=4, num_gpus=1)
def train_model(data):
    # uses 4 CPUs and 1 GPU
    ...
```

## Ray Actors

Decorate a class with `@ray.remote` to create an actor — a stateful worker that lives in its own process:

```python
@ray.remote
class Counter:
    def __init__(self):
        self.value = 0

    def increment(self):
        self.value += 1
        return self.value

    def get(self):
        return self.value

counter = Counter.remote()
counter.increment.remote()
counter.increment.remote()
print(ray.get(counter.get.remote()))  # 2
```

Actors are useful for:
- Model servers (load a model once, serve many requests)
- Connection pools (hold a database connection)
- Shared counters, caches, or coordination state

**Actor methods are single-threaded by default.** Calls are queued and processed one at a time. For concurrent access, set `max_concurrency`:

```python
@ray.remote(max_concurrency=10)
class ModelServer:
    def __init__(self, model_path):
        self.model = load_model(model_path)

    def predict(self, input_data):
        return self.model(input_data)
```

## The Object Store

Task arguments and return values flow through the object store automatically. For large objects that multiple tasks need, use `ray.put` to store once and pass references:

```python
import numpy as np

# Bad: large_array is serialized and copied for each task
large_array = np.random.randn(10_000_000)
refs = [process.remote(large_array) for _ in range(100)]

# Good: store once, pass the reference
large_ref = ray.put(large_array)
refs = [process.remote(large_ref) for _ in range(100)]
```

Without `ray.put`, the array is serialized 100 times. With `ray.put`, it is serialized once and each task gets a zero-copy view (on the same node) or a single transfer (across nodes).

**Object store size**: Defaults to 30% of available memory. Override with `ray.init(object_store_memory=10 * 1024**3)` for 10 GB. Objects are evicted LRU when the store is full. Pinned objects (referenced by a running task) are never evicted.

## Placement Groups

Reserve a set of resources for a group of actors or tasks. Useful for gang scheduling — ensuring a set of workers are co-located on the same node or across specific nodes.

```python
from ray.util.placement_group import placement_group, placement_group_table

# Reserve 3 bundles of 4 CPUs each
pg = placement_group([{"CPU": 4}] * 3, strategy="PACK")
ray.get(pg.ready())  # block until resources are reserved

# Launch actors on the placement group
workers = [
    Worker.options(
        scheduling_strategy=ray.util.scheduling_strategies.PlacementGroupSchedulingStrategy(
            placement_group=pg, placement_group_bundle_index=i
        )
    ).remote()
    for i in range(3)
]
```

**Strategies**: `PACK` puts bundles on as few nodes as possible (good for communication-heavy workloads). `SPREAD` distributes across nodes (good for fault tolerance). `STRICT_PACK` requires all bundles on one node.

## Ray Data

Distributed data processing built on Ray. For ETL, preprocessing, and batch inference pipelines.

```python
import ray.data

# Read from Parquet
ds = ray.data.read_parquet("s3://bucket/data/")

# Transform in parallel
ds = ds.map_batches(transform_fn, batch_size=1000)

# Write results
ds.write_parquet("s3://bucket/output/")
```

Ray Data is lazy — transformations are not executed until you consume the dataset (write, iterate, or call `take`). It automatically parallelizes across available workers and handles data shuffling.

**When to use Ray Data vs Spark**: Ray Data is better when your transforms involve Python-heavy logic (ML inference, image processing) that doesn't map to SQL. Spark is better for SQL-like queries on structured data. They are complementary, not competing.

## Ray Tune

Hyperparameter search as a Ray application. Define a training function that reports metrics, and Ray Tune explores the search space:

```python
from ray import tune

def train_fn(config):
    for epoch in range(config["epochs"]):
        loss = train_epoch(lr=config["lr"], batch_size=config["batch_size"])
        tune.report({"loss": loss})

analysis = tune.run(
    train_fn,
    config={
        "lr": tune.loguniform(1e-4, 1e-1),
        "batch_size": tune.choice([32, 64, 128]),
        "epochs": 10,
    },
    num_samples=50,
)
```

Ray Tune supports early stopping (ASHA, HyperBand), Bayesian optimization (with Optuna or BayesOpt backends), and distributed training across GPUs. See the [Ray Tune docs](https://docs.ray.io/en/latest/tune/index.html) for full details.

## Ray Cluster Setup on AWS

Ray provides a cluster launcher that provisions EC2 instances, installs dependencies, and starts Ray workers.

Create a `cluster.yaml`:

```yaml
cluster_name: my-ray-cluster

provider:
    type: aws
    region: us-west-2

auth:
    ssh_user: ubuntu

available_node_types:
    head:
        node_config:
            InstanceType: m5.4xlarge
            ImageId: ami-0abcdef1234567890
        min_workers: 0
        max_workers: 0
    worker:
        node_config:
            InstanceType: m5.4xlarge
            ImageId: ami-0abcdef1234567890
        min_workers: 2
        max_workers: 10

setup_commands:
    - pip install ray[default] numpy pandas
```

```bash
ray up cluster.yaml          # provision and start cluster
ray submit cluster.yaml job.py  # submit a script
ray down cluster.yaml        # tear down cluster
```

Auto-scaling: Ray adds workers when tasks are queued and removes idle workers after a timeout. Set `idle_timeout_minutes` in the YAML.

## Ray Cluster Setup on GCP

Same pattern, different provider block:

```yaml
cluster_name: my-ray-cluster

provider:
    type: gcp
    region: us-central1
    availability_zone: us-central1-a
    project_id: my-gcp-project

auth:
    ssh_user: ubuntu

available_node_types:
    head:
        node_config:
            machineType: n1-standard-16
            sourceImage: projects/deeplearning-platform-release/global/images/family/common-cpu
        min_workers: 0
        max_workers: 0
    worker:
        node_config:
            machineType: n1-standard-16
            sourceImage: projects/deeplearning-platform-release/global/images/family/common-cpu
        min_workers: 2
        max_workers: 10

setup_commands:
    - pip install ray[default] numpy pandas
```

The commands are the same: `ray up`, `ray submit`, `ray down`.

## Monitoring

The Ray Dashboard runs at `http://localhost:8265` (or the head node's IP on a cluster).

What to look for:
- **Task timeline**: Are tasks running in parallel or serialized? Long gaps between tasks indicate scheduling overhead or data transfer bottlenecks.
- **Actor memory**: Actors that accumulate state without cleanup will eventually OOM.
- **Object store utilization**: If the object store is consistently above 80%, increase its size or reduce the number of in-flight objects.
- **Worker utilization**: Idle workers with queued tasks usually means a data transfer bottleneck.

For production monitoring, Ray integrates with Prometheus and Grafana. Export metrics with `ray metrics`.

## Common Pitfalls

**Too many small tasks**: Ray has per-task overhead (~1ms for scheduling + serialization). If your task takes less than ~10ms, the overhead dominates. Batch work into larger tasks.

```python
# Bad: 1 million tasks of 0.01ms each
refs = [tiny_task.remote(x) for x in range(1_000_000)]

# Good: 1000 tasks of 10ms each
def batch_task(items):
    return [tiny_task_logic(x) for x in items]

batches = [items[i:i+1000] for i in range(0, len(items), 1000)]
refs = [batch_task.remote(batch) for batch in batches]
```

**Actor bottlenecks**: An actor processes one call at a time by default. If 100 tasks call the same actor, they queue. Use `max_concurrency` or shard across multiple actor replicas.

**Large objects copied per-task**: Use `ray.put` for data shared across tasks. Without it, the same object is serialized and transferred once per task.

**Not calling `ray.shutdown()` in tests**: Ray processes linger between test runs, causing port conflicts and memory leaks. Always shut down in test fixtures:

```python
import pytest

@pytest.fixture(scope="module")
def ray_context():
    ray.init(num_cpus=2)
    yield
    ray.shutdown()
```

**Ignoring data locality**: If a task produces a large result and another task consumes it, Ray tries to schedule them on the same node. But if you manually specify resources that force them apart, you pay the transfer cost. Let the scheduler do its job unless you have a specific reason to override.
