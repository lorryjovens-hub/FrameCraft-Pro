# 模型扩展（已有供应商）

## 适用场景

- 供应商已存在，仅新增一个或多个模型。
- 不需要新增 provider 模块，只需要补充模型定义与请求映射。

## 前置确认

开始编码前，先确认：
- 模型中英文名称与 `model.id`。
- 模型是否有额外参数（除分辨率/比例外）。
- 默认策略是否要求 `watermark=false` 强制下发。

## 步骤 1：新增前端模型文件

在 `src/features/canvas/models/image/<provider>/` 下新增模型文件（每模型 1 个文件）。

必填字段：
- `id`：建议 `<provider>/<model>`
- `providerId`：必须与供应商定义一致
- `displayName`
- `defaultAspectRatio`
- `defaultResolution`
- `aspectRatios`
- `resolutions`
- `resolveRequest`
- `extraParamsSchema`（若该模型支持额外参数）
- `defaultExtraParams`（若该模型支持额外参数）

执行要点：
- 在 `resolveRequest` 中返回稳定的 `requestModel`，后端据此选模型。
- 如有图生图/编辑模式，基于 `referenceImageCount` 或工具输入切换 `modeLabel`。
- 需要时将 `extraParams` 合并进请求映射，未填值回退默认值。

## 步骤 2：新增后端模型适配文件

在 `src-tauri/src/ai/providers/<provider>/models/` 下新增模型文件（每模型 1 个文件）。

必须实现：
- 对应 provider 的模型 adapter trait（如 `PPIOModelAdapter`）。
- `model_aliases()`：至少包含前端 `requestModel`。
- `build_request()`：构造 endpoint/body/summary。
- `inventory::submit!`：注册该模型。

关键约束：
- 未提交 `inventory::submit!` 会导致 `list_models` 丢失该模型。
- `model_aliases()` 至少包含一个兼容短别名，便于历史数据回放。

## 步骤 3：确认前后端 model id 对齐

逐项核对：
- 前端 `resolveRequest().requestModel`
- 后端 `model_aliases()`
- provider 选择逻辑是否按 `providerId` 或 `<provider>/` 前缀路由

如不对齐，常见症状：
- 前端可选模型但生成失败。
- 请求被路由到错误供应商。

## 步骤 4：按需处理默认模型与别名兼容

仅在需要时修改 `src/features/canvas/models/registry.ts`：
- `DEFAULT_IMAGE_MODEL_ID`
- `imageModelAliasMap`

使用规则：
- 切换默认模型时更新 `DEFAULT_IMAGE_MODEL_ID`。
- 历史工程仍需可读时，在 `imageModelAliasMap` 增加旧 ID -> 新 ID 映射。
