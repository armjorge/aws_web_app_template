#!/usr/bin/env bash
# Build a Lambda deployment zip at backend/dist/lambda.zip
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
BUILD_DIR="${DIST_DIR}/build"
ZIP_PATH="${DIST_DIR}/lambda.zip"

resolve_python() {
  if [[ -n "${PYTHON_BIN:-}" ]]; then
    echo "${PYTHON_BIN}"
    return
  fi
  if [[ -x "${ROOT_DIR}/.venv/bin/python" ]]; then
    echo "${ROOT_DIR}/.venv/bin/python"
    return
  fi
  if command -v python3.13 >/dev/null 2>&1; then
    echo "python3.13"
    return
  fi
  if command -v uv >/dev/null 2>&1 && uv python find 3.13 >/dev/null 2>&1; then
    uv python find 3.13
    return
  fi
  echo "python3"
}

PYTHON_BIN="$(resolve_python)"

echo "==> Using ${PYTHON_BIN} ($("${PYTHON_BIN}" --version 2>&1))"
echo "==> Cleaning previous build"
rm -rf "${DIST_DIR}"
mkdir -p "${BUILD_DIR}"

echo "==> Installing dependencies into build/"
# Prefer uv (works with uv-created venvs that omit pip). Binary wheels for the
# local platform are fine for packaging on the same arch you deploy with
# (or use a Linux CI runner / container for production zips).
if command -v uv >/dev/null 2>&1; then
  uv pip install \
    --python "${PYTHON_BIN}" \
    --target "${BUILD_DIR}" \
    -r "${ROOT_DIR}/requirements.txt"
else
  "${PYTHON_BIN}" -m pip install \
    --upgrade \
    --target "${BUILD_DIR}" \
    -r "${ROOT_DIR}/requirements.txt"
fi

echo "==> Copying application source"
cp -R "${ROOT_DIR}/app" "${BUILD_DIR}/app"

echo "==> Creating ${ZIP_PATH}"
(
  cd "${BUILD_DIR}"
  find . -type d -name "__pycache__" -prune -exec rm -rf {} +
  find . -type f -name "*.pyc" -delete
  zip -r9 "${ZIP_PATH}" . -x "*.pyc" "*__pycache__*"
)

echo "==> Done: ${ZIP_PATH}"
ls -lh "${ZIP_PATH}"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "==> Warning: built on $(uname -s). For AWS Lambda, re-run this script on Linux (CI/container) so native wheels match the runtime."
fi
