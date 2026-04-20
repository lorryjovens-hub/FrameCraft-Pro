import { useState, useCallback, useMemo } from 'react';
import {
  Download, Trash2, Search, Settings, Plug, CheckCircle, AlertCircle,
  RefreshCw, ChevronDown, ChevronRight, X, ExternalLink, Shield, Cpu, HardDrive
} from 'lucide-react';
import { UiButton } from '@/components/ui';
import {
  type LocalModelPlugin,
  type PluginManifest,
  type PluginStatus,
  OFFICIAL_PLUGINS,
  checkPluginCompatibility,
  createDefaultLocalModelPlugin,
} from './localModelPluginSystem';

const PLUGIN_STORAGE_KEY = 'storyboard-copilot:local-model-plugins';

const STATUS_CONFIG: Record<PluginStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  installed: { label: '已安装', color: 'text-green-400', icon: CheckCircle },
  available: { label: '可用', color: 'text-blue-400', icon: Plug },
  'update-available': { label: '可更新', color: 'text-yellow-400', icon: RefreshCw },
  error: { label: '错误', color: 'text-red-400', icon: AlertCircle },
  disabled: { label: '已禁用', color: 'text-gray-400', icon: Settings },
};

const MODEL_TYPE_LABELS: Record<string, { zh: string; en: string }> = {
  'image-generation': { zh: '图片生成', en: 'Image Generation' },
  'image-editing': { zh: '图片编辑', en: 'Image Editing' },
  'video-generation': { zh: '视频生成', en: 'Video Generation' },
  'audio-generation': { zh: '音频生成', en: 'Audio Generation' },
  'text-generation': { zh: '文本生成', en: 'Text Generation' },
  'multimodal': { zh: '多模态', en: 'Multimodal' },
};

interface LocalModelPluginManagerProps {
  onPluginInstalled?: (plugin: LocalModelPlugin) => void;
  onClose?: () => void;
}

