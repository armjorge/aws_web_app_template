#!/usr/bin/env bash
# Build the Vite SPA and publish it to the env's S3 + CloudFront.
#
# Usage:
#   ./scripts/deploy-frontend.sh           # defaults to infra/envs/dev
#   ./scripts/deploy-frontend.sh prod
#
# Requires: npm, aws CLI, tofu, and frontend/.env already wired to that env.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_NAME="${1:-dev}"
ENV_DIR="${ROOT_DIR}/infra/envs/${ENV_NAME}"
FRONTEND_DIR="${ROOT_DIR}/frontend"

if [[ ! -d "${ENV_DIR}" ]]; then
  echo "Unknown env '${ENV_NAME}'. Expected directory: ${ENV_DIR}" >&2
  exit 1
fi

if [[ ! -f "${FRONTEND_DIR}/.env" ]]; then
  echo "Missing ${FRONTEND_DIR}/.env — copy .env.example and fill from 'tofu output'." >&2
  exit 1
fi

echo "==> Env: ${ENV_NAME}"
BUCKET_NAME="$(cd "${ENV_DIR}" && tofu output -raw frontend_bucket_name)"
DISTRIBUTION_ID="$(cd "${ENV_DIR}" && tofu output -raw frontend_distribution_id)"
SITE_URL="$(cd "${ENV_DIR}" && tofu output -raw frontend_site_url)"

echo "==> Installing frontend deps (if needed)"
cd "${FRONTEND_DIR}"
if [[ ! -d node_modules ]]; then
  npm install
fi

echo "==> Building SPA (VITE_* from .env are baked in here)"
npm run build

echo "==> Syncing dist/ → s3://${BUCKET_NAME}"
aws s3 sync dist/ "s3://${BUCKET_NAME}/" --delete

echo "==> Invalidating CloudFront ${DISTRIBUTION_ID}"
INVALIDATION_ID="$(
  aws cloudfront create-invalidation \
    --distribution-id "${DISTRIBUTION_ID}" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text
)"

echo "==> Done"
echo "    site:          ${SITE_URL}"
echo "    bucket:        ${BUCKET_NAME}"
echo "    invalidation:  ${INVALIDATION_ID}"
