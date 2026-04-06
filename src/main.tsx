import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Game } from './Game';
import './index.css';

new Game();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Le jeu est géré par le canvas dans index.html */}
  </StrictMode>,
);
