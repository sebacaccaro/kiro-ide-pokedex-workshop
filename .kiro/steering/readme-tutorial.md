# Manutenzione del README (tutorial del workshop)

Il `README.md` è il **tutorial del workshop**. Va tenuto costantemente
aggiornato: ogni volta che completiamo un pezzo di lavoro, il README deve
riflettere lo stato attuale.

## Regola fondamentale

- Dopo ogni step, **aggiorna il README** prima di considerare lo step concluso.
- Il README deve essere autosufficiente: una persona deve poter rifare il
  workshop seguendo solo quel file.

## Il README è un tutorial, non un riassunto

Deve contenere materiale pratico e copia-incollabile:

- **Snippet di codice** completi e pronti all'uso (non pseudocodice).
- **Comandi da terminale** esatti, in blocchi copiabili.
- **Prompt di esempio** da dare a Kiro, quando lo step consiste nel guidare
  l'agente.
- **Esempi** di file, configurazioni, output attesi.
- Spiegazioni del *perché*, non solo del *cosa*.

## Struttura per step

Il README è organizzato in step. Per ogni step riportare:

1. Titolo dello step e obiettivo.
2. Cosa si mostra di Kiro (spec / steering / hooks) quando pertinente.
3. Istruzioni pratiche con snippet e comandi.
4. **Crediti stimati** per lo step.

## Crediti stimati

- Ogni step riporta i **crediti stimati**, che corrispondono a quelli
  effettivamente consumati durante lo sviluppo di quello step.
- Mantenere anche un **totale cumulativo** dei crediti nel README.
- Servono ai partecipanti per capire quanto costa ogni parte e decidere dove
  fare `checkout` se hanno pochi crediti.
