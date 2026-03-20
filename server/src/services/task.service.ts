import { prisma } from "@/lib/prisma";
import { ForbiddenError, NotFoundError } from "@/utils/errors";
import { Priority, TaskStatus } from "@prisma/client";

export interface CreateTaskInput{
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: Priority;
    deadline?: Date;
    parentId?: string;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: Priority;
    deadline?: Date | null;
}

export interface TaskQuery {
    status?: TaskStatus;
    priority?: Priority;
    search?: string;
    sortBy?: 'deadline' | 'priority' | 'createdAt';
    order?: 'asc' | 'desc';
}

export async function create(userId: string, input: CreateTaskInput){
    if(input.parentId){
        const parent = await prisma.task.findUnique({
            where: {id: input.parentId},
        });
        if(!parent || parent.userId !== userId){
            throw new NotFoundError('Parent task');
        }
    }

    return prisma.task.create({
        data: { ...input, userId},
        include: { subtasks: true}, 
    });
}

export async function getAll(userId: string, query: TaskQuery = {}) {
  const { status, priority, search, sortBy = 'createdAt', order = 'desc' } = query;

  return prisma.task.findMany({
    where: {
      userId,
      parentId: null,
      ...(status   && { status }),
      ...(priority && { priority }),
      ...(search   && {
        OR: [
          { title:       { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: { subtasks: true },
    orderBy: { [sortBy]: order },
  });
}

export async function getById(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { subtasks: true },
  });

  if (!task) throw new NotFoundError('Task');
  if (task.userId !== userId) throw new ForbiddenError();

  return task;
}

export async function update(userId: string, taskId: string, input: UpdateTaskInput) {
  await getById(userId, taskId);

  return prisma.task.update({
    where: { id: taskId },
    data:  input,
    include: { subtasks: true },
  });
}

export async function deleteTask(userId: string, taskId: string) {
  await getById(userId, taskId);

  await prisma.task.delete({ where: { id: taskId } });
}