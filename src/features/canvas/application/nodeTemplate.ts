import type { CanvasNode, CanvasEdge } from '@/stores/canvasStore';
import type { CanvasNodeData, CanvasNodeType } from '@/features/canvas/domain/canvasNodes';

const TEMPLATES_STORAGE_KEY = 'storyboard-copilot:node-group-templates';

export interface NodeTemplateItem {
  type: CanvasNodeType;
  data: Partial<CanvasNodeData>;
  position: { x: number; y: number };
  width?: number;
  height?: number;
}

export interface EdgeTemplateItem {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface NodeGroupTemplate {
  id: string;
  name: string;
  description?: string;
  nodes: NodeTemplateItem[];
  edges: EdgeTemplateItem[];
  createdAt: number;
  updatedAt: number;
}

export interface NodeGroupTemplateSummary {
  id: string;
  name: string;
  description?: string;
  nodeCount: number;
  createdAt: number;
  updatedAt: number;
}

function generateId(): string {
  return `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function listTemplates(): NodeGroupTemplateSummary[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const templates: NodeGroupTemplate[] = JSON.parse(raw);
    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      nodeCount: t.nodes.length,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  } catch {
    return [];
  }
}

export function getTemplate(id: string): NodeGroupTemplate | null {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return null;
    const templates: NodeGroupTemplate[] = JSON.parse(raw);
    return templates.find((t) => t.id === id) ?? null;
  } catch {
    return null;
  }
}

export function saveTemplate(
  name: string,
  description: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): NodeGroupTemplate {
  const templateNodes: NodeTemplateItem[] = nodes.map((node) => ({
    type: node.type!,
    data: { ...node.data },
    position: { x: node.position.x, y: node.position.y },
    width: node.width,
    height: node.height,
  }));

  const templateEdges: EdgeTemplateItem[] = edges
    .filter((e) => !e.source.startsWith('groupNode') && !e.target.startsWith('groupNode'))
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    }));

  const now = Date.now();
  const template: NodeGroupTemplate = {
    id: generateId(),
    name,
    description,
    nodes: templateNodes,
    edges: templateEdges,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    const templates: NodeGroupTemplate[] = raw ? JSON.parse(raw) : [];
    templates.unshift(template);
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch {
    throw new Error('保存模板失败');
  }

  return template;
}

export function deleteTemplate(id: string): boolean {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return false;
    const templates: NodeGroupTemplate[] = JSON.parse(raw);
    const filtered = templates.filter((t) => t.id !== id);
    if (filtered.length === templates.length) return false;
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

export function renameTemplate(id: string, name: string, description?: string): boolean {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return false;
    const templates: NodeGroupTemplate[] = JSON.parse(raw);
    const template = templates.find((t) => t.id === id);
    if (!template) return false;
    template.name = name;
    if (description !== undefined) {
      template.description = description;
    }
    template.updatedAt = Date.now();
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    return true;
  } catch {
    return false;
  }
}