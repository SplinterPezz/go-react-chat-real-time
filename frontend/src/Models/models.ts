export interface HelloModel {
  message: string;
}

export interface Chat {
  id: string;
  created_by: string;
  users: string[];
  last_message: string | null;
  last_message_at: string | null;
  last_message_by: string | null;
  last_message_id: string | null;
  created_at: string;
  user_data: User | null;
  online_status: boolean | null;
}

export interface ChatMessagePaged {
  messages : ChatMessage[] | [];
  total_pages: number;
}

export interface ApiError {
  success: boolean;
  error?: string;
  fieldError?: string;
  customMessage?: string;
}

export interface User {
  id: string;
  username: string;
  img?: string;
}

export interface NotificationMessage {
  type: "notification";
  message: string;
}

export interface ConnectMessage {
  type: "connect";
  online_users: User[];
}

export interface DisconnectMessage {
  type: "disconnect";
  online_users: { id: string; username: string }[];
}

export interface ChatMessage {
  type: "message";
  id: string;
  chat_id: string;
  sender: string;
  content: string;
  sent_at: string;
}

export interface LoginModel {
  email: string;
  password: string;
}

export interface RegisterModel {
  username: string;
  email: string;
  password: string;
}

export interface RegistrationErrorModel {
  field: string;
  message: string
}

export interface TokenAuth {
  id: string;
  token: string;
  expiration: number;
  user: string;
}