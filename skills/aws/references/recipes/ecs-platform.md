# ECS-on-EC2 Deployment Platform

VPC + ECS cluster + capacity-provider ASGs + ALB + reusable web-service module. Compute is **ECS on EC2** (`requires_compatibilities = ["EC2"]`, `network_mode = "awsvpc"`), ARM64 instances via SSM-resolved AMIs, one capacity provider per instance type.

## 1. Network module (`infra/modules/network`)

Two-AZ VPC with public + private subnets, NAT per AZ, IGW, ALB + ECS security groups.

```hcl
# infra/modules/network/variables.tf
variable "resource_prefix" { type = string }
variable "vpc_name"        { type = string, default = "vpc" }
```

```hcl
# infra/modules/network/main.tf
data "aws_availability_zones" "available" { state = "available" }

resource "aws_vpc" "main" {
  cidr_block           = "10.11.104.0/23"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "${var.resource_prefix}--${var.vpc_name}" }
  lifecycle { prevent_destroy = true }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 2, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = { Name = "${var.resource_prefix}--${var.vpc_name}-public-${count.index + 1}", Tier = "public" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 2, count.index + 2)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = { Name = "${var.resource_prefix}--${var.vpc_name}-private-${count.index + 1}", Tier = "private" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.resource_prefix}--${var.vpc_name}-igw" }
}

resource "aws_eip" "nat" { count = 2; domain = "vpc" }

resource "aws_nat_gateway" "nat" {
  count         = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0"; gateway_id = aws_internet_gateway.igw.id }
}

resource "aws_route_table" "private" {
  count  = 2
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0"; nat_gateway_id = aws_nat_gateway.nat[count.index].id }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Security groups
resource "aws_security_group" "alb" {
  name   = "${var.resource_prefix}--${var.vpc_name}-default-alb-sg"
  vpc_id = aws_vpc.main.id
}

resource "aws_security_group" "ecs" {
  name   = "${var.resource_prefix}--${var.vpc_name}-default-ecs-sg"
  vpc_id = aws_vpc.main.id
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  from_port = 443; to_port = 443; ip_protocol = "tcp"; cidr_ipv4 = "0.0.0.0/0"
}
resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  from_port = 80; to_port = 80; ip_protocol = "tcp"; cidr_ipv4 = "0.0.0.0/0"
}
resource "aws_vpc_security_group_egress_rule" "alb_out" {
  security_group_id = aws_security_group.alb.id
  ip_protocol = "-1"; cidr_ipv4 = "0.0.0.0/0"
}
resource "aws_vpc_security_group_ingress_rule" "alb_to_ecs" {
  security_group_id            = aws_security_group.ecs.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port = 80; to_port = 80; ip_protocol = "tcp"
}
resource "aws_vpc_security_group_ingress_rule" "ecs_to_ecs" {
  security_group_id            = aws_security_group.ecs.id
  referenced_security_group_id = aws_security_group.ecs.id
  from_port = 80; to_port = 80; ip_protocol = "tcp"
}
resource "aws_vpc_security_group_egress_rule" "ecs_out" {
  security_group_id = aws_security_group.ecs.id
  ip_protocol = "-1"; cidr_ipv4 = "0.0.0.0/0"
}
```

```hcl
# infra/modules/network/outputs.tf
output "vpc_id"                { value = aws_vpc.main.id }
output "public_subnet_ids"     { value = aws_subnet.public[*].id }
output "private_subnet_ids"    { value = aws_subnet.private[*].id }
output "alb_security_group_id" { value = aws_security_group.alb.id }
output "ecs_security_group_id" { value = aws_security_group.ecs.id }
```

## 2. Capacity-provider ASG module (`infra/modules/autoscaling_group`)

One ASG + ECS capacity provider per instance type. AMI resolved from SSM.

```hcl
# infra/modules/autoscaling_group/variables.tf
variable "resource_prefix"                  { type = string }
variable "ecs_cluster_name"                 { type = string }
variable "instance_type"                    { type = string }
variable "ecs_security_group_ids"           { type = list(string) }
variable "ecs_subnet_ids"                   { type = list(string) }
variable "ecs_ami_ssm_path"                 { type = string }
variable "autoscaling_group_name"           { type = string, default = "asg" }
variable "autoscaling_min_size"             { type = number, default = 1 }
variable "autoscaling_max_size"             { type = number, default = 2 }
variable "ecs_target_capacity"              { type = number, default = 100 }
variable "ecs_minimum_scaling_step_size"    { type = number, default = 1 }
variable "ecs_maximum_scaling_step_size"    { type = number, default = 5 }
```

