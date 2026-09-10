# Workflow di sviluppo: TDD

Quando implementiamo **logica** (funzioni, hook, servizi, utilità, riduttori,
trasformazioni di dati), lo facciamo in Test-Driven Development. Questa è la
modalità di sviluppo di default del progetto.

## Il ciclo Red → Green → Refactor

1. **Red** — Prima scriviamo il test. Deve descrivere il comportamento atteso e
   deve **fallire** (perché la logica non esiste ancora o non è corretta).
   Eseguiamo i test e verifichiamo che falliscano per il motivo giusto.
2. **Green** — Scriviamo il minimo codice necessario per far passare il test.
   Niente funzionalità extra non coperte da test.
3. **Refactor** — Con i test verdi, miglioriamo il codice (nomi, duplicazioni,
   struttura) mantenendo i test verdi.

## Regole operative

- Non scrivere codice di produzione senza un test che fallisce che lo giustifichi.
- Un test alla volta: piccoli passi, feedback rapido.
- I test devono essere deterministici. Le chiamate di rete (PokéAPI) vanno
  mockate nei test unitari; niente rete reale nei test.
- Il nome del test descrive il comportamento, non l'implementazione
  (es. "restituisce i Pokémon ordinati per id", non "chiama sort").
- Quando correggiamo un bug: prima scriviamo un test che lo riproduce (fallisce),
  poi lo correggiamo (passa).

## Cosa può saltare il TDD

Il puro codice di presentazione (markup/layout senza logica) e le impostazioni
di configurazione non richiedono un test scritto prima. Nel dubbio, se c'è un
comportamento osservabile, si testa.

## Come mostrarlo nel workshop

Ogni feature con logica parte con un commit "test rossi" seguito da un commit
"implementazione verde", così la history racconta il ciclo TDD.
