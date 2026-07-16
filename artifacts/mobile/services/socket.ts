import { io, Socket } from "socket.io-client";

import { API_BASE_URL } from "@/constants/config";
import { getAuthToken } from "@/services/apiClient";

/**
 * One Socket.IO connection for the whole app. Screens/contexts subscribe to its
 * events rather than opening their own sockets. The connection shares the REST
 * origin and authenticates with the same worker JWT (sent in the handshake).
 */
let socket: Socket | null = null;

/**
 * Open (or reuse) the singleton socket. Returns null when there's no worker
 * token yet — callers should only connect once logged in. Uses the in-memory
 * token from the API client (already loaded at auth bootstrap), so this stays
 * synchronous and consistent with REST auth.
 */
export function connectSocket(): Socket | null {
  const token = getAuthToken();
  if (!token) return null;

  // Reuse an existing socket if it's connected or mid-(re)connect.
  if (socket && (socket.connected || socket.active)) return socket;

  // Tear down a stale instance before creating a fresh one.
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket"], // skip the long-poll upgrade on mobile
    reconnection: true, // auto-reconnect on network drop
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
