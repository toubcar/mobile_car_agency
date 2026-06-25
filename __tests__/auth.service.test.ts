jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

import apiClient from '../services/api';
import { authService } from '../services/auth.service';

const mockedApi = apiClient as jest.Mocked<typeof apiClient>;

describe('authService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('login appelle POST /auth/login', async () => {
    mockedApi.post.mockResolvedValue({
      data: { token: 't', user: { id: 1, role: 'client' } },
    });
    await authService.login('a@b.com', 'secret');
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.com',
      password: 'secret',
    });
  });

  it('logout appelle POST /auth/logout même si le réseau échoue', async () => {
    mockedApi.post.mockRejectedValue(new Error('Network Error'));
    await expect(authService.logout()).resolves.toBeUndefined();
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/logout');
  });

  it('loginWithApple appelle POST /auth/apple', async () => {
    mockedApi.post.mockResolvedValue({
      data: { token: 't', user: { id: 1, role: 'client' } },
    });
    await authService.loginWithApple('jwt-token', 'Jean Dupont');
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/apple', {
      identity_token: 'jwt-token',
      full_name: 'Jean Dupont',
    });
  });
});
