# Implementation Plan: Client PokéAPI

## Overview

Il piano implementa il client PokéAPI confinato in `src/api/`, seguendo il
design e lo steering `workflow-tdd.md`: per ogni pezzo di logica prima il test
che fallisce (commit "test rossi"), poi l'implementazione minima che lo fa
passare (commit "implementazione verde"), infine il refactor a test verdi.

I moduli sono sviluppati dal basso verso l'alto e infine cablati insieme nel
client: `errors.ts` (Result/tipi errore) → tipi di dominio → `url.ts` →
`validation.ts` → `raw.ts`/`parse.ts` → `mappers.ts` → `pokeApiClient.ts`.

Vincoli operativi:

- Test con **Vitest** in esecuzione singola (`vitest run`), mai watch in
  automazione. I processi long-running (dev server, watcher) li avvia
  manualmente l'utente.
- Property test con **fast-check**: almeno 100 iterazioni
  (`fc.assert(..., { numRuns: 100 })`) e tag in commento
  **Feature: pokeapi-client, Property N: ...**.
- Niente rete reale negli unit test: `fetch` è iniettata e mockata.
- TypeScript strict, niente `any`, lint a zero warning (`--max-warnings=0`).
- Test accanto al codice con suffisso `.test.ts`; `src/api/` è l'unico confine
  di rete; tipi di dominio in `src/types/`.

## Tasks

- [x] 1. Setup degli strumenti di test e degli script npm
  - Installare `vitest` e `fast-check` come devDependencies
  - Creare la configurazione di Vitest (ambiente `node`, globals) allineata a Vite
  - Aggiungere/allineare gli script in `package.json`: `test` (`vitest run`),
    `lint` (`eslint . --max-warnings=0`), `typecheck` (`tsc --noEmit` o `tsc -b`)
  - Aggiungere un test "smoke" minimo che verifica che Vitest e fast-check
    girino (`vitest run` verde), poi rimuoverlo o sostituirlo dai test reali
  - _Requirements: 6.1_

- [x] 2. Modello degli errori e Result (fondamenta condivise)
  - [x] 2.1 Scrivere i test rossi per errors.ts
    - In `src/api/errors.test.ts`: test che descrivono la forma del `Result`
      discriminato (`ok:true`/`ok:false`), l'insieme delle categorie ammesse e
      che `PokeApiConfigError` è una sottoclasse di `Error`
    - Verificare che i test falliscano perché il modulo non esiste ancora
    - _Requirements: 4.5, 3.4_
  - [x] 2.2 Implementare errors.ts (verde)
    - Definire `PokeApiErrorCategory`, `PokeApiError`, `Result<T, E>` e la classe
      `PokeApiConfigError` come da design
    - _Requirements: 4.5, 4.6, 4.7, 3.4_

- [x] 3. Tipi di dominio
  - [x] 3.1 Definire i tipi di dominio in src/types/pokemon.ts
    - Definire `PokemonAbility`, `PokemonType`, `Pokemon`, `ResourceReference`,
      `PokemonListPage` (camelCase, `readonly`) come da design
    - Puro codice di tipi: nessun test dedicato, la correttezza è garantita da
      `tsc --noEmit` e dal loro uso nei mapper
    - _Requirements: 5.2, 5.4_

- [x] 4. Composizione URL (funzioni pure)
  - [x] 4.1 Scrivere i test rossi per url.ts
    - In `src/api/url.test.ts`: unit test di esempio per `buildUrl` (separatore
      singolo con/ senza `/` finale e iniziale) e `buildQuery` (serializzazione
      ordinata e deterministica)
    - Verificare che falliscano (modulo assente)
    - _Requirements: 3.3, 2.1_
  - [x] 4.2 Implementare url.ts (verde)
    - Implementare `buildUrl(baseUrl, ...segments)` e `buildQuery(params)`
    - _Requirements: 3.3, 2.1_
  - [x] 4.3 Property test: composizione URL con separatore singolo
    - **Property 1: Composizione URL con separatore singolo**
    - **Validates: Requirements 3.3**
    - Generatori `validBaseUrl` e sequenze di segmenti con/senza slash; almeno
      100 iterazioni; tag `Feature: pokeapi-client, Property 1`

