# ComfyUI 集成系统配置文档

## 概述

本文档描述 Storyboard Copilot 与 ComfyUI 的集成系统，提供完整的配置说明、插件管理和部署指南。

## 目录

1. [系统架构](#系统架构)
2. [快速开始](#快速开始)
3. [插件系统](#插件系统)
4. [工作流打包](#工作流打包)
5. [API 参考](#api-参考)
6. [部署指南](#部署指南)

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Storyboard Copilot                        │
├─────────────────────────────────────────────────────────────┤
│  UI 层: React + TypeScript + Zustand + @xyflow/react       │
├─────────────────────────────────────────────────────────────┤
│  ComfyUI 集成层                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ ComfyUI      │ │ Workflow     │ │ ComfyUI Service  │  │
│  │ Template     │ │ Packager     │ │ (WebSocket API)   │  │
│  │ Library      │ │              │ │                  │  │
│  └──────────────┘ └──────────────┘ └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  本地执行层: ComfyUI (127.0.0.1:8188)                       │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 1. 启动 ComfyUI

```bash
# 克隆 ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# 安装依赖
pip install -r requirements.txt

# 启动服务器
python main.py --listen 127.0.0.1 --port 8188
```

### 2. 配置连接

在设置页面配置 ComfyUI 服务器地址：

```
http://127.0.0.1:8188
```

### 3. 安装推荐插件

通过 ComfyUI Manager 或手动安装以下推荐插件：

- ComfyUI Manager (必需)
- ComfyUI Impact Pack
- ComfyUI-Advanced-ControlNet
- ComfyUI-ControlNet-Skeletons
- ComfyUI-BRIA-AI-Relay

---

## 插件系统

### 插件注册表

系统包含 Top 20 ComfyUI 社区插件，定义在 `comfyuiPlugins.ts`：

| 排名 | 插件名 | 功能描述 | 安装命令 |
|------|--------|----------|----------|
| 1 | ComfyUI Manager | 插件管理、模型下载 | `git clone https://github.com/Comfy-Org/ComfyUI-Manager` |
| 2 | ComfyUI Impact Pack | 节点增强、交互控制 | `git clone https://github.com/DrLT/ComfyUI-Impact-Pack` |
| 3 | Advanced-ControlNet | 多 ControlNet 支持 | `git clone https://github.com/Kosinkadink/ComfyUI-Advanced-ControlNet` |
| 4 | ControlNet-Skeletons | 骨架检测 | `git clone https://github.com/Fannovel16/ComfyUI-ControlNet-Skeletons` |
| 5 | BRIA-AI-Relay | 批量处理 | `git clone https://github.com/BRIA-AI/ComfyUI-BRIA-AI-Relay` |
| 6 | SDXL-IconsPrompts | SDXL 提示词 | `git clone https://github.com/TheMistoBear/ComfyUI-SDXL-IconsPrompts` |
| 7 | CLIPEncoding | 文本编码增强 | `git clone https://github.com/huchenlei/ComfyUI-CLIPEncoding` |
| 8 | WAS-Node-Suite | 工具集 | `git clone https://github.com/WASasquatch/ComfyUI-WAS-Nodes-Suite` |
| 9 | ComfyUI-UI-Enhancements | UI 增强 | `git clone https://github.com/pythongosssss/ComfyUI-Custom-Scripts` |
| 10 | Essence-Nodes | 质量节点 | `git clone https://github.com/bananatic/ComfyUI-Essence-Nodes` |
| 11 | Frame-Interpolation | 插帧 | `git clone https://github.com/ArtViper/ComfyUI-Frame-Interpolation` |
| 12 | DeepFade | 淡入淡出 | `git clone https://github.com/Z pohon/ComfyUI-DeepFade` |
| 13 | Fine-Controls | 精细控制 | `git clone https://github.com/WASasquatch/ComfyUI FineControlNodes` |
| 14 | Rgthree-Comfy | 工具集 | `git clone https://github.com/rgthree/ComfyUI-rgthree` |
| 15 | Auditor | 质量审核 | `git clone https://github.com/clock-z/ComfyUI-Auditor` |
| 16 | Prompt-Control | 提示词控制 | `git clone https://github.com/Vel03/ComfyUI-Prompt-Control` |
| 17 | Starcrafter | 游戏资产 | `git clone https://github.com/jakejet64/ComfyUI-Starcrafter` |
| 18 | ComfyUI-Image-Filters | 图像滤镜 | `git clone https://github.com/dummyassets/ComfyUI-Image-Filters` |
| 19 | ComfyUI-Lora-Auto-Load | 自动加载 | `git clone https://github.com/nicejji/ComfyUI-Lora-Auto-Load` |
| 20 | ComfyUI-MultiAttention | 注意力机制 | `git clone https://github.com/DjD下/ComfyUI-MultiAttention` |

### 插件分类

```typescript
type ComfyUIPluginCategory =
  | 'animation'      // 动画生成
  | 'controlnet'     // ControlNet 相关
  | 'image'          // 图像处理
  | 'model'          // 模型管理
  | 'node'           // 节点工具
  | 'script'         // 脚本工具
  | 'texture'        // 纹理生成
  | 'utility'        // 通用工具
  | 'video';         // 视频处理
```

### 插件清单接口

```typescript
interface ComfyUIPluginManifest {
  id: string;                    // 唯一标识
  name: string;                  // 显示名称
  description: string;           // 功能描述
  author: string;                // 作者
  repository: string;            // Git 仓库
  category: ComfyUIPluginCategory;
  dependencies: string[];        // 必需依赖
  optionalDependencies: string[];
  installCommand?: string;      // 安装命令
  comfyuimanagerInstallId?: string;
  pythonRequirements?: string[];  // Python 依赖
  downloadCount?: number;       // 下载量
  rating?: number;              // 评分
  compatibility: {
    minComfyUIVersion: string;
    maxComfyUIVersion?: string;
    platform?: ('windows' | 'linux' | 'macos')[];
  };
}
```

---

## 工作流打包

### 工作流包格式

```typescript
interface WorkflowPackage {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  createdAt: number;
  updatedAt: number;
  workflow: ComfyUIWorkflow;
  metadata: WorkflowPackageMetadata;
  dependencies: WorkflowDependency[];
  assets?: WorkflowAsset[];
  settings?: WorkflowSettings;
}
```

### 导出工作流

```typescript
import { WorkflowPackager } from './workflowPackager';

const workflow = parseComfyUIWorkflow(jsonString);
const pkg = WorkflowPackager.createPackage(workflow, {
  name: 'My Workflow',
  description: 'A custom workflow',
  category: 'image',
  tags: ['portrait', 'lighting']
});

const exported = WorkflowPackager.exportPackage(pkg, {
  includeMetadata: true,
  includeThumbnails: true,
  format: 'json'
});
```

### 导入工作流

```typescript
const result = WorkflowPackager.importPackage(jsonString);
if (result.success && result.package) {
  console.log('Loaded:', result.package.name);
}
```

### 依赖管理

```typescript
interface WorkflowDependency {
  type: 'checkpoint' | 'lora' | 'vae' | 'controlnet' | 'embedding' | 'custom-node';
  name: string;
  filename?: string;
  url?: string;
  hash?: string;
  required: boolean;
}
```

---

## API 参考

### ComfyUIService

与服务层建立连接并执行操作：

```typescript
import { ComfyUIService, initComfyUIService } from './comfyuiService';

const service = initComfyUIService({
  serverUrl: 'http://127.0.0.1:8188',
  onStatusChange: (status) => console.log('Status:', status),
  onProgress: (nodeId, progress) => console.log(`Node ${nodeId}: ${progress}%`),
  onExecuting: (nodeId) => console.log('Executing:', nodeId),
  onExecuted: (nodeId, output) => console.log('Executed:', nodeId),
  onError: (error) => console.error('Error:', error)
});

await service.connect();
const info = await service.getServerInfo();
console.log('ComfyUI Version:', info?.version);
```

### 方法列表

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `connect()` | 建立 WebSocket 连接 | `Promise<void>` |
| `disconnect()` | 断开连接 | `void` |
| `isConnected()` | 检查连接状态 | `boolean` |
| `getPromptId()` | 获取当前 Prompt ID | `string \| null` |
| `getServerInfo()` | 获取服务器信息 | `ComfyUIServerInfo \| null` |
| `getObjectInfo()` | 获取节点类型信息 | `Record<string, unknown> \| null` |
| `getModelList()` | 获取模型列表 | `ComfyUIModelList \| null` |
| `queuePrompt(prompt)` | 添加任务到队列 | `ComfyUIPromptResponse \| null` |
| `getHistory(promptId)` | 获取任务历史 | `ComfyUIHistoryEntry \| null` |
| `getQueue()` | 获取队列状态 | `ComfyUIQueueInfo` |
| `interrupt()` | 中断当前任务 | `Promise<void>` |
| `freeMemory()` | 释放内存 | `Promise<void>` |
| `uploadFile(file, subfolder)` | 上传文件 | `ComfyUIUploadResponse \| null` |
| `viewFile(filename, subfolder, type)` | 获取文件预览 | `string \| null` |
| `executeWorkflow(workflow)` | 执行工作流 | `Promise<ExecutionResult>` |

### 事件监听

```typescript
// 连接状态变化
const unsubscribe = service.onConnectionStatusChange((status) => {
  console.log('Connection status:', status);
});

// 自定义消息
const unsubscribe2 = service.onMessage('execution_success', (data) => {
  console.log('Execution completed:', data);
});
```

---

## 部署指南

### 一键部署

运行 `scripts/deploy-comfyui.bat` 或手动执行以下步骤：

```bash
# 1. 安装依赖
npm install

# 2. 检查 ComfyUI 连接
curl http://127.0.0.1:8188/system_stats

# 3. 开发模式
npm run dev

# 4. 生产构建
npm run build
```

### Tauri 打包

```bash
# 开发调试
npm run tauri dev

# 生产构建
npm run tauri build
```

### 依赖清单

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 18.0 | 前端运行环境 |
| Rust | >= 1.70 | Tauri 编译 |
| ComfyUI | 最新稳定版 | 本地执行服务 |
| Python | >= 3.10 | ComfyUI 依赖 |

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `COMFYUI_PORT` | 8188 | ComfyUI 服务端口 |
| `COMFYUI_URL` | http://127.0.0.1:8188 | ComfyUI 服务地址 |

---

## 故障排除

### 常见问题

**Q: 连接失败**
- 检查 ComfyUI 是否运行
- 确认端口未被占用
- 检查防火墙设置

**Q: 模型下载慢**
- 使用国内镜像源
- 使用 ComfyUI Manager 下载

**Q: 节点执行失败**
- 检查节点是否已安装
- 查看 ComfyUI 日志
- 确认模型文件存在

### 日志位置

| 组件 | 日志位置 |
|------|----------|
| ComfyUI | ComfyUI 终端输出 |
| 前端 | 浏览器控制台 |
| Tauri | `%APPDATA%\Storyboard Copilot\logs` |
