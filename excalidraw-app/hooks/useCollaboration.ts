import { useEffect, useState, useRef } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useAtomValue } from 'jotai';
import { authStatusAtom } from '../state/authAtoms';
import { GamifyCollaboration, CollaborationStatus } from '../collaboration/GamifyCollaboration';

export const useCollaboration = (
  excalidrawAPI: ExcalidrawImperativeAPI | null,
  boardId: string | null,
) => {
  const [collaborationStatus, setCollaborationStatus] = useState<CollaborationStatus>("disconnected");
  const { accessToken } = useAtomValue(authStatusAtom);

  const collabInstanceRef = useRef<GamifyCollaboration | null>(null);

  useEffect(() => {
    if (!excalidrawAPI || !boardId) {
      if (collabInstanceRef.current) {
        collabInstanceRef.current.close();
        collabInstanceRef.current = null;
        setCollaborationStatus("disconnected");
      }
      return;
    }

    const BACKEND_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:3334";
    const collabInstance = new GamifyCollaboration(BACKEND_URL, accessToken, excalidrawAPI);
    collabInstanceRef.current = collabInstance;

    collabInstance.onStatusChange = setCollaborationStatus;
    collabInstance.start(boardId);

    return () => {
      collabInstance.close();
      collabInstanceRef.current = null;
      setCollaborationStatus("disconnected");
    };
}, [excalidrawAPI, boardId]);

  return { 
    collaborationStatus,
    onPointerUpdate: collabInstanceRef.current?.onPointerUpdate,
  };
};