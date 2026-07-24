# Backend

Python FastAPI app packaged for AWS Lambda via Mangum.

## Local development

```bash
cd backend
uv venv --python 3.13 .venv
source .venv/bin/activate
uv pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Health check: `http://localhost:8000/health`

## Package for Lambda

```bash
./scripts/package.sh
```

Produces `backend/dist/lambda.zip` for OpenTofu (`lambda_zip_path`).

Installs **x86_64 manylinux** wheels by default so the zip works on Lambda even when you package from aarch64 / Apple Silicon. Override with `LAMBDA_PLATFORM` if you change the function architecture.
