import { io, Socket } from "socket.io-client";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import { CollabAPI } from "../collab/Collab";

let socket: Socket | null = null;
let instance: CollabAPI | null = null;

type BoardUpdateCallback = (boardData: { elements: readonly ExcalidrawElement[] }) => void;

let onBoardUpdateCallback: BoardUpdateCallback | null = null;

const onBoardUpdated = (boardData: { elements: readonly ExcalidrawElement[] }) => {
  if (onBoardUpdateCallback) {
    onBoardUpdateCallback(boardData);
  }
};

const init = (backendUrl: string, token: string): Promise<Socket> => {
  if (socket) {
    return Promise.resolve(socket);
  }

  return new Promise((resolve, reject) => {
    socket = io(backendUrl, {
      auth: {
        token,
      },
    });

    socket.on("connect", () => {
      console.log("Connected to collaboration server");
      socket?.on("boardUpdated", onBoardUpdated);
      resolve(socket!);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from collaboration server");
    });

    socket.on("connect_error", (err) => {
      console.error("Connection to collaboration server failed:", err);
      reject(err);
    });
  });
};

const joinBoard = (boardId: string) => {
  if (!socket) {
    console.error("Socket not initialized");
    return;
  }
  socket.emit("joinBoard", boardId);
};

const updateBoard = (boardId: string, boardData: { elements: readonly ExcalidrawElement[] }) => {
  if (!socket) {
    console.error("Socket not initialized");
    return;
  }
  socket.emit("updateBoard", { boardId, boardData });
};

const onBoardUpdate = (callback: BoardUpdateCallback) => {
  onBoardUpdateCallback = callback;
};

const close = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    instance = null; // Reset instance on close
  }
};

export const getInstance = async (backendUrl: string, token: string): Promise<CollabAPI> => {
  if (instance) {
    return instance;
  }

  await init(backendUrl, token);

  instance = {
    isCollaborating: () => !!socket && socket.connected,
    startCollaboration: (boardId: string | null) => {
      if (boardId) {
        joinBoard(boardId);
      }
    },
    stopCollaboration: () => {
      close();
    },
    setUsername: (username: string) => {
      // Not implemented
    },
    getUsername: () => {
      // Not implemented
      return "";
    },
    onBoardUpdate: (callback: (data: any) => void) => {
      onBoardUpdateCallback = callback;
    },
    updateBoard: (boardId: string, data: any) => {
      updateBoard(boardId, data);
    },
    joinBoard: (boardId: string) => {
      joinBoard(boardId);
    },
    close: () => {
      close();
    },
    setCollabError: (error: string) => {
      console.error(error);
    },
  };

  return instance;
};