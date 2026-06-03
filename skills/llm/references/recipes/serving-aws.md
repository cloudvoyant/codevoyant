# Serving Open-Weight Models on AWS

## Why self-host

API providers (Anthropic, OpenAI) are the simplest path to LLM inference. You send a request, get a response, and pay per token with zero infrastructure to manage. Self-hosting open-weight models makes sense in specific scenarios:

**Data cannot leave your VPC.** Compliance requirements (HIPAA, SOC 2, financial regulations) may prohibit sending data to third-party APIs. Running a model inside your VPC keeps all data in your network boundary.

**Predictable per-token cost at high volume.** API pricing is per-token; at scale (more than 1M tokens/day sustained), a dedicated GPU instance amortizes to a lower per-token cost. The break-even depends on your traffic pattern -- bursty workloads favor API providers, steady-state workloads favor self-hosting.

**Custom or fine-tuned models.** If you have fine-tuned Llama, Mistral, or Qwen on your domain data, you need to host it yourself. API providers serve their own models, not yours.

**Models not available via API.** Newer open-weight releases (Qwen 2.5, DeepSeek, specialized coding models) may not be available through any API provider.

The tradeoff is real: you own the infrastructure, GPU provisioning, scaling, model updates, and operational monitoring. Budget for at least one engineer's partial time on inference infrastructure.

## GPU instance selection on AWS

Match model size to GPU memory. The rule of thumb: FP16 (full precision) requires roughly 2x the parameter count in GB of VRAM (7B parameters needs around 14GB). Quantized models (4-bit) need roughly 0.5x the parameter count in GB.

### 7B parameters (Llama 3.1 8B, Mistral 7B)

`g5.xlarge` with 1x A10G (24GB VRAM). Fits FP16 with room for KV cache. This is the workhorse instance for small models. On-demand price is approximately $1.01/hr.

### 13B parameters

`g5.2xlarge` (1x A10G) with 4-bit quantization (AWQ or GPTQ) fits in 24GB. For FP16, use `g5.12xlarge` (4x A10G) with tensor parallelism (`--tensor-parallel-size 4`).

### 70B parameters (Llama 3.1 70B)

`p4d.24xlarge` (8x A100 40GB) for FP16 with tensor parallelism. Alternatively, `g5.48xlarge` (8x A10G, 192GB total VRAM) with 4-bit quantization. The p4d has NVLink for faster inter-GPU communication, which matters for tensor parallelism latency.

### 405B parameters

`p5.48xlarge` (8x H100 80GB, 640GB total VRAM) is the minimum viable configuration for FP16. This is an expensive instance -- plan for reserved pricing or committed use discounts.

### Cost comparison

| Instance | GPUs | On-Demand ($/hr) | Spot ($/hr est.) | Reserved 1yr ($/hr) |
|---|---|---|---|---|
| g5.xlarge | 1x A10G | ~$1.01 | ~$0.30-0.40 | ~$0.63 |
| g5.12xlarge | 4x A10G | ~$5.67 | ~$1.70-2.30 | ~$3.54 |
| g5.48xlarge | 8x A10G | ~$16.29 | ~$4.90-6.50 | ~$10.17 |
| p4d.24xlarge | 8x A100 | ~$32.77 | ~$9.80-13.10 | ~$19.22 |
| p5.48xlarge | 8x H100 | ~$98.32 | ~$29.50-39.30 | ~$63.65 |

Spot instances are 60-90% cheaper but can be reclaimed with 2 minutes notice. Acceptable for batch inference; risky for user-facing APIs without a fallback fleet.

## vLLM on EC2

vLLM is the standard open-source serving engine. It provides PagedAttention for efficient KV cache management, continuous batching for high throughput, and an OpenAI-compatible API endpoint out of the box.

### Basic launch

Install and start serving a model:

```bash
pip install vllm
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3.1-8B-Instruct \
  --host 0.0.0.0 \
  --port 8000
```

### Key configuration flags

- `--tensor-parallel-size N` -- distribute model across N GPUs. Must match the actual GPU count on the instance.
- `--max-model-len 8192` -- cap context length. Reduces VRAM usage for the KV cache. Set this to the maximum context length you actually need, not the model's full capacity.
- `--gpu-memory-utilization 0.9` -- fraction of GPU memory vLLM will use (default 0.9). Reduce if you hit OOM errors.
- `--quantization awq` or `--quantization gptq` -- enable quantized inference for pre-quantized models.
- `--dtype half` -- use FP16 (default for most models). Use `--dtype bfloat16` for models trained in BF16.
- `--max-num-batched-tokens` -- controls continuous batching. Higher values increase throughput at the cost of latency.

