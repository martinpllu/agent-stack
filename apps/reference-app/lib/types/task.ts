export type TaskStatus = "backlog" | "in-progress" | "done";

export type UserRole = "guest" | "user" | "admin";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdByName: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  assigneeId?: string;
} 