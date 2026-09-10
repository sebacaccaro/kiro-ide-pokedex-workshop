# Requirements Document

## Introduction

Questa funzionalità aggiunge la possibilità di segnare un Pokémon come "catturato"
direttamente dall'elenco, tramite un pulsante a forma di Poké Ball posizionato
alla destra di ogni voce. La Poké Ball appare trasparente finché il Pokémon non
è catturato; al click viene riprodotta un'animazione di cattura in stile giochi
Pokémon, al termine della quale la Poké Ball diventa opaca e il Pokémon risulta
catturato. Le catture vengono persistite localmente (coerentemente con
l'approccio `window.localStorage` già usato per il tema) e sopravvivono al
refresh della pagina. Quando un Pokémon è catturato, la Vista_Dettaglio mostra
la sua descrizione da Pokédex (flavor text recuperato dalle PokéAPI). L'aspetto
delle Poké Ball e delle animazioni si adatta al tema attivo del Pokédex.

Il progetto è React + TypeScript + Vite, con dati dalle PokéAPI, sviluppo in TDD
(Vitest + React Testing Library con chiamate di rete mockate), TypeScript strict
e stile Airbnb. La logica pura vive in `lib/`, l'accesso di rete esclusivamente
in `api/`.

## Glossary

- **Applicazione**: l'applicazione Pokédex Web nel suo insieme.
- **Elenco**: la lista dei Pokémon visualizzata nella Vista_Elenco.
- **Voce_Elenco**: una singola riga dell'Elenco che rappresenta un Pokémon.
- **Toggle_Cattura**: il pulsante a forma di Poké Ball, posizionato alla destra
  della Voce_Elenco, che consente di segnare o annullare la cattura di un Pokémon.
- **Stato_Catturato**: la condizione in cui un Pokémon risulta catturato.
- **Stato_Non_Catturato**: la condizione in cui un Pokémon non risulta catturato.
- **Animazione_Cattura**: l'animazione riprodotta al momento della cattura, in
  stile giochi Pokémon.
- **Gestore_Catture**: il componente che espone l'insieme dei Pokémon catturati
  e i comandi per modificarlo, rendendo lo stato disponibile all'Applicazione.
- **Store_Catture**: l'astrazione di persistenza (adapter su
  `window.localStorage`) usata dal Gestore_Catture per leggere e scrivere le
  catture.
- **Chiave_Persistenza**: la chiave usata per persistere le catture in
  `window.localStorage`.
- **Vista_Dettaglio**: la schermata che mostra i dettagli di un singolo Pokémon.
- **Descrizione_Pokedex**: il testo descrittivo (flavor text) del Pokémon
  recuperato dalle PokéAPI.
- **Client_PokeAPI**: l'unico confine di rete dell'Applicazione (`src/api/`) che
  effettua richieste alle PokéAPI e restituisce tipi di dominio.
- **Gestore_Temi**: il componente esistente che espone il tema attivo
  (`rosso` o `diamante`) e lo applica come `data-theme` sull'elemento radice.
- **Tema_Attivo**: il tema attualmente selezionato nel Gestore_Temi.
- **Tema_Rosso**: l'aspetto visivo dei Toggle_Cattura e dell'Animazione_Cattura
  associato al valore di tema `rosso`, usato anche come aspetto predefinito.
- **Tema_Diamante**: l'aspetto visivo dei Toggle_Cattura e dell'Animazione_Cattura
  associato al valore di tema `diamante`.

## Requirements

### Requirement 1: Toggle_Cattura nell'Elenco

**User Story:** Come utente, voglio un pulsante Poké Ball alla destra di ogni
Pokémon nell'Elenco, così da poter segnare quali Pokémon ho catturato.

#### Acceptance Criteria

1. THE Applicazione SHALL mostrare un Toggle_Cattura alla destra di ogni Voce_Elenco.
2. WHILE un Pokémon è in Stato_Non_Catturato, THE Applicazione SHALL rendere il relativo Toggle_Cattura con opacità pari a 0,4 (su una scala da 0 a 1).
3. WHILE un Pokémon è in Stato_Catturato, THE Applicazione SHALL rendere il relativo Toggle_Cattura con opacità pari a 1,0 (su una scala da 0 a 1).
4. THE Toggle_Cattura SHALL esporre un nome accessibile che indica l'azione disponibile e lo stato corrente di cattura del Pokémon.
5. WHEN l'utente attiva il Toggle_Cattura di un Pokémon con tastiera, THE Applicazione SHALL eseguire la stessa azione dell'attivazione con puntatore.
6. WHEN l'utente attiva il Toggle_Cattura di un Pokémon, THE Applicazione SHALL commutare lo stato di quel Pokémon tra Stato_Catturato e Stato_Non_Catturato.

