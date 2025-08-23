import apiClient from "./apiClient";

export const registerUser = (username: string, email: string, password: string) => {
  return apiClient.post("/auth/register", { username, email, password });
};

export const getProfile = () => {
  return apiClient.get("/auth/profile");
};

export const refreshToken = () => {
  return apiClient.post("/auth/refresh");
};

export const createBoard = (name: string, data: any) => {
  return apiClient.post("/boards", { name, board_data: data });
};

export const getBoards = () => {
  return apiClient.get("/boards");
};

export const getBoard = (id: string) => {
  return apiClient.get(`/boards/${id}`);
};

export const updateBoard = (id: string, name: string, data: any) => {
  return apiClient.patch(`/boards/${id}`, { name, data });
};

export const deleteBoard = (id: string) => {
  return apiClient.delete(`/boards/${id}`);
};
