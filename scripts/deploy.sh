#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo " AI Assistant Platform 一键部署"
echo "=========================================="
echo ""

bash "$SCRIPT_DIR/docker-build-push.sh"

echo ""
echo "------------------------------------------"
echo ""

SKIP_PULL=1 bash "$SCRIPT_DIR/docker-deploy-server.sh"

echo ""
echo "=========================================="
echo " 一键部署全部完成"
echo "=========================================="
