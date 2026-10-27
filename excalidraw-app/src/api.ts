import apiClient from './apiClient';
import * as Y from 'yjs';

export const registerUser = (username, email, password) => {
  return apiClient.post('/auth/register', { username, email, password });
};

export const getProfile = () => {
  return apiClient.get('/auth/profile');
};

export const refreshToken = () => {
  return apiClient.post('/auth/refresh');
};

export const createBoard = (name, data) => {
  let yjs_data = undefined;
  try {
    const ydoc = new Y.Doc();
    const yElements = ydoc.getArray('elements');
    const elementsToMap = data && data.elements ? data.elements : (Array.isArray(data) ? data : []);
    const mappedElements = elementsToMap.map(el => {
      const ymap = new Y.Map();
      for (const key in el) {
        ymap.set(key, el[key]);
      }
      return ymap;
    });
    yElements.insert(0, mappedElements);
    
    const yAssets = ydoc.getMap('assets');
    if (data && data.files) {
      for (const fileId in data.files) {
        yAssets.set(fileId, data.files[fileId]);
      }
    }
    
    // Convert to Array so it can be JSON serialized
    yjs_data = Array.from(Y.encodeStateAsUpdate(ydoc));
  } catch (e) {
    console.error("Failed to generate initial yjs_data", e);
  }

  return apiClient.post('/boards', { name, board_data: data, yjs_data });
};

export const getBoards = () => {
  return apiClient.get('/boards');
};

export const getBoard = (id) => {
  return apiClient.get(`/boards/${id}`);
};

export const getPublicBoard = (id) => {
  return apiClient.get(`/boards/public/${id}`);
};

export const updateBoard = (id, name, data) => {
  return apiClient.patch(`/boards/${id}`, { name, data });
};

export const deleteBoard = (id) => {
  return apiClient.delete(`/boards/${id}`);
};

export const loginUser = async (email, password) => {
  return apiClient.post('/auth/login', { email, password });
};

export const logoutUser = () => {
  return apiClient.post('/auth/logout');
};
