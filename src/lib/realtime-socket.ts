import { io, type Socket } from "socket.io-client"

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3000"

let socket: Socket | null = null

export function connectRealtimeSocket(token: string): Socket {
  socket?.disconnect()
  socket = io(SOCKET_URL, { auth: { token } })
  return socket
}

export function disconnectRealtimeSocket(): void {
  socket?.disconnect()
  socket = null
}
