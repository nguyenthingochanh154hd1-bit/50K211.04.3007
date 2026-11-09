import { useState } from 'react'
import { useTasksQuery } from '@/hooks/useTasks'
import TaskCard from '@/components/tasks/TaskCard'
import TaskForm from '@/components/tasks/TaskForm'
import type { Task } from '@/types'

export default function TasksPage() {
  const { data: tasks, isLoading, isError } = useTasksQuery()
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingTask(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + New Task
        </button>
      </div>

      {/* Task Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h2>
            <TaskForm
              task={editingTask ?? undefined}
              onSuccess={handleCloseForm}
              onCancel={handleCloseForm}
            />
          </div>
        </div>
      )}

      {/* Task List */}
      {isLoading && (
        <div className="text-center py-16 text-gray-400">Loading tasks...</div>
      )}

      {isError && (
        <div className="text-center py-16 text-red-500">
          Failed to load tasks. Please try again.
        </div>
      )}

      {tasks && tasks.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          No tasks yet. Create your first task!
        </div>
      )}

      {tasks && tasks.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={handleEdit} />
          ))}
        </div>
      )}
    </div>
  )
}
