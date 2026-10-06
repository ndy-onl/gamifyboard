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
  onGameModeChange?: (isEditMode: boolean) => void
) => {
  const [isCollaborating, setIsCollaborating] = useState(false);
  const { isLoggedIn, accessToken } = useAtomValue(authStatusAtom);
  const setActiveRoomLink = useSetAtom(activeRoomLinkAtom);
  

  const bindingRef = useRef<ExcalidrawBinding | null>(null);
  const providerRef = useRef<SocketIOProvider | null>(null);
  const gamifyStateRef = useRef<Y.Map<any> | null>(null);


  useEffect(() => {
    if (excalidrawAPI && boardId) {
      const BACKEND_URL = import.meta.env.DEV
        ? 'https://api.alpha.gamifyboard.com'
        : import.meta.env.VITE_APP_API_URL;


      const ydoc = new Y.Doc();
      
      const gamifyState = ydoc.getMap<any>('gamifyState');
      gamifyStateRef.current = gamifyState;
      
      gamifyState.observe(event => {
         const mode = gamifyState.get('isEditMode');
         if (mode !== undefined && onGameModeChange) {
            onGameModeChange(mode);
         }
      });

      
      const authPayload: any = {};
      if (accessToken) {
        authPayload.token = accessToken;
      }

      const provider = new SocketIOProvider(
        BACKEND_URL, 
        boardId, 
        ydoc, 
        {
          autoConnect: true,
          auth: authPayload
        }
      );

      providerRef.current = provider;

      provider.awareness.setLocalStateField("user", {
        name: isLoggedIn ? "User" : "Guest",
        color: "#" + Math.floor(Math.random()*16777215).toString(16)
      });

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

  const onPointerUpdate = useCallback((payload: any) => {
    if (bindingRef.current) {
      bindingRef.current.onPointerUpdate(payload);
    }
  }, []);

  const updateBoard = useCallback((elements: readonly any[]) => {
      // No manual updateBoard necessary. y-excalidraw syncs changes automatically.
  }, []);

  
  const setGlobalGameMode = useCallback((isEditMode: boolean) => {
    if (gamifyStateRef.current) {
       gamifyStateRef.current.set('isEditMode', isEditMode);
    }
  }, []);

  const setCursorName = useCallback((name: string) => {
    if (providerRef.current) {
      const state = providerRef.current.awareness.getLocalState();
      const user = state ? state.user : null;
      if (user && user.name !== name) {
        providerRef.current.awareness.setLocalStateField("user", {
          ...user,
          name
        });
      }
    }
  }, []);

  return { isCollaborating, updateBoard, onPointerUpdate, setGlobalGameMode, setCursorName };

};
