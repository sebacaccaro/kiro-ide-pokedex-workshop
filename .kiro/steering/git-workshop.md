# Convenzioni Git per il workshop

Questo progetto è un workshop dimostrativo. La **history dei commit è materiale
didattico**: deve essere pulita, leggibile e navigabile. Un partecipante con
pochi crediti deve poter fare `git checkout` in un qualsiasi punto e trovare il
progetto in uno stato coerente e funzionante.

## Regole sui commit

- Si procede **a step**. Ogni commit riflette un pezzo di lavoro reale e
  coerente (non commit "misti" che mescolano cose scollegate).
- Ogni commit deve lasciare il progetto in uno stato sensato e, dove possibile,
  funzionante.
- Messaggi di commit in **italiano**, chiari e descrittivi di cosa è stato fatto.
- Con il TDD, la history mostra il ciclo: prima un commit con i **test rossi**,
  poi un commit con l'**implementazione verde**.

## Formato dei messaggi

- Riga di titolo breve e concreta (cosa cambia), eventuale corpo per il perché.
- Esempi:
  - `Aggiunge steering di progetto (prodotto, stack, TDD, stile)`
  - `test: lista Pokémon (rossi)`
  - `feat: implementa fetch lista Pokémon dalle PokéAPI`

## Branch e tag

- Si lavora su `main` per mantenere la history lineare e facile da seguire.
- **I tag si mettono alla fine**, a workshop completato (non durante).
- Niente history riscritta a posteriori (no rebase distruttivi, no force push):
  i checkpoint devono restare stabili per i partecipanti.

## Cosa NON committare

- File di ambiente/segreti, `node_modules`, artefatti di build.
- Va mantenuto un `.gitignore` adeguato allo stack.
