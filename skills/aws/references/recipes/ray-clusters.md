# Ray Cluster on AWS (GPU, spot autoscaling)

Hybrid pattern: **Terraform owns the head node** (long-lived EC2 instance running `ray start --head`); **Ray's autoscaler owns the GPU spot workers** (launched outside Terraform state, terminated when idle). No SSH — access is SSM-only.

This stack is **single-root, no workspaces** — a standalone GPU stack with its own `backend.tf`. Project tag `acme-ray` is load-bearing (the worker IAM policy scopes `RunInstances` to it).

## 1. Provider + AMI + variables (`provider.tf`)

```hcl
# provider.tf
terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  profile = "acme-dev"
  region  = "us-east-1"

  default_tags {
    tags = {
      project    = "acme-ray"
      managed_by = "terraform"
      owner      = var.owner_email
    }
  }
}

data "aws_caller_identity" "current" {}

# Deep Learning Base GPU AMI — Docker + NVIDIA container toolkit pre-installed
data "aws_ami" "dl_base_gpu" {
  most_recent = true
  owners      = ["amazon"]
  filter { name = "name"; values = ["Deep Learning Base OSS Nvidia Driver GPU AMI (Ubuntu 22.04)*"] }
  filter { name = "state"; values = ["available"] }
}
```

```hcl
# variables.tf
variable "owner_email"          { type = string, default = "owner@acme.example.com" }
variable "vpn_cidrs"             { type = list(string), default = [] }
variable "head_instance_type"    { type = string, default = "t3.xlarge" }
variable "worker_instance_type"  {
  type    = string
  default = "g4dn.2xlarge"
  validation {
    condition = contains([
      "g4dn.xlarge", "g4dn.2xlarge", "g4dn.4xlarge", "g4dn.8xlarge", "g4dn.12xlarge",
      "g6.xlarge",   "g6.2xlarge",   "g6.4xlarge",   "g6.8xlarge",   "g6.12xlarge",
    ], var.worker_instance_type)
    error_message = "worker_instance_type must be a GPU type available in your region."
  }
}
variable "worker_spot_price_cap"        { type = string, default = "0.20" }
variable "max_workers"                  { type = number, default = 4 }
variable "ray_worker_idle_minutes"      { type = number, default = 15 }
variable "head_idle_shutdown_hours"     { type = number, default = 4 }
variable "worker_idle_shutdown_minutes" { type = number, default = 30 }
variable "cluster_image_tag"            { type = string, default = "latest" }
```

## 2. Network — reference existing VPC, own only the SG

The module is **read-only on the VPC** — never creates/destroys VPCs, subnets, route tables, IGWs, NAT. The only network resource Terraform owns here is one security group.

```hcl
# modules/network/main.tf
data "aws_vpc" "target" {
  filter { name = "tag:Name"; values = [var.vpc_name] }
}

data "aws_subnets" "private" {
  filter { name = "vpc-id"; values = [data.aws_vpc.target.id] }
  filter { name = "tag:Name"; values = ["${var.vpc_name}-private-*"] }
}

# Sort subnets by AZ so SubnetIds[0] is deterministic — autoscaler launches into
# SubnetIds[0] with no in-launch AZ fallback. Put the best-spot-capacity AZ first.
data "aws_subnet" "private_each" {
  for_each = toset(data.aws_subnets.private.ids)
  id       = each.value
}

locals {
  private_subnets_sorted = [
    for s in sort([
      for id, sn in data.aws_subnet.private_each : "${sn.availability_zone}|${id}"
    ]) : split("|", s)[1]
  ]
}

resource "aws_security_group" "cluster" {
  name        = "acme-ray-cluster"
  description = "Ray cluster: intra-SG + SSM + optional VPN. NO 0.0.0.0/0 inbound."
  vpc_id      = data.aws_vpc.target.id

  ingress {
    description = "Intra-SG Ray ports"
    from_port = 0; to_port = 0; protocol = "-1"; self = true
  }

  dynamic "ingress" {
    for_each = length(var.vpn_cidrs) > 0 ? [1] : []
    content {
      description = "Ray dashboard from VPN"
      from_port = 8265; to_port = 8265; protocol = "tcp"; cidr_blocks = var.vpn_cidrs
    }
  }
  dynamic "ingress" {
    for_each = length(var.vpn_cidrs) > 0 ? [1] : []
    content {
      description = "Ray client from VPN"
      from_port = 10001; to_port = 10001; protocol = "tcp"; cidr_blocks = var.vpn_cidrs
    }
  }

  egress {
    from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"]
  }
}

output "sg_id"      { value = aws_security_group.cluster.id }
output "subnet_id"  { value = local.private_subnets_sorted[0] }
output "subnet_ids" { value = local.private_subnets_sorted }
```

