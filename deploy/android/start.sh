#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd -- "$project_dir"

if ! command -v node >/dev/null || [[ ! -d node_modules || ! -f dist/index.html ]]; then
  printf '%s\n' '请先安装运行环境，再执行：bash deploy/android/install.sh'
  exit 1
fi

export NODE_ENV=production
export PORT="${PORT:-3001}"
export READWORLD_DATA_DIR="${READWORLD_DATA_DIR:-$HOME/.local/share/readworld}"
mkdir -p -- "$READWORLD_DATA_DIR"

printf '手机浏览器打开：http://127.0.0.1:%s\n' "$PORT"
printf '文章及 AI 设置保存在：%s\n' "$READWORLD_DATA_DIR"
printf '%s\n' '按 Ctrl+C 停止；切换到浏览器时请保留 Termux 会话。'
exec node server/index.mjs
