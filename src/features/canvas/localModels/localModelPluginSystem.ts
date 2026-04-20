export interface LocalModelPlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  modelType: ModelType;
  capabilities: ModelCapability[];
  config: ModelConfig;
  api?: LocalModelAPI;
  ui?: LocalModelUI;
  status: PluginStatus;
  installedAt?: number;
  updatedAt?: number;
}

export type ModelType = 'image-generation' | 'image-editing' | 'video-generation' | 'audio-generation' | 'text-generation' | 'multimodal';

export interface ModelCapability {
  type: 'text-to-image' | 'image-to-image' | 'inpainting' | 'controlnet' | 'upscaling' | 'face' | 'style' | 'video' | 'audio' | 'text';
  supportedResolutions?: string[];
  maxResolution?: number;
  supportsLoRA?: boolean;
  supportsControlNet?: boolean;
  supportsInpainting?: boolean;
  supportsImg2Img?: boolean;
}

export interface ModelConfig {
  modelPath: string;
  configPath?: string;
  vaePath?: string;
  embeddingsPath?: string;
  loraPath?: string;
  controlnetPath?: string;
  previewMethod?: 'latent2rgb' | 'taesd' | 'none';
  batchSize?: number;
  cudaDevice?: number;
  vramOptimization?: 'none' | 'low' | 'medium' | 'high';
}

export interface LocalModelAPI {
  type: 'comfyui' | 'ollama' | 'llama.cpp' | 'vllm' | 'custom';
  baseUrl: string;
  port?: number;
  auth?: {
    type: 'none' | 'api-key' | 'bearer';
    key?: string;
  };
  wsUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface LocalModelUI {
  hasCustomNodes?: boolean;
  nodeDefinitions?: CustomNodeDefinition[];
  templates?: TemplateDefinition[];
}

export interface CustomNodeDefinition {
  nodeId: string;
  nodeName: string;
  category: string;
  inputTypes: Record<string, string>;
  outputTypes: Record<string, string>;
  properties?: Record<string, unknown>;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  nodes: ComfyUITemplateNode[];
  connections: ComfyUITemplateConnection[];
}

export interface ComfyUITemplateNode {
  id: string;
  type: string;
  pos: [number, number];
  widgets?: Record<string, unknown>;
}

export interface ComfyUITemplateConnection {
  from: { nodeId: string; output: string };
  to: { nodeId: string; input: string };
}

export type PluginStatus = 'installed' | 'available' | 'update-available' | 'error' | 'disabled';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  repository?: string;
  license?: string;
  platform?: string[];
  minAppVersion?: string;
  dependencies?: Record<string, string>;
}

export interface PluginRegistryEntry {
  manifest: PluginManifest;
  status: PluginStatus;
  installedVersion?: string;
  updateAvailableVersion?: string;
  errorMessage?: string;
}

export const OFFICIAL_PLUGINS: PluginManifest[] = [
  {
    id: 'comfyui-local',
    name: 'ComfyUI 本地运行',
    version: '1.0.0',
    description: '支持导入和运行 ComfyUI 工作流，连接本地 ComfyUI 实例进行推理',
    author: 'Storyboard Copilot',
    repository: 'https://github.com/storyboard-copilot/comfyui-local',
    platform: ['win32', 'darwin', 'linux'],
    minAppVersion: '1.4.0',
  },
  {
    id: 'ollama-integration',
    name: 'Ollama 大语言模型',
    version: '1.0.0',
    description: '集成 Ollama 服务，支持本地 LLM 推理，支持 llama、mistral 等模型',
    author: 'Storyboard Copilot',
    repository: 'https://github.com/storyboard-copilot/ollama-integration',
    platform: ['win32', 'darwin', 'linux'],
    minAppVersion: '1.4.0',
    dependencies: {
      'comfyui-local': '^1.0.0',
    },
  },
  {
    id: 'sd-webui-bridge',
    name: 'Stable Diffusion WebUI 桥接',
    version: '1.0.0',
    description: '连接 Stable Diffusion WebUI (AUTOMATIC1111、ComfyUI 等) 的 API',
    author: 'Storyboard Copilot',
    repository: 'https://github.com/storyboard-copilot/sd-webui-bridge',
    platform: ['win32', 'darwin', 'linux'],
    minAppVersion: '1.4.0',
  },
  {
    id: 'model-manager',
    name: '模型管理器',
    version: '1.0.0',
    description: '管理和下载各种 AI 模型，支持 Civitai、HuggingFace 模型搜索',
    author: 'Storyboard Copilot',
    repository: 'https://github.com/storyboard-copilot/model-manager',
    platform: ['win32', 'darwin', 'linux'],
    minAppVersion: '1.4.0',
  },
];

export function createDefaultLocalModelPlugin(pluginId: string): LocalModelPlugin {
  return {
    id: pluginId,
    name: '',
    description: '',
    version: '1.0.0',
    modelType: 'image-generation',
    capabilities: [],
    config: {
      modelPath: '',
      vramOptimization: 'medium',
    },
    status: 'available',
  };
}

export function validatePluginManifest(manifest: unknown): manifest is PluginManifest {
  if (!manifest || typeof manifest !== 'object') return false;
  const m = manifest as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    typeof m.name === 'string' &&
    typeof m.version === 'string' &&
    typeof m.description === 'string'
  );
}

export function checkPluginCompatibility(manifest: PluginManifest): { compatible: boolean; reason?: string } {
  const platform = navigator.platform.toLowerCase();
  if (manifest.platform && !manifest.platform.some(p => platform.includes(p))) {
    return { compatible: false, reason: `不支持当前平台 ${platform}` };
  }

  const appVersion = '1.4.0';
  if (manifest.minAppVersion) {
    const [minMajor, minMinor] = manifest.minAppVersion.split('.').map(Number);
    const [curMajor, curMinor] = appVersion.split('.').map(Number);
    if (minMajor > curMajor || (minMajor === curMajor && minMinor > curMinor)) {
      return { compatible: false, reason: `需要应用版本 ${manifest.minAppVersion} 或更高` };
    }
  }

  return { compatible: true };
}
