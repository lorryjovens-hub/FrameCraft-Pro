import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { CollaborationSyncProvider } from './collaborationYjsProvider';
import {
  createCollaborationProvider,
  syncCommentToYjs,
  removeCommentFromYjs,
  updateCursorInYjs,
  getCommentsFromYjs,
  getCursorsFromYjs,
} from './collaborationYjsProvider';
import type {
  Comment,
  CollaborationUser,
  CollaborationSession,
  TaskStatus,
} from './collaborationTypes';
import {
  createComment,
  createReply,
  parseMentions,
  getCommentThreads,
  type CommentThread,
} from './collaborationTypes';

const COLLABORATION_STORAGE_KEY = 'project-collaboration';

interface CollaborationState {
  session: CollaborationSession | null;
  comments: Comment[];
  users: CollaborationUser[];
  currentUser: CollaborationUser | null;
  activeCommentId: string | null;
  unreadCount: number;
  isConnected: boolean;
  yjsProvider: CollaborationSyncProvider | null;
  pendingOperations: unknown[];
}

interface CollaborationActions {
  initSession: (projectId: string, userId: string, userName: string) => void;
  joinSession: (session: CollaborationSession) => void;
  leaveSession: () => void;
  connectYjs: (roomId: string) => void;
  disconnectYjs: () => void;
  addComment: (nodeId: string | null, content: string, position?: { x: number; y: number }) => string;
  addReply: (parentId: string, content: string) => string;
  updateComment: (commentId: string, content: string) => void;
  deleteComment: (commentId: string) => void;
  resolveComment: (commentId: string) => void;
  updateTaskStatus: (commentId: string, status: TaskStatus) => void;
  assignTask: (commentId: string, assigneeId: string, assigneeName: string) => void;
  setActiveComment: (commentId: string | null) => void;
  markAsRead: () => void;
  setUserOnline: (userId: string, isOnline: boolean) => void;
  updateUserCursor: (userId: string, cursor: { x: number; y: number }) => void;
  getCommentThreads: () => CommentThread[];
  getCommentsByNodeId: (nodeId: string) => Comment[];
}

const INITIAL_USER_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

function getNextColor(existingColors: string[]): string {
  for (const color of INITIAL_USER_COLORS) {
    if (!existingColors.includes(color)) {
      return color;
    }
  }
  return INITIAL_USER_COLORS[Math.floor(Math.random() * INITIAL_USER_COLORS.length)];
}

function syncUsersFromAwareness(state: Pick<CollaborationState, 'yjsProvider' | 'users'>, set: (partial: Partial<CollaborationState>) => void) {
  const { yjsProvider, users } = state;
  if (!yjsProvider?.awareness) return;

  const awarenessStates = yjsProvider.awareness.getStates();
  const onlineUsers: CollaborationUser[] = [];
  const currentClientId = yjsProvider.provider?.awareness.clientID;

  awarenessStates.forEach((awarenessState, clientId) => {
    if (awarenessState.user) {
      const existingUser = users.find((u) => u.id === awarenessState.user.id);
      onlineUsers.push({
        ...awarenessState.user,
        isOnline: clientId === currentClientId ? true : (existingUser?.isOnline ?? true),
      } as CollaborationUser);
    }
  });

  set({
    users: users.map((u) => {
      const onlineUser = onlineUsers.find((ou) => ou.id === u.id);
      if (onlineUser) {
        return { ...u, isOnline: onlineUser.isOnline, cursor: onlineUser.cursor };
      }
      return u;
    }),
    isConnected: true,
  });
}