```hcl
# infra/modules/autoscaling_group/main.tf
data "aws_partition" "current" {}
data "aws_ssm_parameter" "ecs_node_ami" { name = var.ecs_ami_ssm_path }

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals { type = "Service"; identifiers = ["ec2.amazonaws.com"] }
  }
}

resource "aws_iam_role" "ecs_node" {
  name               = "${var.resource_prefix}--${var.autoscaling_group_name}-ecs-node-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "ecs_node" {
  role       = aws_iam_role.ecs_node.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_instance_profile" "ecs_node" {
  name = "${var.resource_prefix}--${var.autoscaling_group_name}-ecs-node-profile"
  role = aws_iam_role.ecs_node.name
}

resource "aws_launch_template" "ec2" {
  name                   = "${var.resource_prefix}--${var.autoscaling_group_name}-launch-template"
  image_id               = data.aws_ssm_parameter.ecs_node_ami.value
  instance_type          = var.instance_type
  vpc_security_group_ids = var.ecs_security_group_ids

  iam_instance_profile { arn = aws_iam_instance_profile.ecs_node.arn }
  monitoring { enabled = true }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo ECS_CLUSTER=${var.ecs_cluster_name} >> /etc/ecs/ecs.config;
  EOF
  )
}

resource "aws_autoscaling_group" "ecs" {
  name                = "${var.resource_prefix}--${var.autoscaling_group_name}"
  vpc_zone_identifier = var.ecs_subnet_ids
  min_size            = var.autoscaling_min_size
  max_size            = var.autoscaling_max_size
  health_check_type   = "EC2"

  launch_template {
    id      = aws_launch_template.ec2.id
    version = "$Latest"
  }

  tag { key = "Name";             value = "${var.resource_prefix}--${var.autoscaling_group_name}"; propagate_at_launch = true }
  tag { key = "AmazonECSManaged"; value = true;                                                    propagate_at_launch = true }
}

resource "aws_ecs_capacity_provider" "cp" {
  name = "${var.resource_prefix}--${var.autoscaling_group_name}"
  auto_scaling_group_provider {
    auto_scaling_group_arn = aws_autoscaling_group.ecs.arn
    managed_scaling {
      status                    = "ENABLED"
      target_capacity           = var.ecs_target_capacity
      minimum_scaling_step_size = var.ecs_minimum_scaling_step_size
      maximum_scaling_step_size = var.ecs_maximum_scaling_step_size
    }
  }
}

output "ecs_capacity_provider_name" { value = aws_ecs_capacity_provider.cp.name }
```

## 3. Cluster + capacity providers + ALB (`infra/environment`)

```hcl
# infra/environment/ecs.tf
module "vpc" {
  source          = "../modules/network"
  resource_prefix = local.resource_prefix
}

resource "aws_ecs_cluster" "default" {
  name = "${local.resource_prefix}--default"
  setting { name = "containerInsights"; value = "enhanced" }
  lifecycle { prevent_destroy = true }
}

locals {
  ecs_capacity_groups = {
    t4g-small = {
      instance_type        = "t4g.small"
      autoscaling_min_size = 1
      autoscaling_max_size = 30
      ecs_target_capacity  = 90
      ecs_ami_ssm_path     = "/aws/service/ecs/optimized-ami/amazon-linux-2023/arm64/recommended/image_id"
    }
    c6g-4xlarge = {
      instance_type        = "c6g.4xlarge"
      autoscaling_min_size = 0
      autoscaling_max_size = 5
      ecs_target_capacity  = 100
      ecs_ami_ssm_path     = "/aws/service/ecs/optimized-ami/amazon-linux-2023/arm64/recommended/image_id"
    }
  }
}

module "ecs_autoscaling_groups" {
  source   = "../modules/autoscaling_group"
  for_each = local.ecs_capacity_groups

  resource_prefix        = local.resource_prefix
  ecs_cluster_name       = aws_ecs_cluster.default.name
  ecs_security_group_ids = [module.vpc.ecs_security_group_id]
  ecs_subnet_ids         = module.vpc.private_subnet_ids
  ecs_ami_ssm_path       = each.value.ecs_ami_ssm_path
  autoscaling_group_name = "ecs-${each.key}-asg"
  instance_type          = each.value.instance_type
  autoscaling_min_size   = each.value.autoscaling_min_size
  autoscaling_max_size   = each.value.autoscaling_max_size
  ecs_target_capacity    = each.value.ecs_target_capacity
}

resource "aws_ecs_cluster_capacity_providers" "cluster" {
  cluster_name       = aws_ecs_cluster.default.name
  capacity_providers = [for asg in module.ecs_autoscaling_groups : asg.ecs_capacity_provider_name]
}
```