## 3. ECR + S3 artifact bucket

```hcl
# modules/ecr/main.tf
resource "aws_ecr_repository" "cluster" {
  name                 = "acme-ray-cluster"
  image_tag_mutability = "MUTABLE"
  force_delete         = true        # dev-only
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_lifecycle_policy" "cluster" {
  repository = aws_ecr_repository.cluster.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images, expire the rest."
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 10 }
      action       = { type = "expire" }
    }]
  })
}

output "repository_url" { value = aws_ecr_repository.cluster.repository_url }
output "repository_arn" { value = aws_ecr_repository.cluster.arn }
output "registry_id"    { value = aws_ecr_repository.cluster.registry_id }
```

```hcl
# modules/s3/main.tf
resource "aws_s3_bucket" "artifacts" {
  bucket        = "acme-ray-artifacts-${var.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  rule {
    id     = "expire-7-days"
    status = "Enabled"
    filter {}
    expiration { days = 7 }
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket                  = aws_s3_bucket.artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

output "bucket" { value = aws_s3_bucket.artifacts.bucket }
```

## 4. IAM — one narrowly-scoped role for head + workers

A single instance profile is used by both the head and every autoscaler-launched worker. **Not** `AmazonEC2FullAccess` — `RunInstances`/`TerminateInstances` scoped to `project=acme-ray`, S3 to the one artifact bucket, ECR pull to the one repo, SSM for shell access.

