# 项目开发环境与注意事项

本文档用于指导开发者快速准备 Storyboard Copilot 的本地开发环境，并了解日常开发注意事项。

## 1. 必备工具

安装与配置教程请先阅读：
[基础工具安装配置（Windows / macOS）](d:/VibeCode/Storyboard-Copilot/docs/development-guides/base-tools-installation.md)

## 1.1 基础工具

- Node.js 20+（建议使用 LTS）
- npm 10+
- Rust（stable）
- Cargo（随 Rust 安装）
- Git

## 1.2 桌面端相关（Tauri 2）

- Windows 10/11（当前仓库主要在 Windows 路径下开发）
- WebView2 Runtime（Windows 必需）
- Visual Studio C++ Build Tools（Rust/Tauri 编译依赖）

## 1.3 可选工具

- VS Code（推荐）
- `rust-analyzer`（Rust 智能提示）
- ESLint / TypeScript 插件

## 2. 首次环境配置

## 2.1 克隆项目并安装依赖

```bash
git clone <repo-url>
cd Storyboard-Copilot
npm install
```

## 2.2 Rust 工具链检查

```bash
rustup show
cargo --version
```

## 2.3 Tauri 依赖检查

```bash
npx tauri info
```

若命令缺失或报错，先确保 `npm install` 已完成，并检查系统依赖是否齐全。

## 3. 启动与联调

## 3.1 前端开发

```bash
npm run dev
```

## 3.2 Tauri 联调（前后端完整链路）

```bash
npm run tauri dev
```

说明：

- 涉及图片处理、SQLite 持久化、AI 命令调用时，优先使用 `npm run tauri dev` 验证。
- 仅改 UI 样式可先用 `npm run dev`。

## 4. 日常验证命令

## 4.1 快速检查（优先）

```bash
npx tsc --noEmit
cd src-tauri && cargo check
```

## 4.2 收尾检查

```bash
npm run build
```

建议：

- 每次功能改动后至少执行一次 `tsc --noEmit`。
- 只要改了 `src-tauri/**`，必须执行 `cargo check`。

## 5. 项目结构速览

- 前端入口与状态：`src/App.tsx`、`src/stores/*`
- 画布与节点：`src/features/canvas/**`
- 模型与供应商：`src/features/canvas/models/**`
- Tauri 命令：`src/commands/*`、`src-tauri/src/commands/*`
- SQLite 持久化：`src/commands/projectState.ts`、`src-tauri/src/commands/project_state.rs`

## 6. 开发注意事项

## 6.1 分层约束

- 按数据流开发：UI -> Store -> Application Service -> Infrastructure -> Persistence。
- UI 层不要直接调用底层能力（如 Tauri API），通过应用层网关中转。
- Store 不承载重业务逻辑。

## 6.2 扩展约束

- 新增节点：先改 `domain/nodeRegistry.ts`，避免多处硬编码。
- 新增工具：按 `tools/types.ts -> builtInTools.ts -> tool-editors -> toolProcessor.ts` 顺序接入。
- 新增模型/供应商：参考
  [provider-and-model-extension.md](d:/VibeCode/Storyboard-Copilot/docs/development-guides/provider-and-model-extension.md)

## 6.3 性能约束

- 节点拖拽中禁止重计算和重持久化。
- 视口持久化走轻量命令，不回退整项目写入。
- 大图场景优先 `previewImageUrl` 渲染，处理链路使用原图 `imageUrl`。

## 6.4 i18n 约束

- 文案必须走 `useTranslation()` + `t('key.path')`。
- 新增文案必须同步 `zh.json` 和 `en.json`。
- 不要在组件内硬编码中英文。

## 6.5 代码变更约束

- 小步修改，小步验证。
- 不要跨模块偷改状态。
- 改动涉及持久化结构时，必须考虑 SQLite 自愈迁移逻辑。

## 7. 常见问题

1. 前端能跑，Tauri 起不来
- 检查 Rust 工具链、WebView2、C++ Build Tools。

2. 模型显示了但生成失败
- 检查 provider API Key 是否配置。
- 检查前后端 `model id` 是否一致。

3. 改完代码无效果
- 清理缓存后重启：关闭 dev 进程，重新 `npm run tauri dev`。

4. 类型检查通过但运行时报错
- 检查 Tauri 命令参数字段名（snake_case / camelCase）是否匹配。

## 8. 提交前自检清单

- 主路径可用（至少 1 条正常 + 1 条异常）。
- `npx tsc --noEmit` 通过。
- Rust 改动时 `cargo check` 通过。
- 影响打包链路时 `npm run build` 通过。
- 新增行为约束已同步文档。
