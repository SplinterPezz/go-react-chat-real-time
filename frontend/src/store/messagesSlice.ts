import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '../Models/models';

export interface SavedChat {
  chatId: string;
  messages: ChatMessage[];
  lastMessageId: string | null;
}

export interface ChatState {
  chats: Record<string, SavedChat>;
}

const initialState: ChatState = {
  chats: {}
};

const messagesSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    // Initialize or update a chat's basic information
    initChat: (state, action: PayloadAction<{ chatId: string }>) => {
      if (!state.chats[action.payload.chatId]) {
        state.chats[action.payload.chatId] = {
          chatId: action.payload.chatId,
          messages: [],
          lastMessageId: null,
        };
      }
    },

    // Add or update messages for a specific chat
    addMessages: (state, action: PayloadAction<{ chatId: string, messages: ChatMessage[]}>) => {
      const { chatId, messages } = action.payload;
      
      if (!state.chats[chatId]) {
        state.chats[chatId] = {
          chatId,
          lastMessageId : null,
          messages: []
        };
      }

      // Update existing messages and add new ones
      const existingMessageIds = new Set(state.chats[chatId].messages.map(msg => msg.id));
      const newMessages = messages.filter(msg => !existingMessageIds.has(msg.id));
      
      state.chats[chatId].messages.push(...newMessages);
      state.chats[chatId].lastMessageId = getLastMessageId(state.chats[chatId].messages)
    },

    // Remove a specific chat and its messages
    removeChat: (state, action: PayloadAction<{ chatId: string }>) => {
      delete state.chats[action.payload.chatId];
    },

    // Clear all chats (useful for logout)
    clearAllMessages: (state) => {
      state.chats = {};
    }
  }
});

function getLastMessageId(messages: ChatMessage[]): string | null {
  if (messages.length === 0) return null;

  const latestMessage = messages.reduce((latestMessage, currentMessage) => 
    new Date(currentMessage.sent_at) > new Date(latestMessage.sent_at) ? currentMessage : latestMessage
  );

  return latestMessage.id;
}

// Export actions
export const {
  initChat,
  addMessages,
  removeChat,
  clearAllMessages
} = messagesSlice.actions;

// Selectors
export const selectChatById = (chatId: string) => (state: { chat: ChatState }) => 
  state.chat.chats[chatId];

export const selectChatMessages = (chatId: string) => (state: { chat: ChatState }) => 
  state.chat.chats[chatId]?.messages ?? [];

export default messagesSlice.reducer;