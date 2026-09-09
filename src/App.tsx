import { useCallback, useState, type ReactElement } from 'react';

import type { PokeApiClient } from './api/pokeApiClient';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { PokemonDetailView } from './features/PokemonDetailView';
import { PokemonListView } from './features/PokemonListView';
import { ThemeProvider } from './features/ThemeProvider';
import { useTheme } from './hooks/useTheme';

// Wiring dell'Applicazione: naviga tra Vista_Elenco e Vista_Dettaglio con uno
// stato `Route` discriminato (nessun router: due sole viste, nessun deep-link),
// avvolge entrambe le viste con il `ThemeProvider` (così il tema si applica a
// entrambe, Req 5.5) e inietta il `Client_PokeAPI` propagandolo alle viste.
// _Requirements: 1.6, 3.7, 5.5_

export interface AppProps {
  /** Client PokéAPI iniettato e propagato alle viste (unico confine di rete). */
  readonly client: PokeApiClient;
}

/** Vista corrente dell'Applicazione (navigazione state-based). */
type Route =
  { readonly view: 'list' } | { readonly view: 'detail'; readonly id: number };

/** Selettore_Tema collegato al Gestore_Temi via `useTheme` (Req 5.3, 5.4). */
function ThemeControls(): ReactElement {
  const { theme, setTheme } = useTheme();
  return <ThemeSwitcher theme={theme} onChange={setTheme} />;
}

function App({ client }: AppProps): ReactElement {
  const [route, setRoute] = useState<Route>({ view: 'list' });

  // Selezione in Vista_Elenco → Vista_Dettaglio con l'id scelto (Req 1.6).
  const handleSelect = useCallback((id: number): void => {
    setRoute({ view: 'detail', id });
  }, []);

  // Comando di ritorno dal dettaglio → Vista_Elenco (Req 3.7).
  const handleBack = useCallback((): void => {
    setRoute({ view: 'list' });
  }, []);

  return (
    <ThemeProvider>
      <main className="pokedex-app">
        {/* Scocca del dispositivo Pokédex: decorativa, valorizzata dal tema.
            Nel Tema_Rosso disegna la lente blu, le luci e il retino dello
            speaker; nel Tema_Diamante resta neutra (barra superiore). */}
        <div className="pokedex-device">
          <div className="pokedex-device__top" aria-hidden="true">
            <span className="pokedex-lens" />
            <span className="pokedex-led pokedex-led--red" />
            <span className="pokedex-led pokedex-led--yellow" />
            <span className="pokedex-led pokedex-led--green" />
          </div>

          <div className="pokedex-device__body">
            <header className="pokedex-header">
              <span className="pokedex-title">Pokédex</span>
              <ThemeControls />
            </header>

            <div className="pokedex-screen">
              {route.view === 'list' ? (
                <PokemonListView client={client} onSelect={handleSelect} />
              ) : (
                <PokemonDetailView
                  client={client}
                  id={route.id}
                  onBack={handleBack}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </ThemeProvider>
  );
}

export default App;
