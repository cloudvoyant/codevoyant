# Model Publishing

## Why export format matters

A PyTorch `.pt` checkpoint requires PyTorch to load, pins you to a specific Python and CUDA version, and cannot be deployed to a mobile device or a C++ inference server without additional work. The checkpoint is tied to the exact class definition used during training, so any code refactor breaks loading.

ONNX is a runtime-agnostic interchange format that can be executed by ONNX Runtime on CPU, CUDA, TensorRT, CoreML, or DirectML with no PyTorch dependency. A single ONNX file can serve inference on a cloud GPU, a laptop CPU, and an iOS device.

TorchScript compiles the model to a portable IR that can be loaded in C++ via `libtorch`. This is the path for embedding models into C++ applications, game engines, or edge devices where Python is not available.

Choosing the right export format at publish time determines which inference environments the model can serve.

## Saving PyTorch checkpoints

**`state_dict` vs full model save.** Always prefer `torch.save(model.state_dict(), "model.pt")`. Full model save with `torch.save(model, "model.pt")` pickles the class definition and breaks when the code changes. A refactored class with a renamed layer will fail to unpickle.

**What to include in the checkpoint dict:**

```python
torch.save(
    {
        "model_state": model.state_dict(),
        "optimizer_state": optimizer.state_dict(),
        "epoch": epoch,
        "val_loss": best_val_loss,
        "config": model_config,
    },
    "checkpoint.pt",
)
```

The config dict (hyperparameters and architecture choices) is essential. A model without its config is unloadable after a code refactor. The optimizer state is needed for resuming training. The epoch and val_loss are needed for selecting the best checkpoint.

**Loading back:**

```python
checkpoint = torch.load("checkpoint.pt", weights_only=True)
model = build_model(checkpoint["config"])
model.load_state_dict(checkpoint["model_state"])
```

## Exporting to ONNX

Export a trained model to ONNX format:

```python
dummy_input = torch.randn(1, 3, 224, 224)

torch.onnx.export(
    model,
    dummy_input,
    "model.onnx",
    opset_version=17,
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={
        "input": {0: "batch_size"},
        "output": {0: "batch_size"},
    },
)
```

`opset_version=17` is the current stable opset as of 2026. Prefer the latest opset unless a target runtime requires an older one. Higher opset versions support more operators and produce more efficient graphs.

`dynamic_axes` is required for variable batch size inference. Without it, the exported model only accepts the exact batch size used during export, which is almost never what you want in production.

**Verifying with ONNX Runtime:**

```python
import numpy as np
import onnxruntime as ort

sess = ort.InferenceSession("model.onnx")
dummy_numpy = dummy_input.numpy()
outputs = sess.run(None, {"input": dummy_numpy})

# Compare to PyTorch outputs
torch_out = model(dummy_input).detach().numpy()
diff = np.abs(outputs[0] - torch_out).max()
print(f"Max absolute difference: {diff:.2e}")
# A relative difference below 1e-5 is acceptable
```

Always verify after export. Silent numerical differences above 1e-5 indicate an operator was approximated or a custom layer was not exported correctly.

## TorchScript

`torch.jit.script(model)` traces the model through the Python compiler and produces a `ScriptModule` with an explicit IR:

```python
scripted = torch.jit.script(model)
scripted.save("model_scripted.pt")
```

**`script` vs `trace`.** Use `script` over `trace` when the model contains data-dependent control flow (if/else on tensor values, dynamic loop lengths). `torch.jit.trace` only records the execution path taken for the specific input given at trace time and silently produces wrong results on other paths. This is a common source of silent bugs in production.

**When tracing is appropriate.** Models with no control flow (pure feed-forward networks, standard CNNs) can use `torch.jit.trace(model, example_input)` safely. Tracing produces a cleaner graph and can be faster than scripting for simple models.

**When scripting fails.** If `torch.jit.script` raises an error about unsupported Python syntax, annotate problematic methods with `@torch.jit.ignore` to exclude them from the compiled graph. This is a tradeoff: ignored methods run in Python and are not portable to C++.

**Loading in C++:**

```cpp
#include <torch/script.h>

torch::jit::script::Module module = torch::jit::load("model_scripted.pt");
std::vector<torch::jit::IValue> inputs;
inputs.push_back(torch::ones({1, 3, 224, 224}));
auto output = module.forward(inputs).toTensor();
```

This requires linking against `libtorch`. The C++ API mirrors the Python API closely, so inference code translates directly.

## Publishing to MLflow model registry

Register a trained model with its dependencies:

```python
import mlflow

with mlflow.start_run():
    mlflow.pytorch.log_model(
        model,
        artifact_path="model",
        registered_model_name="fraud-detector",
        pip_requirements=[
            "torch==2.3.0",
            "torchvision==0.18.0",
        ],
    )
```

The `pip_requirements` list is embedded in the MLflow model artifact and used by `mlflow models serve` to reconstruct the environment. Specifying exact versions ensures the serving environment matches training.

**Loading from the registry:**

```python
model = mlflow.pytorch.load_model("models:/fraud-detector/Production")
```

This fetches the Production-stage version from the registry, downloads the artifact, and returns a loaded PyTorch model ready for inference.

## Serving with Ray Serve

For GPU-accelerated serving with horizontal scaling:

```python
from ray import serve
import mlflow
import torch

@serve.deployment(num_replicas=2, ray_actor_options={"num_gpus": 1})
class ModelDeployment:
    def __init__(self):
        self.model = mlflow.pytorch.load_model(
            "models:/fraud-detector/Production"
        ).cuda()
        self.model.eval()

    async def __call__(self, request):
        data = await request.json()
        tensor = torch.tensor(data["input"]).cuda()
        with torch.no_grad():
            prediction = self.model(tensor).cpu().tolist()
        return {"prediction": prediction}

app = ModelDeployment.bind()
serve.run(app)
```

`num_replicas` scales horizontally across multiple GPUs. Each replica gets one GPU as specified by `ray_actor_options`. Ray Serve handles HTTP routing, health checks, and rolling updates.

**Calling from another Ray task:**

```python
handle = serve.get_deployment_handle("ModelDeployment")
result = await handle.predict.remote(input_data)
```

This calls the deployment asynchronously, useful for composing multiple model calls in a pipeline.

## FastAPI wrapper pattern

For simpler deployments that do not require a full Ray cluster:

```python
from contextlib import asynccontextmanager

import torch
from fastapi import FastAPI
from pydantic import BaseModel

class PredictRequest(BaseModel):
    input: list[float]

class PredictResponse(BaseModel):
    prediction: float

ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    checkpoint = torch.load("model.pt", weights_only=True)
    ml_models["model"] = build_model(checkpoint["config"])
    ml_models["model"].load_state_dict(checkpoint["model_state"])
    ml_models["model"].eval()
    yield
    ml_models.clear()

app = FastAPI(lifespan=lifespan)

@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    tensor = torch.tensor(req.input).unsqueeze(0)
    with torch.no_grad():
        output = ml_models["model"](tensor)
    return PredictResponse(prediction=output.item())
```

**Running with multiple workers:**

```bash
uvicorn app:app --workers 4
```

Each worker process loads its own model copy. This works well on multi-core CPU machines. When GPU memory is the constraint, use Ray Serve instead, which shares GPU memory across requests within a single replica process.
