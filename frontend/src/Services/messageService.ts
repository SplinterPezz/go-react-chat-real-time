import { fetchFromApi } from '../Utils/apiService.ts'
import { HelloModel, Chat, ApiError, ChatMessagePaged, CreateChatRequest } from '../Models/models.ts';

export const DEFAULT_LIMIT_PAGE_MESSAGE: number = 20;


export async function helloworld(): Promise<HelloModel | ApiError> {
  const response = await fetchFromApi<HelloModel | ApiError>('/hello', {
    method: 'GET',
  });
  
  if (response) {
    return response as HelloModel;
  }

  return response as ApiError;
}

export async function getChats(): Promise<Chat[] | ApiError> {
  const response = await fetchFromApi<Chat[] | ApiError>('/getChats', {
    method: 'GET',
  });
  
  if (response) {
    return response as Chat[];
  }
  return response as ApiError;
}

export async function getChatById(chat_id : string): Promise<Chat | ApiError> {
  const params = new URLSearchParams({
    chat_id: chat_id,
  });
  
  const response = await fetchFromApi<Chat | ApiError>(`/getChatById?${params.toString()}`,
     {
    method: 'GET',
  });
  
  if (response) {
    return response as Chat;
  }
  return response as ApiError;
}

export async function getMessageChat(
  chat_id: string,
  page: number,
  limit: number = DEFAULT_LIMIT_PAGE_MESSAGE
): Promise<ChatMessagePaged | ApiError> {
  const params = new URLSearchParams({
    chat_id: chat_id,
    page: page.toString(),
    limit: limit.toString()
  });

  const response = await fetchFromApi<ChatMessagePaged | ApiError>(
    `/getMessageChat?${params.toString()}`,
    {
      method: 'GET',
    }
  );
  
  if (response) {
    return response as ChatMessagePaged;
  }
  return response as ApiError;
}

export async function createChat(payload: CreateChatRequest): Promise<Chat | ApiError> {
  const response = await fetchFromApi<Chat | ApiError>('/createChat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  if (response) {
    return response as Chat;
  }

  return response as ApiError;
}