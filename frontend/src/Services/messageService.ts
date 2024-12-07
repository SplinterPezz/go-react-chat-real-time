import { ApiError, fetchFromApi } from '../Utils/apiService.ts'

export interface HelloModel {
  message: string;
}

export async function helloworld(): Promise<HelloModel | ApiError> {
  const response = await fetchFromApi<HelloModel | ApiError>('/hello', {
    method: 'GET',
  });
  
  if (response) {
    return response as HelloModel;
  }

  return response as ApiError;
}
