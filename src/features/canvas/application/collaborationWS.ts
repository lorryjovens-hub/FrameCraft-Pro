import type { CollaborationOperation } from './collaborationTypes';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage {
  type: 'operation' | 'cursor' | 'presence' | 'sync' | 'ack' | 'ping' | 'pong';
  payload: unknown;
  timestamp: number;
  userId: string;
}

export type OperationHandler = (operation: CollaborationOperation) => void;
export type StatusChangeHandler = (status: WebSocketStatus) => void;
export type UserHandler = (userId: string, isOnline: boolean) => void;

class CollaborationWebSocket {
  private ws: WebSocket | null = null;
  private url: string = '';
  private userId: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private operationHandlers: Set<OperationHandler> = new Set();
  private statusHandlers: Set<StatusChangeHandler> = new Set();
  private userHandlers: Set<UserHandler> = new Set();
  private pendingOperations: Map<string, CollaborationOperation> = new Map();
  private vectorClock: Map<string, number> = new Map();
  private status: WebSocketStatus = 'disconnected';

  connect(url: string, userId: string): void {
    this.url = url;
    this.userId = userId;
    this.doConnect();
  }

  private doConnect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.setStatus('connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.sendPresence();
    };

    this.ws.onclose = () => {
      this.setStatus('disconnected');
      this.stopHeartbeat();
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.setStatus('error');
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'operation': {
        const operation = message.payload as CollaborationOperation;
        if (operation.userId !== this.userId) {
          if (this.isNewerOperation(operation)) {
            this.operationHandlers.forEach((handler) => handler(operation));
            this.updateVectorClock(operation);
          }
        }
        break;
      }
      case 'ack': {
        const opId = message.payload as string;
        this.pendingOperations.delete(opId);
        break;
      }
      case 'presence': {
        const { userId, isOnline } = message.payload as { userId: string; isOnline: boolean };
        this.userHandlers.forEach((handler) => handler(userId, isOnline));
        break;
      }
      case 'sync': {
        const operations = message.payload as CollaborationOperation[];
        operations.forEach((op) => {
          this.operationHandlers.forEach((handler) => handler(op));
          this.updateVectorClock(op);
        });
        break;
      }
    }
  }

  private isNewerOperation(operation: CollaborationOperation): boolean {
    const remoteClock = operation.vectorClock;
    for (const [userId, timestamp] of Object.entries(remoteClock)) {
      const localTimestamp = this.vectorClock.get(userId) ?? 0;
      if (timestamp > localTimestamp) {
        return true;
      }
    }
    return false;
  }

  private updateVectorClock(operation: CollaborationOperation): void {
    for (const [userId, timestamp] of Object.entries(operation.vectorClock)) {
      const current = this.vectorClock.get(userId) ?? 0;
      if (timestamp > current) {
        this.vectorClock.set(userId, timestamp);
      }
    }
  }

  private setStatus(status: WebSocketStatus): void {
    this.status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      this.doConnect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendPing();
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendPresence(): void {
    this.send({
      type: 'presence',
      payload: { userId: this.userId, isOnline: true },
      timestamp: Date.now(),
      userId: this.userId,
    });
  }

  private sendPing(): void {
    this.send({
      type: 'ping',
      payload: null,
      timestamp: Date.now(),
      userId: this.userId,
    });
  }

  send(message: Omit<WebSocketMessage, 'type'> & { type: WebSocketMessage['type'] }): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  sendOperation(operation: CollaborationOperation): void {
    const opId = `${operation.userId}-${operation.timestamp}`;
    this.pendingOperations.set(opId, operation);
    this.updateVectorClock(operation);

    this.send({
      type: 'operation',
      payload: operation,
      timestamp: operation.timestamp,
      userId: operation.userId,
    });
  }

  sendCursor(x: number, y: number): void {
    this.send({
      type: 'cursor',
      payload: { x, y },
      timestamp: Date.now(),
      userId: this.userId,
    });
  }

  onOperation(handler: OperationHandler): () => void {
    this.operationHandlers.add(handler);
    return () => {
      this.operationHandlers.delete(handler);
    };
  }

  onStatusChange(handler: StatusChangeHandler): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  onUserPresence(handler: UserHandler): () => void {
    this.userHandlers.add(handler);
    return () => {
      this.userHandlers.delete(handler);
    };
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }
}

export const collaborationWS = new CollaborationWebSocket();

export function mergeOperations(
  localOps: CollaborationOperation[],
  remoteOps: CollaborationOperation[]
): CollaborationOperation[] {
  const merged = new Map<string, CollaborationOperation>();

  const allOps = [...localOps, ...remoteOps].sort((a, b) => {
    const aMax = Math.max(...Object.values(a.vectorClock));
    const bMax = Math.max(...Object.values(b.vectorClock));
    return aMax - bMax;
  });

  for (const op of allOps) {
    const key = `${op.userId}-${op.timestamp}`;
    if (!merged.has(key)) {
      merged.set(key, op);
    }
  }

  return Array.from(merged.values());
}

export function resolveConflict(
  localOp: CollaborationOperation,
  remoteOp: CollaborationOperation
): CollaborationOperation {
  const localMax = Math.max(...Object.values(localOp.vectorClock));
  const remoteMax = Math.max(...Object.values(remoteOp.vectorClock));

  if (remoteMax > localMax) {
    return remoteOp;
  }

  return localOp;
}