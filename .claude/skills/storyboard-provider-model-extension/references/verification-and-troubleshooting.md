# 校验与排障

## 必做校验命令

在项目根目录执行：

```bash
npx tsc --noEmit
```

在 `src-tauri` 目录执行：

```bash
cargo check
```

涉及打包链路、入口、依赖或持久化时执行：

```bash
npm run build
```

## 最小手测清单

- 设置页可见新增供应商（若本次新增 provider）。
- 画布节点可选择新增模型。
- 生成请求命中新 provider 或新增模型。
- 缺失 API Key 时提示合理，不崩溃、不串 provider。
- 历史工程中旧 modelId 能通过别名兼容（若本次做了别名迁移）。
- 若启用“其他参数”按钮：参数可编辑、可持久化、可正确下发。
- 若定义了统一策略：确认 `watermark=false` 实际生效。

## 常见故障定位

1. 设置页看不到新供应商
- 检查 `providers/<provider>.ts` 是否导出 `provider` 常量。
- 检查 `provider.id` 是否重复或为空。

2. 前端可选模型但调用失败
- 对照 `resolveRequest().requestModel` 与后端 `model_aliases()` 是否一致。
- 检查该供应商 API Key 是否已保存并传入。

3. 后端 `list_models` 无新增模型
- 检查模型文件目录与命名是否正确。
- 检查是否包含 `inventory::submit!`。

4. 请求打到错误供应商
- 检查 `requestModel` 是否使用 `<provider>/<model>` 规范前缀。
- 检查 provider 路由逻辑是否按 `providerId` 或前缀分发。

## 提交前输出模板

最终答复中给出：
- 改动文件清单（前端 / 后端 / 配置）
- 三条校验结果（tsc、cargo、build 是否执行）
- 已确认风险点（默认模型、别名兼容、key 路由）
- 待用户确认项（命名、默认参数、额外参数范围）
