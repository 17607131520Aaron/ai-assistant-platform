#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_STATE_DIR="$PROJECT_ROOT/.deploy"
DEPLOY_STATE_FILE="$DEPLOY_STATE_DIR/last-image.env"
COMPOSE_FILE="$PROJECT_ROOT/docker/docker-compose.remote.yml"

# 终端环境选择菜单中，直接按回车时使用的默认环境（test | production）
DEFAULT_APP_ENV="test"

# Docker 镜像基础名称，最终镜像名为：<基础名>-<环境>-<时间戳>
DEFAULT_IMAGE_BASE_NAME="ai-assistant-platform"

# 远程服务器上的部署目录，compose 文件与容器会在此目录管理
DEFAULT_REMOTE_APP_DIR="/opt/ai-assistant-platform"

# 容器内使用的时区
DEFAULT_TZ="Asia/Shanghai"

# Docker 构建时使用的 Node.js 基础镜像版本
DEFAULT_NODE_VERSION="25-alpine"

# Docker 构建镜像内安装的 pnpm 版本
DEFAULT_PNPM_VERSION="10.33.0"

# Docker 镜像构建目标平台（云服务器多为 linux/amd64）
DEFAULT_DOCKER_PLATFORM="linux/amd64"

# 本地临时导出的镜像 tar 包路径，上传服务器前会保存到此文件
DEFAULT_IMAGE_TAR_PATH="/tmp/ai-assistant-platform.tar"

load_deploy_state() {
  if [[ -f "$DEPLOY_STATE_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$DEPLOY_STATE_FILE"
  fi
}

save_deploy_state() {
  mkdir -p "$DEPLOY_STATE_DIR"
  cat >"$DEPLOY_STATE_FILE" <<EOF
FULL_IMAGE_NAME='$FULL_IMAGE_NAME'
APP_ENV='$APP_ENV'
IMAGE_TAG='$IMAGE_TAG'
TIMESTAMP='$TIMESTAMP'
DOCKER_NAMESPACE='$DOCKER_NAMESPACE'
IMAGE_BASE_NAME='$IMAGE_BASE_NAME'
HOST_PORT='$HOST_PORT'
CONTAINER_PORT='$CONTAINER_PORT'
CONTAINER_NAME='$CONTAINER_NAME'
REMOTE_APP_DIR='$REMOTE_APP_DIR'
IMAGE_TAR_PATH='$IMAGE_TAR_PATH'
EOF
}

default_host_port() {
  case "$1" in
    test) echo "8080" ;;
    production) echo "80" ;;
    *)
      echo "Unsupported APP_ENV: $1 (only test and production are supported)" >&2
      exit 1
      ;;
  esac
}

build_image_tag() {
  local env_name="$1"
  local timestamp="$2"
  local base_name="$3"
  printf '%s-%s-%s' "$base_name" "$env_name" "$timestamp"
}

build_full_image_name() {
  local namespace="$1"
  local image_tag="$2"
  printf '%s/%s:latest' "$namespace" "$image_tag"
}

choose_environment() {
  local default_env="${1:-$DEFAULT_APP_ENV}"
  local options=("test" "production")
  local selected

  echo "请选择部署环境:" >&2
  PS3="输入序号 (默认: $default_env): "
  select selected in "${options[@]}"; do
    if [[ -n "${selected:-}" ]]; then
      printf '%s\n' "$selected"
      return
    fi

    if [[ -z "${REPLY:-}" ]]; then
      printf '%s\n' "$default_env"
      return
    fi

    echo "无效选择，请重新输入。" >&2
  done
}

run_ssh() {
  if [[ -n "${SERVER_PASSWORD:-}" ]]; then
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$@"
  else
    ssh "$@"
  fi
}

run_scp() {
  if [[ -n "${SERVER_PASSWORD:-}" ]]; then
    sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no "$@"
  else
    scp "$@"
  fi
}

require_command() {
  local cmd="$1"
  local hint="$2"

  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "$hint" >&2
    exit 1
  fi
}

ensure_sshpass_if_needed() {
  if [[ -n "${SERVER_PASSWORD:-}" ]]; then
    require_command sshpass "已配置 SERVER_PASSWORD，请先安装 sshpass：brew install sshpass"
  fi
}

resolve_deploy_settings() {
  APP_ENV="${APP_ENV:-}"
  DOCKER_NAMESPACE="${DOCKER_NAMESPACE:-}"
  DOCKER_USERNAME="${DOCKER_USERNAME:-}"
  DOCKER_PASSWORD="${DOCKER_PASSWORD:-}"
  IMAGE_BASE_NAME="${IMAGE_BASE_NAME:-$DEFAULT_IMAGE_BASE_NAME}"
  SERVER_HOST="${SERVER_HOST:-}"
  SERVER_USER="${SERVER_USER:-}"
  SERVER_PASSWORD="${SERVER_PASSWORD:-}"
  REMOTE_APP_DIR="${REMOTE_APP_DIR:-$DEFAULT_REMOTE_APP_DIR}"
  TZ_VALUE="${TZ:-$DEFAULT_TZ}"
  NODE_VERSION="${NODE_VERSION:-$DEFAULT_NODE_VERSION}"
  PNPM_VERSION="${PNPM_VERSION:-$DEFAULT_PNPM_VERSION}"
  DOCKER_PLATFORM="${DOCKER_PLATFORM:-$DEFAULT_DOCKER_PLATFORM}"
  IMAGE_TAR_PATH="${IMAGE_TAR_PATH:-$DEFAULT_IMAGE_TAR_PATH}"
  FULL_IMAGE_NAME="${FULL_IMAGE_NAME:-}"
  TIMESTAMP="${TIMESTAMP:-}"

  if [[ -z "$APP_ENV" && -t 0 ]]; then
    APP_ENV="$(choose_environment "$DEFAULT_APP_ENV")"
  fi
  APP_ENV="${APP_ENV:-$DEFAULT_APP_ENV}"

  DOCKER_NAMESPACE="${DOCKER_NAMESPACE:-$DOCKER_USERNAME}"

  HOST_PORT="${HOST_PORT:-$(default_host_port "$APP_ENV")}"
  CONTAINER_PORT="${CONTAINER_PORT:-3000}"
  CONTAINER_NAME="${CONTAINER_NAME:-ai-assistant-platform-${APP_ENV}}"

  if [[ -z "$TIMESTAMP" ]]; then
    TIMESTAMP="$(date +%Y%m%d%H%M%S)"
  fi

  IMAGE_TAG="${IMAGE_TAG:-$(build_image_tag "$APP_ENV" "$TIMESTAMP" "$IMAGE_BASE_NAME")}"
  FULL_IMAGE_NAME="${FULL_IMAGE_NAME:-$(build_full_image_name "$DOCKER_NAMESPACE" "$IMAGE_TAG")}"
}

print_deploy_settings() {
  echo "==> 部署参数"
  echo "环境 APP_ENV: $APP_ENV"
  echo "镜像标签: $IMAGE_TAG"
  echo "完整镜像名: $FULL_IMAGE_NAME"
  echo "构建平台: $DOCKER_PLATFORM"
  echo "Node 版本: $NODE_VERSION"
  echo "服务器: $SERVER_USER@$SERVER_HOST"
  echo "远程目录: $REMOTE_APP_DIR"
  echo "端口映射: $HOST_PORT -> $CONTAINER_PORT"
  echo "容器名称: $CONTAINER_NAME"
}
