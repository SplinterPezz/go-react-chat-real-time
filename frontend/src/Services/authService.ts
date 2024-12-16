import { ApiError, LoginModel, RegisterModel, TokenAuth } from '../Models/models.ts';
import { fetchFromApi } from '../Utils/apiService.ts'




export async function login(payload: LoginModel): Promise<TokenAuth | ApiError> {
  const response = await fetchFromApi<TokenAuth | ApiError>('/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  if (response) {
    return response as TokenAuth;
  }

  return response as ApiError;
}


export async function register(payload: RegisterModel): Promise<TokenAuth | ApiError> {
  const response = await fetchFromApi<TokenAuth | ApiError>('/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (response) {
    return response as TokenAuth;
  }

  return response as ApiError;
}
