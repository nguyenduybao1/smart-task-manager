import { prisma } from '@/lib/prisma';
import { NotFoundError, ForbiddenError } from '@/utils/errors';
import { TaskStatus, Priority } from '@prisma/client';

export interface SyncTaskInput {
  id:          string;
  title:       string;
  description?: string;
  status:      TaskStatus;
  priority:    Priority;
  deadline?:   Date | null;
  baseVersion: number;      // version lúc client bắt đầu edit
  updatedAt:   Date;        // timestamp của client
}

export type ConflictStrategy = 'CLIENT_WINS' | 'SERVER_WINS' | 'MERGE';

export interface SyncResult {
  taskId:       string;
  status:       'SYNCED' | 'CONFLICT' | 'RESOLVED';
  strategy?:    ConflictStrategy;
  finalTask?:   object;
  conflictInfo?: {
    clientVersion: number;
    serverVersion: number;
    clientUpdatedAt: Date;
    serverUpdatedAt: Date;
  };
}

export const syncService = {

  // ─────────────────────────────────────────────
  // Sync single task
  // ─────────────────────────────────────────────
  async syncTask(userId: string, input: SyncTaskInput): Promise<SyncResult> {
    const serverTask = await prisma.task.findUnique({
      where: { id: input.id },
    });

    if (!serverTask) throw new NotFoundError('Task');
    if (serverTask.userId !== userId) throw new ForbiddenError();

    // No conflict — baseVersion matches server version
    if (serverTask.version === input.baseVersion) {
      const updated = await prisma.task.update({
        where: { id: input.id },
        data: {
          title:       input.title,
          description: input.description,
          status:      input.status,
          priority:    input.priority,
          deadline:    input.deadline,
          version:     { increment: 1 },
          syncedAt:    new Date(),
        },
      });

      return { taskId: input.id, status: 'SYNCED', finalTask: updated };
    }

    // Conflict detected — server has newer version
    const conflictInfo = {
      clientVersion:   input.baseVersion,
      serverVersion:   serverTask.version,
      clientUpdatedAt: input.updatedAt,
      serverUpdatedAt: serverTask.updatedAt,
    };

    // Resolve conflict
    const resolved = await syncService._resolveConflict(
      userId, input, serverTask, conflictInfo
    );

    return resolved;
  },

  // ─────────────────────────────────────────────
  // Batch sync multiple tasks
  // ─────────────────────────────────────────────
  async syncBatch(userId: string, tasks: SyncTaskInput[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const task of tasks) {
      try {
        const result = await syncService.syncTask(userId, task);
        results.push(result);
      } catch (err) {
        results.push({
          taskId: task.id,
          status: 'CONFLICT',
          conflictInfo: undefined,
        });
      }
    }

    return results;
  },

  // ─────────────────────────────────────────────
  // Conflict resolution
  // ─────────────────────────────────────────────
  async _resolveConflict(
    userId: string,
    clientTask: SyncTaskInput,
    serverTask: any,
    conflictInfo: any,
  ): Promise<SyncResult> {

    // Rule 1: DONE status is never overwritten
    if (serverTask.status === 'DONE') {
      return {
        taskId:       clientTask.id,
        status:       'RESOLVED',
        strategy:     'SERVER_WINS',
        finalTask:    serverTask,
        conflictInfo,
      };
    }

    // Rule 2: Last-Write-Wins by timestamp
    const clientWins = clientTask.updatedAt > serverTask.updatedAt;

    if (clientWins) {
      const updated = await prisma.task.update({
        where: { id: clientTask.id },
        data: {
          title:       clientTask.title,
          description: clientTask.description,
          status:      clientTask.status,
          priority:    clientTask.priority,
          deadline:    clientTask.deadline,
          version:     { increment: 1 },
          syncedAt:    new Date(),
        },
      });

      return {
        taskId:       clientTask.id,
        status:       'RESOLVED',
        strategy:     'CLIENT_WINS',
        finalTask:    updated,
        conflictInfo,
      };
    }

    // Rule 3: Server wins if server is newer or equal
    return {
      taskId:    clientTask.id,
      status:    'RESOLVED',
      strategy:  'SERVER_WINS',
      finalTask: serverTask,
      conflictInfo,
    };
  },

  // ─────────────────────────────────────────────
  // Get tasks modified after a timestamp (for pull sync)
  // ─────────────────────────────────────────────
  async getModifiedSince(userId: string, since: Date) {
    return prisma.task.findMany({
      where: {
        userId,
        updatedAt: { gt: since },
      },
      orderBy: { updatedAt: 'asc' },
    });
  },
};