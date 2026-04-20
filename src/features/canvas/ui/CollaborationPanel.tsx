import { memo, useState } from 'react';
import { MessageCircle, Users, CheckCircle2, X, Send, Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCollaborationStore } from '../application/collaborationStore';
import type { TaskStatus, CommentThread } from '../application/collaborationTypes';

const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

const TASK_STATUS_LABELS: Record<TaskStatus, { key: string; color: string }> = {
  todo: { key: 'collab.task.todo', color: 'bg-gray-500/20 text-gray-400' },
  in_progress: { key: 'collab.task.inProgress', color: 'bg-blue-500/20 text-blue-400' },
  review: { key: 'collab.task.review', color: 'bg-yellow-500/20 text-yellow-400' },
  done: { key: 'collab.task.done', color: 'bg-green-500/20 text-green-400' },
};

export const CollaborationPanel = memo(({ onClose }: { onClose?: () => void }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'comments' | 'tasks' | 'users'>('comments');

  const threads = useCollaborationStore((state) => state.getCommentThreads());
  const users = useCollaborationStore((state) => state.users);
  const currentUser = useCollaborationStore((state) => state.currentUser);
  const isConnected = useCollaborationStore((state) => state.isConnected);
  const unreadCount = useCollaborationStore((state) => state.unreadCount);
  const resolveComment = useCollaborationStore((state) => state.resolveComment);

  const onlineUsers = users.filter((u) => u.isOnline);
  const tasksByStatus = TASK_STATUS_ORDER.reduce((acc, status) => {
    acc[status] = threads.filter(
      (t) => t.rootComment.taskStatus === status && !t.rootComment.resolved
    );
    return acc;
  }, {} as Record<TaskStatus, CommentThread[]>);

  const handleStatusFilter = (status: TaskStatus) => {
    const filtered = tasksByStatus[status];
    if (filtered.length > 0) {
      setActiveTab('tasks');
    }
  };

  return (
    <div className="flex h-full flex-col bg-surface-dark">
      <div className="flex items-center justify-between border-b border-border-dark px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-text-dark">{t('collab.title')}</span>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-400" />
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-dark hover:text-text-dark"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-border-dark">
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex flex-1 items-center justify-center gap-1 px-3 py-2 text-xs transition-colors ${
            activeTab === 'comments'
              ? 'border-b-2 border-accent text-accent'
              : 'text-text-muted hover:text-text-dark'
          }`}
        >
          <MessageCircle className="h-3 w-3" />
          {t('collab.comments')}
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-1 items-center justify-center gap-1 px-3 py-2 text-xs transition-colors ${
            activeTab === 'tasks'
              ? 'border-b-2 border-accent text-accent'
              : 'text-text-muted hover:text-text-dark'
          }`}
        >
          <CheckCircle2 className="h-3 w-3" />
          {t('collab.tasks')}
          {threads.filter((t) => t.rootComment.taskStatus && !t.rootComment.resolved).length > 0 && (
            <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent">
              {threads.filter((t) => t.rootComment.taskStatus && !t.rootComment.resolved).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex flex-1 items-center justify-center gap-1 px-3 py-2 text-xs transition-colors ${
            activeTab === 'users'
              ? 'border-b-2 border-accent text-accent'
              : 'text-text-muted hover:text-text-dark'
          }`}
        >
          <Users className="h-3 w-3" />
          {onlineUsers.length}/{users.length}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'comments' && (
          <div className="space-y-2 p-3">
            {threads.length === 0 ? (
              <div className="py-8 text-center">
                <MessageCircle className="mx-auto mb-2 h-8 w-8 text-text-muted/50" />
                <p className="text-sm text-text-muted">{t('collab.noComments')}</p>
              </div>
            ) : (
              threads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  onResolve={() => resolveComment(thread.id)}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4 p-3">
            {TASK_STATUS_ORDER.map((status) => (
              <div key={status} className="space-y-2">
                <button
                  onClick={() => handleStatusFilter(status)}
                  className="flex items-center gap-2 text-xs font-medium text-text-muted hover:text-text-dark"
                >
                  <span className={`inline-block h-2 w-2 rounded-full ${TASK_STATUS_LABELS[status].color}`} />
                  {t(TASK_STATUS_LABELS[status].key)}
                  <span className="text-text-muted">({tasksByStatus[status].length})</span>
                </button>
                {tasksByStatus[status].length > 0 && (
                  <div className="space-y-2">
                    {tasksByStatus[status].map((thread) => (
                      <ThreadCard
                        key={thread.id}
                        thread={thread}
                        onResolve={() => resolveComment(thread.id)}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-2 p-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-lg border border-border-dark bg-bg-dark p-3"
              >
                <div
                  className="relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                  {user.isOnline && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-bg-dark bg-green-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-dark">
                    {user.name}
                    {user.id === currentUser?.id && (
                      <span className="ml-1 text-xs text-accent">({t('collab.you')})</span>
                    )}
                  </p>
                  <p className="text-xs text-text-muted">
                    {user.isOnline ? t('collab.online') : t('collab.offline')}
                  </p>
                </div>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                    user.role === 'owner'
                      ? 'bg-purple-500/20 text-purple-400'
                      : user.role === 'editor'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

CollaborationPanel.displayName = 'CollaborationPanel';

interface ThreadCardProps {
  thread: CommentThread;
  onResolve: () => void;
  compact?: boolean;
}

const ThreadCard = memo(({ thread, onResolve, compact = false }: ThreadCardProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(!compact);
  const { rootComment, replies } = thread;

  return (
    <div
      className={`rounded-lg border transition-colors ${
        rootComment.resolved
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-border-dark bg-bg-dark'
      }`}
    >
      <div
        className="flex items-start gap-2 p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white"
          style={{ backgroundColor: '#3B82F6' }}
        >
          {rootComment.authorName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-dark truncate">
              {rootComment.authorName}
            </span>
            <span className="text-[10px] text-text-muted whitespace-nowrap">
              {formatTimeAgo(rootComment.createdAt)}
            </span>
          </div>
          <p className={`text-xs text-text-dark mt-0.5 ${compact ? 'line-clamp-2' : ''}`}>
            {rootComment.content}
          </p>
          {rootComment.taskStatus && !compact && (
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
                TASK_STATUS_LABELS[rootComment.taskStatus].color
              }`}
            >
              {t(TASK_STATUS_LABELS[rootComment.taskStatus].key)}
            </span>
          )}
        </div>
        {!rootComment.resolved && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResolve();
            }}
            className="shrink-0 rounded p-1 text-text-muted transition-colors hover:bg-green-500/20 hover:text-green-400"
            title={t('collab.resolve')}
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {isExpanded && replies.length > 0 && (
        <div className="border-t border-border-dark px-3 py-2 space-y-2">
          {replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-2 pl-4">
              <div
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white"
                style={{ backgroundColor: '#10B981' }}
              >
                {reply.authorName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-dark truncate">
                    {reply.authorName}
                  </span>
                  <span className="text-[10px] text-text-muted whitespace-nowrap">
                    {formatTimeAgo(reply.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-text-dark">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isExpanded && (
        <div className="border-t border-border-dark px-3 py-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t('collab.reply')}
              className="flex-1 rounded border border-border-dark bg-bg-darker px-2 py-1.5 text-xs text-text-dark placeholder:text-text-muted focus:border-accent focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                }
              }}
            />
            <button className="rounded bg-accent p-1.5 text-white transition-colors hover:bg-accent/80">
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

ThreadCard.displayName = 'ThreadCard';

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}