### Docker deployment

```bash
docker run --gpus all -p 8000:8000 \
  vllm/vllm-openai \
  --model meta-llama/Llama-3.1-8B-Instruct
```

### Health check and inference

```bash
# Health check
curl http://localhost:8000/health

# Chat completion (OpenAI-compatible)
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-3.1-8B-Instruct",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Model loading from S3

Download model weights to instance storage first, then point vLLM to the local path:

```bash
aws s3 sync s3://your-bucket/models/llama-3.1-8b /opt/model
python -m vllm.entrypoints.openai.api_server \
  --model /opt/model \
  --host 0.0.0.0 --port 8000
```

EBS gp3 volumes are fine for model storage. Instance store NVMe (available on `g5` and `p4d` instances) is faster for initial model loading -- useful for large models where loading time matters.

## SageMaker endpoints

SageMaker provides managed deployment with auto-scaling, monitoring, and A/B testing. The tradeoff is higher cost per GPU-hour and less control over the serving configuration.

### Deployment pattern

Use the HuggingFace LLM container or build a custom container with vLLM:

```python
import sagemaker
from sagemaker.huggingface import HuggingFaceModel

role = sagemaker.get_execution_role()

hub = {
    "HF_MODEL_ID": "meta-llama/Llama-3.1-8B-Instruct",
    "SM_NUM_GPUS": "1",
    "HF_TOKEN": "<your-hf-token>",
}

model = HuggingFaceModel(
    image_uri=f"763104351884.dkr.ecr.us-east-1.amazonaws.com/huggingface-pytorch-tgi-inference:2.1.1-tgi1.4.0-gpu-py310-cu121-ubuntu20.04",
    env=hub,
    role=role,
)

endpoint = model.deploy(
    initial_instance_count=1,
    instance_type="ml.g5.xlarge",
    container_startup_health_check_timeout=600,  # Large models need time to load
)
```

### Auto-scaling

Configure target tracking on `InvocationsPerInstance` or custom CloudWatch metrics:

```python
import boto3

client = boto3.client("application-autoscaling")

client.register_scalable_target(
    ServiceNamespace="sagemaker",
    ResourceId=f"endpoint/{endpoint_name}/variant/AllTraffic",
    ScalableDimension="sagemaker:variant:DesiredInstanceCount",
    MinCapacity=1,
    MaxCapacity=4,
)

client.put_scaling_policy(
    PolicyName="gpu-utilization-scaling",
    ServiceNamespace="sagemaker",
    ResourceId=f"endpoint/{endpoint_name}/variant/AllTraffic",
    ScalableDimension="sagemaker:variant:DesiredInstanceCount",
    PolicyType="TargetTrackingScaling",
    TargetTrackingScalingPolicyConfiguration={
        "TargetValue": 70.0,  # Target 70% GPU utilization
        "CustomizedMetricSpecification": {
            "MetricName": "GPUUtilization",
            "Namespace": "/aws/sagemaker/Endpoints",
            "Statistic": "Average",
        },
        "ScaleInCooldown": 300,
        "ScaleOutCooldown": 60,
    },
)
```

### Tradeoffs

**Advantages:** managed infrastructure, auto-scaling, A/B testing with production variants, built-in monitoring via CloudWatch, model registry integration.

**Disadvantages:** higher cost per GPU-hour than raw EC2 (SageMaker adds a surcharge), cold start times of 5-15 minutes for large models, less control over vLLM configuration, and debugging is harder because you cannot SSH into the container.

## Spot instance patterns

For batch inference and cost-sensitive real-time serving, spot instances cut GPU costs by 60-90%.

### Spot Fleet with mixed instance types

Request a fleet across instance types and let AWS pick the cheapest available:

```python
import boto3

ec2 = boto3.client("ec2")

response = ec2.request_spot_fleet(
    SpotFleetRequestConfig={
        "IamFleetRole": "arn:aws:iam::role/aws-ec2-spot-fleet-role",
        "TargetCapacity": 4,
        "LaunchSpecifications": [
            {
                "ImageId": "ami-deeplearning-base",
                "InstanceType": "g5.xlarge",
                "WeightedCapacity": 1,
            },
            {
                "ImageId": "ami-deeplearning-base",
                "InstanceType": "g5.2xlarge",
                "WeightedCapacity": 1,
            },
        ],
        "AllocationStrategy": "capacityOptimized",
    }
)
```

### Interruption handling

Register a handler that polls the instance metadata endpoint for interruption notices:

```bash
#!/bin/bash
# spot-interruption-handler.sh -- run as a background process
while true; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    http://169.254.169.254/latest/meta-data/spot/instance-action)
  if [ "$RESPONSE" == "200" ]; then
    echo "Spot interruption detected, draining..."
    # Deregister from ALB target group
    aws elbv2 deregister-targets \
      --target-group-arn "$TARGET_GROUP_ARN" \
      --targets Id=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
    # Wait for in-flight requests to complete (vLLM graceful shutdown)
    kill -SIGTERM $(pgrep -f vllm)
    sleep 30
    break
  fi
  sleep 5
