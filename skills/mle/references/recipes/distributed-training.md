# Distributed Training with Ray Train

## Why distributed training

Two situations force you beyond a single GPU.

**The model is too large.** A 7B-parameter model in float32 requires 28 GB of VRAM. A single A100-80 GB can hold it; a single V100-16 GB cannot. When the model does not fit, you need model parallelism (tensor parallel or pipeline parallel) to split the model across devices.

**Training is too slow.** A ResNet-50 on ImageNet takes roughly 12 hours on one V100 and roughly 90 minutes on 8. When iteration speed is the bottleneck, you need data parallelism to split the batch across devices. Most practitioners encounter the throughput problem first. This recipe covers that case.

## DDP explained intuitively

Distributed Data Parallel (DDP) runs a complete copy of the model on every GPU. Each GPU processes a different slice of the batch. After the backward pass, gradients are averaged across all GPUs via an AllReduce operation before the optimizer step.

The result is mathematically equivalent to training on a single GPU with a batch size equal to `per_gpu_batch_size * num_gpus`, but the wall-clock time scales nearly linearly with the number of GPUs. Communication overhead from AllReduce and worker synchronization keeps it from being perfectly linear, but on modern interconnects (NVLink, InfiniBand) the efficiency is typically above 90% for models with enough compute relative to communication.

## Ray Train setup

```python
from ray.train.torch import TorchTrainer
from ray.train import ScalingConfig
```

Ray Train orchestrates DDP without requiring `torchrun` or manual process group setup. It runs inside an existing Ray cluster, or starts a local Ray instance automatically on a single machine. There is no separate launcher script, no `MASTER_ADDR` environment variable to configure, and no `torch.distributed.init_process_group` call in your code.

## Training function pattern

The `train_func` is a plain Python function that Ray Train executes on each worker. It receives a `config` dict.

```python
import ray.train
from ray.train.torch import get_device, prepare_model, prepare_data_loader

def train_func(config):
    model = build_model(config)
    model = model.to(get_device())
    model = prepare_model(model)

    train_loader = build_dataloader(config)
    train_loader = prepare_data_loader(train_loader)

    optimizer = torch.optim.Adam(model.parameters(), lr=config["lr"])

    for epoch in range(config["epochs"]):
        running_loss = 0.0
        for batch in train_loader:
            inputs, targets = batch
            inputs = inputs.to(get_device())
            targets = targets.to(get_device())

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = torch.nn.functional.cross_entropy(outputs, targets)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()

        ray.train.report({"loss": running_loss / len(train_loader), "epoch": epoch})
```

Key calls inside the function:

- `get_device()` returns the CUDA device assigned to this worker.
- `prepare_model(model)` handles DDP wrapping.
- `prepare_data_loader(loader)` shards the data across workers so each GPU sees a disjoint subset.
- `ray.train.report(metrics)` surfaces metrics to the driver process for logging and checkpoint decisions.

## Scaling config

```python
scaling_config = ScalingConfig(
    num_workers=4,
    use_gpu=True,
    resources_per_worker={"GPU": 1, "CPU": 4},
)

trainer = TorchTrainer(
    train_loop_per_worker=train_func,
    train_loop_config={"lr": 1e-3, "epochs": 20},
    scaling_config=scaling_config,
)

result = trainer.fit()
```

`num_workers=4` requests 4 workers, each with 1 GPU. `resources_per_worker={"GPU": 1, "CPU": 4}` allocates CPUs for data loading alongside each GPU. If the cluster has fewer resources than requested, Ray queues the job until resources free up.

## PyTorch Lightning integration

Ray Train provides first-class Lightning support via `RayLightningEnvironment` and `RayDDPStrategy`.

```python
from ray.train.lightning import (
    RayDDPStrategy,
    RayLightningEnvironment,
    prepare_trainer,
)
import lightning.pytorch as pl

def train_func(config):
    model = MyLightningModule(config)
    datamodule = MyDataModule(config)

    trainer = pl.Trainer(
        max_epochs=config["epochs"],
        strategy=RayDDPStrategy(),
        plugins=[RayLightningEnvironment()],
        accelerator="auto",
        devices="auto",
    )
    trainer = prepare_trainer(trainer)
    trainer.fit(model, datamodule=datamodule)
```

`RayDDPStrategy` sets up the process group. `RayLightningEnvironment` provides the correct rank and world-size to Lightning. This lets you keep existing Lightning modules unchanged while gaining Ray's cluster management and fault tolerance. The model code, loss function, and optimizer configuration remain exactly as they were in single-node Lightning training.

## Checkpoint saving and restoring

```python
from ray.train import Checkpoint

ray.train.report(
    {"val_loss": val_loss, "epoch": epoch},
    checkpoint=Checkpoint.from_dict({
        "model": model.state_dict(),
        "optimizer": optimizer.state_dict(),
        "epoch": epoch,
    }),
)
```

The checkpoint is stored in Ray's persistent storage (local filesystem or S3). To restore a previous run:

```python
trainer = TorchTrainer.restore("s3://bucket/checkpoints/experiment/")
result = trainer.fit()
```

Configure automatic checkpoint management to keep only the best checkpoints:

```python
from ray.train import CheckpointConfig, RunConfig

run_config = RunConfig(
    checkpoint_config=CheckpointConfig(
        num_to_keep=3,
        checkpoint_score_attribute="val_loss",
        checkpoint_score_order="min",
    ),
)
```

This retains only the 3 checkpoints with the lowest `val_loss`, deleting older ones to save storage.

## Fault tolerance

```python
from ray.train import FailureConfig, RunConfig

run_config = RunConfig(
    failure_config=FailureConfig(max_failures=2),
)
```

`max_failures=2` tells Ray Train to restart failed workers up to 2 times before declaring the run failed. On restart, training resumes from the last saved checkpoint. This is essential for spot or preemptible instance training where GPU nodes can be reclaimed by the cloud provider mid-run.

Without fault tolerance, a single preempted node after 10 hours of training means 10 hours of lost work. With checkpoints saved every epoch and `max_failures` configured, the worst case is losing the work since the last checkpoint.

## Monitoring via Ray Dashboard

`http://localhost:8265` (or the Ray head node address on a cluster) shows per-worker GPU utilisation, task timeline, and live training metrics reported via `ray.train.report`.

Use the dashboard to diagnose:

- **Worker stragglers.** One worker taking significantly longer per step than others indicates a data loading bottleneck or heterogeneous hardware. The timeline view shows per-worker step durations side by side.
- **Idle GPU time.** Gaps between training steps mean the data pipeline is not keeping up. Increase `resources_per_worker` CPU count or add prefetching in the data loader.
- **Memory pressure.** The per-node memory view reveals whether workers are close to OOM. If memory usage climbs steadily across epochs, there is likely a memory leak in the training loop (common culprits: appending tensors to a list without detaching, or not calling `.item()` on scalar losses before logging).
