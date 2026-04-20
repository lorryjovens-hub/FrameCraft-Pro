export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export type MentionType = 'user' | 'role' | 'all';

export interface Mention {
  type: MentionType;
  id: string;
  name: string;
}

export interface Comment {
  id: string;
  nodeId: string | null;
  parentId: string | null;
  authorId: string;
  authorName: string;
  content: string;
  mentions: Mention[];
  createdAt: number;
  updatedAt: number;
  resolved: boolean;
  taskStatus?: TaskStatus;
  taskAssigneeId?: string;
  taskAssigneeName?: string;
  position?: { x: number; y: number };
}

export interface CollaborationUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  role: 'owner' | 'editor' | 'viewer';
  isOnline: boolean;
  cursor?: { x: number; y: number };
  lastActiveAt: number;
}

export interface CollaborationSession {
  id: string;
  projectId: string;
  name: string;
  users: CollaborationUser[];
  createdAt: number;
  isActive: boolean;
}

export interface CollaborationOperation {
  type: 'add_comment' | 'update_comment' | 'delete_comment' | 'resolve_comment' | 'update_task' | 'cursor_move';
  timestamp: number;
  userId: string;
  payload: Record<string, unknown>;
  vectorClock: Record<string, number>;
}

export interface CRDTDocument {
  sessionId: string;
  comments: Map<string, Comment>;
  operations: CollaborationOperation[];
  vectorClock: Map<string, number>;
}

export interface CommentThread {
  id: string;
  rootComment: Comment;
  replies: Comment[];
  unreadCount: number;
  lastActivityAt: number;
}

export function createComment(params: {
  id: string;
  nodeId: string | null;
  authorId: string;
  authorName: string;
  content: string;
  mentions?: Mention[];
  position?: { x: number; y: number };
}): Comment {
  return {
    id: params.id,
    nodeId: params.nodeId,
    parentId: null,
    authorId: params.authorId,
    authorName: params.authorName,
    content: params.content,
    mentions: params.mentions ?? [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    resolved: false,
    position: params.position,
  };
}

export function createReply(params: {
  id: string;
  parentId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentions?: Mention[];
}): Comment {
  return {
    id: params.id,
    nodeId: null,
    parentId: params.parentId,
    authorId: params.authorId,
    authorName: params.authorName,
    content: params.content,
    mentions: params.mentions ?? [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    resolved: false,
  };
}

export function parseMentions(text: string): { text: string; mentions: Mention[] } {
  const mentionRegex = /@(\w+)/g;
  const mentions: Mention[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const name = match[1];
    if (name.toLowerCase() === 'all') {
      mentions.push({ type: 'all', id: 'all', name: '所有人' });
    } else if (name.startsWith('role:')) {
      const roleName = name.slice(5);
      mentions.push({ type: 'role', id: roleName, name: roleName });
    } else {
      mentions.push({ type: 'user', id: match[1], name: match[1] });
    }
  }

  return { text, mentions };
}

export function getCommentThreads(comments: Comment[]): CommentThread[] {
  const rootComments = comments.filter((c) => c.parentId === null);
  const threads: CommentThread[] = [];

  for (const root of rootComments) {
    const replies = comments.filter((c) => c.parentId === root.id);
    threads.push({
      id: root.id,
      rootComment: root,
      replies,
      unreadCount: 0,
      lastActivityAt: Math.max(root.updatedAt, ...replies.map((r) => r.updatedAt)),
    });
  }

  return threads.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
}

export function resolveOperationConflict(
  localOp: CollaborationOperation,
  remoteOp: CollaborationOperation
): 'local' | 'remote' {
  const localClock = localOp.vectorClock;
  const remoteClock = remoteOp.vectorClock;

  for (const [userId, remoteTs] of Object.entries(remoteClock)) {
    const localTs = localClock[userId] ?? 0;
    if (remoteTs > localTs) {
      return 'remote';
    }
  }

  return 'local';
}