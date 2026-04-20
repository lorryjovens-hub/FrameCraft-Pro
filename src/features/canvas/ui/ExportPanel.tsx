import { memo, useState, useCallback } from 'react';
import { FileDown, FileText, Image, Film, Copy, Loader2, Check, Presentation } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCanvasStore } from '@/stores/canvasStore';
import { extractFramesFromNodes, type ExportFormat } from '../application/exportTypes';
import { exportToPdf, exportToFrames, exportToPng, exportToJson } from '../application/exportUtils';
import { exportToPptxWithJsPptx } from '../application/pptxExportService';
import { MobileBottomDrawer } from './MobileBottomDrawer';

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
}

const FORMAT_OPTIONS: { format: ExportFormat; icon: typeof FileText; labelKey: string; descKey: string }[] = [
  { format: 'pdf', icon: FileText, labelKey: 'export.pdf', descKey: 'export.pdfDesc' },
  { format: 'pptx', icon: Presentation, labelKey: 'export.pptx', descKey: 'export.pptxDesc' },
  { format: 'frames', icon: Film, labelKey: 'export.frames', descKey: 'export.framesDesc' },
  { format: 'png', icon: Image, labelKey: 'export.png', descKey: 'export.pngDesc' },
  { format: 'json', icon: Copy, labelKey: 'export.json', descKey: 'export.jsonDesc' },
];

export const ExportPanel = memo(({ isOpen, onClose, projectName = 'storyboard' }: ExportPanelProps) => {
  const { t } = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [fps, setFps] = useState(24);

  const nodes = useCanvasStore((state) => state.nodes);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const frames = extractFramesFromNodes(nodes);

      if (frames.length === 0) {
        console.warn('No frames to export');
        setIsExporting(false);
        return;
      }

      switch (selectedFormat) {
        case 'pdf':
          await exportToPdf(frames, projectName, { fps });
          break;
        case 'pptx':
          await exportToPptxWithJsPptx(frames, projectName, { title: projectName, fps });
          break;
        case 'frames':
          await exportToFrames(frames, projectName, { fps });
          break;
        case 'png':
          await exportToPng(frames, projectName);
          break;
        case 'json':
          await exportToJson(frames, projectName);
          break;
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [nodes, selectedFormat, projectName, fps]);

  const frames = extractFramesFromNodes(nodes);
  const frameCount = frames.length;

  return (
    <MobileBottomDrawer isOpen={isOpen} onClose={onClose} title={t('export.title')}>
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <p className="text-xs text-text-muted">{t('export.format')}</p>
          <div className="grid grid-cols-2 gap-2">
            {FORMAT_OPTIONS.map(({ format, icon: Icon, labelKey, descKey }) => (
              <button
                key={format}
                onClick={() => setSelectedFormat(format)}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  selectedFormat === format
                    ? 'border-accent bg-accent/10'
                    : 'border-border-dark bg-bg-dark hover:border-border-light'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${
                  selectedFormat === format ? 'text-accent' : 'text-text-muted'
                }`} />
                <div>
                  <p className={`text-sm font-medium ${
                    selectedFormat === format ? 'text-accent' : 'text-text-dark'
                  }`}>
                    {t(labelKey)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">{t(descKey)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedFormat === 'frames' && (
          <div className="space-y-2">
            <label className="text-xs text-text-muted">{t('export.fps')}</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="12"
                max="60"
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm text-text-dark">{fps}</span>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border-dark bg-bg-dark p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-dark">{t('export.preview')}</p>
              <p className="text-xs text-text-muted">
                {frameCount} {t('export.frameCount')}
                {selectedFormat === 'frames' && ` @ ${fps} fps = ${(frameCount / fps).toFixed(1)}s`}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded border border-border-dark bg-bg-darker">
              {frameCount > 0 ? (
                <Film className="h-5 w-5 text-text-muted" />
              ) : (
                <span className="text-xs text-text-muted">0</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting || frameCount === 0}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
            exportSuccess
              ? 'bg-green-500/20 text-green-400'
              : isExporting
                ? 'bg-accent/50 text-white/50'
                : frameCount === 0
                  ? 'bg-bg-dark text-text-muted cursor-not-allowed'
                  : 'bg-accent text-white hover:bg-accent/80'
          }`}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('export.exporting')}
            </>
          ) : exportSuccess ? (
            <>
              <Check className="h-4 w-4" />
              {t('export.success')}
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              {t('export.exportButton')}
            </>
          )}
        </button>

        {frameCount === 0 && (
          <p className="text-center text-xs text-text-muted">{t('export.noFrames')}</p>
        )}
      </div>
    </MobileBottomDrawer>
  );
});

ExportPanel.displayName = 'ExportPanel';