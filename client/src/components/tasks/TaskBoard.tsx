'use client';

import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import { Task } from '@/types';

const COLUMNS = [
  { key: 'TODO',        label: 'To Do',       color: 'bg-gray-100' },
  { key: 'IN_PROGRESS', label: 'In Progress',  color: 'bg-blue-100' },
  { key: 'DONE',        label: 'Done',         color: 'bg-green-100' },
];

export default function TaskBoard() {
  const [showModal, setShowModal] = useState(false);
  const [search,    setSearch]    = useState('');
  const [priority,  setPriority]  = useState('');

  const { data: tasks = [], isLoading } = useTasks({
    search:   search   || undefined,
    priority: priority || undefined,
  });

  const getTasksByStatus = (status: string) =>
    tasks.filter((t: Task) => t.status === status);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Task
        </button>
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = getTasksByStatus(col.key);
          return (
            <div key={col.key} className="flex flex-col gap-3">
              {/* Column Header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${col.color}`}>
                <span className="text-sm font-semibold text-gray-700">
                  {col.label}
                </span>
                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex flex-col gap-3 min-h-32">
                {colTasks.length === 0 ? (
                  <div className="text-center text-gray-300 text-xs py-8">
                    No tasks
                  </div>
                ) : (
                  colTasks.map((task: Task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <CreateTaskModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}