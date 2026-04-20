import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Plus, Trash2 } from 'lucide-react';

import { useCanvasStore } from '@/stores/canvasStore';
import {
  listTemplates,
  getTemplate,
  saveTemplate,
  deleteTemplate,
  type NodeGroupTemplateSummary,
} from '@/features/canvas/application/nodeTemplate';
import { isGroupNode } from '@/features/canvas/domain/canvasNodes';
import { UiButton, UiInput, UiModal } from '@/components/ui';

interface NodeGroupTemplateDialogProps {
  isOpen?: boolean;
  groupNodeId?: string | null;
  onClose?: () => void;
  initialMode?: 'save' | 'library';
}

export function NodeGroupTemplateDialog({
  isOpen: externalIsOpen,
  groupNodeId: externalGroupNodeId,
  onClose: externalOnClose,
  initialMode,
}: NodeGroupTemplateDialogProps) {
  const { t } = useTranslation();
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const addNodes = useCanvasStore((s) => s.addNodes);
  const addEdges = useCanvasStore((s) => s.addEdges);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);

  const [internalGroupNodeId, setInternalGroupNodeId] = useState<string | null>(null);
  const [internalMode, setInternalMode] = useState<'none' | 'save' | 'library'>('none');
  const [templates, setTemplates] = useState<NodeGroupTemplateSummary[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalMode !== 'none';
  const groupNodeId = isControlled ? externalGroupNodeId : internalGroupNodeId;

  const handleClose = useCallback(() => {
    if (isControlled) {
      externalOnClose?.();
    } else {
      setInternalMode('none');
      setInternalGroupNodeId(null);
    }
    setTemplateName('');
    setTemplateDescription('');
  }, [isControlled, externalOnClose]);

  const handleSaveTemplate = useCallback(async () => {
    if (!templateName.trim() || !groupNodeId) return;
    setSaving(true);

    try {
      const groupNode = nodes.find((n) => n.id === groupNodeId);
      if (!groupNode || !isGroupNode(groupNode)) {
        throw new Error('Invalid group node');
      }

      const childNodes = nodes.filter((n) => n.parentId === groupNodeId);
      saveTemplate(templateName.trim(), templateDescription.trim(), childNodes, edges);
      handleClose();
    } finally {
      setSaving(false);
    }
  }, [templateName, templateDescription, groupNodeId, nodes, edges, handleClose]);

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const template = getTemplate(templateId);
      if (!template) return;

      setApplyingId(templateId);

      const idPrefixMap = new Map<string, string>();
      const newNodes = template.nodes.map((item, idx) => {
        idPrefixMap.set(`${item.type}_${idx}`, `${item.type}_${Date.now()}_${idx}`);
        return {
          id: `${item.type}_${Date.now()}_${idx}`,
          type: item.type,
          data: { ...item.data },
          position: { x: item.position.x + 100, y: item.position.y + 100 },
          width: item.width,
          height: item.height,
        };
      });

      const nodeIdIndexMap = new Map<string, string>();
      template.nodes.forEach((item, idx) => {
        const oldId = `${item.type}_${idx}`;
        const newId = `${item.type}_${Date.now()}_${idx}`;
        nodeIdIndexMap.set(oldId, newId);
      });

      const newEdges = template.edges
        .map((e, idx) => {
          const sourceIdx = template.nodes.findIndex((n, i) => `${n.type}_${i}` === e.source);
          const targetIdx = template.nodes.findIndex((n, i) => `${n.type}_${i}` === e.target);
          if (sourceIdx < 0 || targetIdx < 0) return null;
          return {
            id: `edge_${Date.now()}_${idx}`,
            source: nodeIdIndexMap.get(`${template.nodes[sourceIdx].type}_${sourceIdx}`) ?? '',
            target: nodeIdIndexMap.get(`${template.nodes[targetIdx].type}_${targetIdx}`) ?? '',
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          };
        })
        .filter(Boolean);

      addNodes(newNodes as any);
      if (newEdges.length > 0) {
        addEdges(newEdges as any);
      }
      if (newNodes.length > 0) {
        setSelectedNode(newNodes[0].id);
      }

      setApplyingId(null);
      handleClose();
    },
    [addNodes, addEdges, setSelectedNode, handleClose]
  );

  const handleDeleteTemplate = useCallback((templateId: string) => {
    deleteTemplate(templateId);
    setTemplates(listTemplates());
  }, []);

  useEffect(() => {
    if (isOpen && internalMode === 'none' && initialMode) {
      setInternalMode(initialMode);
      if (initialMode === 'library') {
        setTemplates(listTemplates());
      }
    }
  }, [isOpen, internalMode, initialMode]);

  const title =
    internalMode === 'save' ? t('template.saveAsTemplate') : t('template.templateLibrary');

  const groupNode = internalMode === 'save' && groupNodeId
    ? nodes.find((n) => n.id === groupNodeId)
    : null;
  const childNodeCount = groupNode
    ? nodes.filter((n) => n.parentId === groupNode.id).length
    : 0;

  return (
    <UiModal
      isOpen={isOpen}
      title={title}
      onClose={handleClose}
      widthClassName="max-w-lg"
      footer={
        internalMode === 'save' ? (
          <>
            <UiButton variant="ghost" onClick={handleClose}>
              {t('common.cancel')}
            </UiButton>
            <UiButton
              variant="primary"
              onClick={handleSaveTemplate}
              disabled={!templateName.trim() || saving}
            >
              {saving ? t('common.saving') : t('common.save')}
            </UiButton>
          </>
        ) : null
      }
    >
      {internalMode === 'save' && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-text-muted">
              {t('template.templateName')}
            </label>
            <UiInput
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={t('template.templateNamePlaceholder')}
              className="h-10 w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">
              {t('template.templateDescription')}
            </label>
            <UiInput
              type="text"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder={t('template.templateDescriptionPlaceholder')}
              className="h-10 w-full"
            />
          </div>
          <div className="rounded bg-bg-dark/50 p-3 text-xs text-text-muted">
            {t('template.nodesToSave', { count: childNodeCount })}
          </div>
        </div>
      )}

      {internalMode === 'library' && (
        <div className="flex flex-col gap-3">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-text-muted">
              <LayoutGrid className="h-8 w-8" />
              <span className="text-sm">{t('template.noTemplates')}</span>
            </div>
          ) : (
            templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="flex items-center gap-3 rounded-lg border border-[rgba(255,255,255,0.1)] bg-bg-dark/50 p-3"
              >
                <LayoutGrid className="h-5 w-5 flex-shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{tmpl.name}</div>
                  {tmpl.description && (
                    <div className="truncate text-xs text-text-muted">{tmpl.description}</div>
                  )}
                  <div className="mt-0.5 text-xs text-text-muted">
                    {t('template.nodeCount', { count: tmpl.nodeCount })}
                  </div>
                </div>
                <div className="flex gap-1">
                  <UiButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleApplyTemplate(tmpl.id)}
                    disabled={applyingId === tmpl.id}
                  >
                    <Plus className="h-4 w-4" />
                  </UiButton>
                  <UiButton size="sm" variant="ghost" onClick={() => handleDeleteTemplate(tmpl.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </UiButton>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </UiModal>
  );
}

export type { NodeGroupTemplateDialogProps };