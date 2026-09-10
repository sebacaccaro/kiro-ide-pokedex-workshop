# Implementation Plan: Pokémon Capture Toggle

## Overview

Piano di implementazione in **TDD** (ciclo Red → Green → Refactor) per la
funzionalità di cattura dei Pokémon: pulsante Poké Ball nell'Elenco, animazione
di cattura, persistenza locale iniettabile, Descrizione_Pokedex nel Dettaglio e
adattamento al tema.

Ordinamento: per ogni modulo di **logica** i test che falliscono ("rossi")
vengono scritti prima dell'implementazione minima che li fa passare ("verdi"),
come da workflow TDD del progetto. Si parte dal core puro (`lib/captures.ts`),
si sale al confine di rete (`api/`), poi stato/persistenza, presentazione e
infine il wiring nell'app. Il puro CSS/tema non richiede test scritti prima.

Stack: React + TypeScript strict, stile Airbnb (`--max-warnings=0`), Vitest in
modalità `run`, React Testing Library + `@testing-library/user-event`,
`fast-check` (>= 100 iterazioni) per le proprietà, rete mockata, fake timers per
l'animazione. I test vivono in cartelle `__tests__/` con suffisso `.test.ts(x)`.

## Tasks

- [x] 1. Core puro del Gestore_Catture (`src/lib/captures.ts`) — TDD
  - [x] 1.1 (Red) Scrivere i test unitari a esempio per il core catture
    - Creare `src/lib/__tests__/captures.test.ts` con casi che descrivono il
      comportamento atteso e che **falliscono** (modulo non ancora esistente):
      `isValidCaptureId` (interi >= 1 veri; `0`, negativi, non interi, `NaN`
      falsi), `emptyCaptureSet` vuoto, `capture`/`uncapture`/`isCaptured`,
      `serializeCaptureSet` restituisce array ordinato di id.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 7.7_
  - [x]* 1.2 (Red) Scrivere i property test per il core catture
    - Creare/estendere `src/lib/__tests__/captures.test.ts` con `fast-check`
      (`{ numRuns: 100 }`), commento tag per ciascuna proprietà nel formato
      "Feature: pokemon-capture-toggle, Property N: ...":
    - **Property 1: La cattura rende catturato; il set vuoto non cattura nulla** — _Validates: Requirements 7.1, 7.3, 7.4_
    - **Property 2: L'annullamento rende non catturato** — _Validates: Requirements 7.2, 7.3_
    - **Property 3: Idempotenza della cattura (OBBLIGATORIA property-based)** — _Validates: Requirements 7.5, 2.5_
    - **Property 4: Annullamento di un id assente è no-op** — _Validates: Requirements 7.6_
    - **Property 5: Gli id non validi lasciano l'insieme invariato** — _Validates: Requirements 7.7_
    - **Property 6: Round-trip di persistenza delle catture** — _Validates: Requirements 3.3, 4.1, 4.2_
    - **Property 7: Normalizzazione difensiva dell'insieme persistito** — _Validates: Requirements 4.4_
  - [x] 1.3 (Green) Implementare `src/lib/captures.ts` con il minimo per far passare i test
    - `CaptureSet`, `isValidCaptureId`, `emptyCaptureSet`, `capture`,
      `uncapture`, `isCaptured`, `normalizeCaptureSet`, `serializeCaptureSet`
      come funzioni pure e immutabili; nessun accesso a DOM/storage/rete.
    - Rendere verdi 1.1 e 1.2, quindi rifattorizzare mantenendo i test verdi.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 4.4_