```hcl
# modules/iam/main.tf
# One-time per account — service-linked role for EC2 Spot.
resource "aws_iam_service_linked_role" "spot" {
  aws_service_name = "spot.amazonaws.com"
  description      = "Service-linked role for EC2 Spot Instances (acme-ray)"
}

resource "aws_iam_role" "worker" {
  name = "acme-ray-worker"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "worker" {
  name = "acme-ray-worker-policy"
  role = aws_iam_role.worker.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "EC2DescribeUnscoped"
        Effect   = "Allow"
        Action   = ["ec2:DescribeInstances", "ec2:DescribeTags", "ec2:DescribeNetworkInterfaces", "ec2:DescribeSubnets", "ec2:DescribeSecurityGroups"]
        Resource = "*"
      },
      {
        # RunInstances *creates* these — force project tag at request time.
        Sid    = "EC2RunInstancesCreate"
        Effect = "Allow"
        Action = ["ec2:RunInstances", "ec2:CreateTags"]
        Resource = [
          "arn:aws:ec2:*:*:instance/*",
          "arn:aws:ec2:*:*:volume/*",
          "arn:aws:ec2:*:*:network-interface/*",
          "arn:aws:ec2:*:*:spot-instances-request/*",
        ]
        Condition = { StringEquals = { "aws:RequestTag/project" = "acme-ray" } }
      },
      {
        Sid       = "AllowSpotServiceLinkedRoleCreation"
        Effect    = "Allow"
        Action    = "iam:CreateServiceLinkedRole"
        Resource  = "*"
        Condition = { StringEquals = { "iam:AWSServiceName" = "spot.amazonaws.com" } }
      },
      {
        # RunInstances *references* these existing resources.
        Sid    = "EC2RunInstancesReference"
        Effect = "Allow"
        Action = ["ec2:RunInstances"]
        Resource = [
          "arn:aws:ec2:*:*:security-group/*",
          "arn:aws:ec2:*:*:subnet/*",
          "arn:aws:ec2:*::image/*",
          "arn:aws:ec2:*:*:key-pair/*",
          "arn:aws:ec2:*:*:launch-template/*",
        ]
      },
      {
        Sid       = "EC2OperateScopedByResourceTag"
        Effect    = "Allow"
        Action    = ["ec2:TerminateInstances", "ec2:StartInstances", "ec2:StopInstances"]
        Resource  = "*"
        Condition = { StringEquals = { "aws:ResourceTag/project" = "acme-ray" } }
      },
      {
        Sid    = "S3ArtifactBucket"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket", "s3:DeleteObject"]
        Resource = [
          "arn:aws:s3:::${var.artifact_bucket}",
          "arn:aws:s3:::${var.artifact_bucket}/*",
        ]
      },
      { Sid = "ECRPull", Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*" },
      {
        Sid      = "ECRPullScopedToClusterRepo"
        Effect   = "Allow"
        Action   = ["ecr:BatchCheckLayerAvailability", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]
        Resource = var.cluster_image_repo_arn
      },
      {
        Sid    = "SSMSession"
        Effect = "Allow"
        Action = [
          "ssm:UpdateInstanceInformation",
          "ssmmessages:CreateControlChannel", "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",   "ssmmessages:OpenDataChannel",
          "ec2messages:AcknowledgeMessage",   "ec2messages:DeleteMessage",
          "ec2messages:FailMessage",          "ec2messages:GetEndpoint",
          "ec2messages:GetMessages",          "ec2messages:SendReply",
        ]
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_role_policy" "worker_passrole" {
  # Autoscaler PassRole's worker profile on RunInstances. Restrict to this role only.
  name = "acme-ray-passrole"
  role = aws_iam_role.worker.id
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = "iam:PassRole", Resource = aws_iam_role.worker.arn }]
  })
}

resource "aws_iam_instance_profile" "worker" {
  name = "acme-ray-worker"
  role = aws_iam_role.worker.name
}

output "worker_instance_profile_arn"  { value = aws_iam_instance_profile.worker.arn }
output "worker_instance_profile_name" { value = aws_iam_instance_profile.worker.name }
```

## 5. Terraform-owned head node

One EC2 instance, tagged so the Ray autoscaler **adopts** it (instead of trying to launch its own head, which fails because the IAM policy scopes `RunInstances` to the project tag).

```hcl
# modules/cluster/main.tf
locals {
  # `vm:<instance_type>` custom resource — a task requesting
  # resources={"vm:g4dn.2xlarge": 0.01} lands on this hardware.
  worker_types = [
    { instance_type = "g4dn.2xlarge", cpu = 8 },
    { instance_type = "g4dn.4xlarge", cpu = 16 },
    { instance_type = "g4dn.xlarge",  cpu = 4 },
    { instance_type = "g6.2xlarge",   cpu = 8 },
    { instance_type = "g6.4xlarge",   cpu = 16 },
    { instance_type = "g6.xlarge",    cpu = 4 },
  ]

  cluster_yaml = templatefile("${path.module}/templates/cluster.yaml.tftpl", {
    max_workers                  = var.max_workers
    ray_worker_idle_minutes      = var.ray_worker_idle_minutes
    worker_types                 = local.worker_types
    worker_spot_price_cap        = var.worker_spot_price_cap
    worker_idle_shutdown_minutes = var.worker_idle_shutdown_minutes
    ami_id                       = var.ami_id
    region                       = var.region
    subnet_id                    = var.subnet_id
    subnet_ids_yaml              = jsonencode(var.subnet_ids)
    sg_id                        = var.sg_id
    worker_instance_profile_arn  = var.worker_instance_profile_arn
    owner_email                  = var.owner_email
    ecr_registry                 = var.ecr_registry
    ecr_image                    = var.ecr_image
  })

  user_data = templatefile("${path.module}/templates/head-user-data.sh.tftpl", {
    cluster_yaml             = local.cluster_yaml
    head_idle_shutdown_hours = var.head_idle_shutdown_hours
    region                   = var.region
    ecr_registry             = var.ecr_registry
    ecr_image                = var.ecr_image
  })
}

resource "aws_instance" "head" {
  ami                         = var.ami_id
  instance_type               = var.head_instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [var.sg_id]
  iam_instance_profile        = var.worker_instance_profile_name
  associate_public_ip_address = false

  # gzip+base64 the user-data — the rendered script embeds the full cluster.yaml
  # and would otherwise blow the EC2 16 KB user_data limit.
  user_data_base64            = base64gzip(local.user_data)
  user_data_replace_on_change = true

  metadata_options {
    http_tokens                 = "required"   # IMDSv2 only
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 2            # container needs IMDS
  }

  root_block_device {
    volume_size           = 80
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  tags = {
    Name                  = "acme-ray-head"
    role                  = "head"
    # Autoscaler adopts the head by these tags.
    "ray-cluster-name"    = "acme-ray"
    "ray-node-type"       = "head"
    "ray-user-node-type"  = "ray.head.default"
  }
}

output "head_instance_id" { value = aws_instance.head.id }
output "head_private_ip"  { value = aws_instance.head.private_ip }
```

