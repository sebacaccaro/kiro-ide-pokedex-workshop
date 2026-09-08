# Struttura del progetto

> La struttura si evolve con il workshop. Questo file descrive l'organizzazione
> attesa e va aggiornato quando cambia.

## Organizzazione delle cartelle

```
.
├── .kiro/
│   ├── steering/        # convenzioni di progetto (questi file)
│   ├── specs/           # spec-driven: requirements, design, tasks
│   └── hooks/           # agent hooks
├── docs/                # materiale del workshop (istruzioni, snippet per step)
├── src/
│   ├── api/             # accesso alle PokéAPI e tipi delle risposte
│   │   └── __tests__/   # test del modulo api/ (in cartella separata)
│   ├── components/      # componenti React di presentazione
│   ├── features/        # funzionalità (lista, ricerca, dettaglio)
│   ├── hooks/           # hook React riutilizzabili
│   ├── lib/             # utilità e logica pura
│   └── types/           # tipi condivisi
└── README.md            # come eseguire il workshop
```

## Convenzioni

- I test vivono in una cartella `__tests__/` separata, accanto al modulo che
  testano (es. i test di `src/api/` stanno in `src/api/__tests__/`), con
  suffisso `.test.ts(x)` (es. `pokemon.ts` → `__tests__/pokemon.test.ts`).
- Dalla cartella `__tests__/` il codice testato si importa risalendo di un
  livello: `../pokeApiClient`, e i tipi condivisi con `../../types/pokemon`.
- Vitest raccoglie i test con il pattern `src/**/*.test.{ts,tsx}`, quindi la
  posizione esatta nella gerarchia non conta finché il suffisso è rispettato.
- La logica pura e testabile vive in `lib/`, `api/`, `hooks/`, `features/`.
- I componenti in `components/` restano il più possibile "stupidi"
  (presentazione), la logica sta negli hook/feature.
- Un file esporta preferibilmente una sola responsabilità principale.

## Confini

- Solo il livello `api/` conosce l'URL e la forma delle PokéAPI. Il resto
  dell'app lavora con tipi di dominio nostri, non con la forma grezza della rete.
