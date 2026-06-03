# Serving Open-Weight Models on GCP

## When to use GCP for model serving

GCP offers three deployment paths for open-weight LLMs, each at a different abstraction level:

**Vertex AI Model Garden** provides one-click deployment for popular open models (Llama, Gemma, Mistral). If your model is in the Garden, Vertex AI handles provisioning, scaling, and monitoring. This is the fastest path to production if the model and configuration options meet your needs.

**Cloud Run with GPU** gives you serverless GPU inference that scales to zero. Ideal for low-traffic or bursty workloads where you want to avoid paying for idle GPUs. You bring a container with vLLM and your model; Cloud Run handles the rest.

**Compute Engine with vLLM** gives you full control over the instance, GPU, networking, and serving configuration. This is the equivalent of running on EC2 -- you manage everything, but you have maximum flexibility.

GCP is a strong choice when your data pipeline is already on GCP (BigQuery, Cloud Storage, Dataflow), because Vertex AI integrates natively with those services. Cross-cloud model serving adds network latency and data transfer costs.

## GPU instance selection on GCP

Match model size to accelerator type and count.

### 7B parameters (Llama 3.1 8B, Mistral 7B, Gemma 7B)

`g2-standard-4` with 1x L4 (24GB VRAM). The L4 is GCP's most cost-effective GPU for inference workloads. Fits FP16 with room for KV cache.

### 13B parameters

`g2-standard-12` with 1x L4 and 4-bit quantization (AWQ or GPTQ). For FP16, use `a2-highgpu-1g` (1x A100 40GB).

### 70B parameters (Llama 3.1 70B)

`a2-highgpu-4g` (4x A100 40GB) with tensor parallelism. For the best inter-GPU bandwidth, use `a3-highgpu-8g` (8x H100 80GB) -- the NVLink interconnect reduces tensor parallelism overhead.

### 405B parameters

`a3-megagpu-8g` (8x H100 80GB, 640GB total VRAM) with NVLink. This is the minimum viable configuration for FP16 inference of the largest open models.

### Cost comparison

| Machine Type | GPUs | On-Demand ($/hr) | Spot ($/hr est.) |
|---|---|---|---|
| g2-standard-4 | 1x L4 | ~$0.84 | ~$0.25-0.34 |
| g2-standard-48 | 8x L4 | ~$6.69 | ~$2.00-2.70 |
| a2-highgpu-1g | 1x A100 40GB | ~$3.67 | ~$1.10-1.47 |
| a2-highgpu-4g | 4x A100 40GB | ~$14.69 | ~$4.40-5.87 |
| a3-highgpu-8g | 8x H100 80GB | ~$98.32 | ~$29.50-39.30 |

Preemptible/spot VMs offer 60-91% discounts. They can be preempted at any time with 30 seconds notice (shorter than AWS). Use for batch inference, not user-facing APIs without a fallback.

## Vertex AI Model Garden

Model Garden provides one-click deployment for supported models with managed infrastructure.

### Console deployment

Browse to `console.cloud.google.com/vertex-ai/model-garden`, find your model (Llama 3.1, Gemma 2, Mistral), and click "Deploy". Select your machine type and accelerator, then deploy. Vertex AI provisions the infrastructure, loads the model, and creates an endpoint.

### Programmatic deployment

```python
from google.cloud import aiplatform

aiplatform.init(project="your-project", location="us-central1")

# Deploy a model from the Model Garden
model = aiplatform.Model(
    model_name="publishers/meta/models/llama-3.1-8b-instruct"
)

endpoint = model.deploy(
    machine_type="g2-standard-4",
    accelerator_type="NVIDIA_L4",
    accelerator_count=1,
    deploy_request_timeout=1800,  # 30 min timeout for large model loading
)
```

### Prediction

```python
response = endpoint.predict(
    instances=[{
        "prompt": "Explain the CAP theorem in distributed systems.",
        "max_tokens": 256,
        "temperature": 0.7,
    }]
)

print(response.predictions[0])
```

### Tradeoffs

**Advantages:** managed scaling, monitoring, no infrastructure to maintain, integration with Vertex AI Pipelines and Model Registry, IAM-based access control.

**Disadvantages:** limited model configuration (you cannot set arbitrary vLLM flags), higher cost per token than self-managed (Vertex AI adds a per-prediction surcharge on top of compute costs), and deploying models not in the Garden requires a custom container.

## Cloud Run with vLLM

Cloud Run supports GPU workloads with L4 accelerators, providing serverless inference that scales to zero.

### Dockerfile

```dockerfile
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y python3 python3-pip && \
    pip3 install vllm

# Copy model weights (or download at startup)
COPY model/ /model/

ENV NVIDIA_VISIBLE_DEVICES=all

CMD ["python3", "-m", "vllm.entrypoints.openai.api_server", \
     "--model", "/model", \
     "--port", "8080", \
     "--max-model-len", "4096"]
```

### Deploy

```bash
# Build and push to Artifact Registry
gcloud builds submit --tag gcr.io/your-project/vllm-llama .

# Deploy with GPU
gcloud run deploy llm-service \
  --image gcr.io/your-project/vllm-llama \
  --gpu 1 \
  --gpu-type nvidia-l4 \
  --memory 24Gi \
  --cpu 4 \
  --port 8080 \
  --region us-central1 \
  --min-instances 0 \
  --max-instances 5 \
  --timeout 300
```

### Cold start considerations

GPU allocation on Cloud Run takes 30-60 seconds. For user-facing workloads, set `--min-instances 1` to keep one instance warm. This eliminates cold start for the first concurrent request but costs more because you pay for the idle instance.

