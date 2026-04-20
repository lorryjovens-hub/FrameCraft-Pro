# 供应商与模型扩展指南

本文档用于指导在 Storyboard Copilot 中新增 AI 供应商或新增模型。

## 1. 适用范围

- 前端模型注册：`src/features/canvas/models/**`
- 前端密钥配置：`src/stores/settingsStore.ts`、`src/components/SettingsDialog.tsx`
- Tauri AI 命令与供应商：`src-tauri/src/commands/ai.rs`、`src-tauri/src/ai/**`

## 2. 扩展原则

- 前端：模型与供应商通过文件自动发现（`import.meta.glob`）。
- 后端：供应商通过 `build_default_providers()` 注册；模型通过 provider 内部注册机制发现。
- 节点生成流程按 `selectedModel.providerId` 自动选择 API Key 与 provider。

## 3. 新增模型（已有供应商）

### 3.1 前端新增模型（1 个文件）

在目录 `src/features/canvas/models/image/<provider>/` 下新增模型文件，例如：

- `src/features/canvas/models/image/ppio/seedream45.ts`

最小示例：

```ts
import type { ImageModelDefinition } from '../../types';

export const imageModel: ImageModelDefinition = {
  id: 'ppio/seedream-4.5',
  mediaType: 'image',
  displayName: 'Seedream 4.5',
  providerId: 'ppio',
  description: '高质量图像生成模型',
  eta: '1min',
  expectedDurationMs: 60000,
  defaultAspectRatio: '1:1',
  defaultResolution: '2K',
  aspectRatios: [
    { value: '1:1', label: '1:1' },
    { value: '16:9', label: '16:9' },
  ],
  resolutions: [
    { value: '1K', label: '1K' },
    { value: '2K', label: '2K' },
  ],
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: 'ppio/seedream-4.5',
    modeLabel: referenceImageCount > 0 ? '编辑模式' : '生成模式',
  }),
};
```

注意：

- `providerId` 必须与供应商定义一致。
- `id` 推荐使用 `<provider>/<model>` 规范。

### 3.2 后端新增该模型（PPIO 当前可做到 1 个文件）

在 `src-tauri/src/ai/providers/ppio/models/` 下新增文件，例如：

- `src-tauri/src/ai/providers/ppio/models/seedream_4_5.rs`

最小结构：

```rust
use crate::ai::error::AIError;
use crate::ai::GenerateRequest;
use serde_json::json;

use super::super::adapter::{PPIOModelAdapter, PreparedRequest};

pub struct Seedream45Adapter;

impl Seedream45Adapter {
    pub fn new() -> Self {
        Self
    }
}

impl PPIOModelAdapter for Seedream45Adapter {
    fn model_aliases(&self) -> &'static [&'static str] {
        &["ppio/seedream-4.5", "seedream-4.5"]
    }

    fn build_request(
        &self,
        request: &GenerateRequest,
        base_url: &str,
    ) -> Result<PreparedRequest, AIError> {
        Ok(PreparedRequest {
            endpoint: format!("{}/v3/your-endpoint", base_url),
            body: json!({
                "prompt": request.prompt,
                "size": request.size,
                "aspect_ratio": request.aspect_ratio
            }),
            summary: format!("model: ppio/seedream-4.5, prompt: {}", request.prompt),
        })
    }
}

inventory::submit! {
    crate::ai::providers::ppio::models::RegisteredPpioModel {
        build: || Box::new(Seedream45Adapter::new()),
    }
}
```

说明：

- 不需要手改 `models/mod.rs` 或 `registry.rs`，已启用自动收集。
- 必须包含 `inventory::submit!`，否则模型不会注册。

## 4. 新增供应商

## 4.1 前端新增供应商定义（1 个文件）

在 `src/features/canvas/models/providers/` 下新增文件，例如：

- `src/features/canvas/models/providers/openai.ts`

```ts
import type { ModelProviderDefinition } from '../types';

export const provider: ModelProviderDefinition = {
  id: 'openai',
  name: 'OpenAI',
  label: 'OpenAI',
};
```

前端设置页会自动出现该供应商 API Key 输入项。

## 4.2 前端新增该供应商的模型（每模型 1 文件）

目录：

- `src/features/canvas/models/image/openai/*.ts`

要求同第 3.1 节。

## 4.3 Tauri 后端新增供应商模块

新增目录（建议）：

- `src-tauri/src/ai/providers/openai/`

建议文件：

- `mod.rs`：provider 实现
- `adapter.rs`：请求适配接口
- `models/mod.rs` + `models/*.rs`：模型注册
- `registry.rs`：模型查询

`mod.rs` 需要实现 `AIProvider` trait（关键方法）：

- `name()`
- `supports_model()`
- `list_models()`
- `set_api_key()`
- `generate()`

## 4.4 注册供应商到系统

编辑：

- `src-tauri/src/ai/providers/mod.rs`

增加模块与默认注册：

```rust
pub mod openai;
pub use openai::OpenAIProvider;

pub fn build_default_providers() -> Vec<Arc<dyn AIProvider>> {
    vec![
        Arc::new(PPIOProvider::new()),
        Arc::new(OpenAIProvider::new()),
    ]
}
```

## 5. 默认模型与兼容别名

文件：

- `src/features/canvas/models/registry.ts`

可按需调整：

- `DEFAULT_IMAGE_MODEL_ID`
- `imageModelAliasMap`

仅在需要切换默认模型或兼容历史 modelId 时修改。

## 6. 验证步骤（必做）

在项目根目录执行：

```bash
npx tsc --noEmit
```

在 `src-tauri` 执行：

```bash
cargo check
```

如涉及打包链路，补充执行：

```bash
npm run build
```

## 7. 常见问题排查

1. 设置页看不到新供应商
- 检查 `providers/<provider>.ts` 是否导出 `provider` 常量。
- 检查 `provider.id` 是否为空或重复。

2. 前端可选模型但生成失败
- 检查模型 `resolveRequest().requestModel` 是否与后端 `model_aliases()` 匹配。
- 检查对应供应商 API Key 是否已在设置页填写。

3. 后端 `list_models` 没有新模型
- 检查模型文件是否放在正确目录。
- 检查是否添加 `inventory::submit!`。

4. 命令调用到错误供应商
- 检查 `requestModel` 是否使用 `<provider>/<model>` 前缀。

