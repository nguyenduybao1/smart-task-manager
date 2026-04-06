export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Task {
  id:          string;
  title:       string;
  description: string | null;
  status:      TaskStatus;
  priority:    Priority;
  deadline:    string | null;
  createdAt:   string;
  updatedAt:   string;
  userId:      string;
  parentId:    string | null;
  version:     number;
  syncedAt:    string | null;
  subtasks:    Task[];
}

export interface User {
  id:    string;
  email: string;
  name:  string;
}

export interface Analytics {
  total:          number;
  done:           number;
  inProgress:     number;
  todo:           number;
  overdue:        number;
  completionRate: number;
  byPriority: {
    critical: number;
    high:     number;
    medium:   number;
    low:      number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data:    T;
  error?: {
    code:    string;
    message: string;
  };
}