For batch workloads and internal tools, `--min-instances 0` is ideal -- the 30-60 second cold start is acceptable, and you pay nothing when idle.

### Cost advantage

Cloud Run bills per request-second with GPU. If your service handles 100 requests/day at 5 seconds each, you pay for roughly 8 minutes of GPU time per day. On a dedicated `g2-standard-4` instance, you would pay 24 hours. The economics favor Cloud Run for anything below roughly 50% sustained GPU utilization.

## Compute Engine with vLLM

For full control, deploy vLLM on a Compute Engine instance. This follows the same pattern as EC2 deployment.

### Create a GPU instance

```bash
gcloud compute instances create llm-server \
  --machine-type=g2-standard-4 \
  --accelerator=type=nvidia-l4,count=1 \
  --boot-disk-size=200GB \
  --image-family=common-cu121-debian-11 \
  --image-project=deeplearning-platform-release \
  --zone=us-central1-a \
  --maintenance-policy=TERMINATE
```

The `--maintenance-policy=TERMINATE` flag is required for GPU instances. GCP will terminate (not live-migrate) the instance during host maintenance events.

### Install and run vLLM

```bash
pip install vllm
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3.1-8B-Instruct \
  --host 0.0.0.0 --port 8000
```

### Model storage

Download from Cloud Storage to the local disk:

```bash
gsutil -m cp -r gs://your-bucket/models/llama-3.1-8b /opt/model
```

Use SSD Persistent Disk for model storage. Standard PD has insufficient IOPS for fast model loading -- a 70B model can take 10+ minutes to load from standard PD versus 2-3 minutes from SSD PD. Local SSD (attached NVMe) is even faster but ephemeral.

### Load balancer setup

Use a regional HTTPS Load Balancer with health checks against the vLLM `/health` endpoint:

```bash
# Create health check
gcloud compute health-checks create http vllm-health \
  --port=8000 \
  --request-path=/health \
  --check-interval=10s \
  --healthy-threshold=2 \
  --unhealthy-threshold=3

# Create backend service
gcloud compute backend-services create vllm-backend \
  --protocol=HTTP \
  --port-name=vllm \
  --health-checks=vllm-health \
  --region=us-central1
```

### Managed Instance Group with auto-scaling

Create an instance template with a vLLM startup script, then create a Managed Instance Group (MIG) that auto-scales based on GPU utilization:

```bash
# Create instance template
gcloud compute instance-templates create vllm-template \
  --machine-type=g2-standard-4 \
  --accelerator=type=nvidia-l4,count=1 \
  --boot-disk-size=200GB \
  --image-family=common-cu121-debian-11 \
  --image-project=deeplearning-platform-release \
  --metadata=startup-script='#!/bin/bash
pip install vllm
gsutil -m cp -r gs://your-bucket/models/llama-3.1-8b /opt/model
python -m vllm.entrypoints.openai.api_server --model /opt/model --host 0.0.0.0 --port 8000'

# Create MIG
gcloud compute instance-groups managed create vllm-mig \
  --base-instance-name=vllm \
  --template=vllm-template \
  --size=1 \
  --zone=us-central1-a

# Auto-scale based on GPU utilization (requires custom Cloud Monitoring metric)
gcloud compute instance-groups managed set-autoscaling vllm-mig \
  --zone=us-central1-a \
  --min-num-replicas=1 \
  --max-num-replicas=4 \
  --target-cpu-utilization=0.7 \
  --cool-down-period=300
```

For GPU-based auto-scaling, export GPU utilization as a custom Cloud Monitoring metric (using the NVIDIA DCGM exporter or a simple script that polls `nvidia-smi`) and configure the autoscaler to target that metric.

## Gotchas

**GPU quota.** GPU quota on GCP is per-region and per-accelerator type. New accounts have zero GPU quota by default. Request quota increases via the Quotas page in the Cloud Console. Approval can take 1-3 business days. Plan ahead -- do not wait until the day you need to deploy.

**Cloud Run GPU availability.** GPU support on Cloud Run is limited to L4 accelerators and specific regions (us-central1, europe-west4, asia-southeast1 as of early 2025). Check the documentation for current region availability before planning your architecture.

**Vertex AI Model Garden pricing.** Deployment cost equals compute cost plus a per-prediction surcharge. At high volume (millions of predictions), the surcharge can exceed the compute cost. Compare total cost against self-managed Compute Engine for your expected volume.

**Persistent Disk IOPS.** Standard PD maxes out at 3,000 read IOPS. This is too slow for loading large model files. Use SSD PD (up to 100,000 read IOPS) or Local SSD for model storage. The cost difference is small relative to GPU costs.

**IAM for model access.** Vertex AI endpoints require the `roles/aiplatform.user` role on the calling service account. Compute Engine instances need a service account with `roles/storage.objectViewer` for reading model artifacts from Cloud Storage. Missing IAM permissions produce opaque "permission denied" errors that do not mention which permission is missing.

**Maintenance events.** GPU instances cannot be live-migrated. When GCP schedules host maintenance, your instance will be terminated. Use a Managed Instance Group to automatically recreate terminated instances, and configure your load balancer health checks to route around unavailable instances.

**Container image size.** vLLM plus model weights can produce container images over 30GB. Cloud Build has a default timeout of 10 minutes, which is insufficient for large builds. Set `--timeout=3600` on `gcloud builds submit`. Alternatively, download model weights at container startup rather than baking them into the image.
