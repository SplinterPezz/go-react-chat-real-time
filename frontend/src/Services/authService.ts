import { ApiError, fetchFromApi } from '../Utils/apiService.ts'

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
  token: string;
  expiration: number;
}


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
