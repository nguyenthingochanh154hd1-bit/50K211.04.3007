import { TaskStatus, TaskPriority, type Task } from '@/types'
import { useDeleteTaskMutation } from '@/hooks/useTasks'
import clsx from 'clsx'

const statusLabels: Record<TaskStatus, string> = {
  [TaskStatus.Todo]: 'To Do',
  [TaskStatus.InProgress]: 'In Progress',
  [TaskStatus.Done]: 'Done',
  [TaskStatus.Cancelled]: 'Cancelled',
}

const priorityLabels: Record<TaskPriority, string> = {
  [TaskPriority.Low]: 'Low',
  [TaskPriority.Medium]: 'Medium',
  [TaskPriority.High]: 'High',
  [TaskPriority.Critical]: 'Critical',
}

const statusColors: Record<TaskStatus, string> = {
  [TaskStatus.Todo]: 'bg-gray-100 text-gray-700',
  [TaskStatus.InProgress]: 'bg-blue-100 text-blue-700',
  [TaskStatus.Done]: 'bg-green-100 text-green-700',
  [TaskStatus.Cancelled]: 'bg-red-100 text-red-700',
}

const priorityColors: Record<TaskPriority, string> = {
  [TaskPriority.Low]: 'bg-slate-100 text-slate-700',
  [TaskPriority.Medium]: 'bg-yellow-100 text-yellow-700',
  [TaskPriority.High]: 'bg-orange-100 text-orange-700',
  [TaskPriority.Critical]: 'bg-red-100 text-red-700',
}

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
}

export default function TaskCard({ task, onEdit }: TaskCardProps) {
  const { mutate: deleteTask, isPending } = useDeleteTaskMutation()

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== TaskStatus.Done &&
    task.status !== TaskStatus.Cancelled

  return (
    <div className={clsx('card hover:shadow-md transition-shadow', isOverdue && 'border-red-300')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>
          {task.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{task.description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="btn-secondary text-xs px-2 py-1"
          >
            Edit
          </button>
          <button
            onClick={() => deleteTask(task.id)}
            disabled={isPending}
            className="btn-danger text-xs px-2 py-1"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className={clsx('badge', statusColors[task.status])}>
          {statusLabels[task.status]}
        </span>
        <span className={clsx('badge', priorityColors[task.priority])}>
          {priorityLabels[task.priority]}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        {task.dueDate && (
          <span className={clsx(isOverdue && 'text-red-600 font-medium')}>
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        {task.assignedUserName && <span>Assigned: {task.assignedUserName}</span>}
      </div>
    </div>
  )
}
