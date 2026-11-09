import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useRegisterMutation } from '@/hooks/useAuth'
import type { RegisterPayload } from '@/types'

const schema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email'),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a digit'),
})

export default function RegisterPage() {
  const navigate = useNavigate()
  const { mutate: register, isPending, error } = useRegisterMutation()

  const { register: formRegister, handleSubmit, formState: { errors } } = useForm<RegisterPayload>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: RegisterPayload) => {
    register(data, { onSuccess: () => navigate('/tasks') })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">Task Manager</h1>
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Create Account</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input {...formRegister('firstName')} className="input" placeholder="John" />
                {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input {...formRegister('lastName')} className="input" placeholder="Doe" />
                {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input {...formRegister('email')} type="email" className="input" placeholder="you@example.com" />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input {...formRegister('password')} type="password" className="input" placeholder="••••••••" />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">Registration failed. Please try again.</p>
            )}

            <button type="submit" disabled={isPending} className="btn-primary w-full mt-2">
              {isPending ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="mt-4 text-sm text-center text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