- [x] 5. Validazione dei parametri (funzioni pure)
  - [x] 5.1 Scrivere i test rossi per validation.ts
    - In `src/api/validation.test.ts`: unit test di esempio per
      `validateIdentifier` (intero 1..100000, stringa 1..100 normalizzata in
      minuscolo, casi non validi), `validatePagination` (default 20/0, range,
      casi non validi) e `isValidBaseUrl` (http/https con host vs vuoti/spazi/
      senza schema/senza host)
    - Verificare che falliscano
    - _Requirements: 1.1, 1.2, 1.5, 2.4, 2.5, 3.4_
  - [x] 5.2 Implementare validation.ts (verde)
    - Implementare `validateIdentifier`, `validatePagination`, `isValidBaseUrl`
      restituendo `Result`/booleano come da design
    - _Requirements: 1.1, 1.2, 1.5, 2.4, 2.5, 3.4_

- [x] 6. Checkpoint - Assicurarsi che tutti i test passino
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Tipi Raw e parsing/narrowing difensivo
  - [x] 7.1 Definire i tipi Raw in src/api/raw.ts
    - Definire `PokemonRaw`, `AbilityEntryRaw`, `TypeEntryRaw`,
      `ResourceReferenceRaw`, `PokemonListPageRaw` (snake_case, non esportati
      fuori da `src/api/`)
    - Puro codice di tipi: nessun test dedicato
    - _Requirements: 5.1, 5.3_
  - [x] 7.2 Scrivere i test rossi per parse.ts
    - In `src/api/parse.test.ts`: unit test per `parsePokemonRaw` e
      `parseListPageRaw` con corpi conformi (ritorna Raw) e corpi corrotti
      (campo mancante/tipo errato → `null`), partendo da `unknown`
    - Verificare che falliscano
    - _Requirements: 5.1, 5.5, 5.6_
  - [x] 7.3 Implementare parse.ts (verde)
    - Implementare il narrowing da `unknown` verso i tipi Raw senza `any`
    - _Requirements: 5.1, 5.5, 5.6_

- [x] 8. Mapping Raw → Dominio (funzioni pure)
  - [x] 8.1 Scrivere i test rossi per mappers.ts
    - In `src/api/mappers.test.ts`: unit test di esempio per `mapPokemon`
      (`base_experience` → `baseExperience`, abilità con `isHidden`/`slot`,
      types con `name`/`slot`) e `mapListPage` (preservazione riferimenti)
    - Verificare che falliscano
    - _Requirements: 1.3, 5.4, 2.2, 2.3_
  - [x] 8.2 Implementare mappers.ts (verde)
    - Implementare `mapPokemon` e `mapListPage` come funzioni pure
    - _Requirements: 1.3, 5.4, 2.2, 2.3_
  - [x] 8.3 Property test: mapping GET Raw → dominio
    - **Property 3: Mapping GET Raw → dominio**
    - **Validates: Requirements 1.3, 5.4**
    - Generatore `pokemonRaw`; almeno 100 iterazioni; tag
      `Feature: pokeapi-client, Property 3`
  - [x] 8.4 Property test: invarianti Pagina_LIST e preservazione riferimenti
    - **Property 10: Invarianti della Pagina_LIST e preservazione dei riferimenti**
    - **Validates: Requirements 2.2, 2.3**
    - Generatore `listPageRaw` con `limit`; almeno 100 iterazioni; tag
      `Feature: pokeapi-client, Property 10`
  - [x] 8.5 Property test: corpo 2xx non conforme rilevato dal parsing
    - **Property 8: Corpo 2xx non conforme produce "risposta HTTP non valida"**
    - **Validates: Requirements 2.7, 4.4, 5.5**
    - A livello di parsing: generatori Raw "corrotti" → `parse*Raw` ritorna
      `null` (nessun dominio parziale); almeno 100 iterazioni; tag
      `Feature: pokeapi-client, Property 8`. La traduzione del `null` in errore
      di categoria "risposta HTTP non valida" è verificata nel task 10

