import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../Models/models';

export interface OnlineUsersState {
  users: User[];
  lastUpdated: number | null;
}

const initialState: OnlineUsersState = {
  users: [],
  lastUpdated: null
};

const onlineUsersSlice = createSlice({
  name: 'onlineUsers',
  initialState,
  reducers: {
    // Set multiple online users (e.g., when receiving initial list)
    setOnlineUsers: (
      state, 
      action: PayloadAction<{ users: User[], currentUserId: string }>
    ) => {
      state.users = action.payload.users.filter(
        user => user.id !== action.payload.currentUserId
      );
      state.lastUpdated = Date.now();
    },

    // Clear all online users (useful for logout)
    clearOnlineUsers: (state) => {
      state.users = [];
      state.lastUpdated = null;
    }
  }
});

// Export actions
export const {
  setOnlineUsers,
  clearOnlineUsers
} = onlineUsersSlice.actions;

// Selectors
export const selectAllOnlineUsers = (state: { onlineUsers: OnlineUsersState }) => 
  state.onlineUsers.users;

export const selectOnlineUsersCount = (state: { onlineUsers: OnlineUsersState }) => 
  state.onlineUsers.users.length;

export default onlineUsersSlice.reducer;