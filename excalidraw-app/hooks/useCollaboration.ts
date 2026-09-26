import { useEffect, useState, useCallback, useRef } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { authStatusAtom } from '../state/authAtoms';
import { useAtomValue, useSetAtom } from 'jotai';
import { collabAPIAtom, activeRoomLinkAtom } from '../collab/Collab';
import * as Y from 'yjs';
import { SocketIOProvider } from 'y-socket.io';
import { ExcalidrawBinding } from '@ndy-onl/y-excalidraw';

export const useCollaboration = (
  excalidrawAPI: ExcalidrawImperativeAPI | null,
  boardId: string | null,
) => {
  const [isCollaborating, setIsCollaborating] = useState(false);
  const { isLoggedIn, accessToken } = useAtomValue(authStatusAtom);
  const setActiveRoomLink = useSetAtom(activeRoomLinkAtom);
  
  const bindingRef = useRef<ExcalidrawBinding | null>(null);
  const providerRef = useRef<SocketIOProvider | null>(null);

  useEffect(() => {
    if (isLoggedIn && accessToken && excalidrawAPI && boardId) {
      const BACKEND_URL = import.meta.env.DEV
        ? 'https://api.alpha.gamifyboard.com'
        : import.meta.env.VITE_APP_API_URL;

      const ydoc = new Y.Doc();
      
      const provider = new SocketIOProvider(
        BACKEND_URL, 
        boardId, 
        ydoc, 
        {
          autoConnect: true,
          auth: { token: accessToken }
        }
      );

      providerRef.current = provider;

      const yElements = ydoc.getArray<Y.Map<any>>('elements');
      const yAssets = ydoc.getMap<any>('assets');

      const binding = new ExcalidrawBinding(
        yElements,
        yAssets,
        excalidrawAPI,
        provider.awareness
      );
      
      bindingRef.current = binding;

      setIsCollaborating(true);
      setActiveRoomLink(window.location.href);
      
      return () => {
        binding.destroy();
        provider.disconnect();
        provider.destroy();
        bindingRef.current = null;
        providerRef.current = null;
        setIsCollaborating(false);
        setActiveRoomLink("");
      };
    }
  }, [isLoggedIn, accessToken, excalidrawAPI, boardId, setActiveRoomLink]);

  const updateBoard = useCallback((elements: readonly any[]) => {
      // No manual updateBoard necessary. y-excalidraw syncs changes automatically.
  }, []);

  return { isCollaborating, updateBoard };
};
