import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useLoginMutation } from '@/hooks/useAuth'
import type { LoginPayload } from '@/types'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const { mutate: login, isPending, error } = useLoginMutation()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginPayload>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: LoginPayload) => {
    login(data, { onSuccess: () => navigate('/tasks') })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">Task Manager</h1>
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Sign In</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input {...register('password')} type="password" className="input" placeholder="••••••••" />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">
                Invalid email or password.
              </p>
            )}

            <button type="submit" disabled={isPending} className="btn-primary w-full mt-2">
              {isPending ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="mt-4 text-sm text-center text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
