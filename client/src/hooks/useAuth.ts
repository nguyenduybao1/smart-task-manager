import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { RootState, AppDispatch } from '@/store';
import { setCredentials, clearCredentials } from '@/store/slices/authSlice';
import api from '@/lib/api';

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const router   = useRouter();
  const { user, accessToken, isLoading } = useSelector(
    (state: RootState) => state.auth
  );

  // ─────────────────────────────────────────────
  // Register
  // ─────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name: string }) => {
      const res = await api.post('/api/auth/register', data);
      return res.data;
    },
    onSuccess: (data) => {
      dispatch(setCredentials({
        user:        data.data.user,
        accessToken: data.data.accessToken,
      }));
      router.push('/dashboard');
    },
  });

  // ─────────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.post('/api/auth/login', data);
      return res.data;
    },
    onSuccess: (data) => {
      dispatch(setCredentials({
        user:        data.data.user,
        accessToken: data.data.accessToken,
      }));
      router.push('/dashboard');
    },
  });

  // ─────────────────────────────────────────────
  // Logout
  // ─────────────────────────────────────────────
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/auth/logout');
    },
    onSuccess: () => {
      dispatch(clearCredentials());
      router.push('/login');
    },
  });

  return {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!accessToken,
    register:        registerMutation.mutate,
    login:           loginMutation.mutate,
    logout:          logoutMutation.mutate,
    registerError:   registerMutation.error,
    loginError:      loginMutation.error,
    isRegistering:   registerMutation.isPending,
    isLoggingIn:     loginMutation.isPending,
    isLoggingOut:    logoutMutation.isPending,
  };
}