```hcl
# infra/environment/alb.tf
resource "aws_lb" "ecs_alb" {
  name                       = "${local.resource_prefix}--alb"
  internal                   = false
  load_balancer_type         = "application"
  subnets                    = module.vpc.public_subnet_ids
  security_groups            = [module.vpc.alb_security_group_id]
  enable_deletion_protection = true
  lifecycle { prevent_destroy = true }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.ecs_alb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "No service for this host"
      status_code  = "404"
    }
  }
  lifecycle { prevent_destroy = true }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.ecs_alb.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect { port = "443"; protocol = "HTTPS"; status_code = "HTTP_301" }
  }
}
```

## 4. Web-service module (`infra/modules/ecs_web_service`)

Per service: IAM, task def, ECS service, ALB target group + listener rule, Route53 alias (DNS account).

```hcl
# infra/modules/ecs_web_service/providers.tf
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 6.0"
      configuration_aliases = [aws.commercial]
    }
  }
}
```

```hcl
# infra/modules/ecs_web_service/variables.tf
variable "resource_prefix"         { type = string }
variable "environment"             { type = string }
variable "subdomain"               { type = string }
variable "domain"                  { type = string }
variable "container_image"         { type = string }
variable "container_port"          { type = number, default = 80 }
variable "cpu"                     { type = number, default = 2048 }
variable "memory"                  { type = number, default = 916 }
variable "capacity_provider"       { type = string }
variable "cpu_architecture"        { type = string, default = "ARM64" }
variable "health_check_path"       { type = string, default = "/healthcheck" }
variable "initial_desired_count"   { type = number, default = 1 }
variable "scaling_min_count"       { type = number, default = 1 }
variable "scaling_max_count"       { type = number, default = 4 }
variable "scaling_metric_type"     { type = string, default = "ECSServiceAverageCPUUtilization" }
variable "scaling_target_value"    { type = number, default = 80 }
variable "schedule_off_hours_downtime" { type = bool, default = false }
variable "environment_variables"   { type = list(object({ name = string, value = string })), default = [] }

variable "vpc_id"                  { type = string }
variable "private_subnet_ids"      { type = list(string) }
variable "ecs_security_group_ids"  { type = list(string) }
variable "ecs_cluster_name"        { type = string }
variable "alb_listener_arn"        { type = string }
variable "alb_dns_name"            { type = string }
variable "alb_zone_id"             { type = string }
variable "route53_zone_id"         { type = string }
```

