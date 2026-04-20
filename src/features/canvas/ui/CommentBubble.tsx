import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { MessageCircle, Send, MoreHorizontal, Check, X, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCollaborationStore } from '../application/collaborationStore';
import type { Comment, TaskStatus } from '../application/collaborationTypes';

interface CommentBubbleProps {
  nodeId: string;
  position: { x: number; y: number };
  isActive?: boolean;
  onClose?: () => void;
}

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: 'collab.task.todo', color: 'bg-gray-500/20 text-gray-400' },
  in_progress: { label: 'collab.task.inProgress', color: 'bg-blue-500/20 text-blue-400' },
  review: { label: 'collab.task.review', color: 'bg-yellow-500/20 text-yellow-400' },
  done: { label: 'collab.task.done', color: 'bg-green-500/20 text-green-400' },
};

export const CommentBubble = memo(({ nodeId, position, isActive = false, onClose }: CommentBubbleProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(isActive);
  const [newComment, setNewComment] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const comments = useCollaborationStore((state) =>
    state.comments.filter((c) => c.nodeId === nodeId && c.parentId === null)
  );
  const unresolvedCount = comments.filter((c) => !c.resolved).length;
  const currentUser = useCollaborationStore((state) => state.currentUser);
  const addComment = useCollaborationStore((state) => state.addComment);
  const resolveComment = useCollaborationStore((state) => state.resolveComment);
  const updateTaskStatus = useCollaborationStore((state) => state.updateTaskStatus);
  const deleteComment = useCollaborationStore((state) => state.deleteComment);

  const handleSubmit = useCallback(() => {
    if (!newComment.trim() || !currentUser) return;
    addComment(nodeId, newComment.trim(), position);
    setNewComment('');
  }, [newComment, nodeId, position, currentUser, addComment]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!isActive) {
          onClose?.();
        }
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, isActive, onClose]);

  return (
    <div
      ref={containerRef}
      className="absolute z-50"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className={`flex items-center gap-1 rounded-full shadow-lg transition-all ${
          isExpanded
            ? 'bg-surface-dark border border-border-dark rounded-2xl p-2'
            : unresolvedCount > 0
              ? 'bg-accent text-white px-2 py-1'
              : 'bg-bg-dark border border-border-dark text-text-muted hover:text-text-dark'
        }`}
      >
        {isExpanded ? (
          <div className="w-64">
            <div className="flex items-center justify-between border-b border-border-dark pb-2 mb-2">
              <span className="text-xs font-medium text-text-dark">
                {comments.length} {t('collab.comments')}
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded hover:bg-bg-dark"
              >
                <X className="h-3 w-3 text-text-muted" />
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto mb-2">
              {comments.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-4">
                  {t('collab.noComments')}
                </p>
              ) : (
                comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onResolve={() => resolveComment(comment.id)}
                    onDelete={() => deleteComment(comment.id)}
                    onUpdateTask={(status) => updateTaskStatus(comment.id, status)}
                  />
                ))
              )}
            </div>

            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('collab.addComment')}
                className="flex-1 resize-none rounded border border-border-dark bg-bg-dark px-2 py-1 text-xs text-text-dark placeholder:text-text-muted focus:border-accent focus:outline-none"
                rows={2}
              />
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim()}
                className="self-end rounded bg-accent p-1.5 text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1 px-1.5 py-1"
          >
            <MessageCircle className="h-3 w-3" />
            {unresolvedCount > 0 && (
              <span className="text-xs font-medium">{unresolvedCount}</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
});

CommentBubble.displayName = 'CommentBubble';

interface CommentItemProps {
  comment: Comment;
  onResolve: () => void;
  onDelete: () => void;
  onUpdateTask: (status: TaskStatus) => void;
}

const CommentItem = memo(({ comment, onResolve, onDelete, onUpdateTask }: CommentItemProps) => {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [showTaskMenu, setShowTaskMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowTaskMenu(false);
      }
    };

    if (showMenu || showTaskMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, showTaskMenu]);

  const renderContent = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-accent font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      ref={menuRef}
      className={`group relative rounded-lg border p-2 ${
        comment.resolved
          ? 'border-green-500/30 bg-green-500/10'
          : 'border-border-dark bg-bg-dark'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
              style={{ backgroundColor: '#3B82F6' }}
            >
              {comment.authorName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-text-dark truncate">
              {comment.authorName}
            </span>
            <span className="text-[10px] text-text-muted">
              {formatTimeAgo(comment.createdAt)}
            </span>
          </div>

          <p className="text-xs text-text-dark break-words">
            {renderContent(comment.content)}
          </p>

          {comment.taskStatus && (
            <div className="mt-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
                  TASK_STATUS_CONFIG[comment.taskStatus].color
                }`}
              >
                <Check className="h-2.5 w-2.5" />
                {t(TASK_STATUS_CONFIG[comment.taskStatus].label)}
              </span>
              {comment.taskAssigneeName && (
                <span className="ml-1 text-[10px] text-text-muted">
                  → @{comment.taskAssigneeName}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-bg-darker transition-opacity"
          >
            <MoreHorizontal className="h-3 w-3 text-text-muted" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-border-dark bg-surface-dark shadow-lg z-10 py-1">
              {!comment.resolved && (
                <button
                  onClick={() => {
                    onResolve();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-text-dark hover:bg-bg-dark"
                >
                  <Check className="h-3 w-3 text-green-400" />
                  {t('collab.resolve')}
                </button>
              )}
              <button
                onClick={() => {
                  setShowTaskMenu(!showTaskMenu);
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-text-dark hover:bg-bg-dark"
              >
                <User className="h-3 w-3 text-blue-400" />
                {t('collab.setTask')}
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:bg-bg-dark"
              >
                <X className="h-3 w-3" />
                {t('collab.delete')}
              </button>

              {showTaskMenu && (
                <div className="border-t border-border-dark mt-1 pt-1">
                  {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        onUpdateTask(status);
                        setShowMenu(false);
                        setShowTaskMenu(false);
                      }}
                      className={`flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-bg-dark ${
                        comment.taskStatus === status ? 'text-accent' : 'text-text-dark'
                      }`}
                    >
                      {t(TASK_STATUS_CONFIG[status].label)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CommentItem.displayName = 'CommentItem';

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}