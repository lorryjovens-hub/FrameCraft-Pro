# 基础工具安装配置（Windows / macOS）

本文档提供 Storyboard Copilot 开发所需基础工具的安装与验证步骤。

## 1. 需要安装的工具

- Git
- Node.js 20+（建议 LTS）
- npm 10+（随 Node.js 安装）
- Rust stable（含 Cargo）
- Tauri 开发依赖（平台相关）

## 2. Windows 安装步骤

## 2.1 安装 Git

1. 访问 `https://git-scm.com/download/win`
2. 下载并安装 Git for Windows
3. 安装完成后验证：

```powershell
git --version
```

## 2.2 安装 Node.js（含 npm）

1. 访问 `https://nodejs.org/`
2. 下载并安装 LTS 版本（20+）
3. 验证：

```powershell
node -v
npm -v
```

## 2.3 安装 Rust（含 Cargo）

1. 访问 `https://rustup.rs/`
2. 下载安装器并执行默认安装
3. 重新打开终端后验证：

```powershell
rustc -V
cargo -V
rustup show
```

## 2.4 安装 Visual Studio C++ Build Tools

1. 访问 `https://visualstudio.microsoft.com/visual-cpp-build-tools/`
2. 安装 Build Tools for Visual Studio
3. 勾选包含 MSVC 的 C++ 构建工具（桌面开发相关组件）

## 2.5 安装 WebView2 Runtime

1. 访问 `https://developer.microsoft.com/microsoft-edge/webview2/`
2. 安装 Evergreen Runtime

## 2.6 验证 Tauri 环境

在项目目录执行：

```powershell
npm install
npx tauri info
```

## 3. macOS 安装步骤

## 3.1 安装 Xcode Command Line Tools

```bash
xcode-select --install
```

安装完成后验证：

```bash
clang --version
```

## 3.2 安装 Homebrew（建议）

1. 按官网命令安装：`https://brew.sh/`
2. 验证：

```bash
brew -v
```

## 3.3 安装 Git

若系统未提供可用版本，执行：

```bash
brew install git
git --version
```

## 3.4 安装 Node.js（含 npm）

```bash
brew install node
node -v
npm -v
```

## 3.5 安装 Rust（含 Cargo）

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustc -V
cargo -V
rustup show
```

## 3.6 验证 Tauri 环境

在项目目录执行：

```bash
npm install
npx tauri info
```

## 4. 项目首次拉起

在仓库根目录：

```bash
npm install
npx tsc --noEmit
cd src-tauri && cargo check
```

回到根目录后：

```bash
npm run tauri dev
```

## 5. 常见问题

1. `cargo` 命令找不到
- 重新打开终端，确保 Rust 环境变量已生效。

2. `npx tauri info` 报平台依赖缺失
- Windows：优先检查 C++ Build Tools、WebView2 Runtime。
- macOS：优先检查 Xcode Command Line Tools。

3. Node 版本太低导致依赖安装失败
- 升级到 Node.js 20+ 后重新执行 `npm install`。
