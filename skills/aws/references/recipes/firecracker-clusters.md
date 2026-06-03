# Firecracker MicroVM Fleet on AWS

KVM-based VMM by AWS that boots minimal Linux microVMs in ~125 ms with ~5 MiB overhead per VM. Strips device emulation to: virtio-net, virtio-block, virtio-vsock, serial, RTC. Each microVM = its own kernel + rootfs + jailer-isolated process on the host.

## When to use Firecracker vs ECS/Lambda

| Workload | Use |
|---|---|
| Sandboxed code execution, multi-tenant runners, agentic browser/IDE sandboxes, FaaS | **Firecracker** (what Lambda, Fargate, Bedrock AgentCore, Modal, e2b, Browserbase run on) |
| Standard 12-factor app, mature ecosystem | **ECS / EKS** (containers) |
| Bursty single-purpose function with managed lifecycle | **Lambda** |
| Long-running stateful service with attached EBS | **EC2** |

**Limits**: no live migration; no GPU passthrough except on bare metal via `--enable-pci`; Linux guests only; x86_64 + aarch64.

## EC2 host requirements

Firecracker needs `/dev/kvm` with hardware virtualization:

- **Bare-metal instance types** (`*.metal`, `*.metal-*`): `c5.metal`, `c5n.metal`, `m5.metal`, `m5n.metal`, `r5.metal`, `i3.metal`, `c6i.metal`, `c7i.metal`, `m7i.metal`, `r7i.metal`, …
- **Or** EC2 with the new `NestedVirtualization` parameter (Feb 2026+) — non-bare-metal nested KVM, slower than bare metal but cheaper.

Recommended baseline: `c7i.metal-24xl` (Ubuntu 24.04 LTS) — 96 vCPU, 192 GiB, 50 Gbps net. Cheap dev: `c5.metal`.

Verify on the host:

```bash
ls /dev/kvm && echo "kvm ok"
lscpu | grep -E "Virtualization|Hypervisor"
sudo apt update && sudo apt install -y curl jq iproute2 squashfs-tools acl

# Grant runtime user access to /dev/kvm
sudo setfacl -m u:${USER}:rw /dev/kvm
```

## Install Firecracker + jailer

```bash
ARCH=$(uname -m)
LATEST=$(basename $(curl -fsSLI -o /dev/null -w %{url_effective} \
    https://github.com/firecracker-microvm/firecracker/releases/latest))
curl -L https://github.com/firecracker-microvm/firecracker/releases/download/${LATEST}/firecracker-${LATEST}-${ARCH}.tgz \
    | sudo tar -xz --strip-components=1 -C /usr/local/bin \
        release-${LATEST}-${ARCH}/firecracker-${LATEST}-${ARCH} \
        release-${LATEST}-${ARCH}/jailer-${LATEST}-${ARCH}
sudo ln -sf /usr/local/bin/firecracker-${LATEST}-${ARCH} /usr/local/bin/firecracker
sudo ln -sf /usr/local/bin/jailer-${LATEST}-${ARCH}      /usr/local/bin/jailer
```

## Kernel + rootfs

Get a CI-tested kernel:

```bash
ARCH=$(uname -m)
CI_BASE="http://spec.ccfc.min.s3.amazonaws.com/firecracker-ci/v1.10/${ARCH}"
KEY=$(curl -s "${CI_BASE}/?list-type=2&prefix=vmlinux-" \
    | grep -oP '(?<=<Key>)[^<]+' | sort -V | tail -1)
curl -O "https://s3.amazonaws.com/spec.ccfc.min/${KEY}"
```

Build a rootfs from a Dockerfile → ext4:

```bash
docker build -t worker-image .
docker create --name w worker-image
docker export w | tar -x -C rootfs/
docker rm w

SIZE=$(du -sm rootfs/ | cut -f1)
truncate -s $((SIZE + 200))M worker.ext4
mkfs.ext4 -d rootfs/ -F worker.ext4
```

Keep kernel + rootfs immutable on disk. Clones use COW overlays (see snapshots below).

## Host networking — TAP per VM + NAT

```bash
TAP=tap0
HOST_IF=$(ip -j route show default | jq -r '.[0].dev')

sudo ip tuntap add dev $TAP mode tap
sudo ip addr add 172.16.0.1/30 dev $TAP
sudo ip link set $TAP up

echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward
sudo iptables-nft -t nat -A POSTROUTING -o $HOST_IF -s 172.16.0.2 -j MASQUERADE
sudo iptables-nft -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
sudo iptables-nft -A FORWARD -i $TAP -o $HOST_IF -j ACCEPT
```

Bridge model (many VMs talking to each other):

```bash
sudo ip link add fcbr0 type bridge
sudo ip addr add 172.21.0.1/16 dev fcbr0
sudo ip link set fcbr0 up

# Per VM:
sudo ip tuntap add dev tap_$ID mode tap
sudo ip link set tap_$ID master fcbr0
sudo ip link set tap_$ID up
```

