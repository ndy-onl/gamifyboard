import { useEffect, useState, useRef } from 'react';
    import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
    import { useAtomValue } from 'jotai';
    import { authStatusAtom } from '../state/authAtoms';
    import { GamifyCollaboration, CollaborationStatus } from '../collaboration/GamifyCollaboration';

    export const useCollaboration = (
      excalidrawAPI: ExcalidrawImperativeAPI | null,
      boardId: string | null,
    ) => {
      console.log("[useCollaboration] Hook called."); // NEU: Hook-Aufruf loggen
      const [collaborationStatus, setCollaborationStatus] = useState<CollaborationStatus>("disconnected");
      const { accessToken } = useAtomValue(authStatusAtom);

      const collabInstanceRef = useRef<GamifyCollaboration | null>(null);

      useEffect(() => {
        console.log("[useCollaboration] useEffect triggered."); // NEU: useEffect-Trigger loggen
        console.log(`[useCollaboration] Dependencies: excalidrawAPI=${!!excalidrawAPI}, boardId=${boardId}, accessToken=${!!accessToken ? 'present' : 'null'}`); // NEU: Abhängigkeiten loggen
        // Nur fortfahren, wenn alle Abhängigkeiten gültig sind.
        // TEMPORÄRE ÄNDERUNG ZUM DEBUGGEN: accessToken aus der Bedingung entfernt
        if (!excalidrawAPI || !boardId) {
          // Wenn Abhängigkeiten ungültig werden, kümmert sich die Cleanup-Funktion
          // um die Zerstörung jeder bestehenden Instanz. Hier können wir einfach zurückkehren.
          if (collabInstanceRef.current) {
            collabInstanceRef.current.close();
            collabInstanceRef.current = null;
            setCollaborationStatus("disconnected");
          }
          console.log("[useCollaboration] useEffect: Dependencies not ready, returning."); // NEU: Guard-Clause loggen
          return;
        }

        // Neue Instanz erstellen und konfigurieren.
        const BACKEND_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:3334";
        const collabInstance = new GamifyCollaboration(BACKEND_URL, accessToken, excalidrawAPI);
        collabInstanceRef.current = collabInstance; // Instanz im Ref speichern

        console.log("[useCollaboration] useEffect: Dependencies ready, creating instance."); // NEU: Instanz-Erstellung loggen

        collabInstance.onStatusChange = setCollaborationStatus;
        collabInstance.start(boardId);

        return () => {
          // Cleanup-Funktion: Wird ausgeführt, wenn Abhängigkeiten sich ändern oder Komponente unmounted.
          // Die Instanz wird durch die Closure erfasst.
          collabInstance.close();
          collabInstanceRef.current = null; // Auch das Ref leeren
          setCollaborationStatus("disconnected");
        };
      // TEMPORÄRE ÄNDERUNG ZUM DEBUGGEN: accessToken aus Abhängigkeiten entfernt
    }, [excalidrawAPI, boardId]); // Abhängigkeits-Array

      return { 
        collaborationStatus,
        onPointerUpdate: collabInstanceRef.current?.onPointerUpdate,
      };
    };