### Requirement 2: Cattura di un Pokémon

**User Story:** Come utente, voglio cliccare la Poké Ball di un Pokémon non
catturato per catturarlo, così da tenere traccia della mia collezione.

#### Acceptance Criteria

1. WHEN l'utente attiva il Toggle_Cattura di un Pokémon in Stato_Non_Catturato, THE Applicazione SHALL avviare l'Animazione_Cattura per quel Pokémon entro 100 ms dall'attivazione.
2. WHEN l'Animazione_Cattura di un Pokémon raggiunge la durata prevista compresa tra 300 ms e 2000 ms, THE Applicazione SHALL porre quel Pokémon in Stato_Catturato.
3. WHEN un Pokémon passa allo Stato_Catturato, THE Applicazione SHALL rendere il relativo Toggle_Cattura con opacità pari a 1,0.
4. WHILE l'Animazione_Cattura di un Pokémon è in corso, THE Applicazione SHALL ignorare ogni ulteriore attivazione del Toggle_Cattura di quel Pokémon senza avviare una nuova Animazione_Cattura.
5. IF l'utente attiva il Toggle_Cattura di un Pokémon che è già in Stato_Catturato, THEN THE Applicazione SHALL mantenere il Pokémon in Stato_Catturato senza avviare l'Animazione_Cattura.

### Requirement 3: Annullamento della cattura

**User Story:** Come utente, voglio poter annullare la cattura di un Pokémon,
così da correggere la mia collezione se sbaglio.

#### Acceptance Criteria

1. WHEN l'utente attiva il Toggle_Cattura di un Pokémon in Stato_Catturato, THE Applicazione SHALL porre quel Pokémon in Stato_Non_Catturato.
2. WHEN un Pokémon passa allo Stato_Non_Catturato, THE Applicazione SHALL rendere il relativo Toggle_Cattura con opacità pari a 0,4 entro 200 millisecondi.
3. WHEN un Pokémon passa allo Stato_Non_Catturato, THE Applicazione SHALL persistere lo Stato_Non_Catturato in modo che risulti invariato dopo il ricaricamento dell'Applicazione.
4. IF il passaggio allo Stato_Non_Catturato non può essere completato o persistito, THEN THE Applicazione SHALL mantenere il Pokémon in Stato_Catturato e mostrare un messaggio di errore che indica il mancato annullamento della cattura.

### Requirement 4: Persistenza delle catture

**User Story:** Come utente, voglio che le mie catture rimangano salvate dopo un
refresh, così da non perdere la mia collezione.

#### Acceptance Criteria

1. WHEN un Pokémon passa allo Stato_Catturato, THE Gestore_Catture SHALL scrivere l'insieme aggiornato dei Pokémon catturati nello Store_Catture usando la Chiave_Persistenza.
2. WHEN un Pokémon passa allo Stato_Non_Catturato, THE Gestore_Catture SHALL scrivere l'insieme aggiornato dei Pokémon catturati nello Store_Catture usando la Chiave_Persistenza.
3. WHEN l'Applicazione si avvia, THE Gestore_Catture SHALL leggere l'insieme dei Pokémon catturati dallo Store_Catture usando la Chiave_Persistenza.
4. IF il valore letto dallo Store_Catture è assente, non è JSON valido, oppure non è un array di interi positivi, THEN THE Gestore_Catture SHALL inizializzare l'insieme dei Pokémon catturati come insieme vuoto.
5. IF la lettura dallo Store_Catture solleva un errore, THEN THE Gestore_Catture SHALL inizializzare l'insieme dei Pokémon catturati come insieme vuoto.
6. IF la scrittura nello Store_Catture solleva un errore, THEN THE Gestore_Catture SHALL mantenere in memoria l'insieme aggiornato dei Pokémon catturati e segnalare il fallimento della persistenza.
7. THE Gestore_Catture SHALL usare `window.localStorage` come Store_Catture predefinito.
8. THE Store_Catture SHALL essere iniettabile nel Gestore_Catture per rendere i test deterministici.

### Requirement 5: Descrizione_Pokedex nel dettaglio dei Pokémon catturati

**User Story:** Come utente, voglio vedere la descrizione da Pokédex di un
Pokémon che ho catturato, così da conoscerne il testo descrittivo come nei giochi.

#### Acceptance Criteria