Head user-data template (`modules/cluster/templates/head-user-data.sh.tftpl`):

```bash
#!/usr/bin/env bash
set -euxo pipefail

aws --region ${region} ecr get-login-password \
  | docker login --username AWS --password-stdin "${ecr_registry}"
docker pull "${ecr_image}"

mkdir -p /etc/ray
cat > /etc/ray/cluster.yaml <<'RAY_CLUSTER_EOF'
${cluster_yaml}
RAY_CLUSTER_EOF

# Idle watchdog — shut head down after N hours with no SSM session + silent Ray log.
cat > /usr/local/bin/head-idle-watchdog.sh <<'HEAD_WATCHDOG_EOF'
#!/usr/bin/env bash
set -euo pipefail
HEAD_IDLE_HOURS="$${HEAD_IDLE_HOURS:-4}"
ssm_active=0
if [ -f /var/log/amazon/ssm/amazon-ssm-agent.log ]; then
  cutoff="$(date -u -d "-$${HEAD_IDLE_HOURS} hours" +%s 2>/dev/null || echo 0)"
  latest="$(stat -c %Y /var/log/amazon/ssm/amazon-ssm-agent.log 2>/dev/null || echo 0)"
  [ "$${latest}" -gt "$${cutoff}" ] && ssm_active=1
fi
ray_active=0
if [ -d /tmp/ray ] && find /tmp/ray -type f -newer "$(date -u -d "-$${HEAD_IDLE_HOURS} hours" +%Y-%m-%dT%H:%M:%SZ)" 2>/dev/null | head -1 | grep -q .; then
  ray_active=1
fi
if [ "$${ssm_active}" -eq 0 ] && [ "$${ray_active}" -eq 0 ]; then
  echo "[$(date -u +%FT%TZ)] idle > $${HEAD_IDLE_HOURS}h — shutting down"
  sudo shutdown -h now
fi
HEAD_WATCHDOG_EOF
chmod +x /usr/local/bin/head-idle-watchdog.sh
echo "0 * * * * root HEAD_IDLE_HOURS=${head_idle_shutdown_hours} /usr/local/bin/head-idle-watchdog.sh" > /etc/cron.d/head-idle-watchdog

docker run -d --name ray-head --restart unless-stopped \
  --network host --shm-size=2g \
  -v /etc/ray:/etc/ray:ro \
  "${ecr_image}" \
  ray start --head --port=6379 --dashboard-host=127.0.0.1 \
    --autoscaling-config=/etc/ray/cluster.yaml \
    --resources='{"node_type:ray.head.default":1}' --block
```

`--network host` binds 6379 (GCS), 8265 (dashboard), 10001 (Ray client) on the host's private IP — reachable via VPN or SSM port-forward.

## 6. Autoscaler config (`cluster.yaml`) — workers are NOT Terraform's

Terraform renders this file; Ray launches and terminates workers from it. Load-bearing flags:

