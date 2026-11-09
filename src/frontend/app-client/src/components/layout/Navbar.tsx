import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLogoutMutation } from '@/hooks/useAuth'

export default function Navbar() {
  const user = useAuthStore((s) => s.user)
  const { mutate: logout } = useLogoutMutation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout(undefined, { onSettled: () => navigate('/login') })
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
      <Link to="/tasks" className="text-xl font-bold text-blue-600">
        Task Manager
      </Link>
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-gray-600">
            Welcome, <span className="font-medium">{user.fullName}</span>
          </span>
        )}
        <button onClick={handleLogout} className="btn-secondary text-sm px-3 py-1.5">
          Logout
        </button>
      </div>
    </nav>
  )
}