- [x] 2. Checkpoint — core catture verde
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Confine di rete: Descrizione_Pokedex in `src/api/` — TDD
  - [x] 3.1 Aggiungere i tipi di dominio e Raw
    - In `src/types/pokemon.ts`: `PokemonSpecies` (`id`, `flavorText`).
    - In `src/api/raw.ts`: `FlavorTextEntryRaw`, `PokemonSpeciesRaw` (solo campi
      consumati); nessuna esposizione fuori da `api/`.
    - _Requirements: 5.7_
  - [x] 3.2 (Red) Scrivere i test di parsing species
    - Estendere `src/api/__tests__/parse.test.ts`: `parsePokemonSpeciesRaw`
      ritorna la forma tipizzata su corpo conforme e `null` su corpo non
      conforme (mancano campi, tipi errati). Devono fallire (funzione assente).
    - _Requirements: 5.1, 5.7_
  - [x] 3.3 (Green) Implementare `parsePokemonSpeciesRaw` in `src/api/parse.ts`
    - Narrowing difensivo senza `any`; `null` se non conforme. Rende verdi 3.2.
    - _Requirements: 5.1, 5.7_
  - [x]* 3.4 (Red) Scrivere il property test per il mapping del flavor text
    - Estendere `src/api/__tests__/mappers.test.ts` con `fast-check`
      (`{ numRuns: 100 }`), commento tag:
    - **Property 8: Selezione e normalizzazione del flavor text** — _Validates: Requirements 5.2, 5.6, 5.7_
  - [x]* 3.5 (Red) Scrivere i test a esempio per il mapping species
    - Estendere `src/api/__tests__/mappers.test.ts`: preferenza voce `en`,
      normalizzazione spazi/a-capo, fallback prima voce, stringa vuota se nessun
      testo. Devono fallire (mapper assente).
    - _Requirements: 5.2, 5.6, 5.7_
  - [x] 3.6 (Green) Implementare `mapPokemonSpecies` in `src/api/mappers.ts`
    - Selezione deterministica (prima voce `en`, poi prima disponibile),
      normalizzazione spazi, fallback a stringa vuota. Rende verdi 3.4 e 3.5.
    - _Requirements: 5.2, 5.6, 5.7_
  - [x] 3.7 (Red) Scrivere i test del client `getSpecies`
    - Estendere `src/api/__tests__/pokeApiClient.test.ts` con rete mockata:
      200 → dominio `PokemonSpecies`; 404 → `risorsa non trovata`; timeout/rete
      → `errore di rete`; corpo non conforme → `risposta HTTP non valida`.
      Devono fallire (metodo assente).
    - _Requirements: 5.1, 5.5, 5.7_
  - [x] 3.8 (Green) Implementare `getSpecies(id)` in `src/api/pokeApiClient.ts`
    - Riusa `validateIdentifier`, `fetchWithTimeout`, mappa stati HTTP ed errori
      esistenti; costruisce l'URL `pokemon-species/{id}`; ritorna `Result<PokemonSpecies>`.
      Rende verdi 3.7.
    - _Requirements: 5.1, 5.5, 5.7_

- [x] 4. Checkpoint — confine di rete species verde
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Stato + persistenza: Store_Catture e `useCaptures` — TDD
  - [x] 5.1 (Red) Scrivere i test di CaptureProvider/useCaptures
    - Creare `src/features/__tests__/CaptureProvider.test.tsx` con
      `CaptureStorage` iniettato (fake): lettura+normalizzazione all'avvio
      (assente/JSON non valido/array non conforme → vuoto; `read()` che solleva
      → vuoto); `capture`/`uncapture` aggiornano lo stato e scrivono con la
      Chiave_Persistenza `'pokedex-captures'`; `write()` che solleva →
      `hasPersistError=true` e stato in memoria aggiornato; `useCaptures` fuori
      dal provider lancia errore. Devono fallire (moduli assenti).
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 7.1, 7.2, 7.3_
  - [x] 5.2 (Green) Implementare `src/features/CaptureProvider.tsx`
    - Context + adapter `CaptureStorage` iniettabile (default su
      `window.localStorage`), Chiave_Persistenza `'pokedex-captures'`, init
      difensivo con `normalizeCaptureSet`, scrittura con `serializeCaptureSet` +
      `JSON.stringify`, `hasPersistError` su fallimento scrittura. Rende verdi 5.1.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  - [x] 5.3 (Green) Implementare `src/hooks/useCaptures.ts`
    - Legge il `CaptureContext`; lancia un errore se usato fuori dal provider
      (pattern `useTheme`). Rende verdi la parte di 5.1 relativa all'hook.
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 6. Hook di fetch della Descrizione_Pokedex (`src/hooks/usePokemonSpecies.ts`) — TDD
  - [x] 6.1 (Red) Scrivere i test di `usePokemonSpecies`
    - Creare `src/hooks/__tests__/usePokemonSpecies.test.ts` con client mockato:
      un solo fetch per id; `enabled=false` non richiede nulla e non espone
      caricamento; stati loading/data/error; scarto dei risultati obsoleti al
      cambio id/unmount. Devono fallire (hook assente).
    - _Requirements: 5.1, 5.3, 5.4, 5.5_
  - [x] 6.2 (Green) Implementare `src/hooks/usePokemonSpecies.ts`
    - Ricalca `usePokemonDetail`: fetch singolo per id, `enabled` gating,
      `isLoading`/`error`/`species`, cleanup obsoleti. Rende verdi 6.1.
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

