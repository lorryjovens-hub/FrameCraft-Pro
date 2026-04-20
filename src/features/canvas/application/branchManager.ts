import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Viewport } from '@xyflow/react';
import {
  useCanvasStore,
  type CanvasEdge,
  type CanvasHistoryState,
  type CanvasNode,
} from '@/stores/canvasStore';
import type {
  Branch,
  BranchCreateOptions,
  BranchMergeOptions,
  BranchSnapshot,
  IncrementalSnapshotOptions,
  MergeConflict,
  MergeResult,
  SnapshotDiff,
} from './branchTypes';
import { computeSnapshotDiff } from './branchTypes';

const BRANCH_STORAGE_KEY = 'project-branches';
const MAX_SNAPSHOTS_PER_BRANCH = 50;

interface BranchState {
  projectId: string | null;
  branches: Map<string, Branch>;
  snapshots: Map<string, BranchSnapshot>;
  activeBranchId: string | null;
  lastAutoSnapshotTime: number;
}

interface BranchManager extends BranchState {
  initProject: (projectId: string, initialData?: { nodes: CanvasNode[]; edges: CanvasEdge[]; viewport: Viewport; history: CanvasHistoryState }) => void;
  createBranch: (options: BranchCreateOptions) => string;
  switchBranch: (branchId: string) => void;
  deleteBranch: (branchId: string) => void;
  renameBranch: (branchId: string, name: string) => void;
  createSnapshot: (options: IncrementalSnapshotOptions) => string;
  deleteSnapshot: (snapshotId: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
  getActiveBranch: () => Branch | null;
  getActiveSnapshot: () => BranchSnapshot | null;
  getBranchSnapshots: (branchId: string) => BranchSnapshot[];
  mergeBranches: (options: BranchMergeOptions) => MergeResult;
  resolveConflict: (snapshotId: string, fieldPath: string[], resolution: 'keep_local' | 'keep_remote') => void;
  getSnapshotDiff: (fromSnapshotId: string, toSnapshotId: string) => SnapshotDiff | null;
  loadFromStorage: (projectId: string) => void;
  persistToStorage: () => void;
  getAllBranches: () => Branch[];
}

const IMAGE_REF_PREFIX = '__img_ref__:';

function encodeImageRef(imageUrl: string | null | undefined, imagePool: string[], indexMap: Map<string, number>): string | null | undefined {
  if (typeof imageUrl !== 'string' || !imageUrl) return imageUrl;
  const existing = indexMap.get(imageUrl);
  if (typeof existing === 'number') return `${IMAGE_REF_PREFIX}${existing}`;
  const nextIndex = imagePool.length;
  imagePool.push(imageUrl);
  indexMap.set(imageUrl, nextIndex);
  return `${IMAGE_REF_PREFIX}${nextIndex}`;
}

function decodeImageRef(imageUrl: string | null | undefined, imagePool: string[] | undefined): string | null | undefined {
  if (typeof imageUrl !== 'string' || !imagePool || !imageUrl.startsWith(IMAGE_REF_PREFIX)) return imageUrl;
  const index = Number.parseInt(imageUrl.slice(IMAGE_REF_PREFIX.length), 10);
  if (!Number.isFinite(index) || index < 0) return imageUrl;
  return imagePool[index] ?? null;
}

function mapNodeImages(
  nodes: CanvasNode[],
  mapFn: (url: string | null | undefined) => string | null | undefined
): CanvasNode[] {
  return nodes.map((node) => {
    const data = node.data as Record<string, unknown>;
    const nextData: Record<string, unknown> = { ...data };
    if ('imageUrl' in nextData) nextData.imageUrl = mapFn(nextData.imageUrl as string | null | undefined) ?? null;
    if ('previewImageUrl' in nextData) nextData.previewImageUrl = mapFn(nextData.previewImageUrl as string | null | undefined) ?? null;
    if (Array.isArray(nextData.frames)) {
      nextData.frames = (nextData.frames as Record<string, unknown>[]).map((frame) => ({
        ...frame,
        imageUrl: mapFn(frame.imageUrl as string | null | undefined) ?? null,
        previewImageUrl: mapFn(frame.previewImageUrl as string | null | undefined) ?? null,
      }));
    }
    return { ...node, data: nextData as typeof node.data };
  });
}

export const useBranchManager = create<BranchManager>()(
  persist(
    (set, get) => ({
      projectId: null,
      branches: new Map(),
      snapshots: new Map(),
      activeBranchId: null,
      lastAutoSnapshotTime: 0,

      initProject: (projectId, initialData) => {
        const existingActiveBranchId = get().activeBranchId;

        if (existingActiveBranchId && get().branches.has(existingActiveBranchId)) {
          return;
        }

        const mainBranch: Branch = {
          id: uuidv4(),
          name: 'main',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isActive: true,
        };

        const initialSnapshot: BranchSnapshot = {
          id: uuidv4(),
          branchId: mainBranch.id,
          name: 'Initial',
          createdAt: Date.now(),
          triggerType: 'branch_created',
          triggerDescription: 'Initial branch creation',
          nodes: initialData?.nodes ?? [],
          edges: initialData?.edges ?? [],
          viewport: initialData?.viewport ?? { x: 0, y: 0, zoom: 1 },
          history: initialData?.history ?? { past: [], future: [] },
        };

        mainBranch.headSnapshotId = initialSnapshot.id;

        set({
          projectId,
          branches: new Map([[mainBranch.id, mainBranch]]),
          snapshots: new Map([[initialSnapshot.id, initialSnapshot]]),
          activeBranchId: mainBranch.id,
          lastAutoSnapshotTime: Date.now(),
        });
      },

      createBranch: (options) => {
        const state = get();
        if (!state.projectId) return '';

        const sourceBranch = options.fromBranchId
          ? state.branches.get(options.fromBranchId)
          : state.activeBranchId
            ? state.branches.get(state.activeBranchId)
            : null;

        let branchNodes: CanvasNode[] = [];
        let branchEdges: CanvasEdge[] = [];
        let branchViewport: Viewport = { x: 0, y: 0, zoom: 1 };
        let branchHistory: CanvasHistoryState = { past: [], future: [] };
        let parentSnapshotId: string | undefined;

        if (options.fromSnapshotId) {
          const snapshot = state.snapshots.get(options.fromSnapshotId);
          if (snapshot) {
            branchNodes = snapshot.nodes;
            branchEdges = snapshot.edges;
            branchViewport = snapshot.viewport;
            branchHistory = snapshot.history;
            parentSnapshotId = options.fromSnapshotId;
          }
        } else if (sourceBranch) {
          const headSnapshot = sourceBranch.headSnapshotId
            ? state.snapshots.get(sourceBranch.headSnapshotId)
            : null;
          if (headSnapshot) {
            branchNodes = headSnapshot.nodes;
            branchEdges = headSnapshot.edges;
            branchViewport = headSnapshot.viewport;
            branchHistory = headSnapshot.history;
            parentSnapshotId = headSnapshot.id;
          }
        }

        const newBranch: Branch = {
          id: uuidv4(),
          name: options.name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isActive: false,
          parentBranchId: sourceBranch?.id,
        };

        const initialSnapshot: BranchSnapshot = {
          id: uuidv4(),
          branchId: newBranch.id,
          name: `Branch: ${options.name}`,
          createdAt: Date.now(),
          triggerType: 'branch_created',
          triggerDescription: `Created branch "${options.name}"`,
          parentSnapshotId,
          nodes: branchNodes,
          edges: branchEdges,
          viewport: branchViewport,
          history: branchHistory,
        };

        newBranch.headSnapshotId = initialSnapshot.id;

        set((prev) => {
          const newBranches = new Map(prev.branches);
          newBranches.set(newBranch.id, newBranch);
          const newSnapshots = new Map(prev.snapshots);
          newSnapshots.set(initialSnapshot.id, initialSnapshot);
          return { branches: newBranches, snapshots: newSnapshots };
        });

        get().persistToStorage();
        return newBranch.id;
      },

      switchBranch: (branchId) => {
        const state = get();
        const branch = state.branches.get(branchId);
        if (!branch) return;

        const currentCanvasState = useCanvasStore.getState();
        const currentSnapshot = state.activeBranchId
          ? state.snapshots.get(state.branches.get(state.activeBranchId)!.headSnapshotId!)
          : null;

        if (currentSnapshot && state.activeBranchId) {
          const imagePool: string[] = [];
          const indexMap = new Map<string, number>();
          const encode = (url: string | null | undefined) => encodeImageRef(url, imagePool, indexMap);

          const updatedSnapshot: BranchSnapshot = {
            ...currentSnapshot,
            nodes: mapNodeImages(currentCanvasState.nodes, encode),
            edges: currentCanvasState.edges,
            viewport: currentCanvasState.currentViewport,
            history: currentCanvasState.history,
          };

          set((prev) => {
            const newSnapshots = new Map(prev.snapshots);
            newSnapshots.set(updatedSnapshot.id, updatedSnapshot);
            const newBranches = new Map(prev.branches);
            const currentBranch = newBranches.get(state.activeBranchId!);
            if (currentBranch) {
              newBranches.set(state.activeBranchId!, {
                ...currentBranch,
                headSnapshotId: updatedSnapshot.id,
                updatedAt: Date.now(),
              });
            }
            return { snapshots: newSnapshots, branches: newBranches };
          });
        }

        const targetSnapshot = branch.headSnapshotId
          ? state.snapshots.get(branch.headSnapshotId)
          : null;

        if (targetSnapshot) {
          const imagePool: string[] = [];
          const decode = (url: string | null | undefined) => decodeImageRef(url, imagePool);

          useCanvasStore.getState().setCanvasData(
            mapNodeImages(targetSnapshot.nodes, decode),
            targetSnapshot.edges,
            targetSnapshot.history
          );
          useCanvasStore.getState().setViewportState(targetSnapshot.viewport);
        }

        set((prev) => {
          const newBranches = new Map(prev.branches);
          if (prev.activeBranchId) {
            const currentBranch = newBranches.get(prev.activeBranchId);
            if (currentBranch) {
              newBranches.set(prev.activeBranchId, { ...currentBranch, isActive: false });
            }
          }
          const targetBranch = newBranches.get(branchId);
          if (targetBranch) {
            newBranches.set(branchId, { ...targetBranch, isActive: true, updatedAt: Date.now() });
          }
          return { branches: newBranches, activeBranchId: branchId };
        });

        get().persistToStorage();
      },

      deleteBranch: (branchId) => {
        const state = get();
        if (state.branches.size <= 1) return;
        if (state.activeBranchId === branchId) return;

        set((prev) => {
          const newBranches = new Map(prev.branches);
          const newSnapshots = new Map(prev.snapshots);
          const branch = newBranches.get(branchId);
          if (branch?.headSnapshotId) {
            newSnapshots.delete(branch.headSnapshotId);
          }
          newBranches.delete(branchId);
          return { branches: newBranches, snapshots: newSnapshots };
        });

        get().persistToStorage();
      },

      renameBranch: (branchId, name) => {
        set((prev) => {
          const newBranches = new Map(prev.branches);
          const branch = newBranches.get(branchId);
          if (branch) {
            newBranches.set(branchId, { ...branch, name, updatedAt: Date.now() });
          }
          return { branches: newBranches };
        });
        get().persistToStorage();
      },

      createSnapshot: (options) => {
        const state = get();
        if (!state.activeBranchId) return '';

        const branch = state.branches.get(state.activeBranchId);
        if (!branch) return '';

        const maxSnapshots = options.maxSnapshotsPerBranch ?? MAX_SNAPSHOTS_PER_BRANCH;
        const branchSnapshots = Array.from(state.snapshots.values())
          .filter((s) => s.branchId === state.activeBranchId);
        const snapshotCount = branchSnapshots.length;

        const currentCanvasState = useCanvasStore.getState();
        const parentSnapshot = branch.headSnapshotId
          ? state.snapshots.get(branch.headSnapshotId)
          : null;

        const imagePool: string[] = [];
        const indexMap = new Map<string, number>();
        const encode = (url: string | null | undefined) => encodeImageRef(url, imagePool, indexMap);

        const newSnapshot: BranchSnapshot = {
          id: uuidv4(),
          branchId: state.activeBranchId,
          name: options.triggerDescription ?? `Snapshot ${snapshotCount + 1}`,
          createdAt: Date.now(),
          triggerType: options.triggerType,
          triggerDescription: options.triggerDescription,
          parentSnapshotId: parentSnapshot?.id,
          nodes: mapNodeImages(currentCanvasState.nodes, encode),
          edges: currentCanvasState.edges,
          viewport: currentCanvasState.currentViewport,
          history: currentCanvasState.history,
        };

        set((prev) => {
          const newSnapshots = new Map(prev.snapshots);
          newSnapshots.set(newSnapshot.id, newSnapshot);

          const newBranches = new Map(prev.branches);
          const currentBranch = newBranches.get(state.activeBranchId!);
          if (currentBranch) {
            newBranches.set(state.activeBranchId!, {
              ...currentBranch,
              headSnapshotId: newSnapshot.id,
              updatedAt: Date.now(),
            });
          }

          if (snapshotCount >= maxSnapshots) {
            const oldestSnapshot = Array.from(newSnapshots.values())
              .filter((s) => s.branchId === state.activeBranchId && s.id !== newSnapshot.id)
              .sort((a, b) => a.createdAt - b.createdAt)[0];
            if (oldestSnapshot) {
              newSnapshots.delete(oldestSnapshot.id);
            }
          }

          return { snapshots: newSnapshots, branches: newBranches, lastAutoSnapshotTime: Date.now() };
        });

        get().persistToStorage();
        return newSnapshot.id;
      },

      deleteSnapshot: (snapshotId) => {
        set((prev) => {
          const newSnapshots = new Map(prev.snapshots);
          newSnapshots.delete(snapshotId);
          return { snapshots: newSnapshots };
        });
        get().persistToStorage();
      },

      restoreSnapshot: (snapshotId) => {
        const state = get();
        const snapshot = state.snapshots.get(snapshotId);
        if (!snapshot) return;

        const imagePool: string[] = [];
        const decode = (url: string | null | undefined) => decodeImageRef(url, imagePool);

        useCanvasStore.getState().setCanvasData(
          mapNodeImages(snapshot.nodes, decode),
          snapshot.edges,
          snapshot.history
        );
        useCanvasStore.getState().setViewportState(snapshot.viewport);

        set((prev) => {
          const newBranches = new Map(prev.branches);
          const currentBranch = newBranches.get(snapshot.branchId);
          if (currentBranch) {
            newBranches.set(snapshot.branchId, {
              ...currentBranch,
              headSnapshotId: snapshotId,
              updatedAt: Date.now(),
            });
          }
          return { branches: newBranches };
        });

        get().persistToStorage();
      },

      getActiveBranch: () => {
        const state = get();
        return state.activeBranchId ? state.branches.get(state.activeBranchId) ?? null : null;
      },

      getActiveSnapshot: () => {
        const state = get();
        const branch = state.activeBranchId ? state.branches.get(state.activeBranchId) : null;
        if (!branch?.headSnapshotId) return null;
        return state.snapshots.get(branch.headSnapshotId) ?? null;
      },

      getBranchSnapshots: (branchId) => {
        const state = get();
        return Array.from(state.snapshots.values())
          .filter((s) => s.branchId === branchId)
          .sort((a, b) => b.createdAt - a.createdAt);
      },

      mergeBranches: (options) => {
        const state = get();
        const sourceBranch = state.branches.get(options.sourceBranchId);
        const targetBranch = state.branches.get(options.targetBranchId);

        if (!sourceBranch || !targetBranch) {
          return { success: false, conflicts: [] };
        }

        const sourceSnapshot = sourceBranch.headSnapshotId
          ? state.snapshots.get(sourceBranch.headSnapshotId)
          : null;
        const targetSnapshot = targetBranch.headSnapshotId
          ? state.snapshots.get(targetBranch.headSnapshotId)
          : null;

        if (!sourceSnapshot || !targetSnapshot) {
          return { success: false, conflicts: [] };
        }

        const conflicts: MergeConflict[] = [];
        const sourceNodeMap = new Map(sourceSnapshot.nodes.map((n) => [n.id, n]));
        const targetNodeMap = new Map(targetSnapshot.nodes.map((n) => [n.id, n]));

        for (const [nodeId, sourceNode] of sourceNodeMap) {
          const targetNode = targetNodeMap.get(nodeId);
          if (targetNode && JSON.stringify(sourceNode.data) !== JSON.stringify(targetNode.data)) {
            conflicts.push({
              snapshotId: sourceSnapshot.id,
              branchId: options.sourceBranchId,
              fieldPath: ['nodes', nodeId],
              localValue: targetNode.data,
              remoteValue: sourceNode.data,
            });
          }
        }

        if (conflicts.length > 0 && options.strategy === 'manual') {
          return { success: false, conflicts };
        }

        const mergedNodes = [...targetSnapshot.nodes];
        const mergedEdges = [...targetSnapshot.edges];

        for (const sourceNode of sourceSnapshot.nodes) {
          if (!targetNodeMap.has(sourceNode.id)) {
            mergedNodes.push(sourceNode);
          }
        }

        for (const sourceEdge of sourceSnapshot.edges) {
          const exists = mergedEdges.some((e) => e.id === sourceEdge.id);
          if (!exists) {
            mergedEdges.push(sourceEdge);
          }
        }

        const mergedSnapshot: BranchSnapshot = {
          id: uuidv4(),
          branchId: options.targetBranchId,
          name: `Merge "${sourceBranch.name}" into "${targetBranch.name}"`,
          createdAt: Date.now(),
          triggerType: 'manual',
          triggerDescription: `Merged branch "${sourceBranch.name}"`,
          parentSnapshotId: targetSnapshot.id,
          nodes: mergedNodes,
          edges: mergedEdges,
          viewport: targetSnapshot.viewport,
          history: targetSnapshot.history,
        };

        set((prev) => {
          const newSnapshots = new Map(prev.snapshots);
          newSnapshots.set(mergedSnapshot.id, mergedSnapshot);
          const newBranches = new Map(prev.branches);
          const updatedTargetBranch = newBranches.get(options.targetBranchId);
          if (updatedTargetBranch) {
            newBranches.set(options.targetBranchId, {
              ...updatedTargetBranch,
              headSnapshotId: mergedSnapshot.id,
              updatedAt: Date.now(),
            });
          }
          return { snapshots: newSnapshots, branches: newBranches };
        });

        get().persistToStorage();

        return {
          success: true,
          conflicts: [],
          mergedBranchId: options.targetBranchId,
        };
      },

      resolveConflict: (snapshotId, fieldPath, resolution) => {
        console.log('Resolving conflict:', { snapshotId, fieldPath, resolution });
      },

      getSnapshotDiff: (fromSnapshotId, toSnapshotId) => {
        const state = get();
        const from = state.snapshots.get(fromSnapshotId);
        const to = state.snapshots.get(toSnapshotId);
        if (!from || !to) return null;
        return computeSnapshotDiff(from, to);
      },

      loadFromStorage: (projectId) => {
        const stored = localStorage.getItem(`${BRANCH_STORAGE_KEY}-${projectId}`);
        if (!stored) return;
        try {
          const data = JSON.parse(stored);
          set({
            projectId,
            branches: new Map(data.branches),
            snapshots: new Map(data.snapshots),
            activeBranchId: data.activeBranchId,
          });
        } catch (e) {
          console.error('Failed to load branch data from storage:', e);
        }
      },

      persistToStorage: () => {
        const state = get();
        if (!state.projectId) return;
        const data = {
          branches: Array.from(state.branches.entries()),
          snapshots: Array.from(state.snapshots.entries()),
          activeBranchId: state.activeBranchId,
        };
        localStorage.setItem(`${BRANCH_STORAGE_KEY}-${state.projectId}`, JSON.stringify(data));
      },

      getAllBranches: () => {
        return Array.from(get().branches.values());
      },
    }),
    {
      name: BRANCH_STORAGE_KEY,
      partialize: (state) => ({
        projectId: state.projectId,
        branches: Array.from(state.branches.entries()),
        snapshots: Array.from(state.snapshots.entries()),
        activeBranchId: state.activeBranchId,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as {
          projectId: string | null;
          branches: [string, Branch][];
          snapshots: [string, BranchSnapshot][];
          activeBranchId: string | null;
        };
        return {
          ...current,
          projectId: persistedState.projectId,
          branches: new Map(persistedState.branches ?? []),
          snapshots: new Map(persistedState.snapshots ?? []),
          activeBranchId: persistedState.activeBranchId,
        };
      },
    }
  )
);