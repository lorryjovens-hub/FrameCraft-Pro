export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  permissions: PluginPermissions;
  entry: string;
  nodes?: PluginNodeDefinition[];
  tools?: PluginToolDefinition[];
  models?: PluginModelDefinition[];
  settings?: PluginSettingDefinition[];
}

export interface PluginPermissions {
  network?: boolean;
  storage?: boolean;
  fileSystem?: boolean;
  unsafeHtml?: boolean;
  maxExecutionTime?: number;
}

export interface PluginNodeDefinition {
  type: string;
  label: string;
  category: 'input' | 'output' | 'transform' | 'ai' | 'utility';
  icon?: string;
  defaultData?: Record<string, unknown>;
  fields?: PluginNodeField[];
}

export interface PluginNodeField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'image' | 'text';
  label: string;
  required?: boolean;
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
}

export interface PluginToolDefinition {
  type: string;
  label: string;
  category: 'edit' | 'transform' | 'annotate' | 'generate';
  icon: 'crop' | 'annotate' | 'split' | 'inpaint' | 'paintbrush' | 'eraser';
  supportsNodeTypes: string[];
}

export interface PluginModelDefinition {
  providerId: string;
  modelId: string;
  displayName: string;
  capabilities: ('generate' | 'edit' | 'inpaint')[];
  supportedRatios?: string[];
  defaultParams?: Record<string, unknown>;
}

export interface PluginSettingDefinition {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
}

export type PluginLoadState = 'unloaded' | 'loading' | 'loaded' | 'error' | 'disabled';

export interface Plugin {
  manifest: PluginManifest;
  state: PluginLoadState;
  error?: string;
  instance?: unknown;
}

export interface PluginSandbox {
  execute: (code: string, context: Record<string, unknown>) => Promise<unknown>;
  terminate: () => void;
}

export interface PluginStoreItem {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  downloadCount: number;
  rating: number;
  iconUrl?: string;
  manifestUrl: string;
}