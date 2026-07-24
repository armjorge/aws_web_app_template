/**
 * Dev environment composition — wires reusable modules with feature toggles.
 * Apply from this directory after packaging the backend Lambda zip.
 */

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }

  # Uncomment and configure for remote state (recommended for teams/CI):
  # backend "s3" {
  #   bucket         = "YOUR_TF_STATE_BUCKET"
  #   key            = "aws-web-app/dev/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "YOUR_TF_LOCK_TABLE"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(var.tags, {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "opentofu"
    })
  }
}

module "auth" {
  count  = var.enable_auth ? 1 : 0
  source = "../../modules/auth"

  project_name         = var.project_name
  environment          = var.environment
  callback_urls        = var.cognito_callback_urls
  logout_urls          = var.cognito_logout_urls
  enable_hosted_ui     = var.enable_hosted_ui
  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret
}

module "frontend" {
  count  = var.enable_frontend ? 1 : 0
  source = "../../modules/frontend"

  project_name = var.project_name
  environment  = var.environment
}

module "api" {
  count  = var.enable_api ? 1 : 0
  source = "../../modules/api"

  project_name                = var.project_name
  environment                 = var.environment
  aws_region                  = var.aws_region
  lambda_zip_path             = var.lambda_zip_path
  cors_allow_origins          = var.cors_allow_origins
  enable_cognito_auth         = var.enable_cognito_auth_on_api && var.enable_auth
  cognito_user_pool_id        = try(module.auth[0].user_pool_id, "")
  cognito_user_pool_client_id = try(module.auth[0].user_pool_client_id, "")
}
