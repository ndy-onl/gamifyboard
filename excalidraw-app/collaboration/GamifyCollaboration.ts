    import * as Y from "yjs";
    import { io, Socket } from "socket.io-client";
    import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
    import { ExcalidrawBinding } from "@ndy-onl/y-excalidraw";
    import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

    // Definiert die möglichen Zustände unserer Verbindung für eine saubere UI-Integration
    export type CollaborationStatus = "connecting" | "connected" | "disconnected" | "error:auth" | "error:connection";

    export class GamifyCollaboration {
      private ydoc: Y.Doc;
      private socket: Socket | null = null;
      private binding: ExcalidrawBinding | null = null;
      private awareness: Awareness;

      private backendUrl: string;
      private token: string;
      private excalidrawAPI: ExcalidrawImperativeAPI;

      public onStatusChange: ((status: CollaborationStatus) => void) | null = null;

      constructor(
        backendUrl: string,
        token: string,
        excalidrawAPI: ExcalidrawImperativeAPI
      ) {
        this.backendUrl = backendUrl;
        this.token = token;
        this.excalidrawAPI = excalidrawAPI;
        this.ydoc = new Y.Doc();
        this.awareness = new Awareness(this.ydoc);
      }

      public start = (boardId: string) => {
        const wsUrl = import.meta.env.VITE_APP_WS_URL || this.backendUrl;
        this.onStatusChange?.('connecting');

        this.socket = io(wsUrl, {
          auth: { token: this.token },
        });

        this.socket.on("connect", () => {
          this.onStatusChange?.('connected');
          console.log("Socket connected, joining board...");
          this.socket?.emit("yjs:join", boardId);
        });

        this.socket.on("disconnect", () => {
          this.onStatusChange?.('disconnected');
          console.log("Socket disconnected.");
        });

        this.socket.on("connect_error", (err: Error) => {
            console.error("Connection Error:", err.message);
            if (err.message.includes("authentication error")) {
                this.socket?.disconnect();
                this.onStatusChange?.('error:auth');
            } else {
                this.onStatusChange?.('error:connection');
            }
        });

        // Sync Document State
        this.socket.on("yjs:sync", (initialState: Uint8Array) => {
          Y.applyUpdate(this.ydoc, new Uint8Array(initialState), this);
          this.binding = new ExcalidrawBinding(
            this.ydoc.getArray("elements"),
            this.ydoc.getMap("assets"),
            this.excalidrawAPI,
            this.awareness
          );
        });

        this.socket.on("yjs:update", (update: Uint8Array) => {
          Y.applyUpdate(this.ydoc, new Uint8Array(update), this);
        });

        this.ydoc.on("update", (update: Uint8Array, origin: any) => {
          if (origin !== this) {
            this.socket?.emit("yjs:update", update);
          }
        });

        // Sync Awareness State
        this.socket.on("yjs:awareness", (update: Uint8Array) => {
            applyAwarenessUpdate(this.awareness, new Uint8Array(update), this);
        });

        this.awareness.on('update', (changes: any, origin: any) => {
            if (origin === 'local') {
                const awarenessUpdate = encodeAwarenessUpdate(this.awareness, [this.awareness.clientID]);
                this.socket?.emit("yjs:awareness", awarenessUpdate);
            }
        });
      };

      // Wird von der Excalidraw UI aufgerufen, um Mauszeiger-Positionen zu teilen
      public onPointerUpdate = (payload: any) => {
        this.awareness.setLocalStateField("pointer", payload.pointer);
        this.awareness.setLocalStateField("button", payload.button);
      }

      public close = () => {
        this.socket?.disconnect();
        this.binding?.destroy();
        this.awareness.destroy();
        this.ydoc.destroy();
        console.log("Collaboration instance closed.");
      };
    }