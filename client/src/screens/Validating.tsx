import { Hex } from '../components';

export function Validating() {
  return (
    <div className="validating" role="status">
      <Hex big spinning>IA</Hex>
      <p className="stage-title">A IA está julgando…</p>
    </div>
  );
}