- [x] 7. Checkpoint — stato, persistenza e fetch species verdi
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Presentazione: Toggle_Cattura (`src/components/CaptureToggle.tsx`) — TDD
  - [x] 8.1 (Red) Scrivere i test a esempio del Toggle_Cattura (animazione, busy, tastiera)
    - Creare `src/components/__tests__/CaptureToggle.test.tsx` con RTL +
      `user-event` e **fake timers**: attivazione da non catturato avvia
      l'animazione (`data-animating`) entro 100ms e chiama `onCapture` al
      termine; attivazioni durante busy ignorate; su già catturato chiama subito
      `onUncapture` senza animazione; parità Enter/Spazio vs click; `aria-busy`
      durante l'animazione. Devono fallire (componente assente).
    - _Requirements: 1.5, 1.6, 2.1, 2.2, 2.4, 2.5, 3.1_
  - [x]* 8.2 (Red) Scrivere i property test di rendering del Toggle_Cattura
    - Estendere `src/components/__tests__/CaptureToggle.test.tsx` con
      `fast-check` (`{ numRuns: 100 }`), commento tag:
    - **Property 9: Il Toggle_Cattura riflette lo Stato_Catturato (`data-captured`)** — _Validates: Requirements 1.2, 1.3, 2.3, 3.2_
    - **Property 10: Il nome accessibile riflette nome e stato** — _Validates: Requirements 1.4_
  - [x] 8.3 (Green) Implementare `src/components/CaptureToggle.tsx`
    - `<button type="button">` con classe `capture-toggle`, `data-captured`,
      `data-animating`, `aria-busy`, `aria-label` che riflette azione+stato;
      timer `animationMs` (default 700); `stopPropagation` per non aprire il
      dettaglio; nessuna dipendenza JS dal tema. Rende verdi 8.1 e 8.2.
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2_

- [x] 9. Integrazione del Toggle nell'Elenco
  - [x] 9.1 (Red) Estendere i test di PokemonListItem/PokemonList per il Toggle
    - In `src/components/__tests__/PokemonListItem.test.tsx` (e `PokemonList.test.tsx`
      se necessario): il Toggle è reso alla destra della voce; il suo click non
      propaga la selezione (`onSelect` non chiamato); riceve `isCaptured`/
      `onCapture`/`onUncapture`. Devono fallire (nuove props/markup assenti).
    - _Requirements: 1.1, 1.6_
  - [x] 9.2 (Green) Aggiornare `PokemonListItem` e `PokemonList`
    - Aggiungere le props del Toggle e renderlo dopo i metadati; cablare i
      comandi dalla Vista_Elenco/`useCaptures`. Rende verdi 9.1.
    - _Requirements: 1.1, 1.6_
  - [x] 9.3 (Green) Cablare `useCaptures` nella `PokemonListView`
    - Passare `isCaptured`/`capture`/`uncapture` a ogni voce; aggiornare
      `src/features/__tests__/PokemonListView.test.tsx` di conseguenza.
    - _Requirements: 1.1, 1.6, 2.3, 3.2_

