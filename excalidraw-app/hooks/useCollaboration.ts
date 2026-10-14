import { useEffect, useState, useCallback, useRef } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { authStatusAtom } from '../state/authAtoms';
import { useAtomValue, useSetAtom } from 'jotai';
import { collabAPIAtom, activeRoomLinkAtom } from '../collab/Collab';
import * as Y from 'yjs';
import { SocketIOProvider } from 'y-socket.io';
import { ExcalidrawBinding } from '@ndy-onl/y-excalidraw';

/**
 * ============================================================================
 * GAMIFYBOARD: MULTIPLAYER COLLABORATION & AWARENESS HOOK
 * ============================================================================
 * Manages real-time multiplayer synchronization for the GamifyBoard ecosystem
 * using Yjs CRDTs, WebSocket transport via `y-socket.io`, and Excalidraw bindings.
 *
 * Architecture & Responsibilities:
 * 1. CRDT DOCUMENT SYNCHRONIZATION:
 *    - Connects to the room's Yjs document (`Y.Doc`).
 *    - Binds `yElements` (CRDT array) and `yAssets` (CRDT map) to Excalidraw
 *      via `@ndy-onl/y-excalidraw`'s `ExcalidrawBinding`.
 * 2. SHARED ROOM STATE (`gamifyState`):
 *    - Observes and synchronizes room-wide metadata (e.g. `isEditMode` toggle)
 *      via a dedicated `Y.Map`.
 * 3. EPHEMERAL COLLABORATION AWARENESS:
 *    - Manages client presence, multiplayer cursor positions, and color badges.
 *    - Implements dynamic cursor name synchronization (`setCursorName`) tied to
 *      GamifyBoard's active PlayerSlot identity.
 *
 * @param excalidrawAPI - Imperative API handle to the Excalidraw canvas instance.
 * @param boardId - Unique identifier of the collaborative board room.
 * @param onGameModeChange - Optional callback invoked when another user toggles Edit/Game mode.
 * ============================================================================
 */
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
      // Select appropriate collaboration backend endpoint (local alpha dev vs production cluster)
      const BACKEND_URL = import.meta.env.DEV
        ? 'https://api.alpha.gamifyboard.com'
        : import.meta.env.VITE_APP_API_URL;

      // Initialize root Yjs CRDT document for the room
      const ydoc = new Y.Doc();
      
      // Shared state map for room-wide Gamify metadata (e.g. edit mode toggle)
      const gamifyState = ydoc.getMap<any>('gamifyState');
      gamifyStateRef.current = gamifyState;
      
      // Listen for remote game mode changes across all connected clients
      gamifyState.observe(event => {
         const mode = gamifyState.get('isEditMode');
         if (mode !== undefined && onGameModeChange) {
            onGameModeChange(mode);
         }
      });

      // Optional JWT authentication payload for registered users
      const authPayload: any = {};
      if (accessToken) {
        authPayload.token = accessToken;
      }

      // Establish resilient WebSocket transport via SocketIOProvider
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

      // Register initial ephemeral awareness presence with default name and random user color
      provider.awareness.setLocalStateField("user", {
        name: isLoggedIn ? "User" : "Guest",
        color: "#" + Math.floor(Math.random()*16777215).toString(16)
      });

      // Bind CRDT shared arrays & maps to Excalidraw's canvas scene
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
      
      // Teardown and clean up socket connections and bindings on unmount or board switch
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

  /**
   * Forwards high-frequency pointer movements to the Excalidraw collaboration binding,
   * broadcasting multiplayer cursor coordinates to other room participants.
   */
  const onPointerUpdate = useCallback((payload: any) => {
    if (bindingRef.current) {
      bindingRef.current.onPointerUpdate(payload);
    }
  }, []);

  /**
   * Manual board updater. No-op because `y-excalidraw` automatically observes
   * and synchronizes all canvas mutations without manual scene diffing.
   */
  const updateBoard = useCallback((elements: readonly any[]) => {
      // No manual updateBoard necessary. y-excalidraw syncs changes automatically.
  }, []);

  /**
   * Toggles and broadcasts the global room mode (Edit Mode vs Game Mode)
   * to all connected participants via the shared `gamifyState` Y.Map.
   */
  const setGlobalGameMode = useCallback((isEditMode: boolean) => {
    if (gamifyStateRef.current) {
       gamifyStateRef.current.set('isEditMode', isEditMode);
    }
  }, []);

  /**
   * ========================================================================
   * GAMIFYBOARD: COLLABORATION CURSOR NAME AWARENESS SYNCHRONIZATION
   * ========================================================================
   * Synchronizes the active player's name directly to their multiplayer cursor
   * badge via Yjs Ephemeral Awareness.
   *
   * Architectural Flow:
   * 1. TRIGGER: When a player types into or selects a PlayerSlot element
   *    (`customData.playerSlotId`), `App.tsx` calls `setCursorName(slot.text)`.
   * 2. DEDUPLICATION: Compares the desired name against the current awareness
   *    state (`user.name !== name`). If identical, it skips the update to avoid
   *    pointless awareness network packets.
   * 3. PROPAGATION: Calls `provider.awareness.setLocalStateField("user", ...)`.
   *    Yjs broadcasts this ephemeral update to all peers in the room.
   * 4. DISPLAY: Remote clients automatically render this updated name label above
   *    the user's live cursor indicator on their canvas.
   * ========================================================================
   */
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
