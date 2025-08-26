    import { useEffect, useState } from 'react';
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

      useEffect(() => {
        if (!excalidrawAPI || !boardId || !accessToken) {
          return;
        }

        const BACKEND_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:3334";
        const collabInstance = new GamifyCollaboration(BACKEND_URL, accessToken, excalidrawAPI);

        collabInstance.onStatusChange = setCollaborationStatus;
        collabInstance.start(boardId);

        // Wire up pointer updates from Excalidraw to our instance
        excalidrawAPI.onPointerUpdate(collabInstance.onPointerUpdate);

        return () => {
          collabInstance.close();
        };
      }, [excalidrawAPI, boardId, accessToken]);

      return { collaborationStatus };
    };