- [x] 9. Checkpoint - Assicurarsi che tutti i test passino
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Client PokéAPI: creazione, GET e LIST (cablaggio finale)
  - [x] 10.1 Scrivere i test rossi per la creazione del client
    - In `src/api/pokeApiClient.test.ts`: unit test per `createPokeApiClient`
      (Base_URL di default, Base_URL esplicito usato come prefisso, e `throw`
      di `PokeApiConfigError` per Base_URL non valido)
    - Predisporre l'helper mock di `FetchFn` (registra URL, restituisce
      `FetchResponse` configurabile o rigetta)
    - Verificare che falliscano
    - _Requirements: 3.1, 3.2, 3.4, 6.1, 6.2_
  - [x] 10.2 Implementare createPokeApiClient e lo scheletro get/list (verde)
    - Implementare la creazione con validazione Base_URL, l'iniezione di
      `fetchFn`/`timeoutMs` e il default `globalThis.fetch` adattato a `FetchFn`
    - _Requirements: 3.1, 3.2, 3.4, 6.1, 6.2_
  - [x] 10.3 Scrivere i test rossi per get/list (happy path ed errori)
    - Unit test con `fetch` mockato per: GET per id/nome (URL corretto, dominio
      restituito), LIST con `limit`/`offset` e default 20/0, 404, non-2xx≠404,
      errore di rete/timeout, corpo 2xx non conforme, parametri non validi
      (fetch mai invocata)
    - Verificare che falliscano
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3, 4.4_
  - [x] 10.4 Implementare get e list con timeout e gestione errori (verde)
    - Comporre validazione → `buildUrl`/`buildQuery` → `fetch` con
      `AbortController` (timeout 10s, `clearTimeout`) → controllo stato →
      `parse*Raw` → `map*`, restituendo `Result`; tradurre ogni scenario nella
      categoria di errore corretta
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3, 4.4_
  - [x] 10.5 Property test: identificatore normalizzato nell'URL
    - **Property 2: Composizione dell'identificatore normalizzato nell'URL**
    - **Validates: Requirements 1.1, 1.2**
    - Tag `Feature: pokeapi-client, Property 2`; almeno 100 iterazioni
  - [x] 10.6 Property test: query di paginazione nella LIST
    - **Property 4: Query di paginazione nella LIST**
    - **Validates: Requirements 2.1**
    - Tag `Feature: pokeapi-client, Property 4`; almeno 100 iterazioni
  - [x] 10.7 Property test: 404 → "risorsa non trovata" con stato e identificatore
    - **Property 5: 404 produce "risorsa non trovata" con stato e identificatore**
    - **Validates: Requirements 1.4, 4.1**
    - Tag `Feature: pokeapi-client, Property 5`; almeno 100 iterazioni
  - [x] 10.8 Property test: non-2xx≠404 → "risposta HTTP non valida"
    - **Property 6: Stato non-2xx diverso da 404 produce "risposta HTTP non valida"**
    - **Validates: Requirements 1.6, 4.2**
    - Generatore `errorStatusExcept404`; tag `Feature: pokeapi-client, Property 6`;
      almeno 100 iterazioni
  - [x] 10.9 Property test: fetch che rigetta → "errore di rete"
    - **Property 7: Errore di rete produce "errore di rete"**
    - **Validates: Requirements 1.7, 4.3**
    - Tag `Feature: pokeapi-client, Property 7`; almeno 100 iterazioni
  - [x] 10.10 Property test: Base_URL configurato è prefisso di ogni richiesta
    - **Property 9: Il Base_URL configurato è prefisso di ogni richiesta**
    - **Validates: Requirements 3.1, 6.3**
    - Generatore `validBaseUrl`; tag `Feature: pokeapi-client, Property 9`;
      almeno 100 iterazioni
  - [x] 10.11 Property test: parametri non validi rifiutati senza richiesta HTTP
    - **Property 11: Parametri non validi vengono rifiutati senza richiesta HTTP**
    - **Validates: Requirements 1.5, 2.5**
    - Generatori `invalidIdentifier`/`invalidPagination`; verificare che il mock
      `fetch` non sia invocato; tag `Feature: pokeapi-client, Property 11`;
      almeno 100 iterazioni
  - [x] 10.12 Property test: creazione rifiutata per Base_URL non valido
    - **Property 15: Creazione rifiutata per Base_URL non valido**
    - **Validates: Requirements 3.4**
    - Generatore `invalidBaseUrl`; tag `Feature: pokeapi-client, Property 15`;
      almeno 100 iterazioni