MAC ↔ IP convention — embed guest IP in last 4 octets so first-boot can derive it deterministically:

```
06:00:AC:10:00:02   ↔  172.16.0.2
06:00:AC:10:00:03   ↔  172.16.0.3
```

For production, use the CNI `tc-redirect-tap` plugin — wraps CNI bridge/IPAM with a TAP usable by Firecracker (what `firecracker-containerd` uses).

## Configure + start a microVM via the API

Firecracker exposes a REST API over a Unix socket.

```bash
API=/tmp/fc.sock
sudo rm -f $API
sudo firecracker --api-sock $API &

# Boot source
sudo curl -X PUT --unix-socket $API "http://localhost/boot-source" --data '{
  "kernel_image_path": "/var/lib/fc/vmlinux",
  "boot_args": "console=ttyS0 reboot=k panic=1 pci=off"
}'

# Rootfs
sudo curl -X PUT --unix-socket $API "http://localhost/drives/rootfs" --data '{
  "drive_id": "rootfs",
  "path_on_host": "/var/lib/fc/rootfs.ext4",
  "is_root_device": true,
  "is_read_only": false
}'

# Machine config
sudo curl -X PUT --unix-socket $API "http://localhost/machine-config" --data '{
  "vcpu_count": 2,
  "mem_size_mib": 512
}'

# Network interface
sudo curl -X PUT --unix-socket $API "http://localhost/network-interfaces/eth0" --data '{
  "iface_id": "eth0",
  "guest_mac": "06:00:AC:10:00:02",
  "host_dev_name": "tap0"
}'

# Boot
sudo curl -X PUT --unix-socket $API "http://localhost/actions" --data '{
  "action_type": "InstanceStart"
}'
```

Or in one shot: `firecracker --config-file vm.json --api-sock $API` (no need to call `InstanceStart`).

Inside the guest (one-time):

```bash
ip addr add 172.16.0.2/30 dev eth0
ip link set eth0 up
ip route add default via 172.16.0.1 dev eth0
echo 'nameserver 1.1.1.1' > /etc/resolv.conf
```

## Jailer — mandatory in production

Jailer sets up chroot/cgroups/network/uid_map, drops capabilities, then `execve()`s `firecracker`. Always start microVMs through it.

```bash
sudo jailer \
  --id worker-$VMID \
  --exec-file /usr/local/bin/firecracker \
  --uid 1234 --gid 1234 \
  --chroot-base-dir /srv/jail \
  --cgroup-version 2 \
  --resource-limit no-file=4096 \
  --resource-limit fsize=2147483648 \
  --cgroup cpuset.cpus=4 \
  --cgroup memory.max=536870912 \
  -- \
  --api-sock /run/firecracker.socket
```

What jailer applies automatically:

- New mount namespace; chroot to `/srv/jail/firecracker/${id}/root`
- New PID + network namespaces (optional `--netns`)
- Drops to non-root uid/gid
- Per-thread seccomp-bpf filters (API thread, VMM thread, vCPU threads)
- cgroup v2 hierarchy for CPU/mem/io accounting

Production host checklist (per Firecracker `prod-host-setup.md`):

- Kernel cmdline: `spectre_v2=on spec_store_bypass_disable=on l1tf=full,force mds=full,nosmt`
- Disable host swap; disable THP for VM cgroups; disable KSM (info leak vector)
- Use ext4 (not xfs) for rootfs files
- Bind Firecracker thread affinity to a dedicated CPU set

## Snapshots — boot in tens of ms

Pause + snapshot a "golden" booted VM, then COW-clone the memory file per request.

```bash
# 1. Pause
curl --unix-socket $API -X PATCH 'http://localhost/vm' -d '{"state":"Paused"}'

# 2. Snapshot
curl --unix-socket $API -X PUT 'http://localhost/snapshot/create' -d '{
  "snapshot_type": "Full",
  "snapshot_path": "/var/lib/fc/snap/vm.bin",
  "mem_file_path":  "/var/lib/fc/snap/vm.mem"
}'

# 3. Resume (or kill original)
curl --unix-socket $API -X PATCH 'http://localhost/vm' -d '{"state":"Resumed"}'
```

Restore on a fresh process:

```bash
sudo firecracker --api-sock $NEW_API &
curl --unix-socket $NEW_API -X PUT 'http://localhost/snapshot/load' -d '{
  "snapshot_path": "/var/lib/fc/snap/vm.bin",
  "mem_file_path": "/var/lib/fc/snap/vm.mem",
  "enable_diff_snapshots": false,
  "resume_vm": true
}'
```

For a warm-pool architecture: `cp --reflink=always vm.mem vm.${id}.mem` on XFS/Btrfs — sub-30 ms boots since memory pages aren't copied until written.

Pin paths inside snapshots relative (`./rootfs.ext4` not `/var/lib/...`) so the same snapshot works in any chroot.

## Orchestration choices

