// This file has been intentionally left blank to disable the legacy Firebase integration.
// All functions are defined as empty shells to prevent import errors in other parts of the application.

import type { ExcalidrawElement, FileId } from "@excalidraw/element/types";
import type { AppState, BinaryFileData } from "@excalidraw/excalidraw/types";

import type { SyncableExcalidrawElement } from ".";
import type Portal from "../collab/Portal";
import type { Socket } from "socket.io-client";

export const loadFirebaseStorage = async () => {
  return null;
};

export const isSavedToFirebase = (
  portal: Portal,
  elements: readonly ExcalidrawElement[],
): boolean => {
  return true; // Always return true to prevent unload warnings
};

export const saveFilesToFirebase = async ({
  prefix,
  files,
}: {
  prefix: string;
  files: { id: FileId; buffer: Uint8Array }[];
}) => {
  // Return empty arrays as no files are saved
  return { savedFiles: [], erroredFiles: files.map((f) => f.id) };
};

export const saveToFirebase = async (
  portal: Portal,
  elements: readonly SyncableExcalidrawElement[],
  appState: AppState,
) => {
  return null; // Return null as nothing is saved
};

export const loadFromFirebase = async (
  roomId: string,
  roomKey: string,
  socket: Socket | null,
): Promise<readonly SyncableExcalidrawElement[] | null> => {
  return null; // Return null as nothing can be loaded
};

export const loadFilesFromFirebase = async (
  prefix: string,
  decryptionKey: string,
  filesIds: readonly FileId[],
) => {
  // Return empty arrays as no files can be loaded
  return {
    loadedFiles: [],
    erroredFiles: new Map(filesIds.map((id) => [id, true])),
  };
};