- `disable_launch_config_check: true` — head was launched by Terraform, not `ray up`. Without this the autoscaler crashes within seconds.
- `disable_node_updaters: true` — workers self-bootstrap via EC2 `UserData`. No SSH key pair needed.
- Each worker type's `vm:<instance_type>` resource MUST match what the worker's `--resources=...` advertises on raylet start. Mismatch = tasks pending forever + runaway scale-up.

`modules/cluster/templates/cluster.yaml.tftpl`:

```yaml
cluster_name: acme-ray
provider:
  type: aws
  region: ${region}
  cache_stopped_nodes: false
  disable_launch_config_check: true   # head is Terraform-owned
  disable_node_updaters: true         # workers self-bootstrap via UserData
auth:
  ssh_user: ubuntu
max_workers: ${max_workers}
idle_timeout_minutes: ${ray_worker_idle_minutes}
file_mounts: {}
cluster_synced_files: []
file_mounts_sync_continuously: false
initialization_commands: []
head_setup_commands: []
head_node_type: ray.head.default
available_node_types:
  ray.head.default:
    resources: {CPU: 2}
    max_workers: 0
    node_config:
      InstanceType: t3.xlarge
      ImageId: ${ami_id}
      SubnetIds: [${subnet_id}]
      SecurityGroupIds: [${sg_id}]
      IamInstanceProfile: {Arn: ${worker_instance_profile_arn}}
%{ for w in worker_types ~}
  ray.worker.${replace(w.instance_type, ".", "_")}:
    min_workers: 0
    max_workers: ${max_workers}
    resources: {CPU: ${w.cpu}, GPU: 1, "vm:${w.instance_type}": 1}
    node_config:
      InstanceType: ${w.instance_type}
      ImageId: ${ami_id}
      SubnetIds: ${subnet_ids_yaml}
      SecurityGroupIds: [${sg_id}]
      IamInstanceProfile: {Arn: ${worker_instance_profile_arn}}
      InstanceMarketOptions:
        MarketType: spot
        SpotOptions:
          MaxPrice: "${worker_spot_price_cap}"
      TagSpecifications:
        - ResourceType: instance
          Tags:
            - {Key: project, Value: acme-ray}        # REQUIRED — IAM scopes RunInstances to this
            - {Key: managed_by, Value: ray-autoscaler}
            - {Key: owner, Value: ${owner_email}}
        - ResourceType: volume
          Tags:
            - {Key: project, Value: acme-ray}
            - {Key: managed_by, Value: ray-autoscaler}
      BlockDeviceMappings:
        - DeviceName: /dev/sda1
          Ebs: {VolumeSize: 150, VolumeType: gp3, DeleteOnTermination: true}
      UserData: |
        #!/usr/bin/env bash
        set -euxo pipefail
        HEAD_IP=$(aws --region ${region} ec2 describe-instances \
          --filters \
            "Name=tag:project,Values=acme-ray" \
            "Name=tag:role,Values=head" \
            "Name=instance-state-name,Values=running" \
          --query 'Reservations[0].Instances[0].PrivateIpAddress' --output text)

        aws --region ${region} ecr get-login-password \
          | docker login --username AWS --password-stdin ${ecr_registry}
        docker pull ${ecr_image}

        # Worker cost watchdog — self-shutdown after N min of GPU util < 5%.
        echo "*/5 * * * * root [ \$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits | head -1) -lt 5 ] && shutdown -h +${worker_idle_shutdown_minutes}" > /etc/cron.d/idle-shutdown

        docker run -d --name ray-worker --restart unless-stopped \
          --gpus all --network host --shm-size=2g \
          ${ecr_image} \
          ray start --address=$HEAD_IP:6379 --object-manager-port=8076 \
            --resources='{"vm:${w.instance_type}":1}' --block
%{ endfor ~}
worker_setup_commands: []
head_start_ray_commands: []
worker_start_ray_commands: []
```

## 7. Root wiring (`main.tf`)

Order: s3 → iam (scopes S3/ECR to those ARNs) → cluster (head bakes bucket + image into `cluster.yaml`).