```hcl
# infra/modules/ecs_web_service/main.tf
data "aws_region" "current" {}

locals { container_name = "app" }

resource "aws_iam_role" "execution" {
  name = "${var.resource_prefix}--execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "ecs-tasks.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task" {
  name = "${var.resource_prefix}--task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "ecs-tasks.amazonaws.com" } }]
  })
}

resource "aws_cloudwatch_log_group" "logs" {
  name              = "${var.resource_prefix}--logs"
  retention_in_days = 7
}

resource "aws_ecs_task_definition" "web" {
  family                   = "${var.resource_prefix}--task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["EC2"]
  cpu                      = var.cpu
  memory                   = var.memory
  task_role_arn            = aws_iam_role.task.arn
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = var.cpu_architecture
  }

  container_definitions = jsonencode([{
    name        = local.container_name
    image       = var.container_image
    essential   = true
    environment = var.environment_variables
    portMappings = [{ protocol = "tcp", containerPort = var.container_port, hostPort = var.container_port }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.logs.name
        "awslogs-region"        = data.aws_region.current.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

resource "aws_lb_target_group" "web" {
  name        = "${var.resource_prefix}--tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
  health_check {
    path     = var.health_check_path
    protocol = "HTTP"
    matcher  = "200-299"
  }
}

resource "aws_lb_listener_rule" "web" {
  listener_arn = var.alb_listener_arn
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
  condition {
    host_header { values = ["${var.subdomain}.${var.domain}"] }
  }
  lifecycle { replace_triggered_by = [aws_lb_target_group.web.arn] }
}

resource "aws_ecs_service" "web" {
  name            = "${var.resource_prefix}--service"
  cluster         = var.ecs_cluster_name
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = var.initial_desired_count

  capacity_provider_strategy {
    capacity_provider = var.capacity_provider
    base              = 0
    weight            = 1
  }
  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = var.ecs_security_group_ids
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = local.container_name
    container_port   = var.container_port
  }
  deployment_circuit_breaker { enable = true; rollback = true }

  depends_on = [aws_lb_listener_rule.web]
  lifecycle  { ignore_changes = [desired_count] }   # autoscaling/CI owns scale
}

# Route53 alias in the DNS account
resource "aws_route53_record" "service" {
  provider = aws.commercial
  zone_id  = var.route53_zone_id
  name     = "${var.subdomain}.${var.domain}"
  type     = "A"
  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
```

## 5. Autoscaling — target tracking + scheduled

```hcl
# infra/modules/ecs_web_service/autoscaling.tf
resource "aws_appautoscaling_target" "ecs" {
  resource_id        = "service/${var.ecs_cluster_name}/${aws_ecs_service.web.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
  min_capacity       = var.scaling_min_count
  max_capacity       = var.scaling_max_count
}

resource "aws_appautoscaling_policy" "ecs" {
  name               = "${aws_ecs_service.web.name}-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification { predefined_metric_type = var.scaling_metric_type }
    target_value       = var.scaling_target_value
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
}

resource "aws_appautoscaling_scheduled_action" "scale_up" {
  count              = var.schedule_off_hours_downtime ? 1 : 0
  name               = "Business Hours Scale Up"
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  schedule           = "cron(0 8 ? * MON-FRI *)"
  timezone           = "America/New_York"
  scalable_target_action { min_capacity = var.scaling_min_count; max_capacity = var.scaling_max_count }
}

resource "aws_appautoscaling_scheduled_action" "scale_down" {
  count              = var.schedule_off_hours_downtime ? 1 : 0
  name               = "Business Hours Scale Down"
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  schedule           = "cron(0 17 ? * MON-FRI *)"
  timezone           = "America/Los_Angeles"
  scalable_target_action { min_capacity = 0; max_capacity = 0 }
}
```

## 6. Instantiate the service

```hcl
# infra/environment/ecs_service.tf
module "service" {
  source = "../modules/ecs_web_service"

  resource_prefix        = local.resource_prefix
  environment            = local.environment
  subdomain              = local.project
  domain                 = "${local.environment}.acme.example.com"
  container_image        = "registry.example.com/acme/${local.project}:${var.app_version}"
  capacity_provider      = module.ecs_autoscaling_groups["t4g-small"].ecs_capacity_provider_name

  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  ecs_security_group_ids = [module.vpc.ecs_security_group_id]
  ecs_cluster_name       = aws_ecs_cluster.default.name
  alb_listener_arn       = aws_lb_listener.https.arn
  alb_dns_name           = aws_lb.ecs_alb.dns_name
  alb_zone_id            = aws_lb.ecs_alb.zone_id
  route53_zone_id        = var.route53_zone_id

  schedule_off_hours_downtime = local.is_temp_environment

  environment_variables = [
    { name = "APP_ENVIRONMENT", value = local.environment },
    { name = "RESOURCE_PREFIX", value = local.resource_prefix },
  ]

  providers = {
    aws            = aws
    aws.commercial = aws.commercial
  }
}
```

## Verify

```bash
# Cluster + capacity providers
aws ecs describe-clusters --clusters acme-platform-dev--default --profile acme-dev \
  --query 'clusters[0].[status,capacityProviders]'

# Service steady state
aws ecs describe-services --cluster acme-platform-dev--default \
  --services acme-platform-dev--service --profile acme-dev \
  --query 'services[0].[runningCount,desiredCount,deployments[0].rolloutState]'

# App responds through ALB
curl -fsS https://acme-platform.dev.acme.example.com/healthcheck
```
