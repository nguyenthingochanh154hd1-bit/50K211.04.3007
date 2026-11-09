// Task types
export enum TaskStatus {
  Todo = 0,
  InProgress = 1,
  Done = 2,
  Cancelled = 3,
}

export enum TaskPriority {
  Low = 0,
  Medium = 1,
  High = 2,
  Critical = 3,
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  assignedUserId?: string
  assignedUserName?: string
  createdAt: string
  updatedAt?: string
}

export interface CreateTaskPayload {
  title: string
  description?: string
  priority: TaskPriority
  dueDate?: string
  assignedUserId?: string
}

export interface UpdateTaskPayload {
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  assignedUserId?: string
}

// User / Auth types
export interface User {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  createdAt: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  firstName: string
  lastName: string
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: User
}

// API response wrapper
export interface ApiError {
  error: string
}
