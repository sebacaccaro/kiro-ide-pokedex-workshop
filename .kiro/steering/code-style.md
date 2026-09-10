# Stile del codice

## Formattazione e linting

- Stile **Airbnb** come base per JavaScript/TypeScript
  (`eslint-config-airbnb` / `airbnb-typescript`).
- **Prettier** per la formattazione, integrato con ESLint per evitare conflitti.
- **Zero warning**: i warning sono trattati come errori. Il codice va consegnato
  con lint pulito (`--max-warnings=0`).
- La formattazione non è mai oggetto di discussione manuale: decide lo strumento.

## TypeScript strict

- `strict: true` attivo nel `tsconfig` (con tutte le opzioni che ne derivano:
  `noImplicitAny`, `strictNullChecks`, ecc.).
- Niente `any` impliciti o espliciti se evitabile. Preferire tipi precisi,
  `unknown` + narrowing quando il tipo non è noto.
- Niente `@ts-ignore` / `eslint-disable` sparsi: se servono, vanno motivati con
  un commento che spiega il perché.
- Tipizzare i confini esterni (risposte PokéAPI) con tipi espliciti; non fidarsi
  della forma dei dati di rete.

## Convenzioni generali

- Nomi descrittivi in inglese per codice e identificatori; commenti e
  documentazione utente in italiano.
- Funzioni piccole e con una sola responsabilità.
- Preferire funzioni pure e dati immutabili dove possibile.
- Import ordinati: librerie esterne, poi moduli interni, poi asset/stili.
- Niente codice morto, niente `console.log` lasciati nel codice di produzione.

## Definition of Done (per lo stile)

Un cambiamento è "fatto" quando:

- `lint` passa senza errori né warning,
- il type-check passa (`tsc --noEmit`),
- i test passano,
- la formattazione è quella dello strumento.
