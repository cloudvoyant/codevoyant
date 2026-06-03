# Lambda + API Gateway Deployment Platform

IAM role, Lambda function whose code lives in S3, REST API Gateway proxy, and the build/package/`update-function-code` flow that ships code out-of-band.

Terraform owns the function *resource*; CI deploys the function *code*. The function therefore `ignore_changes = [s3_bucket, s3_key]`.

## 1. IAM role module (`infra/modules/lambda_role`)

```hcl
# infra/modules/lambda_role/variables.tf
variable "resource_prefix" { type = string }
variable "project"         { type = string }
```

```hcl
# infra/modules/lambda_role/main.tf
data "aws_partition" "current"       {}
data "aws_region" "current"          {}
data "aws_caller_identity" "current" {}

locals {
  partition  = data.aws_partition.current.partition
  region     = data.aws_region.current.region
  account_id = data.aws_caller_identity.current.account_id

  dynamodb = "arn:${local.partition}:dynamodb:${local.region}:${local.account_id}"
  s3       = "arn:${local.partition}:s3::"
  secrets  = "arn:${local.partition}:secretsmanager:${local.region}:${local.account_id}:secret"
}

resource "aws_iam_role" "role" {
  name = "${var.resource_prefix}--role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.role.name
  policy_arn = "arn:${local.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "inline" {
  name = "${var.resource_prefix}--policy"
  role = aws_iam_role.role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:Scan"]
        Resource = ["${local.dynamodb}:table/${var.resource_prefix}--*"]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = ["${local.s3}:${var.resource_prefix}--*"]
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = ["${local.secrets}:${var.project}/*"]
      },
    ]
  })
}

output "role_arn"  { value = aws_iam_role.role.arn }
output "role_name" { value = aws_iam_role.role.name }
```

## 2. Lambda module (`infra/modules/lambda`)

Code comes from an S3 object; `code_template` seeds the function on first apply, then CI overwrites.

```hcl
# infra/modules/lambda/variables.tf
variable "resource_prefix" { type = string }
variable "name"            { type = string }
variable "role_arn"        { type = string }
variable "handler"         { type = string }
variable "runtime"         { type = string, default = "dotnet8" }
variable "artifact_bucket" { type = string }
variable "code_template" {
  type    = string
  default = "lambda-template.zip"
  validation {
    condition     = can(regex(".*\\.zip$", var.code_template))
    error_message = "code_template must be a .zip"
  }
}
variable "timeout"               { type = number, default = 30 }
variable "memory_size"           { type = number, default = 128 }
variable "environment_variables" { type = map(string), default = {} }
variable "security_group_ids"    { type = list(string), default = [] }
variable "subnet_ids"            { type = list(string), default = [] }
```

```hcl
# infra/modules/lambda/main.tf
resource "aws_lambda_function" "lambda" {
  function_name = "${var.resource_prefix}--${var.name}"
  handler       = var.handler
  runtime       = var.runtime
  role          = var.role_arn
  timeout       = var.timeout
  memory_size   = var.memory_size

  s3_bucket = var.artifact_bucket
  s3_key    = var.code_template

  environment {
    variables = merge({ APP_ENVIRONMENT = "set-me" }, var.environment_variables)
  }

  dynamic "vpc_config" {
    for_each = length(var.subnet_ids) > 0 ? [1] : []
    content {
      security_group_ids = var.security_group_ids
      subnet_ids         = var.subnet_ids
    }
  }

  lifecycle {
    # Code is deployed out-of-band by CI (aws lambda update-function-code).
    ignore_changes = [s3_bucket, s3_key]
  }
}

output "lambda_name"       { value = aws_lambda_function.lambda.function_name }
output "lambda_arn"        { value = aws_lambda_function.lambda.arn }
output "lambda_invoke_arn" { value = aws_lambda_function.lambda.invoke_arn }
```

## 3. API Gateway proxy module (`infra/modules/api_gateway`)

REST API that proxies every path+method to the Lambda (`{proxy+}` + `ANY`, AWS_PROXY integration) with an OPTIONS mock for CORS.

```hcl
# infra/modules/api_gateway/variables.tf
variable "resource_prefix"      { type = string }
variable "lambda_function_name" { type = string }
variable "lambda_invoke_arn"    { type = string }
variable "description"          { type = string, default = "" }
variable "burst_limit"          { type = number, default = 50 }
variable "rate_limit"           { type = number, default = 25 }
```

