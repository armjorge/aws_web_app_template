# Infrastructure

Modular OpenTofu / Terraform for a zero fixed-cost serverless stack:

| Module | Path | Resources |
|--------|------|-----------|
| Frontend | `modules/frontend` | Private S3 + CloudFront **OAC** |
| Auth | `modules/auth` | Cognito User Pool + SPA client |
| API | `modules/api` | HTTP API + Lambda (no VPC / NAT) |

Environments live under `envs/dev` and `envs/prod`. Feature flags (`enable_frontend`, `enable_auth`, `enable_api`) keep modules removable.

## Quick apply (dev)

```bash
# 1) Package the Lambda zip (required when enable_api = true)
./backend/scripts/package.sh

# 2) Configure variables
cd infra/envs/dev
cp terraform.tfvars.example terraform.tfvars

# 3) Init / plan / apply
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

Copy Cognito and API outputs into `frontend/.env` (see root README).
