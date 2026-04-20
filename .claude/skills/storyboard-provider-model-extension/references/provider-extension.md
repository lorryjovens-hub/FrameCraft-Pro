# 供应商扩展（新增 provider）

## 适用场景

- 需要接入全新供应商（如 OpenAI、Replicate、自建网关）。
- 需要在设置页出现新供应商 API Key 输入项。
- 需要在 Tauri provider 列表中可选并参与生成请求。

## 前置确认

开始编码前，先确认：
- `provider.id`、中文名、英文名、设置页展示名。
- key 命名方式与是否需要多 key（如读写分离、区域 key）。
- 该供应商的水印参数、联网参数、其他扩展参数映射规则。

## 步骤 1：新增前端供应商定义

在 `src/features/canvas/models/providers/` 新增 `<provider>.ts`：
- 导出 `provider: ModelProviderDefinition`
- 设置 `id`、`name`、`label`

约束：
- `id` 全局唯一，且与后端 provider 标识保持一致。
- 不在组件里手写 provider 列表，保持自动发现。

## 步骤 2：新增该供应商下的前端模型

在 `src/features/canvas/models/image/<provider>/` 为每个模型新增文件。

要求：
- 遵循“每模型 1 文件”。
- `providerId` 使用步骤 1 的 `provider.id`。
- `resolveRequest().requestModel` 与后端 `model_aliases` 可匹配。

## 步骤 3：新增 Tauri 供应商模块

在 `src-tauri/src/ai/providers/<provider>/` 建立模块，建议结构：
- `mod.rs`
- `adapter.rs`
- `models/mod.rs`
- `models/*.rs`
- `registry.rs`

`mod.rs` 至少实现 `AIProvider` trait 的关键方法：
- `name()`
- `supports_model()`
- `list_models()`
- `set_api_key()`
- `generate()`

## 步骤 4：注册到默认供应商构建函数

修改 `src-tauri/src/ai/providers/mod.rs`：
- 增加 `pub mod <provider>;`
- 导出 provider 类型
- 在 `build_default_providers()` 注入该 provider

未注册会导致：
- 设置页可见但后端无法路由。
- 生成命令找不到 provider。

## 步骤 5：确认 API Key 链路

检查点：
- 设置页是否自动出现该 provider key 输入。
- `settingsStore` 是否能持久化并正确传给 Tauri 命令。
- 生成请求是否命中正确 provider 并使用对应 key。
- 不同 provider 并存时，是否会误用其他 provider 的 key。

## 步骤 6：额外参数映射策略

- 优先采用统一 `extra_params` 透传，再在 provider adapter 内做字段映射。
- 无对应能力的参数不要硬映射，避免供应商报错。
- 若供应商支持水印控制且产品策略统一禁用，显式下发 `watermark=false`。

## 步骤 7：最小回归路径

至少手测两条：
- 主路径：选择新供应商模型，完成一次生成。
- 异常路径：缺失 key 时，报错可理解且不误路由到其他 provider。
