import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) return socket;

  socket = io('/', {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect',    () => console.log('[socket] Connected:', socket.id));
  socket.on('disconnect', (reason) => console.log('[socket] Disconnected:', reason));
  socket.on('connect_error', (err) => console.warn('[socket] Connection error:', err.message));

  return socket;
};

export const getSocket    = () => socket;
export const disconnectSocket = () => { socket?.disconnect(); socket = null; };
