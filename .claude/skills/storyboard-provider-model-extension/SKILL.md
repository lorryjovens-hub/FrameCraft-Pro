---
name: storyboard-provider-model-extension
description: 用于 Storyboard Copilot 中“新增 AI 供应商”或“在现有供应商下新增模型”的工程化实现与校验。 当需求涉及 `src/features/canvas/models/**`、`src/features/canvas/models/providers/**`、`src-tauri/src/ai/providers/**`、`build_default_providers()`、`resolveRequest`、`model_aliases`、`inventory::submit!`、设置页 API Key 适配、默认模型切换或模型别名兼容时触发此技能。
---

# 供应商与模型扩展技能

## 目标

在不破坏现有节点生成链路的前提下，完成以下两类任务：
- 在已有供应商下新增模型。
- 新增供应商并接入该供应商的模型。

只沿数据流修改：模型定义 -> provider 映射 -> Tauri provider/adapter -> 命令调用验证。

## 信息闸门（先问再做）

在任何代码改动前，先读取 `references/requirement-intake-and-confirmation.md`。

执行规则：
- 默认由 AI 先产出“推荐实施方案”，包含命名、参数默认值、兼容策略与改动文件。
- 若信息不足以唯一决定实现方案，先提出最少问题补齐关键缺口，不把全部决策转交用户。
- 若存在高影响决策（命名、默认参数、兼容策略），先展示 AI 推荐值，再请求用户确认或改写。
- 能默认但需告知的项，直接按默认执行（如关闭水印），并在结果中明确列出“可修改项”。

## 任务分流

- 仅新增模型（已有供应商）：
读取 `references/model-extension.md`。

- 新增供应商（通常包含新增该供应商的模型）：
读取 `references/provider-extension.md`。

- 任一改动完成后：
读取 `references/verification-and-troubleshooting.md` 并执行必做校验。

- 需要预埋“除分辨率/比例外的额外参数”能力时：
读取 `references/extra-parameter-panel-preparation.md`。

## 执行要求

- 优先复用现有注册与自动发现机制，不绕开 `registry`。
- 不在 UI 层硬编码 provider/model 白名单。
- `requestModel` 与后端 `model_aliases()` 必须可互相匹配。
- Rust 侧新增模型必须含 `inventory::submit!`，否则不会被注册。
- 涉及 key 配置时，保证设置页可见且读写正确。

## 交付格式

输出最终答复时按以下顺序给出：
1. 变更清单（按前端 / 后端 / 配置分类）。
2. 校验结果（`npx tsc --noEmit`、`cargo check`、必要时 `npm run build`）。
3. 风险与回归点（默认模型、别名兼容、API Key 路由、生成命令命中 provider）。
