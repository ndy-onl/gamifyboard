import { useEffect, useState, useCallback } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { getInstance } from '../collaboration/GamifyCollaboration';
import { authStatusAtom } from '../state/authAtoms';
import { useAtomValue, useSetAtom } from 'jotai';
import { collabAPIAtom, activeRoomLinkAtom } from '../collab/Collab';

export const useCollaboration = (
  excalidrawAPI: ExcalidrawImperativeAPI | null,
  boardId: string | null,
) => {
  const [isCollaborating, setIsCollaborating] = useState(false);
  const { isLoggedIn, accessToken } = useAtomValue(authStatusAtom);
  const setCollabAPI = useSetAtom(collabAPIAtom);
  const setActiveRoomLink = useSetAtom(activeRoomLinkAtom);

  useEffect(() => {
    if (isLoggedIn && accessToken && excalidrawAPI && boardId) {
      const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:3334";
      const collabAPI = getInstance(BACKEND_URL, accessToken);
      setCollabAPI(collabAPI);

      collabAPI.joinBoard(boardId);

      const onBoardUpdate = (data: { elements: any; }) => {
        excalidrawAPI.updateScene({
          elements: data.elements,
        });
      };

      collabAPI.onBoardUpdate(onBoardUpdate);
      setIsCollaborating(true);
      setActiveRoomLink(window.location.href);

      return () => {
        collabAPI.close();
        setIsCollaborating(false);
        setCollabAPI(null);
        setActiveRoomLink("");
      };
    }
  }, [isLoggedIn, accessToken, excalidrawAPI, boardId, setCollabAPI, setActiveRoomLink]);

  const updateBoard = useCallback((elements: readonly any[]) => {
    const collabAPI = getInstance("", "");
    if (boardId && collabAPI.isCollaborating()) {
      collabAPI.updateBoard(boardId, { elements });
    }
  }, [boardId]);

  return { isCollaborating, updateBoard };
};