#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/docker-common.sh"

SKIP_PULL="${SKIP_PULL:-0}"

load_deploy_state

# 远程部署服务器的 IP 或域名
SERVER_HOST="120.53.227.126"

# 远程服务器 SSH 登录用户名
SERVER_USER="root"

# 远程服务器 SSH 登录密码（使用密码登录时需安装 sshpass）
SERVER_PASSWORD="5820@Feng"

resolve_deploy_settings

if [[ -z "${FULL_IMAGE_NAME:-}" ]]; then
  echo "未指定镜像。请先运行 docker-build-push.sh。" >&2
  exit 1
fi

if [[ -z "${SERVER_HOST:-}" ]]; then
  echo "请在 scripts/docker-deploy-server.sh 中配置 SERVER_HOST。" >&2
  exit 1
fi

ensure_sshpass_if_needed
print_deploy_settings

if [[ "$SKIP_PULL" != "1" ]]; then
  echo "==> 从 Docker Hub 拉取镜像"
  docker pull "$FULL_IMAGE_NAME"
fi

echo "==> 导出镜像 tar: $IMAGE_TAR_PATH"
docker save "$FULL_IMAGE_NAME" -o "$IMAGE_TAR_PATH"

REMOTE_TAR="/tmp/ai-assistant-platform-${APP_ENV}.tar"

echo "==> 创建远程目录: $SERVER_USER@$SERVER_HOST:$REMOTE_APP_DIR"
run_ssh "$SERVER_USER@$SERVER_HOST" "mkdir -p '$REMOTE_APP_DIR'"

echo "==> 上传镜像到服务器"
run_scp "$IMAGE_TAR_PATH" "$SERVER_USER@$SERVER_HOST:$REMOTE_TAR"

echo "==> 上传 compose 配置"
run_scp "$COMPOSE_FILE" "$SERVER_USER@$SERVER_HOST:$REMOTE_APP_DIR/docker-compose.yml"

REMOTE_CMD=$(cat <<EOF
set -euo pipefail
docker load -i '$REMOTE_TAR'
rm -f '$REMOTE_TAR'
cd '$REMOTE_APP_DIR'
if docker compose version >/dev/null 2>&1; then
  IMAGE_NAME='$FULL_IMAGE_NAME' \
  APP_ENV='$APP_ENV' \
  HOST_PORT='$HOST_PORT' \
  CONTAINER_PORT='$CONTAINER_PORT' \
  CONTAINER_NAME='$CONTAINER_NAME' \
  TZ='$TZ_VALUE' \
  docker compose up -d
elif command -v docker-compose >/dev/null 2>&1; then
  IMAGE_NAME='$FULL_IMAGE_NAME' \
  APP_ENV='$APP_ENV' \
  HOST_PORT='$HOST_PORT' \
  CONTAINER_PORT='$CONTAINER_PORT' \
  CONTAINER_NAME='$CONTAINER_NAME' \
  TZ='$TZ_VALUE' \
  docker-compose up -d
else
  echo '服务器未安装 Docker Compose。' >&2
  exit 1
fi
EOF
)

echo "==> 在服务器上加载镜像并启动容器"
run_ssh "$SERVER_USER@$SERVER_HOST" "$REMOTE_CMD"

echo "==> 清理本地 tar"
rm -f "$IMAGE_TAR_PATH"

save_deploy_state

echo "==> 服务器部署完成"
echo "访问地址: http://$SERVER_HOST:$HOST_PORT"
echo "镜像: $FULL_IMAGE_NAME"
