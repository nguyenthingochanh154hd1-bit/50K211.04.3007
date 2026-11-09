import apiClient from './apiClient'
import type { Task, CreateTaskPayload, UpdateTaskPayload } from '@/types'

export const taskService = {
  getAll: async (): Promise<Task[]> => {
    const { data } = await apiClient.get<Task[]>('/tasks')
    return data
  },

  getById: async (id: string): Promise<Task> => {
    const { data } = await apiClient.get<Task>(`/tasks/${id}`)
    return data
  },

  getByUser: async (userId: string): Promise<Task[]> => {
    const { data } = await apiClient.get<Task[]>(`/tasks/user/${userId}`)
    return data
  },

  getOverdue: async (): Promise<Task[]> => {
    const { data } = await apiClient.get<Task[]>('/tasks/overdue')
    return data
  },

  create: async (payload: CreateTaskPayload): Promise<Task> => {
    const { data } = await apiClient.post<Task>('/tasks', payload)
    return data
  },

  update: async (id: string, payload: UpdateTaskPayload): Promise<Task> => {
    const { data } = await apiClient.put<Task>(`/tasks/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`)
  },
}
