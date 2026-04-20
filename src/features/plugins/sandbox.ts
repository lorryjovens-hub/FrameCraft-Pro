import type { PluginManifest, PluginSandbox, PluginPermissions } from './types';

export class PluginSandboxImpl implements PluginSandbox {
  private iframe: HTMLIFrameElement | null = null;
  private worker: Worker | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(private permissions: PluginPermissions = {}) {
    this.initSandbox();
  }

  private initSandbox(): void {
    if (typeof window === 'undefined') return;

    const sandboxHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Plugin Sandbox</title></head>
        <body>
          <script>
            window.addEventListener('message', async (event) => {
              const { id, code, context } = event.data;
              try {
                const fn = new Function('context', code);
                const result = await fn(context);
                window.parent.postMessage({ id, success: true, result }, '*');
              } catch (error) {
                window.parent.postMessage({ id, success: false, error: error.message }, '*');
              }
            });
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([sandboxHtml], { type: 'text/html' });
    const iframeUrl = URL.createObjectURL(blob);

    this.iframe = document.createElement('iframe');
    this.iframe.sandbox.add('allow-scripts');
    this.iframe.src = iframeUrl;
    this.iframe.style.display = 'none';
    document.body.appendChild(this.iframe);

    URL.revokeObjectURL(iframeUrl);
  }

  async execute(code: string, context: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.iframe?.contentWindow) {
        reject(new Error('Sandbox not initialized'));
        return;
      }

      const id = `plugin_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const timeout = this.permissions.maxExecutionTime ?? 30000;

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.id === id) {
          window.removeEventListener('message', handleMessage);
          if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
          }
          if (event.data.success) {
            resolve(event.data.result);
          } else {
            reject(new Error(event.data.error));
          }
        }
      };

      window.addEventListener('message', handleMessage);

      this.timeoutId = setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        reject(new Error(`Plugin execution timed out after ${timeout}ms`));
      }, timeout);

      this.iframe.contentWindow.postMessage({ id, code, context }, '*');
    });
  }

  terminate(): void {
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

export async function loadPluginManifest(url: string): Promise<PluginManifest> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load plugin manifest: ${response.statusText}`);
  }
  const manifest = await response.json() as PluginManifest;

  if (!manifest.id || !manifest.name || !manifest.version || !manifest.entry) {
    throw new Error('Invalid plugin manifest: missing required fields');
  }

  return manifest;
}

export function validatePluginManifest(manifest: PluginManifest): string[] {
  const errors: string[] = [];

  if (!manifest.id || typeof manifest.id !== 'string') {
    errors.push('Plugin ID is required and must be a string');
  }
  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push('Plugin name is required and must be a string');
  }
  if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    errors.push('Plugin version must follow semver format (e.g., 1.0.0)');
  }
  if (!manifest.entry || typeof manifest.entry !== 'string') {
    errors.push('Plugin entry point is required');
  }

  return errors;
}

export function createPluginSandbox(permissions?: PluginPermissions): PluginSandbox {
  return new PluginSandboxImpl(permissions);
}