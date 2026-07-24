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

> **Note:** Packaging on macOS produces macOS wheels. For production deploys, run the script on Linux (CI runner or container) so native deps match the Lambda runtime.
