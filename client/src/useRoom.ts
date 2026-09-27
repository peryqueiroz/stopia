import { useEffect, useState } from 'react';
import type { RoomView } from '../../shared/types';
import { loadSession, saveSession } from './session';
import { socket } from './socket';

export function useRoom() {
  const [view, setView] = useState<RoomView | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const onState = (v: RoomView) => {
      setView(v);
      setOffset(v.serverNow - Date.now());
    };
    const rejoin = () => {
      const s = loadSession();
      if (!s) return;
      socket.emit('room:join', { code: s.code, name: s.name, password: '', playerId: s.playerId }, (r) => {
        if (r.ok) saveSession({ ...s, code: r.code, playerId: r.playerId });
        else saveSession(null);
      });
    };
    socket.on('room:state', onState);
    socket.on('connect', rejoin);
    if (socket.connected) rejoin();
    return () => {
      socket.off('room:state', onState);
      socket.off('connect', rejoin);
    };
  }, []);

  const create = (name: string) =>
    new Promise<void>((resolve) => {
      setError('');
      socket.emit('room:create', { name }, (r) => {
        if (r.ok) saveSession({ code: r.code, playerId: r.playerId, name });
        else setError(r.error);
        resolve();
      });
    });

  const join = (code: string, name: string, password: string) =>
    new Promise<void>((resolve) => {
      setError('');
      socket.emit('room:join', { code, name, password }, (r) => {
        if (r.ok) saveSession({ code: r.code, playerId: r.playerId, name });
        else setError(r.error);
        resolve();
      });
    });

  const leave = () => {
    socket.emit('room:leave');
    saveSession(null);
    setView(null);
    history.replaceState(null, '', '/');
  };

  return { view, offset, error, create, join, leave };
}