| Tool | Best for | Notes |
|---|---|---|
| **Custom controller** (gRPC + Firecracker API) | Lambda-style FaaS, full control | What AWS does; you own scheduling, networking, cleanup |
| **firecracker-containerd** | Run OCI containers in microVMs from containerd | Drop-in containerd shim; integrates with K8s via Kata |
| **Kata Containers + Firecracker VMM** | K8s pods with hypervisor isolation | `runtimeClassName: kata-fc`; well-trodden K8s path |
| **Modal / e2b / fly-machines** | Don't operate the fleet yourself | Managed alternatives |

Recommended pattern for a custom cluster:

1. Each host runs a single **agent daemon** that owns `/dev/kvm`, manages a TAP/IP pool, exposes a small gRPC API (`CreateVM`, `DestroyVM`, `Exec`).
2. Agents register with a **control plane** (Postgres + leader-elected scheduler) that places VMs onto hosts by free vCPU/memory.
3. **Networking**: VPC private subnets; per-host primary ENI for control-plane traffic, secondary ENIs (or one ENI with multiple secondary IPs) attached to TAPs for VM egress; SG allows API-socket access from the agent's UID only.
4. **Storage**: instance-store NVMe (i3en/c7gd) for ext4 rootfs cache + snapshot memory files; S3 for the immutable artifact store (kernel.bin + base.ext4 + golden snapshots).

## Terraform skeleton — bare-metal fleet

```hcl
# providers.tf
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}
provider "aws" { region = "us-east-1" }

# vpc.tf
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  name    = "fc-cluster"
  cidr    = "10.40.0.0/16"
  azs                = ["us-east-1a", "us-east-1b"]
  private_subnets    = ["10.40.1.0/24", "10.40.2.0/24"]
  public_subnets     = ["10.40.101.0/24", "10.40.102.0/24"]
  enable_nat_gateway = true
}

# launch_template.tf
data "aws_ssm_parameter" "ubuntu_2404" {
  name = "/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id"
}

resource "aws_launch_template" "fc_host" {
  name_prefix   = "fc-host-"
  image_id      = data.aws_ssm_parameter.ubuntu_2404.value
  instance_type = "c7i.metal-24xl"
  user_data     = base64encode(templatefile("${path.module}/user_data.sh", {
    artifact_bucket = aws_s3_bucket.fc_artifacts.bucket
    control_plane   = "fc-control.internal:7443"
  }))

  iam_instance_profile { name = aws_iam_instance_profile.fc_host.name }
  vpc_security_group_ids = [aws_security_group.fc_host.id]

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs { volume_size = 80, volume_type = "gp3" }
  }

  metadata_options { http_tokens = "required" }
  tag_specifications {
    resource_type = "instance"
    tags = { Role = "firecracker-host" }
  }
}

# asg.tf
resource "aws_autoscaling_group" "fc_hosts" {
  name                = "fc-hosts"
  min_size            = 2
  max_size            = 20
  desired_capacity    = 4
  vpc_zone_identifier = module.vpc.private_subnets
  launch_template { id = aws_launch_template.fc_host.id, version = "$Latest" }
  health_check_type = "EC2"
}

# s3.tf — immutable artifact store
resource "random_id" "s" { byte_length = 4 }

resource "aws_s3_bucket" "fc_artifacts" { bucket = "fc-artifacts-${random_id.s.hex}" }

resource "aws_s3_bucket_versioning" "v" {
  bucket = aws_s3_bucket.fc_artifacts.id
  versioning_configuration { status = "Enabled" }
}
```

`user_data.sh` should: install firecracker + jailer, mount instance-store NVMe at `/var/lib/fc/cache`, pull latest kernel/rootfs/snapshot from S3, configure sysctls, start the agent daemon.

## Security checklist

- Jailer for every microVM (never `firecracker` bare)
- Default seccomp filters enabled (`--seccomp-level 2` — now the default; `--no-seccomp` is for debugging only)
- cgroup v2 limits on CPU + memory + io + pids
- CPU pinning so VMs can't trash neighbouring cache (`taskset` / cgroup `cpuset`)
- Spectre/Meltdown mitigations in kernel cmdline
- Disable host swap, THP, KSM (information-leak vector)
- Rootfs from immutable artifact bucket — workloads never write the golden image
- Per-host TAP/IP pool + conntrack-zone separation
- IMDSv2-only and minimum IAM via instance profile
- Egress firewalled via SGs + NACLs; deny `169.254.169.254` from inside VMs
- Audit every API socket call (write-through to CloudWatch)
- Snapshot files encrypted at rest (S3 SSE-KMS) and signed for integrity

## Sources

- https://firecracker-microvm.github.io/
- https://github.com/firecracker-microvm/firecracker/blob/main/docs/getting-started.md
- https://github.com/firecracker-microvm/firecracker/blob/main/docs/network-setup.md
- https://github.com/firecracker-microvm/firecracker/blob/main/docs/rootfs-and-kernel-setup.md
- https://github.com/firecracker-microvm/firecracker/blob/main/docs/snapshotting/snapshot-support.md
- https://github.com/firecracker-microvm/firecracker/blob/main/docs/prod-host-setup.md
