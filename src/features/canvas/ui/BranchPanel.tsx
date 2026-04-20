import { memo, useState, useCallback } from 'react';
import { GitBranch, GitMerge, Plus, Trash2, ChevronRight, Clock, AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBranchManager } from '../application/branchManager';
import type { BranchSnapshot, MergeConflict } from '../application/branchTypes';

interface BranchPanelProps {
  onClose?: () => void;
}

export const BranchPanel = memo(({ onClose }: BranchPanelProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'branches' | 'history' | 'merge'>('branches');
  const [newBranchName, setNewBranchName] = useState('');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [mergeConflicts, setMergeConflicts] = useState<MergeConflict[]>([]);

  const {
    getAllBranches,
    getActiveBranch,
    getActiveSnapshot,
    getBranchSnapshots,
    createBranch,
    switchBranch,
    deleteBranch,
    createSnapshot,
    restoreSnapshot,
    mergeBranches,
  } = useBranchManager();

  const branches = getAllBranches();
  const activeBranch = getActiveBranch();
  getActiveSnapshot();
  const currentBranchSnapshots = activeBranch ? getBranchSnapshots(activeBranch.id) : [];

  const handleCreateBranch = useCallback(() => {
    if (!newBranchName.trim()) return;
    createBranch({ name: newBranchName.trim() });
    setNewBranchName('');
    setIsCreatingBranch(false);
  }, [newBranchName, createBranch]);

  const handleSwitchBranch = useCallback((branchId: string) => {
    switchBranch(branchId);
  }, [switchBranch]);

  const handleDeleteBranch = useCallback((branchId: string) => {
    deleteBranch(branchId);
  }, [deleteBranch]);

  const handleCreateSnapshot = useCallback(() => {
    createSnapshot({
      triggerType: 'manual',
      triggerDescription: 'Manual snapshot',
    });
  }, [createSnapshot]);

  const handleRestoreSnapshot = useCallback((snapshot: BranchSnapshot) => {
    restoreSnapshot(snapshot.id);
  }, [restoreSnapshot]);

  const handleMerge = useCallback(() => {
    if (!mergeSourceId || !mergeTargetId) return;
    const result = mergeBranches({
      sourceBranchId: mergeSourceId,
      targetBranchId: mergeTargetId,
      strategy: mergeConflicts.length > 0 ? 'manual' : 'keep_target',
    });
    if (result.success) {
      setMergeSourceId(null);
      setMergeTargetId(null);
      setMergeConflicts([]);
    } else if (result.conflicts.length > 0) {
      setMergeConflicts(result.conflicts);
      setActiveTab('merge');
    }
  }, [mergeSourceId, mergeTargetId, mergeConflicts.length, mergeBranches]);

  return (
    <div className="flex h-full flex-col bg-surface-dark">
      <div className="flex items-center justify-between border-b border-border-dark px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-text-dark">{t('branch.title')}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-dark hover:text-text-dark"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex border-b border-border-dark">
        <button
          onClick={() => setActiveTab('branches')}
          className={`flex flex-1 items-center justify-center gap-1 px-3 py-2 text-xs transition-colors ${
            activeTab === 'branches'
              ? 'border-b-2 border-accent text-accent'
              : 'text-text-muted hover:text-text-dark'
          }`}
        >
          <GitBranch className="h-3 w-3" />
          {t('branch.branchesTab')}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-1 items-center justify-center gap-1 px-3 py-2 text-xs transition-colors ${
            activeTab === 'history'
              ? 'border-b-2 border-accent text-accent'
              : 'text-text-muted hover:text-text-dark'
          }`}
        >
          <Clock className="h-3 w-3" />
          {t('branch.historyTab')}
        </button>
        <button
          onClick={() => setActiveTab('merge')}
          className={`flex flex-1 items-center justify-center gap-1 px-3 py-2 text-xs transition-colors ${
            activeTab === 'merge'
              ? 'border-b-2 border-accent text-accent'
              : 'text-text-muted hover:text-text-dark'
          }`}
        >
          <GitMerge className="h-3 w-3" />
          {t('branch.mergeTab')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'branches' && (
          <div className="space-y-2 p-3">
            {activeBranch && (
              <div className="mb-3">
                <p className="mb-1 text-xs text-text-muted">{t('branch.currentBranch')}</p>
                <div className="flex items-center gap-2 rounded-lg border border-accent/50 bg-accent/10 px-3 py-2">
                  <GitBranch className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-text-dark">{activeBranch.name}</span>
                  {activeBranch.parentBranchId && (
                    <span className="ml-auto text-xs text-text-muted">
                      ← {branches.find((b) => b.id === activeBranch.parentBranchId)?.name}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs text-text-muted">{t('branch.allBranches')}</p>
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                    branch.id === activeBranch?.id
                      ? 'border-accent/50 bg-accent/10'
                      : 'border-border-dark bg-bg-dark hover:border-border-light'
                  }`}
                >
                  <GitBranch className="h-4 w-4 text-text-muted" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-dark">{branch.name}</span>
                      {branch.id === activeBranch?.id && (
                        <span className="text-xs text-accent">{t('branch.active')}</span>
                      )}
                    </div>
                    <span className="text-xs text-text-muted">
                      {new Date(branch.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {branch.id !== activeBranch?.id && (
                      <>
                        <button
                          onClick={() => handleSwitchBranch(branch.id)}
                          className="rounded px-2 py-1 text-xs text-accent transition-colors hover:bg-accent/20"
                        >
                          {t('branch.switch')}
                        </button>
                        <button
                          onClick={() => handleDeleteBranch(branch.id)}
                          className="rounded p-1 text-text-muted transition-colors hover:bg-red-500/20 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {isCreatingBranch ? (
              <div className="mt-3 space-y-2 rounded-lg border border-border-dark bg-bg-dark p-3">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder={t('branch.newBranchNamePlaceholder')}
                  className="w-full rounded border border-border-dark bg-bg-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-muted focus:border-accent focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateBranch();
                    if (e.key === 'Escape') setIsCreatingBranch(false);
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateBranch}
                    className="flex-1 rounded bg-accent px-3 py-1.5 text-xs text-white transition-colors hover:bg-accent/80"
                  >
                    {t('branch.create')}
                  </button>
                  <button
                    onClick={() => setIsCreatingBranch(false)}
                    className="flex-1 rounded border border-border-dark px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-dark"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingBranch(true)}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border-dark px-3 py-2 text-xs text-text-muted transition-colors hover:border-accent hover:text-accent"
              >
                <Plus className="h-3 w-3" />
                {t('branch.createNewBranch')}
              </button>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                {currentBranchSnapshots.length} {t('branch.historyTab').toLowerCase()}
              </p>
              <button
                onClick={handleCreateSnapshot}
                className="flex items-center gap-1 rounded bg-accent/20 px-2 py-1 text-xs text-accent transition-colors hover:bg-accent/30"
              >
                <Plus className="h-3 w-3" />
                {t('branch.createSnapshot')}
              </button>
            </div>

            {currentBranchSnapshots.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-text-muted/50" />
                <p className="text-sm text-text-muted">{t('branch.noSnapshots')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentBranchSnapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="flex items-start gap-3 rounded-lg border border-border-dark bg-bg-dark p-3 transition-colors hover:border-border-light"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-dark">{snapshot.name}</span>
                        <span className={`rounded px-1.5 py-0.5 text-xs ${
                          snapshot.triggerType === 'auto'
                            ? 'bg-blue-500/20 text-blue-400'
                            : snapshot.triggerType === 'manual'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {snapshot.triggerType}
                        </span>
                      </div>
                      {snapshot.triggerDescription && (
                        <p className="mt-1 text-xs text-text-muted">{snapshot.triggerDescription}</p>
                      )}
                      <p className="mt-1 text-xs text-text-muted">
                        {new Date(snapshot.createdAt).toLocaleString()}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded bg-bg-dark px-1.5 py-0.5 text-xs text-text-muted">
                          {snapshot.nodes.length} nodes
                        </span>
                        <span className="rounded bg-bg-dark px-1.5 py-0.5 text-xs text-text-muted">
                          {snapshot.edges.length} edges
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestoreSnapshot(snapshot)}
                      className="rounded px-2 py-1 text-xs text-accent transition-colors hover:bg-accent/20"
                    >
                      {t('branch.restore')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'merge' && (
          <div className="space-y-3 p-3">
            <div className="space-y-2">
              <p className="text-xs text-text-muted">{t('branch.selectMergeSource')}</p>
              <div className="space-y-1">
                {branches.filter((b) => b.id !== activeBranch?.id).map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => setMergeSourceId(branch.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                      mergeSourceId === branch.id
                        ? 'border-accent bg-accent/10'
                        : 'border-border-dark bg-bg-dark hover:border-border-light'
                    }`}
                  >
                    <GitBranch className="h-4 w-4 text-text-muted" />
                    <span className="text-sm text-text-dark">{branch.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <ChevronRight className="h-4 w-4 text-text-muted rotate-90" />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-text-muted">{t('branch.selectMergeTarget')}</p>
              <div className="space-y-1">
                {branches.filter((b) => b.id !== mergeSourceId).map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => setMergeTargetId(branch.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                      mergeTargetId === branch.id
                        ? 'border-accent bg-accent/10'
                        : 'border-border-dark bg-bg-dark hover:border-border-light'
                    }`}
                  >
                    <GitBranch className="h-4 w-4 text-text-muted" />
                    <span className="text-sm text-text-dark">{branch.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {mergeConflicts.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-yellow-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{t('branch.conflictsFound', { count: mergeConflicts.length })}</span>
                </div>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded border border-yellow-500/30 bg-yellow-500/10 p-2">
                  {mergeConflicts.map((conflict, index) => (
                    <div key={index} className="text-xs">
                      <span className="text-text-muted">{conflict.fieldPath.join('.')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleMerge}
              disabled={!mergeSourceId || !mergeTargetId}
              className="flex w-full items-center justify-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs text-white transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <GitMerge className="h-3 w-3" />
              {t('branch.merge')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

BranchPanel.displayName = 'BranchPanel';