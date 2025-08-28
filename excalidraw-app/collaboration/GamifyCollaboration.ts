import * as Y from "yjs";
    import { io, Socket } from "socket.io-client";
    import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
    import { ExcalidrawBinding } from "@ndy-onl/y-excalidraw";
    import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

    export type CollaborationStatus = "connecting" | "connected" | "disconnected";

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
        this.socket = io(wsUrl, {
          auth: { token: this.token },
        });

        this.socket.on("connect", () => {
          this.onStatusChange?.('connected');
          console.log("Socket connected, joining board via custom event 'yjs:join'...");
          this.socket?.emit("yjs:join", boardId);
        });

        this.socket.on("disconnect", () => {
          this.onStatusChange?.('disconnected');
          console.log("Socket disconnected.");
        });

        this.socket.on("yjs:sync", (initialState: Uint8Array) => {
          console.log("Received initial sync from server.");

          // Step 1: Create the binding to Excalidraw FIRST, if it doesn't exist
          if (!this.binding) {
            this.binding = new ExcalidrawBinding(
              this.ydoc.getArray("elements"),
              this.ydoc.getMap("assets"),
              this.excalidrawAPI,
              this.awareness
            );
          }

          // Step 2: Then apply the update from the server
          Y.applyUpdate(this.ydoc, new Uint8Array(initialState), this);
        });

        // Step 3: Listen for further document updates from the server
        this.socket.on("yjs:update", (message: { traceId: string, payload: Uint8Array }) => {
          const update = new Uint8Array(message.payload); // NEU: Payload extrahieren
          console.log(`[CLIENT] [${message.traceId}] Received document update from server. Size: ${update.byteLength} bytes.`); // NEU: Trace-ID loggen
          Y.applyUpdate(this.ydoc, update, this);
        });

        // Step 4: Listen for local document changes and send them to the server
        this.ydoc.on("update", (update: Uint8Array, origin: any) => {
          if (origin !== this) { // 'this' is the origin for remote changes
            const traceId = Math.random().toString(36).substring(2, 15); // NEU: Trace-ID generieren
            console.log(`[CLIENT] [${traceId}] Sending document update to server. Size: ${update.byteLength} bytes.`);
            this.socket?.emit("yjs:update", { traceId: traceId, payload: update }); // NEU: Objekt senden
          }
        });

        // --- AWARENESS PROTOCOL ---
        // Listen for awareness updates from the server
        this.socket.on("yjs:awareness", (message: { traceId: string, payload: Uint8Array }) => {
            const update = new Uint8Array(message.payload); // NEU: Payload extrahieren
            console.log(`[CLIENT] [${message.traceId}] Received awareness update from server.`); // NEU: Trace-ID loggen
            applyAwarenessUpdate(this.awareness, update, this);
        });

        // Listen for local awareness changes and send them to the server
        this.awareness.on('update', (changes: any, origin: any) => {
            if (origin === 'local') {
                const awarenessUpdate = encodeAwarenessUpdate(this.awareness, [this.awareness.clientID]);
                const traceId = Math.random().toString(36).substring(2, 15); // NEU: Trace-ID generieren
                console.log(`[CLIENT] [${traceId}] Sending awareness update to server.`);
                this.socket?.emit("yjs:awareness", { traceId: traceId, payload: awarenessUpdate }); // NEU: Objekt senden
            }
        });
      };

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