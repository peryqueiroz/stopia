import { useEffect, useState } from 'react';

/** Milissegundos até `endsAt` (relógio do servidor), atualizado a cada 200ms. */
export function useCountdown(endsAt: number | null, offset: number): number {
  const calc = () => (endsAt === null ? 0 : Math.max(0, endsAt - (Date.now() + offset)));
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    if (endsAt === null) return;
    const id = setInterval(() => setLeft(calc()), 200);
    return () => clearInterval(id);
  }, [endsAt, offset]);
  return left;
}
