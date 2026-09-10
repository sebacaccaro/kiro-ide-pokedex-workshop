# Stack tecnologico

> Nota: lo stack qui sotto è la direzione concordata per il workshop. I comandi
> esatti vanno tenuti allineati man mano che il progetto viene inizializzato.

## Frontend

- **React** + **TypeScript**
- **Vite** come build tool e dev server
- Fetch dei dati dalle [PokéAPI](https://pokeapi.co/) (`https://pokeapi.co/api/v2/`)

## Qualità del codice

- **ESLint** con configurazione **Airbnb** + `airbnb-typescript`
- **Prettier** per la formattazione
- **TypeScript strict**
- Lint a zero warning (`--max-warnings=0`)

## Test

- **Vitest** come test runner (integrazione naturale con Vite)
- **React Testing Library** per i componenti
- Mock delle chiamate di rete nei test unitari (niente rete reale)

## Comandi (convenzione)

Da mantenere allineati con gli script reali in `package.json`:

- `npm run dev` — avvia il dev server (da lanciare manualmente in un terminale)
- `npm run build` — build di produzione
- `npm run test` — esegue i test una volta (usare la modalità `run`, non watch)
- `npm run lint` — esegue ESLint con zero warning
- `npm run typecheck` — `tsc --noEmit`

## Note operative

- I processi long-running (dev server, watcher) vanno avviati manualmente
  dall'utente, non dall'agente.
- Per i test in automazione usare sempre l'esecuzione singola (`run`), mai la
  modalità watch.
