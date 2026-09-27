import { Home } from './screens/Home';
import { Shell } from './Shell';
import { useRoom } from './useRoom';

export function App() {
  const room = useRoom();
  if (!room.view) return <Home error={room.error} onCreate={room.create} onJoin={room.join} />;
  return <Shell view={room.view} offset={room.offset} onLeave={room.leave} />;
}
