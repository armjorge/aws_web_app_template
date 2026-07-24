/**
 * AWS Cognito user pool + public SPA app client.
 * No persistent application database for users — Cognito is the identity store.
 */

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    Module      = "auth"
  })
}

resource "aws_cognito_user_pool" "main" {
  name = "${local.name_prefix}-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = var.password_minimum_length
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    mutable             = true
    required            = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  tags = local.tags
}

resource "aws_cognito_user_pool_client" "spa" {
  name         = "${local.name_prefix}-spa"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret               = false
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true

  # SRP is the default SPA path; OAuth/hosted UI is opt-in via enable_hosted_ui.
  allowed_oauth_flows_user_pool_client = var.enable_hosted_ui
  allowed_oauth_flows                  = var.enable_hosted_ui ? ["code"] : []
  allowed_oauth_scopes                 = var.enable_hosted_ui ? ["email", "openid", "profile"] : []
  callback_urls                        = var.enable_hosted_ui ? var.callback_urls : []
  logout_urls                          = var.enable_hosted_ui ? var.logout_urls : []
  supported_identity_providers         = var.enable_hosted_ui ? ["COGNITO"] : null

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
  ]

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  count = var.enable_hosted_ui ? 1 : 0

  domain       = "${local.name_prefix}-auth"
  user_pool_id = aws_cognito_user_pool.main.id
}
