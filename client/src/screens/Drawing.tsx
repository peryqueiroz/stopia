import { useEffect, useState } from 'react';
import { Hex } from '../components';
import { sfx } from '../sounds';

/** Roleta: troca letras cada vez mais devagar (~3,3s) até parar na sorteada pelo servidor. */
export function Drawing({ letter, letters }: { letter: string; letters: string[] }) {
  const pool = letters.join('');
  const [shown, setShown] = useState(() => letters[0] ?? letter);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const land = () => {
      setShown(letter);
      setDone(true);
      sfx.draw();
    };
    if (pool.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return land();

    let delay = 60;
    let timer: ReturnType<typeof setTimeout>;
    const spin = () => {
      if (delay > 450) return land();
      setShown((prev) => {
        const options = [...pool].filter((l) => l !== prev);
        return options[Math.floor(Math.random() * options.length)];
      });
      sfx.roll();
      delay *= 1.12;
      timer = setTimeout(spin, delay);
    };
    spin();
    return () => clearTimeout(timer);
  }, [letter, pool]);

  return (
    <div className="drawing">
      <Hex big key={done ? 'done' : 'spin'}>
        {shown}
      </Hex>
      <p className="stage-title" aria-live="polite">
        {done ? `Letra sorteada: ${letter}!` : 'Sorteando…'}
      </p>
    </div>
  );
}
