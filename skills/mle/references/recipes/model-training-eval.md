# Model Training and Evaluation

## Training loop patterns in PyTorch

The standard training loop has five lines at its core:

```python
optimizer.zero_grad()
outputs = model(inputs)
loss = criterion(outputs, targets)
loss.backward()
optimizer.step()
```

**Gradient clipping** before the optimizer step prevents exploding gradients:

```python
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
```

This is especially important for RNNs and Transformers, where long dependency chains can produce gradient magnitudes that destabilize training. A `max_norm` of 1.0 is a safe default; monitor gradient norms during early training and adjust if gradients are consistently well below the threshold (the clipping is then not doing anything useful) or consistently hitting it (the model may need a lower learning rate).

**Mixed precision** with `torch.amp.autocast` wraps the forward pass in lower-precision arithmetic:

```python
scaler = torch.amp.GradScaler()

for inputs, targets in train_loader:
    optimizer.zero_grad()
    with torch.amp.autocast(device_type="cuda"):
        outputs = model(inputs)
        loss = criterion(outputs, targets)
    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
```

`GradScaler` scales the loss before `.backward()` to prevent underflow in float16 gradients, then unscales before the optimizer step. Mixed precision typically gives 1.5-2x speedup on modern NVIDIA GPUs with Tensor Cores (V100, A100, H100). The accuracy impact is negligible for most architectures because the master weights remain in float32.

## PyTorch Lightning Module

Lightning organises the training loop into three methods:

```python
import lightning.pytorch as pl

class MyModel(pl.LightningModule):
    def __init__(self, lr=1e-3):
        super().__init__()
        self.save_hyperparameters()
        self.model = build_backbone()
        self.criterion = torch.nn.CrossEntropyLoss()

    def training_step(self, batch, batch_idx):
        inputs, targets = batch
        outputs = self.model(inputs)
        loss = self.criterion(outputs, targets)
        self.log("train_loss", loss, prog_bar=True)
        return loss

    def validation_step(self, batch, batch_idx):
        inputs, targets = batch
        outputs = self.model(inputs)
        loss = self.criterion(outputs, targets)
        self.log("val_loss", loss, prog_bar=True)

    def configure_optimizers(self):
        optimizer = torch.optim.AdamW(self.parameters(), lr=self.hparams.lr)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
            optimizer, T_max=self.trainer.max_epochs
        )
        return {"optimizer": optimizer, "lr_scheduler": scheduler}
```

Why Lightning removes boilerplate without hiding the math: Lightning handles the training loop, gradient accumulation, mixed precision, and checkpoint saving. But the forward pass, loss function, and optimizer are entirely user-defined. The math is never obscured; only the scaffolding is automated. You can always override `training_step` to do anything a raw PyTorch loop can do.

## Validation strategy

**Train/val/test split discipline.** The test set is used exactly once, at the end of the project. The val set guides hyperparameter decisions and early stopping. Any metric looked at during development has contaminated the val set to some degree, which is why the held-out test set is non-negotiable. If you tune hyperparameters on the val set and then report val metrics as your final result, you have overfit to the val set.

**K-fold for small datasets.** When data is scarce, a single train/val split is noisy. K-fold cross-validation trains K models, each holding out a different fold:

```python
from sklearn.model_selection import KFold

kf = KFold(n_splits=5, shuffle=True, random_state=42)
for fold, (train_idx, val_idx) in enumerate(kf.split(X)):
    X_train, X_val = X[train_idx], X[val_idx]
    y_train, y_val = y[train_idx], y[val_idx]
    # train model, collect val metrics
```

Average the val metrics across all 5 folds. This is computationally expensive (5x training cost) but statistically robust when you have fewer than 10k examples.

**Stratified split for imbalanced classes.** `StratifiedShuffleSplit` ensures the same class distribution in every split:

```python
from sklearn.model_selection import StratifiedShuffleSplit

sss = StratifiedShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
for train_idx, val_idx in sss.split(X, y):
    X_train, X_val = X[train_idx], X[val_idx]
```

Without stratification, a 95/5 class imbalance can produce validation folds where the minority class has zero examples.

## Metrics with torchmetrics

```python
from torchmetrics.classification import Accuracy, F1Score, AUROC

acc = Accuracy(task="multiclass", num_classes=10)
f1 = F1Score(task="multiclass", num_classes=10, average="macro")
auroc = AUROC(task="multiclass", num_classes=10)
```