- [x] 11. Invarianti trasversali del modello errori (property test)
  - [x] 11.1 Property test: la categoria dell'errore è sempre nell'insieme ammesso
    - **Property 12: La categoria dell'errore appartiene sempre all'insieme ammesso**
    - **Validates: Requirements 4.5**
    - Copre tutti gli scenari di fallimento; tag
      `Feature: pokeapi-client, Property 12`; almeno 100 iterazioni
  - [x] 11.2 Property test: il messaggio d'errore ha lunghezza 1..200
    - **Property 13: Il messaggio d'errore ha lunghezza compresa tra 1 e 200**
    - **Validates: Requirements 4.6**
    - Tag `Feature: pokeapi-client, Property 13`; almeno 100 iterazioni
  - [x] 11.3 Property test: httpStatus presente e valido per le categorie HTTP
    - **Property 14: httpStatus presente e valido per le categorie HTTP**
    - **Validates: Requirements 4.7**
    - Categorie "risorsa non trovata"/"risposta HTTP non valida", `httpStatus`
      intero 100..599; tag `Feature: pokeapi-client, Property 14`; almeno 100
      iterazioni

- [x] 12. Checkpoint finale - Assicurarsi che tutti i test passino
  - Ensure all tests pass, ask the user if questions arise.
  - Verificare inoltre `npm run lint` (zero warning) e `npm run typecheck` puliti

## Notes

- I task marcati con `*` sono i property test: opzionali per un MVP rapido ma
  fortemente consigliati perché coprono le proprietà universali del design.
- Ogni task cita i requisiti e/o le proprietà di correttezza che copre, per
  tracciabilità.
- La history segue il ciclo TDD: per i moduli con logica, prima il commit
  "test rossi" (sub-task test), poi il commit "implementazione verde"
  (sub-task implementazione).
- I tipi di dominio (3.1) e i tipi Raw (7.1) sono puro codice di tipi: la loro
  correttezza è garantita da `tsc --noEmit` e dai test dei mapper/parser.
- I vincoli statici 5.1, 5.2, 5.3, 5.6, 6.1 sono verificati da `tsc` e ESLint e
  dall'organizzazione dei moduli, non da test runtime.
- La verifica di integrazione contro l'istanza PokéAPI locale (Req 6.2/6.3) è
  opzionale e fuori dal piano automatizzato: va lanciata manualmente quando
  l'istanza locale è disponibile.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "7.1"] },
    { "id": 2, "tasks": ["2.2", "4.2", "5.1", "7.2"] },
    { "id": 3, "tasks": ["4.3", "5.2", "7.3", "8.1"] },
    { "id": 4, "tasks": ["8.2"] },
    { "id": 5, "tasks": ["8.3", "8.4", "8.5", "10.1"] },
    { "id": 6, "tasks": ["10.2"] },
    { "id": 7, "tasks": ["10.3"] },
    { "id": 8, "tasks": ["10.4"] },
    { "id": 9, "tasks": ["10.5", "10.6", "10.7", "10.8", "10.9", "10.10", "10.11", "10.12", "11.1", "11.2", "11.3"] }
  ]
}
```
