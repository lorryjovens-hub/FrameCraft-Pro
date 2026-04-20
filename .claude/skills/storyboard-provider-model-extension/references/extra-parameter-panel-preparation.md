# 额外参数面板预埋方案

## 目标

在不破坏现有分辨率/比例流程的前提下，预留“其他参数”入口，支持不同模型挂载各自参数。

## 设计原则

- 参数定义与 UI 解耦：参数 schema 归模型定义，面板只负责渲染。
- 默认隐藏：仅当模型声明了额外参数时显示“其他参数”按钮。
- 安全默认：未配置参数时采用模型默认值；水印默认 `false`。
- 渐进接入：先支持基础类型（boolean/enum/number/string），后续再扩展复杂类型。

## 前端建议改动

1. 在模型类型中新增参数 schema。
文件：`src/features/canvas/models/types.ts`
建议字段：
- `extraParamsSchema?: ExtraParamDefinition[]`
- `defaultExtraParams?: Record<string, unknown>`

2. 在节点状态中新增参数数据容器。
建议存储在对应节点 data（如 image edit/storyboard gen）：
- `extraParams?: Record<string, unknown>`

3. 在节点底部控制条新增“其他参数”按钮。
文件可涉及：
- `src/features/canvas/nodes/ImageEditNode.tsx`
- `src/features/canvas/ui/NodeToolDialog.tsx` 或新建 `ExtraParamsDialog`

4. 对话框按 `extraParamsSchema` 动态渲染控件。
基础映射建议：
- boolean -> Switch
- enum -> Select
- number -> Input + min/max/step
- string -> Input/Textarea

5. 在 `resolveRequest` 或请求拼装阶段合并参数。
规则：
- 显式用户值优先。
- 否则回退模型默认。
- 不支持的空值不下发。

## 后端建议改动

- 在生成请求 DTO 中增加 `extra_params`（可选 map）。
- provider adapter 只映射自身支持的字段，不支持字段忽略或告警。
- 对关键策略参数设置兜底：
如 `watermark=false`，若 provider 支持则总是显式下发。

## 最小落地顺序

1. 先定义 schema 与节点存储，不改现有请求逻辑。
2. 接入“其他参数”按钮和对话框，仅影响前端状态。
3. 将 `extraParams` 透传到请求 DTO。
4. 在单个 provider 上先试点映射（例如 PPIO），验证后再推广。

## 风险与回归点

- 历史节点无 `extraParams` 字段时需兼容空值。
- 切换模型后需清理无效参数，避免把 A 模型参数带到 B 模型。
- 持久化结构变化后，检查项目恢复与历史快照回放。
