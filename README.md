# AWS Web App Template

Productized serverless template: **Vite + React + TypeScript + Tailwind** frontend, **FastAPI on AWS Lambda** backend, **Cognito** auth, **PostHog** analytics, and **OpenTofu** infrastructure (S3 + CloudFront OAC, HTTP API, Cognito).

Designed for **zero fixed cost at rest** — no EC2, RDS, or NAT gateways. Everything is pay-per-request.

```
.
├── backend/          # FastAPI app + Lambda packaging
├── frontend/         # Vite React SPA
├── infra/
│   ├── modules/      # Reusable: frontend, api, auth
│   └── envs/         # dev + prod compositions
└── README.md
```

## Prerequisites

| Tool | Purpose | Notes |
|------|---------|--------|
| [OpenTofu](https://opentofu.org/) ≥ 1.6 | Infrastructure | `brew install opentofu` |
| [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) v2 | Credentials / deploys | Configure with `aws configure` or `aws login` |
| Node.js ≥ 20 + npm | Frontend | |
| Python ≥ 3.13 | Backend | Matches Lambda runtime |
| zip | Lambda packaging | Usually preinstalled on macOS |

Optional: [uv](https://github.com/astral-sh/uv) if you prefer it over `pip` for local Python tooling.

## 1. Clone and configure AWS

```bash
git clone <your-fork-url> aws_web_app_template
cd aws_web_app_template

# Ensure credentials are available
aws sts get-caller-identity
```

## 2. Backend (local)

```bash
cd backend
# Prefer Python 3.13 to match the Lambda runtime (uv recommended)
uv venv --python 3.13 .venv
source .venv/bin/activate
uv pip install -r requirements.txt
# or: python3.13 -m venv .venv && pip install -r requirements.txt

cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

- Health: [http://localhost:8000/health](http://localhost:8000/health)
- OpenAPI docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### Package for Lambda

Before applying infra with `enable_api = true`:

```bash
# from repo root
./backend/scripts/package.sh
# → backend/dist/lambda.zip
```

## 3. Frontend (local)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

### Environment variables

All frontend config is via `VITE_*` variables (see `frontend/.env.example`):

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend base URL |
| `VITE_COGNITO_USER_POOL_ID` | From `tofu output cognito_user_pool_id` |
| `VITE_COGNITO_USER_POOL_CLIENT_ID` | From `tofu output cognito_user_pool_client_id` |
| `VITE_AWS_REGION` | Cognito region |
| `VITE_ENABLE_AUTH` | Toggle Cognito UI/hooks |
| `VITE_ENABLE_ANALYTICS` | Toggle PostHog provider |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | PostHog project (blank = no-op) |

## 4. Infrastructure (OpenTofu)

Modules:

| Module | What it creates |
|--------|-----------------|
| `modules/frontend` | Private S3 bucket + CloudFront with **Origin Access Control** |
| `modules/auth` | Cognito User Pool + public SPA client (SRP) |
| `modules/api` | HTTP API + Lambda (optional Cognito JWT authorizer) |

Feature flags in each env (`enable_frontend`, `enable_auth`, `enable_api`) keep modules removable.

### Apply (dev)

```bash
# Package backend first if API is enabled
./backend/scripts/package.sh

cd infra/envs/dev
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars as needed

tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

### Wire frontend to deployed outputs

```bash
tofu output
```

Copy into `frontend/.env`:

```bash
VITE_API_BASE_URL=<api_endpoint>
VITE_COGNITO_USER_POOL_ID=<cognito_user_pool_id>
VITE_COGNITO_USER_POOL_CLIENT_ID=<cognito_user_pool_client_id>
VITE_AWS_REGION=us-east-1
```

After the first CloudFront URL exists, add it to Cognito callback/logout URLs and API CORS (`cors_allow_origins`) in `terraform.tfvars`, then re-apply.

### Deploy frontend static assets

```bash
cd frontend
npm run build

aws s3 sync dist/ s3://$(cd ../infra/envs/dev && tofu output -raw frontend_bucket_name)/ --delete
aws cloudfront create-invalidation \
  --distribution-id "$(cd ../infra/envs/dev && tofu output -raw frontend_distribution_id)" \
  --paths "/*"
```

### Prod

Same flow under `infra/envs/prod`. Set real CORS/callback URLs in `terraform.tfvars` (see `terraform.tfvars.example`). Prefer a remote S3 backend for state (commented stub in `main.tf`).

## Architecture notes

- **No VPC on Lambda** — avoids NAT Gateway hourly cost.
- **S3 is private**; CloudFront reads via OAC + bucket policy (not public ACLs).
- **Cognito** is the user store — no RDS/DynamoDB required for auth.
- **PostHog** is a global provider; leave `VITE_POSTHOG_KEY` empty to disable.
- Secrets stay in env files / AWS Parameter Store patterns — never hardcode.

## Suggested next steps

1. Enable remote OpenTofu state (S3 + DynamoDB lock table).
2. Add GitHub Actions OIDC deploy workflows.
3. Point CloudFront at a custom domain + ACM certificate.
4. Extend FastAPI routers and protect routes via API Gateway JWT.

## License

See [LICENSE](./LICENSE).
