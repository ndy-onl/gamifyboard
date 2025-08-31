import { useEffect, useState, useRef } from "react";

import { useAtomValue } from "jotai";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { authStatusAtom } from "../state/authAtoms";

import { GamifyCollaboration } from "../collaboration/GamifyCollaboration";

import type { CollaborationStatus } from "../collaboration/GamifyCollaboration";

export const useCollaboration = (
  excalidrawAPI: ExcalidrawImperativeAPI | null,
  boardId: string | null,
) => {
  const [collaborationStatus, setCollaborationStatus] =
    useState<CollaborationStatus>("disconnected");
  const { accessToken } = useAtomValue(authStatusAtom);

  const collabInstanceRef = useRef<GamifyCollaboration | null>(null);

  useEffect(() => {
    if (!excalidrawAPI || !boardId || !accessToken) {
      if (collabInstanceRef.current) {
        collabInstanceRef.current.close();
        collabInstanceRef.current = null;
        setCollaborationStatus("disconnected");
      }
      return;
    }

    const collabInstance = new GamifyCollaboration(
      accessToken,
      excalidrawAPI,
    );
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
