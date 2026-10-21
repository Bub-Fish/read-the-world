#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd -- "$project_dir"

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  printf '%s\n' '请先执行：pkg update && pkg install nodejs-lts npm unzip'
  exit 1
fi

# Match the jsdom dependency's supported Node releases.
node --input-type=module -e '
  const [major, minor, patch] = process.versions.node.split(".").map(Number);
  const supported = (major === 22 && (minor > 22 || (minor === 22 && patch >= 2)))
    || (major === 24 && minor >= 15) || major >= 26;
  if (!supported) {
    console.error("Node 版本过低或不受支持：" + process.versions.node);
    console.error("请执行 pkg update && pkg upgrade，再安装 nodejs-lts。");
    process.exit(1);
  }
'

if [[ ! -f dist/index.html ]]; then
  printf '%s\n' '未找到预构建页面，请使用电脑生成的 readworld-android.zip 部署包。'
  exit 1
fi

printf '%s\n' '正在安装手机运行依赖（不在手机上编译前端）……'
npm ci --omit=dev --no-audit --no-fund
node --input-type=module -e '
  await Promise.all([import("express"), import("jsdom"), import("undici"), import("zod")]);
  console.log("运行依赖检查通过。");
'
printf '%s\n' '安装完成。启动命令：bash deploy/android/start.sh'