```hcl
module "s3" {
  source     = "./modules/s3"
  account_id = data.aws_caller_identity.current.account_id
}

module "ecr" { source = "./modules/ecr" }

module "iam" {
  source                 = "./modules/iam"
  artifact_bucket        = module.s3.bucket
  cluster_image_repo_arn = module.ecr.repository_arn
}

module "network" {
  source    = "./modules/network"
  vpc_name  = "acme-shared--vpc"
  vpn_cidrs = var.vpn_cidrs
}

module "cluster" {
  source                       = "./modules/cluster"
  head_instance_type           = var.head_instance_type
  worker_spot_price_cap        = var.worker_spot_price_cap
  max_workers                  = var.max_workers
  ray_worker_idle_minutes      = var.ray_worker_idle_minutes
  head_idle_shutdown_hours     = var.head_idle_shutdown_hours
  worker_idle_shutdown_minutes = var.worker_idle_shutdown_minutes
  ami_id                       = data.aws_ami.dl_base_gpu.id
  region                       = "us-east-1"
  subnet_id                    = module.network.subnet_id
  subnet_ids                   = module.network.subnet_ids
  sg_id                        = module.network.sg_id
  worker_instance_profile_arn  = module.iam.worker_instance_profile_arn
  worker_instance_profile_name = module.iam.worker_instance_profile_name
  owner_email                  = var.owner_email
  ecr_registry                 = "${module.ecr.registry_id}.dkr.ecr.us-east-1.amazonaws.com"
  ecr_image                    = "${module.ecr.repository_url}:${var.cluster_image_tag}"
}
```

## 8. Apply, verify, teardown

```bash
# 1. Apply platform (ECR, IAM, SG, head). Workers come later via Ray.
terraform init
terraform apply

# 2. Build + push the cluster image to the repo Terraform just made.
REGISTRY="$(terraform output -raw cluster_image_repository_url | cut -d/ -f1)"
aws ecr get-login-password --region us-east-1 --profile acme-dev \
  | docker login --username AWS --password-stdin "$REGISTRY"
docker build -t "$(terraform output -raw cluster_image_repository_url):latest" .
docker push "$(terraform output -raw cluster_image_repository_url):latest"
# (If you pushed after apply: terraform apply -replace=module.cluster.aws_instance.head)
```

Verify:

```bash
HEAD_ID="$(terraform output -raw head_instance_id)"

# Shell onto head via SSM (no SSH, no key pair)
aws ssm start-session --target "$HEAD_ID" --region us-east-1 --profile acme-dev

# On the head:
docker logs ray-head --tail 20
docker exec ray-head ray status     # ray.head.default Healthy; 0 workers idle

# Port-forward dashboard 8265
aws ssm start-session --target "$HEAD_ID" --region us-east-1 --profile acme-dev \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["8265"],"localPortNumber":["8265"]}'
```

Teardown — Terraform doesn't know about autoscaler workers. Drain them first:

```bash
# 1. Drain autoscaler workers (on head via SSM)
docker exec ray-head ray down -y /etc/ray/cluster.yaml

# 2. Belt-and-braces: kill stragglers tagged by autoscaler
aws ec2 describe-instances --region us-east-1 --profile acme-dev \
  --filters "Name=tag:project,Values=acme-ray" "Name=tag:managed_by,Values=ray-autoscaler" \
            "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].InstanceId' --output text \
  | xargs -r aws ec2 terminate-instances --region us-east-1 --profile acme-dev --instance-ids

# 3. Destroy Terraform-owned platform
terraform destroy
```

## Cost watchdogs (three layers)

1. Ray autoscaler scales idle workers down after `idle_timeout_minutes`.
2. Each worker's `nvidia-smi` cron self-terminates after `worker_idle_shutdown_minutes` below 5% GPU util.
3. Head's hourly watchdog shuts itself down after `head_idle_shutdown_hours` with no SSM session + silent Ray log.

Always run the teardown drain — a forgotten spot worker is the single most common way this stack leaks money.

> The Ray *usage* side — `@ray.remote` tasks/actors, `runtime_env`, job submission — lives in the **`python`** skill (recipe `ray-training`). This recipe only provisions the cluster.
