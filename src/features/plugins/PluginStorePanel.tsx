import { memo, useState, useCallback } from 'react';
import { Download, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePluginRegistry, useInstalledPlugins } from './registry';
import type { Plugin, PluginStoreItem } from './types';

interface PluginStorePanelProps {
  onClose?: () => void;
}

const MOCK_STORE_ITEMS: PluginStoreItem[] = [
  {
    id: 'mock-plugin-remove-bg',
    name: 'Background Remover',
    description: 'One-click background removal for images',
    author: 'Community',
    version: '1.0.0',
    downloadCount: 1250,
    rating: 4.5,
    manifestUrl: 'https://example.com/plugins/remove-bg/manifest.json',
  },
  {
    id: 'mock-plugin-style-transfer',
    name: 'Style Transfer',
    description: 'Apply artistic styles to your images',
    author: 'Community',
    version: '1.2.0',
    downloadCount: 890,
    rating: 4.2,
    manifestUrl: 'https://example.com/plugins/style-transfer/manifest.json',
  },
];

export const PluginStorePanel = memo(({ onClose }: PluginStorePanelProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'store' | 'installed'>('installed');
  const [pluginUrl, setPluginUrl] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { loadPlugin, unloadPlugin, disablePlugin, enablePlugin } = usePluginRegistry();
  const installedPlugins = useInstalledPlugins();

  const handleInstallFromUrl = useCallback(async () => {
    if (!pluginUrl.trim()) return;

    setIsLoading(true);
    setLoadError(null);

    try {
      await loadPlugin(pluginUrl.trim());
      setPluginUrl('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load plugin');
    } finally {
      setIsLoading(false);
    }
  }, [pluginUrl, loadPlugin]);

  const handleInstallFromStore = useCallback(async (item: PluginStoreItem) => {
    setIsLoading(true);
    setLoadError(null);

    try {
      await loadPlugin(item.manifestUrl);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to install plugin');
    } finally {
      setIsLoading(false);
    }
  }, [loadPlugin]);

  const getPluginStatusIcon = (plugin: Plugin) => {
    switch (plugin.state) {
      case 'loaded':
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'disabled':
        return <X className="h-4 w-4 text-yellow-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-dark px-4 py-3">
        <h2 className="text-lg font-semibold text-text-dark">{t('plugin.storeTitle')}</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-dark hover:text-text-dark"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border-dark px-4 py-2">
        <button
          type="button"
          onClick={() => setActiveTab('installed')}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            activeTab === 'installed'
              ? 'bg-accent/20 text-accent'
              : 'text-text-muted hover:bg-bg-dark hover:text-text-dark'
          }`}
        >
          {t('plugin.installedTab')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('store')}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            activeTab === 'store'
              ? 'bg-accent/20 text-accent'
              : 'text-text-muted hover:bg-bg-dark hover:text-text-dark'
          }`}
        >
          {t('plugin.storeTab')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'installed' && (
          <div className="space-y-3">
            {installedPlugins.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-text-muted">{t('plugin.noPluginsInstalled')}</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('store')}
                  className="mt-2 text-sm text-accent hover:underline"
                >
                  {t('plugin.browseStore')}
                </button>
              </div>
            ) : (
              installedPlugins.map((plugin) => (
                <div
                  key={plugin.manifest.id}
                  className="rounded-lg border border-border-dark bg-bg-dark p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getPluginStatusIcon(plugin)}
                      <div>
                        <h3 className="font-medium text-text-dark">{plugin.manifest.name}</h3>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {plugin.manifest.description}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          v{plugin.manifest.version} · {t('plugin.by')} {plugin.manifest.author}
                        </p>
                        {plugin.error && (
                          <p className="mt-1 text-xs text-red-400">{plugin.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {plugin.state === 'loaded' ? (
                        <button
                          type="button"
                          onClick={() => disablePlugin(plugin.manifest.id)}
                          className="flex items-center gap-1 rounded-md bg-bg-dark/60 px-2 py-1 text-xs text-text-muted transition-colors hover:bg-bg-dark hover:text-text-dark"
                        >
                          {t('plugin.disable')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => enablePlugin(plugin.manifest.id)}
                          className="flex items-center gap-1 rounded-md bg-accent/20 px-2 py-1 text-xs text-accent transition-colors hover:bg-accent/30"
                        >
                          {t('plugin.enable')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => unloadPlugin(plugin.manifest.id)}
                        className="flex items-center gap-1 rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-500/30"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'store' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
              <h3 className="mb-3 text-sm font-medium text-text-dark">{t('plugin.installFromUrl')}</h3>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={pluginUrl}
                  onChange={(e) => setPluginUrl(e.target.value)}
                  placeholder="https://example.com/plugin/manifest.json"
                  className="flex-1 rounded-md border border-border-dark bg-bg-darker px-3 py-2 text-sm text-text-dark placeholder:text-text-muted focus:border-accent/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleInstallFromUrl}
                  disabled={isLoading || !pluginUrl.trim()}
                  className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/85 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {isLoading ? t('common.loading') : t('plugin.install')}
                </button>
              </div>
              {loadError && (
                <p className="mt-2 flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {loadError}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-text-dark">{t('plugin.featuredPlugins')}</h3>
              {MOCK_STORE_ITEMS.map((item) => {
                const isInstalled = installedPlugins.some(
                  (p) => p.manifest.id === item.id || p.manifest.name === item.name
                );
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border-dark bg-bg-dark p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-text-dark">{item.name}</h4>
                        <p className="mt-0.5 text-xs text-text-muted">{item.description}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                          <span>{t('plugin.by')} {item.author}</span>
                          <span>v{item.version}</span>
                          <span>★ {item.rating}</span>
                          <span>↓ {item.downloadCount}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isInstalled ? (
                          <span className="flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">
                            <CheckCircle className="h-3 w-3" />
                            {t('plugin.installed')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleInstallFromStore(item)}
                            disabled={isLoading}
                            className="flex items-center gap-1 rounded-md bg-accent/20 px-2 py-1 text-xs text-accent transition-colors hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Download className="h-3 w-3" />
                            {t('plugin.install')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

PluginStorePanel.displayName = 'PluginStorePanel';