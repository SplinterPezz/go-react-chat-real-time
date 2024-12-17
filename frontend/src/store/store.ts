import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authSlice from './authSlice.ts';
import messageSlice from './messagesSlice.ts';
import onlineUsersSlice from './onlineUsersSlice.ts'
import chatListSlice from './chatSlice.ts'

import {} from 'node-forge';

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['auth', 'message', 'onlineUsers', 'chat']
};

const rootReducer = combineReducers({
  auth: authSlice,
  message: messageSlice,
  chat: chatListSlice,
  onlineUsers: onlineUsersSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
      }
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;