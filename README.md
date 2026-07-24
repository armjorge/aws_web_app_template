# AWS Web App Template

Productized serverless template: **Vite + React + TypeScript + Tailwind** frontend, **FastAPI on AWS Lambda** backend, **Cognito** auth (email/password, password recovery, optional Google), **PostHog** analytics, and **OpenTofu** infrastructure (S3 + CloudFront OAC, HTTP API, Cognito).

Designed for **zero fixed cost at rest** — no EC2, RDS, or NAT gateways. Everything is pay-per-request.

```
.
├── backend/          # FastAPI app + Lambda packaging
├── frontend/         # Vite React SPA (login → Hello World)
├── infra/
│   ├── modules/      # Reusable: frontend, api, auth
│   └── envs/         # dev + prod compositions
└── README.md
```

## Prerequisites

| Tool | Purpose | Notes |
|------|---------|--------|
| [OpenTofu](https://opentofu.org/) ≥ 1.6 | Infrastructure | `brew install opentofu` |
| [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) v2 | Credentials / deploys | `aws configure` or `aws login` |
| Node.js ≥ 20 + npm | Frontend | |
| Python ≥ 3.13 | Backend | Matches Lambda runtime |
| zip | Lambda packaging | Usually preinstalled |

Optional: [uv](https://github.com/astral-sh/uv) for local Python tooling.

## Deploy from scratch (dev)

End-to-end path if you are creating the stack for the first time (or after a destroy).

### 1. Clone and verify AWS credentials

```bash
git clone <your-fork-url> aws_web_app_template
cd aws_web_app_template
aws sts get-caller-identity
```

### 2. Package the backend Lambda

Required when `enable_api = true`:

```bash
./backend/scripts/package.sh
# → backend/dist/lambda.zip
```

### 3. First infrastructure apply

```bash
cd infra/envs/dev
cp terraform.tfvars.example terraform.tfvars
# Optional: edit project_name, region, Google credentials, tags
tofu init
tofu plan -out=tfplan
tofu apply tfplan
tofu output
```

Important defaults in `terraform.tfvars.example`:

- `enable_hosted_ui = true` — Cognito domain + OAuth (needed for Google later)
- Callback URL path is `/auth/callback` (not `/`)
- Cognito domain prefix strips a leading `aws-` from `project_name` (Cognito rejects the reserved word `aws`)

### 4. Wire the frontend to outputs

```bash
cd ../../../frontend
cp .env.example .env
```

Fill `frontend/.env` from `tofu output`:

```bash
VITE_API_BASE_URL=<api_endpoint>
VITE_COGNITO_USER_POOL_ID=<cognito_user_pool_id>
VITE_COGNITO_USER_POOL_CLIENT_ID=<cognito_user_pool_client_id>
VITE_COGNITO_DOMAIN=<cognito_hosted_ui_domain>
VITE_AWS_REGION=us-east-1
VITE_ENABLE_AUTH=true
VITE_ENABLE_GOOGLE_AUTH=false
```

### 5. Build and publish the SPA

```bash
cd frontend
npm install
npm run build

aws s3 sync dist/ s3://$(cd ../infra/envs/dev && tofu output -raw frontend_bucket_name)/ --delete
aws cloudfront create-invalidation \
  --distribution-id "$(cd ../infra/envs/dev && tofu output -raw frontend_distribution_id)" \
  --paths "/*"
```

Site URL: `tofu output -raw frontend_site_url`

### 6. Second apply — allow the CloudFront origin

After the first apply you have a real CloudFront URL. Add it to CORS and Cognito URLs, then re-apply:

```hcl
# infra/envs/dev/terraform.tfvars
cors_allow_origins = [
  "http://localhost:5173",
  "https://YOUR_DISTRIBUTION.cloudfront.net",
]

cognito_callback_urls = [
  "http://localhost:5173/auth/callback",
  "https://YOUR_DISTRIBUTION.cloudfront.net/auth/callback",
]

cognito_logout_urls = [
  "http://localhost:5173/",
  "https://YOUR_DISTRIBUTION.cloudfront.net/",
]
```

```bash
cd infra/envs/dev
tofu plan -out=tfplan
tofu apply tfplan
```

Open the CloudFront URL → you should land on **Sign in**. Create an account, confirm the email code, sign in → **Hello, world**.

### Destroy and recreate

```bash
cd infra/envs/dev
tofu destroy
# then repeat steps 2–6
```

`force_destroy` is enabled on the dev site bucket so destroy can empty S3 automatically. Prod keeps stricter defaults.

---

## Auth flows

| Flow | How |
|------|-----|
| Sign up / sign in | Email + password via Cognito SRP (`/signup`, `/login`) |
| Password recovery | `/forgot-password` (verification code emailed by Cognito) |
| Post-login | Protected `/` Hello World page |
| Google (optional) | Hosted UI + PKCE; see below |

### Optional Google sign-in

1. In Google Cloud Console, create an OAuth **Web** client.
2. Authorized redirect URI (from `tofu output cognito_hosted_ui_base_url`):

   `https://<cognito_hosted_ui_domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse`

3. In `terraform.tfvars`:

   ```hcl
   google_client_id     = "...."
   google_client_secret = "...."
   ```

4. `tofu apply`, then in `frontend/.env` set `VITE_ENABLE_GOOGLE_AUTH=true`, rebuild, and re-sync to S3.

---

## Local development

### Backend

```bash
cd backend
uv venv --python 3.13 .venv
source .venv/bin/activate
uv pip install -r requirements.txt
# or: python3.13 -m venv .venv && pip install -r requirements.txt

cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

- Health: http://localhost:8000/health
- Docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
cp .env.example .env
# Point Cognito vars at your deployed pool (or leave blank to see the “not configured” UI)
npm install
npm run dev
```

App: http://localhost:5173

### Frontend environment variables

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend base URL |
| `VITE_COGNITO_USER_POOL_ID` | `tofu output cognito_user_pool_id` |
| `VITE_COGNITO_USER_POOL_CLIENT_ID` | `tofu output cognito_user_pool_client_id` |
| `VITE_COGNITO_DOMAIN` | `tofu output cognito_hosted_ui_domain` (OAuth / Google) |
| `VITE_AWS_REGION` | Cognito region |
| `VITE_ENABLE_AUTH` | Toggle Cognito UI/hooks |
| `VITE_ENABLE_GOOGLE_AUTH` | Show “Continue with Google” |
| `VITE_ENABLE_ANALYTICS` | Toggle PostHog provider |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | PostHog (blank key = no-op) |

---

## Infrastructure modules

| Module | What it creates |
|--------|-----------------|
| `modules/frontend` | Private S3 + CloudFront with **OAC** + SPA fallback |
| `modules/auth` | Cognito User Pool, SPA client (SRP), optional Hosted UI + Google IdP |
| `modules/api` | HTTP API + Lambda (optional Cognito JWT authorizer) |

Feature flags: `enable_frontend`, `enable_auth`, `enable_api`, `enable_hosted_ui`, `enable_cognito_auth_on_api`.

### Prod

Same flow under `infra/envs/prod`. Set real CORS/callback URLs in `terraform.tfvars`. Prefer a remote S3 backend for state (commented stub in `main.tf`).

---

## Architecture notes

- **No VPC on Lambda** — avoids NAT Gateway hourly cost.
- **S3 is private**; CloudFront reads via OAC (not public ACLs).
- **Cognito** is the user store — no RDS/DynamoDB required for auth.
- **PostHog** is a global provider; leave `VITE_POSTHOG_KEY` empty to disable.
- Secrets stay in env files / tfvars (gitignored) — never hardcode.
- Vite defines `global → globalThis` so `amazon-cognito-identity-js` works in the browser.

## Suggested next steps

1. Enable remote OpenTofu state (S3 + lock table).
2. Add GitHub Actions OIDC deploy workflows.
3. Point CloudFront at a custom domain + ACM certificate.
4. Extend FastAPI routers and protect routes via API Gateway JWT.

## License

See [LICENSE](./LICENSE).
