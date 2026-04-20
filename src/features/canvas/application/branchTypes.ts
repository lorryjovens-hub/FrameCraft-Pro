import type { CanvasEdge, CanvasHistoryState, CanvasNode } from '@/stores/canvasStore';
import type { Viewport } from '@xyflow/react';

export interface BranchSnapshot {
  id: string;
  branchId: string;
  name: string;
  createdAt: number;
  triggerType: 'auto' | 'manual' | 'branch_created';
  triggerDescription?: string;
  parentSnapshotId?: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;
  history: CanvasHistoryState;
}

export interface Branch {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  headSnapshotId?: string;
  parentBranchId?: string;
}

export interface ProjectBranches {
  projectId: string;
  branches: Branch[];
  snapshots: BranchSnapshot[];
  activeBranchId: string;
}

export interface MergeConflict {
  snapshotId: string;
  branchId: string;
  fieldPath: string[];
  localValue: unknown;
  remoteValue: unknown;
}

export interface MergeResult {
  success: boolean;
  conflicts: MergeConflict[];
  resolvedSnapshots?: BranchSnapshot[];
  mergedBranchId?: string;
}

export interface BranchCreateOptions {
  name: string;
  fromBranchId?: string;
  fromSnapshotId?: string;
}

export interface BranchMergeOptions {
  sourceBranchId: string;
  targetBranchId: string;
  strategy: 'keep_target' | 'keep_source' | 'manual';
}

export interface IncrementalSnapshotOptions {
  triggerType: 'auto' | 'manual';
  triggerDescription?: string;
  maxSnapshotsPerBranch?: number;
}

export type ConflictResolutionStrategy = 'keep_local' | 'keep_remote' | 'keep_both' | 'manual';

export interface NodeFieldChange {
  nodeId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface SnapshotDiff {
  addedNodes: CanvasNode[];
  removedNodes: CanvasNode[];
  modifiedNodes: Array<{
    nodeId: string;
    changes: NodeFieldChange[];
  }>;
  addedEdges: CanvasEdge[];
  removedEdges: CanvasEdge[];
}

export function computeSnapshotDiff(
  before: BranchSnapshot,
  after: BranchSnapshot
): SnapshotDiff {
  const beforeNodeMap = new Map(before.nodes.map((n) => [n.id, n]));
  const afterNodeMap = new Map(after.nodes.map((n) => [n.id, n]));
  const beforeEdgeMap = new Map(before.edges.map((e) => [e.id, e]));
  const afterEdgeMap = new Map(after.edges.map((e) => [e.id, e]));

  const addedNodes = after.nodes.filter((n) => !beforeNodeMap.has(n.id));
  const removedNodes = before.nodes.filter((n) => !afterNodeMap.has(n.id));
  const addedEdges = after.edges.filter((e) => !beforeEdgeMap.has(e.id));
  const removedEdges = before.edges.filter((e) => !afterEdgeMap.has(e.id));

  const modifiedNodes: SnapshotDiff['modifiedNodes'] = [];
  for (const [nodeId, afterNode] of afterNodeMap) {
    const beforeNode = beforeNodeMap.get(nodeId);
    if (beforeNode && JSON.stringify(beforeNode) !== JSON.stringify(afterNode)) {
      const changes: NodeFieldChange[] = [];
      const beforeData = beforeNode.data as Record<string, unknown>;
      const afterData = afterNode.data as Record<string, unknown>;
      for (const key of Object.keys(afterData)) {
        if (JSON.stringify(beforeData[key]) !== JSON.stringify(afterData[key])) {
          changes.push({
            nodeId,
            field: key,
            oldValue: beforeData[key],
            newValue: afterData[key],
          });
        }
      }
      if (changes.length > 0) {
        modifiedNodes.push({ nodeId, changes });
      }
    }
  }

  return { addedNodes, removedNodes, modifiedNodes, addedEdges, removedEdges };
}