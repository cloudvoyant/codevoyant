# Observability with TensorBoard and Lightning

## What to log and why

Loss curves catch divergence early. A training loss that spikes upward means the learning rate is too high. A training loss that decreases while validation loss increases means overfitting. Both are immediately visible in a loss curve, invisible in a final accuracy number. Without loss curves, you wait until evaluation after training completes to discover problems that were detectable in the first 100 steps.

Gradient norms catch vanishing and exploding gradients. `torch.nn.utils.clip_grad_norm_` returns the pre-clipped norm. Logging this over time reveals instability before it crashes training. A steady increase in gradient norm across steps signals an approaching explosion. A gradient norm that drops to near-zero signals vanishing gradients and a model that has stopped learning.

Weight histograms catch dead neurons. A ReLU layer where the weight histogram collapses to near-zero across all neurons has stopped learning. Logging histograms every N steps reveals this. This is particularly useful for deep networks where a single dead layer can silently block gradient flow to all earlier layers.

Sample images catch data pipeline bugs. Logging a batch of training images in the first step confirms augmentations are applied correctly. This is a surprisingly common source of silent bugs: images normalized twice, channels in the wrong order, crops that cut out the object of interest. One logged batch at step zero catches these before an entire training run is wasted.

## TensorBoard basics

The core API is the `SummaryWriter`:

```python
from torch.utils.tensorboard import SummaryWriter

writer = SummaryWriter(log_dir="runs/experiment_1")
```

**Scalars.** `writer.add_scalar("train/loss", loss.item(), global_step)` logs a single scalar value. The tag string uses `/` for grouping in the TensorBoard UI, so `train/loss` and `train/accuracy` appear under the same `train` group.

**Images.** `writer.add_image("train/batch", grid, global_step)` where `grid` is a `(C, H, W)` tensor. Use `torchvision.utils.make_grid` to combine a batch of images into a single grid:

```python
from torchvision.utils import make_grid

grid = make_grid(batch_images, nrow=8, normalize=True)
writer.add_image("train/batch", grid, global_step)
```

**Histograms.** `writer.add_histogram("weights/layer1", model.layer1.weight, global_step)` records the distribution of parameter values. This is expensive to compute. Log every 100 steps, not every step.

**Embeddings.** `writer.add_embedding(features, metadata=labels, global_step=global_step)` renders a t-SNE or UMAP projection of high-dimensional features in the Projector tab. Useful for verifying that learned representations separate classes before training completes.

**Running TensorBoard.** Start the server and open the UI:

```bash
tensorboard --logdir runs/
# Open http://localhost:6006
```

## Lightning TensorBoard logger

Lightning provides a built-in TensorBoard logger that wraps the `SummaryWriter`:

```python
from lightning.pytorch.loggers import TensorBoardLogger

logger = TensorBoardLogger(save_dir="logs/", name="experiment")
trainer = Trainer(logger=logger)
```

**Automatic metric logging.** Any value passed to `self.log("val_loss", val_loss)` inside a LightningModule method is automatically written to TensorBoard at the correct global step. No manual step tracking required.

**Custom logging in `training_step`.** Access the raw `SummaryWriter` through `self.logger.experiment`:

```python
def training_step(self, batch, batch_idx):
    loss = self.compute_loss(batch)
    self.log("train/loss", loss)

    # Custom histogram logging
    self.logger.experiment.add_histogram(
        "gradients/layer1",
        self.layer1.weight.grad,
        self.global_step,
    )
    return loss
```

`self.logger.experiment` exposes the raw `SummaryWriter`, so any TensorBoard API call is available inside a LightningModule.

## Comparing runs

Run multiple experiments with different hyperparameters, each into a subdirectory:

```python
logger = TensorBoardLogger(
    save_dir="logs/",
    name="lr_sweep",
    version="lr_1e-3",
)
```

Start TensorBoard pointing at the parent directory:

```bash
tensorboard --logdir logs/lr_sweep/
```

The sidebar shows all versions simultaneously with different colours. Each run's metrics overlay on the same chart, making it straightforward to compare convergence speed and final performance.

**Non-default port.** When running multiple TensorBoard servers, use the `--port` flag:

```bash
tensorboard --logdir logs/ --port 6007
```

**Filtering by tag.** Use the search box in the TensorBoard UI to show only matching metric names. This is useful when experiments log dozens of metrics and you need to focus on a specific one.

## Profiling with TensorBoard

PyTorch's built-in profiler integrates directly with TensorBoard:

```python
with torch.profiler.profile(
    activities=[
        torch.profiler.ProfilerActivity.CPU,
        torch.profiler.ProfilerActivity.CUDA,
    ],
    on_trace_ready=torch.profiler.tensorboard_trace_handler("logs/profiler"),
    record_shapes=True,
    profile_memory=True,
) as prof:
    for step, batch in enumerate(dataloader):
        if step >= 10:
            break
        train_step(model, batch)
        prof.step()
```

The trace timeline in the TensorBoard Profiler tab shows the duration of each CUDA kernel, CPU-GPU transfer, and Python overhead.

**Identifying GPU idle time.** Gaps between CUDA kernels indicate data loading is the bottleneck. The fix is to increase `DataLoader` workers or switch to Ray Data streaming for pipelined prefetching.

**Identifying memory-bound kernels.** Kernels with low compute-to-memory ratio benefit from operator fusion or mixed precision. The profiler's memory view shows peak memory allocation over time, revealing where OOM risks are highest.
