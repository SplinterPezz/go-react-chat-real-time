import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: string | null;
  token: string | null;
  expiration: number | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  expiration: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<{ user: string; token: string; expiration: number }>) {
      console.log('loginSuccess action dispatched');
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.expiration = action.payload.expiration;
      state.isAuthenticated = true;
    },
    logout(state) {
      console.log('logout action dispatched');
      state.user = null;
      state.token = null;
      state.expiration = null;
      state.isAuthenticated = false;
    },
    checkAuthentication(state) {
      // Check if the token is still valid
      if (state.expiration && Date.now() > (state.expiration * 1000)) {
        state.user = null;
        state.token = null;
        state.expiration = null;
        state.isAuthenticated = false;
      }
    }
  },
});

export const { loginSuccess, logout, checkAuthentication } = authSlice.actions;
export default authSlice.reducer;