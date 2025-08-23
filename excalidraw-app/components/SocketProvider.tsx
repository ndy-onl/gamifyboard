import React, { createContext, useContext, useEffect } from "react";
import { useAtom } from "jotai";

import { socket } from "../socket";
import { authStatusAtom } from "../state/authAtoms";

const SocketContext = createContext(socket);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [{ accessToken }] = useAtom(authStatusAtom);

  useEffect(() => {
    if (accessToken) {
      console.log("SocketProvider: Access token found, connecting socket...");
      socket.auth = { token: accessToken };
      socket.connect();
    } else {
      console.log("SocketProvider: No access token, disconnecting socket.");
      socket.disconnect();
    }

    return () => {
      console.log("SocketProvider: Cleaning up, disconnecting socket.");
      socket.disconnect();
    };
  }, [accessToken]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
