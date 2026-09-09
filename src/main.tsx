import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createPokeApiClient } from './api/pokeApiClient';
import App from './App';
import './themes.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root non trovato');
}

const client = createPokeApiClient();

createRoot(rootElement).render(
  <StrictMode>
    <App client={client} />
  </StrictMode>,
);
