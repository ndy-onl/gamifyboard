import apiClient from './apiClient';

export const registerUser = (email, password) => {
  return apiClient.post('/auth/register', { email, password });
};

export const getProfile = () => {
  return apiClient.get('/auth/profile');
};

export const refreshToken = () => {
  return apiClient.post('/auth/refresh');
};

export const createBoard = (name, data) => {
  return apiClient.post('/boards', { name, data });
};

export const getBoards = () => {
  return apiClient.get('/boards');
};

export const getBoard = (id) => {
  return apiClient.get(`/boards/${id}`);
};

export const updateBoard = (id, name, data) => {
  return apiClient.patch(`/boards/${id}`, { name, data });
};

export const deleteBoard = (id) => {
  return apiClient.delete(`/boards/${id}`);
};
