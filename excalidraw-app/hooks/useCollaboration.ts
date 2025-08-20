import { useEffect, useState, useCallback, useRef } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { getInstance } from '../collaboration/GamifyCollaboration';
import { authStatusAtom } from '../state/authAtoms';
import { useAtomValue, useSetAtom } from 'jotai';
import { collabAPIAtom, activeRoomLinkAtom } from '../collab/Collab';
import { CollabAPI } from '../collab/Collab';

export const useCollaboration = (
  excalidrawAPI: ExcalidrawImperativeAPI | null,
  boardId: string | null,
) => {
  const [isCollaborating, setIsCollaborating] = useState(false);
  const { isLoggedIn, accessToken } = useAtomValue(authStatusAtom);
  const setCollabAPI = useSetAtom(collabAPIAtom);
  const setActiveRoomLink = useSetAtom(activeRoomLinkAtom);
  const collabAPIRef = useRef<CollabAPI | null>(null);

  useEffect(() => {
    const setupCollaboration = async () => {
      if (isLoggedIn && accessToken && excalidrawAPI && boardId) {
        const BACKEND_URL = import.meta.env.DEV
          ? 'https://api.alpha.gamifyboard.com'
          : import.meta.env.VITE_APP_API_URL;

        try {
          const collabAPI = await getInstance(BACKEND_URL, accessToken);
          collabAPIRef.current = collabAPI;
          setCollabAPI(collabAPI);

          collabAPI.joinBoard(boardId);

          const onBoardUpdate = (data: { elements: any }) => {
            excalidrawAPI.updateScene({
              elements: data.elements,
            });
          };

          collabAPI.onBoardUpdate(onBoardUpdate);
          setIsCollaborating(true);
          setActiveRoomLink(window.location.href);
        } catch (error) {
          console.error("Failed to initialize collaboration", error);
        }
      }
    };

    setupCollaboration();

    return () => {
      if (collabAPIRef.current) {
        collabAPIRef.current.close();
        collabAPIRef.current = null;
        setIsCollaborating(false);
        setCollabAPI(null);
        setActiveRoomLink("");
      }
    };
  }, [isLoggedIn, accessToken, excalidrawAPI, boardId, setCollabAPI, setActiveRoomLink]);

  const updateBoard = useCallback((elements: readonly any[]) => {
    if (boardId && collabAPIRef.current?.isCollaborating()) {
      collabAPIRef.current.updateBoard(boardId, { elements });
    }
  }, [boardId]);

  return { isCollaborating, updateBoard };
};