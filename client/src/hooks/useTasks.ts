import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Task, Analytics } from '@/types';

const TASKS_KEY     = ['tasks'];
const ANALYTICS_KEY = ['analytics'];

// ─────────────────────────────────────────────
// Fetch all tasks
// ─────────────────────────────────────────────
export function useTasks(filters?: {
  status?:   string;
  priority?: string;
  search?:   string;
  sortBy?:   string;
  order?:    string;
}) {
  return useQuery({
    queryKey: [...TASKS_KEY, filters],
    queryFn:  async () => {
      const params = new URLSearchParams();
      if (filters?.status)   params.append('status',   filters.status);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.search)   params.append('search',   filters.search);
      if (filters?.sortBy)   params.append('sortBy',   filters.sortBy);
      if (filters?.order)    params.append('order',    filters.order);

      const res = await api.get<{ success: boolean; data: Task[] }>(
        `/api/tasks?${params.toString()}`
      );
      return res.data.data;
    },
  });
}

// ─────────────────────────────────────────────
// Fetch single task
// ─────────────────────────────────────────────
export function useTask(id: string) {
  return useQuery({
    queryKey: [...TASKS_KEY, id],
    queryFn:  async () => {
      const res = await api.get<{ success: boolean; data: Task }>(
        `/api/tasks/${id}`
      );
      return res.data.data;
    },
    enabled: !!id,
  });
}

// ─────────────────────────────────────────────
// Create task
// ─────────────────────────────────────────────
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title:        string;
      description?: string;
      status?:      string;
      priority?:    string;
      deadline?:    string;
      parentId?:    string;
    }) => {
      const res = await api.post<{ success: boolean; data: Task }>('/api/tasks', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_KEY });
    },
  });
}

// ─────────────────────────────────────────────
// Update task
// ─────────────────────────────────────────────
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: {
      id:   string;
      data: Partial<{
        title:       string;
        description: string;
        status:      string;
        priority:    string;
        deadline:    string | null;
      }>;
    }) => {
      const res = await api.patch<{ success: boolean; data: Task }>(
        `/api/tasks/${id}`, data
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_KEY });
    },
  });
}

// ─────────────────────────────────────────────
// Delete task
// ─────────────────────────────────────────────
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_KEY });
    },
  });
}

// ─────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────
export function useAnalytics() {
  return useQuery({
    queryKey: ANALYTICS_KEY,
    queryFn:  async () => {
      const res = await api.get<{ success: boolean; data: Analytics }>(
        '/api/tasks/analytics'
      );
      return res.data.data;
    },
  });
}