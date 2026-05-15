#!/usr/bin/env bash

set -euo pipefail

# Docker Hub 命名空间（组织名），用于拼接完整镜像仓库地址
DOCKER_NAMESPACE="yafenghuang777"

# Docker Hub 登录用户名
DOCKER_USERNAME="yafenghuang777"

# Docker Hub 登录密码
DOCKER_PASSWORD="5820@Feng"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/docker-common.sh"

resolve_deploy_settings

if [[ -z "${DOCKER_PASSWORD:-}" ]]; then
  echo "请在 scripts/docker-build-push.sh 中配置 DOCKER_PASSWORD。" >&2
  exit 1
fi

print_deploy_settings

echo "==> 登录 Docker Hub"
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

echo "==> 构建镜像"
docker build \
  --platform "$DOCKER_PLATFORM" \
  --build-arg NODE_VERSION="$NODE_VERSION" \
  --build-arg PNPM_VERSION="$PNPM_VERSION" \
  --build-arg APP_ENV="$APP_ENV" \
  -t "$FULL_IMAGE_NAME" \
  "$PROJECT_ROOT"

echo "==> 推送到 Docker Hub"
docker push "$FULL_IMAGE_NAME"

save_deploy_state

echo "==> 构建并推送完成"
echo "镜像: $FULL_IMAGE_NAME"
