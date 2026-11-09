import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { taskService } from '@/services/taskService'
import type { CreateTaskPayload, UpdateTaskPayload } from '@/types'

export const TASK_KEYS = {
  all: ['tasks'] as const,
  lists: () => [...TASK_KEYS.all, 'list'] as const,
  detail: (id: string) => [...TASK_KEYS.all, 'detail', id] as const,
  byUser: (userId: string) => [...TASK_KEYS.all, 'user', userId] as const,
  overdue: () => [...TASK_KEYS.all, 'overdue'] as const,
}

export const useTasksQuery = () =>
  useQuery({ queryKey: TASK_KEYS.lists(), queryFn: taskService.getAll })

export const useTaskQuery = (id: string) =>
  useQuery({ queryKey: TASK_KEYS.detail(id), queryFn: () => taskService.getById(id), enabled: !!id })

export const useTasksByUserQuery = (userId: string) =>
  useQuery({ queryKey: TASK_KEYS.byUser(userId), queryFn: () => taskService.getByUser(userId), enabled: !!userId })

export const useOverdueTasksQuery = () =>
  useQuery({ queryKey: TASK_KEYS.overdue(), queryFn: taskService.getOverdue })

export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => taskService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.lists() })
    },
  })
}

export const useUpdateTaskMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskPayload }) =>
      taskService.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(id) })
    },
  })
}

export const useDeleteTaskMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => taskService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.lists() })
    },
  })
}
