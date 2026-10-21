# 安卓手机本机部署

这个方案把前端页面、Node.js 后端和文章数据库放在安卓手机上运行。电脑可以关机，手机使用自己的浏览器访问本机服务。AI 生成和媒体抓取仍需要联网；需要在手机的应用设置中填写 AI 接口与密钥。

这是一套 Termux 本机部署方案，不是 APK。部署包包含完整项目源码、已构建页面、依赖锁文件和安装脚本，手机无需重新编译前端。默认只监听手机本机的 `127.0.0.1`。

## 1. 安装 Termux

使用安卓 7 或更高版本，建议较新的 64 位安卓手机。从 [F-Droid 的 Termux 页面](https://f-droid.org/en/packages/com.termux/) 下载 APK 安装，或使用 [Termux 官方 GitHub Releases](https://github.com/termux/termux-app/releases) 中适配 Android 7+ 的版本。

打开 Termux，执行以下命令。若询问是否继续，输入 `y`；存储权限提示选择允许。

```bash
pkg update && pkg upgrade
pkg install nodejs-lts npm unzip
termux-setup-storage
```

项目当前依赖需要 Node `22.22.2+`（22 系列）、`24.15.0+`（24 系列）或 `26+`。安装脚本会检查版本；使用已更新的软件仓库中的 `nodejs-lts`。

## 2. 把部署包传到手机

将电脑生成的 `releases/readworld-android.zip` 通过 USB、聊天软件文件传输等方式传到手机，保存为：

```text
内部存储/Download/readworld-android.zip
```

确认文件名一致，然后在 Termux 中运行：

```bash
mkdir -p "$HOME/readworld"
unzip "$HOME/storage/downloads/readworld-android.zip" -d "$HOME/readworld"
cd "$HOME/readworld"
```

必须解压到 Termux 私有目录 `$HOME/readworld` 后安装，不能直接在手机共享的 Download 目录中运行 `npm ci`。

## 3. 安装并启动

部署脚本位于项目的 `deploy/android` 文件夹。

```bash
cd "$HOME/readworld"
bash deploy/android/install.sh
bash deploy/android/start.sh
```

保持 Termux 会话运行，切换到手机浏览器打开：

```text
http://127.0.0.1:3001
```

进入「AI 与阅读设置」，重新填写服务商、Base URL、模型和 API Key，点击「保存并测试」。电脑上的密钥和私人数据不会被自动打进部署包。

以后重新打开应用，只需：

```bash
cd "$HOME/readworld"
bash deploy/android/start.sh
```

在 Termux 中按 `Ctrl+C` 停止服务。手机重启后需要重新启动；这套脚本不设置开机自启。

## 4. 后台运行和桌面入口

在安卓系统设置中允许 Termux 后台运行，按手机提供的选项关闭对 Termux 的电池优化。需要持续运行时，可以在启动服务前执行：

```bash
termux-wake-lock
```

不用时停止服务，再执行 `termux-wake-unlock`。唤醒锁会增加耗电，不能保证系统永不结束后台进程。Android 12+ 的进程限制和部分厂商的后台管理仍可能结束服务。

手机浏览器打开应用后，可通过浏览器菜单中的「添加到主屏幕」创建入口。这个入口仍然依赖 Termux 中运行的服务。

每日自动生成也要求手机上的服务在运行；后台被结束期间不会执行。

## 5. 数据位置与迁移

- 手机生成的文章、AI 设置：`$HOME/.local/share/readworld/library.json`，可能包含明文 API Key。
- 生词、收藏、阅读进度：手机浏览器的站点数据。固定使用同一浏览器和 `http://127.0.0.1:3001`；更换浏览器、地址或清除站点数据，记录不会自动转移。
- 更新项目文件不会主动删除上述独立数据目录；卸载 Termux 会删除其私有数据，请先备份。
- 如需迁移电脑的文章和 AI 设置，先在两端停止服务，单独将电脑的 `data/library.json` 复制到手机私有目录 `$HOME/.local/share/readworld/library.json` 后再启动。此文件包含私人信息，不要公开分享。浏览器中的学习记录不在该文件里。

## 常见问题

- **找不到 ZIP 文件**：在文件管理器中确认它位于内部存储的 `Download` 目录且没有被改名，并确认已允许 Termux 存储权限。
- **安装依赖时断网或超时**：检查网络，再次运行安装脚本。保留原始报错便于排查。
- **安装提示 Node 版本不支持**：先更新 Termux 软件包，再检查 `node -v`；不要跳过版本检查。
- **浏览器无法访问**：先确认 Termux 仍显示服务启动成功，地址为 `http://127.0.0.1:3001`，且服务未退出。
- **端口被占用**：先停止先前启动的服务；也可用 `PORT=3002 bash deploy/android/start.sh`，并访问新端口。端口变化会改变浏览器站点数据的归属。
- **部分媒体连接失败**：使用的是手机网络；电脑系统代理不会随项目复制。检查手机网络或使用应用支持的 HTTP(S) 代理环境变量。

## 在电脑重新打包

在 Windows 的项目目录执行：

```powershell
powershell -NoProfile -File deploy/android/package.ps1
```

脚本重新构建前端，并生成 `releases/readworld-android.zip`。只包含明确列出的项目文件，不包含 `node_modules`、`.git`、`data` 或 `.env`，且保留原有项目目录结构。

部署流程已经过电脑端构建、依赖和本机服务验证；具体安卓设备的安装、后台保活和网络仍需在手机上确认。
