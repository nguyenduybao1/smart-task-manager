import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/types';

interface AuthState {
  user:        User | null;
  accessToken: string | null;
  isLoading:   boolean;
}

const initialState: AuthState = {
  user:        null,
  accessToken: typeof window !== 'undefined'
    ? localStorage.getItem('accessToken')
    : null,
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; accessToken: string }>) => {
      state.user        = action.payload.user;
      state.accessToken = action.payload.accessToken;
      localStorage.setItem('accessToken', action.payload.accessToken);
    },
    clearCredentials: (state) => {
      state.user        = null;
      state.accessToken = null;
      localStorage.removeItem('accessToken');
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setCredentials, clearCredentials, setLoading } = authSlice.actions;
export default authSlice.reducer;