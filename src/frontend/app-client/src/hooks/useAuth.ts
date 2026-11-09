import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import type { LoginPayload, RegisterPayload } from '@/types'

export const useLoginMutation = () => {
  const setAuth = useAuthStore((s) => s.setAuth)
  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
    },
  })
}

export const useRegisterMutation = () => {
  const setAuth = useAuthStore((s) => s.setAuth)
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
    },
  })
}

export const useLogoutMutation = () => {
  const logout = useAuthStore((s) => s.logout)
  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      logout()
    },
  })
}