export const useCollaborationStore = create<CollaborationState & CollaborationActions>()(
  persist(
    (set, get) => ({
      session: null,
      comments: [],
      users: [],
      currentUser: null,
      activeCommentId: null,
      unreadCount: 0,
      isConnected: false,
      yjsProvider: null,
      pendingOperations: [],

      initSession: (projectId, userId, userName) => {
        const existingUsers = get().users;
        const existingUser = existingUsers.find((u) => u.id === userId);

        if (existingUser) {
          set({
            currentUser: existingUser,
            session: {
              id: projectId,
              projectId,
              name: 'Collaboration',
              users: existingUsers,
              createdAt: Date.now(),
              isActive: true,
            },
          });
          get().connectYjs(projectId);
          return;
        }

        const newUser: CollaborationUser = {
          id: userId,
          name: userName,
          color: getNextColor(existingUsers.map((u) => u.color)),
          role: 'owner',
          isOnline: true,
          lastActiveAt: Date.now(),
        };

        const session: CollaborationSession = {
          id: projectId,
          projectId,
          name: 'Collaboration',
          users: [...existingUsers, newUser],
          createdAt: Date.now(),
          isActive: true,
        };

        set({
          currentUser: newUser,
          session,
          users: [...existingUsers, newUser],
        });
        get().connectYjs(projectId);
      },

      joinSession: (session) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        const updatedUsers = session.users.map((u) =>
          u.id === currentUser.id ? { ...u, isOnline: true, lastActiveAt: Date.now() } : u
        );

        set({
          session: { ...session, users: updatedUsers, isActive: true },
          users: updatedUsers,
          isConnected: true,
        });
        get().connectYjs(session.id);
      },

      leaveSession: () => {
        const { yjsProvider, currentUser } = get();
        if (currentUser && yjsProvider) {
          yjsProvider.awareness?.setLocalStateField('user', {
            ...currentUser,
            isOnline: false,
            cursor: null,
          });
        }
        get().disconnectYjs();

        set((state) => ({
          session: state.session ? { ...state.session, isActive: false } : null,
          users: state.users.map((u) =>
            u.id === currentUser?.id ? { ...u, isOnline: false } : u
          ),
          isConnected: false,
        }));
      },

      connectYjs: (roomId) => {
        const { currentUser, yjsProvider } = get();
        if (!currentUser || yjsProvider) return;

        const provider = createCollaborationProvider({
          roomId,
          user: currentUser,
        });

        provider.commentsMap.observe((event) => {
          if (event.transaction.local) return;
          const comments = getCommentsFromYjs(provider.commentsMap);
          set({ comments });
        });

        provider.cursorsMap.observe(() => {
          const cursors = getCursorsFromYjs(provider.cursorsMap);
          set((state) => ({
            users: state.users.map((u) => {
              const cursor = cursors.get(u.id);
              return cursor ? { ...u, cursor } : u;
            }),
          }));
        });

        provider.awareness?.on('change', () => {
          syncUsersFromAwareness({ yjsProvider: provider, users: get().users }, set);
        });

        const existingComments = getCommentsFromYjs(provider.commentsMap);
        if (existingComments.length > 0) {
          set({ comments: existingComments });
        }

        set({ yjsProvider: provider, isConnected: true });
      },

      disconnectYjs: () => {
        const { yjsProvider } = get();
        if (yjsProvider) {
          yjsProvider.destroy();
          set({ yjsProvider: null, isConnected: false });
        }
      },

      addComment: (nodeId, content, position) => {
        const currentUser = get().currentUser;
        if (!currentUser) return '';

        const { mentions } = parseMentions(content);
        const commentId = uuidv4();

        const comment = createComment({
          id: commentId,
          nodeId,
          authorId: currentUser.id,
          authorName: currentUser.name,
          content,
          mentions,
          position,
        });

        set((state) => ({
          comments: [...state.comments, comment],
          activeCommentId: commentId,
        }));

        const { yjsProvider } = get();
        if (yjsProvider) {
          syncCommentToYjs(yjsProvider.commentsMap, comment);
        }

        return commentId;
      },

      addReply: (parentId, content) => {
        const currentUser = get().currentUser;
        if (!currentUser) return '';

        const { mentions } = parseMentions(content);
        const replyId = uuidv4();

        const reply = createReply({
          id: replyId,
          parentId,
          authorId: currentUser.id,
          authorName: currentUser.name,
          content,
          mentions,
        });

        set((state) => ({
          comments: [...state.comments, reply],
        }));

        const { yjsProvider } = get();
        if (yjsProvider) {
          syncCommentToYjs(yjsProvider.commentsMap, reply);
        }

        return replyId;
      },

      updateComment: (commentId, content) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        const { mentions } = parseMentions(content);

        const updatedComment: Comment = {
          ...get().comments.find((c) => c.id === commentId)!,
          content,
          mentions,
          updatedAt: Date.now(),
        };

        set((state) => ({
          comments: state.comments.map((c) =>
            c.id === commentId ? updatedComment : c
          ),
        }));

        const { yjsProvider } = get();
        if (yjsProvider) {
          syncCommentToYjs(yjsProvider.commentsMap, updatedComment);
        }
      },

      deleteComment: (commentId) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        set((state) => ({
          comments: state.comments.filter(
            (c) => c.id !== commentId && c.parentId !== commentId
          ),
        }));

        const { yjsProvider } = get();
        if (yjsProvider) {
          removeCommentFromYjs(yjsProvider.commentsMap, commentId);
        }
      },

      resolveComment: (commentId) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        const resolvedComment: Comment = {
          ...get().comments.find((c) => c.id === commentId)!,
          resolved: true,
          updatedAt: Date.now(),
        };

        set((state) => ({
          comments: state.comments.map((c) =>
            c.id === commentId ? resolvedComment : c
          ),
        }));

        const { yjsProvider } = get();
        if (yjsProvider) {
          syncCommentToYjs(yjsProvider.commentsMap, resolvedComment);
        }
      },

      updateTaskStatus: (commentId, status) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        const updatedComment: Comment = {
          ...get().comments.find((c) => c.id === commentId)!,
          taskStatus: status,
          updatedAt: Date.now(),
        };

        set((state) => ({
          comments: state.comments.map((c) =>
            c.id === commentId ? updatedComment : c
          ),
        }));

        const { yjsProvider } = get();
        if (yjsProvider) {
          syncCommentToYjs(yjsProvider.commentsMap, updatedComment);
        }
      },

      assignTask: (commentId, assigneeId, assigneeName) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        const updatedComment: Comment = {
          ...get().comments.find((c) => c.id === commentId)!,
          taskAssigneeId: assigneeId,
          taskAssigneeName: assigneeName,
          updatedAt: Date.now(),
        };

        set((state) => ({
          comments: state.comments.map((c) =>
            c.id === commentId ? updatedComment : c
          ),
        }));

        const { yjsProvider } = get();
        if (yjsProvider) {
          syncCommentToYjs(yjsProvider.commentsMap, updatedComment);
        }
      },

      setActiveComment: (commentId) => {
        set({ activeCommentId: commentId });
        if (!commentId) {
          set({ unreadCount: 0 });
        }
      },

      markAsRead: () => {
        set({ unreadCount: 0 });
      },

      setUserOnline: (userId, isOnline) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, isOnline, lastActiveAt: Date.now() } : u
          ),
        }));
      },

      updateUserCursor: (userId, cursor) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, cursor } : u
          ),
        }));

        const { yjsProvider } = get();
        if (yjsProvider && currentUser.id === userId) {
          updateCursorInYjs(yjsProvider.cursorsMap, userId, cursor);
          yjsProvider.awareness?.setLocalStateField('user', {
            ...currentUser,
            cursor,
          });
        }
      },

      getCommentThreads: () => {
        return getCommentThreads(get().comments);
      },

      getCommentsByNodeId: (nodeId) => {
        return get().comments.filter((c) => c.nodeId === nodeId && c.parentId === null);
      },
    }),
    {
      name: COLLABORATION_STORAGE_KEY,
      partialize: (state) => ({
        session: state.session,
        comments: state.comments,
        users: state.users,
        currentUser: state.currentUser,
      }),
    }
  )
);
