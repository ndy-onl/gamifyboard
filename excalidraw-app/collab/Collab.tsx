import { atom } from "jotai";

import type { Socket } from "socket.io-client";

export interface CollabAPI {
  isCollaborating: () => boolean;
  startCollaboration: (boardId: string | null) => void;
  stopCollaboration: () => void;
  setUsername: (username: string) => void;
  getUsername: () => string;
  onBoardUpdate: (callback: (data: any) => void) => void;
  updateBoard: (boardId: string, data: any) => void;
  joinBoard: (boardId: string) => void;
  close: () => void;
  setCollabError: (error: string) => void;
}

export const collabAPIAtom = atom<CollabAPI | null>(null);
export const activeRoomLinkAtom = atom<string>("");
