import { createContext, useContext, useMemo } from "react";
import { io } from "socket.io-client";
import { serverUrl } from "../config";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socket = useMemo(() => io(serverUrl, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    auth: { token: localStorage.getItem("token") ?? "" }
  }), []);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const socket = useContext(SocketContext);
  if (!socket) throw new Error("useSocket must be used inside SocketProvider");
  return socket;
}