export function LocalModelPluginManager({ onPluginInstalled, onClose }: LocalModelPluginManagerProps) {
  const [plugins, setPlugins] = useState<LocalModelPlugin[]>(() => {
    try {
      const raw = localStorage.getItem(PLUGIN_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'installed' | 'available'>('installed');
  const [isInstalling, setIsInstalling] = useState(false);
  const [configErrors, setConfigErrors] = useState<Record<string, string>>({});

  const savePlugins = useCallback((updated: LocalModelPlugin[]) => {
    setPlugins(updated);
    localStorage.setItem(PLUGIN_STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const installedPlugins = useMemo(() =>
    plugins.filter(p => p.status === 'installed' || p.status === 'disabled' || p.status === 'error'),
    [plugins]
  );

  const availablePlugins = useMemo(() => {
    const installedIds = new Set(plugins.map(p => p.id));
    return OFFICIAL_PLUGINS.filter(p => !installedIds.has(p.id));
  }, [plugins]);

  const filteredInstalled = useMemo(() =>
    installedPlugins.filter(p =>
      !searchKeyword ||
      p.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      p.description.toLowerCase().includes(searchKeyword.toLowerCase())
    ),
    [installedPlugins, searchKeyword]
  );

  const filteredAvailable = useMemo(() =>
    availablePlugins.filter(p =>
      !searchKeyword ||
      p.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      p.description.toLowerCase().includes(searchKeyword.toLowerCase())
    ),
    [availablePlugins, searchKeyword]
  );

  const handleInstallPlugin = useCallback(async (manifest: PluginManifest) => {
    const compatibility = checkPluginCompatibility(manifest);
    if (!compatibility.compatible) {
      alert(compatibility.reason);
      return;
    }

    setIsInstalling(true);
    try {
      const newPlugin = createDefaultLocalModelPlugin(manifest.id) as LocalModelPlugin;
      Object.assign(newPlugin, {
        ...manifest,
        status: 'installed',
        installedAt: Date.now(),
        updatedAt: Date.now(),
      });

      const updated = [...plugins, newPlugin];
      savePlugins(updated);
      onPluginInstalled?.(newPlugin);
    } finally {
      setIsInstalling(false);
    }
  }, [plugins, savePlugins, onPluginInstalled]);

  const handleUninstallPlugin = useCallback((pluginId: string) => {
    if (!confirm('确定要卸载此插件吗？')) return;
    const updated = plugins.filter(p => p.id !== pluginId);
    savePlugins(updated);
  }, [plugins, savePlugins]);

  const handleTogglePlugin = useCallback((pluginId: string) => {
    const updated = plugins.map(p => {
      if (p.id !== pluginId) return p;
      return { ...p, status: p.status === 'disabled' ? 'installed' : 'disabled' } as LocalModelPlugin;
    });
    savePlugins(updated);
  }, [plugins, savePlugins]);

  const handleUpdatePluginConfig = useCallback((pluginId: string, config: Partial<LocalModelPlugin>) => {
    const updated = plugins.map(p => {
      if (p.id !== pluginId) return p;
      return { ...p, ...config, updatedAt: Date.now() } as LocalModelPlugin;
    });
    savePlugins(updated);
  }, [plugins, savePlugins]);

  const handleValidateConfig = useCallback((plugin: LocalModelPlugin): boolean => {
    const errors: Record<string, string> = {};

    if (!plugin.config.modelPath) {
      errors.modelPath = '请选择模型路径';
    }
    if (plugin.api?.baseUrl) {
      try {
        new URL(plugin.api.baseUrl);
      } catch {
        errors.baseUrl = '请输入有效的 URL';
      }
    }

    setConfigErrors(prev => ({ ...prev, [plugin.id]: Object.values(errors)[0] || '' }));
    return Object.keys(errors).length === 0;
  }, []);

  return (
    <div className="flex h-full flex-col bg-surface-dark">
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-medium text-text-dark">本地大模型插件</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-dark hover:text-text-dark"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.08)] px-4 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索插件..."
            className="w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-bg-dark py-2 pl-10 pr-4 text-sm text-text-dark placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="flex border-b border-[rgba(255,255,255,0.08)]">
        <button
          type="button"
          onClick={() => setActiveTab('installed')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'installed'
              ? 'border-b-2 border-accent text-accent'
              : 'text-text-muted hover:text-text-dark'
          }`}
        >
          已安装 ({installedPlugins.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('available')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'available'
              ? 'border-b-2 border-accent text-accent'
              : 'text-text-muted hover:text-text-dark'
          }`}
        >
          可用插件 ({availablePlugins.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'installed' && (
          filteredInstalled.length === 0 ? (
            <EmptyState
              icon={Plug}
              title="暂无已安装插件"
              description="从可用插件中选择并安装"
            />
          ) : (
            <div className="p-4 space-y-3">
              {filteredInstalled.map((plugin) => (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  isExpanded={expandedPlugin === plugin.id}
                  onToggleExpand={() => setExpandedPlugin(
                    expandedPlugin === plugin.id ? null : plugin.id
                  )}
                  onToggle={handleTogglePlugin}
                  onUninstall={handleUninstallPlugin}
                  onUpdateConfig={handleUpdatePluginConfig}
                  onValidate={handleValidateConfig}
                  error={configErrors[plugin.id]}
                />
              ))}
            </div>
          )
        )}

        {activeTab === 'available' && (
          filteredAvailable.length === 0 ? (
            <EmptyState
              icon={Download}
              title="暂无可用插件"
              description="插件列表为空或已全部安装"
            />
          ) : (
            <div className="p-4 space-y-3">
              {filteredAvailable.map((manifest) => {
                const compatibility = checkPluginCompatibility(manifest);
                return (
                  <AvailablePluginCard
                    key={manifest.id}
                    manifest={manifest}
                    compatible={compatibility.compatible}
                    incompatibleReason={compatibility.reason}
                    onInstall={handleInstallPlugin}
                    isInstalling={isInstalling}
                  />
                );
              })}
            </div>
          )
        )}
      </div>

      <div className="border-t border-[rgba(255,255,255,0.08)] p-4">
        <div className="flex flex-wrap gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5" />
            <span>模型路径: 设置本地模型位置</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span>插件市场即将上线</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PluginCardProps {
  plugin: LocalModelPlugin;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggle: (id: string) => void;
  onUninstall: (id: string) => void;
  onUpdateConfig: (id: string, config: Partial<LocalModelPlugin>) => void;
  onValidate: (plugin: LocalModelPlugin) => boolean;
  error?: string;
}

function PluginCard({
  plugin,
  isExpanded,
  onToggleExpand,
  onToggle,
  onUninstall,
  onUpdateConfig,
  onValidate,
  error,
}: PluginCardProps) {
  const StatusIcon = STATUS_CONFIG[plugin.status].icon;

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-bg-dark overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface-dark/50"
        onClick={onToggleExpand}
      >
        <button type="button" className="text-text-muted">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <Plug className="h-5 w-5 text-accent" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-text-dark">{plugin.name}</h3>
            <span className={`flex items-center gap-1 text-xs ${STATUS_CONFIG[plugin.status].color}`}>
              <StatusIcon className="h-3 w-3" />
              {STATUS_CONFIG[plugin.status].label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-text-muted">{plugin.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {plugin.status !== 'disabled' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggle(plugin.id); }}
              className="rounded-lg bg-surface-dark px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-dark"
            >
              禁用
            </button>
          )}
          {plugin.status === 'disabled' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggle(plugin.id); }}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs text-white transition-colors hover:bg-accent/90"
            >
              启用
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-[rgba(255,255,255,0.08)] p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs text-text-muted mb-1">版本</label>
              <span className="text-text-dark">{plugin.version}</span>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">模型类型</label>
              <span className="text-text-dark">{MODEL_TYPE_LABELS[plugin.modelType]?.zh ?? plugin.modelType}</span>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-text-muted mb-1">模型路径</label>
              <input
                type="text"
                value={plugin.config.modelPath}
                onChange={(e) => onUpdateConfig(plugin.id, {
                  config: { ...plugin.config, modelPath: e.target.value }
                })}
                placeholder="例如: C:\Models\Stable-Diffusion"
                className="w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
            {plugin.api && (
              <>
                <div className="col-span-2">
                  <label className="block text-xs text-text-muted mb-1">API 地址</label>
                  <input
                    type="text"
                    value={plugin.api.baseUrl}
                    onChange={(e) => onUpdateConfig(plugin.id, {
                      api: { ...plugin.api!, baseUrl: e.target.value }
                    })}
                    placeholder="例如: http://localhost:8188"
                    className="w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-muted focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">端口</label>
                  <input
                    type="number"
                    value={plugin.api.port || ''}
                    onChange={(e) => onUpdateConfig(plugin.id, {
                      api: { ...plugin.api!, port: parseInt(e.target.value) || undefined }
                    })}
                    placeholder="默认: 8188"
                    className="w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-muted focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">VRAM 优化</label>
                  <select
                    value={plugin.config.vramOptimization || 'medium'}
                    onChange={(e) => onUpdateConfig(plugin.id, {
                      config: { ...plugin.config, vramOptimization: e.target.value as any }
                    })}
                    className="w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-surface-dark px-3 py-2 text-sm text-text-dark focus:border-accent focus:outline-none"
                  >
                    <option value="none">无优化</option>
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-[rgba(255,255,255,0.08)]">
            <button
              type="button"
              onClick={() => onValidate(plugin)}
              className="rounded-lg bg-surface-dark px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-dark"
            >
              验证配置
            </button>
            <button
              type="button"
              onClick={() => onUninstall(plugin.id)}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20"
            >
              <Trash2 className="h-3 w-3" />
              卸载
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface AvailablePluginCardProps {
  manifest: PluginManifest;
  compatible: boolean;
  incompatibleReason?: string;
  onInstall: (manifest: PluginManifest) => void;
  isInstalling: boolean;
}

function AvailablePluginCard({
  manifest,
  compatible,
  incompatibleReason,
  onInstall,
  isInstalling,
}: AvailablePluginCardProps) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-bg-dark p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <Plug className="h-5 w-5 text-accent" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-text-dark">{manifest.name}</h3>
            <span className="rounded bg-surface-dark px-1.5 py-0.5 text-xs text-text-muted">v{manifest.version}</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">{manifest.description}</p>

          {manifest.dependencies && Object.keys(manifest.dependencies).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-xs text-text-muted">依赖:</span>
              {Object.keys(manifest.dependencies).map(dep => (
                <span key={dep} className="rounded bg-surface-dark px-1.5 py-0.5 text-xs text-accent">
                  {dep}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0">
          {compatible ? (
            <UiButton
              size="sm"
              onClick={() => onInstall(manifest)}
              disabled={isInstalling}
              className="flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              安装
            </UiButton>
          ) : (
            <div className="text-center">
              <span className="text-xs text-red-400">{incompatibleReason}</span>
            </div>
          )}
        </div>
      </div>

      {manifest.repository && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-text-muted">
          <ExternalLink className="h-3 w-3" />
          <a
            href={manifest.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent"
          >
            查看源码
          </a>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof Plug; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-text-muted">
      <Icon className="mb-3 h-10 w-10 opacity-30" />
      <p className="text-sm">{title}</p>
      <p className="mt-1 text-xs">{description}</p>
    </div>
  );
}

export function getInstalledPlugins(): LocalModelPlugin[] {
  try {
    const raw = localStorage.getItem(PLUGIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getPluginById(id: string): LocalModelPlugin | undefined {
  return getInstalledPlugins().find(p => p.id === id);
}

export function isComfyUIPluginInstalled(): boolean {
  return getInstalledPlugins().some(p => p.id === 'comfyui-local' && p.status === 'installed');
}