- [x] 10. Integrazione della Descrizione_Pokedex nel Dettaglio
  - [x] 10.1 (Red) Scrivere i test del componente di presentazione species
    - In `src/components/__tests__/PokemonDetail.test.tsx` (o nuovo
      `PokemonSpeciesText.test.tsx`): loading → indicatore; successo testo non
      vuoto → testo; testo vuoto → "descrizione non disponibile"; errore →
      categoria dell'errore senza loader; i restanti dettagli restano visibili.
      Devono fallire.
    - _Requirements: 5.2, 5.4, 5.5, 5.6_
  - [x] 10.2 (Green) Implementare la presentazione della Descrizione_Pokedex
    - Componente `PokemonSpeciesText` (o sezione in `PokemonDetail`) con i branch
      loading/testo/vuoto/errore, mantenendo visibili i dettagli. Rende verdi 10.1.
    - _Requirements: 5.2, 5.4, 5.5, 5.6_
  - [x] 10.3 (Red) Estendere i test di PokemonDetailView per il gating della richiesta
    - In `src/features/__tests__/PokemonDetailView.test.tsx`: catturato → una
      sola richiesta species; non catturato → nessuna richiesta e nessuna
      sezione descrizione. Devono fallire.
    - _Requirements: 5.1, 5.3_
  - [x] 10.4 (Green) Cablare `usePokemonSpecies` + `useCaptures` in `PokemonDetailView`
    - `enabled` solo se catturato; passare loading/error/text alla presentazione.
      Rende verdi 10.3.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 11. Checkpoint — presentazione e integrazioni verdi
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Aspetto per tema (CSS) e wiring finale
  - [x] 12.1 Definire l'aspetto di Poké Ball e Animazione_Cattura via CSS
    - Stili guidati da `data-theme` (Tema_Rosso / Tema_Diamante), opacità 0,4/1,0
      su `data-captured`, keyframe animazione su `data-animating`, transizioni
      entro le soglie previste; fallback a `rosso`. Puro CSS/presentazione.
    - _Requirements: 1.2, 1.3, 3.2, 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 12.2 (Red) Scrivere il test di wiring del CaptureProvider in App
    - Estendere `src/__tests__/App.test.tsx`: l'app è avvolta dal
      `CaptureProvider` così Elenco e Dettaglio condividono lo stesso
      Gestore_Catture (una cattura fatta nell'Elenco è visibile nel Dettaglio).
      Deve fallire (provider non ancora cablato).
    - _Requirements: 4.7_
  - [x] 12.3 (Green) Cablare `CaptureProvider` in `src/App.tsx`
    - Avvolgere l'app (accanto/dentro `ThemeProvider`). Rende verde 12.2.
    - _Requirements: 4.7_

- [x] 13. Checkpoint finale — tutti i test verdi
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Aggiornare il README (convenzione workshop)
  - Aggiungere/aggiornare lo step del workshop per questa feature nel `README.md`:
    obiettivo, cosa mostra di Kiro (spec-driven + steering + hooks), istruzioni
    pratiche con snippet/comandi copiabili, comandi di test (`npm run test`,
    `npm run lint`, `npm run typecheck`) e i **crediti stimati** dello step con
    aggiornamento del **totale cumulativo**.

## Notes

- Ordinamento **TDD**: i task "(Red)" scrivono test che devono fallire; i task
  "(Green)" implementano il minimo per farli passare, poi si rifattorizza a test
  verdi. La history mostra il ciclo (commit "test rossi" → commit "verde").
- I task marcati con `*` sono i property test: opzionali per un MVP rapido, ma
  la **Property 3 (idempotenza)** è obbligatoria come property-based test.
- Ogni task referenzia i requisiti/proprietà per la tracciabilità.
- La rete è sempre mockata; l'animazione si testa con fake timers.
- Il CSS per tema (task 12.1) è pura presentazione: si valida visivamente nel
  workshop, non con test scritti prima.
- Definition of Done per ogni cambiamento: `lint` a zero warning, `typecheck`
  (`tsc --noEmit`) e test verdi.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "3.1"] },
    { "id": 1, "tasks": ["1.3", "3.2", "3.4", "3.5", "3.7"] },
    { "id": 2, "tasks": ["3.3", "3.6", "3.8", "5.1", "8.1", "8.2"] },
    { "id": 3, "tasks": ["5.2", "8.3", "9.1", "10.1"] },
    { "id": 4, "tasks": ["5.3", "6.1", "9.2", "10.2", "10.3"] },
    { "id": 5, "tasks": ["6.2", "9.3", "10.4", "12.1", "12.2"] },
    { "id": 6, "tasks": ["12.3"] }
  ]
}
```
