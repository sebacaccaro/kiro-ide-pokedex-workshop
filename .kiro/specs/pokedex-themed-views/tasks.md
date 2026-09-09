# Implementation Plan: pokedex-themed-views

## Overview

Piano di implementazione in **TDD** (Red → Green → Refactor) per le due viste
(Vista_Elenco e Vista_Dettaglio) e il sistema di temi commutabili
(Tema_Rosso / Tema_Diamante), costruito sopra il `Client_PokeAPI` esistente.

Linee guida trasversali valide per tutti i task:

- **TDD per la logica**: ogni pezzo di logica parte da un sotto-task che scrive
  i **test rossi** (falliscono per il motivo giusto), seguito dall'implementazione
  **verde** minima. I sotto-task di test precedono sempre quelli di implementazione.
- **Property test con `fast-check`**: le Correctness Properties del design si
  implementano come property test con **≥ 100 iterazioni**
  (`fc.assert(fc.property(...), { numRuns: 100 })`), una sola property per test,
  con commento tag nel formato
  `// Feature: pokedex-themed-views, Property N: <testo>`.
- **Posizione dei test**: cartelle `__tests__/` accanto al modulo, suffisso
  `.test.ts(x)`.
- **Niente rete reale**: `fetch`/`PokeApiClient` sempre mockati; test deterministici,
  esecuzione single-run (`vitest run`).
- **Confini architetturali**: solo `src/api/` conosce la forma grezza PokéAPI; il
  resto lavora con i tipi di dominio.

Legenda: i sotto-task marcati con `*` sono opzionali (test aggiuntivi ed edge case
non essenziali per un MVP dimostrabile) e NON vengono implementati automaticamente.

## Tasks

- [x] 1. Configurare l'ambiente di test dei componenti
  - Aggiungere alle `devDependencies`: `@testing-library/react`,
    `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`
  - Configurare Vitest in `vite.config.ts` con `test.environment = 'jsdom'`,
    `globals: true` e un file di setup (`src/test/setup.ts`) che importa
    `@testing-library/jest-dom`
  - Verificare che `npm run test` giri con l'ambiente jsdom (nessun test nuovo
    richiesto: task di configurazione, non logica)
  - _Requirements: 9.5_

- [x] 2. Estendere il dominio con lo Sprite_Pokemon (livello api/)
  - [x] 2.1 Scrivere i test rossi per il parsing/mapping dello sprite
    - In `src/api/__tests__/parse.test.ts` e `src/api/__tests__/mappers.test.ts`:
      casi `sprites.front_default` stringa, `null`, campo `sprites` mancante o
      malformato → `spriteUrl` atteso `null` (nessun dominio parziale)
    - _Requirements: 8.1_
  - [x] 2.2 Property test per il mapping dello sprite (fast-check)
    - **Property 10: `spriteUrl` riflette fedelmente `sprites.front_default`**
    - Tag: `// Feature: pokedex-themed-views, Property 10: ...`, `numRuns: 100`
    - File: `src/api/__tests__/mappers.test.ts` (o `parse.test.ts`)
    - _Requirements: 8.1_
  - [x] 2.3 Estendere i tipi raw e il dominio (verde)
    - `src/api/raw.ts`: aggiungere `PokemonSpritesRaw { front_default: string | null }`
      e il campo `sprites` a `PokemonRaw`
    - `src/types/pokemon.ts`: aggiungere `spriteUrl: string | null` a `Pokemon`
    - _Requirements: 8.1_
  - [x] 2.4 Implementare parsing e mapping dello sprite (verde)
    - `src/api/parse.ts`: narrowing difensivo di `sprites.front_default`
      (stringa o `null`, altrimenti `null`)
    - `src/api/mappers.ts`: `mapPokemon` traduce `raw.sprites.front_default` in
      `spriteUrl`
    - _Requirements: 8.1_

