import { Hex } from '../components';

export function Drawing({ letter }: { letter: string }) {
  return (
    <div className="drawing">
      <Hex big>{letter}</Hex>
      <p className="stage-title">Letra sorteada!</p>
    </div>
  );
}
