import { io, type Socket } from 'socket.io-client';
import type { ClientToServer, ServerToClient } from '../../shared/types';

export const socket: Socket<ServerToClient, ClientToServer> = io();
