import React, { createContext, useContext, useEffect, useState } from "react";
import { SocketIOProvider } from "y-socket.io";
import * as Y from "yjs";

const WEBSOCKET_URL =
  import.meta.env.VITE_APP_WS_URL || "wss://api.alpha.gamifyboard.com";

interface CollaborationContextType {
  doc: Y.Doc;
  provider: SocketIOProvider | null;
  connected: boolean;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export const CollaborationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [doc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<SocketIOProvider | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newProvider = new SocketIOProvider(WEBSOCKET_URL, "", doc, {
      autoConnect: false, // SEHR WICHTIG
    });

    const onStatus = ({ status }: { status: string }) => {
      console.log(`Yjs connection status: ${status}`);
      setConnected(status === "connected");
    };

    newProvider.on("status", onStatus);
    setProvider(newProvider);

    console.log("Yjs provider created but not connected yet.");

    return () => {
      console.log("Destroying Yjs provider.");
      newProvider.off("status", onStatus);
      newProvider.destroy();
    };
  }, [doc]);

  return (
    <CollaborationContext.Provider value={{ doc, provider, connected }}>
      {children}
    </CollaborationContext.Provider>
  );
};

export const useCollaborationContext = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error(
      "useCollaborationContext must be used within a CollaborationProvider",
    );
  }
  return context;
};