import { Request, Response, NextFunction } from 'express';
import { syncService, SyncTaskInput } from '@/services/sync.service';
import { ValidationError } from '@/utils/errors';

export async function syncTask(req: Request, res: Response, next: NextFunction) {
  try {
    const input: SyncTaskInput = {
      id:          req.params.id,
      title:       req.body.title,
      description: req.body.description,
      status:      req.body.status,
      priority:    req.body.priority,
      deadline:    req.body.deadline ? new Date(req.body.deadline) : null,
      baseVersion: req.body.baseVersion,
      updatedAt:   new Date(req.body.updatedAt),
    };

    if (!input.baseVersion) {
      throw new ValidationError('baseVersion is required');
    }

    const result = await syncService.syncTask(req.userId, input);
    return res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function syncBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const tasks: SyncTaskInput[] = req.body.tasks;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new ValidationError('tasks must be a non-empty array');
    }

    if (tasks.length > 100) {
      throw new ValidationError('Cannot sync more than 100 tasks at once');
    }

    const results = await syncService.syncBatch(req.userId, tasks);
    return res.status(200).json({ success: true, data: results });
  } catch (err) { next(err); }
}

export async function getModifiedSince(req: Request, res: Response, next: NextFunction) {
  try {
    const since = req.query.since as string;

    if (!since) {
      throw new ValidationError('since query param is required');
    }

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      throw new ValidationError('since must be a valid ISO date');
    }

    const tasks = await syncService.getModifiedSince(req.userId, sinceDate);
    return res.status(200).json({ success: true, data: tasks });
  } catch (err) { next(err); }
}