done
```

The 2-minute warning is enough to finish most LLM requests (even long generations rarely exceed 60 seconds) but not enough to save a model checkpoint.

### Fallback strategy

Keep a small on-demand fleet as fallback for when spot capacity is unavailable. Route via ALB with health-check-based failover -- if all spot instances become unhealthy (deregistered during interruption), the ALB automatically routes to the on-demand targets.

## Quantization

Reducing model size enables deployment on cheaper GPU instances with faster inference.

### GPTQ

Post-training quantization to 4-bit. Models are available pre-quantized on HuggingFace -- search for the `-GPTQ` suffix (e.g., `TheBloke/Llama-2-7B-GPTQ`). vLLM supports GPTQ natively:

```bash
python -m vllm.entrypoints.openai.api_server \
  --model TheBloke/Llama-2-7B-GPTQ \
  --quantization gptq \
  --host 0.0.0.0 --port 8000
```

### AWQ

Activation-aware quantization, generally better quality than GPTQ at 4-bit. Pre-quantized models are available on HuggingFace with the `-AWQ` suffix. vLLM supports AWQ natively:

```bash
python -m vllm.entrypoints.openai.api_server \
  --model TheBloke/Llama-2-7B-AWQ \
  --quantization awq \
  --host 0.0.0.0 --port 8000
```

### GGUF (llama.cpp format)

4-bit, 5-bit, and 8-bit quantization formats designed for CPU inference or small GPU VMs. vLLM does not support GGUF -- use llama.cpp's server or Ollama instead. GGUF is ideal for local development and edge deployment, not for production GPU serving.

### Quality impact

4-bit quantization typically loses 1-3% on standard benchmarks (MMLU, HumanEval) compared to FP16. For most production applications, this degradation is acceptable. Always test on your specific use case before committing to quantization -- some tasks (structured output, code generation) are more sensitive to quantization than others.

## Networking and security

### Network topology

Deploy vLLM instances in a private subnet with no direct internet access. Expose the service via an Application Load Balancer (ALB) with TLS termination. The architecture:

```
Client -> ALB (public subnet, HTTPS) -> vLLM instances (private subnet, HTTP port 8000)
```

### Authentication

vLLM supports a basic `--api-key` flag for single-key authentication. For production, use an API Gateway in front of the ALB with a Lambda authorizer for JWT validation or API key management. This gives you rate limiting, usage tracking, and key rotation without modifying the vLLM deployment.

### Model artifact access

Use VPC endpoints for S3 to download model weights without routing through a NAT gateway. NAT gateway data transfer costs ($0.045/GB) add up quickly when downloading 140GB model files:

```bash
# Create S3 VPC endpoint (gateway type, free)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxx \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-xxx
```

## Gotchas

**CUDA driver version.** vLLM requires CUDA 12.1 or later. The AWS Deep Learning AMI (DLAMI) has this pre-installed. If you use a custom AMI, verify the CUDA version with `nvidia-smi` before installing vLLM.

**Model download on first start.** HuggingFace models download on first launch. For a 70B model, this can take 30+ minutes on a standard network connection. Pre-bake the model into your AMI, use a warm pool in your Auto Scaling Group, or pre-download to an EBS snapshot that you attach at launch.

**Tensor parallelism GPU count mismatch.** `--tensor-parallel-size` must exactly match the number of available GPUs. Setting it to 4 on a 2-GPU instance crashes with a NCCL error. Always validate with `nvidia-smi -L` before starting vLLM.

**SageMaker container timeouts.** The default health check timeout is too short for large model loading. Set `ContainerStartupHealthCheckTimeoutInSeconds` to 600 or higher when deploying models larger than 13B parameters.

**HuggingFace gated models.** Many popular models (Llama, Mistral) are gated on HuggingFace. You need to accept the license on the HuggingFace website and set `HF_TOKEN` as an environment variable before vLLM can download them.

**Memory fragmentation.** Long-running vLLM instances can experience CUDA memory fragmentation. If you see OOM errors after hours of operation despite having sufficient total memory, restart the vLLM process. Use a process manager (systemd, supervisor) to handle automatic restarts.