```hcl
# infra/modules/api_gateway/main.tf
resource "aws_api_gateway_rest_api" "api" {
  name        = "${var.resource_prefix}--api-gateway"
  description = var.description
  endpoint_configuration { types = ["REGIONAL"] }
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "any" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn
  content_handling        = "CONVERT_TO_TEXT"
}

# OPTIONS mock for CORS preflight
resource "aws_api_gateway_method" "options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options" {
  rest_api_id          = aws_api_gateway_rest_api.api.id
  resource_id          = aws_api_gateway_resource.proxy.id
  http_method          = aws_api_gateway_method.options.http_method
  type                 = "MOCK"
  passthrough_behavior = "NEVER"
  request_templates    = { "application/json" = jsonencode({ statusCode = 200 }) }
}

resource "aws_api_gateway_method_response" "options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
  response_models = { "application/json" = "Empty" }
}

resource "aws_api_gateway_integration_response" "options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [aws_api_gateway_method_response.options]
}

resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  # Force a redeploy when methods/integrations change.
  variables = {
    redeploy = md5(join("-", [
      aws_api_gateway_method.any.id,
      aws_api_gateway_integration.lambda.id,
      aws_api_gateway_method.options.id,
      aws_api_gateway_integration.options.id,
    ]))
  }
  lifecycle { create_before_destroy = true }
}

resource "aws_api_gateway_stage" "default" {
  stage_name    = "default"
  rest_api_id   = aws_api_gateway_rest_api.api.id
  deployment_id = aws_api_gateway_deployment.deployment.id
}

resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = aws_api_gateway_stage.default.stage_name
  method_path = "*/*"
  settings {
    throttling_burst_limit = var.burst_limit
    throttling_rate_limit  = var.rate_limit
  }
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*/*"
}

output "invoke_url"  { value = aws_api_gateway_stage.default.invoke_url }
output "rest_api_id" { value = aws_api_gateway_rest_api.api.id }
```

## 4. Wire it in the root

```hcl
# infra/environment/lambda.tf
module "artifacts_bucket" {
  source          = "../modules/s3"
  resource_prefix = local.resource_prefix
  bucket_name     = "artifacts"
}

module "api_role" {
  source          = "../modules/lambda_role"
  resource_prefix = "${local.resource_prefix}-api"
  project         = local.project
}

module "api_lambda" {
  source          = "../modules/lambda"
  resource_prefix = "${local.resource_prefix}-api"
  name            = "backend-api"
  role_arn        = module.api_role.role_arn
  handler         = "Api::Api.Function::FunctionHandler"
  runtime         = "dotnet8"
  artifact_bucket = module.artifacts_bucket.bucket_id
  environment_variables = {
    APP_ENVIRONMENT = local.environment
    RESOURCE_PREFIX = local.resource_prefix
  }
}

module "api_gateway" {
  source               = "../modules/api_gateway"
  resource_prefix      = "${local.resource_prefix}-api"
  lambda_function_name = module.api_lambda.lambda_name
  lambda_invoke_arn    = module.api_lambda.lambda_invoke_arn
  description          = "Backend API for ${local.project}"
}
```

Seed the `code_template` object once before first apply:

```bash
aws s3 cp lambda-template.zip s3://acme-platform-dev--artifacts/lambda-template.zip
```

## 5. Build / package / deploy (`scripts/deploy.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

environment="${1:-dev}"
project="acme-platform"
workspace="$environment"
profile="acme-${environment}"
region="us-east-1"
fn="${project}-${workspace}-api--backend-api"

# Build (example: .NET — any zip-producing build works)
pushd backend/Api >/dev/null
dotnet publish -c Release -o ./bin/Release/net8.0
dotnet lambda package -c Release -o ./bin/Release/net8.0/Api.zip
popd >/dev/null

aws lambda update-function-code \
  --profile "$profile" --region "$region" \
  --function-name "$fn" \
  --zip-file fileb://backend/Api/bin/Release/net8.0/Api.zip > /dev/null

echo "Deployed $fn"
```

For CI separating build from deploy, upload zip to artifacts bucket and point `update-function-code` at `--s3-bucket/--s3-key` instead of `--zip-file`.

## Verify

```bash
aws lambda get-function --function-name acme-platform-dev-api--backend-api \
  --profile acme-dev --query 'Configuration.[State,LastUpdateStatus]'

url=$(cd infra/environment && terraform output -raw api_gateway_invoke_url)
curl -fsS "$url/health"
```
