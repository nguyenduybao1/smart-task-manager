'use client';

import { Task } from '@/types';
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks';

const PRIORITY_STYLES = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH:     'bg-orange-100 text-orange-700',
  MEDIUM:   'bg-yellow-100 text-yellow-700',
  LOW:      'bg-green-100 text-green-700',
};

const STATUS_STYLES = {
  TODO:        'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE:        'bg-green-100 text-green-700',
};

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  function handleStatusChange(status: string) {
    updateTask.mutate({ id: task.id, data: { status } });
  }

  function handleDelete() {
    if (confirm('Delete this task?')) {
      deleteTask.mutate(task.id);
    }
  }

  const isOverdue = task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== 'DONE';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className={`font-medium text-gray-900 text-sm leading-snug ${
          task.status === 'DONE' ? 'line-through text-gray-400' : ''
        }`}>
          {task.title}
        </h3>
        <button
          onClick={handleDelete}
          className="text-gray-300 hover:text-red-500 transition-colors text-xs shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Badges */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[task.priority]}`}>
          {task.priority}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[task.status]}`}>
          {task.status.replace('_', ' ')}
        </span>
        {isOverdue && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
            OVERDUE
          </span>
        )}
      </div>

      {/* Deadline */}
      {task.deadline && (
        <p className={`text-xs mb-3 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
          📅 {new Date(task.deadline).toLocaleDateString()}
        </p>
      )}

      {/* Status Actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        {task.status !== 'IN_PROGRESS' && task.status !== 'DONE' && (
          <button
            onClick={() => handleStatusChange('IN_PROGRESS')}
            className="text-xs text-blue-600 hover:underline"
          >
            Start
          </button>
        )}
        {task.status !== 'DONE' && (
          <button
            onClick={() => handleStatusChange('DONE')}
            className="text-xs text-green-600 hover:underline"
          >
            Complete
          </button>
        )}
        {task.status === 'DONE' && (
          <button
            onClick={() => handleStatusChange('TODO')}
            className="text-xs text-gray-500 hover:underline"
          >
            Reopen
          </button>
        )}
      </div>

      {/* Subtasks count */}
      {task.subtasks.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          📎 {task.subtasks.length} subtask{task.subtasks.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}