**Why accumulating metrics across batches matters.** A simple average of per-batch accuracy is wrong when batch sizes vary. If the last batch has 16 examples and all other batches have 64, the last batch's accuracy is weighted equally despite containing fewer examples. `torchmetrics` handles this by accumulating the numerator and denominator separately across all `update(preds, targets)` calls and computing the final metric with `.compute()`.

**Reset pattern:**

```python
metric.reset()                          # start of epoch
for batch in loader:
    preds = model(batch["x"])
    metric.update(preds, batch["y"])    # accumulate
epoch_value = metric.compute()          # end of epoch
```

**Lightning integration.** In a `LightningModule`, declare metrics as attributes and Lightning handles the device placement and distributed aggregation:

```python
def __init__(self):
    super().__init__()
    self.val_acc = Accuracy(task="multiclass", num_classes=10)

def validation_step(self, batch, batch_idx):
    preds = self.model(batch[0])
    self.val_acc.update(preds, batch[1])
    self.log("val_acc", self.val_acc, prog_bar=True)
```

`self.log` automatically calls `.compute()` at epoch end and `.reset()` at epoch start when passed a `torchmetrics.Metric` object.

## Early stopping

```python
from lightning.pytorch.callbacks import EarlyStopping

early_stopping = EarlyStopping(
    monitor="val_loss",
    patience=5,
    mode="min",
)

trainer = pl.Trainer(
    max_epochs=100,
    callbacks=[early_stopping],
)
```

The callback stops training if `val_loss` does not improve for 5 consecutive epochs. This prevents overfitting and saves GPU time. Set `patience` based on how noisy the validation metric is: stable metrics (loss averaged over thousands of examples) can use patience of 3-5; noisy metrics (BLEU on a small dev set) may need patience of 10-15.

`min_delta` controls the minimum improvement that counts as progress. `EarlyStopping(monitor="val_loss", patience=5, mode="min", min_delta=1e-4)` ignores improvements smaller than 0.0001.

## Learning rate scheduling

**Cosine annealing.** Decays the LR from the initial value to near-zero following a cosine curve:

```python
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
    optimizer, T_max=num_epochs
)
```

Widely used for image and language models. The smooth decay avoids the sudden drops of step-based schedules.

**Reduce on plateau.** Halves the LR when val_loss stops improving:

```python
scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, patience=3, factor=0.5
)
```

Less predictable than cosine annealing but adaptive. Use this when you do not know the total number of epochs in advance.

**LR finder with Lightning.** Lightning's `Tuner` runs a sweep across learning rates and suggests the optimal value:

```python
from lightning.pytorch.tuner import Tuner

tuner = Tuner(trainer)
tuner.lr_find(model, datamodule=datamodule)
```

This plots loss vs learning rate. The optimal LR is typically one order of magnitude below the point where loss starts decreasing. Run this before committing to a training run to avoid wasting compute on a poorly chosen LR.

## Evaluation checklist

Run this after training completes, on the held-out test set.

**Confusion matrix.** Reveals systematic misclassifications that aggregate accuracy hides:

```python
from sklearn.metrics import ConfusionMatrixDisplay

ConfusionMatrixDisplay.from_predictions(y_true, y_pred)
```

A model with 95% accuracy might be confusing two visually similar classes 40% of the time. The confusion matrix makes this visible. For multi-class problems with many classes, focus on the off-diagonal cells with the highest counts.

**Calibration curve.** For probabilistic classifiers, checks that a predicted probability of 0.8 is correct 80% of the time:

```python
from sklearn.calibration import CalibrationDisplay

CalibrationDisplay.from_predictions(y_true, y_prob)
```

Important for any downstream system that uses the predicted probability as a confidence score or for decision thresholds. Neural networks are often overconfident; temperature scaling is the simplest post-hoc calibration fix.

**Error analysis on worst-performing examples.** Sort the validation set by loss descending, inspect the top 50 examples manually:

```python
losses = []
for i, (x, y) in enumerate(test_dataset):
    pred = model(x.unsqueeze(0).to(device))
    loss = criterion(pred, y.unsqueeze(0).to(device))
    losses.append((i, loss.item()))

worst = sorted(losses, key=lambda t: t[1], reverse=True)[:50]
```

This reveals labeling errors, edge cases, and distribution shift more reliably than any automated metric. If the worst examples are all mislabeled, the ceiling on your metric is lower than you thought. If they cluster around a specific input pattern, targeted data augmentation or additional training data for that pattern is the fix.
