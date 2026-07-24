# Infrastructure

Modular OpenTofu / Terraform for a zero fixed-cost serverless stack:

| Module | Path | Resources |
|--------|------|-----------|
| Frontend | `modules/frontend` | Private S3 + CloudFront **OAC** + SPA 403/404 → `index.html` |
| Auth | `modules/auth` | Cognito User Pool, SPA client (SRP), optional Hosted UI + Google |
| API | `modules/api` | HTTP API + Lambda (no VPC / NAT) |

Environments: `envs/dev`, `envs/prod`. Feature flags keep modules removable.

## Fresh deploy (dev)

Full walkthrough: root [README](../README.md#deploy-from-scratch-dev).

```bash
# 1) Package Lambda (when enable_api = true)
./backend/scripts/package.sh

# 2) Configure
cd infra/envs/dev
cp terraform.tfvars.example terraform.tfvars

# 3) Apply (CloudFront URL is merged into CORS/Cognito automatically)
tofu init
tofu plan -out=tfplan
tofu apply tfplan
tofu output
```

Then wire `frontend/.env` and publish:

```bash
./scripts/deploy-frontend.sh
```

### Useful outputs

| Output | Use |
|--------|-----|
| `frontend_site_url` | Browser entrypoint (also auto-wired into CORS/Cognito) |
| `frontend_bucket_name` | `aws s3 sync` target |
| `frontend_distribution_id` | CloudFront invalidation |
| `api_endpoint` | `VITE_API_BASE_URL` |
| `cognito_user_pool_id` / `cognito_user_pool_client_id` | Frontend Cognito config |
| `cognito_hosted_ui_domain` | `VITE_COGNITO_DOMAIN` |
| `cognito_hosted_ui_base_url` | Google OAuth redirect base |
| `cognito_google_enabled` | Whether Google IdP was created |

### Notes

- Cognito hosted domain prefixes **cannot contain `aws`**; the auth module strips a leading `aws-` from `project_name`.
- OAuth callback path must be `/auth/callback`.
- Optional Google: set `google_client_id` + `google_client_secret` in tfvars, then `VITE_ENABLE_GOOGLE_AUTH=true` on the frontend.
- Put only **extra** origins (localhost / custom domains) in tfvars — CloudFront is appended by the env composition.
