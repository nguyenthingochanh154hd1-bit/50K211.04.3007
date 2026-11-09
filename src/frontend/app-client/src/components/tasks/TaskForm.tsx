import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TaskStatus, TaskPriority, type Task } from '@/types'
import { useCreateTaskMutation, useUpdateTaskMutation } from '@/hooks/useTasks'

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  priority: z.nativeEnum(TaskPriority),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface TaskFormProps {
  task?: Task
  onSuccess: () => void
  onCancel: () => void
}

export default function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
  const isEditing = !!task
  const { mutate: createTask, isPending: isCreating } = useCreateTaskMutation()
  const { mutate: updateTask, isPending: isUpdating } = useUpdateTaskMutation()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: task
      ? {
          title: task.title,
          description: task.description ?? '',
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate ? task.dueDate.substring(0, 10) : '',
        }
      : {
          priority: TaskPriority.Medium,
        },
  })

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateTask(
        {
          id: task.id,
          payload: {
            title: data.title,
            description: data.description,
            status: data.status ?? task.status,
            priority: data.priority,
            dueDate: data.dueDate || undefined,
          },
        },
        { onSuccess }
      )
    } else {
      createTask(
        {
          title: data.title,
          description: data.description,
          priority: data.priority,
          dueDate: data.dueDate || undefined,
        },
        { onSuccess }
      )
    }
  }

  const isPending = isCreating || isUpdating

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input {...register('title')} className="input" placeholder="Task title" />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea {...register('description')} rows={3} className="input resize-none" placeholder="Optional description" />
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select {...register('priority', { valueAsNumber: true })} className="input">
            <option value={TaskPriority.Low}>Low</option>
            <option value={TaskPriority.Medium}>Medium</option>
            <option value={TaskPriority.High}>High</option>
            <option value={TaskPriority.Critical}>Critical</option>
          </select>
        </div>

        {isEditing && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select {...register('status', { valueAsNumber: true })} className="input">
              <option value={TaskStatus.Todo}>To Do</option>
              <option value={TaskStatus.InProgress}>In Progress</option>
              <option value={TaskStatus.Done}>Done</option>
              <option value={TaskStatus.Cancelled}>Cancelled</option>
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
        <input {...register('dueDate')} type="date" className="input" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  )
}