- [x] 3. Implementare la logica pura di generazione (lib/generation.ts)
  - [x] 3.1 Scrivere i test rossi per l'estrazione id e il filtro
    - In `src/lib/__tests__/generation.test.ts`: esempi per `extractIdFromUrl`
      (URL valido, URL senza id → `null`), `isFirstGeneration` (bordi 1 e 151,
      0 e 152), `toFirstGenEntries` (scarta id fuori 1..151 e non numerici,
      preserva l'ordine)
    - _Requirements: 1.2, 1.3_
  - [x] 3.2 Implementare `extractIdFromUrl`, `isFirstGeneration`, `toFirstGenEntries` (verde)
    - `src/lib/generation.ts` con `FIRST_GEN_MIN_ID`/`FIRST_GEN_MAX_ID` e i tipi
      `PokemonListEntry`
    - _Requirements: 1.2, 1.3_
  - [x] 3.3 Property test: filtro Prima_Generazione (fast-check)
    - **Property 1: Il filtro Prima_Generazione non produce mai id fuori 1..151**
    - Tag Property 1, `numRuns: 100`, file `src/lib/__tests__/generation.test.ts`
    - _Requirements: 1.2, 1.3_
  - [x] 3.4 Property test: round trip id → url → id (fast-check)
    - **Property 2: L'estrazione dell'id dall'URL è coerente con la ricostruzione**
    - Tag Property 2, `numRuns: 100`
    - _Requirements: 1.2, 1.3_

- [x] 4. Implementare la logica pura dei temi (lib/theme.ts)
  - [x] 4.1 Scrivere i test rossi per la normalizzazione del tema
    - In `src/lib/__tests__/theme.test.ts`: `normalizeThemeName('rosso')`,
      `'diamante'`, valori sconosciuti/non stringa → `DEFAULT_THEME`
    - _Requirements: 5.7_
  - [x] 4.2 Implementare `ThemeName`, `DEFAULT_THEME`, `normalizeThemeName` (verde)
    - `src/lib/theme.ts`
    - _Requirements: 5.7_
  - [x] 4.3 Property test: normalizzazione totale e stabile (fast-check)
    - **Property 12: La normalizzazione del tema persistito è totale e stabile**
    - Tag Property 12, `numRuns: 100`, file `src/lib/__tests__/theme.test.ts`
    - _Requirements: 5.7_

- [x] 5. Implementare l'hook dell'elenco (hooks/usePokemonList.ts)
  - [x] 5.1 Scrivere i test rossi con client mockato
    - In `src/hooks/__tests__/usePokemonList.test.ts` (RTL `renderHook`, client
      mockato): prima chiamata `{limit:20, offset:0}` (1.1); append filtrato in
      coda (1.3); `loadMore` con offset +20 (1.4); `isComplete` a copertura del
      151 (1.5); `isInitialLoading`/`isLoadingMore` (2.1, 2.2); errore primo
      blocco con `category` (2.3); `retry` sullo stesso offset (2.4, 2.5);
      `isEmpty` con blocco senza voci Prima_Generazione (2.6)
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 9.3_
  - [x] 5.2 Implementare `usePokemonList` (verde)
    - `src/hooks/usePokemonList.ts`: fetch incrementale con `list` limit=20 e
      offset crescente, filtro via `lib/generation`, stop a copertura 151,
      gestione errore/retry, guardia sui risultati obsoleti
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 9.3, 9.6_
  - [x] 5.3 Property test: progressione degli offset (fast-check)
    - **Property 3: La progressione degli offset copre il 151 senza salti né ripetizioni**
    - Tag Property 3, `numRuns: 100`, file `src/hooks/__tests__/usePokemonList.test.ts`
    - _Requirements: 1.4, 1.5_
  - [x] 5.4 Property test: crescita per concatenazione filtrata (fast-check)
    - **Property 4: L'elenco cresce per concatenazione filtrata senza rimuovere le voci precedenti**
    - Tag Property 4, `numRuns: 100`
    - _Requirements: 1.3, 2.2_
  - [x] 5.5 Property test: propagazione fedele della categoria d'errore (fast-check)
    - **Property 5: La categoria dell'errore è propagata fedelmente e nessuna eccezione sfugge**
    - Tag Property 5, `numRuns: 100`
    - _Requirements: 2.3, 4.4, 9.6_

- [x] 6. Implementare l'hook del dettaglio (hooks/usePokemonDetail.ts)
  - [x] 6.1 Scrivere i test rossi con client mockato
    - In `src/hooks/__tests__/usePokemonDetail.test.ts`: `get(id)` chiamato (3.1);
      transizioni `isLoading` (4.1, 4.2); `isNotFound` su "risorsa non trovata"
      senza dati parziali (4.3); errore di altra categoria con `category` (4.4);
      `retry` sullo stesso id (4.5)
    - _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 6.2 Implementare `usePokemonDetail` (verde)
    - `src/hooks/usePokemonDetail.ts`: `get(id)`, stato `isLoading`/`error`/
      `isNotFound`/`retry`, guardia sui risultati obsoleti al cambio id/unmount
    - _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4, 4.5, 9.6_
  - [x] 6.3 Property test: propagazione fedele della categoria d'errore (fast-check)
    - **Property 5: La categoria dell'errore è propagata fedelmente e nessuna eccezione sfugge**
    - Tag Property 5, `numRuns: 100`, file `src/hooks/__tests__/usePokemonDetail.test.ts`
    - _Requirements: 4.4, 9.6_

- [x] 7. Checkpoint - Assicurarsi che i test della logica passino
  - Assicurarsi che tutti i test passino; chiedere all'Utente in caso di dubbi.

- [x] 8. Implementare il Gestore_Temi (ThemeProvider + useTheme)
  - [x] 8.1 Scrivere i test rossi con storage mockato
    - In `src/features/__tests__/ThemeProvider.test.tsx` e
      `src/hooks/__tests__/useTheme.test.tsx`: default rosso con storage vuoto
      (5.2); applicazione `data-theme` alla radice al cambio (5.4, 5.5);
      persistenza e ripristino dal `ThemeStorage` (5.6); tema persistito non
      valido → rosso (5.7)
    - _Requirements: 5.2, 5.4, 5.5, 5.6, 5.7_
  - [x] 8.2 Implementare `ThemeProvider`, `ThemeContext` e `useTheme` (verde)
    - `src/features/ThemeProvider.tsx` con `ThemeStorage` iniettabile (default su
      `window.localStorage`), applicazione `data-theme` sulla radice
    - `src/hooks/useTheme.ts` che legge/aggiorna dal Context
    - _Requirements: 5.2, 5.4, 5.5, 5.6, 5.7, 9.4_
  - [x] 8.3 Property test: persistenza del tema come round trip (fast-check)
    - **Property 13: La persistenza del tema è un round trip**
    - Tag Property 13, `numRuns: 100`, file `src/features/__tests__/ThemeProvider.test.tsx`
    - _Requirements: 5.6_

- [x] 9. Implementare il componente di dettaglio (components/PokemonDetail.tsx)
  - [x] 9.1 Scrivere i test rossi con RTL
    - In `src/components/__tests__/PokemonDetail.test.tsx`: presenza di numero,
      nome, altezza, peso, base exp (3.2, 3.3); tipi ordinati per `slot` (3.4);
      abilità elencate (3.5); collezioni vuote senza crash (3.6); comando di
      ritorno che invoca `onBack` (3.7); sprite valorizzato → `<img>` con `src`
      e `alt` = nome (8.2); `spriteUrl === null` → segnaposto (8.3); `onError`
      immagine → segnaposto (8.4); classe stabile `.pokedex-sprite`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.2, 8.3, 8.4_
  - [x] 9.2 Implementare `PokemonDetail` (verde)
    - `src/components/PokemonDetail.tsx`: rende i campi, ordina i tipi per slot,
      gestisce sprite/segnaposto/`onError`, espone `onBack`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.2, 8.3, 8.4_
  - [x] 9.3 Property test: campi scalari nel dettaglio (fast-check)
    - **Property 6: Il dettaglio mostra tutti i campi scalari del Pokémon**
    - Tag Property 6, `numRuns: 100`, file `src/components/__tests__/PokemonDetail.test.tsx`
    - _Requirements: 3.2, 3.3_
  - [x] 9.4 Property test: tipi in ordine di slot (fast-check)
    - **Property 7: I tipi sono resi in ordine di slot crescente**
    - Tag Property 7, `numRuns: 100`
    - _Requirements: 3.4_
  - [x] 9.5 Property test: tutte le abilità compaiono (fast-check)
    - **Property 8: Tutte le abilità del Pokémon compaiono nel dettaglio**
    - Tag Property 8, `numRuns: 100`
    - _Requirements: 3.5_
  - [x] 9.6 Property test: immagine con alt = nome quando sprite valorizzato (fast-check)
    - **Property 11: Con sprite valorizzato il dettaglio rende un'immagine con alt uguale al nome**
    - Tag Property 11, `numRuns: 100`
    - _Requirements: 8.2_

- [x] 10. Implementare i componenti dell'elenco (PokemonListItem, PokemonList)
  - [x] 10.1 Scrivere i test rossi con RTL
    - In `src/components/__tests__/PokemonListItem.test.tsx` e
      `src/components/__tests__/PokemonList.test.tsx`: ogni riga contiene numero,
      nome e tipi nel markup (6.7, 7.4); `onSelect` alla selezione (1.6);
      indicatore di caricamento incrementale in coda (2.2); sentinella che invoca
      `onReachEnd` (1.4); marcatura dell'elemento selezionato per il cursore (6.6)
    - _Requirements: 1.4, 1.6, 2.2, 6.6, 6.7, 7.4_
  - [x] 10.2 Implementare `PokemonListItem` e `PokemonList` (verde)
    - `src/components/PokemonListItem.tsx`: rende sempre numero, nome e tipi;
      marca l'elemento selezionato (`isSelected`)
    - `src/components/PokemonList.tsx`: elenco continuo con sentinella
      `IntersectionObserver` in coda, `LoadingIndicator` incrementale, `onSelect`
    - _Requirements: 1.4, 1.6, 2.2, 6.6, 6.7, 7.4_
  - [x] 10.3 Property test: ogni riga contiene numero, nome e tipi (fast-check)
    - **Property 9: Ogni riga dell'elenco contiene numero, nome e tipi**
    - Tag Property 9, `numRuns: 100`, file `src/components/__tests__/PokemonListItem.test.tsx`
    - _Requirements: 6.7, 7.4_

- [x] 11. Implementare i componenti di stato (ThemeSwitcher, LoadingIndicator, ErrorMessage)
  - [x] 11.1 Scrivere i test rossi con RTL
    - In `src/components/__tests__/`: `ThemeSwitcher` mostra due opzioni e invoca
      `onChange` (5.1, 5.3); `LoadingIndicator` rende un indicatore accessibile;
      `ErrorMessage` mostra la `category` e il comando di retry quando presente
      (2.3, 2.4, 4.4, 4.5)
    - _Requirements: 2.3, 2.4, 4.4, 4.5, 5.1, 5.3_
  - [x] 11.2 Implementare `ThemeSwitcher`, `LoadingIndicator`, `ErrorMessage` (verde)
    - `src/components/ThemeSwitcher.tsx`, `src/components/LoadingIndicator.tsx`,
      `src/components/ErrorMessage.tsx`
    - _Requirements: 2.3, 2.4, 4.4, 4.5, 5.1, 5.3_

- [x] 12. Checkpoint - Assicurarsi che i test dei componenti passino
  - Assicurarsi che tutti i test passino; chiedere all'Utente in caso di dubbi.

- [x] 13. Comporre le viste (PokemonListView, PokemonDetailView)
  - [x] 13.1 Scrivere i test rossi con RTL e client mockato
    - In `src/features/__tests__/PokemonListView.test.tsx`: Stato_Caricamento
      iniziale (2.1), errore con retry (2.3, 2.4), Stato_Vuoto (2.6), selezione
      che invoca `onSelect` (1.6)
    - In `src/features/__tests__/PokemonDetailView.test.tsx`: caricamento (4.1,
      4.2), not-found (4.3), errore con retry (4.4, 4.5), ritorno `onBack` (3.7)
    - _Requirements: 1.6, 2.1, 2.3, 2.4, 2.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 13.2 Implementare `PokemonListView` e `PokemonDetailView` (verde)
    - `src/features/PokemonListView.tsx`: collega `usePokemonList` a `PokemonList`,
      sceglie tra LoadingIndicator/ErrorMessage/Stato_Vuoto/dati
    - `src/features/PokemonDetailView.tsx`: collega `usePokemonDetail` a
      `PokemonDetail`, sceglie tra LoadingIndicator/ErrorMessage/not-found/dati
    - _Requirements: 1.6, 2.1, 2.3, 2.4, 2.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 14. Implementare il CSS dei due temi
  - [x] 14.1 Scrivere il test rosso mirato sul contrasto WCAG del Tema_Rosso
    - In `src/lib/__tests__/contrast.test.ts` (o accanto al modulo colori): una
      funzione pura di calcolo del rapporto di contrasto verifica che
      `#0F380F` su `#9BBC0F` sia ≥ 4.5:1
    - _Requirements: 6.2_
  - [x] 14.2 Definire le CSS custom properties dei temi via `data-theme` (verde)
    - `[data-theme='rosso']`: palette a 4 tonalità, testo `#0F380F` su sfondo
      `#9BBC0F`, font pixel + fallback monospazio, bordo 2-4px, raggio 0px,
      `--sprite-filter` duotone (6.1, 6.2, 6.3, 6.4, 6.5, 8.5)
    - `[data-theme='diamante']`: palette a colori pieni con dominante blu, raggio
      8-16px, font antialiasato ≥14px, `--sprite-filter: none` (7.1, 7.2, 7.3, 8.6)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 8.5, 8.6_
  - [x] 14.3 Implementare cursore freccia (Rosso) e visibilità dei tipi per tema (verde)
    - Pseudo-elemento cursore a freccia sull'elemento selezionato solo in
      `[data-theme='rosso']` (6.6); in Rosso nascondere i tipi mantenendo
      "numero nome" (6.7), in Diamante mostrarli (7.4)
    - _Requirements: 6.6, 6.7, 7.4_

- [x] 15. Wiring dell'applicazione (App)
  - [x] 15.1 Scrivere i test rossi con RTL
    - In `src/__tests__/App.test.tsx`: navigazione state-based elenco → dettaglio
      alla selezione (1.6) e ritorno dettaglio → elenco (3.7); `ThemeProvider`
      avvolge entrambe le viste; il `Client_PokeAPI` è iniettato/mockato
    - _Requirements: 1.6, 3.7, 5.5_
  - [x] 15.2 Implementare il wiring in `App` (verde)
    - `src/App.tsx`: stato `Route` discriminato (`list` / `detail` con id),
      `ThemeProvider` a monte di entrambe le viste, iniezione del client PokéAPI,
      `ThemeSwitcher` collegato a `useTheme`
    - _Requirements: 1.6, 3.7, 5.5_

- [x] 16. Checkpoint finale - Qualità e aggiornamento README
  - Eseguire `npm run test` (tutti verdi), `npm run typecheck` e `npm run lint`
    (zero warning); correggere eventuali problemi
  - Aggiornare il `README.md` (tutorial del workshop) con lo step della feature:
    snippet, comandi, prompt d'esempio e crediti stimati, come da convenzione dello
    steering del README
  - Assicurarsi che tutti i test passino; chiedere all'Utente in caso di dubbi.

## Notes

- I sotto-task marcati con `*` sono opzionali (property test ed edge case
  aggiuntivi) e possono essere saltati per un MVP più rapido; NON vengono
  implementati automaticamente.
- Ogni sotto-task di logica segue il ciclo TDD: prima i test rossi, poi
  l'implementazione verde; la history dei commit deve riflettere "test rossi" →
  "implementazione verde".
- Tutti i property test usano `fast-check` con ≥ 100 iterazioni e il tag
  `Feature: pokedex-themed-views, Property N: ...`, una sola property per test.
- I criteri estetici dei temi (6.1-6.5, 7.1-7.3, 8.5, 8.6) sono coperti da test di
  esempio/snapshot e da un test mirato sul contrasto WCAG (6.2), non da PBT.
- I confini architetturali (9.1, 9.2) si mantengono per costruzione: hook e viste
  ricevono solo tipi di dominio; nessun tipo Raw fuori da `api/`.
- Ogni task referenzia i requisiti che copre per la tracciabilità.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2.1", "3.1", "4.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.2", "4.2", "14.1"] },
    { "id": 2, "tasks": ["2.4", "3.3", "3.4", "4.3"] },
    { "id": 3, "tasks": ["5.1", "6.1", "8.1", "9.1", "10.1", "11.1"] },
    { "id": 4, "tasks": ["5.2", "6.2", "8.2", "9.2", "10.2", "11.2", "14.2"] },
    { "id": 5, "tasks": ["5.3", "5.4", "5.5", "6.3", "8.3", "9.3", "9.4", "9.5", "9.6", "10.3", "14.3"] },
    { "id": 6, "tasks": ["13.1"] },
    { "id": 7, "tasks": ["13.2"] },
    { "id": 8, "tasks": ["15.1"] },
    { "id": 9, "tasks": ["15.2"] }
  ]
}
```
