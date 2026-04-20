import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import type { Comment, CollaborationUser } from './collaborationTypes';

export interface YjsProviderConfig {
  roomId: string;
  user: CollaborationUser;
  signaling?: string[];
}

export interface CollaborationSyncProvider {
  doc: Y.Doc;
  provider: WebrtcProvider | null;
  commentsMap: Y.Map<Comment>;
  cursorsMap: Y.Map<{ x: number; y: number }>;
  usersMap: Y.Map<CollaborationUser>;
  awareness: WebrtcProvider['awareness'] | null;
  destroy: () => void;
}

const DEFAULT_SIGNALING_SERVERS = [
  'wss://signaling.yjs.dev',
  'wss://y-webrtc-signaling-eu.herokuapp.com',
  'wss://y-webrtc-signaling-us.herokuapp.com',
];

export function createCollaborationProvider(
  config: YjsProviderConfig
): CollaborationSyncProvider {
  const { roomId, user, signaling = DEFAULT_SIGNALING_SERVERS } = config;

  const doc = new Y.Doc();
  const commentsMap = doc.getMap<Comment>('comments');
  const cursorsMap = doc.getMap<{ x: number; y: number }>('cursors');
  const usersMap = doc.getMap<CollaborationUser>('users');

  let provider: WebrtcProvider | null = null;

  try {
    provider = new WebrtcProvider(roomId, doc, {
      signaling,
      maxConns: 20,
      filterBcConns: true,
    });

    provider.awareness.setLocalStateField('user', {
      ...user,
      cursor: null,
    });
  } catch (error) {
    console.warn('[Collaboration] WebRTC provider initialization failed, running in offline mode:', error);
  }

  const awareness = provider?.awareness ?? null;

  if (awareness) {
    awareness.on('change', () => {
      const states = awareness.getStates();
      const onlineUsers: CollaborationUser[] = [];
      states.forEach((state) => {
        if (state.user) {
          onlineUsers.push({
            ...state.user,
            isOnline: true,
          } as CollaborationUser);
        }
      });
      usersMap.doc?.transact(() => {
        usersMap.forEach((_, key) => {
          if (!onlineUsers.find((u) => u.id === key)) {
            usersMap.delete(key);
          }
        });
        onlineUsers.forEach((u) => {
          usersMap.set(u.id, u);
        });
      });
    });
  }

  return {
    doc,
    provider,
    commentsMap,
    cursorsMap,
    usersMap,
    awareness,
    destroy: () => {
      provider?.destroy();
      doc.destroy();
    },
  };
}

export function syncCommentToYjs(
  commentsMap: Y.Map<Comment>,
  comment: Comment
): void {
  commentsMap.set(comment.id, comment);
}

export function removeCommentFromYjs(
  commentsMap: Y.Map<Comment>,
  commentId: string
): void {
  commentsMap.delete(commentId);
}

export function updateCursorInYjs(
  cursorsMap: Y.Map<{ x: number; y: number }>,
  userId: string,
  cursor: { x: number; y: number }
): void {
  cursorsMap.set(userId, cursor);
}

export function removeCursorFromYjs(
  cursorsMap: Y.Map<{ x: number; y: number }>,
  userId: string
): void {
  cursorsMap.delete(userId);
}

export function getCommentsFromYjs(commentsMap: Y.Map<Comment>): Comment[] {
  const comments: Comment[] = [];
  commentsMap.forEach((comment) => {
    comments.push(comment);
  });
  return comments.sort((a, b) => a.createdAt - b.createdAt);
}

export function getCursorsFromYjs(cursorsMap: Y.Map<{ x: number; y: number }>): Map<string, { x: number; y: number }> {
  const cursors = new Map<string, { x: number; y: number }>();
  cursorsMap.forEach((cursor, userId) => {
    cursors.set(userId, cursor);
  });
  return cursors;
}

export function getUsersFromYjs(usersMap: Y.Map<CollaborationUser>): CollaborationUser[] {
  const users: CollaborationUser[] = [];
  usersMap.forEach((user) => {
    users.push(user);
  });
  return users;
}
