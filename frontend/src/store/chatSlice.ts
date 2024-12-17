import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Chat, ChatMessage } from '../Models/models';

export interface ChatListState {
  chats: Chat[];
  lastUpdated: number | null;
}

const initialState: ChatListState = {
  chats: [],
  lastUpdated: null
};

const chatListSlice = createSlice({
  name: 'chat',  // slice name is 'chat'
  initialState,
  reducers: {
    setChats: (state, action: PayloadAction<Chat[]>) => {
      state.chats = action.payload;
      state.lastUpdated = Date.now();
    },
    updateChat: (state, action: PayloadAction<{
      chatId: string;
      message: ChatMessage;
    }>) => {
      const { chatId, message } = action.payload;
      const chatIndex = state.chats.findIndex(chat => chat.id === chatId);
      
      if (chatIndex !== -1) {
        state.chats[chatIndex] = {
          ...state.chats[chatIndex],
          last_message: message.content,
          last_message_at: message.sent_at,
          last_message_by: message.sender,
          last_message_id: message.id,
        };
      }
      state.lastUpdated = Date.now();
    },
    addChat: (state, action: PayloadAction<Chat>) => {
      if (!state.chats.some(chat => chat.id === action.payload.id)) {
        state.chats.push(action.payload);
        state.lastUpdated = Date.now();
      }
    },
    clearChats: (state) => {
      state.chats = [];
      state.lastUpdated = null;
    }
  }
});

export const {
  setChats,
  updateChat,
  addChat,
  clearChats
} = chatListSlice.actions;

// Fixed selectors to use 'chat' slice name consistently
export const selectAllChats = (state: { chat: ChatListState }) => 
  [...state.chat.chats].sort((a, b) => {
    const dateA = new Date(a.last_message_at || 0).getTime();
    const dateB = new Date(b.last_message_at || 0).getTime();
    return dateB - dateA;
  });

export const selectChatById = (state: { chat: ChatListState }, chatId: string) => 
  state.chat.chats.find(chat => chat.id === chatId);

export default chatListSlice.reducer;