import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Plugin, PluginManifest, PluginNodeDefinition, PluginToolDefinition, PluginModelDefinition } from './types';
import { loadPluginManifest, validatePluginManifest, createPluginSandbox } from './sandbox';

interface PluginRegistryState {
  plugins: Map<string, Plugin>;
  installedPluginUrls: string[];
  loadPlugin: (url: string) => Promise<void>;
  unloadPlugin: (id: string) => void;
  enablePlugin: (id: string) => void;
  disablePlugin: (id: string) => void;
  getPluginNodes: () => PluginNodeDefinition[];
  getPluginTools: () => PluginToolDefinition[];
  getPluginModels: () => PluginModelDefinition[];
}

interface PluginInstance {
  terminate: () => void;
}

const PLUGIN_STORAGE_KEY = 'installed-plugins';

export const usePluginRegistry = create<PluginRegistryState>()(
  persist(
    (set, get) => ({
      plugins: new Map(),
      installedPluginUrls: [],

      loadPlugin: async (url: string) => {
        const state = get();
        let manifest: PluginManifest;

        try {
          manifest = await loadPluginManifest(url);
        } catch (error) {
          console.error(`Failed to load plugin manifest from ${url}:`, error);
          return;
        }

        const errors = validatePluginManifest(manifest);
        if (errors.length > 0) {
          console.error(`Plugin manifest validation failed for ${manifest.id}:`, errors);
          return;
        }

        if (state.plugins.has(manifest.id)) {
          console.warn(`Plugin ${manifest.id} is already loaded`);
          return;
        }

        const sandbox = createPluginSandbox(manifest.permissions);

        const plugin: Plugin = {
          manifest,
          state: 'loaded',
          instance: sandbox,
        };

        set((prev) => {
          const newPlugins = new Map(prev.plugins);
          newPlugins.set(manifest.id, plugin);
          return {
            plugins: newPlugins,
            installedPluginUrls: [...prev.installedPluginUrls, url],
          };
        });

        console.log(`Plugin ${manifest.id}@${manifest.version} loaded successfully`);
      },

      unloadPlugin: (id: string) => {
        const plugin = get().plugins.get(id);
        if (!plugin) return;

        if (plugin.instance && typeof plugin.instance === 'object') {
          const instance = plugin.instance as PluginInstance;
          if ('terminate' in instance && typeof instance.terminate === 'function') {
            instance.terminate();
          }
        }

        set((prev) => {
          const newPlugins = new Map(prev.plugins);
          newPlugins.delete(id);
          return { plugins: newPlugins };
        });
      },

      enablePlugin: (id: string) => {
        set((prev) => {
          const plugin = prev.plugins.get(id);
          if (!plugin) return prev;

          const newPlugins = new Map(prev.plugins);
          newPlugins.set(id, { ...plugin, state: 'loaded' });
          return { plugins: newPlugins };
        });
      },

      disablePlugin: (id: string) => {
        set((prev) => {
          const plugin = prev.plugins.get(id);
          if (!plugin) return prev;

          const newPlugins = new Map(prev.plugins);
          newPlugins.set(id, { ...plugin, state: 'disabled' });
          return { plugins: newPlugins };
        });
      },

      getPluginNodes: () => {
        const nodes: PluginNodeDefinition[] = [];
        get().plugins.forEach((plugin) => {
          if (plugin.state === 'loaded' && plugin.manifest.nodes) {
            nodes.push(...plugin.manifest.nodes);
          }
        });
        return nodes;
      },

      getPluginTools: () => {
        const tools: PluginToolDefinition[] = [];
        get().plugins.forEach((plugin) => {
          if (plugin.state === 'loaded' && plugin.manifest.tools) {
            tools.push(...plugin.manifest.tools);
          }
        });
        return tools;
      },

      getPluginModels: () => {
        const models: PluginModelDefinition[] = [];
        get().plugins.forEach((plugin) => {
          if (plugin.state === 'loaded' && plugin.manifest.models) {
            models.push(...plugin.manifest.models);
          }
        });
        return models;
      },
    }),
    {
      name: PLUGIN_STORAGE_KEY,
      partialize: (state) => ({
        installedPluginUrls: state.installedPluginUrls,
      }),
    }
  )
);

export function useInstalledPlugins(): Plugin[] {
  const plugins = usePluginRegistry((state) => state.plugins);
  return Array.from(plugins.values());
}

export function usePlugin(pluginId: string): Plugin | undefined {
  return usePluginRegistry((state) => state.plugins.get(pluginId));
}

export function usePluginNodes(): PluginNodeDefinition[] {
  return usePluginRegistry((state) => state.getPluginNodes());
}

export function usePluginTools(): PluginToolDefinition[] {
  return usePluginRegistry((state) => state.getPluginTools());
}