1. WHEN un Pokémon passa allo Stato_Catturato mentre la sua Vista_Dettaglio è aperta, THE Vista_Dettaglio SHALL richiedere una sola volta la Descrizione_Pokedex di quel Pokémon tramite il Client_PokeAPI.
2. WHEN la Descrizione_Pokedex di un Pokémon catturato è disponibile come testo non vuoto, THE Vista_Dettaglio SHALL mostrare la Descrizione_Pokedex.
3. WHILE un Pokémon è in Stato_Non_Catturato, THE Vista_Dettaglio SHALL omettere la Descrizione_Pokedex e non richiederla tramite il Client_PokeAPI.
4. WHILE la richiesta della Descrizione_Pokedex è in corso e per non oltre 10 secondi, THE Vista_Dettaglio SHALL indicare che la Descrizione_Pokedex è in caricamento.
5. IF la richiesta della Descrizione_Pokedex termina con errore o supera i 10 secondi, THEN THE Vista_Dettaglio SHALL rimuovere l'indicatore di caricamento, mostrare la categoria dell'errore e mantenere visibili i restanti dettagli del Pokémon.
6. IF la richiesta della Descrizione_Pokedex ha successo ma non contiene testo, THEN THE Vista_Dettaglio SHALL mostrare un'indicazione di descrizione non disponibile e mantenere visibili i restanti dettagli del Pokémon.
7. THE Client_PokeAPI SHALL restituire la Descrizione_Pokedex come tipo di dominio dell'Applicazione, senza esporre la forma grezza delle PokéAPI.

### Requirement 6: Adattamento al tema

**User Story:** Come utente, voglio che le Poké Ball e le animazioni seguano il
tema del Pokédex, così da avere un'esperienza visiva coerente.

#### Acceptance Criteria

1. WHILE il Tema_Attivo è `rosso`, THE Applicazione SHALL rendere i Toggle_Cattura e l'Animazione_Cattura con l'aspetto visivo definito per il Tema_Rosso.
2. WHILE il Tema_Attivo è `diamante`, THE Applicazione SHALL rendere i Toggle_Cattura e l'Animazione_Cattura con l'aspetto visivo definito per il Tema_Diamante.
3. WHEN il Tema_Attivo cambia da un valore a un altro tra `rosso` e `diamante`, THE Applicazione SHALL aggiornare l'aspetto di tutti i Toggle_Cattura attualmente visibili in modo coerente con il nuovo Tema_Attivo entro 300 millisecondi dal cambio.
4. IF il Tema_Attivo assume un valore diverso da `rosso` o `diamante`, THEN THE Applicazione SHALL rendere i Toggle_Cattura e l'Animazione_Cattura con l'aspetto visivo definito per il Tema_Rosso come valore predefinito.
5. WHEN il Tema_Attivo cambia mentre un'Animazione_Cattura è in corso, THE Applicazione SHALL portare a termine l'Animazione_Cattura in corso e applicare l'aspetto visivo del nuovo Tema_Attivo alle Animazione_Cattura successive.

### Requirement 7: Gestore_Catture come logica testabile

**User Story:** Come sviluppatore, voglio che la gestione dell'insieme delle
catture sia logica pura e testabile, così da svilupparla in TDD senza dipendere
dal DOM o dalla rete.

#### Acceptance Criteria

1. THE Gestore_Catture SHALL esporre un comando per porre un Pokémon in Stato_Catturato dato il suo id, dove l'id è un intero positivo maggiore o uguale a 1.
2. THE Gestore_Catture SHALL esporre un comando per porre un Pokémon in Stato_Non_Catturato dato il suo id.
3. THE Gestore_Catture SHALL esporre un predicato che, dato un id, restituisce vero se il Pokémon è in Stato_Catturato e falso altrimenti.
4. WHEN l'insieme dei Pokémon catturati è appena inizializzato, THE Gestore_Catture SHALL considerare ogni id come Stato_Non_Catturato.
5. WHEN il comando di cattura è applicato due volte consecutivamente allo stesso id, THE Gestore_Catture SHALL produrre lo stesso insieme di Pokémon catturati prodotto da una singola applicazione (idempotenza).
6. WHEN il comando di annullamento cattura è applicato a un id in Stato_Non_Catturato, THE Gestore_Catture SHALL lasciare invariato l'insieme dei Pokémon catturati.
7. IF un comando riceve un id che non è un intero positivo maggiore o uguale a 1, THEN THE Gestore_Catture SHALL lasciare invariato l'insieme dei Pokémon catturati.
