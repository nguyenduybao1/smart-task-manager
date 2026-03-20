import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as taskService from '@/services/task.service';
import { ValidationError } from '@/utils/errors';
import { TaskStatus, Priority } from '@prisma/client';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg as string);
    }

    const task = await taskService.create(req.userId, req.body);
    return res.status(201).json({ success: true, data: task });
  } catch (err) { next(err); }
}

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, priority, search, sortBy, order } = req.query;

    const tasks = await taskService.getAll(req.userId, {
      status:   status   as TaskStatus | undefined,
      priority: priority as Priority   | undefined,
      search:   search   as string     | undefined,
      sortBy:   sortBy   as 'deadline' | 'priority' | 'createdAt' | undefined,
      order:    order    as 'asc' | 'desc' | undefined,
    });

    return res.status(200).json({ success: true, data: tasks });
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await taskService.getById(req.userId, req.params.id);
    return res.status(200).json({ success: true, data: task });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg as string);
    }

    const task = await taskService.update(req.userId, req.params.id, req.body);
    return res.status(200).json({ success: true, data: task });
  } catch (err) { next(err); }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    await taskService.deleteTask(req.userId, req.params.id);
    return res.status(204).send();
  } catch (err) { next(err); }
}